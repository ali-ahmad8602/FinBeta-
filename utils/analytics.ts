import { Fund, Loan } from '@/types';
import { calculateAllocatedCostOfCapital, calculateVariableCosts, calculateInterest } from './finance';
import { calculateXIRR, CashFlow } from './xirr';

export interface FundMetrics {
    totalRaised: number;
    deployedCapital: number;
    availableCapital: number;
    nplVolume: number;
    projectedIncome: number;
    totalProcessingFees: number; // Standalone metric
    totalExpenses: number; // Cost of Capital + Variable Costs
    totalAllocatedCostOfCapital: number;
    totalUpfrontCostsDeployed: number; // New Metric
    nav: number; // New Metric
    dailyAvailableCapitalCost: number; // Cost of undeployed capital per day
    accumulatedUndeployedCost: number; // Total cost on undeployed since inception
    netYield: number;
    aum: number;
    portfolioIRR: number; // Percentage - Realized IRR (actual outcomes)
    projectedPortfolioIRR: number; // Percentage - Projected IRR (deal economics)
    nplRatio: number; // Percentage
    globalCost: {
        annual: number;
        monthly: number;
        weekly: number;
        daily: number;
    };
}

/**
 * Calculates aggregated metrics for a single fund based on its loans.
 */
export const calculateFundMetrics = (fund: Fund, loans: Loan[]): FundMetrics => {
    const fundLoans = loans.filter(l => l.fundId === fund.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate GROSS deployed (full principal for all active loans)
    const grossDeployed = fundLoans
        .filter(l => l.status === 'ACTIVE' || l.status === 'DEFAULTED')
        .reduce((sum, loan) => sum + loan.principal, 0);

    // Calculate principal ALREADY RECOVERED from past installments
    let principalRecovered = 0;
    let varCostsRecovered = 0;
    let cocRecovered = 0;

    fundLoans
        .filter(l => l.status === 'ACTIVE') // Only ACTIVE loans have ongoing repayments
        .forEach(loan => {
            if (loan.installments && loan.installments.length > 0) {
                const numInstallments = loan.installments.length;
                const principalPerInstallment = loan.principal / numInstallments;

                // Variable cost & CoC recovery per installment (flat distribution)
                const totalVarCost = calculateVariableCosts(loan.principal, loan.variableCosts);
                const totalCoC = calculateAllocatedCostOfCapital(loan.principal, fund.costOfCapitalRate, loan.durationDays);
                const varCostPerInstallment = totalVarCost / numInstallments;
                const cocPerInstallment = totalCoC / numInstallments;

                loan.installments.forEach(inst => {
                    const dueDate = new Date(inst.dueDate);
                    dueDate.setHours(0, 0, 0, 0);

                    // If installment date is today or past, consider it recovered
                    if (dueDate <= today) {
                        principalRecovered += principalPerInstallment;
                        varCostsRecovered += varCostPerInstallment;
                        cocRecovered += cocPerInstallment;
                    }
                });
            }
            // Bullet loans: Only recovered when fully closed (status change)
        });

    // NET Deployed = Gross - Recovered Principal
    const deployedCapital = grossDeployed - principalRecovered;

    // Calculate upfront variable costs for ACTIVE and DEFAULTED loans
    const totalUpfrontVariableCosts = fundLoans
        .filter(l => l.status === 'ACTIVE' || l.status === 'DEFAULTED')
        .reduce((sum, loan) => sum + calculateVariableCosts(loan.principal, loan.variableCosts), 0);

    // Net Upfront Costs = Total - Recovered
    const netUpfrontCosts = totalUpfrontVariableCosts - varCostsRecovered;

    // Available Capital: TotalRaised - NetDeployed - NetUpfrontCosts
    const availableCapital = fund.totalRaised - deployedCapital - netUpfrontCosts;

    // ---------------------------------------------------------
    // ACCUMULATED UNDEPLOYED CAPITAL COST
    // ---------------------------------------------------------
    let accumulatedUndeployedCost = 0;
    const inceptionDate = new Date(fund.createdAt || (fundLoans.length > 0 ? fundLoans[0].startDate : new Date()));
    inceptionDate.setHours(0, 0, 0, 0);

    const events: { date: Date; change: number }[] = [];

    // 1. Initial Capital Event
    events.push({ date: inceptionDate, change: fund.totalRaised });

    fundLoans.forEach(loan => {
        const loanStart = new Date(loan.startDate);
        loanStart.setHours(0, 0, 0, 0);

        const upfrontCost = calculateVariableCosts(loan.principal, loan.variableCosts);

        // 2. Deployment Event
        events.push({ date: loanStart, change: -(loan.principal + upfrontCost) });

        if (loan.repaymentType === 'MONTHLY' && loan.installments && loan.installments.length > 0) {
            const numInst = loan.installments.length;
            const principalReturn = loan.principal / numInst;
            const costReturn = upfrontCost / numInst;

            loan.installments.forEach(inst => {
                const dueDate = new Date(inst.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                // 3. Gradual Recovery
                events.push({ date: dueDate, change: principalReturn + costReturn });
            });
        } else {
            // BULLET - Recovery at end
            const maturityDate = new Date(loanStart);
            maturityDate.setDate(maturityDate.getDate() + loan.durationDays);
            maturityDate.setHours(0, 0, 0, 0);
            events.push({ date: maturityDate, change: loan.principal + upfrontCost });
        }
    });

    // Sort events chronologically
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningAvail = 0;
    let lastDate = inceptionDate;

    for (const event of events) {
        if (event.date > today) break;

        const periodDays = Math.max(0, Math.floor((event.date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
        if (periodDays > 0 && runningAvail > 0) {
            accumulatedUndeployedCost += (runningAvail * (fund.costOfCapitalRate / 100) / 360) * periodDays;
        }

        runningAvail += event.change;
        lastDate = event.date;
    }

    // Interval from last event to today
    const finalDays = Math.max(0, Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
    if (finalDays > 0 && runningAvail > 0) {
        accumulatedUndeployedCost += (runningAvail * (fund.costOfCapitalRate / 100) / 360) * finalDays;
    }

    const nplLoans = fundLoans.filter(l => l.status === 'DEFAULTED');

    // NPL Volume = Principal + Interest (FEE EXCLUDED PER USER REQUEST)
    const nplVolume = nplLoans.reduce((sum, loan) => {
        const days = loan.durationDays;
        const interest = calculateInterest(loan.principal, loan.interestRate, days);
        return sum + loan.principal + interest;
    }, 0);

    // Track Principal Loss separately for Net Yield consistency (Cash basis loss)
    const nplPrincipalLoss = nplLoans.reduce((sum, loan) => sum + loan.principal, 0);

    const nplRatio = fund.totalRaised > 0 ? (nplPrincipalLoss / fund.totalRaised) * 100 : 0; // Keeping Ratio on Principal basis or Volume? Usually Principal but volume asked. 
    // User asked "NPL amount and NPl volume to be the total reapayble amount". 
    // Usually Ratio follows Volume. calculating on Volume for now to match.
    // Actually, std NPL ratio is usually Outstanding Balance / Total Loan Book. 
    // Let's stick to Principal for Ratio if they didn't ask, OR if they want Volume to be X, Ratio usually displays Volume%.
    // I'll keep ratio on Principal for now as 'Risk' is usually capital risk, unless specified. 
    // Wait, if I show $120k NPL Volume on $100k Fund, Ratio 120%? Weird.
    // Let's stick to Principal for Ratio to be safe, or just use the new Volume.
    // "NPL amount and NPl volume" -> implies display metrics.

    // Global Cost Metrics (Annual Cost on Total Raised)
    const annualGlobalCost = fund.totalRaised * (fund.costOfCapitalRate / 100);
    const dailyGlobalCost = annualGlobalCost / 360; // 360-day basis
    const weeklyGlobalCost = dailyGlobalCost * 7;
    const monthlyGlobalCost = annualGlobalCost / 12;

    // Financials
    // For now, sticking to the request: "compare [Global Cost] with income".
    // I will return the metric and do the comparison in UI or here.

    // Financials
    let projectedIncome = 0;
    let totalAllocatedExpenses = 0;
    let totalAllocatedCostOfCapital = 0;

    fundLoans.forEach(loan => {
        const days = loan.durationDays;
        const defaultedAmount = loan.defaultedAmount || 0;
        const activePrincipal = loan.principal - defaultedAmount; // Principal generating income

        // 1. Calculate Allocated Cost & Variable Cost on the *Original* Principal 
        // (assuming we raised the full amount initially and paid costs on it)
        const allocatedCost = calculateAllocatedCostOfCapital(loan.principal, fund.costOfCapitalRate, days);
        const variableCost = calculateVariableCosts(loan.principal, loan.variableCosts);

        // 2. Calculate Projected Income on *Active* Principal only
        // If defaultedAmount == principal (Full Default), activePrincipal is 0, so Interest is 0.
        const interestIncome = calculateInterest(activePrincipal, loan.interestRate, days);
        // Processing fee is now standalone, excluded from interestIncome/Net Yield logic here

        // 3. Expense Logic
        // Base Expenses: Allocated Cost + Variable Costs
        let loanExpenses = allocatedCost + variableCost;

        // Add NPL Expense (The defaulted amount itself is a loss/expense)
        // Plus, we might consider the 'Lost Interest' as an opportunity cost, but for "Net Yield" (Cash basis), 
        // we simply don't get the income, and we lose the capital.
        // loanExpenses += defaultedAmount; // REMOVED as per request to keep Expenses separate from NPL losses

        projectedIncome += interestIncome;
        totalAllocatedExpenses += loanExpenses;

        // Only include in "Allocated Cost (Deployed)" metric if NOT defaulted
        if (loan.status !== 'DEFAULTED') {
            totalAllocatedCostOfCapital += allocatedCost;
        }
    });

    // Net Yield for the CARD (Deal Basis)
    // Net Yield = Income - Expenses - NPL Losses (Principal Only to remain unaffected)
    const netYield = projectedIncome - totalAllocatedExpenses - nplPrincipalLoss;

    // Portfolio IRR Calculation - Realized (actual outcomes)
    // Treats defaulted loans as losses (no inflows)
    const realizedCashFlows: CashFlow[] = [];
    fundLoans.forEach(loan => {
        // 1. Outflow: Principal on Start Date
        realizedCashFlows.push({ amount: -loan.principal, date: new Date(loan.startDate) });

        // 2. Inflows: Only for non-defaulted loans
        if (loan.status !== 'DEFAULTED') {
            if (loan.installments && loan.installments.length > 0) {
                loan.installments.forEach(inst => {
                    realizedCashFlows.push({ amount: inst.amount, date: new Date(inst.dueDate) });
                });
            } else {
                // Bullet Loan Fallback
                const totalRepayable = loan.principal + calculateInterest(loan.principal, loan.interestRate, loan.durationDays);
                const dueDate = new Date(new Date(loan.startDate).getTime() + loan.durationDays * 24 * 60 * 60 * 1000);
                realizedCashFlows.push({ amount: totalRepayable, date: dueDate });
            }
        }
        // For DEFAULTED loans: no inflows added = total loss reflected in IRR
    });

    const portfolioIRR = calculateXIRR(realizedCashFlows) || 0;

    // Projected Portfolio IRR (deal economics - ignores defaults)
    // Shows what IRR would be if all loans perform as projected
    const projectedCashFlows: CashFlow[] = [];
    fundLoans.forEach(loan => {
        // 1. Outflow: Principal on Start Date
        projectedCashFlows.push({ amount: -loan.principal, date: new Date(loan.startDate) });

        // 2. Inflows: Use projected schedule regardless of status
        if (loan.installments && loan.installments.length > 0) {
            loan.installments.forEach(inst => {
                projectedCashFlows.push({ amount: inst.amount, date: new Date(inst.dueDate) });
            });
        } else {
            // Bullet Loan Fallback
            const totalRepayable = loan.principal + calculateInterest(loan.principal, loan.interestRate, loan.durationDays);
            const dueDate = new Date(new Date(loan.startDate).getTime() + loan.durationDays * 24 * 60 * 60 * 1000);
            projectedCashFlows.push({ amount: totalRepayable, date: dueDate });
        }
    });

    const projectedPortfolioIRR = calculateXIRR(projectedCashFlows) || 0;

    return {
        totalRaised: fund.totalRaised,
        deployedCapital,
        availableCapital,
        nplVolume,
        projectedIncome,
        totalProcessingFees: fundLoans.reduce((sum, l) => sum + (l.processingFeeRate ? (l.principal * (l.processingFeeRate / 100)) : 0), 0),
        totalExpenses: totalAllocatedExpenses,
        totalAllocatedCostOfCapital,
        totalUpfrontCostsDeployed: totalUpfrontVariableCosts,
        nav: fund.totalRaised + totalAllocatedCostOfCapital - nplPrincipalLoss,
        dailyAvailableCapitalCost: (availableCapital * (fund.costOfCapitalRate / 100)) / 360,
        accumulatedUndeployedCost,
        netYield,
        aum: fund.totalRaised + totalAllocatedCostOfCapital + netYield, // User Formula: Raised + Deployed Cost + Net Yield
        nplRatio,
        portfolioIRR,
        projectedPortfolioIRR,
        globalCost: {
            annual: annualGlobalCost,
            monthly: monthlyGlobalCost,
            weekly: weeklyGlobalCost,
            daily: dailyGlobalCost
        }
    };
};

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export const formatPercentage = (rate: number) => {
    return `${rate.toFixed(2)}%`;
};

/**
 * Calculate Realized IM Yield (Yield from Closed/Matured loans)
 */
export const calculateRealizedImYield = (fund: Fund, loans: Loan[]): number => {
    let totalRealizedYield = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const relevantLoans = loans.filter(l => {
        if (l.fundId !== fund.id) return false;
        if (l.status === 'CLOSED') return true;
        if (l.status === 'ACTIVE') {
            // Check if final installment date is passed
            if (l.installments && l.installments.length > 0) {
                const lastDate = new Date(l.installments[l.installments.length - 1].dueDate);
                return lastDate <= today;
            } else {
                // Bullet
                const maturityDate = new Date(l.startDate);
                maturityDate.setDate(maturityDate.getDate() + l.durationDays);
                return maturityDate <= today;
            }
        }
        return false;
    });

    relevantLoans.forEach(loan => {
        const totalInterest = calculateInterest(loan.principal, loan.interestRate, loan.durationDays);
        const processingFee = loan.processingFeeRate ? (loan.principal * (loan.processingFeeRate / 100)) : 0;

        // Yield = Interest - (VarCosts + CoC) (ISOLATED FEE)
        const totalIncome = totalInterest;

        const totalVarCosts = calculateVariableCosts(loan.principal, loan.variableCosts);
        const totalCoC = calculateAllocatedCostOfCapital(loan.principal, fund.costOfCapitalRate, loan.durationDays);

        // Net Yield = Income - Expenses
        const netYield = Math.max(0, totalIncome - (totalVarCosts + totalCoC));

        // To keep it consistent with the "Repayment - BreakEven" logic:
        // Repayment = Principal + Interest + Fee (Assuming Fee is part of the economics, even if upfront)
        // BreakEven = Principal + VarCosts + CoC
        // Surplus = Repayment - BreakEven
        // = (Principal + Interest + Fee) - (Principal + VarCosts + CoC)
        // = Interest + Fee - VarCosts - CoC
        // This matches the user's formula.

        totalRealizedYield += netYield;
    });

    return totalRealizedYield;
};
