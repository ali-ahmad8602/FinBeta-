import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getLoanById, updateLoan, deleteLoan, getLoanOwnerInfo } from '@/lib/models/Loan';
import { logActivity, ActionTypes, getUserInfoForLog } from '@/lib/activityLogger';
import { getFundOwnerInfo } from '@/lib/models/Fund';

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
        const loan = await getLoanById(id, session.user.id, session.user.role);
        if (!loan) {
            return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
        }

        // Log CRO access to other manager's loans
        if (session.user.role === 'cro' && loan.userId.toString() !== session.user.id) {
            const userInfo = getUserInfoForLog(session);
            const fundInfo = await getFundOwnerInfo(loan.fundId.toString());

            await logActivity({
                ...userInfo,
                actionType: ActionTypes.CRO_OVERRIDE_LOAN,
                actionDescription: `CRO accessed loan: ${loan.borrowerName}`,
                entityType: 'LOAN',
                entityId: id,
                entityName: loan.borrowerName,
                fundId: loan.fundId.toString(),
                fundName: fundInfo?.fundName,
            });
        }

        return NextResponse.json(loan);
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

        // Get loan info before update
        const existingLoan = await getLoanById(id, session.user.id, session.user.role);
        if (!existingLoan) {
            return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
        }

        const updated = await updateLoan(id, session.user.id, body, session.user.role);

        if (!updated) {
            return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
        }

        // Get fund info for logging
        const fundInfo = await getFundOwnerInfo(existingLoan.fundId.toString());
        const userInfo = getUserInfoForLog(session);

        // Determine if this is a status change or general update
        const isStatusChange = body.status && body.status !== existingLoan.status;
        const actionType = isStatusChange ? ActionTypes.LOAN_STATUS_CHANGE : ActionTypes.LOAN_UPDATE;

        let actionDescription = '';
        if (isStatusChange) {
            actionDescription = `Changed loan status for ${existingLoan.borrowerName}: ${existingLoan.status} → ${body.status}`;
        } else {
            actionDescription = `Updated loan: ${existingLoan.borrowerName}`;
        }

        // Check if CRO is overriding
        const isCFOOverride = session.user.role === 'cro' && existingLoan.userId.toString() !== session.user.id;

        await logActivity({
            ...userInfo,
            actionType: isCFOOverride ? ActionTypes.CRO_OVERRIDE_LOAN : actionType,
            actionDescription: isCFOOverride ? `CRO ${actionDescription.toLowerCase()}` : actionDescription,
            entityType: 'LOAN',
            entityId: id,
            entityName: existingLoan.borrowerName,
            fundId: existingLoan.fundId.toString(),
            fundName: fundInfo?.fundName,
            metadata: {
                changes: body,
                oldStatus: existingLoan.status,
                newStatus: body.status
            }
        });

        return NextResponse.json({ message: 'Loan updated successfully' });
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

        // Get loan info before deletion
        const existingLoan = await getLoanById(id, session.user.id, session.user.role);
        if (!existingLoan) {
            return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
        }

        const deleted = await deleteLoan(id, session.user.id, session.user.role);

        if (!deleted) {
            return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
        }

        // Get fund info for logging
        const fundInfo = await getFundOwnerInfo(existingLoan.fundId.toString());
        const userInfo = getUserInfoForLog(session);

        // Check if CRO is overriding
        const isCFOOverride = session.user.role === 'cro' && existingLoan.userId.toString() !== session.user.id;

        await logActivity({
            ...userInfo,
            actionType: isCFOOverride ? ActionTypes.CRO_OVERRIDE_LOAN : ActionTypes.LOAN_DELETE,
            actionDescription: isCFOOverride
                ? `CRO deleted loan: ${existingLoan.borrowerName}`
                : `Deleted loan: ${existingLoan.borrowerName}`,
            entityType: 'LOAN',
            entityId: id,
            entityName: existingLoan.borrowerName,
            fundId: existingLoan.fundId.toString(),
            fundName: fundInfo?.fundName,
            metadata: {
                principal: existingLoan.principal,
                status: existingLoan.status
            }
        });

        return NextResponse.json({ message: 'Loan deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
