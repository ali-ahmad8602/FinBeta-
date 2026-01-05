"use client";

import React, { useState, useEffect } from 'react';
import { Fund, Loan, CostItem } from '@/types';
import { calculateBreakEvenAmount, calculateNetYield, DAYS_IN_YEAR, calculateAllocatedCostOfCapital, calculateVariableCosts, generateRepaymentSchedule } from '@/utils/finance';
import { Plus, Trash2, Calculator, Info, Calendar } from 'lucide-react';
import { RepaymentType } from '@/types';

interface LoanBuilderProps {
    fund: Fund;
    onSave: (loanData: Omit<Loan, 'id'>) => void;
    onCancel: () => void;
}

export const LoanBuilder: React.FC<LoanBuilderProps> = ({ fund, onSave, onCancel }) => {
    // Basic Details
    const [borrowerName, setBorrowerName] = useState('');
    const [principal, setPrincipal] = useState(100000);
    const [interestRate, setInterestRate] = useState(18);
    const [durationDays, setDurationDays] = useState(90);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [repaymentType, setRepaymentType] = useState<RepaymentType>('BULLET');

    // Variable Costs
    const [variableCosts, setVariableCosts] = useState<CostItem[]>([
        { id: '1', name: 'Insurance', percentage: 1.0 },
        { id: '2', name: 'Conversion', percentage: 0.5 }
    ]);

    // Schedule State
    const [scheduleItems, setScheduleItems] = useState<{ dueDate: string, amount: number, principal: number, interest: number }[]>([]);
    const [isCustomSchedule, setIsCustomSchedule] = useState(false);

    // Derived Metrics
    const [breakEven, setBreakEven] = useState(0);
    const [netYield, setNetYield] = useState(0);
    const [totalCost, setTotalCost] = useState(0);

    // Total Repayment Calculation
    const totalRepayment = scheduleItems.reduce((sum, item) => sum + item.amount, 0);

    // Auto-Generate Schedule Effect
    useEffect(() => {
        if (!isCustomSchedule) {
            const generated = generateRepaymentSchedule(principal, interestRate, startDate, durationDays, repaymentType);
            setScheduleItems(generated);
        }
    }, [principal, interestRate, startDate, durationDays, repaymentType, isCustomSchedule]);

    // Metrics Effect
    useEffect(() => {
        const allocatedCost = calculateAllocatedCostOfCapital(principal, fund.costOfCapitalRate, durationDays);
        const varCosts = calculateVariableCosts(principal, variableCosts);
        const total = allocatedCost + varCosts;
        const beAmount = principal + total;

        // Interest Income based on inputs (Projected)
        const paramInterest = (principal * (interestRate / 100) * durationDays) / DAYS_IN_YEAR;
        const ny = paramInterest - total;

        setTotalCost(total);
        setBreakEven(beAmount);
        setNetYield(ny);
    }, [principal, interestRate, durationDays, variableCosts, fund.costOfCapitalRate]);

    // Expected Repayment (Terms Based)
    const expectedInterest = (principal * (interestRate / 100) * durationDays) / DAYS_IN_YEAR;
    const expectedTotalRepayment = principal + expectedInterest;

    const addVariableCost = () => {
        setVariableCosts([...variableCosts, { id: crypto.randomUUID(), name: '', percentage: 0 }]);
    };

    const updateVariableCost = (id: string, field: 'name' | 'percentage', value: string | number) => {
        setVariableCosts(costs => costs.map(c =>
            c.id === id ? { ...c, [field]: value } : c
        ));
    };

    const removeVariableCost = (id: string) => {
        setVariableCosts(costs => costs.filter(c => c.id !== id));
    };

    const handleScheduleChange = (index: number, field: 'dueDate' | 'amount', value: string | number) => {
        setIsCustomSchedule(true);
        setScheduleItems(prev => prev.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
    };

    const resetSchedule = () => {
        setIsCustomSchedule(false);
        // Effect will trigger regen
    };

    const addInstallment = () => {
        setIsCustomSchedule(true);
        const newCount = scheduleItems.length + 1;

        // Distribute Amount and Dates
        const amountPerInstallment = expectedTotalRepayment / newCount;
        const daysPerInstallment = durationDays / newCount;
        const start = new Date(startDate);

        const newSchedule = Array.from({ length: newCount }, (_, i) => {
            const dueDate = new Date(start);
            dueDate.setDate(dueDate.getDate() + Math.round(daysPerInstallment * (i + 1)));

            return {
                dueDate: dueDate.toISOString(),
                amount: parseFloat(amountPerInstallment.toFixed(2)), // Simple Rounding, might need adjustment on last item
                principal: 0, // Placeholder
                interest: 0
            };
        });

        // Adjust last item for rounding differences
        const currentSum = newSchedule.reduce((sum, item) => sum + item.amount, 0);
        const diff = expectedTotalRepayment - currentSum;
        if (newSchedule.length > 0 && Math.abs(diff) > 0.001) {
            newSchedule[newSchedule.length - 1].amount += diff;
        }

        setScheduleItems(newSchedule);
    };

    const removeInstallment = (index: number) => {
        setIsCustomSchedule(true);
        setScheduleItems(items => items.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const totalPrincipal = scheduleItems.reduce((acc, item) => acc + item.principal, 0); // Note: Simple schedule doesn't track principal separate yet often in UI manually
        const totalAmount = scheduleItems.reduce((acc, item) => acc + item.amount, 0);

        // Strict Validation: Schedule must match Terms
        if (Math.abs(totalAmount - expectedTotalRepayment) > 0.05) {
            alert(`Total Scheduled Repayment ($${totalAmount.toFixed(2)}) must match the Term-based Total ($${expectedTotalRepayment.toFixed(2)}).\n\nDifference: $${(totalAmount - expectedTotalRepayment).toFixed(2)}`);
            return;
        }

        onSave({
            fundId: fund.id,
            borrowerName,
            principal,
            interestRate,
            startDate,
            durationDays,
            status: 'ACTIVE',
            variableCosts,
            repaymentType,
            installments: scheduleItems.map(i => ({
                id: crypto.randomUUID(),
                ...i,
                status: 'PENDING',
                principalComponent: i.principal,
                interestComponent: i.amount - i.principal
            }))
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-4xl mx-auto overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Structure New Loan</h2>
                <div className="text-sm text-gray-500">
                    Fund: <span className="font-semibold text-gray-900">{fund.name}</span>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* INPUTS COLUMN */}
                <form id="loan-form" onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Loan Details</h3>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Borrower</label>
                            <input
                                type="text" required
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                value={borrowerName} onChange={e => setBorrowerName(e.target.value)}
                                placeholder="Enter borrower name"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Principal ($)</label>
                                <input
                                    type="number" required min="0"
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                    value={principal} onChange={e => setPrincipal(Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Interest Rate (% PA)</label>
                                <input
                                    type="number" required step="0.1"
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                    value={interestRate} onChange={e => setInterestRate(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Duration (Days)</label>
                                <input
                                    type="number" required min="1"
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                    value={durationDays} onChange={e => setDurationDays(Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                                <input
                                    type="date" required
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                    value={startDate} onChange={e => setStartDate(e.target.value)}
                                />
                            </div>
                        </div>

                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Variable Costs</h3>
                            <button type="button" onClick={addVariableCost} className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700">
                                <Plus className="w-3 h-3" /> Add Cost
                            </button>
                        </div>

                        {variableCosts.map((cost) => (
                            <div key={cost.id} className="flex gap-2 items-center">
                                <input
                                    type="text" placeholder="Cost Name"
                                    className="flex-1 px-3 py-1.5 border rounded-md text-sm"
                                    value={cost.name}
                                    onChange={e => updateVariableCost(cost.id, 'name', e.target.value)}
                                />
                                <div className="relative w-24">
                                    <input
                                        type="number" step="0.1"
                                        className="w-full pl-3 pr-6 py-1.5 border rounded-md text-sm text-right"
                                        value={cost.percentage}
                                        onChange={e => updateVariableCost(cost.id, 'percentage', Number(e.target.value))}
                                    />
                                    <span className="absolute right-2 top-1.5 text-gray-500 text-sm">%</span>
                                </div>
                                <button type="button" onClick={() => removeVariableCost(cost.id)} className="text-gray-400 hover:text-red-500 p-1">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Repayment Schedule Editor */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Repayment Schedule
                            </h3>
                            <div className="flex gap-2">
                                <button type="button" onClick={addInstallment} className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                                    <Plus className="w-3 h-3" /> Add
                                </button>
                                {isCustomSchedule && (
                                    <button type="button" onClick={resetSchedule} className="text-xs text-red-500 hover:text-red-700 font-medium">
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden max-h-64 overflow-y-auto">
                            {scheduleItems.length === 0 && (
                                <div className="p-4 text-center text-gray-400 text-xs italic">
                                    Schedule is empty. Add an installment.
                                </div>
                            )}
                            {scheduleItems.map((item, index) => (
                                <div key={index} className="flex gap-2 p-2 border-b border-gray-100 last:border-0 items-center">
                                    <input
                                        type="date"
                                        className="w-32 px-2 py-1 text-xs border rounded text-gray-600"
                                        value={item.dueDate.split('T')[0]}
                                        onChange={e => handleScheduleChange(index, 'dueDate', e.target.value)}
                                    />
                                    <div className="flex-1 relative">
                                        <span className="absolute left-2 top-1 text-xs text-gray-400">$</span>
                                        <input
                                            type="number"
                                            className="w-full pl-5 pr-2 py-1 text-xs border rounded font-medium"
                                            value={item.amount}
                                            onChange={e => handleScheduleChange(index, 'amount', Number(e.target.value))}
                                        />
                                    </div>
                                    <button type="button" onClick={() => removeInstallment(index)} className="text-gray-400 hover:text-red-500 p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </form>

                {/* PREVIEW COLUMN */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 h-fit">
                    <div className="flex items-center gap-2 mb-6 text-gray-900">
                        <Calculator className="w-5 h-5" />
                        <h3 className="font-bold">Deal Analysis</h3>
                    </div>

                    <div className="space-y-6">
                        {/* Break Down */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Fund Cost Overlay ({fund.costOfCapitalRate}%)</span>
                                <span className="font-mono text-red-500">-${((principal * (fund.costOfCapitalRate / 100) * durationDays) / DAYS_IN_YEAR).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Variable Costs</span>
                                <span className="font-mono text-red-500">-${calculateVariableCosts(principal, variableCosts).toFixed(2)}</span>
                            </div>
                            {/* Total Repayment Display */}
                            <div className="pt-2 border-t border-gray-200 space-y-1">
                                <div className="flex justify-between font-medium text-gray-500 text-xs">
                                    <span>Target Repayment (Terms)</span>
                                    <span>${expectedTotalRepayment.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-gray-900">
                                    <span>Scheduled Repayment</span>
                                    <span className={Math.abs(totalRepayment - expectedTotalRepayment) > 0.05 ? 'text-red-600' : 'text-emerald-700'}>
                                        ${totalRepayment.toFixed(2)}
                                    </span>
                                </div>
                                {Math.abs(totalRepayment - expectedTotalRepayment) > 0.05 && (
                                    <div className="text-right text-xs text-red-500 font-medium">
                                        Diff: ${(totalRepayment - expectedTotalRepayment).toFixed(2)}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between font-medium mt-1">
                                <span>Total Cost Barrier</span>
                                <span className="font-mono text-red-600">${totalCost.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Break Even */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-start gap-2 mb-1">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Break Even Amount</span>
                                <Info className="w-3 h-3 text-gray-400 mt-0.5" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">${breakEven.toFixed(2)}</p>
                            <p className="text-xs text-gray-500 mt-1">To cover principal + all costs</p>
                        </div>

                        {/* Net Yield */}
                        <div className={`p-4 rounded-lg border shadow-sm ${netYield >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex items-start gap-2 mb-1">
                                <span className={`text-xs font-semibold uppercase ${netYield >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Projected Net Yield</span>
                            </div>
                            <p className={`text-2xl font-bold ${netYield >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                {netYield >= 0 ? '+' : ''}${netYield.toFixed(2)}
                            </p>
                            <p className={`text-xs mt-1 ${netYield >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {((netYield / principal) * 100).toFixed(2)}% ROI
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors">
                    Cancel
                </button>
                <button form="loan-form" type="submit" className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
                    Create Loan
                </button>
            </div>
        </div>
    );
};
