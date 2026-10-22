'use client';

import React from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { LogOut } from 'lucide-react';

export function AdminNavbar() {
  const { isAuthenticated, logout } = useAdminAuth();
  if (!isAuthenticated) return null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-[var(--swan)]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight" style={{ color: 'var(--feather)' }}>AceByCraft</span>
          <span className="pill" style={{ background: '#f1dcff', color: 'var(--beetle-shadow)' }}>
            IT COMMAND
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <nav className="hidden md:flex items-center gap-1 text-xs font-black uppercase text-[var(--wolf)] mr-2">
            <Link href="/dashboard" className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--polar)] hover:text-[var(--eel)]">
              Overview
            </Link>
            <Link href="/assessments" className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--polar)] hover:text-[var(--eel)]">
              Assessments
            </Link>
            <Link href="/subjects" className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--polar)] hover:text-emerald-700">
              Subjects
            </Link>
            <Link href="/schools" className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--polar)] hover:text-sky-700">
              Schools
            </Link>
            <Link href="/teachers" className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--polar)] hover:text-emerald-700">
              Teachers
            </Link>
            <Link href="/contributions" className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--polar)] hover:text-purple-700">
              Contributions
            </Link>
            <Link href="/students" className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--polar)] hover:text-[var(--eel)]">
              Students
            </Link>
            <Link href="/airtime" className="px-2.5 py-1.5 rounded-lg hover:bg-[var(--polar)] hover:text-amber-700">
              Airtime
            </Link>
          </nav>

          <button onClick={logout} title="Sign out" className="p-2 rounded-xl text-[var(--hare)] hover:bg-[var(--polar)] cursor-pointer">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
