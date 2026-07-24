export interface TranscriptSubject {
  id: string;
  name: string;
  category: string;
  kkm: number;
  score: number; // Nilai Akhir
  status: 'Lulus' | 'Perlu Perbaikan';
}

export interface AcademicTranscript {
  id: string;
  studentId: string;
  studentName: string;
  nisn: string;
  nipd: string; // NIPD / NIS
  program: 'Paket A' | 'Paket B' | 'Paket C';
  kelas: string;
  tahunAjaran: string;
  semester: string;
  subjects: TranscriptSubject[];
  kkm: number; // KKM rata-rata or standard
  score: number; // Total nilai
  status: 'Draft' | 'Publish' | 'Dicabut' | 'Diganti';
  averageScore: number;
  predicate: string;
  documentNumber: string;
  issueDate: string;
  verificationCode: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
