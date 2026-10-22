'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTeacherAuth } from '@/lib/teacher-auth-context';
import { Mascot } from '@/components/Mascot';
import { PenTool, HeartHandshake, ShieldCheck } from 'lucide-react';

export default function TeacherAuthPage() {
  const router = useRouter();
  const { teacher, loginTeacher, registerTeacher } = useTeacherAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [affiliation, setAffiliation] = useState('Independent Educator');
  const [subject, setSubject] = useState('Mathematics');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [availableSchools, setAvailableSchools] = useState<any[]>([]);

  useEffect(() => {
    if (teacher) {
      router.push('/dashboard');
    }
  }, [teacher, router]);

  useEffect(() => {
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((d) => {
        if (d.success && Array.isArray(d.subjects) && d.subjects.length > 0) {
          setAvailableSubjects(d.subjects);
          setSubject(d.subjects[0].name);
        }
      })
      .catch((err) => console.warn('Could not load subjects:', err));

    fetch('/api/schools')
      .then((res) => res.json())
      .then((d) => {
        if (d.success && Array.isArray(d.schools)) {
          setAvailableSchools(d.schools);
        }
      })
      .catch((err) => console.warn('Could not load schools:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        if (!phone) {
          setError('Please enter your phone number.');
          return;
        }
        const res = await loginTeacher(phone, password);
        if (res.success) {
          router.push('/dashboard');
        } else {
          setError(res.error || 'Failed to authenticate educator.');
        }
      } else {
        if (!name || !phone || !password) {
          setError('Please fill in your full name, phone number, and password.');
          return;
        }
        const res = await registerTeacher({
          name,
          phone,
          pass: password,
          affiliation: affiliation.trim() || 'Independent Educator',
          primarySubject: subject,
        });
        if (res.success) {
          router.push('/dashboard');
        } else {
          setError(res.error || 'Registration failed.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto text-center gap-5">
      <div className="flex items-center gap-2">
        <span className="text-3xl font-black tracking-tight" style={{ color: 'var(--feather)' }}>
          AceByCraft
        </span>
        <span className="pill text-xs font-black" style={{ background: '#d7ffb8', color: 'var(--feather-shadow)' }}>
          TEACHER WORKSPACE
        </span>
      </div>

      <Mascot size={120} mood="happy" className="animate-bob" />

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--eel)]">Volunteer Educator Studio</h1>
        <p className="text-[var(--wolf)] text-sm">
          Submit curriculum-aligned objective questions with step-by-step explanations for thousands of Nigerian students.
        </p>
      </div>

      <div className="card w-full text-left p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`card card-select text-center !p-2.5 text-xs font-black uppercase ${
              mode === 'login' ? 'selected' : ''
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`card card-select text-center !p-2.5 text-xs font-black uppercase ${
              mode === 'register' ? 'selected' : ''
            }`}
          >
            Volunteer Signup
          </button>
        </div>

        {error && (
          <div className="card card-red text-sm mb-4 animate-shake" style={{ color: 'var(--cardinal-shadow)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <>
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Mr. Emmanuel Alabi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">School or Institutional Affiliation</label>
                {availableSchools.length > 0 ? (
                  <select
                    className="input font-bold"
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                  >
                    <option value="Independent Educator">Independent Educator</option>
                    {availableSchools.map((sch) => (
                      <option key={sch.id} value={sch.name}>
                        {sch.name} ({sch.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. King's College or Independent Educator"
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                  />
                )}
              </div>
              <div>
                <label className="label">Primary Teaching Subject</label>
                {availableSubjects.length > 0 ? (
                  <select
                    className="input font-bold"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
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
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                )}
              </div>
            </>
          )}

          <div>
            <label className="label">Phone Number (Username)</label>
            <input
              type="tel"
              required
              className="input"
              placeholder="0803 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-block mt-2">
            {mode === 'login' ? 'Open Educator Studio' : 'Register & Start Contributing'}
          </button>
        </form>
      </div>


    </div>
  );
}
