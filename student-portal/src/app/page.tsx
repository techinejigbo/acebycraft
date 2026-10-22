'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, DEFAULT_9_SUBJECTS } from '@/lib/auth-context';
import { Mascot } from '@/components/Mascot';
import { ArrowLeft, X } from 'lucide-react';
import { auth, RecaptchaVerifier, type ConfirmationResult } from '@/lib/firebase/client';

type Screen = 'welcome' | 'login' | 'forgot' | 'name' | 'phone' | 'school' | 'subjects' | 'whatsapp' | 'password';
const REG_STEPS: Screen[] = ['name', 'phone', 'school', 'subjects', 'whatsapp', 'password'];

interface LiveSchool {
  id: string;
  name: string;
  code?: string;
  state?: string;
  lga?: string;
}

interface LiveSubject {
  id: string;
  name: string;
  shortCode: string;
  category?: string;
  description?: string;
}

export default function StudentAuthPage() {
  const router = useRouter();
  const { student, loginWithPhoneAndPass, registerStudent, requestPasswordOtp, verifyOtpAndResetPassword } = useAuth();

  const [screen, setScreen] = useState<Screen>('welcome');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [schoolId, setSchoolId] = useState('');
  const [schoolClass, setSchoolClass] = useState('SS 3');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [consent, setConsent] = useState(true);
  const [password, setPassword] = useState('');

  const [liveSchools, setLiveSchools] = useState<LiveSchool[]>([]);
  const [liveSubjects, setLiveSubjects] = useState<LiveSubject[]>([]);
  const [fetchingMaster, setFetchingMaster] = useState(true);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (student) router.push('/dashboard');
  }, [student, router]);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [schRes, subRes] = await Promise.all([
          fetch('/api/schools').then(async (r) => {
            const text = await r.text();
            return text ? JSON.parse(text) : { success: false };
          }),
          fetch('/api/subjects').then(async (r) => {
            const text = await r.text();
            return text ? JSON.parse(text) : { success: false };
          }),
        ]);
        if (schRes.success && schRes.schools) {
          setLiveSchools(schRes.schools);
        }
        if (subRes.success && subRes.subjects) {
          setLiveSubjects(subRes.subjects);
        }
      } catch (err) {
        console.error('Failed to load live schools/subjects:', err);
      } finally {
        setFetchingMaster(false);
      }
    }
    loadMasterData();
  }, []);

  const stepIndex = REG_STEPS.indexOf(screen);
  const isReg = stepIndex >= 0;

  const go = (s: Screen) => { setError(null); setScreen(s); };
  const back = () => {
    if (isReg) go(stepIndex === 0 ? 'welcome' : REG_STEPS[stepIndex - 1]);
    else go('welcome');
  };

  const maxSelectable = liveSubjects.length > 0 ? Math.min(9, liveSubjects.length) : 9;

  const toggleSubject = (id: string) => {
    setError(null);
    if (subjects.includes(id)) {
      setSubjects(subjects.filter((s) => s !== id));
    } else if (subjects.length >= maxSelectable) {
      setError(`You can select up to ${maxSelectable} subject${maxSelectable === 1 ? '' : 's'}. Tap one to remove it first.`);
    } else {
      setSubjects([...subjects, id]);
    }
  };

  const phoneValid = phone.replace(/\D/g, '').length >= 10;
  const canContinue =
    screen === 'name' ? fullName.trim().length >= 3
    : screen === 'phone' ? phoneValid
    : screen === 'school' ? !!schoolId
    : screen === 'subjects' ? (liveSubjects.length === 0 ? true : subjects.length === maxSelectable)
    : screen === 'whatsapp' ? true
    : screen === 'password' ? password.length >= 6
    : true;

  const next = async () => {
    if (screen !== 'password') { go(REG_STEPS[stepIndex + 1]); return; }
    setLoading(true);
    const school = liveSchools.find((s) => s.id === schoolId);
    const selectedSchoolName = schoolId === 'self' || !school ? 'Self (Independent Learner)' : school.name;
    const finalSubjects = subjects.length > 0 ? subjects : (liveSubjects.length > 0 ? liveSubjects.slice(0, 9).map((s) => s.id) : DEFAULT_9_SUBJECTS);
    const res = await registerStudent({
      fullName, phone, pass: password, schoolId,
      schoolName: selectedSchoolName,
      schoolClass, network, whatsappConsent: consent,
      preferredSubjects: finalSubjects,
    });
    setLoading(false);
    if (res.success) router.push('/dashboard');
    else setError(res.error || 'Registration failed.');
  };

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await loginWithPhoneAndPass(phone, password);
    setLoading(false);
    if (res.success) router.push('/dashboard');
    else setError(res.error || 'Wrong phone number or password.');
  };

  const sendOtp = async () => {
    setLoading(true); setError(null);
    let verifier: RecaptchaVerifier | undefined;
    if (auth && typeof window !== 'undefined') {
      try {
        const existing = (window as any).recaptchaVerifier;
        if (existing) {
          try { existing.clear(); } catch {}
        }
        verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
        (window as any).recaptchaVerifier = verifier;
      } catch (e) {
        console.warn('Recaptcha init notice:', e);
      }
    }

    const res = await requestPasswordOtp(phone, verifier);
    setLoading(false);
    if (res.success) {
      if (res.confirmationResult) {
        setConfirmationResult(res.confirmationResult);
      }
      setOtpSent(true);
      setOtp('');
    } else {
      setError(res.error || 'Could not send verification code.');
    }
  };

  const resetPass = async () => {
    setLoading(true); setError(null);
    const res = await verifyOtpAndResetPassword(phone, otp, newPass, confirmationResult);
    setLoading(false);
    if (res.success) {
      setPassword('');
      setOtpSent(false);
      setConfirmationResult(null);
      setInfo('Password updated! Log in with your new password.');
      go('login');
    } else {
      setError(res.error || 'Invalid verification code.');
    }
  };

  const mascotMood = error ? 'sad' : screen === 'welcome' ? 'happy' : 'wink';

  /* ---------- WELCOME ---------- */
  if (screen === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-3 sm:py-6 text-center gap-3 sm:gap-4 max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--feather)' }}>acebycraft</span>
          <span className="pill py-1 px-2.5 text-xs font-black" style={{ background: '#d7ffb8', color: 'var(--feather-shadow)' }}>NIGERIA</span>
        </div>
        <Mascot size={150} mood="happy" className="animate-bob" />
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl leading-tight">The free, fun way to ace your subjects!</h1>
          <p className="text-[var(--wolf)] text-sm sm:text-base leading-snug">
            10 questions per subject every week. Score 80%+, finish fast, and win airtime.
          </p>
        </div>
        <div className="w-full flex flex-col gap-2.5">
          <button className="btn btn-block" onClick={() => go('name')}>Get started</button>
          <button className="btn btn-outline btn-block" onClick={() => go('login')}>I already have an account</button>
        </div>
      </div>
    );
  }

  /* ---------- LOGIN / FORGOT ---------- */
  if (screen === 'login' || screen === 'forgot') {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto w-full">
          <button onClick={back} className="p-2 text-[var(--hare)] cursor-pointer"><X className="w-7 h-7" /></button>
          <button className="btn btn-outline" onClick={() => go('name')}>Sign up</button>
        </div>
        <div className="flex-1 flex flex-col items-center px-6 gap-5 max-w-md mx-auto w-full pb-10">
          <Mascot size={110} mood={mascotMood} />
          <h1 className="text-2xl">{screen === 'login' ? 'Welcome back!' : 'Reset your password'}</h1>
          {info && <div className="card card-green w-full text-sm">{info}</div>}
          {error && <div className="card card-red w-full text-sm animate-shake" style={{ color: 'var(--cardinal-shadow)' }}>{error}</div>}

          {screen === 'login' ? (
            <form onSubmit={doLogin} className="w-full flex flex-col gap-4">
              <div>
                <label className="label">Phone number (your username)</label>
                <input className="input" type="tel" required placeholder="0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <button className="btn btn-block" disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>
              <button type="button" className="text-sm font-black uppercase tracking-wider text-[var(--macaw)] cursor-pointer" onClick={() => { setOtpSent(false); go('forgot'); }}>
                Forgot password?
              </button>
            </form>
          ) : (
            <div className="w-full flex flex-col gap-4">
              <p className="text-[var(--wolf)] text-center">We&apos;ll send a 6-digit code to your registered phone number.</p>
              <div>
                <label className="label">Registered phone number</label>
                <input className="input" type="tel" placeholder="0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              {!otpSent ? (
                <>
                  <button className="btn btn-block btn-blue" onClick={sendOtp} disabled={loading || !phoneValid}>Send code</button>
                  <div id="recaptcha-container"></div>
                </>
              ) : (
                <>
                  <div className="card card-blue text-sm">📱 A 6-digit code has been sent to your phone number.</div>
                  <div>
                    <label className="label">6-digit code</label>
                    <input className="input text-center tracking-[.5em] text-xl" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">New password</label>
                    <input className="input" type="password" placeholder="At least 6 characters" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                  </div>
                  <button className="btn btn-block" onClick={resetPass} disabled={loading || otp.length < 6 || newPass.length < 6}>Save new password</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- REGISTRATION STEPS ---------- */
  const bubble: Record<string, string> = {
    name: "Hi, I'm Ace! What should I call you?",
    phone: 'Your airtime prize is sent to this number — make sure it is correct!',
    school: 'Which school do you represent?',
    subjects: liveSubjects.length > 0 ? `Pick up to ${maxSelectable} subjects you offer in school.` : 'Curriculum subjects setup',
    whatsapp: 'Join our WhatsApp community for weekly results!',
    password: 'Last step — create a password.',
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center gap-4 p-4 max-w-2xl mx-auto w-full">
        <button onClick={back} className="p-2 text-[var(--hare)] cursor-pointer"><ArrowLeft className="w-7 h-7" /></button>
        <div className="progress flex-1"><span style={{ width: `${((stepIndex + 1) / REG_STEPS.length) * 100}%` }} /></div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 pb-36 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Mascot size={96} mood={mascotMood} />
          <div className="card relative" style={{ borderRadius: 16 }}>
            <p className="text-lg font-black text-[var(--eel)]">{bubble[screen]}</p>
          </div>
        </div>

        {error && <div className="card card-red text-sm animate-shake" style={{ color: 'var(--cardinal-shadow)' }}>{error}</div>}

        {screen === 'name' && (
          <input className="input text-lg" autoFocus placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        )}

        {screen === 'phone' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Phone number</label>
              <input className="input text-lg" type="tel" autoFocus placeholder="0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="label">Network</label>
              <div className="grid grid-cols-4 gap-2">
                {['MTN', 'Airtel', 'Glo', '9mobile'].map((n) => (
                  <button key={n} type="button" onClick={() => setNetwork(n)} className={`card card-select text-center !p-3 ${network === n ? 'selected' : ''}`}>{n}</button>
                ))}
              </div>
            </div>
            <div className="card card-yellow text-sm">⚡ Airtime rewards are credited to this phone number.</div>
          </div>
        )}

        {screen === 'school' && (
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => setSchoolId('self')} className={`card card-select ${schoolId === 'self' ? 'selected' : ''}`}>
              🎒 My school is not listed <span className="text-[var(--wolf)] font-bold">(participate as “Self”)</span>
            </button>
            {fetchingMaster && liveSchools.length === 0 && (
              <div className="p-3 text-sm text-[var(--wolf)]">Loading schools onboarded by admin...</div>
            )}
            {!fetchingMaster && liveSchools.length === 0 && (
              <div className="card card-blue text-sm">
                No institutional partner schools registered yet. You can participate independently as <b>Self</b>!
              </div>
            )}
            {liveSchools.map((s) => (
              <button key={s.id} type="button" onClick={() => setSchoolId(s.id)} className={`card card-select ${schoolId === s.id ? 'selected' : ''}`}>
                🏫 {s.name} <span className="text-[var(--wolf)] font-bold">· {s.state || s.lga || 'Active'}</span>
              </button>
            ))}
            <label className="label mt-2">Class</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['SS 1', 'SS 2', 'SS 3', 'JAMB/WAEC'].map((c) => (
                <button key={c} type="button" onClick={() => setSchoolClass(c)} className={`card card-select text-center !p-3 ${schoolClass === c ? 'selected' : ''}`}>{c}</button>
              ))}
            </div>
          </div>
        )}

        {screen === 'subjects' && (
          <div className="flex flex-col gap-3">
            {fetchingMaster && liveSubjects.length === 0 && (
              <div className="p-3 text-sm text-[var(--wolf)]">Loading live curriculum subjects...</div>
            )}
            {!fetchingMaster && liveSubjects.length === 0 && (
              <div className="card card-yellow text-sm">
                Curriculum subjects are currently being configured by the platform administrator. You can continue to complete your profile, and you will be enrolled when subjects go live!
              </div>
            )}
            {liveSubjects.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="label !mb-0">{subjects.length} / {maxSelectable} chosen</span>
                  <div className="progress w-32"><span style={{ width: `${(subjects.length / maxSelectable) * 100}%` }} /></div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {liveSubjects.map((s) => (
                    <button key={s.id} type="button" onClick={() => toggleSubject(s.id)} className={`card card-select ${subjects.includes(s.id) ? 'selected' : ''}`}>
                      <div className="text-xs font-black text-[var(--hare)] uppercase">{s.shortCode || s.name.slice(0, 3)}</div>
                      <div className="font-black leading-tight">{s.name}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {screen === 'whatsapp' && (
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => setConsent(true)} className={`card card-select ${consent ? 'selected' : ''}`}>
              💬 Yes, add me to the WhatsApp community
            </button>
            <button type="button" onClick={() => setConsent(false)} className={`card card-select ${!consent ? 'selected' : ''}`}>
              🙅 No thanks
            </button>
            <p className="text-sm text-[var(--wolf)]">By choosing yes you consent to be added for weekly results, winners and updates.</p>
          </div>
        )}

        {screen === 'password' && (
          <input className="input text-lg" type="password" autoFocus placeholder="Create a password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t-2 border-[var(--swan)] p-4">
        <div className="max-w-2xl mx-auto flex justify-end">
          <button className="btn w-full sm:w-64" disabled={!canContinue || loading} onClick={next}>
            {screen === 'password' ? (loading ? 'Creating…' : 'Create my profile') : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
