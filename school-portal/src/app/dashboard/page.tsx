'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSchoolAuth } from '@/lib/school-auth-context';
import { Mascot } from '@/components/Mascot';
import {
  Users,
  Award,
  AlertCircle,
  BarChart3,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  Lightbulb,
  BookOpen,
} from 'lucide-react';

interface SchoolStudentResult {
  id: string;
  name: string;
  phone: string;
  schoolClass: string;
  averagePercentage: number;
  correctCount: number;
  totalQuestions: number;
  totalTimeSeconds: number;
  airtimeWon: boolean;
  subjectScores: Record<string, number>; // subjectId -> percentage
}

// Diagnostic question format for school insights
interface MissedQuestionStat {
  subjectId: string;
  subjectName: string;
  question: string;
  wrongPercentage: number;
  commonWrongOption: string;
  correctOption: string;
  remediationAdvice: string;
}

export default function SchoolDashboardPage() {
  const router = useRouter();
  const { school, isLoading } = useSchoolAuth();
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'roster' | 'diagnostics' | 'subjects'>('roster');
  const [selectedStudent, setSelectedStudent] = useState<SchoolStudentResult | null>(null);
  const [liveSubmissions, setLiveSubmissions] = useState<any[]>([]);
  const [liveSubjects, setLiveSubjects] = useState<any[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!isLoading && !school) {
      router.push('/');
      return;
    }

    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.subjects)) {
          setLiveSubjects(data.subjects);
        }
      })
      .catch((err) => console.warn('Note querying live subjects:', err));

    if (school) {
      fetch(`/api/submissions?schoolId=${encodeURIComponent(school.schoolId)}&code=${encodeURIComponent(school.code)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.submissions) {
            setIsLiveConnected(true);
            if (data.submissions.length > 0) {
              setLiveSubmissions(data.submissions);
            }
          }
        })
        .catch((err) => console.warn('Note querying school submissions:', err));
    }
  }, [isLoading, school, router]);

  // Dynamic student submissions for this specific school (Firestore live)
  const schoolStudents: SchoolStudentResult[] = useMemo(() => {
    if (!school || liveSubmissions.length === 0) return [];

    return liveSubmissions.map((s: any, idx: number) => {
      const scores: Record<string, number> = {};
      if (s.subjectResults && typeof s.subjectResults === 'object') {
        Object.entries(s.subjectResults).forEach(([k, v]: [string, any]) => {
          scores[k] = v.percentage || 0;
        });
      }
      return {
        id: s.id || `live-${idx}`,
        name: s.studentName || 'Student',
        phone: s.phone || s.maskedPhone || 'N/A',
        schoolClass: s.schoolClass || 'SS 3',
        averagePercentage: s.averagePercentage || 0,
        correctCount: s.totalCorrect || 0,
        totalQuestions: s.totalQuestions || 90,
        totalTimeSeconds: s.totalTimeSpentSeconds || 0,
        airtimeWon: Boolean(s.airtimeAwarded),
        subjectScores: scores,
      };
    });
  }, [school, liveSubmissions]);

  // Frequently missed questions derived from real live student submissions
  const missedQuestions: MissedQuestionStat[] = useMemo(() => {
    if (liveSubmissions.length === 0) return [];
    
    const questionMissCount: Record<string, {
      subjectId: string;
      subjectName: string;
      question: string;
      correctOption: string;
      remediationAdvice: string;
      missedCount: number;
      totalAttempts: number;
    }> = {};

    liveSubmissions.forEach((sub: any) => {
      if (sub.subjectResults && typeof sub.subjectResults === 'object') {
        Object.values(sub.subjectResults).forEach((res: any) => {
          if (Array.isArray(res.incorrectQuestions)) {
            res.incorrectQuestions.forEach((iq: any) => {
              const qId = iq.questionId || iq.questionText;
              if (!questionMissCount[qId]) {
                questionMissCount[qId] = {
                  subjectId: res.subjectKey || 'general',
                  subjectName: res.subjectName || 'General',
                  question: iq.questionText || 'Assessment Question',
                  correctOption: iq.correctOption || 'Refer to text',
                  remediationAdvice: iq.explanation || 'Reinforce underlying syllabus concept with practice drills.',
                  missedCount: 0,
                  totalAttempts: 0,
                };
              }
              questionMissCount[qId].missedCount += 1;
            });
          }
          if (Array.isArray(res.allQuestionsFeedback)) {
            res.allQuestionsFeedback.forEach((fq: any) => {
              const qId = fq.questionId || fq.questionText;
              if (questionMissCount[qId]) {
                questionMissCount[qId].totalAttempts += 1;
              }
            });
          }
        });
      }
    });

    return Object.values(questionMissCount)
      .filter((q) => q.missedCount > 0)
      .map((q) => ({
        subjectId: q.subjectId,
        subjectName: q.subjectName,
        question: q.question,
        wrongPercentage: q.totalAttempts > 0 ? Math.round((q.missedCount / q.totalAttempts) * 100) : 100,
        commonWrongOption: 'Common conceptual confusion',
        correctOption: q.correctOption,
        remediationAdvice: q.remediationAdvice,
      }))
      .slice(0, 6);
  }, [liveSubmissions]);

  // Filtered students by class
  const filteredStudents = useMemo(() => {
    if (selectedClass === 'all') return schoolStudents;
    return schoolStudents.filter((s) => s.schoolClass === selectedClass);
  }, [schoolStudents, selectedClass]);

  // Calculations
  const totalCount = filteredStudents.length;
  const schoolAvg = totalCount ? Math.round(filteredStudents.reduce((a, b) => a + b.averagePercentage, 0) / totalCount) : 0;
  const scholarsCount = filteredStudents.filter((s) => s.averagePercentage >= 80).length;
  const airtimeCount = filteredStudents.filter((s) => s.airtimeWon).length;

  const fmtTime = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;

  const exportCsv = () => {
    const header = ['Student Name', 'Class', 'Phone', 'Average %', 'Correct Qs', 'Total Time', 'Airtime Awarded'];
    const rows = filteredStudents.map((s) => [
      s.name,
      s.schoolClass,
      s.phone,
      `${s.averagePercentage}%`,
      `${s.correctCount}/90`,
      fmtTime(s.totalTimeSeconds),
      s.airtimeWon ? 'YES' : 'NO',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `${(school?.name || 'School').replace(/\s+/g, '_')}_Continuous_Assessment_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading || !school) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Mascot size={90} mood="cheer" className="animate-bob" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* School Header Banner */}
      <div className="card card-blue flex flex-col md:flex-row items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4 text-center md:text-left">
          <Mascot size={80} mood="cheer" />
          <div>
            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
              <span className="pill py-0.5 px-2.5 text-xs font-black uppercase" style={{ background: '#fff', color: 'var(--macaw-shadow)' }}>
                {school.code}
              </span>
              <span className="text-xs font-bold text-[var(--wolf)]">
                {school.lga}, {school.state} State
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--eel)] mt-1">{school.name}</h1>
            <p className="text-sm text-[var(--wolf)] font-bold">
              Continuous Assessment Diagnostics & Performance Report
            </p>
          </div>
        </div>

        <button onClick={exportCsv} className="btn btn-outline flex items-center gap-2 text-xs font-black tracking-wider">
          <Download className="w-4 h-4" /> Export CSV Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card text-center p-4">
          <div className="text-xs font-black text-[var(--wolf)] uppercase">Enrolled Students</div>
          <div className="text-3xl font-black text-[var(--macaw)] mt-1">{totalCount}</div>
          <div className="text-xs font-bold text-[var(--hare)] mt-0.5">Attempted this cycle</div>
        </div>
        <div className="card text-center p-4">
          <div className="text-xs font-black text-[var(--wolf)] uppercase">School Average</div>
          <div className="text-3xl font-black mt-1" style={{ color: schoolAvg >= 80 ? 'var(--feather)' : 'var(--fox)' }}>
            {schoolAvg}%
          </div>
          <div className="text-xs font-bold text-[var(--hare)] mt-0.5">Overall average</div>
        </div>
        <div className="card text-center p-4">
          <div className="text-xs font-black text-[var(--wolf)] uppercase">Achievers (≥80%)</div>
          <div className="text-3xl font-black text-[var(--feather)] mt-1">{scholarsCount}</div>
          <div className="text-xs font-bold text-[var(--hare)] mt-0.5">Qualified for scholarships</div>
        </div>
        <div className="card text-center p-4">
          <div className="text-xs font-black text-[var(--wolf)] uppercase">Airtime Winners</div>
          <div className="text-3xl font-black text-[var(--fox)] mt-1">{airtimeCount}</div>
          <div className="text-xs font-bold text-[var(--hare)] mt-0.5">Ranked in national Top 10</div>
        </div>
      </div>

      {/* Controls & Tab Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('roster')}
            className={`btn text-xs !py-2 !px-4 ${activeTab === 'roster' ? 'btn-blue' : 'btn-outline'}`}
          >
            <Users className="w-4 h-4" /> Student Roster ({filteredStudents.length})
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`btn text-xs !py-2 !px-4 ${activeTab === 'diagnostics' ? 'btn-red' : 'btn-outline'}`}
          >
            <AlertCircle className="w-4 h-4" /> Frequently Missed Qs
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`btn text-xs !py-2 !px-4 ${activeTab === 'subjects' ? 'btn-yellow' : 'btn-outline'}`}
          >
            <BarChart3 className="w-4 h-4" /> Subject Breakdown
          </button>
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Filter className="w-4 h-4 text-[var(--wolf)]" />
          <span className="text-xs font-black text-[var(--wolf)] uppercase">Class:</span>
          <select
            className="input !py-1 !px-2.5 !text-xs !w-auto font-black"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="all">All Classes</option>
            <option value="SS 3">SS 3</option>
            <option value="SS 2">SS 2</option>
            <option value="SS 1">SS 1</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Student Roster */}
      {activeTab === 'roster' && (
        <div className="card p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--swan)] bg-[var(--polar)] text-xs font-black text-[var(--wolf)] uppercase">
                  <th className="p-3.5">Student</th>
                  <th className="p-3.5">Class</th>
                  <th className="p-3.5 text-center">Average %</th>
                  <th className="p-3.5 text-center">Score</th>
                  <th className="p-3.5 text-center">Time Spent</th>
                  <th className="p-3.5 text-center">Airtime Award</th>
                  <th className="p-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--swan)] font-bold">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--polar)] transition-colors">
                      <td className="p-3.5">
                        <div className="font-black text-[var(--eel)]">{s.name}</div>
                        <div className="text-xs text-[var(--wolf)]">{s.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="pill text-xs font-bold bg-[var(--polar)] border border-[var(--swan)]">
                          {s.schoolClass}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className="pill text-xs font-black"
                          style={{
                            background: s.averagePercentage >= 80 ? '#d7ffb8' : '#fff5cc',
                            color: s.averagePercentage >= 80 ? 'var(--feather-shadow)' : 'var(--fox-shadow)',
                          }}
                        >
                          {s.averagePercentage}%
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-[var(--eel)]">
                        {s.correctCount} / {s.totalQuestions}
                      </td>
                      <td className="p-3.5 text-center text-[var(--wolf)] font-mono text-xs">
                        {fmtTime(s.totalTimeSeconds)}
                      </td>
                      <td className="p-3.5 text-center">
                        {s.airtimeWon ? (
                          <span className="pill text-xs font-black" style={{ background: '#fff5cc', color: 'var(--fox)' }}>
                            ⚡ ₦1,000 Airtime
                          </span>
                        ) : s.averagePercentage >= 80 ? (
                          <span className="pill text-xs font-bold" style={{ background: '#ddf4ff', color: 'var(--macaw-shadow)' }}>
                            Eligible (80%+)
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--hare)]">—</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedStudent(s)}
                          className="pill text-xs font-black text-[var(--macaw)] hover:bg-[var(--polar)] cursor-pointer"
                        >
                          View Breakdown →
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[var(--wolf)] font-bold">
                      No student submissions recorded for {school.name} yet. Submissions will appear live as students take their continuous assessments.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Frequently Missed Questions */}
      {activeTab === 'diagnostics' && (
        <div className="flex flex-col gap-4">
          <div className="card card-yellow flex items-center gap-3 p-4">
            <Lightbulb className="w-5 h-5 text-[var(--fox)] flex-shrink-0" />
            <div className="text-sm font-bold text-[var(--eel)]">
              <b>Teacher Remediation Insights:</b> Real-time curriculum diagnostics generated from student mistakes.
            </div>
          </div>

          {missedQuestions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missedQuestions.map((q, idx) => (
                <div key={idx} className="card p-5 flex flex-col justify-between gap-3 border-l-4" style={{ borderLeftColor: 'var(--cardinal)' }}>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="pill text-xs font-black bg-[var(--polar)] text-[var(--eel)] border border-[var(--swan)]">
                        {q.subjectName}
                      </span>
                      <span className="pill text-xs font-black" style={{ background: '#ffdfe0', color: 'var(--cardinal-shadow)' }}>
                        {q.wrongPercentage}% Failed
                      </span>
                    </div>

                    <h3 className="font-black text-base text-[var(--eel)] mt-2">{q.question}</h3>

                    <div className="mt-3 space-y-1.5 text-xs font-bold">
                      <div className="flex items-start gap-1.5 text-[var(--cardinal)]">
                        <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span><b>Common Mistake:</b> {q.commonWrongOption}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-[var(--feather-shadow)]">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span><b>Correct Answer:</b> {q.correctOption}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--polar)] text-xs text-[var(--wolf)] border border-[var(--swan)]">
                    <span className="font-black text-[var(--eel)]">Remediation Tip:</span> {q.remediationAdvice}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-[var(--wolf)]">
              <h3 className="text-lg font-black text-[var(--eel)] mb-1">No Diagnostic Data Yet</h3>
              <p className="text-sm font-bold max-w-md mx-auto">
                No error patterns recorded for your school yet. Once students submit assessments, common problem topics and teaching tips will automatically appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Subject Breakdown */}
      {activeTab === 'subjects' && (
        liveSubjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {liveSubjects.map((sub: any) => {
              // Calculate actual school average in this subject from live submissions
              const subjectScores = schoolStudents
                .map((s) => s.subjectScores[sub.id])
                .filter((val): val is number => typeof val === 'number');
              const avg = subjectScores.length > 0 ? Math.round(subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length) : 0;
              const isHigh = avg >= 80;
              return (
                <div key={sub.id} className="card p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black text-[var(--wolf)] uppercase">{sub.shortCode || sub.id}</div>
                    <span
                      className="pill text-xs font-black"
                      style={{
                        background: avg === 0 ? 'var(--polar)' : isHigh ? '#d7ffb8' : '#fff5cc',
                        color: avg === 0 ? 'var(--wolf)' : isHigh ? 'var(--feather-shadow)' : 'var(--fox-shadow)',
                      }}
                    >
                      {avg}%
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-[var(--eel)]">{sub.name}</h4>
                    <p className="text-xs text-[var(--wolf)]">{sub.department || 'Curriculum Subject'}</p>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${avg}%`, background: isHigh ? 'var(--feather)' : 'var(--fox)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card p-8 text-center text-[var(--wolf)]">
            <h3 className="text-lg font-black text-[var(--eel)] mb-1">No Active Curriculum Subjects</h3>
            <p className="text-sm font-bold max-w-md mx-auto">
              Curriculum subjects have not been published yet. Once subjects are active, performance metrics will appear here.
            </p>
          </div>
        )
      )}

      {/* Student Breakdown Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black">{selectedStudent.name}</h3>
                <p className="text-xs text-[var(--wolf)] font-bold">
                  {selectedStudent.schoolClass} • {selectedStudent.phone} • Finished in {fmtTime(selectedStudent.totalTimeSeconds)}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="pill py-1 px-3 text-xs font-black cursor-pointer hover:bg-[var(--polar)] border border-[var(--swan)]"
              >
                ✕ Close
              </button>
            </div>

            <div className="card card-green text-center p-3">
              <div className="text-xs font-black uppercase text-[var(--feather-shadow)]">Overall 9-Subject Average</div>
              <div className="text-3xl font-black text-[var(--feather-shadow)]">{selectedStudent.averagePercentage}%</div>
              <div className="text-xs font-bold text-[var(--feather-shadow)]">
                {selectedStudent.correctCount} of {selectedStudent.totalQuestions} questions correct
              </div>
            </div>

            <h4 className="text-sm font-black uppercase text-[var(--wolf)]">Per-Subject Scores</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(selectedStudent.subjectScores).map(([subId, score]) => (
                <div key={subId} className="p-2.5 rounded-xl border border-[var(--swan)] bg-[var(--polar)] flex justify-between items-center text-xs">
                  <span className="font-bold uppercase text-[var(--eel)]">{subId}</span>
                  <span className="font-black" style={{ color: score >= 80 ? 'var(--feather-shadow)' : 'var(--fox-shadow)' }}>
                    {score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
