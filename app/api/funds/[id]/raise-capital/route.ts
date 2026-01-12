import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getFundById, getFundOwnerInfo } from '@/lib/models/Fund';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { logActivity, ActionTypes, getUserInfoForLog } from '@/lib/activityLogger';

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

        // Get existing fund (with CRO override support)
        const fund = await getFundById(id, session.user.id, session.user.role);
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

        // CRO can update any fund
        let filter;
        if (session.user.role === 'cro') {
            filter = { _id: new ObjectId(id) };
        } else {
            filter = { _id: new ObjectId(id), userId: new ObjectId(session.user.id) };
        }

        await funds.updateOne(
            filter,
            {
                $set: {
                    totalRaised: totalCapital,
                    costOfCapitalRate: wacc,
                },
            }
        );

        // Log the capital raise
        const fundInfo = await getFundOwnerInfo(id);
        const userInfo = getUserInfoForLog(session);
        const isCFOOverride = session.user.role === 'cro' && fundInfo && fundInfo.userId !== session.user.id;

        await logActivity({
            ...userInfo,
            actionType: isCFOOverride ? ActionTypes.CRO_OVERRIDE_FUND : ActionTypes.CAPITAL_RAISE,
            actionDescription: isCFOOverride
                ? `CRO raised capital for ${fund.name}: ${amount.toLocaleString()} at ${costOfCapitalRate}%`
                : `Raised capital: ${amount.toLocaleString()} at ${costOfCapitalRate}%`,
            entityType: 'CAPITAL_RAISE',
            entityId: id,
            entityName: fund.name,
            fundId: id,
            fundName: fund.name,
            metadata: {
                amount,
                costOfCapitalRate,
                previousTotal: existingCapital,
                newTotal: totalCapital,
                previousRate: existingRate,
                newRate: wacc
            }
        });

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
