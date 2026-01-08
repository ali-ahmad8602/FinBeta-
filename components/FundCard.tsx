"use client";

import React, { useState } from 'react';
import { Fund, Loan } from '@/types';
import { calculateFundMetrics, formatCurrency, formatPercentage } from '@/utils/analytics';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, DollarSign, Wallet, TrendingUp } from 'lucide-react';
import { InfoIcon } from '@/components/ui/Tooltip';
import Link from 'next/link';

interface FundCardProps {
    fund: Fund;
    loans: Loan[];
}

export const FundCard: React.FC<FundCardProps> = ({ fund, loans }) => {
    const metrics = calculateFundMetrics(fund, loans);
    const [showRaiseModal, setShowRaiseModal] = useState(false);
    const [newCapital, setNewCapital] = useState('');
    const [newRate, setNewRate] = useState('');
    const [loading, setLoading] = useState(false);

    // Calculate preview of new totals
    const previewTotals = () => {
        const additional = Number(newCapital) || 0;
        const rate = Number(newRate) || 0;
        if (additional <= 0 || rate < 0) return null;

        const totalCapital = fund.totalRaised + additional;
        const wacc = (fund.totalRaised * fund.costOfCapitalRate + additional * rate) / totalCapital;

        return { totalCapital, wacc };
    };

    const handleRaiseCapital = async () => {
        const additional = Number(newCapital);
        const rate = Number(newRate);

        if (additional <= 0 || rate < 0) {
            alert('Please enter valid amounts');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/funds/${fund.id}/raise-capital`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: additional, costOfCapitalRate: rate }),
            });

            if (res.ok) {
                setShowRaiseModal(false);
                setNewCapital('');
                setNewRate('');
                window.location.reload(); // Refresh to show new data
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to raise capital');
            }
        } catch (error) {
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const preview = previewTotals();

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">{fund.name}</h3>
                    <p className="text-sm text-gray-500">Cost of Capital: <span className="font-medium text-amber-600">{fund.costOfCapitalRate}% PA</span></p>
                </div>
                <Link
                    href={`/funds/${fund.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                    View Details <ArrowUpRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-gray-100">
                {/* Capital Column */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Wallet className="w-4 h-4" />
                        <span className="text-sm font-medium uppercase tracking-wider">Capital</span>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Raised</p>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(metrics.totalRaised)}</p>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                            <p className="text-sm text-gray-500">Assets Under Management</p>
                            <InfoIcon content={`The total value of the fund including capital, costs, and projected profits.\n\nFormula: Total Raised + Allocated Cost (Deployed) + Net Yield\n\nThis represents the full economic value of your fund's operations.`} />
                        </div>
                        <p className="text-lg font-bold text-indigo-700">{formatCurrency(metrics.aum)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-500">Deployed</p>
                            <p className="text-sm font-medium text-emerald-600">{formatCurrency(metrics.deployedCapital)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Available</p>
                            <p className="text-sm font-medium text-blue-600">{formatCurrency(metrics.availableCapital)}</p>
                        </div>
                    </div>
                </div>

                {/* Financials Column */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm font-medium uppercase tracking-wider">Projected Returns</span>
                    </div>

                    <div>
                        <div className="flex items-center gap-1">
                            <p className="text-sm text-gray-500">Net Yield</p>
                            <InfoIcon content={`The projected profit after all expenses and losses.\n\nFormula: Projected Income - Total Expenses - NPL Losses\n\nThis is a cash-basis calculation showing actual expected profit.`} />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className={`text-lg font-semibold ${metrics.netYield >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrency(metrics.netYield)}
                            </p>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-1">
                            <p className="text-sm text-gray-500">Portfolio IRR</p>
                            <InfoIcon content={`The annualized return rate of all deployed capital, accounting for time value of money.\n\nWhy it matters: A 10% profit in 1 month = ~138% IRR because you can redeploy that capital 12 times per year.`} />
                        </div>
                        <p className="text-lg font-bold text-indigo-700">{formatPercentage(metrics.portfolioIRR)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-500">Income</p>
                            <p className="text-sm font-medium text-gray-900">{formatCurrency(metrics.projectedIncome)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Expenses</p>
                            <p className="text-sm font-medium text-red-500">{formatCurrency(metrics.totalExpenses)}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs text-gray-500">Allocated Cost (Deployed)</p>
                            <p className="text-sm font-medium text-gray-900">{formatCurrency(metrics.totalAllocatedCostOfCapital)}</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-gray-100 space-y-2">
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-500 font-medium">Global Cost ({fund.costOfCapitalRate}%)</p>
                                <p className="text-xs font-bold text-amber-600">{formatCurrency(metrics.globalCost.annual)}/yr</p>
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-400">
                                <div>
                                    <span className="block">Daily</span>
                                    <span className="font-medium text-gray-600">{formatCurrency(metrics.globalCost.daily)}</span>
                                </div>
                                <div>
                                    <span className="block">Weekly</span>
                                    <span className="font-medium text-gray-600">{formatCurrency(metrics.globalCost.weekly)}</span>
                                </div>
                                <div>
                                    <span className="block">Monthly</span>
                                    <span className="font-medium text-gray-600">{formatCurrency(metrics.globalCost.monthly)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Risk Column */}
                <div className="p-6 space-y-4 bg-gray-50/30">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium uppercase tracking-wider">Risk (NPL)</span>
                    </div>

                    <div>
                        <div className="flex items-center gap-1">
                            <p className="text-sm text-gray-500">NPL Volume</p>
                            <InfoIcon content={`Non-Performing Loans - the total repayable amount lost to defaults.\n\nFormula: Sum of (Principal + Interest + Fees) for all defaulted loans.`} />
                        </div>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(metrics.nplVolume)}</p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500">Ratio</p>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-500"
                                    style={{ width: `${Math.min(metrics.nplRatio, 100)}%` }}
                                />
                            </div>
                            <span className="text-xs font-medium text-gray-700">{formatPercentage(metrics.nplRatio)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Raise Capital Button */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <button
                    onClick={() => setShowRaiseModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                    <TrendingUp className="w-4 h-4" />
                    Raise Additional Capital
                </button>
            </div>

            {/* Raise Capital Modal */}
            {showRaiseModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Raise Additional Capital</h3>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Additional Capital ($)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={newCapital}
                                    onChange={(e) => setNewCapital(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    placeholder="500000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cost of Capital (% PA)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={newRate}
                                    onChange={(e) => setNewRate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    placeholder="16"
                                />
                            </div>

                            {/* Preview */}
                            {preview && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                                    <p className="text-sm font-medium text-emerald-900">Preview After Raise:</p>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Current Total:</span>
                                            <span className="font-medium">{formatCurrency(fund.totalRaised)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">New Raise:</span>
                                            <span className="font-medium text-emerald-600">+{formatCurrency(Number(newCapital))}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-emerald-200">
                                            <span className="text-gray-900 font-semibold">New Total:</span>
                                            <span className="font-bold text-emerald-700">{formatCurrency(preview.totalCapital)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Current CoC:</span>
                                            <span className="font-medium">{fund.costOfCapitalRate.toFixed(2)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-900 font-semibold">New WACC:</span>
                                            <span className="font-bold text-emerald-700">{preview.wacc.toFixed(2)}%</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRaiseModal(false);
                                    setNewCapital('');
                                    setNewRate('');
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRaiseCapital}
                                disabled={loading || !preview}
                                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing...' : 'Confirm Raise'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
