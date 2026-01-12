import { getDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

export interface IActivityLog {
    _id?: ObjectId;
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
    timestamp: Date;
    ipAddress?: string;
}

const ActivityLog = {
    async create(logEntry: Omit<IActivityLog, '_id'>): Promise<IActivityLog> {
        const db = await getDatabase();
        const logs = db.collection<IActivityLog>('activityLogs');

        const result = await logs.insertOne({
            ...logEntry,
            timestamp: logEntry.timestamp || new Date()
        } as any);

        return { ...logEntry, _id: result.insertedId };
    },

    async find(query: any = {}) {
        const db = await getDatabase();
        const logs = db.collection<IActivityLog>('activityLogs');
        return {
            sort: (sortOptions: any) => ({
                limit: (limitNum: number) => ({
                    skip: (skipNum: number) => ({
                        lean: () => logs.find(query).sort(sortOptions).limit(limitNum).skip(skipNum).toArray()
                    })
                })
            })
        };
    },

    async countDocuments(query: any = {}): Promise<number> {
        const db = await getDatabase();
        const logs = db.collection<IActivityLog>('activityLogs');
        return logs.countDocuments(query);
    }
};

export default ActivityLog;
