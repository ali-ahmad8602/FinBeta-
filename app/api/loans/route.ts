import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getLoansByUserId, createLoan, getAllLoans } from '@/lib/models/Loan';
import { logActivity, ActionTypes, getUserInfoForLog } from '@/lib/activityLogger';
import { getFundOwnerInfo } from '@/lib/models/Fund';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const fundId = searchParams.get('fundId');

        let loans;
        if (session.user.role === 'cro') {
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
        const loan = await createLoan(session.user.id, body, session.user.role);

        // Get fund info for logging
        const fundInfo = await getFundOwnerInfo(body.fundId);
        const userInfo = getUserInfoForLog(session);

        // Check if CRO is creating loan for another fund manager's fund
        const isCFOOverride = session.user.role === 'cro' && fundInfo && fundInfo.userId !== session.user.id;

        // Log loan creation
        await logActivity({
            ...userInfo,
            actionType: isCFOOverride ? ActionTypes.CRO_OVERRIDE_LOAN : ActionTypes.LOAN_CREATE,
            actionDescription: isCFOOverride
                ? `CRO created loan for borrower: ${body.borrowerName} (${body.principal.toLocaleString()} at ${body.interestRate}%)`
                : `Created loan for borrower: ${body.borrowerName} (${body.principal.toLocaleString()} at ${body.interestRate}%)`,
            entityType: 'LOAN',
            entityId: loan._id?.toString(),
            entityName: body.borrowerName,
            fundId: body.fundId,
            fundName: fundInfo?.fundName,
            metadata: {
                principal: body.principal,
                interestRate: body.interestRate,
                durationDays: body.durationDays,
                repaymentType: body.repaymentType
            }
        });

        return NextResponse.json(loan, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
