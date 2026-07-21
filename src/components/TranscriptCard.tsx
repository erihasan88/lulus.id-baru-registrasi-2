import React from 'react';
import { AcademicTranscript } from '../interfaces/academicTranscript';
import { FileText, Download, Share2, Eye, ShieldCheck, Trash2, Edit } from 'lucide-react';

interface TranscriptCardProps {
  key?: any;
  transcript: AcademicTranscript;
  onViewDetail: (id: string) => void;
  onDownloadPdf?: (id: string) => void;
  onShare?: (id: string) => void;
  role?: 'siswa' | 'guru' | 'admin';
}

export default function TranscriptCard({
  transcript,
  onViewDetail,
  onDownloadPdf,
  onShare,
  role = 'siswa'
}: TranscriptCardProps) {
  // Determine badge styling based on status
  const getStatusBadge = (status: 'Draft' | 'Publish' | 'Dicabut' | 'Diganti') => {
    switch (status) {
      case 'Publish':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      case 'Draft':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Dicabut':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Diganti':
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-150/80 shadow-xs hover:border-pink-400 hover:shadow-xs transition-all duration-300 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Top bar with doc number and status badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">No. Dokumen</span>
            <p className="text-[9.5px] font-extrabold text-slate-700 truncate max-w-[130px] font-mono">
              {transcript.documentNumber}
            </p>
          </div>
          <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black tracking-wider uppercase ${getStatusBadge(transcript.status)}`}>
            {transcript.status}
          </span>
        </div>

        {/* Student Name and Program */}
        <div className="border-t border-b border-slate-50 py-2 space-y-1">
          <p className="text-[11.5px] font-black text-slate-900 line-clamp-1">
            {transcript.studentName}
          </p>
          <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold">
            <span>{transcript.program} • {transcript.kelas}</span>
            <span className="font-mono text-slate-500">{transcript.tahunAjaran}</span>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
          <div className="text-center">
            <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Mapel</span>
            <span className="text-xs font-black text-slate-800">{transcript.subjects.length}</span>
          </div>
          <div className="text-center border-l border-r border-slate-100">
            <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Rata-rata</span>
            <span className="text-xs font-black text-emerald-600">{transcript.averageScore}</span>
          </div>
          <div className="text-center">
            <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Predikat</span>
            <span className="text-[9px] font-black text-slate-700 truncate block mt-0.5">{transcript.predicate}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-50">
        <button
          onClick={() => onViewDetail(transcript.id)}
          className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-150 text-slate-700 rounded-xl text-[9.5px] font-black transition-all cursor-pointer flex items-center justify-center gap-1"
          type="button"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          Lihat Detail
        </button>

        {onDownloadPdf && (transcript.status === 'Publish' || role === 'admin') && (
          <button
            onClick={() => onDownloadPdf(transcript.id)}
            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-100 transition-all cursor-pointer"
            type="button"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        {onShare && (transcript.status === 'Publish' || role === 'admin') && (
          <button
            onClick={() => onShare(transcript.id)}
            className="p-1.5 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-xl border border-pink-100 transition-all cursor-pointer"
            type="button"
            title="Bagikan"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
