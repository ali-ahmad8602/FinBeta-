"use client";

import React, { useState, useEffect } from 'react';
import { useFund } from '@/context/FundContext';
import { FundCard } from '@/components/FundCard';
import { LoanList } from '@/components/LoanList';
import { LoanBuilder } from '@/components/LoanBuilder'; // Ensure index export or direct
import { useParams, useRouter } from 'next/navigation'; // Correct hook for app directory
import { ArrowLeft, Plus, Calendar, History } from 'lucide-react';
import Link from 'next/link';

interface ActivityLog {
    _id: string;
    userName: string;
    userRole: string;
    userEmail: string;
    actionType: string;
    actionDescription: string;
    entityType: string;
    timestamp: string;
}

export default function FundDetailsPage() {
    const params = useParams(); // params.id
    const router = useRouter();
    const { funds, loans, addLoan, updateLoanStatus, deleteLoan } = useFund();

    // ...



    const fundId = params.id as string;
    const fund = funds.find(f => f.id === fundId);
    const fundLoans = loans.filter(l => l.fundId === fundId);

    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'CLOSED' | 'DEFAULTED'>('ACTIVE');
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsPage, setLogsPage] = useState(0);
    const [totalLogs, setTotalLogs] = useState(0);
    const logsPerPage = 20;

    useEffect(() => {
        if (showLogs) {
            fetchLogs();
        }
    }, [showLogs, logsPage]);

    const fetchLogs = async () => {
        try {
            setLogsLoading(true);
            const skip = logsPage * logsPerPage;
            const res = await fetch(`/api/logs?fundId=${fundId}&limit=${logsPerPage}&skip=${skip}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setTotalLogs(data.pagination.total);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLogsLoading(false);
        }
    };

    const handleTabChange = (tab: 'ACTIVE' | 'CLOSED' | 'DEFAULTED') => {
        setActiveTab(tab);
        setShowLogs(false); // Exit logs view when switching loan tabs
    };

    const getActionColor = (actionType: string) => {
        if (actionType.includes('CREATE')) return 'bg-green-100 text-green-700';
        if (actionType.includes('UPDATE')) return 'bg-blue-100 text-blue-700';
        if (actionType.includes('DELETE')) return 'bg-red-100 text-red-700';
        if (actionType.includes('CRO_OVERRIDE')) return 'bg-purple-100 text-purple-700';
        if (actionType.includes('STATUS_CHANGE')) return 'bg-yellow-100 text-yellow-700';
        if (actionType.includes('CAPITAL_RAISE')) return 'bg-emerald-100 text-emerald-700';
        return 'bg-gray-100 text-gray-700';
    };

    if (!fund) {
        return (
            <div className="p-10 text-center">
                <h2 className="text-xl font-bold mb-4">Fund Not Found</h2>
                <Link href="/" className="text-blue-600 hover:underline">Return to Dashboard</Link>
            </div>
        );
    }

    const handleSaveLoan = (loanData: any) => {
        addLoan(loanData);
        setIsLoanModalOpen(false);
    };

    const filteredLoans = fundLoans.filter(l => l.status === activeTab);

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-6">
                <Link href="/" className="inline-flex items-center text-gray-500 mb-4 transition-colors hover:opacity-80" style={{ color: 'var(--primary-purple)' }}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Dashboard
                </Link>
                <div className="flex justify-between items-start">
                    <h1 className="text-3xl font-bold text-gray-900">{fund.name}</h1>
                </div>
            </div>

            {/* Summary Card */}
            <div className="mb-10">
                <FundCard fund={fund} loans={fundLoans} />
            </div>

            {/* Loan Management Section */}
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                        {(['ACTIVE', 'CLOSED', 'DEFAULTED'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab && !showLogs
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab === 'DEFAULTED' ? 'NPL / Defaulted' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                                <span className="ml-2 bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                                    {fundLoans.filter(l => l.status === tab).length}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowLogs(!showLogs)}
                            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors shadow-sm text-sm font-medium"
                            style={showLogs ? {
                                borderColor: 'var(--primary-purple)',
                                color: 'var(--primary-purple)',
                                backgroundColor: 'rgba(107, 70, 166, 0.1)'
                            } : {
                                borderColor: 'var(--border-color)',
                                color: '#4B5563',
                                backgroundColor: 'white'
                            }}
                        >
                            <History className="w-4 h-4" />
                            Activity Logs
                        </button>
                        <Link
                            href={`/funds/${fundId}/repayments`}
                            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-opacity-20 transition-colors shadow-sm text-sm font-medium"
                            style={{
                                borderColor: 'var(--primary-pink)',
                                color: 'var(--primary-pink)',
                                backgroundColor: 'rgba(197, 80, 126, 0.1)'
                            }}
                        >
                            <Calendar className="w-4 h-4" />
                            Repayments
                        </Link>
                        <button
                            onClick={() => setIsLoanModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 btn-primary rounded-lg transition-colors shadow-md text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Structure Deal
                        </button>
                    </div>
                </div>

                {!showLogs ? (
                    <LoanList
                        loans={filteredLoans}
                        costOfCapitalRate={fund.costOfCapitalRate}
                        onStatusChange={updateLoanStatus}
                        onDelete={deleteLoan}
                    />
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-900">Activity Logs for {fund.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">View all activities for this fund including CRO overrides</p>
                        </div>
                        {logsLoading ? (
                            <div className="p-8 text-center text-gray-500">Loading logs...</div>
                        ) : logs.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No logs found for this fund</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
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
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    {log.actionDescription}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Showing {logsPage * logsPerPage + 1}-{Math.min((logsPage + 1) * logsPerPage, totalLogs)} of {totalLogs} activities
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setLogsPage(prev => Math.max(0, prev - 1))}
                                    disabled={logsPage === 0}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setLogsPage(prev => prev + 1)}
                                    disabled={(logsPage + 1) * logsPerPage >= totalLogs}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Loan Builder Modal */}
            {isLoanModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">
                        <LoanBuilder
                            fund={fund}
                            onSave={handleSaveLoan}
                            onCancel={() => setIsLoanModalOpen(false)}
                        />
                    </div>
                </div>
            )}
        </main>
    );
}
