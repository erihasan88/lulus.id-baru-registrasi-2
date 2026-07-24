export type Role = 'siswa' | 'guru' | 'admin';

export interface ProgramBelajar {
  id: string;
  nama: string;
  jenjang: 'Paket A' | 'Paket B' | 'Paket C';
  sistemBelajar: 'Reguler' | 'Karyawan';
  lamaBelajar: string;
  totalSkk: number;
  distribusiSkk: { [semester: string]: number };
  mapelWajib: string[];
  mapelPilihan: string[];
}

export interface BebanBelajar {
  id: string;
  programBelajarId: string;
  programBelajarNama: string;
  jenjang: 'Paket A' | 'Paket B' | 'Paket C';
  sistemBelajar: 'Reguler' | 'Karyawan';
  tingkat: string; // e.g. "Kelas 10", "Kelas 11", "Kelas 12"
  semester: string; // e.g. "Semester 1", "Semester 2", ...
  targetSkk: number;
  tahunBerlaku: string;
  statusAktif: boolean;
}

export interface Student {
  id: string;
  nama: string;
  nik: string;
  nisn: string;
  kk: string;
  jk: string;
  tempatLahir: string;
  tglLahir: string;
  program: 'Paket A' | 'Paket B' | 'Paket C';
  kelas: string;
  tipeKelas?: 'Reguler' | 'Karyawan' | string;
  tahunAjaran: string;
  alamat: string;
  ibu: string;
  pekerjaanIbu?: string;
  ayah: string;
  pekerjaanAyah?: string;
  status: 'Aktif' | 'Nonaktif' | 'Menunggu Verifikasi';
  dokumen: {
    foto: string;
    ktp: string;
    kk: string;
    ijazah: string;
  };
  pendaftarBaru?: boolean;
  username?: string;
  password?: string;
  namaWali?: string;
  hubunganWali?: string;
  tandaTanganOrangTua?: string;
  tandaTanganSiswa?: string;
  pendaftaranData?: RegistrationData;
  catatanVerifikasi?: string;
  riwayatVerifikasi?: Array<{
    admin: string;
    tanggal: string;
    jam: string;
    status: string;
    catatan: string;
  }>;
}

export interface Teacher {
  id: string;
  nama: string;
  nip: string;
  mapel: string;
  kelas: string;
  materiCount: number;
  tugasCount: number;
  penilaianCount: number;
  status: 'Aktif' | 'Nonaktif';
  username?: string;
  password?: string;
  mapels?: string[];
  kelasList?: string[];
  rekeningType?: 'Bank' | 'DANA';
  rekeningNomor?: string;
  rekeningNama?: string;
  isWaliKelas?: boolean;
  tandaTangan?: string;
  qrTandaTangan?: string;
  photo?: string;
}

export interface ClassData {
  id: string;
  nama: string;
  jenjang: string;
  paket: 'Paket A' | 'Paket B' | 'Paket C';
  waliKelasId: string;
  waliKelasNama: string;
  siswaIds: string[];
  programId?: string;
  tingkat?: string;
  targetSkk?: number;
  sistemBelajar?: string;
}

export interface SystemNotification {
  id: string;
  type: 'pendaftaran' | 'dokumen' | 'materi' | 'status';
  title: string;
  text: string;
  time: string;
  read: boolean;
}

export interface Subject {
  id: string;
  name: string;
  category: string;
  materiCount: number;
  progress: number;
  textBody: string;
  videoUrl?: string;
  duration?: string;
  kkm: number;
  grade: number;
  status: 'Lulus' | 'Perlu Perbaikan' | 'Aktif' | 'Tidak Aktif' | string;
  capaianUtama: string;
  bimbinganUtama: string;
  program?: 'Paket A' | 'Paket B' | 'Paket C' | string;
  kelas?: string;
  pertemuan?: number;
  tanggalPublikasi?: string;
  isDraft?: boolean;
  viewsCount?: number;
  semester?: string;
  tahunAjaran?: string;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
  fase?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | string;
  cpId?: string;
  isMateri?: boolean;
  mataPelajaran?: string;
  fileName?: string;
  fileUrl?: string;
  lampiranName?: string;
  lampiranUrl?: string;
  bobotSkk?: number;
  bobot_skk?: number;
  isWajib?: boolean;
  sistemBelajar?: string;
}

