'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface RegisteredSchool {
  id: string;
  name: string;
  code: string;
  state: string;
  lga: string;
}

export interface SchoolUserSession {
  schoolId: string;
  code: string;
  name: string;
  lga: string;
  state: string;
  loggedAt: string;
}

interface SchoolAuthContextType {
  school: SchoolUserSession | null;
  isLoading: boolean;
  loginWithSchoolCode: (code: string, passcode?: string) => Promise<{ success: boolean; error?: string }>;
  registerSchool: (data: {
    name: string;
    state: string;
    lga: string;
    contactPerson?: string;
    contactPhone?: string;
    officialEmail?: string;
    passcode: string;
  }) => Promise<{ success: boolean; school?: SchoolUserSession; error?: string }>;
  logoutSchool: () => void;
  availableSchools: RegisteredSchool[];
  refreshSchools: () => Promise<void>;
}

const STORAGE_KEY = 'abc_school_session';

const SchoolAuthContext = createContext<SchoolAuthContextType>({
  school: null,
  isLoading: true,
  loginWithSchoolCode: async () => ({ success: false }),
  registerSchool: async () => ({ success: false }),
  logoutSchool: () => {},
  availableSchools: [],
  refreshSchools: async () => {},
});

export function SchoolAuthProvider({ children }: { children: React.ReactNode }) {
  const [school, setSchool] = useState<SchoolUserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableSchools, setAvailableSchools] = useState<RegisteredSchool[]>([]);

  const loadSchools = async () => {
    try {
      const res = await fetch('/api/schools');
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (data.success && Array.isArray(data.schools)) {
        setAvailableSchools(data.schools);
      }
    } catch (e) {
      console.warn('Could not load live schools from Firestore:', e);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSchool(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load school session', e);
    } finally {
      setIsLoading(false);
    }
    loadSchools();
  }, []);

  const loginWithSchoolCode = async (code: string, passcode?: string): Promise<{ success: boolean; error?: string }> => {
    if (!passcode || passcode.trim().length === 0) {
      return { success: false, error: 'Passcode is required' };
    }

    try {
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), passcode: passcode.trim() }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (data.success && data.school) {
        const sess: SchoolUserSession = data.school;
        setSchool(sess);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sess));
        return { success: true };
      }
      return { success: false, error: data.error || `Server error (${res.status}). Check Firebase Admin credentials.` };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error connecting to server' };
    }
  };

  const registerSchool = async (data: {
    name: string;
    state: string;
    lga: string;
    contactPerson?: string;
    contactPhone?: string;
    officialEmail?: string;
    passcode: string;
  }): Promise<{ success: boolean; school?: SchoolUserSession; error?: string }> => {
    try {
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', ...data }),
      });
      const text = await res.text();
      const resData = text ? JSON.parse(text) : {};
      if (resData.success && resData.school) {
        const sess: SchoolUserSession = resData.school;
        setSchool(sess);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sess));
        await loadSchools();
        return { success: true, school: sess };
      }
      return { success: false, error: resData.error || `Failed to register school (${res.status})` };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error connecting to server' };
    }
  };

  const logoutSchool = () => {
    setSchool(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SchoolAuthContext.Provider
      value={{
        school,
        isLoading,
        loginWithSchoolCode,
        registerSchool,
        logoutSchool,
        availableSchools,
        refreshSchools: loadSchools,
      }}
    >
      {children}
    </SchoolAuthContext.Provider>
  );
}

export const useSchoolAuth = () => useContext(SchoolAuthContext);

