import { Fund, Loan } from '@/types';
import { calculateAllocatedCostOfCapital, calculateVariableCosts, calculateInterest } from './finance';
import { calculateXIRR, CashFlow } from './xirr';

export interface FundMetrics {
    totalRaised: number;
    deployedCapital: number;
    availableCapital: number;
    nplVolume: number;
    projectedIncome: number;
    totalExpenses: number; // Cost of Capital + Variable Costs
    totalAllocatedCostOfCapital: number;
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

    const deployedCapital = fundLoans
        .filter(l => l.status === 'ACTIVE' || l.status === 'DEFAULTED')
        .reduce((sum, loan) => sum + loan.principal, 0);

    const availableCapital = fund.totalRaised - deployedCapital;

    const nplLoans = fundLoans.filter(l => l.status === 'DEFAULTED');

    // NPL Volume now = Total Repayable (Principal + Interest + Fee)
    const nplVolume = nplLoans.reduce((sum, loan) => {
        const days = loan.durationDays;
        const interest = calculateInterest(loan.principal, loan.interestRate, days);
        const fee = loan.processingFeeRate ? (loan.principal * (loan.processingFeeRate / 100)) : 0;
        return sum + loan.principal + interest + fee;
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
        const processingFee = (loan.processingFeeRate && loan.status !== 'DEFAULTED') ? (loan.principal * (loan.processingFeeRate / 100)) : 0;

        // 3. Expense Logic
        // Base Expenses: Allocated Cost + Variable Costs
        let loanExpenses = allocatedCost + variableCost;

        // Add NPL Expense (The defaulted amount itself is a loss/expense)
        // Plus, we might consider the 'Lost Interest' as an opportunity cost, but for "Net Yield" (Cash basis), 
        // we simply don't get the income, and we lose the capital.
        // loanExpenses += defaultedAmount; // REMOVED as per request to keep Expenses separate from NPL losses

        projectedIncome += interestIncome + processingFee;
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
        totalExpenses: totalAllocatedExpenses,
        totalAllocatedCostOfCapital, // New Variable
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
