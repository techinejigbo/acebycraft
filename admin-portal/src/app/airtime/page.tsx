'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { 
  Zap, 
  Smartphone, 
  CheckCircle2, 
  RefreshCw, 
  Send, 
  Check, 
  Clock, 
  Award,
  Search,
  ExternalLink,
  ShieldCheck,
  Phone
} from 'lucide-react';

interface PendingCandidate {
  submissionId: string;
  userId: string;
  studentName: string;
  phone: string;
  network: string;
  schoolName: string;
  schoolClass: string;
  averagePercentage: number;
  totalTimeSpentSeconds: number;
  airtimeAmountNgn: number;
  submittedAt: string;
}

interface AirtimeAuditRow {
  id: string;
  submissionId?: string;
  userId?: string;
  studentName?: string;
  phone: string;
  network?: string;
  amountNgn: number;
  status: string;
  method?: string;
  referenceNote?: string;
  timestamp: string;
}

const fmt = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;

export default function AirtimeManagementPage() {
  const router = useRouter();
  const { isAdminAuthenticated, isLoading } = useAdminAuth();

  const [summary, setSummary] = useState({
    totalDisbursedNgn: 0,
    totalRecipientsCount: 0,
    pendingDisbursalsCount: 0,
  });
  const [pendingQueue, setPendingQueue] = useState<PendingCandidate[]>([]);
  const [transactions, setTransactions] = useState<AirtimeAuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'direct'>('queue');
  const [searchHistory, setSearchHistory] = useState('');

  // Disbursal Action Modal State
  const [selectedCandidate, setSelectedCandidate] = useState<PendingCandidate | null>(null);
  const [manualNote, setManualNote] = useState('Disbursed via bank/telecom VTU');
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Direct Disbursal Form State
  const [directPhone, setDirectPhone] = useState('');
  const [directAmount, setDirectAmount] = useState(1000);
  const [directNetwork, setDirectNetwork] = useState('MTN');
  const [directNote, setDirectNote] = useState('');

  useEffect(() => {
    if (!isLoading && !isAdminAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAdminAuthenticated, router]);

  const loadAirtimeData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/airtime');
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary || { totalDisbursedNgn: 0, totalRecipientsCount: 0, pendingDisbursalsCount: 0 });
        setPendingQueue(data.pendingQueue || []);
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

  // Handle marking a qualified submission as disbursed
  const handleConfirmDisbursal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    setProcessing(true);
    setStatusMsg('');

    try {
      const res = await fetch('/api/airtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: selectedCandidate.submissionId,
          userId: selectedCandidate.userId,
          studentName: selectedCandidate.studentName,
          phone: selectedCandidate.phone,
          network: selectedCandidate.network,
          amountNgn: selectedCandidate.airtimeAmountNgn,
          referenceNote: manualNote,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg('✅ Disbursal recorded successfully!');
        setSelectedCandidate(null);
        setManualNote('Disbursed via bank/telecom VTU');
        await loadAirtimeData();
      } else {
        setStatusMsg(`❌ Error: ${data.error || 'Failed to record disbursal'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setStatusMsg(`❌ Error: ${msg}`);
    } finally {
      setProcessing(false);
    }
  };

  // Handle direct manual airtime logging
  const handleDirectDisbursal = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setStatusMsg('');

    try {
      const res = await fetch('/api/airtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: directPhone,
          network: directNetwork,
          amountNgn: directAmount,
          referenceNote: directNote || 'Direct manual reward',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg('✅ Direct manual airtime successfully recorded!');
        setDirectPhone('');
        setDirectNote('');
        await loadAirtimeData();
      } else {
        setStatusMsg(`❌ Error: ${data.error || 'Failed to log airtime'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setStatusMsg(`❌ Error: ${msg}`);
    } finally {
      setProcessing(false);
    }
  };

  const filteredHistory = transactions.filter((tx) => {
    const q = searchHistory.toLowerCase();
    return (
      (tx.studentName || '').toLowerCase().includes(q) ||
      tx.phone.includes(q) ||
      (tx.id || '').toLowerCase().includes(q) ||
      (tx.referenceNote || '').toLowerCase().includes(q)
    );
  });

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
            <Zap className="w-7 h-7 text-amber-500" />
            <span>Airtime Merit Reward Ledger</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit qualifying student assessments and record manual airtime disbursements directly to telecom lines
          </p>
        </div>

        <button
          onClick={loadAirtimeData}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors self-start sm:self-auto flex items-center space-x-1.5 text-xs font-bold cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white font-bold text-xs flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="underline text-slate-400 hover:text-white cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        <div className="bg-white border border-amber-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Total Airtime Disbursed</span>
          <div className="mt-2 text-3xl sm:text-4xl font-black text-amber-700">
            ₦{summary.totalDisbursedNgn.toLocaleString()}
          </div>
          <span className="text-xs text-slate-500 mt-2">Cumulative reward incentives transferred</span>
        </div>

        <div className="bg-white border border-emerald-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Scholars Credited</span>
          <div className="mt-2 text-3xl sm:text-4xl font-black text-emerald-700">
            {summary.totalRecipientsCount}
          </div>
          <span className="text-xs text-slate-500 mt-2">Verified phone lines credited</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Awaiting Disbursal</span>
          <div className="mt-2 text-3xl sm:text-4xl font-black text-slate-900">
            {summary.pendingDisbursalsCount}
          </div>
          <span className="text-xs text-slate-500 mt-2">Students scored &ge;80% waiting for credit</span>
        </div>

      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'queue'
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Qualifying Students Queue ({pendingQueue.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Disbursal History Log ({transactions.length})
        </button>

        <button
          onClick={() => setActiveTab('direct')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'direct'
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Direct Transfer Entry
        </button>
      </div>

      {/* TAB 1: PENDING QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">
              Weekly Merit Assessment Qualifiers
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Ranked by score &amp; completion speed
            </span>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Student &amp; School</th>
                    <th className="px-6 py-4">Phone / Carrier</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Speed</th>
                    <th className="px-6 py-4">Reward</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                          <span className="text-sm font-bold text-slate-700">All Qualified Students Credited</span>
                          <span className="text-xs text-slate-400">No pending airtime rewards in the queue. New qualifiers will appear here after assessments.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pendingQueue.map((c, idx) => (
                      <tr key={c.submissionId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-black text-amber-700 text-xs">
                          #{idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-slate-900 text-sm">{c.studentName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{c.schoolName} • {c.schoolClass}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          <div className="font-bold text-slate-800">{c.phone}</div>
                          <div className="text-[10px] text-slate-500 font-sans mt-0.5">{c.network}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {c.averagePercentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-600">
                          {fmt(c.totalTimeSpentSeconds)}
                        </td>
                        <td className="px-6 py-4 font-black text-amber-700">
                          ₦{c.airtimeAmountNgn.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedCandidate(c)}
                            className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all cursor-pointer shadow-xs"
                          >
                            Mark Disbursed
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT HISTORY LOG */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">
              Historical Disbursal Audit Log
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                placeholder="Search phone, recipient, or ref..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">Recipient</th>
                    <th className="px-6 py-4">Phone / Network</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Note / Method</th>
                    <th className="px-6 py-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        No airtime disbursals matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-emerald-700">
                          {tx.id}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-900">
                          {tx.studentName || 'Recipient'}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-800">
                          {tx.phone} <span className="text-slate-400 font-sans">({tx.network || 'MTN'})</span>
                        </td>
                        <td className="px-6 py-4 font-black text-amber-700">
                          ₦{tx.amountNgn.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                          {tx.referenceNote || 'Manual transfer'}
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
      )}

      {/* TAB 3: DIRECT TRANSFER ENTRY */}
      {activeTab === 'direct' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 text-sm font-black text-slate-900">
            <Smartphone className="w-5 h-5 text-amber-500" />
            <span>Direct Manual Airtime Log</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Record a direct airtime transfer made to any student phone number via banking app, USSD, or direct telecom VTU transfer.
          </p>

          <form onSubmit={handleDirectDisbursal} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recipient Phone Number (Nigeria)
              </label>
              <input
                type="tel"
                required
                value={directPhone}
                onChange={(e) => setDirectPhone(e.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Network Carrier
                </label>
                <select
                  value={directNetwork}
                  onChange={(e) => setDirectNetwork(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="MTN">MTN Nigeria</option>
                  <option value="Airtel">Airtel Nigeria</option>
                  <option value="Glo">Glo (Globacom)</option>
                  <option value="9mobile">9mobile</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount (NGN)
                </label>
                <input
                  type="number"
                  required
                  min={100}
                  step={100}
                  value={directAmount}
                  onChange={(e) => setDirectAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Transfer Reference / Note
              </label>
              <input
                type="text"
                value={directNote}
                onChange={(e) => setDirectNote(e.target.value)}
                placeholder="e.g. Sent via OPay / USSD *904# / Ref #98234"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 px-4 rounded-2xl font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 text-xs flex items-center justify-center space-x-2 shadow-md shadow-amber-400/20 active:scale-95 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{processing ? 'Recording...' : 'Record Manual Transfer'}</span>
            </button>
          </form>
        </div>
      )}

      {/* DISBURSAL CONFIRMATION MODAL */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Record Airtime Transfer</h3>
                <p className="text-xs text-slate-500">Continuous Assessment Merit Scholar</p>
              </div>
            </div>

            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-slate-900">{selectedCandidate.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recipient Phone:</span>
                <span className="font-mono font-bold text-emerald-700">{selectedCandidate.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Carrier:</span>
                <span className="font-medium text-slate-800">{selectedCandidate.network}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Score &amp; Time:</span>
                <span className="font-bold text-slate-900">{selectedCandidate.averagePercentage}% in {fmt(selectedCandidate.totalTimeSpentSeconds)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span className="text-slate-700">Airtime Amount:</span>
                <span className="text-amber-700 font-black text-sm">₦{selectedCandidate.airtimeAmountNgn.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmDisbursal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transfer Reference / Note (Optional)
                </label>
                <input
                  type="text"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="e.g. Sent via Bank App / VTU / Ref #0012"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="w-1/2 py-2.5 px-4 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="w-1/2 py-2.5 px-4 rounded-2xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-400/20 transition-all cursor-pointer"
                >
                  {processing ? 'Recording...' : 'Confirm Disbursed'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
