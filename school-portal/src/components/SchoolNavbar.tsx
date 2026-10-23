'use client';

import React from 'react';
import Link from 'next/link';
import { useSchoolAuth } from '@/lib/school-auth-context';
import { LogOut, GraduationCap } from 'lucide-react';

export function SchoolNavbar() {
  const { school, logoutSchool } = useSchoolAuth();
  if (!school) return null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-[var(--swan)] shadow-xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        <Link href="/dashboard" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="brand-logo text-xl sm:text-2xl">
            AceByCraft
          </span>
          <span className="pill text-[11px] sm:text-xs py-0.5 px-2 font-black uppercase" style={{ background: '#ddf4ff', color: 'var(--macaw-shadow)' }}>
            SCHOOL
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <span className="pill flex items-center gap-1.5 text-xs py-1 px-2.5 min-w-0" style={{ background: '#fff5cc', color: 'var(--fox)' }}>
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span className="font-black truncate max-w-[90px] xs:max-w-[140px] sm:max-w-[220px]">{school.name}</span>
            <span className="text-[11px] opacity-75 hidden xs:inline shrink-0">({school.code})</span>
          </span>

          <button
            onClick={logoutSchool}
            title="Sign out of school console"
            aria-label="Sign out"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--wolf)] hover:text-[var(--cardinal)] hover:bg-rose-50 transition-colors cursor-pointer shrink-0 border border-[var(--swan)] sm:border-0"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
