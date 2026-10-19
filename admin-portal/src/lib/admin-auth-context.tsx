'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_REGISTERED_SCHOOLS } from '@/data/abc_subjects_catalog';
import { SchoolProfile } from '@/types';

export type AdminRole = 'admin' | 'school';

interface AdminAuthContextType {
  isAuthenticated: boolean;
  role: AdminRole;
  activeSchool: {
    id: string;
    name: string;
    code: string;
    state: string;
    lga: string;
  } | null;
  loginAsAdmin: (passphrase: string) => boolean;
  loginAsSchool: (schoolCodeOrId: string, password?: string) => boolean;
  logout: () => void;
  isLoading: boolean;
  // Legacy compatibility getters
  isAdminAuthenticated: boolean;
  logoutAdmin: () => void;
  loginAdmin: (passphrase: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false,
  role: 'admin',
  activeSchool: null,
  loginAsAdmin: () => false,
  loginAsSchool: () => false,
  logout: () => {},
  isLoading: true,
  isAdminAuthenticated: false,
  logoutAdmin: () => {},
  loginAdmin: () => false,
});

const AUTH_STORAGE_KEY = 'abc_admin_auth_session';

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [role, setRole] = useState<AdminRole>('admin');
  const [activeSchool, setActiveSchool] = useState<{
    id: string;
    name: string;
    code: string;
    state: string;
    lga: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.authenticated) {
          setIsAuthenticated(true);
          setRole(parsed.role || 'admin');
          setActiveSchool(parsed.school || null);
        }
      }
    } catch (e) {
      console.warn('Error reading admin auth token:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginAsAdmin = (passphrase: string): boolean => {
    if (
      passphrase === 'abc-admin-2026' || 
      passphrase === 'admin123' || 
      passphrase === 'bioair-admin-2026'
    ) {
      const session = { authenticated: true, role: 'admin' as AdminRole, school: null };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      setIsAuthenticated(true);
      setRole('admin');
      setActiveSchool(null);
      return true;
    }
    return false;
  };

  const loginAsSchool = (schoolCodeOrId: string, password?: string): boolean => {
    const school = INITIAL_REGISTERED_SCHOOLS.find(
      (s) => s.code.toLowerCase() === schoolCodeOrId.toLowerCase() || s.id === schoolCodeOrId
    );

    if (school) {
      const session = { authenticated: true, role: 'school' as AdminRole, school };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      setIsAuthenticated(true);
      setRole('school');
      setActiveSchool(school);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
    setRole('admin');
    setActiveSchool(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        role,
        activeSchool,
        loginAsAdmin,
        loginAsSchool,
        logout,
        isLoading,
        // Legacy
        isAdminAuthenticated: isAuthenticated,
        logoutAdmin: logout,
        loginAdmin: loginAsAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
