"use client";

import React from 'react';
import { Fund, Loan } from '@/types';
import { calculateCashFlowForecast } from '@/utils/cashflow';
import { formatCurrency, calculateRealizedImYield } from '@/utils/analytics';
import { Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface CashFlowForecastProps {
    fund: Fund;
    loans: Loan[];
}

export const CashFlowForecast: React.FC<CashFlowForecastProps> = ({ fund, loans }) => {
    const { projections, summary } = calculateCashFlowForecast(fund, loans, 12);

    // Filter out today's initial state for the table
    const futureProjections = projections.filter(p => p.expectedRepayments > 0);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase">Next 30 Days</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.next30Days)}</p>
                    <p className="text-xs text-gray-500 mt-1">Expected Repayments</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase">Next 90 Days</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.next90Days)}</p>
                    <p className="text-xs text-gray-500 mt-1">Expected Repayments</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase">Peak Available</span>
                    </div>
                    <p className="text-2xl font-bold text-indigo-600">{formatCurrency(summary.peakAvailable)}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(summary.peakDate).toLocaleDateString()}</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase">Lowest Available</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.lowestAvailable)}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(summary.lowestDate).toLocaleDateString()}</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase">Realized IM Yield</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(calculateRealizedImYield(fund, loans))}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Procured Till Date</p>
                </div>
            </div>

            {/* Repayment Schedule Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Repayment Schedule</h3>
                    <p className="text-sm text-gray-500 mt-1">Expected repayments from active loans</p>
                </div>

                {futureProjections.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Expected Repayments
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Borrower(s)
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Available After
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {futureProjections.map((projection, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(projection.date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                                            {formatCurrency(projection.expectedRepayments)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div className="space-y-1">
                                                {projection.events.map((event, eventIdx) => (
                                                    <div key={eventIdx} className="flex items-center gap-2">
                                                        <span>{event.borrowerName}</span>
                                                        {event.installmentNumber && (
                                                            <span className="text-xs text-gray-500">
                                                                ({event.installmentNumber}/{event.totalInstallments})
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-gray-400">
                                                            {formatCurrency(event.amount)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                            {formatCurrency(projection.cumulativeAvailable)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No upcoming repayments scheduled</p>
                        <p className="text-xs text-gray-400 mt-1">All active loans have been repaid or defaulted</p>
                    </div>
                )}
            </div>
        </div>
    );
};
