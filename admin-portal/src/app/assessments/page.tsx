'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { AssessmentForm } from '@/types';
import { 
  FileQuestion, 
  PlusCircle, 
  Clock, 
  Zap, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  BookOpen, 
  ArrowRight,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Power
} from 'lucide-react';

export default function AdminAssessmentsPage() {
  const router = useRouter();
  const { isAdminAuthenticated, isLoading } = useAdminAuth();
  const [assessments, setAssessments] = useState<AssessmentForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAdminAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAdminAuthenticated, router]);

  const loadAssessments = async () => {
    try {
      const res = await fetch('/api/assessments').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setAssessments(data.assessments || []);
      }
    } catch (e) {
      console.warn('Failed to load assessments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadAssessments();
    }
  }, [isAdminAuthenticated]);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setTogglingId(id);

    // Optimistic update
    setAssessments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: newStatus } : a))
    );

    try {
      const res = await fetch('/api/assessments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update assessment status');
      }
    } catch (err) {
      console.error('Toggle error:', err);
      alert('Could not update assessment status. Reverting change.');
      // Revert
      setAssessments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: currentStatus } : a))
      );
    } finally {
      setTogglingId(null);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center space-x-2">
            <FileQuestion className="w-7 h-7 text-emerald-600" />
            <span>Assessment Management</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create weekly continuous assessment quizzes, schedule testing windows, and author secure question banks
          </p>
        </div>

        <Link
          href="/assessments/new"
          className="w-full sm:w-auto min-h-[44px] py-3 px-5 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 text-sm flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/30 active:scale-95 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Author New Quiz</span>
        </Link>
      </div>

      {/* Assessment Cards Grid */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600" />
        </div>
      ) : assessments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 shadow-xs max-w-lg mx-auto">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="font-bold text-base text-slate-800">No Assessments Created Yet</h2>
          <p className="text-xs text-slate-500 mt-1">
            Click &quot;Author New Quiz&quot; above to create weekly continuous assessment quizzes across your registered curriculum subjects.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((a) => {
            const isToggling = togglingId === a.id;

            return (
              <div
                key={a.id}
                className={`bg-white border rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:shadow-md transition-all shadow-sm ${
                  a.isActive ? 'border-emerald-200' : 'border-slate-200 opacity-90'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {/* 1-Click Toggle Active Switch */}
                    <button
                      onClick={() => a.id && handleToggleStatus(a.id, a.isActive)}
                      disabled={isToggling}
                      className={`inline-flex items-center space-x-1.5 min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer active:scale-95 ${
                        a.isActive 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                      }`}
                      title="Click to toggle quiz active/closed status"
                    >
                      <Power className={`w-3.5 h-3.5 ${a.isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                      <span>{isToggling ? 'Updating...' : a.isActive ? 'Active (Live)' : 'Closed (Draft)'}</span>
                    </button>

                    <span className="text-xs text-slate-500 font-mono font-medium">
                      {a.subject || 'Curriculum'}
                    </span>
                  </div>

                  <h2 className="text-lg font-black text-slate-900 line-clamp-2">
                    {a.title}
                  </h2>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {a.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-1.5 text-slate-700 font-medium">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{a.durationMinutes} Minutes</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-1.5 text-slate-700 font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                      <span>{a.classLevel || 'Senior Sec'}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      Airtime: <strong>₦{a.rewardConfig?.amountNgn || 200}</strong> (Score &ge;{a.rewardConfig?.minPercentage || 80}%)
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Weekend Window: Sat-Sun
                  </span>

                  <button
                    onClick={() => router.push(`/assessments/new?edit=${a.id}`)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl hover:bg-emerald-50 text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center space-x-1 cursor-pointer active:scale-95 transition-all"
                  >
                    <span>Edit / View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
