'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { StudentRow } from '@/types';
import { 
  Users, 
  Download, 
  Search, 
  Award, 
  Zap, 
  Phone, 
  RefreshCw,
  Eye,
  X,
  CheckCircle2,
  Calendar,
  BookOpen,
  GraduationCap,
  Copy,
  Check
} from 'lucide-react';

export default function StudentsDirectoryPage() {
  const router = useRouter();
  const { isAdminAuthenticated, isLoading } = useAdminAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [copiedMatric, setCopiedMatric] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAdminAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAdminAuthenticated, router]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/students').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (e) {
      console.warn('Failed to load students:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadStudents();
    }
  }, [isAdminAuthenticated]);

  const handleExportCSV = () => {
    if (students.length === 0) {
      alert('No student records to export.');
      return;
    }

    const headers = [
      'Student Name',
      'Matriculation Number',
      'Phone Number',
      'Network',
      'Class Level',
      'Total CA Marks',
      'Quizzes Completed',
      'Total Airtime Won (NGN)',
      'Last Active',
    ];

    const rows = students.map((s) => [
      `"${(s.displayName || '').replace(/"/g, '""')}"`,
      `"${s.studentId || (s.uid ? s.uid.slice(0, 10).toUpperCase() : 'N/A')}"`,
      `"${s.phone || 'N/A'}"`,
      `"${s.network || 'MTN'}"`,
      `"${s.schoolClass || 'Senior Secondary'}"`,
      (s.totalCaScore ?? s.averageScorePercentage ?? 0).toFixed(1),
      s.completedAssessmentsCount ?? s.totalAssessmentsTaken ?? 0,
      s.totalAirtimeWonNgn ?? 0,
      `"${s.lastActive ? new Date(s.lastActive).toLocaleDateString() : 'Active'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Student_Score_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMatric(true);
    setTimeout(() => setCopiedMatric(false), 2000);
  };

  if (isLoading || !isAdminAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const filteredStudents = students.filter((s) => {
    const nameMatch = (s.displayName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const idMatch = (s.studentId || s.uid || '').toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = (s.phone || '').includes(searchQuery);

    const matchesClass = classFilter === 'ALL' || s.schoolClass === classFilter;
    return (nameMatch || idMatch || phoneMatch) && matchesClass;
  });

  const uniqueClasses = Array.from(new Set(students.map((s) => s.schoolClass).filter(Boolean)));
  const totalCohortCA = students.reduce((acc, s) => acc + (s.totalCaScore ?? s.averageScorePercentage ?? 0), 0);
  const totalAirtimeDisbursed = students.reduce((acc, s) => acc + (s.totalAirtimeWonNgn ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center space-x-2">
            <Users className="w-7 h-7 text-emerald-600" />
            <span>Student Continuous Assessment Registry</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track student enrollment, cumulative CA score standings, and export official grade sheets
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadStudents}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Registry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="py-2.5 px-4 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm flex items-center space-x-2 shadow-md shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CA Sheet (CSV)</span>
          </button>
        </div>
      </div>

      {/* Cohort Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Students</span>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-3xl font-black text-slate-900">{students.length}</span>
            <span className="text-xs text-slate-500 font-medium">registered</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total CA Marks Earned</span>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-3xl font-black text-emerald-700">{totalCohortCA.toFixed(1)}</span>
            <span className="text-xs text-slate-500 font-medium">cohort points</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-amber-100 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Airtime Incentives</span>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-3xl font-black text-amber-700">₦{totalAirtimeDisbursed.toLocaleString()}</span>
            <span className="text-xs text-slate-500 font-medium">credited to date</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, matric, or phone..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Class Filter:</span>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Classes</option>
            {uniqueClasses.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Student Details</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Phone / Network</th>
                <th className="px-6 py-4">Total CA Score</th>
                <th className="px-6 py-4">Attendance</th>
                <th className="px-6 py-4">Airtime Won</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((stud, idx) => (
                  <tr key={stud.uid} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-400 text-xs">
                      #{idx + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-slate-900 text-sm">{stud.displayName || 'Student'}</div>
                      <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5 font-bold">
                        {stud.studentId || (stud.uid ? stud.uid.slice(0, 10).toUpperCase() : 'N/A')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                      {stud.schoolClass || 'Senior Secondary'}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-700">
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{stud.phone || 'N/A'}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5 font-sans font-medium">
                        {stud.network || 'MTN'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-base font-black text-emerald-700">
                        {(stud.totalCaScore ?? stud.averageScorePercentage ?? 0).toFixed(1)} pts
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <span className="font-bold text-slate-900">{stud.completedAssessmentsCount ?? stud.totalAssessmentsTaken ?? 0}</span> tests attended
                    </td>
                    <td className="px-6 py-4">
                      {(stud.totalAirtimeWonNgn ?? 0) > 0 ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Zap className="w-3 h-3 text-amber-600" />
                          <span>₦{stud.totalAirtimeWonNgn}</span>
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">₦0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedStudent(stud)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-bold text-xs flex items-center space-x-1 transition-all cursor-pointer ml-auto border border-slate-200"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Profile</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No matching student records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Profile Inspection Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-emerald-600/30">
                  {selectedStudent.displayName.charAt(0)}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Student Profile
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1">
                    {selectedStudent.displayName}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono">{selectedStudent.studentId}</span>
                    <span>•</span>
                    <span>{selectedStudent.schoolClass || 'Senior Secondary'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total CA Marks</span>
                <span className="text-2xl font-black text-emerald-900 mt-1 block">
                  {(selectedStudent.totalCaScore ?? selectedStudent.averageScorePercentage ?? 0).toFixed(1)}
                </span>
                <span className="text-[10px] text-emerald-600 block">Cumulative Score</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Assessments</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {selectedStudent.completedAssessmentsCount ?? selectedStudent.totalAssessmentsTaken ?? 0}
                </span>
                <span className="text-[10px] text-slate-500 block">Completed Quizzes</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Airtime Won</span>
                <span className="text-2xl font-black text-amber-900 mt-1 block">
                  ₦{selectedStudent.totalAirtimeWonNgn ?? 0}
                </span>
                <span className="text-[10px] text-amber-600 block">Disbursed to line</span>
              </div>
            </div>

            {/* Account Details */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-black uppercase text-slate-700 block">Student Academic & Contact Data</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Matriculation ID</span>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="font-mono font-bold text-slate-800">
                      {selectedStudent.studentId || (selectedStudent.uid ? selectedStudent.uid.slice(0, 10).toUpperCase() : 'N/A')}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedStudent.studentId || selectedStudent.uid || '')}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
                      title="Copy Matriculation Number"
                    >
                      {copiedMatric ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Phone Number & Carrier</span>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">
                    {selectedStudent.phone} ({selectedStudent.network || 'MTN Nigeria'})
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Academic Class</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {selectedStudent.schoolClass || 'SS 3 Science A'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Continuous Assessment Standing</span>
                  <div className="font-bold text-emerald-700 mt-0.5">
                    Active & Eligible for Weekly Rewards
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Registered in AceByCraft Continuous Assessment Platform
              </span>

              <button
                onClick={() => setSelectedStudent(null)}
                className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
