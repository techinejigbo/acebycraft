'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { INITIAL_REGISTERED_SCHOOLS } from '@/data/abc_subjects_catalog';
import { Mascot } from '@/components/Mascot';

export default function InstitutionLoginPage() {
  const router = useRouter();
  const { isAuthenticated, loginAsAdmin, loginAsSchool } = useAdminAuth();
  const [type, setType] = useState<'school' | 'admin'>('school');
  const [code, setCode] = useState(INITIAL_REGISTERED_SCHOOLS[0].code);
  const [pass, setPass] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = type === 'school' ? loginAsSchool(code, pass) : loginAsAdmin(pin.trim());
    if (ok) router.push('/dashboard');
    else setError(type === 'school' ? 'We could not verify that school.' : 'Wrong IT unit passphrase.');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 gap-6">
      <Mascot size={130} mood={error ? 'sad' : 'happy'} className="animate-bob" />
      <h1 className="text-3xl text-center">Welcome, school leaders!</h1>

      <div className="w-full max-w-md flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setType('school')} className={`card card-select text-center !p-3 ${type === 'school' ? 'selected' : ''}`}>🏫 School</button>
          <button type="button" onClick={() => setType('admin')} className={`card card-select text-center !p-3 ${type === 'admin' ? 'selected' : ''}`}>🛠️ IT unit</button>
        </div>

        {error && <div className="card card-red text-sm animate-shake" style={{ color: 'var(--cardinal-shadow)' }}>{error}</div>}

        <form onSubmit={submit} className="flex flex-col gap-4">
          {type === 'school' ? (
            <>
              <div>
                <label className="label">Your school</label>
                <select className="input" value={code} onChange={(e) => setCode(e.target.value)}>
                  {INITIAL_REGISTERED_SCHOOLS.map((s) => (
                    <option key={s.id} value={s.code}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Access passcode</label>
                <input className="input" type="password" placeholder="Passcode" value={pass} onChange={(e) => setPass(e.target.value)} />
              </div>
              <p className="text-sm text-[var(--wolf)]">🔒 Schools only see their own students&apos; results.</p>
            </>
          ) : (
            <div>
              <label className="label">IT unit passphrase</label>
              <input className="input" type="password" required placeholder="Passphrase" value={pin} onChange={(e) => setPin(e.target.value)} />
            </div>
          )}
          <button className="btn btn-block">Log in</button>
        </form>

        <div className="flex gap-2 justify-center text-sm font-black uppercase tracking-wider text-[var(--macaw)]">
          <button type="button" className="cursor-pointer" onClick={() => { loginAsSchool('ABC-LAG-001'); router.push('/dashboard'); }}>Demo: King&apos;s College</button>
          <span className="text-[var(--hare)]">·</span>
          <button type="button" className="cursor-pointer" onClick={() => { loginAsAdmin('abc-admin-2026'); router.push('/dashboard'); }}>Demo: IT unit</button>
        </div>
      </div>
    </div>
  );
}
