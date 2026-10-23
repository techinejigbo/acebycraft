'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { Mascot } from '@/components/Mascot';
import { ShieldCheck, KeyRound } from 'lucide-react';

export default function ITUnitLoginPage() {
  const router = useRouter();
  const { isAuthenticated, isSetupNeeded, isLoading, loginAsAdmin, setupAdminPasscode } = useAdminAuth();
  
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await loginAsAdmin(pin.trim());
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Invalid administrator passcode.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.trim().length < 8) {
      setError('Master passcode must be at least 8 characters long.');
      return;
    }

    if (pin.trim() !== confirmPin.trim()) {
      setError('Passcodes do not match. Please verify both fields.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await setupAdminPasscode(pin.trim());
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Failed to initialize master admin passcode.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Mascot size={80} className="animate-bob" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto text-center gap-5">
      <div className="flex items-center gap-2">
        <span className="brand-logo text-3xl">AceByCraft</span>
        <span className="pill text-xs font-black" style={{ background: '#f1dcff', color: 'var(--beetle-shadow)' }}>IT UNIT</span>
      </div>

      <Mascot size={120} mood={error ? 'sad' : isSetupNeeded ? 'cheer' : 'wink'} className="animate-bob" />

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--eel)]">
          {isSetupNeeded ? 'Initialize Administrator Passcode' : 'IT Command & National Admin'}
        </h1>
        <p className="text-sm text-[var(--wolf)]">
          {isSetupNeeded
            ? 'Create a secure master administrator passcode for system access.'
            : 'Manage weekly assessment cycles, approve volunteer teacher questions, and publish the Sunday night broadcast report.'}
        </p>
      </div>

      <div className="card w-full text-left p-5 shadow-sm">
        {error && (
          <div className="card card-red text-sm mb-4 animate-shake" style={{ color: 'var(--cardinal-shadow)' }}>
            {error}
          </div>
        )}

        {isSetupNeeded ? (
          <form onSubmit={handleSetup} className="flex flex-col gap-4">
            <div className="card card-blue text-xs flex items-start gap-2">
              <KeyRound className="w-4 h-4 shrink-0 text-[var(--macaw)] mt-0.5" />
              <span>
                Please create your master administrator passcode to initialize the system.
              </span>
            </div>

            <div>
              <label className="label">Create Master Administrator Passcode</label>
              <input
                className="input font-mono"
                type="password"
                required
                placeholder="At least 8 characters"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Confirm Master Passcode</label>
              <input
                className="input font-mono"
                type="password"
                required
                placeholder="Re-enter master passcode"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-purple btn-block" disabled={submitting}>
              {submitting ? 'Saving Passcode...' : 'Save Passcode & Enter Console'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="label">National Administrator Passcode</label>
              <input
                className="input font-mono"
                type="password"
                required
                placeholder="Enter administrator passcode"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-purple btn-block" disabled={submitting}>
              {submitting ? 'Verifying Credentials...' : 'Enter IT Command Console'}
            </button>
          </form>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--wolf)] max-w-sm">
        <ShieldCheck className="w-4 h-4 text-[var(--feather)] flex-shrink-0" />
        <span>
          Restricted access for authorized personnel only.
        </span>
      </div>
    </div>
  );
}
