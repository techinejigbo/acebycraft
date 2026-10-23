'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { TeacherContribution, OptionKey } from '@/types';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Check,
  Copy,
  BookOpen,
  User,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export default function ContributionsReviewPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();

  const [contributions, setContributions] = useState<TeacherContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  const loadContributions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contributions');
      if (res.ok) {
        const data = await res.json();
        setContributions(data.contributions || []);
      }
    } catch (err) {
      console.error('Failed to load contributions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadContributions();
    }
  }, [isAuthenticated]);

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    setActionInProgress(id);
    const originalContributions = [...contributions];

    // Optimistic UI update
    setContributions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus, reviewedAt: new Date().toISOString() } : c))
    );

    try {
      const res = await fetch('/api/contributions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }
    } catch (err) {
      console.error('Error updating contribution status:', err);
      alert('Could not update status. Reverting change.');
      setContributions(originalContributions);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCopyQuestionJson = (c: TeacherContribution) => {
    const formatted = {
      question: c.question || c.questionText || '',
      topic: c.topic || 'General Topic',
      options: c.options,
      correctOption: c.correctOption,
      explanation: c.explanation || '',
    };

    navigator.clipboard.writeText(JSON.stringify(formatted, null, 2));
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Distinct subjects for filtering
  const distinctSubjects = useMemo(() => {
    const set = new Set<string>();
    contributions.forEach((c) => {
      const name = c.subjectName || c.subjectKey || c.subjectId;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [contributions]);

  // Filtered list
  const filtered = useMemo(() => {
    return contributions.filter((c) => {
      // Status filter
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;

      // Subject filter
      if (subjectFilter !== 'all') {
        const sName = c.subjectName || c.subjectKey || c.subjectId;
        if (sName !== subjectFilter) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const qText = (c.question || c.questionText || '').toLowerCase();
        const author = (c.authorName || '').toLowerCase();
        const topic = (c.topic || '').toLowerCase();
        const school = (c.authorSchool || c.authorAffiliation || '').toLowerCase();

        return qText.includes(query) || author.includes(query) || topic.includes(query) || school.includes(query);
      }

      return true;
    });
  }, [contributions, statusFilter, subjectFilter, searchTerm]);

  // Aggregate counts
  const totalCount = contributions.length;
  const pendingCount = contributions.filter((c) => c.status === 'pending').length;
  const approvedCount = contributions.filter((c) => c.status === 'approved').length;
  const rejectedCount = contributions.filter((c) => c.status === 'rejected').length;

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center space-x-2">
            <GraduationCap className="w-7 h-7 text-purple-600" />
            <span>Teacher Question Submissions</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review, quality check, and approve curriculum questions contributed by educators
          </p>
        </div>

        <Link
          href="/assessments/new"
          className="py-2.5 px-4 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm flex items-center space-x-2 shadow-md shadow-emerald-600/30 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Publish New Quiz</span>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Submissions</span>
            <Inbox className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalCount}</div>
        </div>

        <div className={`border rounded-2xl p-4 shadow-xs ${pendingCount > 0 ? 'bg-amber-50/60 border-amber-300' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 mt-2">{pendingCount}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-2">{approvedCount}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">{rejectedCount}</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by educator name, school, topic, or question keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
            />
          </div>

          {distinctSubjects.length > 0 && (
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700"
            >
              <option value="all">All Subjects ({distinctSubjects.length})</option>
              {distinctSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-slate-400 uppercase mr-1 shrink-0">Status:</span>
          {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
                {st === 'pending' && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950 text-[10px]">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contributions List */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 shadow-xs max-w-md mx-auto">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="font-bold text-base text-slate-800">No question contributions found</h2>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm || statusFilter !== 'all' || subjectFilter !== 'all'
              ? 'No submissions matched your search filters.'
              : 'Teachers have not submitted any questions yet. Direct your registered teachers to their portal.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((c, idx) => {
            const isProcessing = actionInProgress === c.id;
            const qContent = c.question || c.questionText || '';

            return (
              <div
                key={c.id || idx}
                className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Card Top: Author Info & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 font-black flex items-center justify-center text-sm flex-shrink-0">
                      {c.authorName ? c.authorName.charAt(0).toUpperCase() : 'T'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">{c.authorName || 'Teacher'}</span>
                        <span className="text-xs text-slate-400 font-mono">({c.authorPhone || 'N/A'})</span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {c.authorSchool || c.authorAffiliation || 'Independent Educator'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Subject badge */}
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                      {c.subjectName || c.subjectKey || c.subjectId || 'General'}
                    </span>

                    {/* Topic badge */}
                    {c.topic && (
                      <span className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-xs font-bold text-purple-800">
                        {c.topic}
                      </span>
                    )}

                    {/* Status badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                        c.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : c.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {c.status || 'pending'}
                    </span>
                  </div>
                </div>

                {/* Question Prompt */}
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Question Prompt
                  </div>
                  <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
                    {qContent}
                  </p>
                </div>

                {/* Options Grid */}
                {c.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {(['A', 'B', 'C', 'D'] as OptionKey[]).map((opt) => {
                      const isCorrect = c.correctOption === opt;
                      const optText = c.options[opt] || '';

                      return (
                        <div
                          key={opt}
                          className={`p-3 rounded-2xl border text-xs flex items-center space-x-2.5 ${
                            isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-black flex-shrink-0 text-xs ${
                              isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {opt}
                          </span>
                          <span className="flex-1">{optText || `[Option ${opt} empty]`}</span>
                          {isCorrect && (
                            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5">
                              <Check className="w-3.5 h-3.5" /> Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Explanation */}
                {c.explanation && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                    <span className="font-bold text-slate-900 block">Explanation / Rationale:</span>
                    <p className="text-slate-600 leading-relaxed">{c.explanation}</p>
                  </div>
                )}

                {/* Card Bottom: Metadata and Review Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400">
                    Submitted: {c.submittedAt ? new Date(c.submittedAt).toLocaleString() : 'N/A'}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Copy JSON */}
                    <button
                      type="button"
                      onClick={() => handleCopyQuestionJson(c)}
                      className="flex-1 sm:flex-initial min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center justify-center space-x-1.5 cursor-pointer transition-colors active:scale-95"
                      title="Copy question as JSON to import into a quiz"
                    >
                      {copiedId === c.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-500" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>

                    {/* Approve button */}
                    <button
                      type="button"
                      disabled={isProcessing || c.status === 'approved'}
                      onClick={() => handleUpdateStatus(c.id, 'approved')}
                      className={`flex-1 sm:flex-initial min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-95 ${
                        c.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 opacity-60 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{c.status === 'approved' ? 'Approved' : 'Approve'}</span>
                    </button>

                    {/* Reject button */}
                    <button
                      type="button"
                      disabled={isProcessing || c.status === 'rejected'}
                      onClick={() => handleUpdateStatus(c.id, 'rejected')}
                      className={`flex-1 sm:flex-initial min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-95 ${
                        c.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800 opacity-60 cursor-not-allowed'
                          : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{c.status === 'rejected' ? 'Rejected' : 'Reject'}</span>
                    </button>

                    {/* Reset to Pending if reviewed */}
                    {c.status !== 'pending' && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleUpdateStatus(c.id, 'pending')}
                        className="min-h-[40px] px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-semibold cursor-pointer active:scale-95 transition-colors"
                        title="Reset status back to Pending"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
