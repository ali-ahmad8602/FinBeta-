import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import ActivityLog from '@/lib/models/ActivityLog';
import { getFundsByUserId } from '@/lib/models/Fund';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = parseInt(searchParams.get('skip') || '0');
        const fundId = searchParams.get('fundId');
        const actionType = searchParams.get('actionType');

        let query: any = {};

        // CRO sees all logs
        // Fund Managers see only their own activities + CRO actions on their funds
        if (session.user.role !== 'cro') {
            // Get all fund IDs owned by this fund manager
            const userFunds = await getFundsByUserId(session.user.id);
            const userFundIds = userFunds.map(f => f._id?.toString());

            query.$or = [
                // Their own activities
                { userId: session.user.id },
                // CRO actions on their specific funds
                {
                    userRole: 'CRO',
                    fundId: { $in: userFundIds }
                }
            ];
        }

        // Filter by fund
        if (fundId) {
            query.fundId = fundId;
        }

        // Filter by action type
        if (actionType) {
            query.actionType = actionType;
        }

        const logs = await (await ActivityLog.find(query))
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip)
            .lean();

        const total = await ActivityLog.countDocuments(query);

        return NextResponse.json({
            logs,
            pagination: {
                total,
                limit,
                skip,
                hasMore: skip + limit < total
            }
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
