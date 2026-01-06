import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getFundById } from '@/lib/models/Fund';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { amount, costOfCapitalRate } = await request.json();

        if (!amount || amount <= 0 || !costOfCapitalRate || costOfCapitalRate < 0) {
            return NextResponse.json(
                { error: 'Invalid amount or cost of capital rate' },
                { status: 400 }
            );
        }

        // Get existing fund
        const fund = await getFundById(id, session.user.id);
        if (!fund) {
            return NextResponse.json({ error: 'Fund not found' }, { status: 404 });
        }

        // Calculate weighted average cost of capital (WACC)
        const existingCapital = fund.totalRaised;
        const existingRate = fund.costOfCapitalRate;
        const newCapital = amount;
        const newRate = costOfCapitalRate;

        const totalCapital = existingCapital + newCapital;
        const wacc = (existingCapital * existingRate + newCapital * newRate) / totalCapital;

        // Update fund
        const db = await getDatabase();
        const funds = db.collection('funds');

        await funds.updateOne(
            { _id: new ObjectId(id), userId: new ObjectId(session.user.id) },
            {
                $set: {
                    totalRaised: totalCapital,
                    costOfCapitalRate: wacc,
                },
            }
        );

        return NextResponse.json({
            message: 'Capital raised successfully',
            newTotalRaised: totalCapital,
            newCostOfCapitalRate: wacc,
        });
    } catch (error: any) {
        console.error('Capital raise error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
