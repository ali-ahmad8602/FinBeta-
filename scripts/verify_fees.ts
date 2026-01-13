import { calculateLoanIRR, generateRepaymentSchedule } from '../utils/finance.js';
import { Loan, Fund } from '../types/index.js';

function verify() {
    const principal = 100000;
    const interestRate = 14;
    const processingFeeRate = 2;
    const startDate = '2026-01-01';
    const durationDays = 360;

    console.log('--- Current Implementation (Upfront Fee) ---');

    // 1. Check Repayment Schedule
    const schedule = generateRepaymentSchedule(principal, interestRate, startDate, durationDays, 'MONTHLY');
    const totalRepayment = schedule.reduce((sum, inst) => sum + inst.amount, 0);
    const expectedInterest = (principal * (interestRate / 100) * durationDays) / 360;
    const expectedRepayment = principal + expectedInterest;

    console.log(`Total Repayment: ${totalRepayment.toFixed(2)}`);
    console.log(`Expected Repayment (Principal + Interest): ${expectedRepayment.toFixed(2)}`);

    if (Math.abs(totalRepayment - expectedRepayment) < 0.01) {
        console.log('✅ SUCCESS: Processing fee EXCLUDED from repayments.');
    } else {
        console.log('❌ FAILURE: Processing fee might be included in repayments.');
    }

    // 2. Check IRR
    const irr = calculateLoanIRR(principal, interestRate, processingFeeRate, startDate, durationDays, 'MONTHLY');
    console.log(`Calculated IRR: ${irr?.toFixed(4)}%`);

    // Verification of IRR logic:
    // If fee (2000) is upfront, effective outflow is 98000.
    // Future inflows sum to 114000.
    // IRR should be higher than a loan without upfront fee.
    const irrNoFee = calculateLoanIRR(principal, interestRate, 0, startDate, durationDays, 'MONTHLY');
    console.log(`IRR without fee: ${irrNoFee?.toFixed(4)}%`);

    if (irr && irrNoFee && irr > irrNoFee) {
        console.log('✅ SUCCESS: IRR is higher with upfront fee.');
    } else {
        console.log('❌ FAILURE: IRR should be higher with upfront fee.');
    }
}

verify();
