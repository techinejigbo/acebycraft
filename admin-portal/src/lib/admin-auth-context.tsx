'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminAuthContextType {
  isAuthenticated: boolean;
  loginAsAdmin: (passphrase: string) => Promise<{ success: boolean; error?: string }>;
  setupAdminPasscode: (passphrase: string) => Promise<{ success: boolean; error?: string }>;
  changePasscode: (currentPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isSetupNeeded: boolean;
  // Compatibility getters
  isAdminAuthenticated: boolean;
  logoutAdmin: () => Promise<void>;
  loginAdmin: (passphrase: string) => Promise<{ success: boolean; error?: string }>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false,
  loginAsAdmin: async () => ({ success: false }),
  setupAdminPasscode: async () => ({ success: false }),
  changePasscode: async () => ({ success: false }),
  logout: async () => {},
  isLoading: true,
  isSetupNeeded: false,
  isAdminAuthenticated: false,
  logoutAdmin: async () => {},
  loginAdmin: async () => ({ success: false }),
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSetupNeeded, setIsSetupNeeded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth');
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(Boolean(data.authenticated));
        setIsSetupNeeded(Boolean(data.isSetupNeeded));
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const loginAsAdmin = async (passphrase: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setIsSetupNeeded(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Authentication failed' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      return { success: false, error: msg };
    }
  };

  const setupAdminPasscode = async (passphrase: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup', passphrase }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setIsSetupNeeded(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Setup failed' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      return { success: false, error: msg };
    }
  };

  const changePasscode = async (currentPassphrase: string, newPassphrase: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-passcode',
          currentPassphrase,
          newPassphrase,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Passcode change failed' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
    } catch {
      // Ignore
    } finally {
      setIsAuthenticated(false);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        loginAsAdmin,
        setupAdminPasscode,
        changePasscode,
        logout,
        isLoading,
        isSetupNeeded,
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
