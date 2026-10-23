'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { LogOut, GraduationCap } from 'lucide-react';

export function Navbar() {
  const { student, logout } = useAuth();
  if (!student) return null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-[var(--swan)] shadow-xs">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        <Link href="/dashboard" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="brand-logo text-xl sm:text-2xl">
            AceByCraft
          </span>
          <span
            className="pill text-[10px] sm:text-xs py-0.5 px-2 font-black uppercase shrink-0"
            style={{ background: '#d7ffb8', color: 'var(--feather-shadow)' }}
          >
            NIGERIA
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <span
            className="pill text-xs py-1 px-2.5 shrink-0 whitespace-nowrap"
            style={{ background: '#fff5cc', color: 'var(--fox)' }}
            title="Airtime won"
          >
            ⚡ ₦{student.totalAirtimeWonNgn || 0}
          </span>
          <span
            className="hidden sm:inline-flex items-center gap-1.5 pill text-xs py-1 px-2.5 max-w-[140px] md:max-w-[220px] shrink min-w-0"
            style={{ background: '#ddf4ff', color: 'var(--macaw-shadow)' }}
            title={student.schoolName}
          >
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span className="font-black truncate">{student.schoolName}</span>
          </span>
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-[var(--wolf)] hover:text-[var(--cardinal)] hover:bg-rose-50 transition-colors cursor-pointer shrink-0 border border-[var(--swan)] sm:border-0"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
