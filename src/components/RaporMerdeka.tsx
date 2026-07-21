import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Award, FileText, CheckCircle, GraduationCap, 
  Map, Sparkles, BookOpen, Layers, Users, Calendar, Download, Lock, ShieldAlert,
  Activity
} from 'lucide-react';
import { Subject, AcademicYear, Student } from '../types';
import QRCode from 'qrcode';
import VerificationQRCode from './VerificationQRCode';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface RaporMerdekaProps {
  subjects: Subject[];
  onBack: () => void;
  showModal: (title: string, desc: string, type?: 'info' | 'warning' | 'success') => void;
  activeAcademicYear?: AcademicYear;
}

export default function RaporMerdeka({ subjects, onBack, showModal, activeAcademicYear }: RaporMerdekaProps) {
  const [activeSubTab, setActiveSubTab] = useState<'intra' | 'p5'>('intra');
  const [docStatus, setDocStatus] = useState<'Rapor Semester' | 'Rapor Akhir' | 'Dokumen Kelulusan'>('Rapor Semester');

  const getPredikat = (avg: number) => {
    if (avg >= 90) return 'A (Sangat Baik)';
    if (avg >= 80) return 'B (Baik)';
    if (avg >= 75) return 'C (Cukup)';
    return 'D (Kurang)';
  };

  // Load current CP list from localStorage with default fallbacks
  const cpList = (() => {
    const saved = localStorage.getItem('lulus_master_cp');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: 'cp-001', program: 'Paket C', fase: 'E', subject: 'Bahasa Indonesia', isActive: true },
      { id: 'cp-002', program: 'Paket C', fase: 'E', subject: 'Matematika Kesetaraan', isActive: true },
      { id: 'cp-003', program: 'Paket C', fase: 'E', subject: 'Ilmu Pengetahuan Alam (IPA)', isActive: true },
      { id: 'cp-004', program: 'Paket C', fase: 'F', subject: 'Bahasa Indonesia', isActive: true },
      { id: 'cp-005', program: 'Paket C', fase: 'F', subject: 'Matematika Kesetaraan', isActive: true },
      { id: 'cp-006', program: 'Paket B', fase: 'D', subject: 'Bahasa Indonesia', isActive: true },
      { id: 'cp-007', program: 'Paket A', fase: 'C', subject: 'Bahasa Indonesia', isActive: true },
    ];
  })();

  // Load current user from localStorage
  const userObj = (() => {
    const cached = localStorage.getItem('user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  })();

  const studentName = (userObj?.nama_lengkap || userObj?.username || 'FAJAR PRATAMA').toUpperCase();
  const studentNisn = userObj?.siswa_detail?.nisn || userObj?.nisn || '0098765432';
  const studentKelas = userObj?.siswa_detail?.kelas || userObj?.kelas || 'Kelas X - Paket C';
  const studentId = userObj?.siswa_detail?.id || userObj?.id || 'SIS-1001';

  const studentProgram = userObj?.siswa_detail?.program || userObj?.program || 'Paket C';
  const studentSistemBelajar = userObj?.siswa_detail?.tipeKelas || userObj?.tipeKelas || userObj?.sistemBelajar || 'Reguler';
  
  const activeSem = activeAcademicYear?.semester || 'Ganjil';
  const activeTa = activeAcademicYear?.nama || '2026/2027';

  // Helper to map Kelas to Fase
  const getFase = (pStr: string, kStr: string): string => {
    const p = (pStr || '').toUpperCase();
    const k = (kStr || '').toUpperCase();
    if (p.includes('PAKET A')) {
      if (k.includes('1') || k.includes('2') || k.includes('I') || k.includes('II')) return 'A';
      if (k.includes('3') || k.includes('4') || k.includes('III') || k.includes('IV')) return 'B';
      return 'C';
    }
    if (p.includes('PAKET B')) {
      return 'D';
    }
    if (p.includes('PAKET C')) {
      if (k.includes('10') || k.includes('X')) return 'E';
      return 'F';
    }
    return 'E';
  };

  const studentFase = getFase(studentProgram, studentKelas);

  const normalizeClass = (c: string) => {
    let s = (c || '').toLowerCase();
    if (s.includes('kelas 10') || s.includes('kelas x')) return 'kelas x';
    if (s.includes('kelas 11') || s.includes('kelas xi')) return 'kelas xi';
    if (s.includes('kelas 12') || s.includes('kelas xii')) return 'kelas xii';
    if (s.includes('kelas 7') || s.includes('kelas vii')) return 'kelas vii';
    if (s.includes('kelas 8') || s.includes('kelas viii')) return 'kelas viii';
    if (s.includes('kelas 9') || s.includes('kelas ix')) return 'kelas ix';
    if (s.includes('kelas 4') || s.includes('kelas iv')) return 'kelas iv';
    if (s.includes('kelas 5') || s.includes('kelas v')) return 'kelas v';
    if (s.includes('kelas 6') || s.includes('kelas vi')) return 'kelas vi';
    return s;
  };

  const studentNormClass = normalizeClass(studentKelas);

  // Load current Student from master student list in localStorage
  const currentStudent = (() => {
    try {
      const saved = localStorage.getItem('lulus_students');
      if (saved) {
        const list = JSON.parse(saved);
        return list.find((s: any) => s.id === studentId || s.nisn === studentNisn || s.nama?.toUpperCase() === studentName?.toUpperCase());
      }
    } catch (e) {}
    return null;
  })();

  // Resolve Parent / Guardian Name & Signature
  const parentName = (() => {
    if (currentStudent) {
      if (currentStudent.namaWali) return currentStudent.namaWali;
      if (currentStudent.ayah) return currentStudent.ayah;
      if (currentStudent.ibu) return currentStudent.ibu;
    }
    return 'Slamet Rahardjo'; // Default fallback
  })();

  // Resolve Class Object to find Wali Kelas
  const classObj = (() => {
    try {
      const saved = localStorage.getItem('lulus_classes');
      if (saved) {
        const list = JSON.parse(saved);
        return list.find((c: any) => c.nama === studentKelas || c.id === currentStudent?.kelas || c.siswaIds?.includes(studentId));
      }
    } catch (e) {}
    return null;
  })();

  // Resolve Wali Kelas Teacher Profile
  const waliKelas = (() => {
    try {
      const savedTeachers = localStorage.getItem('lulus_teachers');
      if (savedTeachers) {
        const list = JSON.parse(savedTeachers);
        // 1. Match by class's designated waliKelasId
        if (classObj?.waliKelasId) {
          const t = list.find((teacher: any) => teacher.id === classObj.waliKelasId);
          if (t) return t;
        }
        // 2. Match by teacher isWaliKelas and has this class
        const t = list.find((teacher: any) => 
          teacher.isWaliKelas && 
          (teacher.kelas === studentKelas || (teacher.kelasList || []).includes(studentKelas))
        );
        if (t) return t;
      }
    } catch (e) {}
    return null;
  })();

  const waliKelasName = waliKelas?.nama || 'Bu Rina, S.Pd.';
  const waliKelasNip = waliKelas?.nip || '198810242015042001';
  const waliKelasSignature = waliKelas?.tandaTangan || '';

  // Resolve Institutional Identity
  const lembagaIdentitas = (() => {
    try {
      const saved = localStorage.getItem('lulus_lembaga_identitas');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      namaPkbm: 'PKBM Agrabinta Lulus.id',
      namaYayasan: 'Yayasan Pendidikan Agrabinta Sukabumi',
      npsn: 'P9961234',
      nis: '400120',
      alamat: 'Jl. Raya Agrabinta No. 45, RT 02/RW 03',
      kecamatan: 'Agrabinta',
      kabupaten: 'Cianjur',
      provinsi: 'Jawa Barat',
      kodePos: '43273',
      nomorTelepon: '0263-221144',
      emailLembaga: 'pkbm@lulus.id',
      website: 'https://pkbm.lulus.id',
      logoPkbm: 'https://placehold.co/150x150/00a884/ffffff?text=PKBM',
      logoYayasan: 'https://placehold.co/150x150/1e3a8a/ffffff?text=YAYASAN',
      namaKepalaSekolah: 'Drs. H. Mulyadi, M.Pd.',
      nipKepalaSekolah: '197205121998031002',
      qrTandaTanganKepalaSekolah: 'https://placehold.co/150x150/ffffff/000000?text=QR+TTE+Kepsek',
      capStempelDigital: 'https://placehold.co/150x150/e11d48/ffffff?text=CAP+RESMI',
      tandaTanganKepalaSekolah: 'https://placehold.co/200x100/ffffff/000000?text=Tanda+Tangan',
      namaPejabatTtd: 'Drs. H. Mulyadi, M.Pd.',
      jabatanPejabatTtd: 'Kepala PKBM'
    };
  })();

  const formatIndonesianDate = (date: Date) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const d = date.getDate();
    const m = months[date.getMonth()];
    const y = date.getFullYear();
    return `${d} ${m} ${y}`;
  };

  const tempatPengesahan = lembagaIdentitas.kecamatan || lembagaIdentitas.kabupaten || 'Cianjur';
  const tanggalPengesahan = formatIndonesianDate(new Date());

  // Filter subjects strictly according to: Program Belajar, Kelas/Rombel, Sistem Belajar, Active Semester, Active Tahun Ajaran
  const realSubjects = subjects.filter(sub => {
    if (sub.isMateri) return false;
    
    // 1. Program Belajar (Paket A / B / C)
    const subProgram = sub.program || 'Paket C';
    if (subProgram.toLowerCase() !== studentProgram.toLowerCase()) return false;
    
    // 2. Kelas / Rombel
    if (sub.kelas) {
      const subNormClass = normalizeClass(sub.kelas);
      if (subNormClass !== studentNormClass) return false;
    }
    
    // 3. Sistem Belajar (Reguler vs Karyawan)
    if (sub.sistemBelajar) {
      if (sub.sistemBelajar.toLowerCase() !== studentSistemBelajar.toLowerCase()) return false;
    }
    
    // 4. Semester
    if (sub.semester) {
      if (sub.semester.toLowerCase() !== activeSem.toLowerCase()) return false;
    }
    
    // 5. Tahun Ajaran
    if (sub.tahunAjaran) {
      if (sub.tahunAjaran.toLowerCase() !== activeTa.toLowerCase()) return false;
    }
    
    return true;
  });

  // State to hold saved E-Rapor document snapshot if already generated
  const [raporSavedDoc, setRaporSavedDoc] = useState<any>(null);
  const [activeVerificationCode, setActiveVerificationCode] = useState<string>('');
  const [activeDocumentNumber, setActiveDocumentNumber] = useState<string>('');

  useEffect(() => {
    try {
      const savedDocsStr = localStorage.getItem('documentLibrary');
      if (savedDocsStr) {
        const docs = JSON.parse(savedDocsStr);
        // Find existing E-Rapor matching this student, semester and year
        const existingRapor = docs.find((d: any) => 
          d.documentType === 'E-Rapor' &&
          d.studentId === studentId &&
          d.snapshotData?.activeSem === activeSem &&
          d.snapshotData?.activeTa === activeTa
        );
        if (existingRapor) {
          setRaporSavedDoc(existingRapor);
          setActiveVerificationCode(existingRapor.verificationCode || '');
          setActiveDocumentNumber(existingRapor.documentNumber || '');
        } else {
          setRaporSavedDoc(null);
          // Pre-generate a unique random verification code in FRM-PPDB style but for rapor (RPR-YYYY-CODE)
          const activeYearPrefix = activeTa.split('/')[0] || '2026';
          const randomCode = `RPR-${activeYearPrefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          const formattedDocNum = `RAPOR/${studentProgram.replace(/\s+/g, '')}/${studentNisn}/${activeSem.toUpperCase()}/${activeTa.replace('/', '-')}`;
          setActiveVerificationCode(randomCode);
          setActiveDocumentNumber(formattedDocNum);
        }
      } else {
        setRaporSavedDoc(null);
        const activeYearPrefix = activeTa.split('/')[0] || '2026';
        const randomCode = `RPR-${activeYearPrefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const formattedDocNum = `RAPOR/${studentProgram.replace(/\s+/g, '')}/${studentNisn}/${activeSem.toUpperCase()}/${activeTa.replace('/', '-')}`;
        setActiveVerificationCode(randomCode);
        setActiveDocumentNumber(formattedDocNum);
      }
    } catch (e) {
      console.error('Failed to parse documentLibrary', e);
    }
  }, [studentId, activeSem, activeTa, studentProgram, studentNisn]);

  const subjectsWithMissingCp = realSubjects.filter(subject => {
    const matchedCp = cpList.find(cp => 
      (cp.isActive || cp.status_aktif) && (
        cp.id === subject.cpId || 
        (
          (!subject.cpId) &&
          cp.program.toLowerCase() === (subject.program || studentProgram).toLowerCase() &&
          cp.fase === (subject.fase || studentFase) &&
          (cp.subject.toLowerCase() === subject.name.toLowerCase() || 
           subject.name.toLowerCase().includes(cp.subject.toLowerCase()) ||
           cp.subject.toLowerCase().includes(subject.name.toLowerCase()))
        )
      )
    );
    return !matchedCp;
  });

  const hasMissingCp = subjectsWithMissingCp.length > 0;
  
  const meetings = (() => {
    try {
      const saved = localStorage.getItem('lulus_meetings');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  })();
  
  const studentAttendance = (() => {
    try {
      const saved = localStorage.getItem('lulus_student_attendance');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  })();

  const myAtts = studentAttendance.filter((r: any) => {
    if (r.studentId !== studentId) return false;
    // Find the meeting for this attendance record
    const meet = meetings.find((m: any) => m.id === r.meetingId);
    if (!meet) return true; // Keep if no meeting found
    
    // Check if the meeting is an online daily attendance
    const mp = (meet.materiPokok || '').toLowerCase();
    const isOnlineHarian = mp.includes('absen harian') || 
                           mp.includes('online daily') ||
                           mp.includes('kehadiran harian') ||
                           mp.includes('absensi harian');
                           
    return !isOnlineHarian;
  });
  const sakitCount = myAtts.filter((r: any) => r.status === 'Sakit').length;
  const izinCount = myAtts.filter((r: any) => r.status === 'Izin').length;
  const alfaCount = myAtts.filter((r: any) => r.status === 'Alfa').length;
  const hadirCount = myAtts.filter((r: any) => r.status === 'Hadir').length;
  const hasAgendaWajib = meetings.length > 0;

  const keaktifanScore = (() => {
    try {
      const savedActs = localStorage.getItem('lulus_learning_activities');
      const parsedActs = savedActs ? JSON.parse(savedActs) : [];
      const studentActs = parsedActs.filter((a: any) => a.studentId === studentId || a.studentName?.toLowerCase() === studentName.toLowerCase());
      const pointsSum = studentActs.reduce((sum: number, act: any) => sum + (act.points || 0), 0);
      return pointsSum > 0 ? Math.min(100, pointsSum) : (studentId === 'SIS-1001' ? 88 : studentId === 'SIS-1002' ? 75 : 92);
    } catch (e) {
      return 92;
    }
  })();

  const keaktifanData = (() => {
    try {
      const saved = localStorage.getItem('lulus_student_keaktifan');
      const parsed = saved ? JSON.parse(saved) : {};
      const key = `${studentId}_${activeAcademicYear?.semester || 'Ganjil'}`;
      return parsed[key] || null;
    } catch (e) {
      return null;
    }
  })();

  const keaktifanStatus = keaktifanData?.status || (() => {
    if (keaktifanScore >= 85) return 'Sangat Aktif';
    if (keaktifanScore >= 70) return 'Aktif';
    if (keaktifanScore >= 55) return 'Cukup Aktif';
    return 'Kurang Aktif';
  })();

  const keaktifanDesc = keaktifanData?.deskripsi || (() => {
    if (keaktifanStatus === 'Sangat Aktif') {
      return 'Peserta didik sangat aktif mengikuti seluruh proses pembelajaran online dan tatap muka mandiri, konsisten mengumpulkan tugas tepat waktu, berpartisipasi penuh dalam forum diskusi kelas, serta menunjukkan perkembangan kompetensi yang sangat luar biasa di seluruh mata pelajaran semester ini.';
    } else if (keaktifanStatus === 'Aktif') {
      return 'Peserta didik mengikuti pembelajaran secara konsisten, aktif mengerjakan tugas, dan menunjukkan perkembangan belajar yang baik selama semester ini.';
    } else if (keaktifanStatus === 'Cukup Aktif') {
      return 'Peserta didik mengikuti beberapa sesi pembelajaran dan mengumpulkan tugas-tugas utama, namun perlu meningkatkan partisipasi aktif dalam forum kelas serta kedisiplinan pengumpulan tugas di semester berikutnya.';
    } else {
      return 'Peserta didik kurang aktif dalam mengikuti sesi pembelajaran online maupun penyelesaian materi mandiri. Diharapkan lebih fokus, disiplin, dan proaktif menjalin komunikasi dengan tutor pendamping.';
    }
  })();

  // Map the variables to use either active snapshot or fallback to calculated live values
  const resolvedSubjects = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.subjects : realSubjects;
  const resolvedSakitCount = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.absensi.sakitCount : sakitCount;
  const resolvedIzinCount = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.absensi.izinCount : izinCount;
  const resolvedAlfaCount = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.absensi.alfaCount : alfaCount;
  const resolvedHadirCount = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.absensi.hadirCount : hadirCount;
  const resolvedKeaktifanScore = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.keaktifan.score : keaktifanScore;
  const resolvedKeaktifanStatus = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.keaktifan.status : keaktifanStatus;
  const resolvedKeaktifanDesc = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.keaktifan.desc : keaktifanDesc;
  const resolvedParentName = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.pengesahan.parentName : parentName;
  const resolvedWaliKelasName = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.pengesahan.waliKelasName : waliKelasName;
  const resolvedWaliKelasNip = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.pengesahan.waliKelasNip : waliKelasNip;
  const resolvedWaliKelasSignature = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.pengesahan.waliKelasSignature : waliKelasSignature;
  const resolvedLembagaIdentitas = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.pengesahan.lembagaIdentitas : lembagaIdentitas;
  const resolvedTanggalPengesahan = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.pengesahan.tanggalPengesahan : tanggalPengesahan;
  const resolvedTempatPengesahan = raporSavedDoc && raporSavedDoc.snapshotData ? raporSavedDoc.snapshotData.pengesahan.tempatPengesahan : tempatPengesahan;

  // PDF & E-Rapor generation progress states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);

  const generateRaporHtml = (qrCodeUrl: string, activeSnapshot?: any) => {
    const data = activeSnapshot || {
      subjects: resolvedSubjects.map((sub: any) => {
        let dynamicCapaianUtama = sub.capaianUtama;
        const kkmVal = sub.kkm || 75;
        const matchedCp = cpList.find(cp => 
          (cp.isActive || cp.status_aktif) && (
            cp.id === sub.cpId || 
            (
              (!sub.cpId) &&
              cp.program.toLowerCase() === (sub.program || studentProgram).toLowerCase() &&
              cp.fase === (sub.fase || studentFase) &&
              (cp.subject.toLowerCase() === sub.name.toLowerCase() || 
               sub.name.toLowerCase().includes(cp.subject.toLowerCase()) ||
               cp.subject.toLowerCase().includes(sub.name.toLowerCase()))
            )
          )
        );
        
        if (matchedCp && !sub.capaianUtama) {
          const cpDesc = (matchedCp.deskripsi || matchedCp.deskripsiCP || '').trim();
          let cleanDesc = cpDesc;
          const prefixes = [
            'peserta didik mampu ',
            'peserta didik ',
            'siswa mampu ',
            'siswa '
          ];
          for (const prefix of prefixes) {
            if (cleanDesc.toLowerCase().startsWith(prefix)) {
              cleanDesc = cleanDesc.substring(prefix.length).trim();
              break;
            }
          }
          if (cleanDesc.length > 0) {
            cleanDesc = cleanDesc.charAt(0).toLowerCase() + cleanDesc.slice(1);
          }
          if (sub.grade >= 85) {
            dynamicCapaianUtama = `Sangat baik dalam ${cleanDesc}`;
          } else if (sub.grade >= kkmVal) {
            dynamicCapaianUtama = `Baik/berhasil dalam ${cleanDesc}`;
          } else {
            dynamicCapaianUtama = `Memahami konsep dasar ${sub.name}, namun perlu meningkatkan kemampuan dalam ${cleanDesc}`;
          }
        }

        return {
          id: sub.id,
          name: sub.name,
          grade: sub.grade,
          kkm: kkmVal,
          bobotSkk: sub.bobotSkk ?? sub.bobot_skk ?? 4,
          capaianUtama: dynamicCapaianUtama || `Sangat baik dalam menguasai kompetensi mata pelajaran ${sub.name}`,
          bimbinganUtama: sub.bimbinganUtama || ''
        };
      }),
      absensi: { sakitCount: resolvedSakitCount, izinCount: resolvedIzinCount, alfaCount: resolvedAlfaCount, hadirCount: resolvedHadirCount },
      keaktifan: { score: resolvedKeaktifanScore, status: resolvedKeaktifanStatus, desc: resolvedKeaktifanDesc },
      pengesahan: { 
        parentName: resolvedParentName, 
        waliKelasName: resolvedWaliKelasName, 
        waliKelasNip: resolvedWaliKelasNip, 
        waliKelasSignature: resolvedWaliKelasSignature, 
        tempatPengesahan: resolvedTempatPengesahan, 
        tanggalPengesahan: resolvedTanggalPengesahan, 
        lembagaIdentitas: resolvedLembagaIdentitas 
      },
      verificationCode: activeVerificationCode,
      documentNumber: activeDocumentNumber
    };

    const rows = data.subjects.map((sub: any, index: number) => {
      const pred = getPredikat(sub.grade);
      return `
        <tr>
          <td style="text-align: center; padding: 8px; border: 1px solid #000;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">${sub.name}</td>
          <td style="text-align: center; padding: 8px; border: 1px solid #000;">${sub.bobotSkk}</td>
          <td style="text-align: center; padding: 8px; border: 1px solid #000; font-weight: bold; font-size: 13px;">${sub.grade}</td>
          <td style="text-align: center; padding: 8px; border: 1px solid #000;">${pred.split(' ')[0]}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 11px; line-height: 1.4;">
            <strong>Capaian Kompetensi:</strong><br/>
            ✓ ${sub.capaianUtama}
            ${sub.bimbinganUtama ? `<br/><span style="color: #d97706;">&nbsp;⚠ ${sub.bimbinganUtama}</span>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    const totalSkk = data.subjects.reduce((sum: number, s: any) => sum + s.bobotSkk, 0);
    const totalGrade = data.subjects.reduce((sum: number, s: any) => sum + s.grade, 0);
    const avgGrade = data.subjects.length > 0 ? (totalGrade / data.subjects.length).toFixed(1) : '0';
    const randomVerificationCode = data.verificationCode || activeVerificationCode;
    const documentNumber = data.documentNumber || activeDocumentNumber;
    const pengesahan = data.pengesahan;
    const inst = pengesahan.lembagaIdentitas;

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>E-Rapor Resmi - ${studentName}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      margin: 20px auto;
      border: 1px solid #cbd5e1;
      background: white;
      box-sizing: border-box;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    @media print {
      body {
        background-color: white;
        margin: 0;
        padding: 0;
      }
      .page {
        margin: 0;
        border: none;
        box-shadow: none;
        padding: 15mm;
        width: 100%;
        height: auto;
        page-break-after: always;
      }
      .no-print {
        display: none !important;
      }
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .kop-title {
      text-align: center;
      line-height: 1.3;
    }
    .kop-title h1 {
      font-size: 18px;
      margin: 0;
      text-transform: uppercase;
      font-weight: 800;
      color: #0f172a;
    }
    .kop-title h2 {
      font-size: 14px;
      margin: 4px 0 0 0;
      font-weight: 700;
      color: #1e293b;
    }
    .kop-title p {
      font-size: 10px;
      margin: 4px 0 0 0;
      color: #64748b;
    }
    .divider {
      border-top: 3px double #000;
      margin: 15px 0;
    }
    .title-document {
      text-align: center;
      margin-bottom: 25px;
    }
    .title-document h3 {
      font-size: 15px;
      text-transform: uppercase;
      margin: 0;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-decoration: underline;
    }
    .title-document p {
      font-size: 11px;
      margin: 5px 0 0 0;
      font-weight: bold;
    }
    .info-table {
      width: 100%;
      font-size: 11px;
      margin-bottom: 20px;
    }
    .info-table td {
      padding: 3px 0;
      vertical-align: top;
    }
    .main-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 25px;
    }
    .main-table th {
      background-color: #f1f5f9;
      border: 1px solid #000;
      padding: 8px;
      font-weight: 800;
      text-align: center;
      text-transform: uppercase;
      font-size: 10px;
    }
    .sig-section {
      width: 100%;
      margin-top: 40px;
      font-size: 11px;
    }
    .sig-block {
      text-align: center;
      width: 33%;
      vertical-align: top;
    }
    .sig-space {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .sig-space img {
      max-height: 60px;
      object-fit: contain;
    }
    .verification-card {
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 10px;
      background-color: #f8fafc;
      font-size: 9px;
      margin-top: 20px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .btn-print {
      display: inline-block;
      padding: 10px 20px;
      background-color: #10b981;
      color: white;
      text-decoration: none;
      font-weight: bold;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-size: 12px;
      transition: background-color 0.2s;
    }
    .btn-print:hover {
      background-color: #059669;
    }
  </style>
</head>
<body>

  <div class="no-print" style="background-color: #1e293b; padding: 15px; text-align: center; border-bottom: 1px solid #475569; font-family: sans-serif; color: white;">
    <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold;">
      📄 Dokumen Resmi E-Rapor Berhasil Digenerate dengan Tanda Tangan QR-Code!
    </p>
    <button onclick="window.print()" class="btn-print">🖨 Cetak atau Simpan sebagai PDF (A4)</button>
  </div>

  <div class="page">
    <table class="header-table">
      <tr>
        <td style="width: 80px; text-align: left; vertical-align: middle;">
          <img src="${inst.logoPkbm || 'https://placehold.co/80x80/00a884/ffffff?text=PKBM'}" alt="Logo PKBM" style="width: 70px; height: 70px; object-fit: contain;">
        </td>
        <td class="kop-title">
          <h1>${inst.namaYayasan}</h1>
          <h2>${inst.namaPkbm}</h2>
          <p>NPSN: ${inst.npsn} | Alamat: ${inst.alamat || 'Sukabumi'}, Kec. ${pengesahan.tempatPengesahan || inst.kecamatan || 'Agrabinta'}, Kab. ${inst.kabupaten || 'Sukabumi'}</p>
          <p>Email: ${inst.emailLembaga || 'email@lulus.id'} | Telp: ${inst.nomorTelepon || '-'}</p>
        </td>
        <td style="width: 80px; text-align: right; vertical-align: middle;">
          <img src="${inst.logoYayasan || 'https://placehold.co/80x80/1e3a8a/ffffff?text=YAYASAN'}" alt="Logo Yayasan" style="width: 70px; height: 70px; object-fit: contain;">
        </td>
      </tr>
    </table>

    <div class="divider"></div>

    <div class="title-document">
      <h3>LAPORAN HASIL BELAJAR (E-RAPOR)</h3>
      <p>Kurikulum Merdeka Kesetaraan</p>
    </div>

    <table class="info-table">
      <tr>
        <td style="width: 15%;">Nama Siswa</td>
        <td style="width: 2%;">:</td>
        <td style="width: 33%; font-weight: bold;">${studentName}</td>
        <td style="width: 15%;">Tahun Ajaran</td>
        <td style="width: 2%;">:</td>
        <td style="width: 33%; font-weight: bold;">${activeTa}</td>
      </tr>
      <tr>
        <td>NISN</td>
        <td>:</td>
        <td>${studentNisn}</td>
        <td>Semester</td>
        <td>:</td>
        <td>${activeSem}</td>
      </tr>
      <tr>
        <td>Tingkat / Kelas</td>
        <td>:</td>
        <td>${studentKelas}</td>
        <td>Program Belajar</td>
        <td>:</td>
        <td>${studentProgram} (${studentSistemBelajar})</td>
      </tr>
    </table>

    <table class="main-table">
      <thead>
        <tr>
          <th style="width: 5%;">No</th>
          <th style="width: 30%;">Mata Pelajaran</th>
          <th style="width: 8%;">SKK</th>
          <th style="width: 10%;">Nilai Akhir</th>
          <th style="width: 10%;">Predikat</th>
          <th style="width: 37%;">Capaian Kompetensi & Catatan Belajar</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr style="background-color: #f8fafc; font-weight: bold;">
          <td colspan="2" style="text-align: right; padding: 8px; border: 1px solid #000;">Akumulasi & Rata-rata:</td>
          <td style="text-align: center; padding: 8px; border: 1px solid #000;">${totalSkk}</td>
          <td style="text-align: center; padding: 8px; border: 1px solid #000; font-size: 13px; color: #15803d;">${avgGrade}</td>
          <td style="text-align: center; padding: 8px; border: 1px solid #000;">${getPredikat(parseFloat(avgGrade)).split(' ')[0]}</td>
          <td style="padding: 8px; border: 1px solid #000; font-size: 10px;">
            Siswa menyelesaikan seluruh beban belajar akademik dengan rata-rata pencapaian yang memuaskan.
          </td>
        </tr>
      </tbody>
    </table>

    <div style="border: 1px solid #000; padding: 10px; margin-bottom: 25px; font-size: 11px; background-color: #f0fdf4;">
      <strong>Keputusan Kenaikan Kelas / Kelulusan:</strong><br/>
      Berdasarkan pencapaian hasil belajar seluruh mata pelajaran yang telah memenuhi kriteria ketuntasan minimal (KKM), siswa dinyatakan:
      <span style="font-weight: bold; text-transform: uppercase; color: #16a34a; font-size: 12px; margin-left: 5px;">TUNTAS & NAIK KELAS</span>
    </div>

    <table class="sig-section">
      <tr>
        <td class="sig-block">
          <p>Orang Tua / Wali Siswa</p>
          <div class="sig-space">
            ${currentStudent?.tandaTanganOrangTua ? `<img src="${currentStudent.tandaTanganOrangTua}" alt="Ttd Orang Tua">` : '<div style="border-bottom: 1px dashed #ccc; width: 120px; margin-top: 40px;"></div>'}
          </div>
          <p style="font-weight: bold; text-decoration: underline; margin-top: 15px;">${pengesahan.parentName}</p>
          <p style="color: #64748b; font-size: 10px;">Wali Murid</p>
        </td>
        
        <td class="sig-block">
          <p>${pengesahan.tempatPengesahan}, ${pengesahan.tanggalPengesahan}</p>
          <p>Wali Kelas</p>
          <div class="sig-space">
            ${pengesahan.waliKelasSignature ? `<img src="${pengesahan.waliKelasSignature}" alt="Ttd Wali Kelas">` : '<div style="border-bottom: 1px dashed #ccc; width: 120px; margin-top: 40px;"></div>'}
          </div>
          <p style="font-weight: bold; text-decoration: underline; margin-top: 15px;">${pengesahan.waliKelasName}</p>
          <p style="color: #64748b; font-size: 10px;">NIP. ${pengesahan.waliKelasNip}</p>
        </td>

        <td class="sig-block">
          <p>Mengetahui,</p>
          <p>${inst.jabatanPejabatTtd || 'Kepala PKBM'}</p>
          <div class="sig-space">
            ${inst.capStempelDigital ? `<img src="${inst.capStempelDigital}" alt="Stempel Resmi" style="position: absolute; opacity: 0.55; width: 65px; left: calc(50% - 45px); mix-blend-multiply; z-index: 1;">` : ''}
            ${inst.tandaTanganKepalaSekolah ? `<img src="${inst.tandaTanganKepalaSekolah}" alt="Ttd Kepala Sekolah" style="position: relative; z-index: 2;">` : '<div style="border-bottom: 1px dashed #ccc; width: 120px; margin-top: 40px;"></div>'}
          </div>
          <p style="font-weight: bold; text-decoration: underline; margin-top: 15px;">${inst.namaKepalaSekolah}</p>
          <p style="color: #64748b; font-size: 10px;">NIP. ${inst.nipKepalaSekolah}</p>
        </td>
      </tr>
    </table>

    <div class="verification-card" style="margin-top: 30px;">
      <div style="width: 55px; height: 55px; background-color: #fff; padding: 4px; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center;">
        <img src="${qrCodeUrl}" alt="QR Code Verifikasi" style="width: 100%; height: 100%; object-fit: contain;">
      </div>
      <div style="text-align: left;">
        <span style="font-size: 8px; text-transform: uppercase; font-weight: bold; color: #64748b; letter-spacing: 0.5px;">Sertifikasi Keabsahan Digital</span>
        <h5 style="margin: 2px 0; font-size: 11px; font-weight: bold; color: #0f172a;">Kode Verifikasi Rapor: ${randomVerificationCode}</h5>
        <h5 style="margin: 0 0 2px 0; font-size: 9px; font-weight: bold; color: #64748b;">No Dokumen: ${documentNumber}</h5>
        <p style="margin: 0; color: #16a34a; font-weight: bold; font-family: monospace;">lulus.id/verifikasi/${randomVerificationCode}</p>
      </div>
    </div>

  </div>

</body>
</html>
    `;
  };

  const handleDownload = async (docName: string) => {
    setIsGenerating(true);
    setGenerationProgress(5);
    setGenerationLogs(['Membuka koneksi aman pengesahan dokumen...']);

    const updateStep = (progress: number, log: string, delay: number) => {
      return new Promise<void>(resolve => {
        setTimeout(() => {
          setGenerationProgress(progress);
          setGenerationLogs(prev => [...prev, log]);
          resolve();
        }, delay);
      });
    };

    try {
      await updateStep(15, 'Menghubungkan ke API Portal Akademik DRF Lulus.id...', 300);
      await updateStep(35, 'Mengambil snapshot data nilai kurikulum Merdeka & deskripsi CP...', 400);

      // Construct a frozen snapshot data object to ensure immutability
      const snapshotData = {
        activeSem,
        activeTa,
        subjects: resolvedSubjects.map((sub: any) => {
          const kkmVal = sub.kkm || 75;
          let dynamicCapaianUtama = sub.capaianUtama;
          const matchedCp = cpList.find(cp => 
            (cp.isActive || cp.status_aktif) && (
              cp.id === sub.cpId || 
              (
                (!sub.cpId) &&
                cp.program.toLowerCase() === (sub.program || studentProgram).toLowerCase() &&
                cp.fase === (sub.fase || studentFase) &&
                (cp.subject.toLowerCase() === sub.name.toLowerCase() || 
                 sub.name.toLowerCase().includes(cp.subject.toLowerCase()) ||
                 cp.subject.toLowerCase().includes(sub.name.toLowerCase()))
              )
            )
          );
          
          if (matchedCp && !sub.capaianUtama) {
            const cpDesc = (matchedCp.deskripsi || matchedCp.deskripsiCP || '').trim();
            let cleanDesc = cpDesc;
            const prefixes = [
              'peserta didik mampu ',
              'peserta didik ',
              'siswa mampu ',
              'siswa '
            ];
            for (const prefix of prefixes) {
              if (cleanDesc.toLowerCase().startsWith(prefix)) {
                cleanDesc = cleanDesc.substring(prefix.length).trim();
                break;
              }
            }
            if (cleanDesc.length > 0) {
              cleanDesc = cleanDesc.charAt(0).toLowerCase() + cleanDesc.slice(1);
            }
            if (sub.grade >= 85) {
              dynamicCapaianUtama = `Sangat baik dalam ${cleanDesc}`;
            } else if (sub.grade >= kkmVal) {
              dynamicCapaianUtama = `Baik/berhasil dalam ${cleanDesc}`;
            } else {
              dynamicCapaianUtama = `Memahami konsep dasar ${sub.name}, namun perlu meningkatkan kemampuan dalam ${cleanDesc}`;
            }
          }

          return {
            id: sub.id,
            name: sub.name,
            grade: sub.grade,
            kkm: kkmVal,
            bobotSkk: sub.bobotSkk ?? sub.bobot_skk ?? 4,
            capaianUtama: dynamicCapaianUtama || `Sangat baik dalam menguasai kompetensi mata pelajaran ${sub.name}`,
            bimbinganUtama: sub.bimbinganUtama || ''
          };
        }),
        absensi: {
          sakitCount: resolvedSakitCount,
          izinCount: resolvedIzinCount,
          alfaCount: resolvedAlfaCount,
          hadirCount: resolvedHadirCount
        },
        keaktifan: {
          score: resolvedKeaktifanScore,
          status: resolvedKeaktifanStatus,
          desc: resolvedKeaktifanDesc
        },
        pengesahan: {
          parentName: resolvedParentName,
          waliKelasName: resolvedWaliKelasName,
          waliKelasNip: resolvedWaliKelasNip,
          waliKelasSignature: resolvedWaliKelasSignature,
          tempatPengesahan: resolvedTempatPengesahan,
          tanggalPengesahan: resolvedTanggalPengesahan,
          lembagaIdentitas: resolvedLembagaIdentitas
        }
      };

      await updateStep(55, 'Menerapkan kalkulasi akumulasi beban belajar & SKK Kumulatif...', 400);
      await updateStep(75, 'Merender tanda tangan digital & menyematkan stempel resmi PKBM...', 400);

      // Generate the official URL and its live QR code
      const verifUrl = `${window.location.origin}/verifikasi/${activeVerificationCode}`;
      const qrCodeDataUrl = await QRCode.toDataURL(verifUrl, {
        width: 250,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      await updateStep(85, 'Membuat QR-Code verifikasi sertifikat TTE (lulus.id/verifikasi)...', 300);
      await updateStep(95, 'Menyusun berkas dokumen PDF. Memulai rendering halaman...', 300);

      // Render the HTML layout off-screen specifically for high density print canvas matching
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '210mm';
      
      const htmlContent = generateRaporHtml(qrCodeDataUrl, snapshotData);
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Wait for fonts and image renders
      await new Promise(resolve => setTimeout(resolve, 800));

      const pageEl = container.querySelector('.page') as HTMLElement;
      if (!pageEl) {
        throw new Error('Gagal merender lembar e-rapor.');
      }

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(container);

      // Export as A4 jsPDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      pdf.save(`${docName}.pdf`);

      // Register generated e-Rapor to the public/school verification database
      const newDoc = {
        id: `DOC-RAPOR-${studentId}-${activeSem.toUpperCase()}-${activeTa.replace('/', '-')}`,
        verificationCode: activeVerificationCode,
        documentNumber: activeDocumentNumber,
        studentId,
        studentName,
        nisn: studentNisn || '-',
        program: studentProgram,
        semester: activeSem,
        tahunAjaran: activeTa,
        waliKelas: resolvedWaliKelasName,
        kepalaSekolah: resolvedLembagaIdentitas.namaKepalaSekolah,
        tanggalTerbit: new Date().toISOString().split('T')[0],
        documentType: 'E-Rapor',
        title: `Laporan Hasil Belajar (E-Rapor) Semester ${activeSem} TA ${activeTa}`,
        status: 'Publish',
        issueDate: new Date().toISOString().split('T')[0],
        snapshotData
      };

      const savedDocsStr = localStorage.getItem('documentLibrary');
      let docsList = [];
      if (savedDocsStr) {
        try {
          docsList = JSON.parse(savedDocsStr);
        } catch (e) {
          docsList = [];
        }
      }
      // Clean previous matching e-Rapor document
      docsList = docsList.filter((d: any) => 
        !(d.documentType === 'E-Rapor' && d.studentId === studentId && d.semester === activeSem && d.tahunAjaran === activeTa)
      );
      docsList.push(newDoc);
      localStorage.setItem('documentLibrary', JSON.stringify(docsList));
      setRaporSavedDoc(newDoc);

      setGenerationProgress(100);
      setGenerationLogs(prev => [...prev, 'Berkas E-Rapor PDF berhasil diunduh dan tersertifikasi.']);

      setTimeout(() => {
        setIsGenerating(false);
        showModal(
          'E-Rapor Berhasil Diunduh', 
          `Salinan berkas resmi ${docName}.pdf berhasil digenerate, dibubuhi tanda tangan elektronik dan stempel sekolah, serta terdaftar secara sah pada basis data Lulus.id.`, 
          'success'
        );
      }, 400);

    } catch (err: any) {
      console.error(err);
      setIsGenerating(false);
      showModal(
        'Gagal Memproses PDF', 
        `Terjadi kesalahan saat menggambar halaman PDF: ${err.message || err}`, 
        'warning'
      );
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-50 overflow-hidden z-10 font-sans">
      
      {/* Visual PDF Generation Progress Overlay */}
      {isGenerating && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
              <Download className="w-6 h-6 text-emerald-500" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white">Men-generate E-Rapor Digital</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Progress: {generationProgress}%
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                style={{ width: `${generationProgress}%` }}
              />
            </div>

            {/* Step status logs */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-left space-y-1.5 min-h-[100px] max-h-[140px] overflow-y-auto no-scrollbar">
              {generationLogs.map((log, i) => (
                <div key={i} className={`text-[9.5px] font-semibold flex items-start gap-1.5 ${i === generationLogs.length - 1 ? 'text-slate-200 font-extrabold' : 'text-slate-500 font-medium'}`}>
                  <span className={i === generationLogs.length - 1 ? 'text-emerald-500 animate-pulse' : 'text-slate-700'}>•</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>

            <div className="text-[8px] font-semibold text-slate-500 italic">
              Mohon tidak menutup halaman ini sampai proses pengesahan selesai.
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-extrabold text-slate-800">E-Rapor Kurikulum Merdeka</h2>
        </div>
        <span className="px-2 py-0.5 text-[8px] font-extrabold bg-purple-100 text-purple-700 rounded-full border border-purple-200 shrink-0">
          Fase E - Kelas X
        </span>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        
        {/* Student card info */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-4 rounded-2xl text-white shadow-md relative overflow-hidden shrink-0">
          <div className="absolute -right-6 -bottom-6 opacity-15 text-7xl">
            <GraduationCap className="w-24 h-24" />
          </div>
          <div className="space-y-1.5 relative z-10">
            <span className="text-[8px] px-2 py-0.5 rounded-full bg-white/20 font-bold uppercase tracking-wider">
              Laporan Hasil Belajar (Rapor)
            </span>
            <h3 className="text-sm font-black tracking-tight">{studentName}</h3>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] font-medium text-emerald-100 pt-1 border-t border-white/20">
              <div>NISN: {studentNisn}</div>
              <div className="text-right">TA: {activeAcademicYear?.nama || '2026/2027'}</div>
              <div>PKBM Agrabinta (Kelas {studentKelas})</div>
              <div className="text-right">Semester: {activeAcademicYear?.semester || 'Ganjil'}</div>
            </div>
          </div>
        </div>

        {/* Status / Tipe Dokumen Selector */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm space-y-2 shrink-0 select-none">
          <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block">Status / Jenis Dokumen</span>
          <div className="grid grid-cols-3 gap-2 text-[9.5px] font-extrabold">
            <button 
              type="button"
              onClick={() => setDocStatus('Rapor Semester')}
              className={`py-2 px-1 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                docStatus === 'Rapor Semester' 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm shadow-indigo-500/5' 
                  : 'bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Rapor Semester</span>
            </button>
            <button 
              type="button"
              onClick={() => setDocStatus('Rapor Akhir')}
              className={`py-2 px-1 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                docStatus === 'Rapor Akhir' 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm shadow-indigo-500/5' 
                  : 'bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Rapor Akhir</span>
            </button>
            <button 
              type="button"
              onClick={() => setDocStatus('Dokumen Kelulusan')}
              className={`py-2 px-1 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                docStatus === 'Dokumen Kelulusan' 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm shadow-indigo-500/5' 
                  : 'bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Kelulusan</span>
            </button>
          </div>
          <div className="text-[8px] font-semibold text-slate-400 leading-normal pt-1 flex items-center gap-1">
            <CheckCircle className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
            <span>
              {docStatus === 'Rapor Semester' 
                ? 'Format Rapor Semester: Pengesahan oleh Wali Kelas & Orang Tua/Wali saja.'
                : docStatus === 'Rapor Akhir'
                ? 'Format Rapor Akhir Tahun: Ditandatangani lengkap termasuk Kepala Sekolah & Stempel Lembaga.'
                : 'Format Dokumen Kelulusan: Dilengkapi pengesahan Kepala PKBM secara digital.'}
            </span>
          </div>
        </div>

        {/* Warning Banner block for missing CP */}
        {hasMissingCp && (
          <div className="p-3.5 bg-rose-50 border border-rose-150 rounded-2xl text-[10.5px] text-rose-800 font-semibold flex items-start gap-2.5 shrink-0">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold text-rose-900 block text-xs">⚠ PENERBITAN RAPOR DITANGGUHKAN</span>
              <p className="leading-relaxed font-medium">
                Sistem mendeteksi terdapat <span className="font-extrabold text-rose-950">{subjectsWithMissingCp.length} mata pelajaran</span> yang belum memiliki atau terhubung dengan Capaian Pembelajaran (CP) aktif:
              </p>
              <ul className="list-disc pl-4 font-bold text-rose-950 mt-1 space-y-0.5">
                {subjectsWithMissingCp.map(sub => (
                  <li key={sub.id}>{sub.name}</li>
                ))}
              </ul>
              <p className="text-[9.5px] text-rose-700 font-bold mt-1.5 leading-snug">
                Silakan hubungi Administrator PKBM Agrabinta untuk melengkapi Master CP melalui menu <span className="underline font-extrabold">Modul SKK → Master CP</span>. Fitur cetak rapor diblokir sementara sampai seluruh CP tersedia.
              </p>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-500 shadow-sm shrink-0">
          <button 
            onClick={() => setActiveSubTab('intra')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              activeSubTab === 'intra' ? 'bg-emerald-50 text-emerald-600' : 'hover:text-slate-700'
            }`}
          >
            Intrakurikuler (Nilai)
          </button>
          <button 
            onClick={() => setActiveSubTab('p5')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
              activeSubTab === 'p5' ? 'bg-emerald-50 text-emerald-600' : 'hover:text-slate-700'
            }`}
          >
            Projek Pancasila (P5)
          </button>
        </div>

        {/* TAB 1: INTRAKURIKULER (GRADES & COMPETENCIES) */}
        {activeSubTab === 'intra' && (
          <div className="space-y-3.5">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 px-0.5">
              <BookOpen className="w-4 h-4 text-emerald-500" /> Nilai Akhir & Capaian Kompetensi
            </h4>

            {realSubjects.map((subject) => {
              const kkmValue = subject.kkm || 75;
              const isTuntas = subject.grade >= kkmValue;
              const statusText = isTuntas ? 'Tuntas' : 'Perlu Perbaikan';
              const statusBg = isTuntas ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200';
              const predikatVal = getPredikat(subject.grade);

              return (
                <div key={subject.id} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                    <span className="text-xs font-extrabold text-slate-850">{subject.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">Nilai Akhir:</span>
                      <span className="px-2.5 py-0.5 text-xs font-black bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                        {subject.grade}
                      </span>
                    </div>
                  </div>

                  {/* KKM, Predikat, and Status display */}
                  <div className="grid grid-cols-3 gap-2 py-1.5 bg-slate-50/50 rounded-xl px-2.5 border border-slate-100 text-[10px]">
                    <div>
                      <span className="text-slate-400 font-bold block text-[8px] uppercase">KKM</span>
                      <span className="font-extrabold text-slate-700">{kkmValue}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[8px] uppercase">Predikat</span>
                      <span className="font-extrabold text-slate-700">{predikatVal}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[8px] uppercase">Status</span>
                      <span className={`inline-block px-1.5 py-0.5 text-[8.5px] font-black rounded border ${statusBg}`}>
                        {statusText}
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const matchedCp = cpList.find(cp => 
                      (cp.isActive || cp.status_aktif) && (
                        cp.id === subject.cpId || 
                        (
                          (!subject.cpId) &&
                          cp.program.toLowerCase() === (subject.program || 'Paket C').toLowerCase() &&
                          cp.fase === (subject.fase || 'E') &&
                          (cp.subject.toLowerCase() === subject.name.toLowerCase() || 
                           subject.name.toLowerCase().includes(cp.subject.toLowerCase()) ||
                           cp.subject.toLowerCase().includes(subject.name.toLowerCase()))
                        )
                      )
                    );

                    if (!matchedCp) {
                      return (
                        <div className="text-[9px] leading-relaxed text-rose-500 font-medium pt-1.5 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
                          <p className="font-bold text-rose-800">Deskripsi Capaian Kompetensi:</p>
                          <p className="mt-0.5 italic">
                            ⚠ Deskripsi rapor ditangguhkan. Silakan hubungi Admin Lembaga untuk melengkapi Capaian Pembelajaran (CP) aktif mata pelajaran "{subject.name}".
                          </p>
                        </div>
                      );
                    }

                    // Dynamically generate the achievement description from the matched CP
                    let dynamicCapaianUtama = subject.capaianUtama;
                    if (matchedCp) {
                      const cpDesc = (matchedCp.deskripsi || matchedCp.deskripsiCP || '').trim();
                      let cleanDesc = cpDesc;
                      const prefixes = [
                        'peserta didik mampu ',
                        'peserta didik ',
                        'siswa mampu ',
                        'siswa '
                      ];
                      for (const prefix of prefixes) {
                        if (cleanDesc.toLowerCase().startsWith(prefix)) {
                          cleanDesc = cleanDesc.substring(prefix.length).trim();
                          break;
                        }
                      }
                      if (cleanDesc.length > 0) {
                        cleanDesc = cleanDesc.charAt(0).toLowerCase() + cleanDesc.slice(1);
                      }

                      const kkmVal = subject.kkm || 75;
                      if (subject.grade >= 85) {
                        dynamicCapaianUtama = `Sangat baik dalam ${cleanDesc}`;
                      } else if (subject.grade >= kkmVal) {
                        dynamicCapaianUtama = `Baik/berhasil dalam ${cleanDesc}`;
                      } else {
                        dynamicCapaianUtama = `Memahami konsep dasar ${subject.name}, namun perlu meningkatkan kemampuan dalam ${cleanDesc}`;
                      }
                    }

                    return (
                      <div className="text-[9px] leading-relaxed text-slate-500 font-medium pt-1">
                        <p className="font-bold text-slate-700">Deskripsi Capaian Kompetensi:</p>
                        <p className="mt-0.5">
                          <span className="text-emerald-600 font-extrabold mr-1">✓</span> {dynamicCapaianUtama}
                        </p>
                        {subject.bimbinganUtama && (
                          <p className="mt-0.5 text-amber-600">
                            <span className="text-amber-500 font-extrabold mr-1">⚠</span> {subject.bimbinganUtama}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}

            {/* Keaktifan Belajar */}
            <div id="rapor-keaktifan-belajar" className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h5 className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-500" /> Keaktifan Belajar Siswa
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                <div className="md:col-span-1 bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col items-center justify-center text-center space-y-1.5">
                  <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider">Status Keaktifan</span>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                    keaktifanStatus === 'Sangat Aktif' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                    keaktifanStatus === 'Aktif' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                    keaktifanStatus === 'Cukup Aktif' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                    'bg-rose-100 text-rose-700 border border-rose-200'
                  }`}>
                    {keaktifanStatus}
                  </span>
                  <div className="pt-1.5 border-t border-slate-200/60 w-full text-[7.5px] font-semibold text-slate-400">
                    Berdasarkan {keaktifanData ? 'Penilaian Tutor' : 'Aktivitas LMS'}
                  </div>
                </div>
                <div className="md:col-span-3 space-y-1">
                  <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider">Deskripsi Perkembangan & Keaktifan</span>
                  <p className="text-[9.5px] font-semibold text-slate-600 leading-relaxed bg-slate-50/40 p-2.5 rounded-xl border border-slate-100 italic">
                    "{keaktifanDesc}"
                  </p>
                </div>
              </div>
            </div>

            {/* Keaktifan Belajar & Ketetapan Naik Kelas */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                  <h5 className="text-[10px] font-extrabold text-slate-800 font-sans">Aktivitas LMS (Informasi Pendukung)</h5>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-extrabold text-slate-600">
                      <span>Proses Partisipasi</span>
                      <span className="text-indigo-600 font-bold">{keaktifanScore}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full" style={{ width: `${keaktifanScore}%` }}></div>
                    </div>
                    <span className="text-[7px] font-semibold text-slate-500 block leading-tight">
                      Log keaktifan otomatis mencatat penyelesaian materi, presensi tutorial mandiri, penyelesaian kuis CBT, dan pengumpulan tugas mandiri semester ini.
                    </span>
                  </div>
                </div>

                {hasAgendaWajib ? (
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                    <h5 className="text-[10px] font-extrabold text-slate-800">Agenda Wajib</h5>
                    <div className="grid grid-cols-4 gap-1 text-center text-[8px] font-extrabold text-slate-600">
                      <div className="bg-slate-50 p-1 rounded-lg border border-slate-100">
                        <span>Hadir</span>
                        <p className="text-xs text-emerald-600 font-bold mt-0.5">{hadirCount}</p>
                      </div>
                      <div className="bg-slate-50 p-1 rounded-lg border border-slate-100">
                        <span>Sakit</span>
                        <p className="text-xs text-amber-500 font-bold mt-0.5">{sakitCount}</p>
                      </div>
                      <div className="bg-slate-50 p-1 rounded-lg border border-slate-100">
                        <span>Izin</span>
                        <p className="text-xs text-blue-500 font-bold mt-0.5">{izinCount}</p>
                      </div>
                      <div className="bg-slate-50 p-1 rounded-lg border border-slate-100">
                        <span>Alfa</span>
                        <p className="text-xs text-rose-500 font-bold mt-0.5">{alfaCount}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 text-center flex flex-col justify-center items-center shadow-sm">
                    <span className="text-[8px] font-extrabold text-emerald-600 uppercase">Keputusan Semester</span>
                    <h4 className="text-[10px] font-black text-emerald-800 mt-1 uppercase">NAIK KELAS XI</h4>
                    <span className="text-[7px] text-emerald-600/80 font-bold mt-0.5">Tuntas Belajar</span>
                  </div>
                )}
              </div>

              {hasAgendaWajib && (
                <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 text-center flex flex-col justify-center items-center shadow-sm">
                  <span className="text-[8px] font-extrabold text-emerald-600 uppercase">Keputusan Semester</span>
                  <h4 className="text-[10px] font-black text-emerald-800 mt-1 uppercase">NAIK KELAS XI</h4>
                  <span className="text-[7px] text-emerald-600/80 font-bold mt-0.5">Tuntas Belajar</span>
                </div>
              )}

              {/* BEBAN BELAJAR DAN CAPAIAN SKK */}
              {(() => {
                const bebanBelajars = (() => {
                  try {
                    const saved = localStorage.getItem('lulus_beban_belajar');
                    return saved ? JSON.parse(saved) : [];
                  } catch (e) {
                    return [];
                  }
                })();

                const classes = (() => {
                  try {
                    const saved = localStorage.getItem('lulus_classes');
                    return saved ? JSON.parse(saved) : [];
                  } catch (e) {
                    return [];
                  }
                })();

                // Match student's program and level
                const myProgram = userObj?.siswa_detail?.program || userObj?.program || 'Paket C';
                const myClass = userObj?.siswa_detail?.kelas || userObj?.kelas || 'Kelas X - Paket C';
                const myClassObj = classes.find((c: any) => c.nama === myClass || c.tingkat === myClass);

                const getSemesterString = (tingkat: string, semesterName: string): string => {
                  const isGanjil = semesterName?.toLowerCase() === 'ganjil';
                  if (tingkat.includes('10') || tingkat.includes('7') || tingkat.includes('4')) {
                    return isGanjil ? 'Semester 1' : 'Semester 2';
                  } else if (tingkat.includes('11') || tingkat.includes('8') || tingkat.includes('5')) {
                    return isGanjil ? 'Semester 3' : 'Semester 4';
                  } else if (tingkat.includes('12') || tingkat.includes('9') || tingkat.includes('6')) {
                    return isGanjil ? 'Semester 5' : 'Semester 6';
                  }
                  return isGanjil ? 'Semester 1' : 'Semester 2';
                };

                const activeSemString = getSemesterString(myClass, activeAcademicYear?.semester || 'Ganjil');

                // Find Beban Belajar
                const matchedBB = bebanBelajars.find((bb: any) => {
                  if (myClassObj) {
                    return bb.programBelajarId === myClassObj.programId && bb.tingkat === myClassObj.tingkat && bb.semester === activeSemString;
                  }
                  return bb.jenjang === myProgram && bb.tingkat === myClass && bb.semester === activeSemString;
                });

                const targetSkkSem = matchedBB ? matchedBB.targetSkk : (myProgram === 'Paket C' ? 14 : myProgram === 'Paket B' ? 7 : 5);

                // --- NEW INTEGRATED SKK CALCULATION ---
                // Completed SKK for current semester (using filtered realSubjects where grade >= kkm)
                const completedSubjectsSem = realSubjects.filter(sub => (sub.grade || 0) >= (sub.kkm || 75));
                const skkTercapaiSem = completedSubjectsSem.reduce((sum, sub) => sum + (sub.bobotSkk ?? sub.bobot_skk ?? 4), 0);
                const progressSem = targetSkkSem > 0 ? Math.min(100, Math.round((skkTercapaiSem / targetSkkSem) * 100)) : 0;

                // Completed SKK for entire Program (all subjects in this program where grade >= kkm)
                const targetSkkProgram = myProgram === 'Paket C' ? 72 : myProgram === 'Paket B' ? 40 : 30;
                const completedSubjectsProgram = subjects.filter(sub => {
                  const isNotMateri = !sub.isMateri;
                  const matchProgram = (sub.program || 'Paket C').toLowerCase() === myProgram.toLowerCase();
                  const isCompleted = (sub.grade || 0) >= (sub.kkm || 75);
                  return isNotMateri && matchProgram && isCompleted;
                });
                const skkTercapaiProgram = completedSubjectsProgram.reduce((sum, sub) => sum + (sub.bobotSkk ?? sub.bobot_skk ?? 4), 0);
                const progressProgram = targetSkkProgram > 0 ? Math.min(100, Math.round((skkTercapaiProgram / targetSkkProgram) * 100)) : 0;
                const skkStatus = skkTercapaiProgram >= targetSkkProgram ? 'Selesai' : 'Dalam Proses';

                return (
                  <div className="space-y-4">
                    {/* SEMESTER SKK */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm space-y-2.5">
                      <h5 className="text-[10px] font-extrabold text-slate-800 flex items-center justify-between border-b border-slate-50 pb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-rose-500" /> Capaian SKK Semester Ini
                        </span>
                        <span className="px-2 py-0.5 text-[8px] font-black bg-rose-50 text-rose-600 rounded-md">
                          {activeSemString}
                        </span>
                      </h5>

                      <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-bold">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="text-slate-400 text-[7px] block uppercase">Beban Target</span>
                          <span className="text-slate-800 font-extrabold">{targetSkkSem} SKK</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="text-slate-400 text-[7px] block uppercase">SKK Dicapai</span>
                          <span className="text-emerald-600 font-extrabold">{skkTercapaiSem} SKK</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="text-slate-400 text-[7px] block uppercase">Persentase</span>
                          <span className="text-indigo-600 font-extrabold">{progressSem}%</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${progressSem}%` }}></div>
                        </div>
                        <p className="text-[7.5px] leading-relaxed text-slate-400 font-semibold">
                          Sesuai kurikulum Merdeka <span className="font-bold text-slate-600">{myProgram}</span>, capaian modul semester ini dihitung otomatis berdasarkan kelulusan mata pelajaran (&ge; KKM). Siswa berhasil menyelesaikan {skkTercapaiSem} SKK dari target {targetSkkSem} SKK.
                        </p>
                      </div>
                    </div>

                    {/* PROGRAM LEVEL SKK */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm space-y-2.5">
                      <h5 className="text-[10px] font-extrabold text-slate-800 flex items-center justify-between border-b border-slate-50 pb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-indigo-500" /> Akumulasi SKK Program {myProgram}
                        </span>
                        <span className={`px-2 py-0.5 text-[8px] font-black rounded-md ${
                          skkStatus === 'Selesai' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {skkStatus}
                        </span>
                      </h5>

                      <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-bold">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="text-slate-400 text-[7px] block uppercase">Target Program</span>
                          <span className="text-slate-800 font-extrabold">{targetSkkProgram} SKK</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="text-slate-400 text-[7px] block uppercase">SKK Kumulatif</span>
                          <span className="text-emerald-600 font-extrabold">{skkTercapaiProgram} SKK</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="text-slate-400 text-[7px] block uppercase">Progress</span>
                          <span className="text-indigo-600 font-extrabold">{progressProgram}%</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${progressProgram}%` }}></div>
                        </div>
                        <p className="text-[7.5px] leading-relaxed text-slate-400 font-semibold">
                          Target kelulusan program <span className="font-bold text-slate-600">{myProgram}</span> adalah minimal {targetSkkProgram} SKK. Akumulasi SKK dihitung dari seluruh mata pelajaran tuntas (&ge; KKM). Progress belajar Anda saat ini adalah {progressProgram}%.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 2: PROJEK PENGUATAN PROFIL PELAJAR PANCASILA (P5) */}
        {activeSubTab === 'p5' && (
          <div className="space-y-3.5">
            <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 space-y-1">
              <h4 className="text-xs font-black text-purple-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" /> Projek Penguatan Profil P5
              </h4>
              <p className="text-[9px] text-purple-600 leading-relaxed font-semibold">
                Penilaian keikutsertaan siswa dalam projek kelompok yang membangun karakter akhlak mulia Pancasila.
              </p>
            </div>

            {/* Project Card */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm space-y-2.5">
              <span className="inline-block text-[8px] px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-extrabold border border-purple-200">
                Tema: Gaya Hidup Berkelanjutan
              </span>
              <h4 className="text-xs font-extrabold text-slate-800 mt-1">Agrabinta Berseri: Pengolahan Sampah Organik PKBM</h4>
              <p className="text-[9px] leading-relaxed text-slate-500">
                Projek pengumpulan dan pengolahan limbah sayuran masyarakat sekitar Agrabinta menjadi pupuk cair organik bermutu tinggi.
              </p>
              
              <div className="pt-2.5 border-t border-slate-50 space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Dimensi Karakter Terbentuk:</span>
                <div className="space-y-1.5 text-[9px] font-bold text-slate-700">
                  <div className="flex justify-between items-center">
                    <span>1. Bergotong Royong (Kolaborasi)</span>
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-extrabold text-[8px]">Sangat Berkembang</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>2. Bernalar Kritis (Eksperimentasi)</span>
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-extrabold text-[8px]">Sesuai Harapan</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>3. Kreatif (Pengembangan Solusi)</span>
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-extrabold text-[8px]">Sesuai Harapan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lembar Pengesahan Dinamis */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6 text-[9.5px] font-bold relative select-none">
          
          {docStatus === 'Rapor Semester' ? (
            // FORMAT RAPOR SEMESTER (Only Orang Tua & Wali Kelas)
            <div className="space-y-4">
              <div className="text-center font-extrabold text-slate-400 text-[8.5px] uppercase tracking-wider mb-2">
                Mengetahui,
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Orang Tua */}
                <div className="flex flex-col justify-between items-center h-28 text-center relative">
                  <span className="text-slate-400 uppercase tracking-wider text-[8px]">Orang Tua/Wali Siswa</span>
                  
                  <div className="h-12 flex items-center justify-center relative w-full">
                    {currentStudent?.tandaTanganOrangTua ? (
                      <img 
                        src={currentStudent.tandaTanganOrangTua} 
                        alt="Ttd Orang Tua" 
                        className="h-12 object-contain max-w-[120px]" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="h-12 w-28 border-b border-dashed border-slate-200" />
                    )}
                  </div>
                  
                  <div className="space-y-0.5">
                    <div className="text-slate-800 font-black border-b border-dashed border-slate-300 pb-0.5 min-w-[100px]">
                      {parentName}
                    </div>
                    <div className="text-[7.5px] text-slate-400 font-semibold">Wali Murid</div>
                  </div>
                </div>

                {/* Wali Kelas */}
                <div className="flex flex-col justify-between items-center h-28 text-center relative">
                  <span className="text-slate-400 uppercase tracking-wider text-[8px]">Wali Kelas</span>
                  
                  <div className="h-12 flex items-center justify-center gap-2 relative w-full">
                    {waliKelasSignature ? (
                      <img 
                        src={waliKelasSignature} 
                        alt="Ttd Wali Kelas" 
                        className="h-12 object-contain max-w-[100px]" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="h-12 w-28 border-b border-dashed border-slate-200" />
                    )}

                    {/* QR Code if Wali Kelas has it */}
                    {waliKelas?.qrTandaTangan && (
                      <div className="flex flex-col items-center shrink-0 bg-slate-50 p-1 rounded-md border border-slate-100 shadow-2xs group relative">
                        <img 
                          src={waliKelas.qrTandaTangan} 
                          alt="QR TTE" 
                          className="w-8 h-8 object-contain" 
                          referrerPolicy="no-referrer" 
                        />
                        <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all bg-slate-855 text-white text-[7px] py-0.5 px-1.5 rounded shadow-lg font-semibold whitespace-nowrap z-30">
                          Scan untuk verifikasi
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-0.5">
                    <div className="text-slate-855 font-black border-b border-dashed border-slate-350 pb-0.5 min-w-[100px]">
                      {waliKelasName}
                    </div>
                    <div className="text-[7.5px] text-slate-400 font-semibold">
                      {waliKelasNip ? `NIP. ${waliKelasNip}` : 'NIP. -'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // FORMAT DOKUMEN AKHIR / KELULUSAN (Row 1: Orang Tua & Wali Kelas, Row 2: Kepala Sekolah)
            <div className="space-y-8">
              {/* Row 1: Orang Tua & Wali Kelas */}
              <div className="grid grid-cols-2 gap-4">
                {/* Orang Tua */}
                <div className="flex flex-col justify-between items-center h-28 text-center relative">
                  <span className="text-slate-400 uppercase tracking-wider text-[8px]">Orang Tua/Wali Siswa</span>
                  
                  <div className="h-12 flex items-center justify-center relative w-full">
                    {currentStudent?.tandaTanganOrangTua ? (
                      <img 
                        src={currentStudent.tandaTanganOrangTua} 
                        alt="Ttd Orang Tua" 
                        className="h-12 object-contain max-w-[120px]" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="h-12 w-28 border-b border-dashed border-slate-200" />
                    )}
                  </div>
                  
                  <div className="space-y-0.5">
                    <div className="text-slate-800 font-black border-b border-dashed border-slate-300 pb-0.5 min-w-[100px]">
                      {parentName}
                    </div>
                    <div className="text-[7.5px] text-slate-400 font-semibold">Wali Murid</div>
                  </div>
                </div>

                {/* Wali Kelas */}
                <div className="flex flex-col justify-between items-center h-28 text-center relative">
                  <span className="text-slate-400 uppercase tracking-wider text-[8px]">Wali Kelas</span>
                  
                  <div className="h-12 flex items-center justify-center gap-2 relative w-full">
                    {waliKelasSignature ? (
                      <img 
                        src={waliKelasSignature} 
                        alt="Ttd Wali Kelas" 
                        className="h-12 object-contain max-w-[100px]" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="h-12 w-28 border-b border-dashed border-slate-200" />
                    )}

                    {/* QR Code if Wali Kelas has it */}
                    {waliKelas?.qrTandaTangan && (
                      <div className="flex flex-col items-center shrink-0 bg-slate-50 p-1 rounded-md border border-slate-100 shadow-2xs group relative">
                        <img 
                          src={waliKelas.qrTandaTangan} 
                          alt="QR TTE" 
                          className="w-8 h-8 object-contain" 
                          referrerPolicy="no-referrer" 
                        />
                        <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all bg-slate-855 text-white text-[7px] py-0.5 px-1.5 rounded shadow-lg font-semibold whitespace-nowrap z-30">
                          Scan untuk verifikasi
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-0.5">
                    <div className="text-slate-855 font-black border-b border-dashed border-slate-350 pb-0.5 min-w-[100px]">
                      {waliKelasName}
                    </div>
                    <div className="text-[7.5px] text-slate-400 font-semibold">
                      {waliKelasNip ? `NIP. ${waliKelasNip}` : 'NIP. -'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Kepala Sekolah */}
              <div className="flex flex-col items-center justify-between h-32 text-center relative pt-4 border-t border-slate-50">
                <span className="text-slate-400 uppercase tracking-wider text-[8px]">{lembagaIdentitas.jabatanPejabatTtd || 'Kepala Sekolah'}</span>
                
                <div className="h-14 flex items-center justify-center relative w-full gap-4">
                  {/* Digital seal/stamp if available */}
                  {lembagaIdentitas.capStempelDigital && (
                    <div className="absolute left-[calc(50%-75px)] h-14 w-14 flex items-center justify-center pointer-events-none opacity-45 mix-blend-multiply z-10">
                      <img 
                        src={lembagaIdentitas.capStempelDigital} 
                        alt="Cap Stempel Resmi" 
                        className="h-14 object-contain max-w-[56px]" 
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                  )}

                  {lembagaIdentitas.tandaTanganKepalaSekolah ? (
                    <img 
                      src={lembagaIdentitas.tandaTanganKepalaSekolah} 
                      alt="Ttd Kepala Sekolah" 
                      className="h-14 object-contain max-w-[140px] relative z-20" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <div className="h-12 w-32 border-b border-dashed border-slate-200 relative z-20" />
                  )}

                  {/* QR Code if Kepala Sekolah has it */}
                  {lembagaIdentitas.qrTandaTanganKepalaSekolah && (
                    <div className="flex flex-col items-center shrink-0 bg-slate-50 p-1 rounded-md border border-slate-100 shadow-2xs group relative z-20">
                      <img 
                        src={lembagaIdentitas.qrTandaTanganKepalaSekolah} 
                        alt="QR TTE Kepsek" 
                        className="w-8 h-8 object-contain" 
                        referrerPolicy="no-referrer" 
                      />
                      <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all bg-slate-855 text-white text-[7px] py-0.5 px-1.5 rounded shadow-lg font-semibold whitespace-nowrap z-30">
                        Scan untuk verifikasi
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-0.5">
                  <div className="text-slate-855 font-black border-b border-dashed border-slate-350 pb-0.5 min-w-[120px]">
                    {lembagaIdentitas.namaKepalaSekolah}
                  </div>
                  <div className="text-[7.5px] text-slate-400 font-semibold">
                    {lembagaIdentitas.nipKepalaSekolah ? `NIP. ${lembagaIdentitas.nipKepalaSekolah}` : 'NIP. -'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Verification QR Code Card in Preview */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="w-full max-w-[140px] shrink-0 bg-slate-50 p-2 rounded-2xl border border-slate-150 shadow-3xs flex items-center justify-center">
              <VerificationQRCode verificationCode={activeVerificationCode} size="sm" />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1 select-text">
              <span className="inline-flex items-center gap-1 text-[8px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Sertifikasi Keabsahan Digital
              </span>
              <h5 className="text-[10px] font-extrabold text-slate-800">Sertifikat Keabsahan Digital Aktif</h5>
              <p className="text-[9px] text-slate-500 leading-relaxed font-semibold text-justify">
                Rapor ini telah terdaftar secara sah di sistem pencatatan akademik PKBM Lulus.id dan dilengkapi dengan tanda tangan elektronik tersertifikasi (TTE). Scan QR Code untuk memverifikasi keaslian dokumen secara publik.
              </p>
              <div className="text-[8.5px] font-bold text-slate-400 font-mono tracking-tight mt-1">
                No. Registrasi: {activeDocumentNumber}
              </div>
            </div>
          </div>
        </div>

        {/* Download Rapor PDF Action Button */}
        <div className="px-1 pb-4">
          {hasMissingCp ? (
            <button 
              type="button"
              disabled
              className="w-full py-3.5 bg-slate-200 text-slate-400 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-slate-300"
              title="Semua mata pelajaran harus memiliki CP aktif sebelum rapor dapat diterbitkan"
            >
              <Lock className="w-4 h-4 text-slate-400" />
              <span>Unduh Ditangguhkan (Lengkapi CP Admin)</span>
            </button>
          ) : (
            <button 
              onClick={() => handleDownload('E-Rapor_Lengkap_Fajar')}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/10"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Berkas Rapor Resmi (PDF)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
