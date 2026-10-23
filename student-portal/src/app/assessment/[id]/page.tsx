'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { OptionKey, ClientQuestion, SubmissionPayload, SubmissionResult } from '@/types';
import { Mascot } from '@/components/Mascot';
import confetti from 'canvas-confetti';
import { X, Clock, LayoutGrid } from 'lucide-react';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const fmtLong = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;

export default function AssessmentArenaPage() {
  const router = useRouter();
  const params = useParams();
  const { student, isLoading } = useAuth();
  const cycleId = (params?.id as string) || '';

  const [loadingAssessment, setLoadingAssessment] = useState(true);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [cycleData, setCycleData] = useState<any | null>(null);
  const [dynamicSubjectKeys, setDynamicSubjectKeys] = useState<string[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(5400);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);

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

  const live = useRef({ answers, times, elapsed, strikes, flags, si, dynamicSubjectKeys });
  live.current = { answers, times, elapsed, strikes, flags, si, dynamicSubjectKeys };
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !student) router.push('/');
  }, [isLoading, student, router]);

  // Load questions from live Firestore API + check existing attempt
  useEffect(() => {
    if (!student || !cycleId) return;

    setLoadingAssessment(true);
    setAssessmentError(null);

    // 1. Fetch live assessment and client-safe questions from database API
    fetch(`/api/assessments?id=${encodeURIComponent(cycleId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d || !d.cycle || !d.cycle.questions || d.cycle.questions.length === 0) {
          setAssessmentError('No questions have been configured for this assessment, or it does not exist.');
          setLoadingAssessment(false);
          return;
        }

        const cycle = d.cycle;
        if (!cycle.isOpen && !cycle.isActive) {
          setAssessmentError('This assessment is closed or currently inactive for this week.');
          setLoadingAssessment(false);
          return;
        }

        setCycleData(cycle);
        const durationSec = (Number(cycle.durationMinutes) || 15) * 60;
        setTotalSeconds(durationSec);

        // Group questions by subject
        const qMap: Record<string, ClientQuestion[]> = {};
        const aMap: Record<string, Record<string, OptionKey>> = {};
        const tMap: Record<string, number> = {};

        const rawList = cycle.questions as any[];
        rawList.forEach((rawQ) => {
          const sKey = rawQ.subjectKey || cycle.subject || 'general';
          if (!qMap[sKey]) {
            qMap[sKey] = [];
            aMap[sKey] = {};
            tMap[sKey] = 0;
          }
          qMap[sKey].push({
            id: rawQ.id,
            subjectKey: sKey,
            subjectName: rawQ.subjectName || cycle.title || sKey,
            topic: rawQ.topic || 'General Topic',
            questionText: rawQ.questionText || '',
            options: rawQ.options || {},
          });
        });

        const keys = Object.keys(qMap);
        setDynamicSubjectKeys(keys);
        setQuestions(qMap);
        setAnswers(aMap);
        setTimes(tMap);
        setTotalQuestionsCount(rawList.length);
        setLoadingAssessment(false);
      })
      .catch((err) => {
        console.error('Failed to load assessment:', err);
        setAssessmentError('Could not load assessment questions from the server. Check your connection.');
        setLoadingAssessment(false);
      });

    // 2. Check existing attempt in live Firestore
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
  }, [student?.uid, cycleId]);

  const submit = useCallback(async () => {
    if (!student || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const L = live.current;
    const payload: SubmissionPayload = {
      cycleId,
      studentDetails: {
        uid: student.uid,
        displayName: student.displayName,
        phone: student.phone,
        network: student.network || 'MTN',
        schoolId: student.schoolId || 'self',
        schoolName: student.schoolName,
        schoolClass: student.schoolClass,
      },
      subjectsTaken: L.dynamicSubjectKeys.length > 0 ? L.dynamicSubjectKeys : ['general'],
      answers: L.answers,
      timeSpentPerSubjectSeconds: L.times,
      totalTimeSpentSeconds: L.elapsed,
      tabSwitchesCount: L.strikes,
      antiCheatFlags: L.flags,
    };
    try {
      const res = await fetch('/api/grade-weekly-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('grading failed');
      const r: SubmissionResult = await res.json();
      setResult(r);
      if (r.averagePercentage >= 80) {
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#58cc02', '#1cb0f6', '#ffc800', '#ff9600'] });
      }
    } catch {
      submittedRef.current = false;
      alert('Could not grade your answers. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [student, cycleId]);

  // Timers
  useEffect(() => {
    if (result || !student || loadingAssessment || assessmentError) return;
    const id = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= totalSeconds) submit();
        return e + 1;
      });
      const key = live.current.dynamicSubjectKeys[live.current.si];
      if (key) setTimes((t) => ({ ...t, [key]: (t[key] || 0) + 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [result, student, loadingAssessment, assessmentError, totalSeconds, submit]);

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

  if (isLoading || !student || loadingAssessment) {
    return (
      <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-12">
        <Mascot size={90} className="animate-bob" />
        <p className="mt-4 text-sm font-bold text-[var(--wolf)]">Loading weekly continuous assessment...</p>
      </div>
    );
  }

  if (assessmentError) {
    return (
      <div className="max-w-md mx-auto my-16 card text-center p-8 flex flex-col items-center gap-4">
        <Mascot size={90} mood="sad" />
        <h2 className="text-xl font-black">Assessment Unavailable</h2>
        <p className="text-sm text-[var(--wolf)] font-bold">
          {assessmentError}
        </p>
        <button className="btn btn-block" onClick={() => router.push('/dashboard')}>
          Return to Dashboard
        </button>
      </div>
    );
  }

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
          <div className="card card-yellow text-center"><div className="label !text-[var(--fox)]">Correct</div><div className="text-3xl font-black" style={{ color: 'var(--fox)' }}>{result.totalCorrect}/{totalQuestionsCount || 10}</div></div>
        </div>

        <div className={`card ${win ? 'card-yellow' : ''} font-black`}>
          {win
            ? '⚡ Great job! You qualified for the weekly continuous assessment airtime scholarships. Rankings and rewards are announced on Sunday night.'
            : 'You need an average of 80% or higher to qualify for airtime scholarships.'}
        </div>

        <h2 className="text-xl">Your feedback</h2>
        <div className="flex flex-col gap-3">
          {Object.values(result.subjectResults || {}).map((r) => (
            <div key={r.subjectKey} className="card !p-0 overflow-hidden">
              <button className="w-full flex items-center justify-between p-4 cursor-pointer" onClick={() => setOpen(open === r.subjectKey ? null : r.subjectKey)}>
                <span className="font-black">{r.subjectName}</span>
                <span className="flex items-center gap-2">
                  <span className="pill" style={{ background: '#ddf4ff', color: 'var(--macaw-shadow)' }}>⏱ {fmtLong(r.timeSpentSeconds)}</span>
                  <span className="pill" style={{ background: r.percentage >= 80 ? '#d7ffb8' : '#ffdfe0', color: r.percentage >= 80 ? 'var(--feather-shadow)' : 'var(--cardinal-shadow)' }}>{r.score}/{r.totalQuestions}</span>
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
  const key = dynamicSubjectKeys[si] || 'general';
  const subjectName = liveSubjects.find((s) => s.id === key)?.name || cycleData?.title || key;
  const qs = questions[key] || [];
  const q = qs[qi];

  if (!q) {
    return (
      <div className="max-w-md mx-auto my-16 card text-center p-8 flex flex-col items-center gap-4">
        <Mascot size={90} mood="sad" />
        <h2 className="text-xl font-black">Question Not Found</h2>
        <p className="text-sm text-[var(--wolf)]">No question available for this stage.</p>
        <button className="btn btn-block" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const selected = answers[key]?.[q.id];
  const answeredTotal = Object.values(answers).reduce((n, a) => n + Object.keys(a).length, 0);

  let position = 1;
  for (let i = 0; i < si; i++) {
    position += (questions[dynamicSubjectKeys[i]] || []).length;
  }
  position += qi;

  const isLast = si === dynamicSubjectKeys.length - 1 && qi === qs.length - 1;
  const remaining = Math.max(0, totalSeconds - elapsed);

  const advance = () => {
    if (qi < qs.length - 1) {
      setQi(qi + 1);
    } else if (si < dynamicSubjectKeys.length - 1) {
      setSi(si + 1);
      setQi(0);
    }
  };

  const finish = () => {
    if (answeredTotal < totalQuestionsCount && !window.confirm(`You answered ${answeredTotal} of ${totalQuestionsCount}. Submit anyway? Unanswered count as wrong.`)) return;
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
        <div className="progress flex-1"><span style={{ width: `${Math.min(100, (position / (totalQuestionsCount || 1)) * 100)}%` }} /></div>
        <span className="pill" style={{ background: remaining < 300 ? '#ffdfe0' : '#ddf4ff', color: remaining < 300 ? 'var(--cardinal-shadow)' : 'var(--macaw-shadow)' }}>
          <Clock className="w-4 h-4" /> {fmt(elapsed)}
        </span>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 pb-40 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="pill" style={{ background: '#d7ffb8', color: 'var(--feather-shadow)' }}>
            {subjectName} · {qi + 1}/{qs.length}
          </span>
          {dynamicSubjectKeys.length > 1 && (
            <button className="btn btn-outline !py-2 !px-3" onClick={() => setSheet(true)}>
              <LayoutGrid className="w-4 h-4" /> Subjects
            </button>
          )}
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
          <button
            className="btn btn-outline"
            onClick={() => {
              if (qi > 0) {
                setQi(qi - 1);
              } else if (si > 0) {
                const prevKey = dynamicSubjectKeys[si - 1];
                const prevQs = questions[prevKey] || [];
                setSi(si - 1);
                setQi(Math.max(0, prevQs.length - 1));
              }
            }}
            disabled={si === 0 && qi === 0}
          >
            Back
          </button>
          <span className="hidden sm:block text-sm font-black text-[var(--hare)]">
            {answeredTotal}/{totalQuestionsCount} answered
          </span>
          {isLast ? (
            <button className="btn" onClick={finish} disabled={submitting}>
              {submitting ? 'Grading…' : 'Finish'}
            </button>
          ) : (
            <button className="btn" onClick={advance}>
              {selected ? 'Continue' : 'Skip'}
            </button>
          )}
        </div>
      </div>

      {/* subjects sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setSheet(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl mb-4">Jump to a section</h3>
            <div className="flex flex-col gap-2">
              {dynamicSubjectKeys.map((k, i) => {
                const n = Object.keys(answers[k] || {}).length;
                const sTotal = (questions[k] || []).length;
                return (
                  <button key={k} className={`card card-select flex justify-between !py-3 ${i === si ? 'selected' : ''}`} onClick={() => { setSi(i); setQi(0); setSheet(false); }}>
                    <span>{liveSubjects.find((s) => s.id === k)?.name || cycleData?.title || k}</span>
                    <span className="pill" style={{ background: n === sTotal ? '#d7ffb8' : '#f7f7f7', color: n === sTotal ? 'var(--feather-shadow)' : 'var(--wolf)' }}>
                      {n}/{sTotal}
                    </span>
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
