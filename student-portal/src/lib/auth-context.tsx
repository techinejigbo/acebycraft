'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { StudentProfile } from '@/types';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase/client';
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
  requestPasswordOtp: (phone: string) => Promise<{ success: boolean; otp?: string; error?: string }>;
  verifyOtpAndResetPassword: (phone: string, otp: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
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
const REGISTERED_USERS_KEY = 'abc_registered_users_db';
const OTP_STORE_KEY = 'abc_active_otps';

// Standard 9 default subjects for a Nigerian student if not specified
export const DEFAULT_9_SUBJECTS = [
  'math',
  'english',
  'biology',
  'chemistry',
  'physics',
  'economics',
  'civic',
  'agric',
  'government',
];

// Helper to normalize Nigerian phone number
export function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('234') && cleaned.length >= 13) {
    return `+${cleaned}`;
  }
  if (raw.startsWith('+')) {
    return raw;
  }
  return `+234${cleaned}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from localStorage or Firebase
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.uid) {
          setStudent(parsed);
        }
      }
    } catch (err) {
      console.warn('Error reading saved student session:', err);
    } finally {
      setIsLoading(false);
    }

    if (isFirebaseConfigured() && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const profile = await fetchFromFirestore(firebaseUser.uid);
          if (profile) {
            setStudent(profile);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
          }
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const fetchFromFirestore = async (uid: string): Promise<StudentProfile | null> => {
    if (!db) return null;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        return {
          uid,
          phone: d.phone || '',
          displayName: d.displayName || d.fullName || 'ABC Student',
          schoolId: d.schoolId || 'self',
          schoolName: d.schoolName || 'Self (Independent Learner)',
          schoolClass: d.schoolClass || 'SS 3',
          network: d.network || 'MTN',
          whatsappConsent: Boolean(d.whatsappConsent),
          preferredSubjects: d.preferredSubjects?.length === 9 ? d.preferredSubjects : DEFAULT_9_SUBJECTS,
          totalAssessmentsTaken: d.totalAssessmentsTaken || 0,
          totalAirtimeWonNgn: d.totalAirtimeWonNgn || 0,
          averageScorePercentage: d.averageScorePercentage || 0,
          createdAt: d.createdAt || new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn('Firestore user fetch note:', err);
    }
    return null;
  };

  const saveStudentProfile = async (updates: Partial<StudentProfile>) => {
    if (!student) return;
    const merged: StudentProfile = {
      ...student,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setStudent(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

    // Also update in registered users db
    try {
      const dbStr = localStorage.getItem(REGISTERED_USERS_KEY);
      const userList: any[] = dbStr ? JSON.parse(dbStr) : [];
      const idx = userList.findIndex((u) => u.uid === student.uid || u.phone === student.phone);
      if (idx !== -1) {
        userList[idx] = { ...userList[idx], ...merged };
      } else {
        userList.push(merged);
      }
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(userList));
    } catch (e) {
      console.warn('Failed to update local user db:', e);
    }

    if (isFirebaseConfigured() && db && student.uid) {
      try {
        await setDoc(doc(db, 'users', student.uid), merged, { merge: true });
      } catch (err) {
        console.warn('Firestore profile sync note:', err);
      }
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
      const formattedPhone = normalizePhone(data.phone);

      // Check existing accounts in local storage DB
      const dbStr = localStorage.getItem(REGISTERED_USERS_KEY);
      const userList: any[] = dbStr ? JSON.parse(dbStr) : [];
      const exists = userList.find((u) => normalizePhone(u.phone) === formattedPhone);

      if (exists) {
        return { success: false, error: 'A student account with this phone number already exists. Please log in.' };
      }

      const uid = 'student_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const newProfile: StudentProfile = {
        uid,
        phone: formattedPhone,
        displayName: data.fullName.trim(),
        schoolId: data.schoolId || 'self',
        schoolName: data.schoolName || 'Self (Independent Learner)',
        schoolClass: data.schoolClass || 'SS 3',
        network: data.network || 'MTN',
        whatsappConsent: data.whatsappConsent,
        preferredSubjects: data.preferredSubjects.length === 9 ? data.preferredSubjects : DEFAULT_9_SUBJECTS,
        totalAssessmentsTaken: 0,
        totalAirtimeWonNgn: 0,
        averageScorePercentage: 0,
        createdAt: new Date().toISOString(),
      };

      // Store with password hash/record
      userList.push({
        ...newProfile,
        password: data.pass,
      });
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(userList));

      // Set active session
      setStudent(newProfile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));

      // Sync with Firestore if available
      if (isFirebaseConfigured() && db) {
        try {
          await setDoc(doc(db, 'users', uid), newProfile, { merge: true });
        } catch (fErr) {
          console.warn('Firestore registration sync note:', fErr);
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Registration failed. Please check your inputs.' };
    }
  };

  const loginWithPhoneAndPass = async (phone: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const formattedPhone = normalizePhone(phone);
      const dbStr = localStorage.getItem(REGISTERED_USERS_KEY);
      const userList: any[] = dbStr ? JSON.parse(dbStr) : [];
      const matched = userList.find(
        (u) => normalizePhone(u.phone) === formattedPhone && u.password === pass
      );

      if (matched) {
        const studentProfile: StudentProfile = {
          uid: matched.uid,
          phone: matched.phone,
          displayName: matched.displayName || matched.fullName,
          schoolId: matched.schoolId || 'self',
          schoolName: matched.schoolName || 'Self (Independent Learner)',
          schoolClass: matched.schoolClass || 'SS 3',
          network: matched.network || 'MTN',
          whatsappConsent: Boolean(matched.whatsappConsent),
          preferredSubjects: matched.preferredSubjects?.length === 9 ? matched.preferredSubjects : DEFAULT_9_SUBJECTS,
          totalAssessmentsTaken: matched.totalAssessmentsTaken || 0,
          totalAirtimeWonNgn: matched.totalAirtimeWonNgn || 0,
          averageScorePercentage: matched.averageScorePercentage || 0,
          createdAt: matched.createdAt,
        };
        setStudent(studentProfile);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(studentProfile));
        return { success: true };
      }

      return { success: false, error: 'Incorrect phone number or password. Please verify and try again.' };
    } catch (err: any) {
      return { success: false, error: 'Login service encountered an issue.' };
    }
  };

  const requestPasswordOtp = async (phone: string): Promise<{ success: boolean; otp?: string; error?: string }> => {
    const formattedPhone = normalizePhone(phone);
    const dbStr = localStorage.getItem(REGISTERED_USERS_KEY);
    const userList: any[] = dbStr ? JSON.parse(dbStr) : [];
    const matched = userList.find((u) => normalizePhone(u.phone) === formattedPhone);

    if (!matched) {
      return { success: false, error: 'No registered student account found with this phone number.' };
    }

    // Generate 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpStore: Record<string, { otp: string; expiresAt: number }> = JSON.parse(
      localStorage.getItem(OTP_STORE_KEY) || '{}'
    );
    otpStore[formattedPhone] = {
      otp: generatedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    localStorage.setItem(OTP_STORE_KEY, JSON.stringify(otpStore));

    return { success: true, otp: generatedOtp };
  };

  const verifyOtpAndResetPassword = async (
    phone: string,
    otp: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const formattedPhone = normalizePhone(phone);
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

    // Update password in local DB
    const dbStr = localStorage.getItem(REGISTERED_USERS_KEY);
    const userList: any[] = dbStr ? JSON.parse(dbStr) : [];
    const idx = userList.findIndex((u) => normalizePhone(u.phone) === formattedPhone);
    if (idx !== -1) {
      userList[idx].password = newPass;
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(userList));
      delete otpStore[formattedPhone];
      localStorage.setItem(OTP_STORE_KEY, JSON.stringify(otpStore));
      return { success: true };
    }

    return { success: false, error: 'Account record could not be updated.' };
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
