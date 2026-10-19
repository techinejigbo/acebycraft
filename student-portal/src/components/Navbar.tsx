'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { LogOut } from 'lucide-react';

export function Navbar() {
  const { student, logout } = useAuth();
  if (!student) return null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-[var(--swan)]">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight" style={{ color: 'var(--feather)' }}>
            acebycraft
          </span>
          <span className="pill" style={{ background: '#d7ffb8', color: 'var(--feather-shadow)' }}>NIGERIA</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="pill" style={{ background: '#fff5cc', color: 'var(--fox)' }} title="Airtime won">
            ⚡ ₦{student.totalAirtimeWonNgn || 0}
          </span>
          <span className="pill hidden sm:inline-flex" style={{ background: '#ddf4ff', color: 'var(--macaw-shadow)' }}>
            {student.schoolName}
          </span>
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-xl text-[var(--hare)] hover:bg-[var(--polar)] cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
