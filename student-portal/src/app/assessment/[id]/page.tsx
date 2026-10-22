'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { CURRENT_WEEKLY_CYCLE, getClientSafeQuestionsForSubject } from '@/data/abc_subjects_catalog';
import { OptionKey, ClientQuestion, SubmissionPayload, SubmissionResult } from '@/types';
import { Mascot } from '@/components/Mascot';
import confetti from 'canvas-confetti';
import { X, Clock, LayoutGrid } from 'lucide-react';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const fmtLong = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
const TOTAL_SECONDS = 5400;

export default function AssessmentArenaPage() {
  const router = useRouter();
  const params = useParams();
  const { student, isLoading } = useAuth();
  const cycleId = (params?.id as string) || CURRENT_WEEKLY_CYCLE.id;

  const subjectKeys = (student?.preferredSubjects && student.preferredSubjects.length > 0)
    ? student.preferredSubjects
    : [];

  const [si, setSi] = useState(0);
  const [qi, setQi] = useState(0);
  const [questions, setQuestions] = useState<Record<string, ClientQuestion[]>>({});
  const [answers, setAnswers] = useState<Record<string, Record<string, OptionKey>>>({});
  const [times, setTimes] = useState<Record<string, number>>({});
  const [elapsed, setElapsed] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [flags, setFlags] = useState<string[]>([]);
  const [warn, setWarn] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [exitAsk, setExitAsk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [liveSubjects, setLiveSubjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.subjects) setLiveSubjects(d.subjects);
      })
      .catch(() => {});
  }, []);

  const live = useRef({ answers, times, elapsed, strikes, flags, si });
  live.current = { answers, times, elapsed, strikes, flags, si };
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !student) router.push('/');
  }, [isLoading, student, router]);

  // Load questions + check existing attempt
  useEffect(() => {
    if (!student) return;
    const q: Record<string, ClientQuestion[]> = {};
    const a: Record<string, Record<string, OptionKey>> = {};
    const t: Record<string, number> = {};
    subjectKeys.forEach((k) => { q[k] = getClientSafeQuestionsForSubject(k); a[k] = {}; t[k] = 0; });
    setQuestions(q); setAnswers(a); setTimes(t);
    // Check existing attempt in live Firestore
    fetch(`/api/submissions?userId=${encodeURIComponent(student.uid)}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.submissions)) {
          const prev = d.submissions.find((s: any) => s.cycleId === cycleId);
          if (prev) {
            submittedRef.current = true;
            setResult(prev);
          }
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.uid, cycleId]);

  const submit = useCallback(async () => {
    if (!student || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const L = live.current;
    const payload: SubmissionPayload = {
      cycleId,
      studentDetails: {
        uid: student.uid, displayName: student.displayName, phone: student.phone, network: student.network || 'MTN',
        schoolId: student.schoolId || 'self', schoolName: student.schoolName, schoolClass: student.schoolClass,
      },
      subjectsTaken: subjectKeys,
      answers: L.answers,
      timeSpentPerSubjectSeconds: L.times,
      totalTimeSpentSeconds: L.elapsed,
      tabSwitchesCount: L.strikes,
      antiCheatFlags: L.flags,
    };
    try {
      const res = await fetch('/api/grade-weekly-assessment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('grading failed');
      const r: SubmissionResult = await res.json();
      setResult(r);
      if (r.averagePercentage >= 80) confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#58cc02', '#1cb0f6', '#ffc800', '#ff9600'] });
    } catch {
      submittedRef.current = false;
      alert('Could not grade your answers. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [student, cycleId, subjectKeys]);

  // Timers
  useEffect(() => {
    if (result || !student) return;
    const id = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= TOTAL_SECONDS) submit();
        return e + 1;
      });
      const key = subjectKeys[live.current.si];
      if (key) setTimes((t) => ({ ...t, [key]: (t[key] || 0) + 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [result, student, subjectKeys, submit]);

  // Anti-cheat
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && !submittedRef.current) {
        setStrikes((s) => s + 1);
        setFlags((f) => [...f, `Tab switch at ${new Date().toLocaleTimeString()}`]);
        setWarn(true);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (isLoading || !student) return null;

  /* ====================== RESULTS ====================== */
  if (result) {
    const win = result.averagePercentage >= 80;
    return (
      <div className="max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-3">
          <Mascot size={150} mood={win ? 'cheer' : 'happy'} className="animate-bob" />
          <h1 className="text-3xl">{win ? 'Amazing work!' : 'Assessment complete!'}</h1>
          <p className="text-[var(--wolf)]">{win ? 'You cleared the 80% benchmark — you are in the race for airtime!' : 'Review your mistakes below and come back stronger next week.'}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="card card-green text-center"><div className="label !text-[var(--feather-shadow)]">Score</div><div className="text-3xl font-black">{result.averagePercentage}%</div></div>
          <div className="card card-blue text-center"><div className="label !text-[var(--macaw-shadow)]">Time</div><div className="text-2xl font-black" style={{ color: 'var(--macaw-shadow)' }}>{fmtLong(result.totalTimeSpentSeconds)}</div></div>
          <div className="card card-yellow text-center"><div className="label !text-[var(--fox)]">Correct</div><div className="text-3xl font-black" style={{ color: 'var(--fox)' }}>{result.totalCorrect}/90</div></div>
        </div>

        <div className={`card ${win ? 'card-yellow' : ''} font-black`}>
          {win
            ? `⚡ Top 10 by speed win ₦1,000 airtime. Results go out Sunday night in the WhatsApp community and here in your Rewards tab.`
            : 'You need an average of 80% to compete for airtime.'}
        </div>

        <h2 className="text-xl">Your feedback</h2>
        <div className="flex flex-col gap-3">
          {Object.values(result.subjectResults || {}).map((r) => (
            <div key={r.subjectKey} className="card !p-0 overflow-hidden">
              <button className="w-full flex items-center justify-between p-4 cursor-pointer" onClick={() => setOpen(open === r.subjectKey ? null : r.subjectKey)}>
                <span className="font-black">{r.subjectName}</span>
                <span className="flex items-center gap-2">
                  <span className="pill" style={{ background: '#ddf4ff', color: 'var(--macaw-shadow)' }}>⏱ {fmtLong(r.timeSpentSeconds)}</span>
                  <span className="pill" style={{ background: r.score >= 8 ? '#d7ffb8' : '#ffdfe0', color: r.score >= 8 ? 'var(--feather-shadow)' : 'var(--cardinal-shadow)' }}>{r.score}/10</span>
                </span>
              </button>
              {open === r.subjectKey && (
                <div className="p-4 pt-0 flex flex-col gap-2">
                  {(r.allQuestionsFeedback || []).map((q, i) => (
                    <div key={q.questionId} className={`card text-sm ${q.isCorrect ? 'card-green' : 'card-red'}`}>
                      <div className="font-black text-[var(--eel)]">{i + 1}. {q.questionText}</div>
                      <div className="text-[var(--eel)]">You: <b>{q.selectedOption || '—'}</b> · Correct: <b>{q.correctOption}</b> · {q.topic}</div>
                      {!q.isCorrect && <div className="mt-1 text-[var(--eel)]">💡 {q.explanation}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="btn btn-block" onClick={() => router.push('/dashboard')}>Back to dashboard</button>
      </div>
    );
  }

  /* ====================== LESSON ====================== */
  const key = subjectKeys[si];
  const subjectName = liveSubjects.find((s) => s.id === key)?.name || key;
  const qs = questions[key] || [];
  const q = qs[qi];
  if (!q) return null;

  const selected = answers[key]?.[q.id];
  const answeredTotal = Object.values(answers).reduce((n, a) => n + Object.keys(a).length, 0);
  const position = si * 10 + qi + 1;
  const isLast = si === subjectKeys.length - 1 && qi === 9;
  const remaining = Math.max(0, TOTAL_SECONDS - elapsed);

  const advance = () => {
    if (qi < 9) setQi(qi + 1);
    else if (si < subjectKeys.length - 1) { setSi(si + 1); setQi(0); }
  };
  const finish = () => {
    if (answeredTotal < 90 && !window.confirm(`You answered ${answeredTotal} of 90. Submit anyway? Unanswered count as wrong.`)) return;
    submit();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {warn && (
        <div className="bg-[var(--cardinal)] text-white text-center text-sm py-2 font-black">
          ⚠️ Tab switching is monitored ({strikes} strike{strikes > 1 ? 's' : ''}). 5 strikes can disqualify you from airtime.
          <button className="underline ml-3 cursor-pointer" onClick={() => setWarn(false)}>OK</button>
        </div>
      )}

      {/* top bar */}
      <div className="flex items-center gap-4 p-4 max-w-3xl mx-auto w-full">
        <button onClick={() => setExitAsk(true)} className="p-1 text-[var(--hare)] cursor-pointer"><X className="w-7 h-7" /></button>
        <div className="progress flex-1"><span style={{ width: `${(position / 90) * 100}%` }} /></div>
        <span className="pill" style={{ background: remaining < 600 ? '#ffdfe0' : '#ddf4ff', color: remaining < 600 ? 'var(--cardinal-shadow)' : 'var(--macaw-shadow)' }}>
          <Clock className="w-4 h-4" /> {fmt(elapsed)}
        </span>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 pb-40 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="pill" style={{ background: '#d7ffb8', color: 'var(--feather-shadow)' }}>{subjectName} · {qi + 1}/10</span>
          <button className="btn btn-outline !py-2 !px-3" onClick={() => setSheet(true)}><LayoutGrid className="w-4 h-4" /> Subjects</button>
        </div>

        <h1 className="text-2xl sm:text-3xl leading-snug">{q.questionText}</h1>

        <div className="flex flex-col gap-3">
          {(['A', 'B', 'C', 'D'] as OptionKey[]).map((o) => (
            <button
              key={o}
              className={`card card-select flex items-center gap-4 ${selected === o ? 'selected animate-pop' : ''}`}
              onClick={() => setAnswers((a) => ({ ...a, [key]: { ...(a[key] || {}), [q.id]: o } }))}
            >
              <span className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center font-black shrink-0 ${selected === o ? 'border-[var(--macaw)] text-[var(--macaw)]' : 'border-[var(--swan)] text-[var(--hare)]'}`}>
                {o}
              </span>
              <span className="text-lg">{q.options[o]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* bottom bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t-2 border-[var(--swan)] p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button className="btn btn-outline" onClick={() => (qi > 0 ? setQi(qi - 1) : si > 0 && (setSi(si - 1), setQi(9)))} disabled={si === 0 && qi === 0}>Back</button>
          <span className="hidden sm:block text-sm font-black text-[var(--hare)]">{answeredTotal}/90 answered</span>
          {isLast ? (
            <button className="btn" onClick={finish} disabled={submitting}>{submitting ? 'Grading…' : 'Finish'}</button>
          ) : (
            <button className="btn" onClick={advance}>{selected ? 'Continue' : 'Skip'}</button>
          )}
        </div>
      </div>

      {/* subjects sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setSheet(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl mb-4">Jump to a subject</h3>
            <div className="flex flex-col gap-2">
              {subjectKeys.map((k, i) => {
                const n = Object.keys(answers[k] || {}).length;
                return (
                  <button key={k} className={`card card-select flex justify-between !py-3 ${i === si ? 'selected' : ''}`} onClick={() => { setSi(i); setQi(0); setSheet(false); }}>
                    <span>{liveSubjects.find((s) => s.id === k)?.name || k}</span>
                    <span className="pill" style={{ background: n === 10 ? '#d7ffb8' : '#f7f7f7', color: n === 10 ? 'var(--feather-shadow)' : 'var(--wolf)' }}>{n}/10</span>
                  </button>
                );
              })}
            </div>
            <button className="btn btn-block mt-4" onClick={finish} disabled={submitting}>Submit all answers</button>
          </div>
        </div>
      )}

      {/* exit confirm */}
      {exitAsk && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 text-center animate-slide-up flex flex-col gap-4 items-center">
            <Mascot size={110} mood="sad" />
            <h3 className="text-xl">Wait, don&apos;t go!</h3>
            <p className="text-[var(--wolf)]">Your timer keeps running and you only get one attempt.</p>
            <button className="btn btn-block" onClick={() => setExitAsk(false)}>Keep going</button>
            <button className="btn btn-outline btn-block !text-[var(--cardinal)]" onClick={() => router.push('/dashboard')}>Leave for now</button>
          </div>
        </div>
      )}
    </div>
  );
}
