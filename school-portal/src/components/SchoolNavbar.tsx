'use client';

import React from 'react';
import Link from 'next/link';
import { useSchoolAuth } from '@/lib/school-auth-context';
import { LogOut, GraduationCap } from 'lucide-react';

export function SchoolNavbar() {
  const { school, logoutSchool } = useSchoolAuth();
  if (!school) return null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-[var(--swan)]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight" style={{ color: 'var(--feather)' }}>
            AceByCraft
          </span>
          <span className="pill" style={{ background: '#ddf4ff', color: 'var(--macaw-shadow)' }}>
            SCHOOL
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="pill flex items-center gap-1.5" style={{ background: '#fff5cc', color: 'var(--fox)' }}>
            <GraduationCap className="w-4 h-4" />
            <span className="font-black truncate max-w-[150px] sm:max-w-[220px]">{school.name}</span>
            <span className="text-xs opacity-75">({school.code})</span>
          </span>

          <button
            onClick={logoutSchool}
            title="Sign out of school console"
            className="p-2 rounded-xl text-[var(--hare)] hover:bg-[var(--polar)] cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
