import { Student, Teacher, ClassData, SystemNotification } from '../types';

export const initialStudents: Student[] = [];

export const initialTeachers: Teacher[] = [
  {
    id: 'GUR-201',
    nama: 'Bu Rina, S.Pd.',
    nip: '198504122010122003',
    mapel: 'Bahasa Indonesia',
    kelas: 'Kelas X, XI, XII Paket C',
    materiCount: 5,
    tugasCount: 3,
    penilaianCount: 14,
    status: 'Aktif',
    username: 'rina',
    password: '123456',
    mapels: ['Bahasa Indonesia', 'PPKn', 'Sosiologi'],
    kelasList: ['Kelas X - Paket C', 'Kelas XI - Paket C', 'Kelas XII - Paket C'],
    rekeningType: 'Bank',
    rekeningNomor: '52203049182',
    rekeningNama: 'Rina Setyawati (BCA)',
    isWaliKelas: true,
    tandaTangan: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="50"></svg>'
  }
];

export const initialClasses: ClassData[] = [
  {
    id: 'CLS-001',
    nama: 'Kelas X - Paket C',
    jenjang: 'Kelas X (10)',
    paket: 'Paket C',
    waliKelasId: 'GUR-201',
    waliKelasNama: 'Bu Rina, S.Pd.',
    siswaIds: ['SIS-1001']
  },
  {
    id: 'CLS-002',
    nama: 'Kelas XI - Paket C',
    jenjang: 'Kelas XI (11)',
    paket: 'Paket C',
    waliKelasId: 'GUR-201',
    waliKelasNama: 'Bu Rina, S.Pd.',
    siswaIds: []
  },
  {
    id: 'CLS-003',
    nama: 'Kelas XII - Paket C',
    jenjang: 'Kelas XII (12)',
    paket: 'Paket C',
    waliKelasId: 'GUR-201',
    waliKelasNama: 'Bu Rina, S.Pd.',
    siswaIds: []
  },
  {
    id: 'CLS-004',
    nama: 'Kelas IX - Paket B',
    jenjang: 'Kelas IX (9)',
    paket: 'Paket B',
    waliKelasId: 'GUR-201',
    waliKelasNama: 'Bu Rina, S.Pd.',
    siswaIds: []
  },
  {
    id: 'CLS-005',
    nama: 'Kelas VI - Paket A',
    jenjang: 'Kelas VI (6)',
    paket: 'Paket A',
    waliKelasId: 'GUR-201',
    waliKelasNama: 'Bu Rina, S.Pd.',
    siswaIds: []
  }
];

export const initialNotifications: SystemNotification[] = [
  {
    id: 'NOT-001',
    type: 'pendaftaran',
    title: 'Pendaftar Baru Masuk',
    text: 'Dewi Lestari mendaftar di Paket C setara SMA. Berkas menunggu verifikasi.',
    time: '5 menit yang lalu',
    read: false
  },
  {
    id: 'NOT-002',
    type: 'dokumen',
    title: 'Dokumen Unggahan Baru',
    text: 'Hendra Wijaya mengunggah KTP dan Ijazah SMP untuk pendaftaran Paket C.',
    time: '20 menit yang lalu',
    read: false
  },
  {
    id: 'NOT-003',
    type: 'materi',
    title: 'Guru Memublikasikan Modul',
    text: 'Bu Rina memublikasikan Modul baru Bahasa Indonesia untuk Kelas X.',
    time: '1 jam yang lalu',
    read: true
  }
];

export const initialCompetencies: any[] = [
  { id: 'COM-01', program: 'Paket C', mata_pelajaran: 'Matematika', nama_kompetensi: 'Penerapan Fungsi Kuadrat dalam Kehidupan Sehari-hari', bobot_skk: 4 },
  { id: 'COM-02', program: 'Paket C', mata_pelajaran: 'Bahasa Indonesia', nama_kompetensi: 'Penyusunan Teks Opini Editorial Berita Lokal', bobot_skk: 3 },
  { id: 'COM-03', program: 'Paket C', mata_pelajaran: 'Sejarah Indonesia', nama_kompetensi: 'Analisis Sejarah Maritim PKBM di Wilayah Pantai Selatan', bobot_skk: 3 },
  { id: 'COM-04', program: 'Paket C', mata_pelajaran: 'Sosiologi', nama_kompetensi: 'Penelitian Sosial Dampak Digitalisasi Pertanian', bobot_skk: 4 },
  { id: 'COM-05', program: 'Paket B', mata_pelajaran: 'Matematika', nama_kompetensi: 'Penerapan Teorema Pythagoras pada Pengukuran Tanah', bobot_skk: 3 },
  { id: 'COM-06', program: 'Paket B', mata_pelajaran: 'Ilmu Pengetahuan Alam (IPA)', nama_kompetensi: 'Klasifikasi Makhluk Hidup di Ekosistem Sawah', bobot_skk: 3 },
  { id: 'COM-07', program: 'Paket A', mata_pelajaran: 'Bahasa Indonesia', nama_kompetensi: 'Membaca Lancar dan Mengidentifikasi Unsur Dongeng', bobot_skk: 2 }
];

export const initialStudentCompetencies: any[] = [
  // Fajar Pratama (SIS-1001) - Paket C
  { id: 'SC-01', siswa: 'SIS-1001', kompetensi: 'COM-01', status: 'tercapai', nilai: 88, bukti: 'Tugas_Fungsi_Kuadrat_Fajar.pdf', catatan_guru: 'Kerja bagus Fajar! Penerapan fungsi kuadrat digambarkan dengan grafik yang sangat detail.' },
  { id: 'SC-02', siswa: 'SIS-1001', kompetensi: 'COM-02', status: 'proses', nilai: null, bukti: 'Draft_Editorial_Opini_Fajar.docx', catatan_guru: 'Argumen di paragraf kedua perlu didukung data yang lebih objektif. Silakan lengkapi lagi.' },
  { id: 'SC-03', siswa: 'SIS-1001', kompetensi: 'COM-03', status: 'belum_tercapai', nilai: null, bukti: null, catatan_guru: null },
  { id: 'SC-04', siswa: 'SIS-1001', kompetensi: 'COM-04', status: 'tercapai', nilai: 90, bukti: 'Paper_Sosiologi_DigitalisasiTani.pdf', catatan_guru: 'Analisis yang tajam mengenai dampak sosial traktor modern di Agrabinta.' },
  
];

export const initialSKKReports: any[] = [
  { id: 'REP-01', siswa: 'SIS-1001', total_skk: 14, tercapai: 8, persentase: 57 },
];

