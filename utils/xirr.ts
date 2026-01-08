/**
 * Calculates the XIRR (Extended Internal Rate of Return) for a series of cash flows.
 * Uses the Newton-Raphson method to solve for the rate that makes the Net Present Value (NPV) zero.
 * 
 * IMPORTANT: Uses a 360-day year basis as per user request.
 */

export interface CashFlow {
    amount: number; // Negative for outflows, Positive for inflows
    date: Date;
}

const MAX_ITERATIONS = 100;
const TOLERANCE = 1e-7;
const DAYS_IN_YEAR = 360; // User Request: 360 instead of 365

export const calculateXIRR = (cashFlows: CashFlow[], guess: number = 0.1): number | null => {
    // 1. Validate inputs
    if (!cashFlows || cashFlows.length < 2) return null;

    // Must have at least one positive and one negative value
    let hasPositive = false;
    let hasNegative = false;
    for (const flow of cashFlows) {
        if (flow.amount > 0) hasPositive = true;
        if (flow.amount < 0) hasNegative = true;
    }
    if (!hasPositive || !hasNegative) return null;

    // 2. Sort by date
    const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const startDate = sortedFlows[0].date;

    let rate = guess;

    // 3. Newton-Raphson Iteration
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        let npv = 0;
        let dNpv = 0; // Derivative of NPV

        for (const flow of sortedFlows) {
            // Calculate days elapsed since start (360-day basis convention isn't just /360, 
            // usually it means how we count days difference. 
            // Simple approach: (Diff in ms / ms_per_day) / 360.
            // If they mean "30/360" day count convention, that's complex. 
            // Usually "use 360 for annual" means exponent denominator is 360.

            const daysElapsed = (flow.date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
            const timeInYears = daysElapsed / DAYS_IN_YEAR;

            // Avoid division by zero if rate is -1 (shouldn't happen with reasonable guess)
            const factor = Math.pow(1 + rate, timeInYears);

            npv += flow.amount / factor;

            // Derivative of (Amount * (1+r)^-t) is (-t * Amount * (1+r)^(-t-1))
            // dNpv += -timeInYears * flow.amount * Math.pow(1 + rate, -timeInYears - 1);
            dNpv += -timeInYears * flow.amount / (factor * (1 + rate));
        }

        if (Math.abs(npv) < TOLERANCE) {
            return rate * 100; // Return as percentage
        }

        if (Math.abs(dNpv) < TOLERANCE) {
            // Derivative too close to zero, Newton method fails. Try to adjust guess or fail.
            return null;
        }

        const newRate = rate - npv / dNpv;

        // Safety check for wild divergence?
        if (!isFinite(newRate)) return null;

        rate = newRate;
    }

    return null; // Failed to converge
};
