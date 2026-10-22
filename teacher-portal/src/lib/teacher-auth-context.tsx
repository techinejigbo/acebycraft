'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface TeacherProfile {
  id: string;
  name: string;
  phone: string;
  affiliation: string; // school name or 'Independent Educator'
  primarySubject: string;
  contributedCount: number;
  approvedCount: number;
}

interface TeacherAuthContextType {
  teacher: TeacherProfile | null;
  isLoading: boolean;
  loginTeacher: (phone: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerTeacher: (data: Omit<TeacherProfile, 'id' | 'contributedCount' | 'approvedCount'> & { pass: string }) => Promise<{ success: boolean; error?: string }>;
  logoutTeacher: () => void;
}

const STORAGE_KEY = 'abc_teacher_session';

const TeacherAuthContext = createContext<TeacherAuthContextType>({
  teacher: null,
  isLoading: true,
  loginTeacher: async () => ({ success: false }),
  registerTeacher: async () => ({ success: false }),
  logoutTeacher: () => {},
});

export function TeacherAuthProvider({ children }: { children: React.ReactNode }) {
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTeacher(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to parse teacher session', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginTeacher = async (phone: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', phone, pass }),
      });
      const data = await res.json();
      if (data.success && data.teacher) {
        setTeacher(data.teacher);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.teacher));
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error communicating with server' };
    }
  };

  const registerTeacher = async (data: Omit<TeacherProfile, 'id' | 'contributedCount' | 'approvedCount'> & { pass: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', ...data }),
      });
      const resData = await res.json();
      if (resData.success && resData.teacher) {
        setTeacher(resData.teacher);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resData.teacher));
        return { success: true };
      }
      return { success: false, error: resData.error || 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error communicating with server' };
    }
  };

  const logoutTeacher = () => {
    setTeacher(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <TeacherAuthContext.Provider
      value={{
        teacher,
        isLoading,
        loginTeacher,
        registerTeacher,
        logoutTeacher,
      }}
    >
      {children}
    </TeacherAuthContext.Provider>
  );
}

export const useTeacherAuth = () => useContext(TeacherAuthContext);
