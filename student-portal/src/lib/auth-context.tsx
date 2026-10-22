'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { StudentProfile } from '@/types';
import { 
  auth, 
  db, 
  isFirebaseConfigured, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  type ConfirmationResult 
} from '@/lib/firebase/client';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  student: StudentProfile | null;
  isLoading: boolean;
  saveStudentProfile: (profile: Partial<StudentProfile>) => Promise<void>;
  updatePreferredSubjects: (subjects: string[]) => Promise<void>;
  logout: () => void;
  loginWithPhoneAndPass: (phone: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerStudent: (data: {
    fullName: string;
    phone: string;
    pass: string;
    schoolId: string;
    schoolName: string;
    schoolClass: string;
    network: string;
    whatsappConsent: boolean;
    preferredSubjects: string[];
  }) => Promise<{ success: boolean; error?: string }>;
  requestPasswordOtp: (
    phone: string, 
    recaptchaVerifier?: RecaptchaVerifier
  ) => Promise<{ success: boolean; confirmationResult?: ConfirmationResult; otp?: string; error?: string }>;
  verifyOtpAndResetPassword: (
    phone: string, 
    otp: string, 
    newPass: string, 
    confirmationResult?: ConfirmationResult | null
  ) => Promise<{ success: boolean; error?: string }>;
  refreshStudentProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  student: null,
  isLoading: true,
  saveStudentProfile: async () => {},
  updatePreferredSubjects: async () => {},
  logout: () => {},
  loginWithPhoneAndPass: async () => ({ success: false }),
  registerStudent: async () => ({ success: false }),
  requestPasswordOtp: async () => ({ success: false }),
  verifyOtpAndResetPassword: async () => ({ success: false }),
  refreshStudentProfile: async () => {},
});

const STORAGE_KEY = 'abc_student_session';
const OTP_STORE_KEY = 'abc_active_otps';

// Dynamic default subjects (starts empty from zero master data)
export const DEFAULT_9_SUBJECTS: string[] = [];

