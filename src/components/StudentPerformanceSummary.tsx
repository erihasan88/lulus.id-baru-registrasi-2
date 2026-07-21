import React from 'react';
import { Award, BookOpen, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface StudentPerformanceSummaryProps {
  totalSubjects: number;
  passedSubjects: number;
  failedSubjects: number;
  averageScore: number;
  predicate: string;
}

export default function StudentPerformanceSummary({
  totalSubjects,
  passedSubjects,
  failedSubjects,
  averageScore,
  predicate
}: StudentPerformanceSummaryProps) {
  // Determine gradient / text based on average
  const getAverageStatus = (avg: number) => {
    if (avg >= 85) return { bg: 'bg-emerald-500/10 border-emerald-100', text: 'text-emerald-700', label: 'LUAR BIASA' };
    if (avg >= 75) return { bg: 'bg-pink-500/10 border-pink-100', text: 'text-pink-700', label: 'BAIK SEKALI' };
    return { bg: 'bg-amber-500/10 border-amber-100', text: 'text-amber-700', label: 'CUKUP' };
  };

  const statusStyle = getAverageStatus(averageScore);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Average Score Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between hover:border-pink-400 transition-all group duration-300">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rata-rata Nilai</span>
          <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-800">{averageScore}</span>
            <span className="text-[10px] font-bold text-slate-400">/ 100</span>
          </div>
          <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full border text-[8px] font-black tracking-wider uppercase ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
        </div>
      </div>

      {/* Total Subjects Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between hover:border-[#00a884] transition-all group duration-300">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mata Pelajaran</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-[#00a884] group-hover:scale-105 transition-transform">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-black text-slate-800">{totalSubjects}</p>
          <p className="text-[9.5px] font-bold text-slate-400 leading-none mt-1">
            Total Kurikulum Aktif
          </p>
        </div>
      </div>

      {/* Passed Subjects Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between hover:border-emerald-400 transition-all group duration-300">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status Lulus</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-600">✓ {passedSubjects}</span>
          </div>
          <p className="text-[9.5px] font-bold text-slate-400 leading-none mt-1">
            Mata Pelajaran Tuntas
          </p>
        </div>
      </div>

      {/* Needs Improvement Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all group duration-300">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Perlu Perbaikan</span>
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${failedSubjects > 0 ? 'text-amber-500' : 'text-slate-500'}`}>
              ⚠ {failedSubjects}
            </span>
          </div>
          <p className="text-[9.5px] font-bold text-slate-400 leading-none mt-1">
            Mata Pelajaran Perlu Perbaikan
          </p>
        </div>
      </div>
    </div>
  );
}
