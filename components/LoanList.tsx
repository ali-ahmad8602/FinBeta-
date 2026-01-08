"use client";

import React, { useState } from 'react';
import { Loan, LoanStatus } from '@/types';
import { formatCurrency } from '@/utils/analytics';
import { BadgeCheck, AlertCircle, Clock, ChevronDown, ChevronUp, DollarSign, Calendar, Trash2 } from 'lucide-react';
import { calculateInterest, calculateVariableCosts, calculateAllocatedCostOfCapital } from '@/utils/finance';
import { calculateXIRR } from '@/utils/xirr';

interface LoanListProps {
    loans: Loan[];
    costOfCapitalRate: number;
    onStatusChange: (id: string, status: LoanStatus, defaultedAmount?: number) => void;
    onDelete: (id: string) => void;
}

export const LoanList: React.FC<LoanListProps> = ({ loans, costOfCapitalRate, onStatusChange, onDelete }) => {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

    if (loans.length === 0) {
        return (
            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-500">No loans found in this category.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="w-8"></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borrower</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Terms</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {loans.map((loan) => {
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
                                            <div className="text-xs text-red-600">-{formatCurrency(totalRepayable + (loan.processingFeeRate ? (loan.principal * (loan.processingFeeRate / 100)) : 0))} (NPL)</div>
                                        ) : null}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{loan.interestRate}% <span className="text-gray-500">/ {loan.durationDays}d</span></div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(loan.status)}`}>
                                            {loan.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <select
                                            value={loan.status}
                                            onChange={(e) => handleAction(loan, e.target.value)}
                                            className="text-xs border-gray-300 rounded focus:ring-black focus:border-black w-28"
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="CLOSED">Closed</option>
                                            <option value="DEFAULTED_CONFIRM">Mark NPL</option>
                                            <option value="DEFAULTED" disabled hidden>Defaulted</option>
                                            <option value="DELETE" className="text-red-600 font-bold">Delete Loan</option>
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
                                                            <div className="flex justify-between text-emerald-600">
                                                                <span className="">+ Processing Fee ({loan.processingFeeRate}%)</span>
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
                                                        <div className="pt-2 border-t border-gray-100 flex justify-between font-bold">
                                                            <span>Total Repayable</span>
                                                            <span>{formatCurrency(totalRepayable + (loan.processingFeeRate ? (loan.principal * (loan.processingFeeRate / 100)) : 0))}</span>
                                                        </div>
                                                        <div className="pt-2 border-t border-gray-100 mt-2">
                                                            <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                                                <span className="text-gray-600 font-medium">Net Yield</span>
                                                                <span className={`font-bold ${(totalInterest + (loan.processingFeeRate ? (loan.principal * (loan.processingFeeRate / 100)) : 0) - calculateVariableCosts(loan.principal, loan.variableCosts) - calculateAllocatedCostOfCapital(loan.principal, costOfCapitalRate, loan.durationDays)) >= 0
                                                                    ? 'text-emerald-700' : 'text-red-700'
                                                                    }`}>
                                                                    {formatCurrency(
                                                                        totalInterest +
                                                                        (loan.processingFeeRate ? (loan.principal * (loan.processingFeeRate / 100)) : 0) -
                                                                        calculateVariableCosts(loan.principal, loan.variableCosts) -
                                                                        calculateAllocatedCostOfCapital(loan.principal, costOfCapitalRate, loan.durationDays)
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center p-2 rounded">
                                                                <span className="text-gray-600 font-medium">Projected IRR</span>
                                                                <span className="font-bold text-indigo-700">
                                                                    {(() => {
                                                                        const cashFlows = [
                                                                            { amount: -loan.principal, date: new Date(loan.startDate) },
                                                                            ...(loan.installments?.map(i => ({ amount: i.amount, date: new Date(i.dueDate) })) ||
                                                                                [{ amount: loan.principal + totalInterest, date: new Date(new Date(loan.startDate).getTime() + loan.durationDays * 24 * 60 * 60 * 1000) }])
                                                                        ];
                                                                        const irr = calculateXIRR(cashFlows);
                                                                        return irr ? `${irr.toFixed(2)}%` : 'N/A';
                                                                    })()}
                                                                </span>
                                                            </div>
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
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
