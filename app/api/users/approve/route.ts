import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || session.user.role !== 'cfo') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, role, status } = await req.json();

        if (!userId || !role || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = await getDatabase();
        const users = db.collection('users');

        const result = await users.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { role, status } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error approving user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
