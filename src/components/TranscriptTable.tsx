import React from 'react';
import { TranscriptSubject } from '../interfaces/academicTranscript';
import { CheckCircle2, AlertCircle, BookOpen, Sparkles } from 'lucide-react';

interface TranscriptTableProps {
  subjects: TranscriptSubject[];
  role?: 'siswa' | 'guru' | 'admin';
}

export default function TranscriptTable({ subjects, role = 'siswa' }: TranscriptTableProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-150/80 shadow-xs overflow-hidden">
      {/* Header Panel */}
      <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
        <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-pink-600" /> Hasil Penilaian Akademik
        </h4>
        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/55">
          {subjects.length} Mata Pelajaran
        </span>
      </div>

      {/* Grid for Mobile and Table for Desktop */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/30">
              <th className="py-3 px-5">Mata Pelajaran</th>
              <th className="py-3 px-4">Kategori</th>
              <th className="py-3 px-4 text-center">KKM</th>
              <th className="py-3 px-4 text-center">Nilai Akhir</th>
              <th className="py-3 px-5 text-right">Status Kelulusan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-[10.5px] font-bold text-slate-700">
            {subjects.map((sub, idx) => {
              const isLulus = sub.score >= sub.kkm;
              return (
                <tr 
                  key={sub.id || idx} 
                  className={`hover:bg-slate-50/50 transition-colors duration-150 ${!isLulus ? 'bg-amber-500/[0.02]' : ''}`}
                >
                  <td className="py-3.5 px-5">
                    <span className="font-extrabold text-slate-900 block">{sub.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {sub.category || 'Mata Pelajaran Wajib'}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-500 font-mono">
                    {sub.kkm}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`font-black text-xs font-mono ${isLulus ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {sub.score}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    {isLulus ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[8.5px] font-black rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Lulus
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[8.5px] font-black rounded-full bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
                        <AlertCircle className="w-3 h-3 text-amber-500" /> Perlu Perbaikan
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
