'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTeacherAuth } from '@/lib/teacher-auth-context';
import { Mascot } from '@/components/Mascot';
import {
  PenTool,
  CheckCircle2,
  Clock,
  Sparkles,
  PlusCircle,
  FileText,
  Upload,
  AlertCircle,
  Layers,
  Trash2,
  Plus,
} from 'lucide-react';

interface ContributedQuestion {
  id: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  classLevel: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  status: 'approved' | 'pending' | 'revision';
  submittedAt: string;
}

interface BatchItem {
  question: string;
  topic: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { teacher, isLoading } = useTeacherAuth();

  const [activeTab, setActiveTab] = useState<'batch' | 'author' | 'ledger' | 'bulk'>('batch');

  // Authoring Form State
  const [subjectId, setSubjectId] = useState(teacher?.primarySubject || 'Mathematics');
  const [topic, setTopic] = useState('');
  const [classLevel, setClassLevel] = useState('SS 3');
  const [questionText, setQuestionText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctOption, setCorrectOption] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [explanation, setExplanation] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Batch 10-Question Studio State
  const [batchItems, setBatchItems] = useState<BatchItem[]>([
    { question: '', topic: '', optA: '', optB: '', optC: '', optD: '', correctOption: 'A', explanation: '' },
  ]);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);

  // Bulk Upload State
  const [bulkJson, setBulkJson] = useState('');
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);

  // Live question list from Firestore
  const [questions, setQuestions] = useState<ContributedQuestion[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch live contributions and subjects from Firestore
  useEffect(() => {
    if (!isLoading && !teacher) {
      router.push('/');
      return;
    }

    if (teacher) {
      fetch(`/api/contributions?authorId=${encodeURIComponent(teacher.id)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.contributions && Array.isArray(data.contributions)) {
            setQuestions(data.contributions);
          }
        })
        .catch((err) => console.warn('Note loading live contributions:', err));

      fetch('/api/subjects')
        .then((res) => res.json())
        .then((d) => {
          if (d.success && Array.isArray(d.subjects) && d.subjects.length > 0) {
            setAvailableSubjects(d.subjects);
            if (!subjectId || subjectId === 'math') {
              setSubjectId(d.subjects[0].name);
            }
          }
        })
        .catch((err) => console.warn('Note loading subjects:', err));
    }
  }, [isLoading, teacher, router, subjectId]);

  const handlePreloadTen = () => {
    const ten: BatchItem[] = Array.from({ length: 10 }, () => ({
      question: '',
      topic: topic || '',
      optA: '',
      optB: '',
      optC: '',
      optD: '',
      correctOption: 'A',
      explanation: '',
    }));
    setBatchItems(ten);
  };

  const handleAddBatchItem = () => {
    setBatchItems((prev) => [
      ...prev,
      { question: '', topic: topic || '', optA: '', optB: '', optC: '', optD: '', correctOption: 'A', explanation: '' },
    ]);
  };

  const handleRemoveBatchItem = (index: number) => {
    if (batchItems.length <= 1) return;
    setBatchItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateBatchItem = (index: number, field: keyof BatchItem, value: string) => {
    setBatchItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = batchItems.filter(
      (b) => b.question.trim() && b.optA.trim() && b.optB.trim() && b.optC.trim() && b.optD.trim()
    );

    if (validItems.length === 0) {
      alert('Please fill out at least 1 complete question with question prompt and all 4 options.');
      return;
    }

    setIsSubmitting(true);
    const sub = availableSubjects.find((s) => s.id === subjectId || s.name === subjectId);
    const formatted = validItems.map((item) => ({
      authorId: teacher?.id || 'tch-educator',
      authorName: teacher?.name || 'Volunteer Educator',
      authorPhone: teacher?.phone || '',
      authorAffiliation: teacher?.affiliation || 'Educator',
      subjectId,
      subjectName: sub ? sub.name : (subjectId || 'Subject'),
      topic: item.topic || topic || 'General Topic',
      classLevel,
      question: item.question,
      options: { A: item.optA, B: item.optB, C: item.optC, D: item.optD },
      correctOption: item.correctOption,
      explanation: item.explanation || 'Step-by-step curriculum explanation provided by educator.',
      status: 'pending',
    }));

    try {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formatted),
      });
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        setQuestions((prev) => [...data.results, ...prev]);
        setSuccessMsg(`✅ Batch of ${data.results.length} questions submitted to IT Unit for verification!`);
      } else {
        setSuccessMsg(`✅ Batch of ${formatted.length} questions submitted for verification!`);
      }
      setBatchItems([{ question: '', topic: '', optA: '', optB: '', optC: '', optD: '', correctOption: 'A', explanation: '' }]);
      setActiveTab('ledger');
    } catch (err) {
      console.error('Error submitting question batch:', err);
      alert('Failed to submit questions. Please try again.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText || !optA || !optB || !optC || !optD || !explanation) {
      alert('Please fill out all fields including the explanation.');
      return;
    }

    setIsSubmitting(true);
    const sub = availableSubjects.find((s) => s.id === subjectId || s.name === subjectId);
    const payload = {
      authorId: teacher?.id || 'tch-educator',
      authorName: teacher?.name || 'Volunteer Educator',
      authorPhone: teacher?.phone || '',
      authorAffiliation: teacher?.affiliation || 'Educator',
      subjectId,
      subjectName: sub ? sub.name : (subjectId || 'Subject'),
      topic: topic || 'General Curriculum',
      classLevel,
      question: questionText,
      options: { A: optA, B: optB, C: optC, D: optD },
      correctOption,
      explanation,
      status: 'pending',
    };

    try {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success && data.contributions?.[0]) {
        setQuestions((prev) => [data.contributions[0], ...prev]);
        setSuccessMsg('✅ Question successfully submitted for review!');
      } else {
        // Fallback optimistic UI
        const newQ: ContributedQuestion = {
          id: `q-tch-${Date.now().toString().slice(-4)}`,
          ...payload,
          status: 'pending',
          submittedAt: 'Just now',
        };
        setQuestions((prev) => [newQ, ...prev]);
        setSuccessMsg('Question submitted for verification!');
      }

      // Reset fields
      setQuestionText('');
      setOptA('');
      setOptB('');
      setOptC('');
      setOptD('');
      setExplanation('');
      setTopic('');
    } catch (err) {
      console.error('Error submitting question to Firestore:', err);
      alert('Failed to save question to server. Please try again.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleBulkUpload = async () => {
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error('Root must be an array of questions');
      
      setIsSubmitting(true);
      const formatted = parsed.map((item, i) => ({
        authorId: teacher?.id || 'tch-educator',
        authorName: teacher?.name || 'Volunteer Educator',
        authorPhone: teacher?.phone || '',
        authorAffiliation: teacher?.affiliation || 'Educator',
        subjectId: item.subjectId || subjectId,
        subjectName: item.subjectName || 'Curriculum',
        topic: item.topic || 'Batch Topic',
        classLevel: item.classLevel || 'SS 3',
        question: item.question,
        options: item.options,
        correctOption: item.correctOption || 'A',
        explanation: item.explanation || 'Detailed explanation provided.',
        status: 'pending',
      }));

      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formatted),
      });
      const data = await res.json();

      if (data.success && data.contributions) {
        setQuestions((prev) => [...data.contributions, ...prev]);
        setBulkStatus(`✅ Successfully uploaded ${data.count} questions!`);
      } else {
        setBulkStatus(`Uploaded ${formatted.length} questions locally.`);
      }
      setBulkJson('');
    } catch (e: any) {
      setBulkStatus('Invalid JSON format or upload error: ' + (e?.message || 'Check syntax.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !teacher) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Mascot size={90} className="animate-bob" />
      </div>
    );
  }

  const approvedCount = questions.filter((q) => q.status === 'approved').length;
  const pendingCount = questions.filter((q) => q.status === 'pending').length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Top Banner */}
      <div className="card card-green flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <Mascot size={80} mood="happy" />
          <div>
            <div className="text-xs font-bold text-[var(--wolf)]">{teacher.affiliation}</div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--feather-shadow)] mt-1">
              Welcome, {teacher.name}!
            </h1>
            <p className="text-xs sm:text-sm text-[var(--wolf)] font-bold">
              Your questions power continuous assessments across schools nationwide.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('batch')}
            className={`btn text-xs font-black !py-2.5 !px-4 ${activeTab === 'batch' ? 'btn-blue' : 'btn-outline'}`}
          >
            <Sparkles className="w-4 h-4" /> Batch Studio
          </button>
          <button
            onClick={() => setActiveTab('author')}
            className={`btn text-xs font-black !py-2.5 !px-4 ${activeTab === 'author' ? 'btn-blue' : 'btn-outline'}`}
          >
            <PlusCircle className="w-4 h-4" /> Single Question
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`btn text-xs font-black !py-2.5 !px-4 ${activeTab === 'ledger' ? 'btn-blue' : 'btn-outline'}`}
          >
            <Layers className="w-4 h-4" /> My Submissions ({questions.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card text-center p-4">
          <div className="text-xs font-black text-[var(--wolf)] uppercase">Total Contributed</div>
          <div className="text-3xl font-black text-[var(--macaw)] mt-1">{questions.length}</div>
          <div className="text-xs font-bold text-[var(--hare)] mt-0.5">Author submissions</div>
        </div>
        <div className="card text-center p-4">
          <div className="text-xs font-black text-[var(--wolf)] uppercase">Approved</div>
          <div className="text-3xl font-black text-[var(--feather)] mt-1">{approvedCount}</div>
          <div className="text-xs font-bold text-[var(--hare)] mt-0.5">Active in assessments</div>
        </div>
        <div className="card text-center p-4">
          <div className="text-xs font-black text-[var(--wolf)] uppercase">Under Review</div>
          <div className="text-3xl font-black text-[var(--fox)] mt-1">{pendingCount}</div>
          <div className="text-xs font-bold text-[var(--hare)] mt-0.5">Pending curation</div>
        </div>
      </div>

      {/* Tab 0: Batch 10-Question Authoring Studio */}
      {activeTab === 'batch' && (
        <div className="card p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--swan)]">
            <div>
              <h2 className="text-xl font-black text-[var(--eel)]">Multi-Question Batch Studio</h2>
              <p className="text-xs text-[var(--wolf)] mt-0.5">
                Author curriculum-aligned 4-option objective questions with step-by-step explanations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreloadTen}
                className="btn btn-outline text-xs font-black flex items-center gap-1.5"
                title="Populate 10 question slots ready for authoring"
              >
                <Sparkles className="w-4 h-4 text-[var(--macaw)]" /> Prefill 10 Question Cards
              </button>
              <button
                type="button"
                onClick={handleAddBatchItem}
                className="btn btn-blue text-xs font-black flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Card
              </button>
            </div>
          </div>

          {successMsg && (
            <div className="card card-green text-sm p-4 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[var(--feather-shadow)]" /> {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmitBatch} className="space-y-6">
            {/* Global Batch Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[var(--polar)] rounded-2xl border border-[var(--swan)]">
              <div>
                <label className="label">Subject</label>
                {availableSubjects.length > 0 ? (
                  <select
                    className="input font-bold"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                  >
                    {availableSubjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.shortCode})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input font-bold"
                    placeholder="e.g. Mathematics"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                  />
                )}
              </div>

              <div>
                <label className="label">Class Level</label>
                <select
                  className="input font-bold"
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                >
                  <option value="SS 3">Senior Secondary 3 (SS 3)</option>
                  <option value="SS 2">Senior Secondary 2 (SS 2)</option>
                  <option value="SS 1">Senior Secondary 1 (SS 1)</option>
                </select>
              </div>

              <div>
                <label className="label">Batch Topic / Module</label>
                <input
                  type="text"
                  className="input font-medium"
                  placeholder="e.g. Sequences & Series (A.P & G.P)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
            </div>

            {/* List of Question Cards */}
            <div className="space-y-4">
              {batchItems.map((item, idx) => (
                <div key={idx} className="p-5 border-2 border-[var(--swan)] rounded-2xl bg-white space-y-3 relative hover:border-[var(--macaw)] transition-colors">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--swan)]">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-[var(--polar)] border border-[var(--swan)] flex items-center justify-center font-black text-xs text-[var(--eel)]">
                        {idx + 1}
                      </span>
                      <span className="font-black text-sm text-[var(--eel)]">Question {idx + 1}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Specific Topic (optional)"
                        className="input !py-1 !px-2 text-xs w-44 font-medium"
                        value={item.topic}
                        onChange={(e) => handleUpdateBatchItem(idx, 'topic', e.target.value)}
                      />
                      {batchItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBatchItem(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove question card"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="label !mb-1 text-xs">Question Stem / Prompt *</label>
                    <textarea
                      required
                      rows={2}
                      className="input font-medium text-sm"
                      placeholder={`Type question prompt #${idx + 1}...`}
                      value={item.question}
                      onChange={(e) => handleUpdateBatchItem(idx, 'question', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                      const val = optKey === 'A' ? item.optA : optKey === 'B' ? item.optB : optKey === 'C' ? item.optC : item.optD;
                      const field = optKey === 'A' ? 'optA' : optKey === 'B' ? 'optB' : optKey === 'C' ? 'optC' : 'optD';
                      return (
                        <div key={optKey}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="label !mb-0 text-xs">Option {optKey}</label>
                            <label className="text-xs font-black cursor-pointer text-[var(--macaw)] flex items-center gap-1">
                              <input
                                type="radio"
                                name={`correct-${idx}`}
                                checked={item.correctOption === optKey}
                                onChange={() => handleUpdateBatchItem(idx, 'correctOption', optKey)}
                              />
                              Correct
                            </label>
                          </div>
                          <input
                            type="text"
                            required
                            className="input text-xs"
                            placeholder={`Option ${optKey} text`}
                            value={val}
                            onChange={(e) => handleUpdateBatchItem(idx, field, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <label className="label !mb-1 text-xs">Pedagogical Explanation & Remediation Guide *</label>
                    <input
                      type="text"
                      className="input text-xs"
                      placeholder="Walk student step-by-step through solving this question..."
                      value={item.explanation}
                      onChange={(e) => handleUpdateBatchItem(idx, 'explanation', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Form Actions */}
            <div className="flex items-center justify-end pt-4 border-t border-[var(--swan)]">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-blue font-black text-sm w-full sm:w-auto flex items-center justify-center gap-2 px-8"
              >
                {isSubmitting ? (
                  'Submitting Questions...'
                ) : (
                  <>Submit {batchItems.length} Question{batchItems.length > 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 1: Single Question Authoring Studio */}
      {activeTab === 'author' && (
        <div className="card p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-black text-[var(--eel)]">Curriculum Question Studio</h2>
            <p className="text-xs text-[var(--wolf)] mt-0.5">
              Standard 4-option multiple-choice objective questions with detailed answer explanations.
            </p>
          </div>

          {successMsg && (
            <div className="card card-green text-sm mb-4 animate-pop flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[var(--feather-shadow)]" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitQuestion} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Subject</label>
                {availableSubjects.length > 0 ? (
                  <select
                    className="input font-bold"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                  >
                    {availableSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.shortCode || s.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input font-bold"
                    placeholder="e.g. Mathematics"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                  />
                )}
              </div>

              <div>
                <label className="label">Topic / Curriculum Area</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Quadratic Equations"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Class Level</label>
                <select
                  className="input font-bold"
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                >
                  <option value="SS 3">Senior Secondary 3 (SS 3)</option>
                  <option value="SS 2">Senior Secondary 2 (SS 2)</option>
                  <option value="SS 1">Senior Secondary 1 (SS 1)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Question Stem / Prompt</label>
              <textarea
                required
                rows={3}
                className="input font-medium"
                placeholder="Type the full question prompt clearly..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label !mb-0">Option A</label>
                  <label className="text-xs font-black cursor-pointer text-[var(--macaw)] flex items-center gap-1">
                    <input
                      type="radio"
                      name="correct"
                      checked={correctOption === 'A'}
                      onChange={() => setCorrectOption('A')}
                    />
                    Correct
                  </label>
                </div>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Option A content"
                  value={optA}
                  onChange={(e) => setOptA(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label !mb-0">Option B</label>
                  <label className="text-xs font-black cursor-pointer text-[var(--macaw)] flex items-center gap-1">
                    <input
                      type="radio"
                      name="correct"
                      checked={correctOption === 'B'}
                      onChange={() => setCorrectOption('B')}
                    />
                    Correct
                  </label>
                </div>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Option B content"
                  value={optB}
                  onChange={(e) => setOptB(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label !mb-0">Option C</label>
                  <label className="text-xs font-black cursor-pointer text-[var(--macaw)] flex items-center gap-1">
                    <input
                      type="radio"
                      name="correct"
                      checked={correctOption === 'C'}
                      onChange={() => setCorrectOption('C')}
                    />
                    Correct
                  </label>
                </div>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Option C content"
                  value={optC}
                  onChange={(e) => setOptC(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label !mb-0">Option D</label>
                  <label className="text-xs font-black cursor-pointer text-[var(--macaw)] flex items-center gap-1">
                    <input
                      type="radio"
                      name="correct"
                      checked={correctOption === 'D'}
                      onChange={() => setCorrectOption('D')}
                    />
                    Correct
                  </label>
                </div>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Option D content"
                  value={optD}
                  onChange={(e) => setOptD(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">
                  Pedagogical Explanation & Remediation Guide <span className="text-[var(--cardinal)]">*</span>
                </label>
                <span className="text-xs font-bold text-[var(--wolf)]">
                  Critical for students who answer wrongly
                </span>
              </div>
              <textarea
                required
                rows={3}
                className="input font-medium"
                placeholder="Walk the student step-by-step through solving this question, explaining common misconceptions..."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-blue btn-block mt-2">
              Submit Question for IT Unit Verification
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Question Submissions Ledger */}
      {activeTab === 'ledger' && (
        <div className="card p-0 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[var(--swan)] bg-[var(--polar)] flex items-center justify-between">
            <h3 className="font-black text-base text-[var(--eel)]">Your Question Contributions</h3>
            <span className="text-xs text-[var(--wolf)] font-bold">{questions.length} total questions logged</span>
          </div>

          {questions.length === 0 ? (
            <div className="p-12 text-center text-[var(--wolf)]">
              <p className="font-bold text-sm">No question contributions found.</p>
              <p className="text-xs mt-1">Submit your first question via the "Author Single Question" tab or import in bulk.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--swan)]">
              {questions.map((q) => (
                <div key={q.id} className="p-4 flex flex-col sm:flex-row items-start justify-between gap-3 hover:bg-[var(--polar)] transition-colors">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="pill text-xs font-black bg-[var(--polar)] border border-[var(--swan)]">
                        {q.subjectName}
                      </span>
                      <span className="text-xs font-bold text-[var(--wolf)]">
                        {q.topic} • {q.classLevel}
                      </span>
                      <span className="text-xs text-[var(--hare)]">{q.submittedAt}</span>
                    </div>

                    <p className="font-bold text-sm text-[var(--eel)]">{q.question}</p>

                    <div className="text-xs text-[var(--wolf)]">
                      <b>Correct Option:</b> <span className="font-black text-[var(--feather-shadow)]">{q.correctOption}</span> — {q.options[q.correctOption]}
                    </div>

                    <div className="text-xs text-[var(--wolf)] bg-white p-2 rounded-lg border border-[var(--swan)]">
                      <b>Explanation:</b> {q.explanation}
                    </div>
                  </div>

                  <div className="self-end sm:self-center flex-shrink-0">
                    {q.status === 'approved' ? (
                      <span className="pill text-xs font-black" style={{ background: '#d7ffb8', color: 'var(--feather-shadow)' }}>
                        ✓ Live in Week 42
                      </span>
                    ) : (
                      <span className="pill text-xs font-black" style={{ background: '#fff5cc', color: 'var(--fox)' }}>
                        ⏳ Pending IT Review
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Bulk JSON Upload */}
      {activeTab === 'bulk' && (
        <div className="card p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-xl font-black">Bulk JSON Question Importer</h3>
            <p className="text-xs text-[var(--wolf)]">
              Paste an array of questions conforming to the ABC Nigeria authoring schema.
            </p>
          </div>

          {bulkStatus && (
            <div className="card card-blue text-sm p-3 font-bold">
              {bulkStatus}
            </div>
          )}

          <textarea
            rows={8}
            className="input font-mono text-xs"
            placeholder={`[\n  {\n    "subjectId": "math",\n    "topic": "Matrices",\n    "classLevel": "SS 3",\n    "question": "What is the determinant of [[2, 3], [1, 4]]?",\n    "options": { "A": "5", "B": "8", "C": "11", "D": "-5" },\n    "correctOption": "A",\n    "explanation": "Det = (2*4) - (3*1) = 8 - 3 = 5."\n  }\n]`}
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
          />

          <button onClick={handleBulkUpload} className="btn btn-block btn-blue">
            Upload Question Batch
          </button>
        </div>
      )}
    </div>
  );
}
