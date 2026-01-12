import { getDatabase } from './mongodb';
import ActivityLog, { IActivityLog } from './models/ActivityLog';

interface LogActivityParams {
    userId: string;
    userName: string;
    userRole: 'CRO' | 'FUND_MANAGER';
    userEmail: string;
    actionType: string;
    actionDescription: string;
    entityType: 'FUND' | 'LOAN' | 'USER' | 'CAPITAL_RAISE';
    entityId?: string;
    entityName?: string;
    fundId?: string;
    fundName?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
}

/**
 * Logs an activity to the database
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
    try {
        await getDatabase();

        const logEntry: Omit<IActivityLog, '_id'> = {
            userId: params.userId,
            userName: params.userName,
            userRole: params.userRole,
            userEmail: params.userEmail,
            actionType: params.actionType,
            actionDescription: params.actionDescription,
            entityType: params.entityType,
            entityId: params.entityId,
            entityName: params.entityName,
            fundId: params.fundId,
            fundName: params.fundName,
            metadata: params.metadata,
            timestamp: new Date(),
            ipAddress: params.ipAddress,
        };

        await ActivityLog.create(logEntry);
    } catch (error) {
        // Log to console but don't throw - we don't want logging failures to break operations
        console.error('Failed to log activity:', error);
    }
}

/**
 * Action type constants for consistency
 */
export const ActionTypes = {
    // Fund actions
    FUND_CREATE: 'FUND_CREATE',
    FUND_UPDATE: 'FUND_UPDATE',
    FUND_DELETE: 'FUND_DELETE',
    CAPITAL_RAISE: 'CAPITAL_RAISE',

    // Loan actions
    LOAN_CREATE: 'LOAN_CREATE',
    LOAN_UPDATE: 'LOAN_UPDATE',
    LOAN_STATUS_CHANGE: 'LOAN_STATUS_CHANGE',
    LOAN_DELETE: 'LOAN_DELETE',
    LOAN_DEFAULT: 'LOAN_DEFAULT',

    // User actions
    USER_CREATE: 'USER_CREATE',
    USER_UPDATE: 'USER_UPDATE',
    USER_DELETE: 'USER_DELETE',
    USER_APPROVE: 'USER_APPROVE',
    USER_REJECT: 'USER_REJECT',

    // CRO Override actions
    CRO_OVERRIDE_FUND: 'CRO_OVERRIDE_FUND',
    CRO_OVERRIDE_LOAN: 'CRO_OVERRIDE_LOAN',
} as const;

/**
 * Helper to get user info from session for logging
 */
export function getUserInfoForLog(session: any) {
    return {
        userId: session.user.id,
        userName: session.user.name || session.user.email,
        userRole: (session.user.role === 'cro' ? 'CRO' : 'FUND_MANAGER') as 'CRO' | 'FUND_MANAGER',
        userEmail: session.user.email,
    };
}
