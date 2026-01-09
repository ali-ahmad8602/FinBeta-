import { Fund, Loan } from '@/types';
import { calculateAllocatedCostOfCapital, calculateVariableCosts, calculateInterest } from './finance';

export interface CashFlowEvent {
    date: Date;
    amount: number;
    type: 'REPAYMENT' | 'DEPLOYMENT';
    loanId: string;
    borrowerName: string;
    installmentNumber?: number;
    totalInstallments?: number;
    description: string;
    principalPortion: number;
    variableCostRecovery: number;
    cocRecovery: number;
}

export interface CashFlowProjection {
    date: string; // ISO date string for grouping
    expectedRepayments: number;
    cumulativeAvailable: number;
    events: CashFlowEvent[];
}

export interface CashFlowSummary {
    next30Days: number;
    next90Days: number;
    peakAvailable: number;
    lowestAvailable: number;
    peakDate: string;
    lowestDate: string;
}

/**
 * Extract all future repayment events from active loans
 */
export function getAllRepaymentEvents(loans: Loan[], fund: Fund): CashFlowEvent[] {
    const events: CashFlowEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const loan of loans) {
        // Skip defaulted loans
        if (loan.status === 'DEFAULTED') continue;

        // Skip closed loans
        if (loan.status === 'CLOSED') continue;

        if (loan.installments && loan.installments.length > 0) {
            // Monthly installments
            loan.installments.forEach((inst, idx) => {
                const dueDate = new Date(inst.dueDate);

                // Only include future repayments
                if (dueDate >= today) {
                    const isLastInstallment = idx === loan.installments.length - 1;

                    // WATERFALL LOGIC for Future Events
                    const totalInterest = calculateInterest(loan.principal, loan.interestRate, loan.durationDays);
                    const processingFee = loan.processingFeeRate ? (loan.principal * (loan.processingFeeRate / 100)) : 0;

                    const totalExpectedRepayment = loan.principal + totalInterest + processingFee;
                    const totalAllocatedCoC = calculateAllocatedCostOfCapital(loan.principal, fund.costOfCapitalRate, loan.durationDays);
                    const totalVarCosts = calculateVariableCosts(loan.principal, loan.variableCosts);
                    const totalBreakEven = loan.principal + totalVarCosts + totalAllocatedCoC;

                    const totalImYield = Math.max(0, totalExpectedRepayment - totalBreakEven);

                    let imYieldInThisEvent = 0;
                    if (isLastInstallment) {
                        imYieldInThisEvent = totalImYield;
                    }

                    // Determine how much of this installment covers break-even components
                    // If it's the last installment, we remove the yield part first.
                    // Note: This logic assumes the Yield is paid at the END.

                    const amountForBreakEven = inst.amount - imYieldInThisEvent;

                    // Distribute amountForBreakEven proportionally to Principal, VarCost, CoC
                    // The ratio is based on the TOTAL expected costs.
                    const principalRatio = loan.principal / totalBreakEven;
                    const varCostRatio = totalVarCosts / totalBreakEven;
                    const cocRatio = totalAllocatedCoC / totalBreakEven;

                    // Fallback to simpler logic if ratios don't sum well or break even is 0 (unlikely)
                    const principalPortion = amountForBreakEven * principalRatio;
                    const varRecovery = amountForBreakEven * varCostRatio;
                    const cocRecovery = amountForBreakEven * cocRatio;

                    events.push({
                        date: dueDate,
                        amount: inst.amount,
                        type: 'REPAYMENT',
                        loanId: loan.id,
                        borrowerName: loan.borrowerName,
                        installmentNumber: idx + 1,
                        totalInstallments: loan.installments.length,
                        description: `${loan.borrowerName} - Installment ${idx + 1}/${loan.installments.length}`,
                        principalPortion: principalPortion,
                        variableCostRecovery: varRecovery,
                        cocRecovery: cocRecovery,
                        imYield: imYieldInThisEvent
                    } as any); // Type assertion until interface is updated if needed
                }
            });
        } else {
            // Bullet loan
            const maturityDate = new Date(loan.startDate);
            maturityDate.setDate(maturityDate.getDate() + loan.durationDays);

            // Only include if maturity is in the future
            if (maturityDate >= today) {
                const totalInterest = calculateInterest(loan.principal, loan.interestRate, loan.durationDays);
                const processingFee = loan.processingFeeRate ? (loan.principal * (loan.processingFeeRate / 100)) : 0;

                const totalRepayment = loan.principal + totalInterest + processingFee;

                const totalVarCost = calculateVariableCosts(loan.principal, loan.variableCosts);
                const totalAllocatedCoC = calculateAllocatedCostOfCapital(loan.principal, fund.costOfCapitalRate, loan.durationDays);

                const totalBreakEven = loan.principal + totalVarCost + totalAllocatedCoC;
                const totalImYield = Math.max(0, totalRepayment - totalBreakEven);

                const amountForBreakEven = totalRepayment - totalImYield;

                const principalRatio = loan.principal / totalBreakEven;
                const varCostRatio = totalVarCost / totalBreakEven;
                const cocRatio = totalAllocatedCoC / totalBreakEven;

                events.push({
                    date: maturityDate,
                    amount: totalRepayment,
                    type: 'REPAYMENT',
                    loanId: loan.id,
                    borrowerName: loan.borrowerName,
                    description: `${loan.borrowerName} - Bullet Repayment`,
                    principalPortion: amountForBreakEven * principalRatio,
                    variableCostRecovery: amountForBreakEven * varCostRatio,
                    cocRecovery: amountForBreakEven * cocRatio,
                    imYield: totalImYield
                } as any);
            }
        }
    }

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Calculate cash flow forecast for the next N months
 */
