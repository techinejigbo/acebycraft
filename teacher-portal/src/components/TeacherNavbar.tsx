'use client';

import React from 'react';
import Link from 'next/link';
import { useTeacherAuth } from '@/lib/teacher-auth-context';
import { LogOut, PenTool } from 'lucide-react';

export function TeacherNavbar() {
  const { teacher, logoutTeacher } = useTeacherAuth();
  if (!teacher) return null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-[var(--swan)]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="brand-logo text-2xl">
            AceByCraft
          </span>
          <span className="pill" style={{ background: '#d7ffb8', color: 'var(--feather-shadow)' }}>
            TEACHER
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="pill flex items-center gap-1.5" style={{ background: '#fff5cc', color: 'var(--fox)' }}>
            <PenTool className="w-4 h-4" />
            <span className="font-black truncate max-w-[130px] sm:max-w-[180px]">{teacher.name}</span>
            <span className="text-xs opacity-75 font-bold uppercase">({teacher.primarySubject})</span>
          </span>

          <button
            onClick={logoutTeacher}
            title="Sign out of teacher workspace"
            className="p-2 rounded-xl text-[var(--hare)] hover:bg-[var(--polar)] cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
