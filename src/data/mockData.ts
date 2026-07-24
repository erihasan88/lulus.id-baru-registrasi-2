
import { Subject, Task, ChatMessage, Bill, PaymentRecord } from '../types';

export const mockSubjects: Subject[] = [
  {
    id: 'sub-1',
    name: 'Bahasa Indonesia',
    category: 'Mata Pelajaran Wajib',
    materiCount: 12,
    progress: 75,
    textBody: 'Materi pembelajaran Bahasa Indonesia untuk Paket C kelas X',
    duration: '2 Jam 30 Menit',
    kkm: 75,
    grade: 82,
    status: 'Aktif',
    capaianUtama: 'Memahami teks eksplanasi dan prosedur',
    bimbinganUtama: 'Pertahankan prestasi belajar Anda',
    program: 'Paket C',
    fase: 'E',
    cpId: 'cp-001',
    bobotSkk: 4,
    isWajib: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sub-2',
    name: 'Matematika Kesetaraan',
    category: 'Mata Pelajaran Wajib',
    materiCount: 10,
    progress: 60,
    textBody: 'Aljabar linear dan persamaan kuadrat',
    duration: '2 Jam',
    kkm: 75,
    grade: 70,
    status: 'Aktif',
    capaianUtama: 'Memahami konsep aljabar dasar',
    bimbinganUtama: 'Lakukan latihan soal tambahan',
    program: 'Paket C',
    fase: 'E',
    cpId: 'cp-002',
    bobotSkk: 4,
    isWajib: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sub-3',
    name: 'Ilmu Pengetahuan Alam (IPA)',
    category: 'Mata Pelajaran Wajib',
    materiCount: 15,
    progress: 90,
    textBody: 'Biologi dasar dan kimia organik',
    duration: '3 Jam',
    kkm: 75,
    grade: 91,
    status: 'Aktif',
    capaianUtama: 'Memahami konsep sel dan ekosistem',
    bimbinganUtama: 'Lanjutkan eksplorasi materi lanjutan',
    program: 'Paket C',
    fase: 'E',
    cpId: 'cp-003',
    bobotSkk: 4,
    isWajib: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

export const mockTasks: Task[] = [
  {
    id: 'TSK-01',
    subject: 'Bahasa Indonesia',
    title: 'Menulis Ringkasan Teks Eksplanasi',
    dueDate: '2026-07-30',
    status: 'Dipublikasikan',
    description: 'Buat ringkasan dari teks eksplanasi yang telah dipelajari.',
    program: 'Paket C',
    kelas: 'Kelas X - Paket C',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027'
  },
  {
    id: 'TSK-02',
    subject: 'Matematika Kesetaraan',
    title: 'Latihan Soal Aljabar',
    dueDate: '2026-07-28',
    status: 'Dipublikasikan',
    description: 'Kerjakan soal-soal persamaan kuadrat halaman 45-47.',
    program: 'Paket C',
    kelas: 'Kelas X - Paket C',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027'
  }
];

export const initialChatMessages: ChatMessage[] = [
  {
    role: 'model',
    text: 'Halo Fajar! Saya Lulus AI, asisten pembelajaranmu. Ada yang ingin kamu tanyakan hari ini?'
  }
];

export const mockBills: Bill[] = [
  {
    id: 'INV-2026-06-001',
    name: 'SPP Bulan Juni 2026',
    amount: 150000,
    status: 'Lunas',
    createdDate: '2026-05-20',
    dueDate: '2026-06-10'
  },
  {
    id: 'INV-2026-07-001',
    name: 'SPP Bulan Juli 2026',
    amount: 150000,
    status: 'Belum Bayar',
    createdDate: '2026-06-20',
    dueDate: '2026-07-10'
  }
];

export const mockPaymentRecords: PaymentRecord[] = [
  {
    date: '2026-06-05',
    amount: 150000,
    method: 'Transfer Virtual Account BCA',
    status: 'LUNAS'
  },
  {
    date: '2026-05-08',
    amount: 150000,
    method: 'QRIS Instan',
    status: 'LUNAS'
  }
];
