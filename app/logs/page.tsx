"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { History, Filter, Download } from 'lucide-react';

interface ActivityLog {
    _id: string;
    userName: string;
    userRole: string;
    userEmail: string;
    actionType: string;
    actionDescription: string;
    entityType: string;
    fundName?: string;
    timestamp: string;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('');
    const [page, setPage] = useState(0);
    const [totalLogs, setTotalLogs] = useState(0);
    const logsPerPage = 50;
    const router = useRouter();

    useEffect(() => {
        setPage(0); // Reset to first page when filter changes
    }, [filter]);

    useEffect(() => {
        fetchLogs();
    }, [filter, page]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const skip = page * logsPerPage;
            let url = `/api/logs?limit=${logsPerPage}&skip=${skip}`;
            if (filter) {
                url += `&actionType=${filter}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setTotalLogs(data.pagination.total);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (actionType: string) => {
        if (actionType.includes('CREATE')) return 'bg-green-100 text-green-700';
        if (actionType.includes('UPDATE')) return 'bg-blue-100 text-blue-700';
        if (actionType.includes('DELETE')) return 'bg-red-100 text-red-700';
        if (actionType.includes('CRO_OVERRIDE')) return 'bg-purple-100 text-purple-700';
        if (actionType.includes('DEFAULT')) return 'bg-orange-100 text-orange-700';
        return 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <History className="w-8 h-8 text-indigo-600" />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
                            <p className="text-gray-500">System-wide activity and audit trail</p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Back to Dashboard
                    </button>
                </div>

                {/* Filters */}
                <div className="mb-6 flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filter:</span>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                    >
                        <option value="">All Actions</option>
                        <option value="FUND_CREATE">Fund Created</option>
                        <option value="FUND_UPDATE">Fund Updated</option>
                        <option value="FUND_DELETE">Fund Deleted</option>
                        <option value="CAPITAL_RAISE">Capital Raised</option>
                        <option value="LOAN_CREATE">Loan Created</option>
                        <option value="LOAN_UPDATE">Loan Updated</option>
                        <option value="LOAN_STATUS_CHANGE">Loan Status Changed</option>
                        <option value="LOAN_DELETE">Loan Deleted</option>
                        <option value="CRO_OVERRIDE_FUND">CRO Override (Fund)</option>
                        <option value="CRO_OVERRIDE_LOAN">CRO Override (Loan)</option>
                    </select>
                </div>

                {/* Logs Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading logs...</div>
                    ) : logs.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No logs found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fund</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {logs.map((log) => (
                                        <tr key={log._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                                                <div className="text-xs text-gray-500">
                                                    {log.userRole === 'CRO' ? 'CRO' : 'Fund Manager'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.actionType)}`}>
                                                    {log.actionType.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                                                {log.actionDescription}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {log.fundName || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {!loading && logs.length > 0 && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Showing {page * logsPerPage + 1}-{Math.min((page + 1) * logsPerPage, totalLogs)} of {totalLogs} activities
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(prev => Math.max(0, prev - 1))}
                                disabled={page === 0}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="px-4 py-2 text-sm text-gray-700">
                                Page {page + 1} of {Math.ceil(totalLogs / logsPerPage)}
                            </span>
                            <button
                                onClick={() => setPage(prev => prev + 1)}
                                disabled={(page + 1) * logsPerPage >= totalLogs}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
