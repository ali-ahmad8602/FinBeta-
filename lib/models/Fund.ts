import { getDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

export interface Fund {
    _id?: ObjectId;
    userId: ObjectId;
    name: string;
    totalRaised: number;
    costOfCapitalRate: number;
    createdAt: Date;
}

export async function createFund(userId: string, fundData: Omit<Fund, '_id' | 'userId' | 'createdAt'>): Promise<Fund> {
    const db = await getDatabase();
    const funds = db.collection<Fund>('funds');

    const fund: Fund = {
        userId: new ObjectId(userId),
        ...fundData,
        createdAt: (fundData as any).createdAt instanceof Date ? (fundData as any).createdAt : new Date()
    };

    const result = await funds.insertOne(fund);
    return { ...fund, _id: result.insertedId };
}

export async function getFundsByUserId(userId: string): Promise<Fund[]> {
    const db = await getDatabase();
    const funds = db.collection<Fund>('funds');
    return funds.find({ userId: new ObjectId(userId) }).toArray();
}

export async function getAllFunds(): Promise<Fund[]> {
    const db = await getDatabase();
    const funds = db.collection<Fund>('funds');
    return funds.find({}).toArray();
}

export async function getFundById(fundId: string, userId: string, userRole?: string): Promise<Fund | null> {
    const db = await getDatabase();
    const funds = db.collection<Fund>('funds');

    // CRO can access any fund
    if (userRole === 'cro') {
        return funds.findOne({ _id: new ObjectId(fundId) });
    }

    // Fund managers can only access their own funds
    return funds.findOne({ _id: new ObjectId(fundId), userId: new ObjectId(userId) });
}

export async function updateFund(fundId: string, userId: string, updates: Partial<Omit<Fund, '_id' | 'userId' | 'createdAt'>>, userRole?: string): Promise<boolean> {
    const db = await getDatabase();
    const funds = db.collection<Fund>('funds');

    let filter;
    if (userRole === 'cro') {
        filter = { _id: new ObjectId(fundId) };
    } else {
        filter = { _id: new ObjectId(fundId), userId: new ObjectId(userId) };
    }

    const result = await funds.updateOne(filter, { $set: updates });
    return result.modifiedCount > 0;
}

export async function deleteFund(fundId: string, userId: string, userRole?: string): Promise<boolean> {
    const db = await getDatabase();
    const funds = db.collection<Fund>('funds');

    let filter;
    if (userRole === 'cro') {
        filter = { _id: new ObjectId(fundId) };
    } else {
        filter = { _id: new ObjectId(fundId), userId: new ObjectId(userId) };
    }

    const result = await funds.deleteOne(filter);
    return result.deletedCount > 0;
}

export async function getFundOwnerInfo(fundId: string): Promise<{ userId: string; fundName: string } | null> {
    const db = await getDatabase();
    const funds = db.collection<Fund>('funds');
    const fund = await funds.findOne({ _id: new ObjectId(fundId) });

    if (!fund) return null;

    return {
        userId: fund.userId.toString(),
        fundName: fund.name
    };
}
