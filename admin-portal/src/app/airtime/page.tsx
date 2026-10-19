'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { AirtimeTxRow } from '@/types';
import { 
  Zap, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Send, 
  ShieldCheck
} from 'lucide-react';

export default function AirtimeManagementPage() {
  const router = useRouter();
  const { isAdminAuthenticated, isLoading } = useAdminAuth();

  const [balanceData, setBalanceData] = useState<{ balance: number; currencyCode: string; isSandbox: boolean } | null>(null);
  const [transactions, setTransactions] = useState<AirtimeTxRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [testPhone, setTestPhone] = useState('08123456789');
  const [testAmount, setTestAmount] = useState(200);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState('');

  useEffect(() => {
    if (!isLoading && !isAdminAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAdminAuthenticated, router]);

  const loadAirtimeData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/airtime').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setBalanceData(data.balance);
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.warn('Failed to load airtime data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadAirtimeData();
    }
  }, [isAdminAuthenticated]);

  const handleManualDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatching(true);
    setDispatchMsg('');

    try {
      const res = await fetch('/api/airtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          amountNgn: Number(testAmount),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setDispatchMsg(`✅ ${data.message}`);
        loadAirtimeData();
      } else {
        setDispatchMsg(`❌ Error: ${data.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to dispatch';
      setDispatchMsg(`❌ Exception: ${msg}`);
    } finally {
      setDispatching(false);
    }
  };

  if (isLoading || !isAdminAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center space-x-2">
            <Zap className="w-7 h-7 text-amber-600" />
            <span>Airtime Gateway Distribution & Audit</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor airtime liquidity balance, audit automated top-up records, and execute manual re-attempts
          </p>
        </div>

        <button
          onClick={loadAirtimeData}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors self-start sm:self-auto flex items-center space-x-1.5 text-xs font-bold cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          <span>Refresh Balance</span>
        </button>
      </div>

      {/* Balance & Manual Dispatch Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Airtime Gateway Account Balance Card */}
        <div className="lg:col-span-1 bg-gradient-to-br from-amber-50 via-white to-orange-50 border border-amber-200 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Gateway Balance</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                balanceData?.isSandbox 
                  ? 'bg-amber-100 text-amber-900 border-amber-300' 
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}>
                {balanceData?.isSandbox ? 'Sandbox Mode' : 'Live Production'}
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-black text-slate-900">
              ₦{balanceData?.balance?.toLocaleString() || '50,000.00'}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Currency: <strong>{balanceData?.currencyCode || 'NGN'}</strong>. Micro-topups are deducted from this balance whenever students score &ge;80% in weekend biology assessments.
            </p>
          </div>

          <div className="pt-4 border-t border-amber-200/60 space-y-1 text-xs text-slate-500">
            <div className="flex items-center space-x-1.5 text-emerald-700 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>OAuth2 Token Auto-Refresh Active</span>
            </div>
            <p className="text-[11px]">
              Tokens expire after 7,200s and are cached in memory automatically.
            </p>
          </div>
        </div>

        {/* Manual Airtime Dispatcher */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 text-sm font-black text-slate-900">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Manual Top-Up / Test Dispatcher</span>
          </div>

          <p className="text-xs text-slate-600">
            Use this tool to test phone number delivery or manually send an airtime reward to a student whose automated delivery encountered a network delay.
          </p>

          <form onSubmit={handleManualDispatch} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recipient Phone Number (Nigeria)
              </label>
              <input
                type="tel"
                required
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="08123456789"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount (NGN)
              </label>
              <select
                value={testAmount}
                onChange={(e) => setTestAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={100}>₦100 NGN</option>
                <option value={200}>₦200 NGN</option>
                <option value={500}>₦500 NGN</option>
                <option value={1000}>₦1,000 NGN</option>
              </select>
            </div>

            <div className="sm:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={dispatching}
                className="w-full py-2.5 px-4 rounded-2xl font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-amber-400/20 active:scale-95 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{dispatching ? 'Sending...' : 'Dispatch'}</span>
              </button>
            </div>
          </form>

          {dispatchMsg && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium">
              {dispatchMsg}
            </div>
          )}
        </div>

      </div>

      {/* Transactions Audit Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">
            Airtime Transaction Audit Logs
          </h2>
          <span className="text-xs text-slate-500 font-mono font-medium">
            {transactions.length} records logged
          </span>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Recipient Phone</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Gateway Message</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Zap className="w-8 h-8 text-slate-300" />
                        <span className="text-sm font-bold text-slate-600">No airtime transactions recorded yet</span>
                        <span className="text-xs text-slate-400">Automated merit rewards will stream into this audit table as students qualify.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-emerald-700 font-bold">
                      {tx.airtimeTxId || tx.reloadlyTxId || tx.id}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-900 font-medium">
                      {tx.phone}
                    </td>
                    <td className="px-6 py-4 font-black text-amber-700">
                      ₦{tx.amountNgn}
                    </td>
                    <td className="px-6 py-4">
                      {tx.status === 'success' || tx.status === 'sandbox_simulated' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{tx.status === 'sandbox_simulated' ? 'Sandbox Verified' : 'Delivered'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                      {tx.message || 'Dispatched via Airtime Gateway'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                      {new Date(tx.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
