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
                    <div className="flex items-center gap-3">
                        {fund.createdAt && (
                            <p className="text-xs text-gray-400 italic">Established {new Date(fund.createdAt).toLocaleDateString()}</p>
                        )}
                        <p className="text-xs text-gray-500 font-medium">CoC: <span className="text-amber-600">{fund.costOfCapitalRate}% PA</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowRaiseModal(true)}
                        className="flex items-center gap-2 px-4 py-2 btn-primary rounded-lg font-medium text-sm shadow-md"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Raise Capital
                    </button>
                    <Link
                        href={`/funds/${fund.id}`}
                        className="text-sm font-medium flex items-center gap-1"
                        style={{ color: 'var(--primary-purple)' }}
                    >
                        View Details <ArrowUpRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-gray-100">
                {/* Capital Column */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Wallet className="w-4 h-4" />
                        <span className="text-sm font-medium uppercase tracking-wider">Capital</span>
                    </div>

                    <div>
                        <div className="flex items-center gap-1">
                            <p className="text-sm text-gray-500">Raised</p>
                            <InfoIcon content="Total capital raised from investors for this fund." />
                        </div>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(metrics.totalRaised)}</p>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                            <p className="text-sm text-gray-500">Net Asset Value (NAV)</p>
                            <InfoIcon content={`The true value of the fund's equity.\n\nFormula: Total Raised + Earned Cost of Capital - NPL Principal\n\nRepresents the book value to investors.`} />
                        </div>
                        <p className="text-lg font-bold" style={{ color: 'var(--primary-purple)' }}>{formatCurrency(metrics.nav)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center gap-1">
                                <p className="text-xs text-gray-500">Deployed (Principal)</p>
                                <InfoIcon content="Funds currently active in outstanding loans (Principal Only)." />
                            </div>
                            <p className="text-sm font-medium text-emerald-600">{formatCurrency(metrics.deployedCapital)}</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-1">
                                <p className="text-xs text-gray-500">Available</p>
                                <InfoIcon content={`Funds currently available for deployment.\n\n Formula: Raised - Deployed - Variable Costs (Upfront)`} />
                            </div>
                            <p className="text-sm font-medium text-blue-600">{formatCurrency(metrics.availableCapital)}</p>
                        </div>
                        <div className="col-span-2">
                            <div className="flex items-center gap-1">
                                <p className="text-xs text-gray-500">Upfront Costs Deployed</p>
                                <InfoIcon content="Variable costs paid upfront for active loans. These are deducted from Available Capital but expected to be recovered upon repayment." />
                            </div>
                            <p className="text-sm font-medium text-amber-600">{formatCurrency(metrics.totalUpfrontCostsDeployed)}</p>
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
                            <InfoIcon content={`Projected profit from Interest only, after expenses and losses.\n\nFormula: Interest Income - Total Expenses - NPL Losses\n\nProcessing fees are tracked separately and do not contribute to Yield.`} />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className={`text-lg font-semibold ${metrics.netYield >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrency(metrics.netYield)}
                            </p>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                            <p className="text-sm text-gray-500">Processing Fee Income</p>
                            <InfoIcon content="Total processing fees collected upfront upon loan deployment. This revenue is distinct from interest yield." />
                        </div>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(metrics.totalProcessingFees)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center gap-1">
                                <p className="text-xs text-gray-500">Interest Income</p>
                                <InfoIcon content="Total projected interest income from all active/closed loans." />
                            </div>
                            <p className="text-sm font-medium text-gray-900">{formatCurrency(metrics.projectedIncome)}</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-1">
                                <p className="text-xs text-gray-500">Expenses</p>
                                <InfoIcon content="Total projected expenses (Allocated Cost of Capital + Variable Costs)." />
                            </div>
                            <p className="text-sm font-medium text-red-500">{formatCurrency(metrics.totalExpenses)}</p>
                        </div>
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center gap-1">
                                    <p className="text-xs text-gray-500">Cost of Capital (Accrued)</p>
                                    <InfoIcon content="The portion of interest income that covers the Fund's Cost of Capital for deployed funds. This is 'accrued' over the loan tenure." />
                                </div>
                                <p className="text-sm font-medium text-gray-900">{formatCurrency(metrics.totalAllocatedCostOfCapital)}</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-1">
                                    <p className="text-xs text-gray-500">CoC (Undeployed)</p>
                                    <InfoIcon content="The accumulated cost of capital for funds that remained undeployed since fund inception. Represents the total 'leakage' or loss from idle capital." />
                                </div>
                                <p className="text-sm font-medium text-amber-600">{formatCurrency(metrics.accumulatedUndeployedCost)}</p>
                            </div>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-gray-100 space-y-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1">
                                    <p className="text-xs text-gray-500 font-medium">Global Cost ({fund.costOfCapitalRate}%)</p>
                                    <InfoIcon content="The baseline cost of holding the Total Raised capital, regardless of deployment." />
                                </div>
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
                            <InfoIcon content={`Non-Performing Loans - the outstanding principal and interest lost to defaults.\n\nFormula: Sum of (Principal + Interest) for all defaulted loans. Processing fees are excluded as they are collected upfront.`} />
                        </div>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(metrics.nplVolume)}</p>
                    </div>

                    <div>
                        <div className="flex items-center gap-1">
                            <p className="text-xs text-gray-500">Ratio</p>
                            <InfoIcon content="NPL Principal as a percentage of Total Raised Capital." />
                        </div>
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
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none"
                                    style={{ borderColor: 'var(--border-color)' }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-purple)'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}

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
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none"
                                    style={{ borderColor: 'var(--border-color)' }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-purple)'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}

                                    placeholder="16"
                                />
                            </div>

                            {/* Preview */}
                            {preview && (
                                <div className="bg-gradient-purple-pink-light rounded-lg p-4 space-y-2" style={{ border: '1px solid var(--border-color)' }}>
                                    <p className="text-sm font-medium" style={{ color: 'var(--primary-purple)' }}>Preview After Raise:</p>
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
                                className="flex-1 px-4 py-2 btn-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
