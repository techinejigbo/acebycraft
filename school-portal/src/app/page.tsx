'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSchoolAuth } from '@/lib/school-auth-context';
import { Mascot } from '@/components/Mascot';
import { ShieldCheck, GraduationCap, Building2 } from 'lucide-react';

export default function SchoolLoginPage() {
  const router = useRouter();
  const { school, loginWithSchoolCode, registerSchool, availableSchools } = useSchoolAuth();
  
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login state
  const [selectedCode, setSelectedCode] = useState(availableSchools[0]?.code || 'ABC-LAG-001');
  const [passcode, setPasscode] = useState('');
  
  // Registration state
  const [regName, setRegName] = useState('');
  const [regState, setRegState] = useState('Lagos');
  const [regLga, setRegLga] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPasscode, setRegPasscode] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (school) {
      router.push('/dashboard');
    }
  }, [school, router]);

  useEffect(() => {
    if (availableSchools.length > 0 && (!selectedCode || selectedCode === 'ABC-LAG-001')) {
      setSelectedCode(availableSchools[0].code);
    }
  }, [availableSchools, selectedCode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedCode.trim()) {
      setError('Please select or enter your school code.');
      return;
    }

    setSubmitting(true);
    const res = await loginWithSchoolCode(selectedCode, passcode);
    setSubmitting(false);
    if (res.success) {
      router.push('/dashboard');
    } else {
      setError(res.error || 'School code not recognized or invalid passcode.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regName.trim() || !regState.trim() || !regPasscode.trim()) {
      setError('Please fill in school name, state, and create an access passcode.');
      return;
    }

    if (regPasscode.trim().length < 6) {
      setError('Access passcode must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    const res = await registerSchool({
      name: regName,
      state: regState,
      lga: regLga || 'Central',
      contactPerson: regContact,
      contactPhone: regPhone,
      officialEmail: regEmail,
      passcode: regPasscode,
    });
    setSubmitting(false);

    if (res.success && res.school) {
      setSuccessMsg(`Institution Registered! School Code: ${res.school.code}`);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } else {
      setError(res.error || 'Failed to register school. Please check connection.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto text-center gap-5">
      <div className="flex items-center gap-2">
        <span className="brand-logo text-3xl">
          AceByCraft
        </span>
        <span className="pill text-xs font-black" style={{ background: '#ddf4ff', color: 'var(--macaw-shadow)' }}>
          SCHOOL CONSOLE
        </span>
      </div>

      <Mascot size={120} mood={error ? 'sad' : 'cheer'} className="animate-bob" />

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--eel)]">
          {mode === 'login' ? 'Welcome, School Leaders!' : 'Register Your Institution'}
        </h1>
        <p className="text-[var(--wolf)] text-sm">
          {mode === 'login'
            ? 'Track your students’ 9-subject weekly continuous assessments, diagnose weak areas, and celebrate your scholars.'
            : 'Join the AceByCraft national schools league. Get instant analytics on your students’ weekly performance.'}
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex w-full bg-[var(--polar)] p-1 rounded-2xl border-2 border-[var(--swan)]">
        <button
          type="button"
          onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
          className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${
            mode === 'login' ? 'bg-white shadow-sm text-[var(--eel)]' : 'text-[var(--wolf)] hover:text-[var(--eel)]'
          }`}
        >
          School Login
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
          className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${
            mode === 'register' ? 'bg-white shadow-sm text-[var(--macaw)]' : 'text-[var(--wolf)] hover:text-[var(--eel)]'
          }`}
        >
          Register School
        </button>
      </div>

      <div className="card w-full text-left p-5 shadow-sm">
        {error && (
          <div className="card card-red text-sm mb-4 animate-shake" style={{ color: 'var(--cardinal-shadow)' }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div className="card card-green text-sm mb-4 font-bold">
            🎉 {successMsg}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="label">Select your institution</label>
              {availableSchools.length > 0 ? (
                <select
                  className="input text-sm font-bold"
                  value={selectedCode}
                  onChange={(e) => setSelectedCode(e.target.value)}
                >
                  {availableSchools.map((s) => (
                    <option key={s.id} value={s.code}>
                      {s.name} ({s.code} — {s.state})
                    </option>
                  ))}
                </select>
              ) : (
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Enter School Code (e.g. KCL-001)"
                    className="input uppercase font-bold"
                    value={selectedCode}
                    onChange={(e) => setSelectedCode(e.target.value)}
                  />
                  <p className="text-[11px] text-[var(--wolf)] mt-1">
                    No onboarded schools loaded yet. If your school was just registered, type your school code above.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="label">Institutional Access Passcode</label>
              <input
                type="password"
                required
                className="input"
                placeholder="Enter institutional access passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-blue btn-block" disabled={submitting}>
              {submitting ? 'Connecting...' : 'Access School Dashboard'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <div>
              <label className="label">Official School Name</label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g. King's College Lagos"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">State</label>
                <select
                  className="input text-sm"
                  value={regState}
                  onChange={(e) => setRegState(e.target.value)}
                >
                  {['Lagos', 'Abuja FCT', 'Oyo', 'Rivers', 'Kano', 'Kaduna', 'Enugu', 'Edo', 'Delta', 'Ogun', 'Osun', 'Ondo', 'Kwara', 'Anambra', 'Imo', 'Akwa Ibom'].map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">L.G.A.</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Lagos Island"
                  value={regLga}
                  onChange={(e) => setRegLga(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Contact Person</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Principal / Rep"
                  value={regContact}
                  onChange={(e) => setRegContact(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="0803 123 4567"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Create Institutional Access Passcode</label>
              <input
                type="password"
                required
                className="input"
                placeholder="At least 6 characters"
                value={regPasscode}
                onChange={(e) => setRegPasscode(e.target.value)}
              />
              <p className="text-[11px] text-[var(--wolf)] mt-1">
                You will use your generated School Code and this passcode to log in.
              </p>
            </div>

            <button type="submit" className="btn btn-blue btn-block mt-2" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register & Generate School Code'}
            </button>
          </form>
        )}
      </div>

      
    </div>
  );
}
