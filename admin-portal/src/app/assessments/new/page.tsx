'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { AssessmentForm, QuestionData, OptionKey } from '@/types';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function NewAssessmentPage() {
  const router = useRouter();
  const { isAdminAuthenticated, isLoading } = useAdminAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('Biology');
  const [classLevel, setClassLevel] = useState('Senior Secondary 3');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [isActive, setIsActive] = useState(true);
  const [isWeekendOnly, setIsWeekendOnly] = useState(true);
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(new Date(Date.now() + 48 * 3600000).toISOString().slice(0, 16));

  const [airtimeEnabled, setAirtimeEnabled] = useState(true);
  const [minPercentage, setMinPercentage] = useState(80);
  const [amountNgn, setAmountNgn] = useState(200);

  const [questions, setQuestions] = useState<QuestionData[]>([
    {
      id: 'q1',
      question: 'Which enzyme is responsible for unwinding the DNA double helix during replication?',
      topic: 'Molecular Genetics',
      options: {
        A: 'DNA Polymerase',
        B: 'Helicase',
        C: 'RNA Primase',
        D: 'Ligase',
      },
      correctOption: 'B',
      explanation: 'DNA Helicase breaks the hydrogen bonds between base pairs to unwind the double helix at the replication fork.',
    },
    {
      id: 'q2',
      question: 'Which organelle contains digestive enzymes that degrade old cellular organelles and foreign pathogens?',
      topic: 'Cell Biology',
      options: {
        A: 'Ribosome',
        B: 'Lysosome',
        C: 'Centriole',
        D: 'Vacuole',
      },
      correctOption: 'B',
      explanation: 'Lysosomes are membrane-bound vesicles filled with hydrolytic enzymes designed for intracellular digestion.',
    },
  ]);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAdminAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAdminAuthenticated, router]);

  const handleAddQuestion = () => {
    const nextId = `q${questions.length + 1}`;
    setQuestions((prev) => [
      ...prev,
      {
        id: nextId,
        question: '',
        topic: 'General Biology',
        options: { A: '', B: '', C: '', D: '' },
        correctOption: 'A',
        explanation: '',
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert('Assessment must contain at least 1 question.');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuestionData, value: unknown) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateOption = (qIndex: number, optKey: OptionKey, value: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex].options = { ...updated[qIndex].options, [optKey]: value };
      return updated;
    });
  };

  const handleBulkImport = () => {
    setBulkError('');
    try {
      const parsed = JSON.parse(bulkInput.trim());
      if (!Array.isArray(parsed)) {
        throw new Error('Imported data must be an array of question objects.');
      }

      const formatted: QuestionData[] = parsed.map((item, idx) => {
        if (!item.question || !item.options || !item.correctOption) {
          throw new Error(`Item #${idx + 1} is missing question, options, or correctOption.`);
        }
        return {
          id: item.id || `q_${Date.now()}_${idx + 1}`,
          question: item.question,
          topic: item.topic || 'General Biology',
          options: {
            A: item.options.A || '',
            B: item.options.B || '',
            C: item.options.C || '',
            D: item.options.D || '',
          },
          correctOption: (item.correctOption as OptionKey) || 'A',
          explanation: item.explanation || '',
        };
      });

      setQuestions((prev) => [...prev, ...formatted]);
      setShowBulkModal(false);
      setBulkInput('');
      alert(`Successfully imported ${formatted.length} biology questions!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON format.';
      setBulkError(msg);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter an assessment title.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: AssessmentForm = {
        title,
        description,
        subject,
        classLevel,
        durationMinutes: Number(durationMinutes),
        isActive,
        isWeekendOnly,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        rewardConfig: {
          airtimeEnabled,
          minPercentage: Number(minPercentage),
          amountNgn: Number(amountNgn),
          currency: 'NGN',
        },
        questions,
      };

      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to save assessment');
      }

      alert('Assessment published! Answer key securely locked down in Firestore.');
      router.push('/assessments');
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving assessment.');
    } finally {
      setIsSaving(false);
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      
      {/* Top Breadcrumb & Save Action */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <Link
          href="/assessments"
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assessments</span>
        </Link>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bulk JSON / CSV Import</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="py-2.5 px-5 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm flex items-center space-x-2 shadow-md shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Publishing...' : 'Save & Lock Answer Key'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Section 1: Assessment Metadata */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 text-sm font-extrabold text-emerald-700">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Assessment Overview & Schedule</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assessment Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekend Biology CA 2: Genetics, Heredity & Variation"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description / Student Instructions
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions for students on curriculum topics covered and timing"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Class</label>
                <input
                  type="text"
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Open Window (Start Date/Time)</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Closing Window (End Date/Time)</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center space-x-6 pt-2">
              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-bold text-slate-900">Active (Students can take this assessment)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWeekendOnly}
                  onChange={(e) => setIsWeekendOnly(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium">Weekend Only Lock (Saturday - Sunday)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Automated Airtime Reward Configuration */}
        <div className="bg-white border border-amber-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 text-sm font-extrabold text-amber-800">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Automated Airtime Incentive Configuration</span>
          </div>

          <div className="flex items-center space-x-3 pb-2">
            <input
              type="checkbox"
              id="enableAirtime"
              checked={airtimeEnabled}
              onChange={(e) => setAirtimeEnabled(e.target.checked)}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="enableAirtime" className="text-xs font-bold text-slate-900 cursor-pointer">
              Enable Automated Airtime Reward for Top Performers
            </label>
          </div>

          {airtimeEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Qualifying Minimum Score (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={minPercentage}
                    onChange={(e) => setMinPercentage(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-500 font-bold">%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Students scoring &ge; {minPercentage}% get credited.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Airtime Gift Amount (NGN)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-500 font-bold">₦</span>
                  <input
                    type="number"
                    min={50}
                    max={2000}
                    step={50}
                    value={amountNgn}
                    onChange={(e) => setAmountNgn(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm text-slate-900 font-bold"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Dispatched directly to the student&apos;s phone upon qualification.</p>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Questions & Secure Answer Keys */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center space-x-2">
                <span>Biology Questions & Answer Keys</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                  {questions.length} Items
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Correct options are stored in the secure <code>/answerKeys</code> Firestore collection and never exposed to the student.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddQuestion}
              className="py-2 px-3.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          </div>

          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <div
                key={q.id || qIndex}
                className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm relative"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
                      {qIndex + 1}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Question {qIndex + 1}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      placeholder="Topic (e.g. Genetics)"
                      value={q.topic}
                      onChange={(e) => updateQuestion(qIndex, 'topic', e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 w-36 font-medium"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Question Prompt</label>
                  <textarea
                    rows={2}
                    required
                    value={q.question}
                    onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                    placeholder="Enter the biology question text here..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['A', 'B', 'C', 'D'] as OptionKey[]).map((opt) => (
                    <div key={opt} className="flex items-center space-x-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-700 flex-shrink-0">
                        {opt}
                      </span>
                      <input
                        type="text"
                        required
                        value={q.options[opt]}
                        onChange={(e) => updateOption(qIndex, opt, e.target.value)}
                        placeholder={`Option ${opt}`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-emerald-800 mb-1">
                      Correct Option Key (Locked Secret)
                    </label>
                    <select
                      value={q.correctOption}
                      onChange={(e) => updateQuestion(qIndex, 'correctOption', e.target.value as OptionKey)}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="A">Option A is Correct</option>
                      <option value="B">Option B is Correct</option>
                      <option value="C">Option C is Correct</option>
                      <option value="D">Option D is Correct</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Explanation (Displayed to student after submission)
                    </label>
                    <input
                      type="text"
                      value={q.explanation}
                      onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                      placeholder="Explain the biological principle..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>

              </div>
            ))}
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleAddQuestion}
              className="py-3 px-6 rounded-2xl border border-dashed border-slate-300 hover:border-emerald-500 text-slate-600 hover:text-emerald-700 text-xs font-bold transition-all inline-flex items-center space-x-2 bg-white cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Question</span>
            </button>
          </div>
        </div>

      </form>

      {/* Bulk JSON/CSV Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <span>Bulk Upload Biology Questions</span>
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900 font-bold"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Paste an array of questions in JSON format. Each object must have <code>question</code>, <code>options</code> (A, B, C, D), and <code>correctOption</code>.
            </p>

            <textarea
              rows={8}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={`[
  {
    "question": "What is the primary site of photosynthesis in eukaryotic plant cells?",
    "topic": "Plant Physiology",
    "options": {
      "A": "Chloroplasts",
      "B": "Centrioles",
      "C": "Lysosomes",
      "D": "Peroxisomes"
    },
    "correctOption": "A",
    "explanation": "Chloroplasts contain chlorophyll and the thylakoid membranes where light reactions take place."
  }
]`}
              className="w-full bg-slate-50 font-mono text-xs border border-slate-200 rounded-xl p-3 text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {bulkError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {bulkError}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                className="px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Validate & Import Questions
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