// Helper to normalize Nigerian phone number
export function normalizePhone(raw: string): string {
  const cleaned = (raw || '').replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('234') && cleaned.length >= 13) {
    return `+${cleaned}`;
  }
  if (raw && raw.startsWith('+')) {
    return raw;
  }
  return `+234${cleaned}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and verify against Firestore database
  useEffect(() => {
    // Clean up any legacy localStorage mock DB
    try {
      localStorage.removeItem('abc_registered_users_db');
    } catch {}

    async function initSession() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.uid) {
            // Verify with Firestore database via /api/auth
            try {
              const res = await fetch(`/api/auth?uid=${encodeURIComponent(parsed.uid)}`);
              const data = await res.json();
              if (data.success && data.user) {
                setStudent(data.user);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
              } else {
                // User does not exist in the database! Clear phantom session.
                console.warn('Session user not found in Firestore. Clearing session.');
                localStorage.removeItem(STORAGE_KEY);
                setStudent(null);
              }
            } catch (netErr) {
              // Network offline - keep cached session
              setStudent(parsed);
            }
          }
        }
      } catch (err) {
        console.warn('Error reading saved student session:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  const saveStudentProfile = async (updates: Partial<StudentProfile>) => {
    if (!student) return;
    const merged: StudentProfile = {
      ...student,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setStudent(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

    try {
      if (updates.preferredSubjects) {
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update-subjects',
            uid: student.uid,
            preferredSubjects: updates.preferredSubjects,
          }),
        });
      }
    } catch (err) {
      console.warn('Failed to sync profile update to server:', err);
    }
  };

  const updatePreferredSubjects = async (subjects: string[]) => {
    await saveStudentProfile({ preferredSubjects: subjects });
  };

  const registerStudent = async (data: {
    fullName: string;
    phone: string;
    pass: string;
    schoolId: string;
    schoolName: string;
    schoolClass: string;
    network: string;
    whatsappConsent: boolean;
    preferredSubjects: string[];
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fullName: data.fullName,
          phone: data.phone,
          pass: data.pass,
          schoolId: data.schoolId,
          schoolName: data.schoolName,
          schoolClass: data.schoolClass,
          network: data.network,
          whatsappConsent: data.whatsappConsent,
          preferredSubjects: data.preferredSubjects,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        return { success: false, error: result.error || 'Registration failed' };
      }

      setStudent(result.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Registration failed. Check network connection.' };
    }
  };

  const loginWithPhoneAndPass = async (phone: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          phone,
          pass,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        return { success: false, error: result.error || 'Invalid phone number or password' };
      }

      setStudent(result.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Login service encountered an issue. Check connection.' };
    }
  };

  const requestPasswordOtp = async (
    phone: string,
    recaptchaVerifier?: RecaptchaVerifier
  ): Promise<{ success: boolean; confirmationResult?: ConfirmationResult; otp?: string; error?: string }> => {
    try {
      const formattedPhone = normalizePhone(phone);
      const res = await fetch(`/api/auth?phone=${encodeURIComponent(formattedPhone)}`);
      const data = await res.json();

      if (!data.success || !data.exists) {
        return { success: false, error: 'No registered student account found with this phone number.' };
      }

      // If Firebase Auth is configured and recaptchaVerifier is passed, send genuine SMS OTP via Firebase Phone Auth
      if (isFirebaseConfigured() && auth && recaptchaVerifier) {
        try {
          const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
          return { success: true, confirmationResult: confirmation };
        } catch (fbErr: any) {
          console.warn('[Firebase Phone Auth] SMS send error:', fbErr);
          if (fbErr?.code === 'auth/quota-exceeded') {
            return { success: false, error: 'Daily SMS quota reached. Please contact support or try again later.' };
          }
          if (fbErr?.code === 'auth/invalid-phone-number') {
            return { success: false, error: 'Invalid phone number format. Please ensure correct Nigerian format (+234...).' };
          }
          return { success: false, error: fbErr?.message || 'Could not send SMS verification code.' };
        }
      }

      // Fallback for local development or demo without live SMS credentials
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpStore: Record<string, { otp: string; expiresAt: number }> = JSON.parse(
        localStorage.getItem(OTP_STORE_KEY) || '{}'
      );
      otpStore[formattedPhone] = {
        otp: generatedOtp,
        expiresAt: Date.now() + 10 * 60 * 1000,
      };
      localStorage.setItem(OTP_STORE_KEY, JSON.stringify(otpStore));

      return { success: true, otp: generatedOtp };
    } catch (e: any) {
      return { success: false, error: 'Could not send verification code' };
    }
  };

  const verifyOtpAndResetPassword = async (
    phone: string,
    otp: string,
    newPass: string,
    confirmationResult?: ConfirmationResult | null
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const formattedPhone = normalizePhone(phone);
      let firebaseIdToken: string | undefined;

      if (confirmationResult) {
        // Authenticate with Firebase using the SMS OTP
        const userCredential = await confirmationResult.confirm(otp.trim());
        firebaseIdToken = await userCredential.user.getIdToken();
      } else {
        // Local fallback verification
        const otpStore: Record<string, { otp: string; expiresAt: number }> = JSON.parse(
          localStorage.getItem(OTP_STORE_KEY) || '{}'
        );
        const entry = otpStore[formattedPhone];
        if (!entry || entry.otp !== otp.trim()) {
          return { success: false, error: 'Invalid or expired OTP verification code.' };
        }
        if (Date.now() > entry.expiresAt) {
          return { success: false, error: 'The OTP has expired. Please request a new code.' };
        }
        delete otpStore[formattedPhone];
        localStorage.setItem(OTP_STORE_KEY, JSON.stringify(otpStore));
      }

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-password',
          phone,
          newPass,
          firebaseIdToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Could not update password' };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to reset password.' };
    }
  };

  const logout = () => {
    setStudent(null);
    localStorage.removeItem(STORAGE_KEY);
    if (isFirebaseConfigured() && auth) {
      fbSignOut(auth).catch(() => {});
    }
  };

  return (
    <AuthContext.Provider
      value={{
        student,
        isLoading,
        saveStudentProfile,
        updatePreferredSubjects,
        logout,
        loginWithPhoneAndPass,
        registerStudent,
        requestPasswordOtp,
        verifyOtpAndResetPassword,
        refreshStudentProfile: async () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
