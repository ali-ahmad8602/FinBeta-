"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Fund, Loan, LoanStatus } from '@/types';

interface FundContextType {
    funds: Fund[];
    loans: Loan[];
    addFund: (fund: Omit<Fund, 'id'>) => void;
    addLoan: (loan: Omit<Loan, 'id'>) => void;
    updateLoanStatus: (loanId: string, status: LoanStatus, defaultedAmount?: number) => void;
    getFundLoans: (fundId: string) => Loan[];
    deleteLoan: (loanId: string) => void;
}

const FundContext = createContext<FundContextType | undefined>(undefined);

export const FundProvider = ({ children }: { children: ReactNode }) => {
    const [funds, setFunds] = useState<Fund[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);

    // Load from local storage on mount
    useEffect(() => {
        const storedFunds = localStorage.getItem('funds');
        const storedLoans = localStorage.getItem('loans');
        if (storedFunds) setFunds(JSON.parse(storedFunds));
        if (storedLoans) setLoans(JSON.parse(storedLoans));
    }, []);

    // Save to local storage on change
    useEffect(() => {
        localStorage.setItem('funds', JSON.stringify(funds));
        localStorage.setItem('loans', JSON.stringify(loans));
    }, [funds, loans]);

    const addFund = (fundData: Omit<Fund, 'id'>) => {
        const newFund: Fund = { ...fundData, id: crypto.randomUUID() };
        setFunds(prev => [...prev, newFund]);
    };

    const addLoan = (loanData: Omit<Loan, 'id'>) => {
        const newLoan: Loan = { ...loanData, id: crypto.randomUUID() };
        setLoans(prev => [...prev, newLoan]);
    };

    const updateLoanStatus = (loanId: string, status: LoanStatus, defaultedAmount?: number) => {
        setLoans(prev => prev.map(loan =>
            loan.id === loanId ? { ...loan, status, defaultedAmount: defaultedAmount || 0 } : loan
        ));
    };

    const deleteLoan = (loanId: string) => {
        setLoans(prev => prev.filter(l => l.id !== loanId));
    };

    const getFundLoans = (fundId: string) => loans.filter(l => l.fundId === fundId);

    return (
        <FundContext.Provider value={{ funds, loans, addFund, addLoan, updateLoanStatus, getFundLoans, deleteLoan }}>
            {children}
        </FundContext.Provider>
    );
};

export const useFund = () => {
    const context = useContext(FundContext);
    if (!context) throw new Error('useFund must be used within a FundProvider');
    return context;
};
