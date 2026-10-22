'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { MasterSchool } from '@/types';
import { 
  GraduationCap, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ArrowLeft,
  CheckCircle2,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';

export default function SchoolsManagementPage() {
  const router = useRouter();
  const { isAdminAuthenticated, isLoading } = useAdminAuth();
  const [schools, setSchools] = useState<MasterSchool[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [passcode, setPasscode] = useState('');
  const [state, setState] = useState('Lagos');
  const [lga, setLga] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password visibility map
  const [visiblePasscodes, setVisiblePasscodes] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAdminAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAdminAuthenticated, router]);

  const loadSchools = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/schools');
      const data = await res.json();
      if (data.success) {
        setSchools(data.schools || []);
      }
    } catch (e) {
      console.warn('Failed to load schools:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadSchools();
    }
  }, [isAdminAuthenticated]);

  const handleOnboardSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !passcode.trim()) {
      setError('School Name, Code, and Institutional Passcode are required.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          passcode: passcode.trim(),
          state: state.trim() || 'Lagos',
          lga: lga.trim() || 'General',
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.school) {
        setSchools((prev) => [data.school, ...prev]);
        setName('');
        setCode('');
        setPasscode('');
        setLga('');
        setContactEmail('');
        setContactPhone('');
        setShowModal(false);
        setSuccessMsg(`School "${data.school.name}" successfully onboarded with passcode!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(data.error || 'Failed to onboard school');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchool = async (id: string, schoolName: string) => {
    if (!confirm(`Are you sure you want to remove "${schoolName}" and revoke its portal access?`)) return;

    try {
      const res = await fetch(`/api/schools?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSchools((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      alert('Failed to delete school');
    }
  };

  const togglePasscode = (id: string) => {
    setVisiblePasscodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyCredentials = (school: MasterSchool) => {
    const portalUrl = process.env.NEXT_PUBLIC_SCHOOL_PORTAL_URL || 'http://localhost:3002';
    const credText = `Institution: ${school.name}\nSchool Code: ${school.code}\nPortal Login Passcode: ${school.passcode}\nPortal URL: ${portalUrl}`;
    navigator.clipboard.writeText(credText);
    setCopiedId(school.id);
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
            <GraduationCap className="w-7 h-7 text-sky-600" />
            <span>School Onboarding & Institutional Passcodes</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Provision official secondary institutions, assign access passcodes, and monitor registered schools nationwide.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={loadSchools}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh schools"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="py-2.5 px-4 rounded-2xl font-bold text-white bg-sky-600 hover:bg-sky-700 text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-sky-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard School</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="card card-green text-sm flex items-center gap-2 p-3 font-bold text-emerald-800 bg-emerald-50 border border-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" /> {successMsg}
        </div>
      )}

      {/* Schools Directory */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="font-bold text-base text-slate-900">Onboarded Secondary Schools ({schools.length})</h2>
        </div>

        {schools.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-base text-slate-800">No schools onboarded yet.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Click &quot;Onboard School&quot; to register your first secondary institution and provision their access passcode.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">School Details</th>
                  <th className="p-4">Code</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Access Passcode</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schools.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-black text-slate-900">{s.name}</div>
                      <div className="text-[10px] text-slate-400">ID: {s.id}</div>
                    </td>
                    <td className="p-4">
                      <span className="py-1 px-2.5 rounded-lg text-xs font-black uppercase bg-sky-50 text-sky-700 border border-sky-200">
                        {s.code}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-xs text-slate-700">{s.lga}</div>
                      <div className="text-[11px] text-slate-400">{s.state} State</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <Key className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-black text-slate-800">
                          {visiblePasscodes[s.id] ? s.passcode : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasscode(s.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                          title="Toggle passcode visibility"
                        >
                          {visiblePasscodes[s.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      <div>{s.contactEmail || 'No email registered'}</div>
                      <div className="text-[11px] text-slate-400">{s.contactPhone}</div>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => copyCredentials(s)}
                        className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="Copy Login Credentials"
                      >
                        {copiedId === s.id ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-black"><Check className="w-3 h-3" /> Copied</span>
                        ) : (
                          <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteSchool(s.id, s.name)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Revoke school access"
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

      {/* Onboard School Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900">Onboard New Secondary Institution</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {error && (
              <div className="card card-red text-xs p-3 font-bold text-rose-700 bg-rose-50 border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleOnboardSchool} className="space-y-3">
              <div>
                <label className="label">Institution Official Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. King's College, Lagos"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Unique School Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KCL-001"
                    className="input uppercase font-bold"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Access Passcode *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KC2026"
                    className="input font-mono font-bold"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">State</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lagos"
                    className="input font-bold"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Local Government (LGA)</label>
                  <input
                    type="text"
                    placeholder="e.g. Lagos Island"
                    className="input font-bold"
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Admin Email</label>
                  <input
                    type="email"
                    placeholder="principal@school.edu.ng"
                    className="input text-xs"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Admin Phone</label>
                  <input
                    type="tel"
                    placeholder="0803 123 4567"
                    className="input text-xs"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
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
                  {saving ? 'Onboarding...' : 'Onboard Institution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
