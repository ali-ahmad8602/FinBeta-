import { getDatabase } from '../mongodb';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

export interface User {
    _id?: ObjectId;
    email: string;
    password: string;
    name: string;
    role: 'fund_manager' | 'cro';
    status: 'pending' | 'active' | 'rejected';
    createdAt: Date;
}

export async function createUser(email: string, password: string, name: string, role: 'fund_manager' | 'cro' = 'fund_manager'): Promise<User> {
    const db = await getDatabase();
    const users = db.collection<User>('users');

    // Check if user already exists
    const existingUser = await users.findOne({ email });
    if (existingUser) {
        throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user: User = {
        email,
        password: hashedPassword,
        name,
        role,
        status: 'pending',
        createdAt: new Date()
    };

    const result = await users.insertOne(user);
    return { ...user, _id: result.insertedId };
}

export async function getUserByEmail(email: string): Promise<User | null> {
    const db = await getDatabase();
    const users = db.collection<User>('users');
    return users.findOne({ email });
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}
