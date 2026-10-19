'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SubmissionResult } from '@/types';
import confetti from 'canvas-confetti';
import { 
  Award, 
  Zap, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  Dna, 
  Share2, 
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';

export default function AssessmentResultPage() {
  const router = useRouter();
  const routeParams = useParams();
  const assessmentId = (routeParams?.id as string) || '';
  const { student, refreshStudentProfile } = useAuth();

  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const cached = sessionStorage.getItem(`bioair_result_${assessmentId}`);
    if (cached) {
      try {
        const parsed: SubmissionResult = JSON.parse(cached);
        setResult(parsed);

        if (parsed.airtimeAwarded) {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#059669', '#10b981', '#f59e0b', '#3b82f6'],
          });
        }
      } catch (e) {
        console.error('Failed to parse result:', e);
      }
    }
  }, [assessmentId]);

  if (!result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center">
          <HelpCircle className="w-6 h-6 text-slate-400" />
        </div>
        <h2 className="text-xl font-black text-slate-900">No Result Found</h2>
        <p className="text-sm text-slate-500">
          We could not locate this assessment attempt. Please return to your student dashboard.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const explanations = result.explanations || {};
  const questionIds = Object.keys(explanations);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full space-y-8">
      
      {/* Top Banner Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <span className="text-xs text-slate-500 font-medium">
          Attempt Completed on {new Date(result.submittedAt).toLocaleDateString()}
        </span>
      </div>

      {/* Main Score & Grade Hero Card (LexieLingua Style) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden shadow-lg">
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 mx-auto flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Award className="w-8 h-8 text-white" />
          </div>

          <div>
            <span className="text-xs uppercase font-extrabold text-emerald-700 tracking-wider">
              {result.assessmentTitle}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              Assessment Results
            </h1>
          </div>

          {/* Big Score Dial */}
          <div className="py-2">
            <div className="inline-flex flex-col items-center justify-center w-36 h-36 rounded-full border-4 border-emerald-500 bg-emerald-50 shadow-md">
              <span className="text-4xl font-black text-emerald-900 tracking-tight">
                {result.scorePercent}%
              </span>
              <span className="text-xs font-bold text-emerald-700 mt-0.5">
                {result.correctCount} / {result.totalQuestions} Correct
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm border border-emerald-200">
              +{result.caPointsEarned} Continuous Assessment Marks
            </span>
            <span className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm">
              Tab Switches: {result.tabSwitchesCount}
            </span>
          </div>
        </div>
      </div>

      {/* Airtime Status Card */}
      {result.airtimeAwarded ? (
        <div className="bg-gradient-to-r from-amber-50 via-white to-emerald-50 border-2 border-amber-300 rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0">
              <Zap className="w-8 h-8 text-amber-600" />
            </div>
            <div className="space-y-1 text-center sm:text-left flex-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold uppercase tracking-wider inline-block">
                🎉 Airtime Reward Credited!
              </span>
              <h2 className="text-2xl font-black text-slate-900">
                ₦{result.airtimeAmountNgn} Airtime Dispatched
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Credited to <strong className="text-emerald-700">{result.phone}</strong>
                {(result.airtimeTxId || result.reloadlyTxId) && (
                  <span className="block sm:inline sm:ml-2 font-mono text-slate-500 text-xs">
                    (Ref: {result.airtimeTxId || result.reloadlyTxId})
                  </span>
                )}
              </p>
              <p className="text-[11px] text-amber-800 font-medium pt-1">
                {result.airtimeMessage}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="px-4 py-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-extrabold flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Confirmed</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex items-center space-x-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-slate-500" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm text-slate-600">
            <h3 className="font-extrabold text-slate-900 text-base">Airtime Reward Status: Below 80% Threshold</h3>
            <p className="text-slate-500">
              {result.airtimeMessage || 'You needed 80% or higher to qualify for the weekend airtime gift. Your score has still been recorded toward your CA grade! Keep practicing!'}
            </p>
          </div>
        </div>
      )}

      {/* Question by Question Review & Biology Explanations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 flex items-center space-x-2">
            <Dna className="w-5 h-5 text-emerald-600" />
            <span>Biology Learning Review & Explanations</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {questionIds.length} Questions Graded
          </span>
        </div>

        <div className="space-y-4">
          {questionIds.map((qId, index) => {
            const exp = explanations[qId];
            if (!exp) return null;

            return (
              <div
                key={qId}
                className={`p-5 rounded-3xl border transition-all ${
                  exp.isCorrect
                    ? 'bg-white border-emerald-200 shadow-sm'
                    : 'bg-white border-rose-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-800">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Question {index + 1}
                    </span>
                  </div>

                  {exp.isCorrect ? (
                    <span className="inline-flex items-center space-x-1 text-emerald-700 text-xs font-black">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Correct (+1 pt)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-rose-700 text-xs font-black">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Incorrect</span>
                    </span>
                  )}
                </div>

                {/* Selected vs Correct Choice */}
                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Your Selection</span>
                    <span className={`font-black text-sm ${exp.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                      Option {exp.selected || 'Unanswered'}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 block text-[10px] uppercase font-bold">Correct Answer</span>
                    <span className="font-black text-sm text-emerald-800">
                      Option {exp.correct}
                    </span>
                  </div>
                </div>

                {/* Biological Explanation */}
                <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-emerald-700 block">Biological Principle:</span>
                  <p className="leading-relaxed">{exp.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="pt-4 text-center">
        <button
          onClick={async () => {
            if (refreshStudentProfile) {
              await refreshStudentProfile();
            }
            router.push('/dashboard');
          }}
          className="py-3 px-8 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/30 cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>

    </div>
  );
}
