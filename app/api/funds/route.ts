import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getFundsByUserId, createFund, getAllFunds } from '@/lib/models/Fund';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let funds;
        if (session.user.role === 'cro') {
            funds = await getAllFunds();
        } else {
            funds = await getFundsByUserId(session.user.id);
        }
        return NextResponse.json(funds);
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
        const { name, totalRaised, costOfCapitalRate } = body;

        if (!name || totalRaised === undefined || costOfCapitalRate === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const fund = await createFund(session.user.id, {
            name,
            totalRaised,
            costOfCapitalRate,
        });

        return NextResponse.json(fund, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
