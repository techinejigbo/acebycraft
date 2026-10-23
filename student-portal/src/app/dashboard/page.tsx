'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, DEFAULT_9_SUBJECTS } from '@/lib/auth-context';
import { CURRENT_WEEKLY_CYCLE } from '@/data/abc_subjects_catalog';
import { SubmissionResult } from '@/types';
import { Mascot } from '@/components/Mascot';
import { Check, Star, Lock, X, BookOpen, Trophy, User } from 'lucide-react';

type Tab = 'learn' | 'rewards' | 'profile';

const fmt = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;

export default function DashboardPage() {
  const router = useRouter();
  const { student, isLoading, updatePreferredSubjects } = useAuth();
  const [tab, setTab] = useState<Tab>('learn');
  const [subs, setSubs] = useState<SubmissionResult[]>([]);
  const [review, setReview] = useState<SubmissionResult | null>(null);
  const [picker, setPicker] = useState(false);
  const [temp, setTemp] = useState<string[]>([]);
  const [liveSubjects, setLiveSubjects] = useState<{ id: string; name: string; shortCode?: string }[]>([]);

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.subjects) setLiveSubjects(d.subjects);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoading && !student) router.push('/');
  }, [isLoading, student, router]);

  useEffect(() => {
    if (!student) return;
    setTemp(student.preferredSubjects || []);
    (async () => {
      try {
        const res = await fetch(`/api/submissions?userId=${encodeURIComponent(student.uid)}`);
        if (res.ok) {
          const d = await res.json();
          setSubs(Array.isArray(d.submissions) ? d.submissions : []);
        } else {
          setSubs([]);
        }
      } catch {
        setSubs([]);
      }
    })();
  }, [student]);

  if (isLoading || !student) {
    return <div className="flex-1 flex items-center justify-center p-12"><Mascot size={90} className="animate-bob" /></div>;
  }

  // Only subjects fetched live from the database
  const allAvailableSubjects = liveSubjects;
  const targetSubjectCount = Math.min(9, allAvailableSubjects.length);

  const getSubjectName = (id: string) => {
    const found = allAvailableSubjects.find((s) => s.id === id);
    return found ? found.name : id;
  };

  // Only show subjects that actually exist in the live database
  const liveSubjectIds = new Set(liveSubjects.map((s) => s.id));
  const validPreferred = (student.preferredSubjects || []).filter((id) => liveSubjectIds.has(id));
  const mySubjects = validPreferred.length > 0
    ? validPreferred
    : (liveSubjects.length > 0 ? liveSubjects.slice(0, targetSubjectCount).map((s) => s.id) : []);

  const current = subs.find((s) => s.cycleId === CURRENT_WEEKLY_CYCLE.id) || null;
  const latest = subs[0] || null;

  const results = latest ? Object.values(latest.subjectResults || {}).sort((a, b) => b.percentage - a.percentage) : [];
  const strengths = results.slice(0, 3);
  const weaknesses = results.slice(-3).reverse();

  const saveSubjects = async () => {
    if (temp.length !== targetSubjectCount) return;
    await updatePreferredSubjects(temp);
    setPicker(false);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'learn', label: 'My learning', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'rewards', label: 'My rewards', icon: <Trophy className="w-5 h-5" /> },
    { id: 'profile', label: 'My account', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-6 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 pb-28 md:pb-6">
      {/* Side rail (desktop) / bottom bar (mobile) */}
      <nav className="fixed md:sticky bottom-0 md:top-24 inset-x-0 md:inset-auto bg-white md:bg-transparent border-t-2 md:border-0 border-[var(--swan)] z-40 flex md:flex-col justify-around md:justify-start gap-1 p-2 md:p-0 md:self-start">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 font-black uppercase text-sm tracking-wider cursor-pointer ${
              tab === t.id ? 'bg-[#ddf4ff] border-[var(--macaw)] text-[var(--macaw)]' : 'border-transparent text-[var(--wolf)] hover:bg-[var(--polar)]'
            }`}
          >
            {t.icon}
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="min-w-0">
        {/* ---------------- LEARN ---------------- */}
        {tab === 'learn' && (
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl p-5 flex items-center justify-between gap-4" style={{ background: 'var(--feather)', borderBottom: '5px solid var(--feather-shadow)' }}>
              <div className="text-white">
                <div className="text-xs font-black uppercase tracking-widest opacity-80">This Week&apos;s Continuous Assessment · Closes Sunday 11:59 PM</div>
                <h1 className="text-xl sm:text-2xl !text-white">
                  {mySubjects.length > 0 ? `Hi ${student.displayName.split(' ')[0]}! Ready for ${mySubjects.length} subject${mySubjects.length === 1 ? '' : 's'}?` : `Hi ${student.displayName.split(' ')[0]}! Welcome to your learning space`}
                </h1>
                <p className="text-sm opacity-90 mt-1">
                  {mySubjects.length > 0
                    ? `Score 80%+ and finish fast to win ₦${CURRENT_WEEKLY_CYCLE.rewardConfig.amountNgn.toLocaleString()} airtime.`
                    : 'Curriculum subjects are currently being configured by the platform administrator.'}
                </p>
              </div>
              <Mascot size={90} mood="cheer" className="hidden sm:block shrink-0" />
            </div>

            {/* 9-Subject Academic Stage Roadmap */}
            {mySubjects.length === 0 ? (
              <div className="card text-center p-8 flex flex-col items-center gap-3 w-full max-w-md mx-auto my-4">
                <Mascot size={80} mood="happy" />
                <h3 className="text-lg font-black">No Active Curriculum Subjects</h3>
                <p className="text-sm text-[var(--wolf)]">
                  The administrator has not published curriculum subjects yet. When subjects are added in the admin console, your personalized learning path will appear here!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[var(--eel)]">Weekly Assessment Arena</h2>
                    <p className="text-xs text-[var(--wolf)] font-bold">10 objective questions per subject · 1 single timed attempt</p>
                  </div>
                  <span className="pill text-xs font-black" style={{ background: current ? '#d7ffb8' : '#ddf4ff', color: current ? 'var(--feather-shadow)' : 'var(--macaw-shadow)' }}>
                    {current ? 'Completed' : `${mySubjects.length} Subjects Ready`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mySubjects.map((id, i) => {
                    const subName = getSubjectName(id);
                    const done = !!current;
                    const subResult = current?.subjectResults?.[id];
                    return (
                      <div
                        key={id}
                        className={`card flex items-center justify-between p-4 transition-all ${
                          done ? 'card-green' : 'hover:border-[var(--macaw)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                            style={{
                              background: done ? 'var(--feather)' : 'var(--polar)',
                              color: done ? '#fff' : 'var(--wolf)',
                              border: '2px solid var(--swan)',
                            }}
                          >
                            {done ? <Check className="w-5 h-5" strokeWidth={3} /> : `${i + 1}`}
                          </div>
                          <div>
                            <div className="font-black text-sm leading-tight text-[var(--eel)]">{subName}</div>
                            <div className="text-xs text-[var(--wolf)] font-bold">
                              {done ? `Score: ${subResult?.score ?? '—'}/10` : '10 questions'}
                            </div>
                          </div>
                        </div>

                        {done ? (
                          <span className="pill text-xs font-black" style={{ background: '#d7ffb8', color: 'var(--feather-shadow)' }}>
                            Done
                          </span>
                        ) : (
                          <span className="pill text-xs font-black" style={{ background: 'var(--polar)', color: 'var(--wolf)' }}>
                            Stage {i + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Final Sunday Rewards milestone card */}
                <div className="card flex items-center justify-between p-4" style={{ background: '#fffbeb', borderColor: 'var(--bee)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bee)', color: '#fff' }}>
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-sm text-[var(--eel)]">Sunday Night Broadcast & Rewards</div>
                      <div className="text-xs text-[var(--fox)] font-bold">Top 10 speed rankings published in WhatsApp community</div>
                    </div>
                  </div>
                  <span className="pill text-xs font-black" style={{ background: '#fff', color: 'var(--fox)' }}>
                    ₦1,000 Airtime
                  </span>
                </div>

                {!current && mySubjects.length > 0 && (
                  <button className="btn btn-block sm:w-80 sm:self-center mt-2" onClick={() => router.push(`/assessment/${CURRENT_WEEKLY_CYCLE.id}`)}>
                    Start Assessment (90 Qs)
                  </button>
                )}
                {current && (
                  <div className="card card-green text-center font-black">
                    ✅ You completed this week&apos;s continuous assessment! Speed ranking results are announced Sunday night.
                  </div>
                )}
              </div>
            )}

            {/* Strengths / weaknesses */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="text-lg mb-3">💪 Strengths</h3>
                {strengths.length === 0 && <p className="text-[var(--wolf)] text-sm">Finish an assessment to see your strongest subjects.</p>}
                {strengths.map((r) => (
                  <div key={r.subjectKey} className="mb-3">
                    <div className="flex justify-between text-sm"><span>{r.subjectName}</span><span style={{ color: 'var(--feather-shadow)' }}>{r.percentage}%</span></div>
                    <div className="progress"><span style={{ width: `${r.percentage}%` }} /></div>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3 className="text-lg mb-3">🎯 Needs practice</h3>
                {weaknesses.length === 0 && <p className="text-[var(--wolf)] text-sm">Your weak areas appear here, updated weekly.</p>}
                {weaknesses.map((r) => (
                  <div key={r.subjectKey} className="mb-3">
                    <div className="flex justify-between text-sm">
                      <span>{r.subjectName}{r.incorrectQuestions?.[0] ? ` · ${r.incorrectQuestions[0].topic}` : ''}</span>
                      <span style={{ color: 'var(--cardinal-shadow)' }}>{r.percentage}%</span>
                    </div>
                    <div className="progress"><span style={{ width: `${r.percentage}%`, background: 'var(--fox)' }} /></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Completed */}
            <div>
              <h3 className="text-xl mb-3">Completed assessments</h3>
              {subs.length === 0 ? (
                <div className="card text-center text-[var(--wolf)]">Nothing here yet — your first attempt will show up here.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {subs.map((s) => (
                    <div key={s.id} className="card flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-black">{s.cycleId.toUpperCase()}</div>
                        <div className="text-sm text-[var(--wolf)]">{new Date(s.submittedAt).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="pill" style={{ background: '#d7ffb8', color: 'var(--feather-shadow)' }}>{s.averagePercentage}%</span>
                        <span className="pill" style={{ background: '#ddf4ff', color: 'var(--macaw-shadow)' }}>⏱ {fmt(s.totalTimeSpentSeconds)}</span>
                        <button className="btn btn-outline !py-2" onClick={() => setReview(s)}>Review</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- REWARDS ---------------- */}
        {tab === 'rewards' && (
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bee)', borderBottom: '5px solid var(--bee-shadow)' }}>
              <Trophy className="w-14 h-14 mx-auto text-white" />
              <h1 className="!text-white text-2xl mt-2">Weekly airtime rewards</h1>
              <p className="text-white/90 mt-1">Top {CURRENT_WEEKLY_CYCLE.rewardConfig.winnerQuota} students with 80%+ average and the fastest total time win.</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="card text-center">
                <div className="label">Required</div>
                <div className="text-3xl font-black" style={{ color: 'var(--fox)' }}>80%</div>
              </div>
              <div className="card text-center">
                <div className="label">Your score</div>
                <div className="text-3xl font-black" style={{ color: latest && latest.averagePercentage >= 80 ? 'var(--feather-shadow)' : 'var(--eel)' }}>
                  {latest ? `${latest.averagePercentage}%` : '—'}
                </div>
              </div>
              <div className="card text-center">
                <div className="label">Your time</div>
                <div className="text-3xl font-black" style={{ color: 'var(--macaw)' }}>{latest ? fmt(latest.totalTimeSpentSeconds) : '—'}</div>
              </div>
            </div>

            <div className={`card ${latest?.isEligibleForReward ? 'card-green' : 'card-blue'} font-black`}>
              {!latest && '👋 Take this week\'s assessment to see if you qualify.'}
              {latest && latest.isEligibleForReward && '🎉 You hit 80%! Your speed rank is decided Sunday night — you could be a winner.'}
              {latest && !latest.isEligibleForReward && '💪 Under 80% this time. Review your mistakes and try again next week!'}
            </div>

            <div className="card">
              <h3 className="text-lg mb-2">Past rewards</h3>
              {student.totalAirtimeWonNgn ? (
                <div className="flex items-center justify-between">
                  <span>⚡ Airtime sent to {student.phone}</span>
                  <span className="pill" style={{ background: '#fff5cc', color: 'var(--fox)' }}>₦{student.totalAirtimeWonNgn}</span>
                </div>
              ) : (
                <p className="text-[var(--wolf)]">No rewards yet. Your first win will show up here!</p>
              )}
            </div>
          </div>
        )}

        {/* ---------------- PROFILE ---------------- */}
        {tab === 'profile' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Mascot size={100} mood="wink" />
              <div>
                <h1 className="text-2xl">{student.displayName}</h1>
                <p className="text-[var(--wolf)]">{student.schoolName} · {student.schoolClass}</p>
              </div>
            </div>
            <div className="card">
              {[
                ['Phone (airtime goes here)', student.phone],
                ['Network', student.network || 'MTN'],
                ['School', student.schoolName],
                ['WhatsApp community', student.whatsappConsent ? 'Joined ✅' : 'Not joined'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-3 border-b-2 border-[var(--polar)] last:border-0">
                  <span className="text-[var(--wolf)]">{k}</span><span>{v}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg">My subjects ({mySubjects.length})</h3>
                {allAvailableSubjects.length > 0 && (
                  <button className="btn btn-outline !py-2" onClick={() => setPicker(true)}>Edit</button>
                )}
              </div>
              {mySubjects.length === 0 ? (
                <p className="text-sm text-[var(--wolf)]">No subjects selected yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {mySubjects.map((id) => (
                    <span key={id} className="pill" style={{ background: '#ddf4ff', color: 'var(--macaw-shadow)' }}>
                      {getSubjectName(id)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Subject picker */}
      {picker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl">Choose your subjects ({temp.length}/{targetSubjectCount})</h3>
              <button onClick={() => setPicker(false)} className="cursor-pointer"><X /></button>
            </div>
            {allAvailableSubjects.length === 0 ? (
              <div className="text-center py-8 text-[var(--wolf)]">
                No curriculum subjects have been published by the administrator yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {allAvailableSubjects.map((s) => {
                  const on = temp.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      className={`card card-select ${on ? 'selected' : ''}`}
                      onClick={() => setTemp(on ? temp.filter((x) => x !== s.id) : temp.length < targetSubjectCount ? [...temp, s.id] : temp)}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            )}
            <button className="btn btn-block" disabled={targetSubjectCount === 0 || temp.length !== targetSubjectCount} onClick={saveSubjects}>Save</button>
          </div>
        </div>
      )}

      {/* Review */}
      {review && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl">Review · {review.averagePercentage}%</h3>
              <button onClick={() => setReview(null)} className="cursor-pointer"><X /></button>
            </div>
            {Object.values(review.subjectResults || {}).map((r) => (
              <div key={r.subjectKey} className="mb-6">
                <div className="flex justify-between mb-2"><h4>{r.subjectName}</h4><span className="pill" style={{ background: '#d7ffb8', color: 'var(--feather-shadow)' }}>{r.score}/10</span></div>
                {(r.incorrectQuestions || []).length === 0 && <div className="card card-green text-sm">Perfect — no mistakes!</div>}
                {(r.incorrectQuestions || []).map((q) => (
                  <div key={q.questionId} className="card card-red mb-2 text-sm">
                    <div className="font-black mb-1" style={{ color: 'var(--eel)' }}>{q.questionText}</div>
                    <div>Your answer: <b>{q.selectedOption || '—'}</b> · Correct: <b>{q.correctOption}</b></div>
                    <div className="mt-1 text-[var(--eel)]">💡 {q.explanation}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
