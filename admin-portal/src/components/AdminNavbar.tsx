'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-context';
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  BookOpen,
  Layers,
  Building2,
  GraduationCap,
  PenTool,
  Users,
  Zap,
} from 'lucide-react';

export function AdminNavbar() {
  const { isAuthenticated, logout } = useAdminAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAuthenticated) return null;

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Assessments', href: '/assessments', icon: BookOpen },
    { label: 'Subjects', href: '/subjects', icon: Layers },
    { label: 'Schools', href: '/schools', icon: Building2 },
    { label: 'Teachers', href: '/teachers', icon: GraduationCap },
    { label: 'Contributions', href: '/contributions', icon: PenTool },
    { label: 'Students', href: '/students', icon: Users },
    { label: 'Airtime', href: '/airtime', icon: Zap },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-[var(--swan)] shadow-xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
          <span className="brand-logo text-xl sm:text-2xl">AceByCraft</span>
          <span className="pill text-[11px] sm:text-xs py-0.5 px-2 font-black uppercase" style={{ background: '#f1dcff', color: 'var(--beetle-shadow)' }}>
            IT COMMAND
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="flex items-center gap-1 sm:gap-2">
          <nav className="hidden lg:flex items-center gap-1 text-xs font-black uppercase text-[var(--wolf)] mr-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[var(--polar)] text-[var(--brand-green-shadow)] font-black'
                      : 'hover:bg-[var(--polar)] hover:text-[var(--eel)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Sign out desktop */}
          <button
            onClick={logout}
            title="Sign out"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase text-[var(--wolf)] hover:text-[var(--cardinal)] hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Exit</span>
          </button>

          {/* Mobile hamburger button (min 44x44 touch target) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-[var(--polar)] border-2 border-[var(--swan)] text-[var(--eel)] hover:bg-gray-100 cursor-pointer transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[var(--cardinal)]" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-black/40 backdrop-blur-xs flex flex-col justify-start">
          <div className="bg-white border-b-4 border-[var(--brand-green)] shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto p-4 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-150">
            <div className="text-xs font-black uppercase tracking-wider text-[var(--wolf)] px-2 pt-1 pb-2 border-b border-[var(--swan)]">
              IT Command Portals & Operations
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-black text-sm transition-all border-2 ${
                      isActive
                        ? 'bg-emerald-50 border-[var(--brand-green)] text-[var(--brand-green-shadow)] shadow-xs'
                        : 'bg-white border-[var(--swan)] text-[var(--eel)] hover:bg-[var(--polar)]'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-[var(--brand-green)] text-white' : 'bg-[var(--polar)] text-[var(--wolf)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-3 mt-2 border-t border-[var(--swan)] flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--wolf)]">Logged into IT Console</span>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="btn btn-red !py-2 !px-4 text-xs font-black flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
