import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDatabase } from '@/lib/mongodb';
import { User } from '@/lib/models/User';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || session.user.role !== 'cfo') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = await getDatabase();
        const users = db.collection<User>('users');

        // Fetch:
        // 1. Users with role 'fund_manager' (active)
        // 2. Users with no role (legacy, treated as fund_manager)
        // 3. Users with status 'pending' (waiting approval)
        const managers = await users.find(
            {
                $or: [
                    { role: 'fund_manager' },
                    { role: { $exists: false } },
                    { status: 'pending' },
                    { status: 'rejected' }
                ]
            },
            { projection: { password: 0 } }
        ).toArray();

        return NextResponse.json(managers);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
