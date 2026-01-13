export interface CostItem {
    id: string;
    name: string;
    percentage: number;
}

export type LoanStatus = 'ACTIVE' | 'CLOSED' | 'DEFAULTED';
export type RepaymentType = 'BULLET' | 'MONTHLY';

export interface Installment {
    id: string;
    dueDate: string;
    amount: number;
    principalComponent: number;
    interestComponent: number;
    status: 'PENDING' | 'PAID' | 'OVERDUE';
}

export interface Loan {
    id: string;
    fundId: string;
    borrowerName: string;
    principal: number;
    interestRate: number; // % PA
    processingFeeRate?: number; // % of Principal
    startDate: string; // ISO Date
    durationDays: number; // Tenure in days
    status: LoanStatus;
    variableCosts: CostItem[];
    repaymentType: RepaymentType;
    installments: Installment[];
    defaultedAmount?: number; // Amount marked as NPL (Partial or Full)
}

export interface Fund {
    id: string;
    userId: string;
    name: string;
    totalRaised: number;
    costOfCapitalRate: number; // % PA
    createdAt: string; // ISO Date
}
