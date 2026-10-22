'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { MasterSubject } from '@/types';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function SubjectsManagementPage() {
  const router = useRouter();
  const { isAdminAuthenticated, isLoading } = useAdminAuth();
  const [subjects, setSubjects] = useState<MasterSubject[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [category, setCategory] = useState<'core' | 'science' | 'arts' | 'commercial'>('core');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isLoading && !isAdminAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAdminAuthenticated, router]);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      if (data.success) {
        setSubjects(data.subjects || []);
      }
    } catch (e) {
      console.warn('Failed to load subjects:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadSubjects();
    }
  }, [isAdminAuthenticated]);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          shortCode: shortCode.trim() || name.slice(0, 3).toUpperCase(),
          category,
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.subject) {
        setSubjects((prev) => [data.subject, ...prev]);
        setName('');
        setShortCode('');
        setDescription('');
        setShowModal(false);
        setSuccessMsg('Subject created successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError(data.error || 'Failed to create subject');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = async (id: string, subName: string) => {
    if (!confirm(`Are you sure you want to delete "${subName}" from the curriculum?`)) return;

    try {
      const res = await fetch(`/api/subjects?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSubjects((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      alert('Failed to delete subject');
    }
  };

  const handleSeedStandardNine = async () => {
    const STANDARD_9 = [
      { name: 'Mathematics', shortCode: 'MTH', category: 'core', description: 'General Mathematics, Algebra, Geometry, Statistics, Calculus' },
      { name: 'English Language', shortCode: 'ENG', category: 'core', description: 'Comprehension, Lexis, Grammar, Sentence Structure' },
      { name: 'Biology', shortCode: 'BIO', category: 'science', description: 'Cell Biology, Genetics, Physiology, Ecology' },
      { name: 'Chemistry', shortCode: 'CHM', category: 'science', description: 'Stoichiometry, Periodic Table, Organic Chemistry' },
      { name: 'Physics', shortCode: 'PHY', category: 'science', description: 'Mechanics, Electricity, Waves, Optics' },
      { name: 'Civic Education', shortCode: 'CIV', category: 'core', description: 'Democratic Values, Human Rights, Constitution' },
      { name: 'Economics', shortCode: 'ECO', category: 'commercial', description: 'Microeconomics, Macroeconomics, Public Finance' },
      { name: 'Government', shortCode: 'GOV', category: 'arts', description: 'Political Systems, Pre-colonial Administration' },
      { name: 'Literature in English', shortCode: 'LIT', category: 'arts', description: 'African Prose, Drama, Poetry' },
    ];

    if (!confirm('Populate the 9 standard curriculum subjects?')) return;
    setLoading(true);

    try {
      for (const sub of STANDARD_9) {
        await fetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub),
        });
      }
      await loadSubjects();
      setSuccessMsg('Standard curriculum subjects added successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      alert('Error initializing standard subjects');
    } finally {
      setLoading(false);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      
      {/* Breadcrumb & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link href="/dashboard" className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to IT Control Room
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-emerald-600" />
            <span>National Curriculum & Subjects</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and maintain master subject records that drive student onboarding, teacher contributions, and weekly assessments.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={loadSubjects}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh subjects"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="py-2.5 px-4 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Subject</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="card card-green text-sm flex items-center gap-2 p-3 font-bold text-emerald-800 bg-emerald-50 border border-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" /> {successMsg}
        </div>
      )}

      {/* Subject Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 bg-white border border-slate-200 rounded-2xl text-center">
          <div className="text-xs font-black uppercase text-slate-400">Total Subjects</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{subjects.length}</div>
        </div>
        <div className="card p-4 bg-white border border-slate-200 rounded-2xl text-center">
          <div className="text-xs font-black uppercase text-slate-400">Core Subjects</div>
          <div className="text-3xl font-black text-emerald-600 mt-1">
            {subjects.filter((s) => s.category === 'core').length}
          </div>
        </div>
        <div className="card p-4 bg-white border border-slate-200 rounded-2xl text-center">
          <div className="text-xs font-black uppercase text-slate-400">Sciences</div>
          <div className="text-3xl font-black text-sky-600 mt-1">
            {subjects.filter((s) => s.category === 'science').length}
          </div>
        </div>
        <div className="card p-4 bg-white border border-slate-200 rounded-2xl text-center">
          <div className="text-xs font-black uppercase text-slate-400">Arts & Commercial</div>
          <div className="text-3xl font-black text-amber-600 mt-1">
            {subjects.filter((s) => s.category === 'arts' || s.category === 'commercial').length}
          </div>
        </div>
      </div>

      {/* Subjects Directory */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="font-bold text-base text-slate-900">Registered Subjects ({subjects.length})</h2>
        </div>

        {subjects.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-base text-slate-800">No curriculum subjects registered yet.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Click &quot;Add New Subject&quot; above to create curriculum subjects, or initialize standard subjects below.
            </p>
            <button
              onClick={handleSeedStandardNine}
              className="mt-4 py-2 px-4 rounded-xl font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Initialize Standard Curriculum</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {subjects.map((s) => (
              <div key={s.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-900">{s.name}</span>
                    <span className="py-0.5 px-2 rounded-lg text-xs font-black uppercase bg-slate-100 text-slate-700 border border-slate-200">
                      {s.shortCode}
                    </span>
                    <span className={`py-0.5 px-2 rounded-lg text-xs font-black uppercase ${
                      s.category === 'core' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      s.category === 'science' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {s.category}
                    </span>
                  </div>
                  {s.description && (
                    <p className="text-xs text-slate-500 max-w-xl">{s.description}</p>
                  )}
                  <div className="text-[10px] text-slate-400">ID: {s.id} • Created: {new Date(s.createdAt).toLocaleDateString()}</div>
                </div>

                <button
                  onClick={() => handleDeleteSubject(s.id, s.name)}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer self-end sm:self-center"
                  title="Delete subject"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Subject Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900">Create New Curriculum Subject</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {error && (
              <div className="card card-red text-xs p-3 font-bold text-rose-700 bg-rose-50 border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSubject} className="space-y-3">
              <div>
                <label className="label">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Further Mathematics"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Short Code (3-4 chars)</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. FTH"
                    className="input uppercase"
                    value={shortCode}
                    onChange={(e) => setShortCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input font-bold"
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                  >
                    <option value="core">Core</option>
                    <option value="science">Science</option>
                    <option value="arts">Arts</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Syllabus Scope & Topics</label>
                <textarea
                  rows={3}
                  className="input text-xs font-medium"
                  placeholder="Describe key topics and curriculum modules..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-blue flex-1"
                >
                  {saving ? 'Saving...' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
