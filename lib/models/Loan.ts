import { getDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';
import { LoanStatus, RepaymentType, CostItem } from '@/types';

export interface Loan {
    _id?: ObjectId;
    userId: ObjectId;
    fundId: ObjectId;
    borrowerName: string;
    principal: number;
    interestRate: number;
    processingFeeRate?: number;
    startDate: string;
    durationDays: number;
    status: LoanStatus;
    variableCosts: CostItem[];
    repaymentType: RepaymentType;
    installments: Array<{
        id: string;
        dueDate: string;
        amount: number;
        status: string;
        principalComponent: number;
        interestComponent: number;
    }>;
    defaultedAmount?: number;
    createdAt: Date;
}

export async function createLoan(userId: string, loanData: Omit<Loan, '_id' | 'userId' | 'createdAt'>, userRole?: string): Promise<Loan> {
    const db = await getDatabase();
    const loans = db.collection<Loan>('loans');
    const funds = db.collection('funds');

    const { fundId, ...restLoanData } = loanData;

    // If CRO is creating the loan, assign it to the fund owner instead
    let loanOwnerId = new ObjectId(userId);
    if (userRole === 'cro') {
        const fund = await funds.findOne({ _id: new ObjectId(fundId as any) });
        if (fund) {
            loanOwnerId = fund.userId;
        }
    }

    const loan: Loan = {
        userId: loanOwnerId,
        fundId: new ObjectId(fundId as any),
        ...restLoanData,
        createdAt: new Date()
    };

    const result = await loans.insertOne(loan);
    return { ...loan, _id: result.insertedId };
}

export async function getLoansByUserId(userId: string): Promise<Loan[]> {
    const db = await getDatabase();
    const loans = db.collection<Loan>('loans');
    return loans.find({ userId: new ObjectId(userId) }).toArray();
}

export async function getAllLoans(): Promise<Loan[]> {
    const db = await getDatabase();
    const loans = db.collection<Loan>('loans');
    return loans.find({}).toArray();
}

export async function getLoansByFundId(fundId: string, userId: string, userRole?: string): Promise<Loan[]> {
    const db = await getDatabase();
    const loans = db.collection<Loan>('loans');

    // CRO can access any fund's loans
    if (userRole === 'cro') {
        return loans.find({ fundId: new ObjectId(fundId) }).toArray();
    }

    return loans.find({ fundId: new ObjectId(fundId), userId: new ObjectId(userId) }).toArray();
}

export async function getLoanById(loanId: string, userId: string, userRole?: string): Promise<Loan | null> {
    const db = await getDatabase();
    const loans = db.collection<Loan>('loans');

    // CRO can access any loan
    if (userRole === 'cro') {
        return loans.findOne({ _id: new ObjectId(loanId) });
    }

    return loans.findOne({ _id: new ObjectId(loanId), userId: new ObjectId(userId) });
}

export async function updateLoan(loanId: string, userId: string, updates: Partial<Omit<Loan, '_id' | 'userId' | 'fundId' | 'createdAt'>>, userRole?: string): Promise<boolean> {
    const db = await getDatabase();
    const loans = db.collection<Loan>('loans');

    let filter;
    if (userRole === 'cro') {
        filter = { _id: new ObjectId(loanId) };
    } else {
        filter = { _id: new ObjectId(loanId), userId: new ObjectId(userId) };
    }

    const result = await loans.updateOne(filter, { $set: updates });
    return result.modifiedCount > 0;
}

export async function deleteLoan(loanId: string, userId: string, userRole?: string): Promise<boolean> {
    const db = await getDatabase();
    const loans = db.collection<Loan>('loans');

    let filter;
    if (userRole === 'cro') {
        filter = { _id: new ObjectId(loanId) };
    } else {
        filter = { _id: new ObjectId(loanId), userId: new ObjectId(userId) };
    }

    const result = await loans.deleteOne(filter);
    return result.deletedCount > 0;
}

export async function getLoanOwnerInfo(loanId: string): Promise<{ userId: string; borrowerName: string; fundId: string } | null> {
    const db = await getDatabase();
    const loans = db.collection<Loan>('loans');
    const loan = await loans.findOne({ _id: new ObjectId(loanId) });

    if (!loan) return null;

    return {
        userId: loan.userId.toString(),
        borrowerName: loan.borrowerName,
        fundId: loan.fundId.toString()
    };
}
