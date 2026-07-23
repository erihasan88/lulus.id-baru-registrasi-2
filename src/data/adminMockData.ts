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
    tandaTangan: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="50" viewBox="0 0 120 50"><path d="M15,30 Q35,10 55,32 T95,15" fill="none" stroke="%23334155" stroke-width="2.5" stroke-linecap="round"/></svg>'
  },
  {
    id: 'GUR-202',
    nama: 'Pak Joko, M.Pd.',
    nip: '198011032005011002',
    mapel: 'Matematika',
    kelas: 'Kelas X, XI Paket C',
    materiCount: 4,
    tugasCount: 2,
    penilaianCount: 10,
    status: 'Aktif',
    username: 'joko',
    password: '123456',
    mapels: ['Matematika', 'Ekonomi'],
    kelasList: ['Kelas X - Paket C', 'Kelas XI - Paket C'],
    rekeningType: 'DANA',
    rekeningNomor: '081234567890',
    rekeningNama: 'Joko Purnomo',
    isWaliKelas: true,
    tandaTangan: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="50" viewBox="0 0 120 50"><path d="M12,32 C25,5 45,40 65,18 S85,12 98,28" fill="none" stroke="%231e3a8a" stroke-width="2.5" stroke-linecap="round"/></svg>'
  },
  {
    id: 'GUR-203',
    nama: 'Bu Endang, S.Pd.',
    nip: '198807242015042001',
    mapel: 'Ilmu Pengetahuan Alam (IPA)',
    kelas: 'Kelas X Paket C, Kelas IX Paket B',
    materiCount: 6,
    tugasCount: 3,
    penilaianCount: 18,
    status: 'Aktif',
    username: 'endang',
    password: '123456',
    mapels: ['Ilmu Pengetahuan Alam (IPA)', 'Biologi'],
    kelasList: ['Kelas X - Paket C', 'Kelas IX - Paket B'],
    rekeningType: 'Bank',
    rekeningNomor: '00823481923',
    rekeningNama: 'Endang Purwati (Mandiri)',
    isWaliKelas: false
  },
  {
    id: 'GUR-204',
    nama: 'Pak Ahmad, S.Pd.',
    nip: '199102182020081004',
    mapel: 'Sejarah Indonesia',
    kelas: 'Kelas XII Paket C',
    materiCount: 5,
    tugasCount: 1,
    penilaianCount: 8,
    status: 'Aktif',
    username: 'ahmad',
    password: '123456',
    mapels: ['Sejarah Indonesia', 'Sosiologi'],
    kelasList: ['Kelas XII - Paket C'],
    rekeningType: 'Bank',
    rekeningNomor: '012938192301',
    rekeningNama: 'Ahmad Fauzi (BNI)',
    isWaliKelas: true,
    tandaTangan: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="50" viewBox="0 0 120 50"><path d="M15,22 C35,35 50,12 65,28 T95,22" fill="none" stroke="%23581c87" stroke-width="2.5" stroke-linecap="round"/></svg>'
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
    siswaIds: ['SIS-1001', 'SIS-1004']
  },
  {
    id: 'CLS-002',
    nama: 'Kelas XI - Paket C',
    jenjang: 'Kelas XI (11)',
    paket: 'Paket C',
    waliKelasId: 'GUR-202',
    waliKelasNama: 'Pak Joko, M.Pd.',
    siswaIds: []
  },
  {
    id: 'CLS-003',
    nama: 'Kelas XII - Paket C',
    jenjang: 'Kelas XII (12)',
    paket: 'Paket C',
    waliKelasId: 'GUR-204',
    waliKelasNama: 'Pak Ahmad, S.Pd.',
    siswaIds: []
  },
  {
    id: 'CLS-004',
    nama: 'Kelas IX - Paket B',
    jenjang: 'Kelas IX (9)',
    paket: 'Paket B',
    waliKelasId: 'GUR-203',
    waliKelasNama: 'Bu Endang, S.Pd.',
    siswaIds: ['SIS-1002']
  },
  {
    id: 'CLS-005',
    nama: 'Kelas VI - Paket A',
    jenjang: 'Kelas VI (6)',
    paket: 'Paket A',
    waliKelasId: 'GUR-201',
    waliKelasNama: 'Bu Rina, S.Pd.',
    siswaIds: ['SIS-1003']
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
  
  // Budi Santoso (SIS-1002) - Paket B
  { id: 'SC-05', siswa: 'SIS-1002', kompetensi: 'COM-05', status: 'tercapai', nilai: 80, bukti: 'Pengukuran_Lahan_Pythagoras.pdf', catatan_guru: 'Metode pengukuran sudah benar, penulisan satuan diperjelas.' },
  { id: 'SC-06', siswa: 'SIS-1002', kompetensi: 'COM-06', status: 'proses', nilai: null, bukti: 'Ekosistem_Sawah_Agrabinta.pdf', catatan_guru: 'Harap menambahkan foto rujukan biotik abiotik secara riil.' },

  // Ani Lestari (SIS-1003) - Paket A
  { id: 'SC-07', siswa: 'SIS-1003', kompetensi: 'COM-07', status: 'tercapai', nilai: 85, bukti: 'Membaca_Dongeng_Ani.mp4', catatan_guru: 'Pelafalan kata sudah sangat jelas dan ekspresif. Hebat Ani!' }
];

export const initialSKKReports: any[] = [
  { id: 'REP-01', siswa: 'SIS-1001', total_skk: 14, tercapai: 8, persentase: 57 },
  { id: 'REP-02', siswa: 'SIS-1002', total_skk: 6, tercapai: 3, persentase: 50 },
  { id: 'REP-03', siswa: 'SIS-1003', total_skk: 2, tercapai: 2, persentase: 100 }
];

