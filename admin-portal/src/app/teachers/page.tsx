'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { MasterTeacher, MasterSubject, MasterSchool } from '@/types';
import { 
  Users, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ArrowLeft,
  CheckCircle2,
  Phone,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  PenTool
} from 'lucide-react';

export default function TeachersManagementPage() {
  const router = useRouter();
  const { isAdminAuthenticated, isLoading } = useAdminAuth();
  const [teachers, setTeachers] = useState<MasterTeacher[]>([]);
  const [subjects, setSubjects] = useState<MasterSubject[]>([]);
  const [schools, setSchools] = useState<MasterSchool[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [primarySubject, setPrimarySubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAdminAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAdminAuthenticated, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, sRes, schRes] = await Promise.all([
        fetch('/api/teachers'),
        fetch('/api/subjects'),
        fetch('/api/schools'),
      ]);
      const [tData, sData, schData] = await Promise.all([
        tRes.json(),
        sRes.json(),
        schRes.json(),
      ]);
      if (tData.success) setTeachers(tData.teachers || []);
      if (sData.success) setSubjects(sData.subjects || []);
      if (schData.success) setSchools(schData.schools || []);
    } catch (e) {
      console.warn('Failed to load teachers data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadData();
    }
  }, [isAdminAuthenticated]);

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !pass.trim()) {
      setError('Teacher Name, Phone, and Password are required.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          pass: pass.trim(),
          affiliation: affiliation.trim() || 'Independent Educator',
          primarySubject: primarySubject || (subjects[0]?.name || 'General'),
          status: 'active',
        }),
      });
      const data = await res.json();
      if (data.success && data.teacher) {
        setTeachers((prev) => [data.teacher, ...prev]);
        setName('');
        setPhone('');
        setPass('');
        setAffiliation('');
        setShowModal(false);
        setSuccessMsg(`Educator "${data.teacher.name}" onboarded with login access!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(data.error || 'Failed to onboard teacher');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeacher = async (id: string, teacherName: string) => {
    if (!confirm(`Are you sure you want to remove "${teacherName}"?`)) return;

    try {
      const res = await fetch(`/api/teachers?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTeachers((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      alert('Failed to delete teacher');
    }
  };

  const togglePassword = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyCredentials = (teacher: MasterTeacher) => {
    const studioUrl = process.env.NEXT_PUBLIC_TEACHER_PORTAL_URL || 'https://acebycraft-teacher.vercel.app';
    const credText = `Educator: ${teacher.name}\nUsername / Phone: ${teacher.phone}\nPassword: ${teacher.pass}\nTeacher Studio URL: ${studioUrl}`;
    navigator.clipboard.writeText(credText);
    setCopiedId(teacher.id);
    setTimeout(() => setCopiedId(null), 2500);
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
            <PenTool className="w-7 h-7 text-emerald-600" />
            <span>Volunteer Educators & Authors Management</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Provision teacher logins, verify pedagogical credentials, and coordinate question authors across subjects.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh educators"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="py-2.5 px-4 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Educator</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="card card-green text-sm flex items-center gap-2 p-3 font-bold text-emerald-800 bg-emerald-50 border border-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" /> {successMsg}
        </div>
      )}

      {/* Teachers Directory */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="font-bold text-base text-slate-900">Registered Educators ({teachers.length})</h2>
        </div>

        {teachers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <PenTool className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-base text-slate-800">No educators registered yet.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Click &quot;Onboard Educator&quot; to provision login credentials for teachers who will author assessment questions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Educator Details</th>
                  <th className="p-4">Phone / Username</th>
                  <th className="p-4">Primary Subject</th>
                  <th className="p-4">Affiliation</th>
                  <th className="p-4">Login Password</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-black text-slate-900">{t.name}</div>
                      <div className="text-[10px] text-slate-400">ID: {t.id}</div>
                    </td>
                    <td className="p-4 font-mono text-xs font-bold text-slate-700">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {t.phone}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="py-1 px-2.5 rounded-lg text-xs font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {t.primarySubject}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-700">
                      {t.affiliation}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <Key className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-black text-slate-800">
                          {visiblePasswords[t.id] ? t.pass : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePassword(t.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                          title="Toggle password visibility"
                        >
                          {visiblePasswords[t.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => copyCredentials(t)}
                        className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="Copy Credentials"
                      >
                        {copiedId === t.id ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-black"><Check className="w-3 h-3" /> Copied</span>
                        ) : (
                          <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteTeacher(t.id, t.name)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete teacher"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Onboard Teacher Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900">Onboard Volunteer Educator</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {error && (
              <div className="card card-red text-xs p-3 font-bold text-rose-700 bg-rose-50 border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateTeacher} className="space-y-3">
              <div>
                <label className="label">Full Name & Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Emmanuel Alabi"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone Number (Login username) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0803 123 4567"
                    className="input font-bold"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Initial Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pass1234"
                    className="input font-mono font-bold"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Primary Teaching Subject</label>
                {subjects.length > 0 ? (
                  <select
                    className="input font-bold"
                    value={primarySubject}
                    onChange={(e) => setPrimarySubject(e.target.value)}
                  >
                    <option value="">Select Curriculum Subject...</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.shortCode})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Mathematics"
                    className="input font-bold"
                    value={primarySubject}
                    onChange={(e) => setPrimarySubject(e.target.value)}
                  />
                )}
              </div>

              <div>
                <label className="label">Institution / Affiliation</label>
                {schools.length > 0 ? (
                  <select
                    className="input font-bold"
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                  >
                    <option value="Independent Educator">Independent Educator</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. King's College, Lagos or Independent"
                    className="input font-bold"
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                  />
                )}
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
                  {saving ? 'Onboarding...' : 'Onboard Educator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
