import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getLoansByUserId, createLoan, getAllLoans } from '@/lib/models/Loan';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const fundId = searchParams.get('fundId');

        let loans;
        if (session.user.role === 'cfo') {
            loans = await getAllLoans();
        } else {
            loans = await getLoansByUserId(session.user.id);
        }

        // Filter by fundId if provided
        const filteredLoans = fundId
            ? loans.filter(loan => loan.fundId.toString() === fundId)
            : loans;

        return NextResponse.json(filteredLoans);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const loan = await createLoan(session.user.id, body);

        return NextResponse.json(loan, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
