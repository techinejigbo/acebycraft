'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { NIGERIAN_SUBJECTS } from '@/data/abc_subjects_catalog';
import { SubmissionRow } from '@/types';
import { Download, Copy, Check } from 'lucide-react';

type Tab = 'overview' | 'students' | 'missed' | 'sunday' | 'rules';

// [name, phone, schoolId, school, class, network, avg%, seconds]
const SEED: [string, string, string, string, string, string, number, number][] = [
  ['Chinedu Okafor', '08031234567', 'sch-kings-college', "King's College Lagos", 'SS 3', 'MTN', 92, 780],
  ['Aisha Babangida', '08149876543', 'sch-queens-college', "Queen's College Lagos", 'SS 3', 'Airtel', 89, 845],
  ['Tunde Adeleke', '08023456789', 'self', 'Self (Independent Learner)', 'SS 3', 'Glo', 88, 890],
  ['Emeka Nwosu', '09012348765', 'sch-kings-college', "King's College Lagos", 'SS 3', '9mobile', 85, 940],
  ['Fatima Aliyu', '08051112233', 'sch-fgc-kano', 'FGC Kano', 'SS 2', 'MTN', 84, 975],
  ['Babatunde Fashola', '08039998877', 'sch-kings-college', "King's College Lagos", 'SS 2', 'MTN', 79, 810],
  ['Ngozi Okonjo', '08123334455', 'sch-fgc-enugu', 'FGC Enugu', 'SS 3', 'Airtel', 86, 1010],
  ['Yusuf Datti', '08064445566', 'sch-gv-kaduna', 'GC Kaduna', 'SS 3', 'MTN', 82, 1040],
  ['Somto Eze', '07038887766', 'sch-kings-college', "King's College Lagos", 'SS 1', 'MTN', 81, 1060],
  ['Kehinde Balogun', '08085556677', 'sch-gv-ibadan', 'GC Ibadan', 'SS 3', 'Airtel', 81, 1090],
  ['Osahon Idehen', '08130001122', 'sch-edo-college', 'Edo College', 'SS 2', 'Glo', 80, 1115],
  ['Zainab Danjuma', '08092223344', 'sch-loyola-abuja', 'Loyola Jesuit College', 'SS 3', '9mobile', 80, 1250],
  ['Ife Adebayo', '08031110000', 'sch-kings-college', "King's College Lagos", 'SS 2', 'MTN', 68, 1500],
];

const MISSED = [
  { subject: 'Physics', topic: 'Thermodynamics & heat transfer', rate: 68, action: 'Spend 15 minutes on latent heat vs specific heat capacity.' },
  { subject: 'Chemistry', topic: "Le Chatelier's principle", rate: 62, action: 'Practise counting gas moles on each side of the equation.' },
  { subject: 'Mathematics', topic: 'Circle geometry', rate: 54, action: 'Draw the circle theorems on the board with colours.' },
  { subject: 'Economics', topic: 'Monetary policy & inflation', rate: 48, action: 'Revise how the CBN uses MPR to contain inflation.' },
];

const fmt = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, role, activeSchool, isLoading } = useAdminAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('ALL');
  const [quota, setQuota] = useState(10);
  const [amount, setAmount] = useState(1000);
  const [cutoff, setCutoff] = useState(80);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rows, setRows] = useState<SubmissionRow[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    const base: SubmissionRow[] = SEED.map((s, i) => ({
      id: `s${i}`, cycleId: 'abc-week-42', userId: `u${i}`, studentName: s[0], phone: s[1],
      maskedPhone: `${s[1].slice(0, 4)}***${s[1].slice(-3)}`, schoolId: s[2], schoolName: s[3],
      schoolClass: s[4], network: s[5], averagePercentage: s[6], totalCorrect: Math.round((s[6] / 100) * 90),
      totalQuestions: 90, totalTimeSpentSeconds: s[7], isEligibleForReward: s[6] >= 80,
      airtimeAwarded: false, airtimeAmountNgn: 0, airtimeStatus: 'pending', submittedAt: new Date().toISOString(),
    }));
    try {
      const local: SubmissionRow[] = JSON.parse(localStorage.getItem('abc_past_submissions') || '[]');
      local.forEach((l) => { if (!base.find((b) => b.id === l.id)) base.unshift(l); });
    } catch {}
    // PRIVACY: schools only ever see their own students
    setRows(role === 'school' && activeSchool ? base.filter((r) => r.schoolId === activeSchool.id) : base);
  }, [role, activeSchool]);

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
🏆 *WEEK 42 RESULTS & AIRTIME SCHOLARS* 🏆

📊 Participants: ${rows.length}
🎯 Benchmark: average ≥ ${cutoff}%
⏱️ Ranking: fastest total time wins

🥇 *TOP ${quota} (₦${amount.toLocaleString()} airtime each):*
${winners.map((w, i) => `${i + 1}. ${w.studentName} (${w.schoolName}) — ${w.averagePercentage}% in ${fmt(w.totalTimeSpentSeconds)}`).join('\n')}

