'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { SubmissionRow } from '@/types';
import { Download, Copy, Check } from 'lucide-react';

type Tab = 'overview' | 'students' | 'missed' | 'sunday' | 'rules';

const fmt = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('ALL');
  const [quota, setQuota] = useState(10);
  const [amount, setAmount] = useState(1000);
  const [cutoff, setCutoff] = useState(80);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [liveCount, setLiveCount] = useState<number>(0);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [isSavingRules, setIsSavingRules] = useState<boolean>(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data?.settings) {
            if (typeof data.settings.quota === 'number') setQuota(data.settings.quota);
            if (typeof data.settings.amount === 'number') setAmount(data.settings.amount);
            if (typeof data.settings.cutoff === 'number') setCutoff(data.settings.cutoff);
          }
        })
        .catch((err) => console.warn('Could not load platform settings:', err));
    }
  }, [isAuthenticated]);

  const handleSaveRules = async () => {
    setIsSavingRules(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quota, amount, cutoff }),
      });
      if (!res.ok) throw new Error('Failed to save rules');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Error saving rules:', err);
      alert('Could not save platform rules.');
    } finally {
      setIsSavingRules(false);
    }
  };

  useEffect(() => {
    // Fetch live submissions directly from Firestore API
    fetch('/api/submissions')
      .then((res) => res.json())
      .then((data) => {
        if (data?.submissions && Array.isArray(data.submissions)) {
          setIsLiveActive(true);
          setLiveCount(data.submissions.length);
          const mappedLive: SubmissionRow[] = data.submissions.map((item: any) => ({
            id: item.id,
            cycleId: item.cycleId || 'abc-cycle',
            userId: item.userId || item.studentId || 'unknown',
            studentName: item.studentName || item.displayName || 'Student',
            phone: item.phone || '',
            maskedPhone: item.maskedPhone || (item.phone ? `${item.phone.slice(0, 4)}***${item.phone.slice(-3)}` : 'N/A'),
            schoolId: item.schoolId || 'self',
            schoolName: item.schoolName || 'Self',
            schoolClass: item.schoolClass || 'Senior Secondary',
            network: item.network || 'MTN',
            averagePercentage: item.averagePercentage || Math.round(((item.score || item.scorePercent || 0) / (item.totalMarks || 10)) * 100),
            totalCorrect: item.totalCorrect || item.score || 0,
            totalQuestions: item.totalQuestions || 90,
            totalTimeSpentSeconds: item.totalTimeSpentSeconds || 0,
            isEligibleForReward: Boolean(item.isEligibleForReward || (item.averagePercentage || 0) >= cutoff),
            airtimeAwarded: Boolean(item.airtimeAwarded),
            airtimeAmountNgn: item.airtimeAmountNgn || 0,
            airtimeStatus: item.airtimeStatus || 'pending',
            submittedAt: item.submittedAt || new Date().toISOString(),
          }));

          setRows(mappedLive);
        } else {
          setRows([]);
        }
      })
      .catch((err) => {
        console.warn('Note reading live submissions:', err);
        setRows([]);
      });
  }, [cutoff]);

  const filtered = useMemo(
    () => rows.filter((r) => r.studentName.toLowerCase().includes(q.toLowerCase()) && (cls === 'ALL' || (r.schoolClass || '').includes(cls))),
    [rows, q, cls]
  );
  const eligible = useMemo(
    () => rows.filter((r) => r.averagePercentage >= cutoff).sort((a, b) => a.totalTimeSpentSeconds - b.totalTimeSpentSeconds),
    [rows, cutoff]
  );
  const winners = eligible.slice(0, quota);
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.averagePercentage, 0) / rows.length) : 0;

  const broadcast = `🇳🇬 *ACEBYCRAFT NIGERIA (ABC NIGERIA)* 🇳🇬
🏆 *WEEKLY ASSESSMENT RESULTS & AIRTIME SCHOLARS* 🏆

📊 Participants: ${rows.length}
🎯 Benchmark: average ≥ ${cutoff}%
⏱️ Ranking: fastest total time wins

🥇 *TOP ${quota} (₦${amount.toLocaleString()} airtime each):*
${winners.map((w, i) => `${i + 1}. ${w.studentName} (${w.schoolName}) — ${w.averagePercentage}% in ${fmt(w.totalTimeSpentSeconds)}`).join('\n')}

👉 Check your scorecard and corrections on your student dashboard.`;

  const exportCsv = () => {
    const head = ['Student', 'Class', 'Average %', 'Correct', 'Time (s)'];
    const body = filtered.map((r) => [`"${r.studentName}"`, `"${r.schoolClass}"`, r.averagePercentage, r.totalCorrect, r.totalTimeSpentSeconds]);
    const a = document.createElement('a');
    a.href = encodeURI('data:text/csv;charset=utf-8,' + [head.join(','), ...body.map((b) => b.join(','))].join('\n'));
    a.download = `abc_national_ca_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (isLoading || !isAuthenticated) return null;

  const tabs: [Tab, string][] = [
    ['overview', 'Overview'],
    ['students', 'Students'],
    ['missed', 'Missed questions'],
    ['sunday', 'Broadcast Report'],
    ['rules', 'Rules & Questions'],
  ];

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl">National Administration Console</h1>
          <p className="text-[var(--wolf)]">
            Weekly continuous assessments, student submissions, and manual airtime merit rewards.
          </p>
        </div>
        <button className="btn btn-outline" onClick={exportCsv}><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-2xl border-2 font-black uppercase text-sm tracking-wider whitespace-nowrap cursor-pointer ${
              tab === id ? 'bg-[#ddf4ff] border-[var(--macaw)] text-[var(--macaw)]' : 'border-[var(--swan)] text-[var(--wolf)] hover:bg-[var(--polar)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card card-blue"><div className="label">Participants</div><div className="text-3xl font-black" style={{ color: 'var(--macaw-shadow)' }}>{rows.length}</div></div>
            <div className="card card-green"><div className="label">Average score</div><div className="text-3xl font-black" style={{ color: 'var(--feather-shadow)' }}>{avg}%</div></div>
            <div className="card card-yellow"><div className="label">Reached {cutoff}%</div><div className="text-3xl font-black" style={{ color: 'var(--fox)' }}>{eligible.length}</div></div>
            <div className="card"><div className="label">Assessment Cycle</div><div className="text-2xl font-black text-emerald-600">Active</div></div>
          </div>
          <div className="card">
            <h3 className="text-lg mb-3">🏅 Fastest students at {cutoff}%+</h3>
            {winners.slice(0, 5).map((w, i) => (
              <div key={w.id} className="flex items-center justify-between py-3 border-b-2 border-[var(--polar)] last:border-0">
                <span className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black" style={{ background: i === 0 ? 'var(--bee)' : i === 1 ? 'var(--hare)' : i === 2 ? 'var(--fox)' : 'var(--swan)' }}>{i + 1}</span>
                  {w.studentName}
                </span>
                <span className="flex gap-2">
                  <span className="pill" style={{ background: '#d7ffb8', color: 'var(--feather-shadow)' }}>{w.averagePercentage}%</span>
                  <span className="pill" style={{ background: '#ddf4ff', color: 'var(--macaw-shadow)' }}>{fmt(w.totalTimeSpentSeconds)}</span>
                </span>
              </div>
            ))}
            {winners.length === 0 && <p className="text-[var(--wolf)]">No students have reached the benchmark yet.</p>}
          </div>
        </>
      )}

      {tab === 'students' && (
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input className="input flex-1" placeholder="Search student…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="input !w-full sm:!w-auto" value={cls} onChange={(e) => setCls(e.target.value)}>
              {['ALL', 'SS 1', 'SS 2', 'SS 3'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Mobile Student Cards (< md) */}
          <div className="md:hidden divide-y divide-[var(--swan)]">
            {filtered.length > 0 ? (
              filtered.map((r) => (
                <div key={r.id} className="py-3.5 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-black text-sm text-[var(--eel)]">{r.studentName}</div>
                      <div className="text-xs text-[var(--wolf)]">{r.schoolName}</div>
                    </div>
                    <span className="pill text-xs font-bold bg-[var(--polar)] border border-[var(--swan)] shrink-0">
                      {r.schoolClass}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-[var(--polar)] p-2 rounded-xl text-center text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--wolf)] block">Score</span>
                      <span className="font-black text-[var(--eel)]">{r.totalCorrect}/90</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--wolf)] block">Average</span>
                      <span className="font-black text-emerald-700">{r.averagePercentage}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--wolf)] block">Time</span>
                      <span className="font-mono text-slate-700">{fmt(r.totalTimeSpentSeconds)}</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <span className="pill text-xs font-black" style={r.averagePercentage >= cutoff ? { background: '#fff5cc', color: 'var(--fox)' } : { background: 'var(--polar)', color: 'var(--wolf)' }}>
                      {r.averagePercentage >= cutoff ? '⚡ Eligible (80%+)' : 'Below Cutoff'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-[var(--wolf)] font-bold text-sm">
                No student submissions recorded yet for this cycle.
              </div>
            )}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="label"><th className="py-2">Student</th><th>Class</th><th>Correct</th><th>Average</th><th>Time</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-t-2 border-[var(--polar)]">
                      <td className="py-3">{r.studentName}</td>
                      <td>{r.schoolClass}</td>
                      <td>{r.totalCorrect}/90</td>
                      <td><span className="pill" style={{ background: '#d7ffb8', color: 'var(--feather-shadow)' }}>{r.averagePercentage}%</span></td>
                      <td>{fmt(r.totalTimeSpentSeconds)}</td>
                      <td>
                        <span className="pill" style={r.averagePercentage >= cutoff ? { background: '#fff5cc', color: 'var(--fox)' } : { background: 'var(--polar)', color: 'var(--wolf)' }}>
                          {r.averagePercentage >= cutoff ? 'Eligible' : 'Below cutoff'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[var(--wolf)] font-bold">
                      No student submissions recorded yet for this cycle. Real-time submissions will appear here automatically.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'missed' && (
        <div className="card p-8 text-center">
          <h3 className="text-lg font-black text-[var(--eel)] mb-2">No Diagnostic Errors Recorded Yet</h3>
          <p className="text-sm font-bold text-[var(--wolf)] max-w-md mx-auto">
            As students take weekly continuous assessments, frequently missed questions and curriculum remediation advice will automatically populate here from live student responses.
          </p>
        </div>
      )}

      {tab === 'sunday' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl">Sunday night WhatsApp report</h3>
            <button className="btn btn-blue" onClick={() => { navigator.clipboard.writeText(broadcast); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="card whitespace-pre-wrap text-sm !bg-[var(--polar)] font-sans">{broadcast}</pre>
          <div className="card">
            <h3 className="text-lg mb-3">Airtime queue</h3>

            {/* Mobile Cards (< md) */}
            <div className="md:hidden divide-y divide-[var(--swan)]">
              {winners.map((w, i) => (
                <div key={w.id} className="py-3 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                      {w.studentName}
                    </span>
                    <span className="font-black text-amber-700">₦{amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[var(--wolf)] font-mono">
                    <span>{w.maskedPhone} ({w.network})</span>
                    <span>{w.averagePercentage}% in {fmt(w.totalTimeSpentSeconds)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="label"><th>#</th><th>Student</th><th>Phone</th><th>Network</th><th>Score</th><th>Time</th><th>Airtime</th></tr></thead>
                <tbody>
                  {winners.map((w, i) => (
                    <tr key={w.id} className="border-t-2 border-[var(--polar)]">
                      <td className="py-3">{i + 1}</td><td>{w.studentName}</td><td>{w.maskedPhone}</td><td>{w.network}</td>
                      <td>{w.averagePercentage}%</td><td>{fmt(w.totalTimeSpentSeconds)}</td><td>₦{amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'rules' && (
        <div className="flex flex-col gap-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card flex flex-col gap-4">
              <h3 className="text-lg">Reward rules</h3>
              {saved && <div className="card card-green text-sm">✅ Saved!</div>}
              <div><label className="label">Winners per week</label><input className="input" type="number" min={1} value={quota} onChange={(e) => setQuota(+e.target.value)} /></div>
              <div><label className="label">Airtime per winner (₦)</label><input className="input" type="number" step={100} value={amount} onChange={(e) => setAmount(+e.target.value)} /></div>
              <div><label className="label">Minimum average (%)</label><input className="input" type="number" min={50} max={95} value={cutoff} onChange={(e) => setCutoff(+e.target.value)} /></div>
              <button className="btn" disabled={isSavingRules} onClick={handleSaveRules}>
                {isSavingRules ? 'Saving...' : 'Save rules'}
              </button>
            </div>
            <AssessmentQuickActions />
          </div>

          <AdminSecurityPasscodeCard />
        </div>
      )}
    </div>
  );
}

function AdminSecurityPasscodeCard() {
  const { changePasscode } = useAdminAuth();
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRotate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (newPass.trim().length < 8) {
      setMsg({ text: 'New passcode must be at least 8 characters long.', error: true });
      return;
    }
    if (newPass.trim() !== confirmPass.trim()) {
      setMsg({ text: 'New passcodes do not match.', error: true });
      return;
    }

    setLoading(true);
    const res = await changePasscode(currentPass.trim(), newPass.trim());
    setLoading(false);

    if (res.success) {
      setMsg({ text: 'Administrator passcode updated successfully!' });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      setMsg({ text: res.error || 'Failed to update passcode.', error: true });
    }
  };

  return (
    <div className="card max-w-xl flex flex-col gap-4">
      <h3 className="text-lg">Administrator Passcode Security</h3>
      <p className="text-xs text-[var(--wolf)]">
        The master administrator passcode protects national administrative operations. You can rotate it anytime below.
      </p>

      {msg && (
        <div className={`card ${msg.error ? 'card-red' : 'card-green'} text-sm`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleRotate} className="flex flex-col gap-3">
        <div>
          <label className="label">Current Master Passcode</label>
          <input
            type="password"
            required
            className="input font-mono"
            placeholder="Enter current passcode"
            value={currentPass}
            onChange={(e) => setCurrentPass(e.target.value)}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">New Passcode (8+ chars)</label>
            <input
              type="password"
              required
              className="input font-mono"
              placeholder="At least 8 chars"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Confirm New Passcode</label>
            <input
              type="password"
              required
              className="input font-mono"
              placeholder="Confirm new passcode"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-purple" disabled={loading}>
          {loading ? 'Updating Passcode...' : 'Update Administrator Passcode'}
        </button>
      </form>
    </div>
  );
}

function AssessmentQuickActions() {
  return (
    <div className="card flex flex-col gap-4">
      <h3 className="text-lg">Assessment & Curriculum Actions</h3>
      <p className="text-xs text-[var(--wolf)]">
        Official tests and curriculum subjects are managed centrally and published platform-wide.
      </p>

      <div className="flex flex-col gap-3 mt-2">
        <Link
          href="/assessments/new"
          className="btn btn-blue flex items-center justify-between text-sm !py-3 !px-4"
        >
          <span>Create & Publish Assessment</span>
          <span className="text-xs opacity-80">→</span>
        </Link>

        <Link
          href="/contributions"
          className="btn btn-outline flex items-center justify-between text-sm !py-3 !px-4"
        >
          <span>Review Teacher Question Submissions</span>
          <span className="text-xs opacity-80">→</span>
        </Link>

        <Link
          href="/subjects"
          className="btn btn-outline flex items-center justify-between text-sm !py-3 !px-4"
        >
          <span>Manage Curriculum Subjects</span>
          <span className="text-xs opacity-80">→</span>
        </Link>
      </div>
    </div>
  );
}
