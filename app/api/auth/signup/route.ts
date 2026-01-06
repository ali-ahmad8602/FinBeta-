import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/models/User';

export async function POST(request: NextRequest) {
    try {
        const { name, email, password } = await request.json();

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const user = await createUser(email, password, name);

        return NextResponse.json(
            { message: 'User created successfully', userId: user._id },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Signup error:', error);

        if (error.message === 'User already exists') {
            return NextResponse.json(
                { error: 'User already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
