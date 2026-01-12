import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getFundById, updateFund, deleteFund, getFundOwnerInfo } from '@/lib/models/Fund';
import { logActivity, ActionTypes, getUserInfoForLog } from '@/lib/activityLogger';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const fund = await getFundById(id, session.user.id, session.user.role);

        if (!fund) {
            return NextResponse.json({ error: 'Fund not found' }, { status: 404 });
        }

        // Log CRO access to other manager's funds
        if (session.user.role === 'cro' && fund.userId.toString() !== session.user.id) {
            const userInfo = getUserInfoForLog(session);
            await logActivity({
                ...userInfo,
                actionType: ActionTypes.CRO_OVERRIDE_FUND,
                actionDescription: `CRO accessed fund: ${fund.name}`,
                entityType: 'FUND',
                entityId: id,
                entityName: fund.name,
                fundId: id,
                fundName: fund.name,
            });
        }

        return NextResponse.json(fund);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Get fund info before update for logging
        const fundInfo = await getFundOwnerInfo(id);
        const updated = await updateFund(id, session.user.id, body, session.user.role);

        if (!updated) {
            return NextResponse.json({ error: 'Fund not found' }, { status: 404 });
        }

        // Log the update
        const userInfo = getUserInfoForLog(session);
        const isCFOOverride = session.user.role === 'cro' && fundInfo && fundInfo.userId !== session.user.id;

        await logActivity({
            ...userInfo,
            actionType: isCFOOverride ? ActionTypes.CRO_OVERRIDE_FUND : ActionTypes.FUND_UPDATE,
            actionDescription: isCFOOverride
                ? `CRO updated fund: ${fundInfo?.fundName}`
                : `Updated fund: ${fundInfo?.fundName}`,
            entityType: 'FUND',
            entityId: id,
            entityName: fundInfo?.fundName,
            fundId: id,
            fundName: fundInfo?.fundName,
            metadata: { updates: body },
        });

        return NextResponse.json({ message: 'Fund updated successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Get fund info before deletion for logging
        const fundInfo = await getFundOwnerInfo(id);
        const deleted = await deleteFund(id, session.user.id, session.user.role);

        if (!deleted) {
            return NextResponse.json({ error: 'Fund not found' }, { status: 404 });
        }

        // Log the deletion
        const userInfo = getUserInfoForLog(session);
        const isCFOOverride = session.user.role === 'cro' && fundInfo && fundInfo.userId !== session.user.id;

        await logActivity({
            ...userInfo,
            actionType: isCFOOverride ? ActionTypes.CRO_OVERRIDE_FUND : ActionTypes.FUND_DELETE,
            actionDescription: isCFOOverride
                ? `CRO deleted fund: ${fundInfo?.fundName}`
                : `Deleted fund: ${fundInfo?.fundName}`,
            entityType: 'FUND',
            entityId: id,
            entityName: fundInfo?.fundName,
            fundId: id,
            fundName: fundInfo?.fundName,
        });

        return NextResponse.json({ message: 'Fund deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
