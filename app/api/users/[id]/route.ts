import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        // Only CRO can deactivate users
        if (!session?.user?.id || session.user.role !== 'cro') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;

        if (!id) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const db = await getDatabase();
        const users = db.collection('users');

        // Soft delete: set status to 'rejected'
        const result = await users.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: 'rejected' } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User deactivated successfully' });
    } catch (error) {
        console.error('Error deactivating user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
