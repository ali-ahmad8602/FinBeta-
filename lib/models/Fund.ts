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
        createdAt: new Date()
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

export async function getFundById(fundId: string, userId: string): Promise<Fund | null> {
    const db = await getDatabase();
    const funds = db.collection<Fund>('funds');
    return funds.findOne({ _id: new ObjectId(fundId), userId: new ObjectId(userId) });
}

export async function updateFund(fundId: string, userId: string, updates: Partial<Omit<Fund, '_id' | 'userId' | 'createdAt'>>): Promise<boolean> {
    const db = await getDatabase();
    const funds = db.collection<Fund>('funds');
    const result = await funds.updateOne(
        { _id: new ObjectId(fundId), userId: new ObjectId(userId) },
        { $set: updates }
    );
    return result.modifiedCount > 0;
}

export async function deleteFund(fundId: string, userId: string): Promise<boolean> {
    const db = await getDatabase();
    const funds = db.collection<Fund>('funds');
    const result = await funds.deleteOne({ _id: new ObjectId(fundId), userId: new ObjectId(userId) });
    return result.deletedCount > 0;
}