export function calculateCashFlowForecast(
    fund: Fund,
    loans: Loan[],
    months: number = 12
): { projections: CashFlowProjection[], summary: CashFlowSummary } {
    const events = getAllRepaymentEvents(loans, fund);

    // Calculate current available capital
    const deployedCapital = loans
        .filter(l => l.status === 'ACTIVE' || l.status === 'DEFAULTED')
        .reduce((sum, l) => sum + l.principal, 0);

    const activeTotalVarCosts = loans
        .filter(l => l.status === 'ACTIVE' || l.status === 'DEFAULTED')
        .reduce((sum, l) => sum + calculateVariableCosts(l.principal, l.variableCosts), 0);

    // Initial Available: Total - Deployed - VarCosts
    let runningAvailable = fund.totalRaised - deployedCapital - activeTotalVarCosts;
    const initialAvailable = runningAvailable;

    // Group events by date
    const eventsByDate = new Map<string, CashFlowEvent[]>();
    events.forEach(event => {
        const dateKey = event.date.toISOString().split('T')[0];
        if (!eventsByDate.has(dateKey)) {
            eventsByDate.set(dateKey, []);
        }
        eventsByDate.get(dateKey)!.push(event);
    });

    // Generate projections
    const projections: CashFlowProjection[] = [];
    const uniqueDates = Array.from(eventsByDate.keys()).sort();

    // Add initial state (today)
    const today = new Date().toISOString().split('T')[0];
    projections.push({
        date: today,
        expectedRepayments: 0,
        cumulativeAvailable: initialAvailable,
        events: []
    });

    // Add projections for each repayment date
    uniqueDates.forEach(dateKey => {
        const dayEvents = eventsByDate.get(dateKey) || [];
        // Repayments in terms of Cash Inflow
        const cashRepayments = dayEvents.reduce((sum, e) => sum + e.amount, 0);

        // Available Capital Replenishment: Principal + VarCost + CoC
        const availableReplenishment = dayEvents.reduce((sum, e) => {
            return sum + e.principalPortion + e.variableCostRecovery + e.cocRecovery;
        }, 0);

        runningAvailable += availableReplenishment;

        projections.push({
            date: dateKey,
            expectedRepayments: cashRepayments,
            cumulativeAvailable: runningAvailable,
            events: dayEvents
        });
    });

    // Calculate summary metrics
    const summary = calculateSummary(projections, initialAvailable);

    return { projections, summary };
}

/**
 * Calculate summary metrics from projections
 */
function calculateSummary(projections: CashFlowProjection[], initialAvailable: number): CashFlowSummary {
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    let next30Days = 0;
    let next90Days = 0;
    let peakAvailable = initialAvailable;
    let lowestAvailable = initialAvailable;
    let peakDate = today.toISOString().split('T')[0];
    let lowestDate = today.toISOString().split('T')[0];

    projections.forEach(proj => {
        const projDate = new Date(proj.date);

        // Sum repayments in next 30/90 days
        if (projDate <= in30Days) {
            next30Days += proj.expectedRepayments;
        }
        if (projDate <= in90Days) {
            next90Days += proj.expectedRepayments;
        }

        // Track peak and lowest
        if (proj.cumulativeAvailable > peakAvailable) {
            peakAvailable = proj.cumulativeAvailable;
            peakDate = proj.date;
        }
        if (proj.cumulativeAvailable < lowestAvailable) {
            lowestAvailable = proj.cumulativeAvailable;
            lowestDate = proj.date;
        }
    });

    return {
        next30Days,
        next90Days,
        peakAvailable,
        lowestAvailable,
        peakDate,
        lowestDate
    };
}
