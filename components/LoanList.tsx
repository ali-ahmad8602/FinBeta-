"use client";

import React, { useState, useMemo } from 'react';
import { Loan, LoanStatus } from '@/types';
import { formatCurrency } from '@/utils/analytics';
import { BadgeCheck, AlertCircle, Clock, ChevronDown, ChevronUp, DollarSign, Calendar, Trash2, ArrowUpDown } from 'lucide-react';
import { calculateInterest, calculateVariableCosts, calculateAllocatedCostOfCapital, calculateLoanIRR, calculateLoanNetIRR } from '@/utils/finance';
import { InfoIcon } from '@/components/ui/Tooltip';

type SortField = 'date' | 'principal' | 'borrower' | 'status' | 'interestRate';
type SortOrder = 'asc' | 'desc';

interface LoanListProps {
    loans: Loan[];
    costOfCapitalRate: number;
    onStatusChange: (id: string, status: LoanStatus, defaultedAmount?: number) => void;
    onDelete: (id: string) => void;
}

export const LoanList: React.FC<LoanListProps> = ({ loans, costOfCapitalRate, onStatusChange, onDelete }) => {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // Default: newest first
    const [currentPage, setCurrentPage] = useState(0);
    const loansPerPage = 10;

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedIds(newSet);
    };

    const getStatusColor = (status: LoanStatus) => {
        switch (status) {
            case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'CLOSED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'DEFAULTED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const handleAction = (loan: Loan, action: string) => {
        if (action === 'DELETE') {
            if (confirm(`Are you sure you want to delete the loan for ${loan.borrowerName}?`)) {
                onDelete(loan.id);
            }
        } else if (action === 'DEFAULTED_CONFIRM') {
            if (confirm(`Are you sure you want to mark ${loan.borrowerName} as DEFAULTED? This will expense the full debt.`)) {
                onStatusChange(loan.id, 'DEFAULTED', loan.principal);
            }
        } else {
            onStatusChange(loan.id, action as LoanStatus, 0);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            // Toggle order if same field
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            // New field, default to desc for date/principal, asc for text
            setSortField(field);
            setSortOrder(field === 'date' || field === 'principal' || field === 'interestRate' ? 'desc' : 'asc');
        }
    };

    // Sorted loans using useMemo for performance
    const sortedLoans = useMemo(() => {
        const sorted = [...loans].sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case 'date':
                    comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                    break;
                case 'principal':
                    comparison = a.principal - b.principal;
                    break;
                case 'borrower':
                    comparison = a.borrowerName.localeCompare(b.borrowerName);
                    break;
                case 'status':
                    const statusOrder = { 'ACTIVE': 1, 'CLOSED': 2, 'DEFAULTED': 3 };
                    comparison = statusOrder[a.status] - statusOrder[b.status];
                    break;
                case 'interestRate':
                    comparison = a.interestRate - b.interestRate;
                    break;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }, [loans, sortField, sortOrder]);

    // Paginated loans
    const totalLoans = sortedLoans.length;
    const paginatedLoans = sortedLoans.slice(currentPage * loansPerPage, (currentPage + 1) * loansPerPage);

    // Reset to first page when sort changes
    useMemo(() => {
        setCurrentPage(0);
    }, [sortField, sortOrder]);

    if (loans.length === 0) {
        return (
            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-500">No loans found in this category.</p>
            </div>
        );
    }

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
        return sortOrder === 'asc' ?
            <ChevronUp className="w-3 h-3" /> :
            <ChevronDown className="w-3 h-3" />;
    };

    return (
        <div>
            {/* Sort Controls */}
            <div className="mb-4 flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleSort('date')}
                        className={`px-3 py-1.5 text-sm rounded-md transition-colors ${sortField === 'date'
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            } border border-gray-300`}
                    >
                        Date {sortField === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                    <button
                        onClick={() => handleSort('principal')}
                        className={`px-3 py-1.5 text-sm rounded-md transition-colors ${sortField === 'principal'
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            } border border-gray-300`}
                    >
                        Principal {sortField === 'principal' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                    <button
                        onClick={() => handleSort('borrower')}
                        className={`px-3 py-1.5 text-sm rounded-md transition-colors ${sortField === 'borrower'
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            } border border-gray-300`}
                    >
                        Borrower {sortField === 'borrower' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                    <button
                        onClick={() => handleSort('interestRate')}
                        className={`px-3 py-1.5 text-sm rounded-md transition-colors ${sortField === 'interestRate'
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            } border border-gray-300`}
                    >
                        Interest Rate {sortField === 'interestRate' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                    <button
                        onClick={() => handleSort('status')}
                        className={`px-3 py-1.5 text-sm rounded-md transition-colors ${sortField === 'status'
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            } border border-gray-300`}
                    >
                        Status {sortField === 'status' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="w-8"></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button onClick={() => handleSort('borrower')} className="flex items-center gap-1 hover:text-gray-700">
                                    Borrower <SortIcon field="borrower" />
                                </button>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button onClick={() => handleSort('principal')} className="flex items-center gap-1 hover:text-gray-700">
                                    Principal <SortIcon field="principal" />
                                </button>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button onClick={() => handleSort('interestRate')} className="flex items-center gap-1 hover:text-gray-700">
                                    Terms <SortIcon field="interestRate" />
                                </button>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-gray-700">
                                    Status <SortIcon field="status" />
                                </button>
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedLoans.map((loan) => {
                            const isExpanded = expandedIds.has(loan.id);
                            const totalInterest = calculateInterest(loan.principal, loan.interestRate, loan.durationDays);
                            const totalRepayable = loan.principal + totalInterest;

                            return (
                                <React.Fragment key={loan.id}>
                                    <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}>
                                        <td className="pl-4">
                                            <button onClick={() => toggleExpand(loan.id)} className="text-gray-400 hover:text-gray-600">
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                    {loan.borrowerName.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{loan.borrowerName}</div>
                                                    <div className="text-xs text-gray-500">{loan.repaymentType === 'MONTHLY' ? 'Monthly' : 'Bullet'} • {loan.startDate}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 font-medium">{formatCurrency(loan.principal)}</div>
                                            {loan.defaultedAmount && loan.defaultedAmount > 0 ? (
                                                <div className="text-xs text-red-600">-{formatCurrency(totalRepayable)} (NPL)</div>
                                            ) : null}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{loan.interestRate}% <span className="text-gray-500">/ {loan.durationDays}d</span></div>
                                            <div className="text-xs" style={{ color: 'var(--primary-purple)' }}>
                                                IRR: {(() => {
                                                    const irr = calculateLoanIRR(
                                                        loan.principal,
                                                        loan.interestRate,
                                                        loan.processingFeeRate || 0,
                                                        loan.startDate,
                                                        loan.durationDays,
                                                        loan.repaymentType,
                                                        loan.installments?.map(i => ({ dueDate: i.dueDate, amount: i.amount }))
                                                    );
                                                    return irr !== null ? `${irr.toFixed(1)}%` : 'N/A';
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(loan.status)}`}>
                                                {loan.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <select
                                                key={`${loan.id}-${loan.status}`}
                                                value={loan.status}
                                                onChange={(e) => {
                                                    handleAction(loan, e.target.value);
                                                    // Reset dropdown immediately after action
                                                    e.target.value = loan.status;
                                                }}
                                                className="text-xs border-gray-300 rounded focus:ring-black focus:border-black w-28"
                                            >
                                                <option value={loan.status}>{loan.status === 'ACTIVE' ? 'Active' : loan.status === 'CLOSED' ? 'Closed' : 'Defaulted'}</option>
                                                {loan.status !== 'ACTIVE' && <option value="ACTIVE">Set Active</option>}
                                                {loan.status !== 'CLOSED' && <option value="CLOSED">Set Closed</option>}
                                                {loan.status !== 'DEFAULTED' && <option value="DEFAULTED_CONFIRM">Mark NPL</option>}
                                                <option value="DELETE" className="text-red-600">Delete Loan</option>
                                            </select>
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-gray-50/50">
                                            <td colSpan={6} className="px-6 py-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Financial Breakdown */}
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                            <DollarSign className="w-3 h-3" /> Financial Analysis
                                                        </h4>
                                                        <div className="bg-white p-4 rounded-lg border border-gray-100 text-sm space-y-2 shadow-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">Principal</span>
                                                                <span className="font-medium">{formatCurrency(loan.principal)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-emerald-600">
                                                                <span className="">+ Interest Income</span>
                                                                <span className="font-medium">{formatCurrency(totalInterest)}</span>
                                                            </div>
                                                            {loan.processingFeeRate && loan.processingFeeRate > 0 && (
                                                                <div className="flex justify-between text-gray-400 italic">
                                                                    <span className="">Processing Fee (Paid Upfront)</span>
                                                                    <span className="font-medium">{formatCurrency(loan.principal * (loan.processingFeeRate / 100))}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col gap-1 text-red-500 text-xs">
                                                                {loan.variableCosts.map(cost => (
                                                                    <div key={cost.id} className="flex justify-between">
                                                                        <span>- {cost.name} ({cost.percentage}%)</span>
                                                                        <span>{formatCurrency(loan.principal * (cost.percentage / 100))}</span>
                                                                    </div>
                                                                ))}
                                                                <div className="flex justify-between">
                                                                    <span>- Cost of Capital ({costOfCapitalRate}%)</span>
                                                                    <span className="text-red-500">{formatCurrency(calculateAllocatedCostOfCapital(loan.principal, costOfCapitalRate, loan.durationDays))}</span>
                                                                </div>
                                                            </div>
                                                            <div className="pt-2 border-t border-gray-100 mt-2">
                                                                <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-gray-600 font-medium">Net Yield</span>
                                                                        <InfoIcon content={`The projected profit from Interest only after all costs.\n\nFormula: Interest - Variable Costs - Cost of Capital\n\nProcessing fees are excluded as they are upfront revenue.`} />
                                                                    </div>
                                                                    <span className={`font-bold ${(totalInterest - calculateVariableCosts(loan.principal, loan.variableCosts) - calculateAllocatedCostOfCapital(loan.principal, costOfCapitalRate, loan.durationDays)) >= 0
                                                                        ? 'text-emerald-700' : 'text-red-700'
                                                                        }`}>
                                                                        {formatCurrency(
                                                                            totalInterest -
                                                                            calculateVariableCosts(loan.principal, loan.variableCosts) -
                                                                            calculateAllocatedCostOfCapital(loan.principal, costOfCapitalRate, loan.durationDays)
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center p-2 rounded mt-1">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-gray-600 font-medium">Gross IRR</span>
                                                                    <InfoIcon content={`The annualized return rate based on income only (before costs).\n\nCash Flows:\n- Day 0: -Principal (outflow)\n- Repayments: Principal + Interest + Processing Fee (inflows)\n\nWhy it's high: Short-duration loans have very high IRRs because capital returns quickly.\n\nExample: A 90-day loan with 7% total return ≈ 30.6% IRR annualized.`} />
                                                                </div>
                                                                <span className="font-bold" style={{ color: 'var(--primary-purple)' }}>
                                                                    {(() => {
                                                                        const irr = calculateLoanIRR(
                                                                            loan.principal,
                                                                            loan.interestRate,
                                                                            loan.processingFeeRate || 0,
                                                                            loan.startDate,
                                                                            loan.durationDays,
                                                                            loan.repaymentType,
                                                                            loan.installments?.map(i => ({ dueDate: i.dueDate, amount: i.amount }))
                                                                        );
                                                                        return irr !== null ? `${irr.toFixed(2)}%` : 'N/A';
                                                                    })()}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center p-2 rounded bg-gradient-purple-pink-light" style={{ border: '1px solid var(--border-color)' }}>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-medium" style={{ color: 'var(--primary-purple)' }}>Net IRR</span>
                                                                    <InfoIcon content={`The annualized return rate after all costs are deducted.\n\nCash Flows:\n- Day 0: -(Principal + Variable Costs) (outflow)\n- Repayments: Principal + Interest + Fee - Cost of Capital (inflows)\n\nThis is the true return on your deployed capital including all costs.`} />
                                                                </div>
                                                                <span className="font-bold" style={{ color: 'var(--primary-pink)' }}>
                                                                    {(() => {
                                                                        const netIrr = calculateLoanNetIRR(
                                                                            loan.principal,
                                                                            loan.interestRate,
                                                                            loan.processingFeeRate || 0,
                                                                            loan.startDate,
                                                                            loan.durationDays,
                                                                            loan.repaymentType,
                                                                            loan.variableCosts,
                                                                            costOfCapitalRate,
                                                                            loan.installments?.map(i => ({ dueDate: i.dueDate, amount: i.amount }))
                                                                        );
                                                                        return netIrr !== null ? `${netIrr.toFixed(2)}%` : 'N/A';
                                                                    })()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Schedule */}
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" /> Repayment Schedule
                                                        </h4>
                                                        {loan.installments && loan.installments.length > 0 ? (
                                                            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                                                                <table className="min-w-full divide-y divide-gray-100 text-xs">
                                                                    <thead className="bg-gray-50">
                                                                        <tr>
                                                                            <th className="px-3 py-2 text-left text-gray-500">Due Date</th>
                                                                            <th className="px-3 py-2 text-right text-gray-500">Amount</th>
                                                                            <th className="px-3 py-2 text-right text-gray-500">Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100">
                                                                        {loan.installments.map(inst => (
                                                                            <tr key={inst.id}>
                                                                                <td className="px-3 py-2">{new Date(inst.dueDate).toLocaleDateString()}</td>
                                                                                <td className="px-3 py-2 text-right font-medium">{formatCurrency(inst.amount)}</td>
                                                                                <td className="px-3 py-2 text-right">
                                                                                    <span className={`px-1.5 py-0.5 rounded-full ${inst.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                                                                                        inst.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                                                                            'bg-gray-100 text-gray-600'
                                                                                        }`}>
                                                                                        {inst.status}
                                                                                    </span>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-white p-4 rounded-lg border border-gray-100 text-sm text-gray-500 italic text-center">
                                                                Bullet Repayment due {new Date(new Date(loan.startDate).setDate(new Date(loan.startDate).getDate() + loan.durationDays)).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                    }
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {
                totalLoans > loansPerPage && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Showing {currentPage * loansPerPage + 1}-{Math.min((currentPage + 1) * loansPerPage, totalLoans)} of {totalLoans} loans
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                disabled={currentPage === 0}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="px-4 py-2 text-sm text-gray-700">
                                Page {currentPage + 1} of {Math.ceil(totalLoans / loansPerPage)}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                disabled={(currentPage + 1) * loansPerPage >= totalLoans}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