👉 Check your scorecard and corrections on your dashboard.`;

  const exportCsv = () => {
    const head = ['Student', 'Class', 'Average %', 'Correct', 'Time (s)'];
    const body = filtered.map((r) => [`"${r.studentName}"`, `"${r.schoolClass}"`, r.averagePercentage, r.totalCorrect, r.totalTimeSpentSeconds]);
    const a = document.createElement('a');
    a.href = encodeURI('data:text/csv;charset=utf-8,' + [head.join(','), ...body.map((b) => b.join(','))].join('\n'));
    a.download = `abc_report_${role === 'school' ? activeSchool?.code : 'national'}.csv`;
    a.click();
  };

  if (isLoading || !isAuthenticated) return null;

  const tabs: [Tab, string][] = [['overview', 'Overview'], ['students', 'Students'], ['missed', 'Missed questions']];
  if (role === 'admin') tabs.push(['sunday', 'Sunday report'], ['rules', 'Rules & questions']);

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl">{role === 'school' ? activeSchool?.name : 'IT unit control room'}</h1>
          <p className="text-[var(--wolf)]">
            {role === 'school' ? '🔒 You can only see students from your own school.' : 'Weekly assessments, results and airtime rewards.'}
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
            <div className="card"><div className="label">Cycle</div><div className="text-3xl font-black">Week 42</div></div>
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
          <div className="flex flex-wrap gap-3 mb-4">
            <input className="input flex-1 min-w-48" placeholder="Search student…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="input !w-auto" value={cls} onChange={(e) => setCls(e.target.value)}>
              {['ALL', 'SS 1', 'SS 2', 'SS 3'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="label"><th className="py-2">Student</th><th>Class</th><th>Correct</th><th>Average</th><th>Time</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'missed' && (
        <div className="grid sm:grid-cols-2 gap-4">
          {MISSED.map((m) => (
            <div key={m.topic} className="card card-red">
              <div className="flex justify-between mb-2">
                <span className="pill" style={{ background: '#fff', color: 'var(--cardinal-shadow)' }}>{m.subject}</span>
                <span className="font-black" style={{ color: 'var(--cardinal-shadow)' }}>{m.rate}% missed</span>
              </div>
              <h3 className="text-lg">{m.topic}</h3>
              <div className="progress my-3"><span style={{ width: `${m.rate}%`, background: 'var(--cardinal)' }} /></div>
              <p className="text-[var(--eel)]">💡 {m.action}</p>
            </div>
          ))}
        </div>
      )}

      {role === 'admin' && tab === 'sunday' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl">Sunday night WhatsApp report</h3>
            <button className="btn btn-blue" onClick={() => { navigator.clipboard.writeText(broadcast); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="card whitespace-pre-wrap text-sm !bg-[var(--polar)] font-sans">{broadcast}</pre>
          <div className="card overflow-x-auto">
            <h3 className="text-lg mb-3">Airtime queue</h3>
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
      )}

      {role === 'admin' && tab === 'rules' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card flex flex-col gap-4">
            <h3 className="text-lg">Reward rules</h3>
            {saved && <div className="card card-green text-sm">✅ Saved!</div>}
            <div><label className="label">Winners per week</label><input className="input" type="number" min={1} value={quota} onChange={(e) => setQuota(+e.target.value)} /></div>
            <div><label className="label">Airtime per winner (₦)</label><input className="input" type="number" step={100} value={amount} onChange={(e) => setAmount(+e.target.value)} /></div>
            <div><label className="label">Minimum average (%)</label><input className="input" type="number" min={50} max={95} value={cutoff} onChange={(e) => setCutoff(+e.target.value)} /></div>
            <button className="btn" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }}>Save rules</button>
          </div>
          <QuestionForm />
        </div>
      )}
    </div>
  );
}

function QuestionForm() {
  const [done, setDone] = useState(false);
  return (
    <form
      className="card flex flex-col gap-3"
      onSubmit={(e) => { e.preventDefault(); setDone(true); (e.target as HTMLFormElement).reset(); setTimeout(() => setDone(false), 2500); }}
    >
      <h3 className="text-lg">Teacher question upload</h3>
      {done && <div className="card card-green text-sm">✅ Added to next week&apos;s bank!</div>}
      <div className="grid grid-cols-2 gap-3">
        <select className="input">{NIGERIAN_SUBJECTS.map((s) => <option key={s.id}>{s.name}</option>)}</select>
        <input className="input" required placeholder="Topic" />
      </div>
      <textarea className="input" required rows={2} placeholder="Question" />
      <div className="grid grid-cols-2 gap-3">
        {['A', 'B', 'C', 'D'].map((o) => <input key={o} className="input" required placeholder={`Option ${o}`} />)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <select className="input">{['A', 'B', 'C', 'D'].map((o) => <option key={o}>Correct: {o}</option>)}</select>
        <input className="input" required placeholder="Explanation" />
      </div>
      <button className="btn btn-blue">Upload question</button>
    </form>
  );
}
