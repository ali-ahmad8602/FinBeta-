"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Fund, Loan, LoanStatus } from '@/types';
import { useSession } from 'next-auth/react';

interface FundContextType {
    funds: Fund[];
    loans: Loan[];
    loading: boolean;
    addFund: (fund: Omit<Fund, 'id' | 'userId'>) => Promise<void>;
    addLoan: (loan: Omit<Loan, 'id'>) => Promise<void>;
    updateLoanStatus: (loanId: string, status: LoanStatus, defaultedAmount?: number) => Promise<void>;
    getFundLoans: (fundId: string) => Loan[];
    deleteLoan: (loanId: string) => Promise<void>;
    refreshData: () => Promise<void>;
}

const FundContext = createContext<FundContextType | undefined>(undefined);

export const FundProvider = ({ children }: { children: ReactNode }) => {
    const [funds, setFunds] = useState<Fund[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const { data: session, status } = useSession();

    const refreshData = async () => {
        // Don't fetch if session is not ready or user is not authenticated
        if (status === 'loading' || !session?.user) {
            setLoading(false);
            return;
        }

        try {
            // Only show full-screen loading if we don't have data yet
            if (funds.length === 0 && loans.length === 0) {
                setLoading(true);
            }

            const [fundsRes, loansRes] = await Promise.all([
                fetch('/api/funds'),
                fetch('/api/loans')
            ]);

            if (fundsRes.ok) {
                const fundsData = await fundsRes.json();
                setFunds(fundsData.map((f: any) => ({ ...f, id: f._id.toString() })));
            }

            if (loansRes.ok) {
                const loansData = await loansRes.json();
                setLoans(loansData.map((l: any) => ({
                    ...l,
                    id: l._id.toString(),
                    fundId: l.fundId.toString()
                })));
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only fetch data when session is authenticated
        if (status === 'authenticated') {
            refreshData();
        } else if (status === 'unauthenticated') {
            setLoading(false);
        }
    }, [status, session]);

    const addFund = async (fundData: Omit<Fund, 'id' | 'userId'>) => {
        try {
            const res = await fetch('/api/funds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fundData),
            });

            if (res.ok) {
                await refreshData();
            }
        } catch (error) {
            console.error('Failed to create fund:', error);
        }
    };

    const addLoan = async (loanData: Omit<Loan, 'id'>) => {
        try {
            const res = await fetch('/api/loans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loanData),
            });

            if (res.ok) {
                await refreshData();
            }
        } catch (error) {
            console.error('Failed to create loan:', error);
        }
    };

    const updateLoanStatus = async (loanId: string, status: LoanStatus, defaultedAmount?: number) => {
        try {
            const res = await fetch(`/api/loans/${loanId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, defaultedAmount: defaultedAmount || 0 }),
            });

            if (res.ok) {
                await refreshData();
            }
        } catch (error) {
            console.error('Failed to update loan:', error);
        }
    };

    const deleteLoan = async (loanId: string) => {
        try {
            const res = await fetch(`/api/loans/${loanId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                await refreshData();
            }
        } catch (error) {
            console.error('Failed to delete loan:', error);
        }
    };

    const getFundLoans = (fundId: string) => loans.filter(l => l.fundId === fundId);

    return (
        <FundContext.Provider value={{ funds, loans, loading, addFund, addLoan, updateLoanStatus, getFundLoans, deleteLoan, refreshData }}>
            {children}
        </FundContext.Provider>
    );
};

export const useFund = () => {
    const context = useContext(FundContext);
    if (!context) throw new Error('useFund must be used within a FundProvider');
    return context;
};