export interface Task {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
  startDate?: string;
  status: 'Draft' | 'Dipublikasikan' | 'Ditutup';
  description?: string;
  program: string;
  kelas: string;
  semester: string;
  tahunAjaran: string;
  pertemuan?: number;
  lampiran?: string;
  videoUrl?: string;
  maxGrade?: number;
  bobotNilai?: number;
  createdDate?: string;
  teacherId?: string;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  kelas: string;
  subject: string;
  taskTitle: string;
  submissionDate: string;
  fileSize?: string;
  status: 'Menunggu Penilaian' | 'Sudah Dinilai' | 'Revisi' | 'Draft';
  submissionText?: string;
  submissionFiles?: { name: string; type: string; size: string }[];
  grade?: number; // nilai awal dari Kelola Tugas
  finalGrade?: number; // nilai final setelah koreksi di Input Nilai
  feedback?: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  status: 'Lunas' | 'Menunggu Verifikasi' | 'Belum Bayar';
  createdDate: string;
  dueDate: string;
}

export interface Question {
  id: string;
  type: 'pilihan_ganda' | 'essay';
  questionText: string;
  options?: string[]; // for pilihan_ganda
  correctAnswer?: string; // correct option index/text or sample essay answer
  subject: string;
  difficulty?: 'Mudah' | 'Sedang' | 'Sulit';
  createdDate?: string;
}

export interface Exam {
  id: string | number;
  title: string; // Keep for backwards compatibility
  namaUjian?: string; // From Guru's daftarUjian
  subject: string; // Keep for backwards compatibility
  mataPelajaran?: string; // From Guru's daftarUjian
  duration: number; // in minutes, keep for backwards compatibility
  durasi?: number; // From Guru's daftarUjian
  status: 'Aktif' | 'Draft' | 'Selesai' | 'Terjadwal' | 'Berlangsung';
  questions: Question[];
  createdDate?: string;
  program?: string;
  kelas?: string;
  semester?: string;
  tahunAjaran?: string;
  jenisUjian?: string;
  jumlahSoal?: number;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  jumlahPeserta?: number;
  sudahMengerjakan?: number;
  belumMengerjakan?: number;
  soalIds?: (string | number)[];
  nilaiRataRata?: number;
  nilaiTertinggi?: number;
  nilaiTerendah?: number;
  nilaiMinimum?: number;
  acakSoal?: boolean;
  acakJawaban?: boolean;
  tampilkanNilai?: boolean;
}

export interface PaymentRecord {
  date: string;
  amount: number;
  method: string;
  status: 'LUNAS' | 'VERIFIKASI' | 'GAGAL';
}

