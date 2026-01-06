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

export async function createLoan(userId: string, loanData: Omit<Loan, '_id' | 'userId' | 'createdAt'>): Promise<Loan> {
    const db = await getDatabase();
    const loans = db.collection<Loan>('loans');

    const { fundId, ...restLoanData } = loanData;
    const loan: Loan = {
        userId: new ObjectId(userId),
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

export async function getLoansByFundId(fundId: string, userId: string): Promise<Loan[]> {
    const db = await getDatabase();
    const loans = db.collection<Loan>('loans');
    return loans.find({ fundId: new ObjectId(fundId), userId: new ObjectId(userId) }).toArray();
}

export async function getLoanById(loanId: string, userId: string): Promise<Loan | null> {
    const db = await getDatabase();
    const loans = db.collection<Loan>('loans');
    return loans.findOne({ _id: new ObjectId(loanId), userId: new ObjectId(userId) });
}

export async function updateLoan(loanId: string, userId: string, updates: Partial<Omit<Loan, '_id' | 'userId' | 'fundId' | 'createdAt'>>): Promise<boolean> {
    const db = await getDatabase();
    const loans = db.collection<Loan>('loans');
    const result = await loans.updateOne(
        { _id: new ObjectId(loanId), userId: new ObjectId(userId) },
        { $set: updates }
    );
    return result.modifiedCount > 0;
}

export async function deleteLoan(loanId: string, userId: string): Promise<boolean> {
    const db = await getDatabase();
    const loans = db.collection<Loan>('loans');
    const result = await loans.deleteOne({ _id: new ObjectId(loanId), userId: new ObjectId(userId) });
    return result.deletedCount > 0;
}
