'use client';

import React from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { LogOut } from 'lucide-react';

export function AdminNavbar() {
  const { isAuthenticated, role, activeSchool, logout } = useAdminAuth();
  if (!isAuthenticated) return null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-[var(--swan)]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight" style={{ color: 'var(--feather)' }}>acebycraft</span>
          <span className="pill" style={{ background: '#f1dcff', color: 'var(--beetle-shadow)' }}>
            {role === 'school' ? 'SCHOOL' : 'IT UNIT'}
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {role === 'school' && activeSchool && (
            <span className="pill hidden sm:inline-flex" style={{ background: '#ddf4ff', color: 'var(--macaw-shadow)' }}>
              🏫 {activeSchool.name}
            </span>
          )}
          <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="hidden sm:inline text-sm font-black uppercase tracking-wider text-[var(--macaw)]">
            Student app
          </a>
          <button onClick={logout} title="Sign out" className="p-2 rounded-xl text-[var(--hare)] hover:bg-[var(--polar)] cursor-pointer">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