export interface PaymentMethod {
  id: string;
  name: string;
  provider: 'qris' | 'bca' | 'mandiri' | 'bni' | 'gopay' | 'ovo' | 'lainnya';
  isActive: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface RegistrationData {
  nama: string;
  nik: string;
  nisn: string;
  tempat_lahir: string;
  tgl_lahir: string;
  jk: string;
  agama: string;
  kewarganegaraan: string;
  no_hp: string;
  email: string;
  alamat: string;
  rt: string;
  rw: string;
  dusun: string;
  desa: string;
  kecamatan: string;
  kota: string;
  provinsi: string;
  kodepos: string;
  pendidikan: string;
  sekolah_asal: string;
  tahun_lulus: string;
  no_ijazah: string;
  program: string;
  nama_ayah: string;
  nik_ayah: string;
  pekerjaan_ayah: string;
  pendidikan_ayah: string;
  nama_ibu: string;
  nik_ibu: string;
  pekerjaan_ibu: string;
  pendidikan_ibu: string;
  gunakan_wali: boolean;
  nama_wali: string;
  hubungan_wali: string;
  hp_wali: string;
  doc_foto: string;
  doc_ktp: string;
  doc_kk: string;
  doc_ijazah: string;
  doc_akta: string;
  sig_siswa_saved: boolean;
  sig_siswa_data?: string;
  sig_ortu_saved: boolean;
  sig_ortu_data?: string;
  metode_pembayaran: string;
  tipe_kelas?: 'Reguler' | 'Karyawan' | string;
}

export interface Competency {
  id: string;
  program: 'Paket A' | 'Paket B' | 'Paket C';
  mata_pelajaran: string;
  nama_kompetensi: string;
  bobot_skk: number;
  semester?: string;
  isActive?: boolean;
}

export interface StudentCompetency {
  id: string;
  siswa: string; // ID of the Student
  kompetensi: string; // ID of the Competency
  status: 'belum_tercapai' | 'proses' | 'tercapai';
  nilai: number | null;
  bukti: string | null; // Text / description / fake url of uploaded file/link
  catatan_guru: string | null;
  bukti_jenis?: string;
  bukti_sumber?: string;
}

export interface SKKReport {
  id: string;
  siswa: string; // Student ID or name
  total_skk: number;
  tercapai: number;
  persentase: number;
}

export interface AcademicYear {
  id: string;
  nama: string; // Contoh: "2025/2026", "2026/2027"
  semester: 'Ganjil' | 'Genap';
  tanggalMulai: string;
  tanggalSelesai: string;
  aktif: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Announcement {
  id: string;
  judul: string;
  isi: string; // Rich Text / HTML
  gambar?: string; // Optional cover image (base64 or URL)
  lampiranPdf?: string; // Optional PDF file name
  kategori: string;
  prioritas: 'Tinggi' | 'Sedang' | 'Rendah';
  target: 'Semua' | 'Siswa' | 'Guru' | 'Semua Guru' | 'Semua Siswa' | 'Paket A' | 'Paket B' | 'Paket C' | 'Kelas' | 'Rombel' | 'Mata Pelajaran';
  tanggalPublikasi: string;
  tanggalBerakhir?: string;
  status: 'Aktif' | 'Nonaktif' | 'Draft' | 'Terbit';
  
  // New fields added per requirements
  createdBy: string; // Name of the creator
  createdRole: Role; // Role of the creator (siswa/guru/admin)
  createdAt: string;
  updatedAt: string;
  program?: 'Paket A' | 'Paket B' | 'Paket C';
  kelas?: string;
  rombel?: string;
  mataPelajaran?: string;
  foto?: string;
  pdf?: string;
  video?: string;
  youtubeLink?: string;
}

// Original LibraryBook for existing features (do not change!)
export interface LibraryBook {
  id: string;
  judul: string;
  penulis: string;
  mataPelajaran: string;
  program: 'Paket A' | 'Paket B' | 'Paket C' | 'Semua';
  kelas: string;
  deskripsi: string;
  cover?: string;
  filePdf?: string;
  statusPublikasi: 'Publik' | 'Draft';
  downloadCount?: number;
}

// New interfaces for Perpustakaan Digital feature
export interface DigitalLibraryCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DigitalLibraryBook {
  id: string;
  title: string;
  description: string;
  author: string;
  publisher?: string;
  year?: number;
  isbn?: string;
  category: 'Modul Pembelajaran' | 'Ebook' | 'Buku Referensi' | 'Buku Paket' | 'Jurnal' | 'Panduan';
  subject?: string;
  program: 'Paket A' | 'Paket B' | 'Paket C' | 'Semua';
  kelas: string;
  semester: 'Ganjil' | 'Genap' | 'Semua';
  cover?: string;
  file?: string;
  fileUrl?: string;
  fileType: 'pdf' | 'epub';
  keywords?: string[];
  status: 'Draft' | 'Publish';
  createdBy: string;
  createdRole: Role;
  createdAt: string;
  updatedAt: string;
  views: number;
  downloads: number;
  averageRating: number;
  totalRatings: number;
}

export interface DigitalLibraryFavorite {
  id: string;
  bookId: string;
  userId: string;
  userRole: Role;
  createdAt: string;
}

export interface DigitalLibraryHistory {
  id: string;
  bookId: string;
  userId: string;
  userRole: Role;
  readAt: string;
  lastPage?: number;
}

export interface DigitalLibraryRating {
  id: string;
  bookId: string;
  userId: string;
  userRole: Role;
  rating: 1 | 2 | 3 | 4 | 5;
  review?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceMeeting {
  id: string;
  tanggal: string;
  waktu: string;
  mataPelajaran: string;
  kelas: string;
  program: 'Paket A' | 'Paket B' | 'Paket C' | 'Semua';
  tahunAjaranId: string;
  semester: 'Ganjil' | 'Genap';
  guruId: string;
  materiPokok: string;
}

export interface StudentAttendance {
  id: string;
  meetingId: string;
  studentId: string;
  studentName: string;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alfa';
  catatan?: string;
  updatedAt?: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  program: string;
  kelas: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  jenis: 'Izin' | 'Sakit';
  alasan: string;
  buktiPendukung: string; // PDF / Image name
  status: 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak';
  catatanGuru?: string;
  guruId?: string;
  createdAt: string;
}

export interface AcademicDocument {
  id: string;
  studentId: string;
  studentName: string;
  nisn: string;
  program: 'Paket A' | 'Paket B' | 'Paket C' | 'Semua' | string;
  kelas: string;
  tahunLulus: string;
  documentType: 'Ijazah' | 'SKL' | 'Transkrip Nilai' | 'Sertifikat' | 'Piagam' | 'Surat Keterangan' | 'Dokumen Lainnya';
  documentNumber: string;
  verificationCode?: string;
  issueDate: string;
  title: string;
  description?: string;
  file: string;
  fileUrl?: string;
  thumbnail?: string;
  status: 'Draft' | 'Publish' | 'Dicabut' | 'Diganti';
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  downloads: number;
  views: number;
}

export interface VerificationDocument {
  id: string;
  verificationCode: string;
  documentType: string; // 'e-Rapor' | 'Ijazah' | 'SKL' | 'Transkrip Nilai' | 'Sertifikat' | 'Formulir PPDB' | 'Dokumen Akademik' | string
  studentId: string;
  studentName: string;
  studentNisn?: string;
  studentProgram?: string;
  studentKelas?: string;
  issueDate: string; // tanggal terbit
  signerName: string; // pejabat pengesahan (nama pejabat)
  signerRole: string; // pejabat pengesahan (jabatan, e.g., Kepala PKBM)
  signerNip?: string;
  isValid: boolean; // status valid (true = Valid/Aktif, false = Tidak Valid/Dicabut)
  snapshotData?: any; // snapshot data dokumen
  createdAt: string;
  notes?: string;
}

export type LearningActivityType =
  | 'OPEN_MATERIAL'
  | 'WATCH_VIDEO'
  | 'DOWNLOAD_MODULE'
  | 'SUBMIT_TASK'
  | 'COMPLETE_TASK'
  | 'TAKE_CBT'
  | 'DISCUSSION';

export interface LearningActivity {
  id: string;
  studentId: string;
  studentName: string;
  kelas: string;
  program: 'Paket A' | 'Paket B' | 'Paket C';
  subject: string;
  activityType: LearningActivityType;
  title: string;
  timestamp: string;
  points: number; // point/score contribution, e.g. 10 or 15 points
}




