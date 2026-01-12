import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserByEmail, verifyPassword, updatePassword } from '@/lib/models/User';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { oldPassword, newPassword } = await req.json();

        if (!oldPassword || !newPassword) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // 1. Get user to verify old password
        const user = await getUserByEmail(session.user.email);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 2. Verify old password
        const isValid = await verifyPassword(oldPassword, user.password);
        if (!isValid) {
            // Security: Don't reveal specific error, or do? Standard practice is "Invalid credentials"
            // but for "Change Password", "Invalid old password" is acceptable user feedback.
            return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
        }

        // 3. Update password
        const success = await updatePassword(user._id!.toString(), newPassword);

        if (!success) {
            return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error('Password update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
