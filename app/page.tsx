"use client";

import React, { useState, useEffect } from 'react';
import { useFund } from '@/context/FundContext';
import { FundCard } from '@/components/FundCard';
import { Plus, LogOut, Users, PieChart } from 'lucide-react';
import { Fund } from '@/types';
import { useSession, signOut } from 'next-auth/react';

interface Manager {
  _id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
}

export default function Dashboard() {
  const { funds, loans, addFund, loading: fundsLoading } = useFund();
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'managers'>('overview');
  const [fundsPage, setFundsPage] = useState(0);
  const fundsPerPage = 5;

  // Form State
  const [newFundName, setNewFundName] = useState('');
  const [newFundAmount, setNewFundAmount] = useState('');
  const [newFundRate, setNewFundRate] = useState('14');

  const fetchManagers = () => {
    if (session?.user?.role === 'cro') {
      fetch('/api/users')
        .then(res => res.json())
        .then(data => setManagers(data))
        .catch(err => console.error('Failed to fetch managers', err));
    }
  };

  useEffect(() => {
    fetchManagers();
  }, [session]);

  const handleCreateFund = async (e: React.FormEvent) => {
    e.preventDefault();
    await addFund({
      name: newFundName,
      totalRaised: Number(newFundAmount),
      costOfCapitalRate: Number(newFundRate)
    });
    setIsModalOpen(false);
    setNewFundName('');
    setNewFundAmount('');
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user? Their access will be revoked immediately.')) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchManagers(); // Refresh list
      }
    } catch (error) {
      console.error('Failed to remove user', error);
    }
  };

  const handleApproveUser = async (userId: string, role: string) => {
    try {
      const res = await fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, status: 'active' })
      });
      if (res.ok) {
        fetchManagers(); // Refresh list
      }
    } catch (error) {
      console.error('Failed to approve user', error);
    }
  };

  const isRejected = session?.user?.status === 'rejected';

  if (isRejected) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-red-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Revoked</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Your access to this application has been revoked by an administrator. Please contact support if you believe this is an error.
          </p>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </main>
    );
  }

  if (session?.user?.status === 'pending') {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Your account is currently waiting for approval from an administrator. You will be notified once your account is active.
          </p>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </main>
    );
  }

  const isCRO = session?.user?.role === 'cro';

  const filteredFunds = isCRO && selectedManager
    ? funds.filter(f => f.userId.toString() === selectedManager)
    : funds;

  const totalFunds = filteredFunds.length;
  const displayedFunds = filteredFunds.slice(fundsPage * fundsPerPage, (fundsPage + 1) * fundsPerPage);

  useEffect(() => {
    setFundsPage(0); // Reset to first page when filter changes
  }, [selectedManager]);

  const getManagerName = (userId: string) => {
    const manager = managers.find(m => m._id === userId);
    return manager ? manager.name : 'Unknown Manager';
  };

  if (fundsLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center py-20">
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isCRO ? 'Organization Overview' : 'Portfolio Overview'}
          </h1>
          <p className="text-gray-500">
            {isCRO ? 'Monitor all funds and managers.' : 'Manage your funds, capital deployment, and risk.'}
          </p>
          {session?.user && (
            <p className="text-sm text-gray-400 mt-1">Welcome, {session.user.name} ({isCRO ? 'CRO' : 'Fund Manager'})</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
          {!isCRO && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 btn-primary rounded-lg shadow-md"
            >
              <Plus className="w-4 h-4" />
              New Fund
            </button>
          )}
        </div>
      </div>

      {isCRO && (
        <div className="flex space-x-4 mb-6 border-b border-gray-200 pb-1">
          <button
            onClick={() => { setViewMode('overview'); setSelectedManager(null); }}
            className={`pb-2 px-1 ${viewMode === 'overview' ? 'border-b-2 font-semibold' : 'text-gray-500'}`}
            style={viewMode === 'overview' ? { borderColor: 'var(--primary-purple)' } : {}}
          >
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              All Funds
            </div>
          </button>
          <button
            onClick={() => setViewMode('managers')}
            className={`pb-2 px-1 ${viewMode === 'managers' ? 'border-b-2 font-semibold' : 'text-gray-500'}`}
            style={viewMode === 'managers' ? { borderColor: 'var(--primary-purple)' } : {}}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Fund Managers
            </div>
          </button>
        </div>
      )}

      {viewMode === 'managers' && isCRO ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managers.map(manager => (
            <div key={manager._id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => { if (manager.status !== 'pending') { setSelectedManager(manager._id); setViewMode('overview'); } }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${manager.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                  manager.status === 'rejected' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                  {manager.status === 'rejected' ? <LogOut className="w-5 h-5" /> : manager.name.charAt(0)}
                </div>
                <div>
                  <h3 className={`font-semibold ${manager.status === 'rejected' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{manager.name}</h3>
                  <p className="text-sm text-gray-500">{manager.email}</p>
                  {manager.status === 'pending' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>}
                  {manager.status === 'rejected' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Deactivated</span>}
                </div>
              </div>

              {manager.status === 'pending' ? (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleApproveUser(manager._id, 'fund_manager')}
                    className="flex-1 btn-primary text-white text-xs py-2 rounded"
                  >
                    Approve as FM
                  </button>
                  <button
                    onClick={() => handleApproveUser(manager._id, 'cro')}
                    className="flex-1 text-xs py-2 rounded hover:bg-gray-50 transition-colors"
                    style={{ border: '1px solid var(--primary-purple)', color: 'var(--primary-purple)' }}
                  >
                    Approve as CRO
                  </button>
                </div>
              ) : manager.status === 'rejected' ? (
                <>
                  <div className="text-sm text-gray-400 mb-4 cursor-pointer" onClick={() => { setSelectedManager(manager._id); setViewMode('overview'); }}>
                    Funds: {funds.filter(f => f.userId.toString() === manager._id).length} (View Only)
                  </div>
                  <button
                    onClick={() => handleApproveUser(manager._id, 'fund_manager')}
                    className="w-full text-xs text-blue-600 border border-blue-200 py-2 rounded hover:bg-blue-50 transition-colors"
                  >
                    Reactivate User
                  </button>
                </>
              ) : (
                <>
                  <div className="text-sm text-gray-500 cursor-pointer" onClick={() => { setSelectedManager(manager._id); setViewMode('overview'); }}>
                    Funds: {funds.filter(f => f.userId.toString() === manager._id).length}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveUser(manager._id); }}
                    className="mt-4 w-full text-xs text-red-600 border border-red-200 py-2 rounded hover:bg-red-50 transition-colors"
                  >
                    Remove User
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {selectedManager && (
            <div className="flex items-center gap-2 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600">Filtering by manager: <strong>{getManagerName(selectedManager)}</strong></span>
              <button onClick={() => setSelectedManager(null)} className="text-sm text-blue-600 hover:underline">Clear Filter</button>
            </div>
          )}
          {displayedFunds.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 mb-4">No funds active.</p>
              {!isCRO && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Create your first fund
                </button>
              )}
            </div>
          ) : (
            <>
              {displayedFunds.map(fund => (
                <div key={fund.id}>
                  {isCRO && <div className="text-xs text-gray-400 mb-1">Managed by: {getManagerName(fund.userId.toString())}</div>}
                  <FundCard
                    fund={fund}
                    loans={loans.filter(l => l.fundId === fund.id)}
                  />
                </div>
              ))}
              {totalFunds > fundsPerPage && (
                <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {fundsPage * fundsPerPage + 1}-{Math.min((fundsPage + 1) * fundsPerPage, totalFunds)} of {totalFunds} funds
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFundsPage(prev => Math.max(0, prev - 1))}
                      disabled={fundsPage === 0}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-700">
                      Page {fundsPage + 1} of {Math.ceil(totalFunds / fundsPerPage)}
                    </span>
                    <button
                      onClick={() => setFundsPage(prev => prev + 1)}
                      disabled={(fundsPage + 1) * fundsPerPage >= totalFunds}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Simple Modal for MVP */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Fund</h2>
            <form onSubmit={handleCreateFund} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fund Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                  style={{ borderColor: 'var(--border-color)' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary-purple)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  placeholder="e.g. Disrupt Fund IV"
                  value={newFundName}
                  onChange={e => setNewFundName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Raised Capital ($)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                  style={{ borderColor: 'var(--border-color)' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary-purple)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  placeholder="1500000"
                  value={newFundAmount}
                  onChange={e => setNewFundAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost of Capital (% PA)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                  style={{ borderColor: 'var(--border-color)' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary-purple)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  placeholder="14"
                  value={newFundRate}
                  onChange={e => setNewFundRate(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 btn-primary rounded-lg"
                >
                  Create Fund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
