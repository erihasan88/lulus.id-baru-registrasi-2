import React, { useState, useEffect } from 'react';
import { 
  X, Printer, Download, CheckCircle2, AlertCircle, 
  User, Shield, GraduationCap, FileText, Check, AlertTriangle, Calendar,
  Camera, ShieldCheck, QrCode, Clock, Info
} from 'lucide-react';
import QRCode from 'qrcode';
import { Student, RegistrationData } from '../types';

interface FormulirPendaftaranModalProps {
  student: Student;
  onClose: () => void;
  showModal: (title: string, desc: string, type?: 'info' | 'warning' | 'success') => void;
}

// Automatic form number helper (FRM-PPDB-YYYY-XXXXXX)
export function generateFormNumber(student: Student): string {
  const idDigits = student.id.replace(/\D/g, '') || '0';
  const paddedId = idDigits.slice(-6).padStart(6, '0');
  let year = '2026';
  if (student.tahunAjaran) {
    const match = student.tahunAjaran.match(/\d{4}/g);
    if (match && match.length > 1) {
      year = match[1]; // e.g. "2025/2026" -> "2026"
    } else if (match && match.length > 0) {
      year = match[0];
    }
  }
  return `FRM-PPDB-${year}-${paddedId}`;
}

// Vector SVG QR Code generator for printable perfect resolution
function FormQRCode({ code, size = 64 }: { code: string; size?: number }) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lulus.id';
    const verifyUrl = `${origin}/verifikasi/${code}`;
    QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: size * 2, // high resolution for print/scan
      color: {
        dark: '#1e293b', // slate-800
        light: '#ffffff'
      }
    })
      .then(url => setQrUrl(url))
      .catch(err => console.error('Gagal generate QR Code PPDB', err));
  }, [code, size]);

  return (
    <div className="flex flex-col items-center justify-center border border-slate-200 p-1 bg-white rounded shrink-0" style={{ width: size + 10, height: size + 20 }}>
      {qrUrl ? (
        <img 
          src={qrUrl} 
          alt="QR Code" 
          width={size} 
          height={size} 
          className="object-contain"
        />
      ) : (
        <div className="bg-slate-100 animate-pulse rounded" style={{ width: size, height: size }} />
      )}
      <span className="text-[5px] font-mono font-black text-slate-500 mt-1 uppercase tracking-tight block text-center max-w-[70px] truncate">{code}</span>
    </div>
  );
}

// Fallback generator for student's registration data
export function getStudentPendaftaranData(student: Student): RegistrationData {
  if (student.pendaftaranData) {
    return student.pendaftaranData;
  }
  
  // Parse address from student.alamat if possible, or use fallback
  let alamatJalan = student.alamat || '';
  let rt = '01';
  let rw = '02';
  let desa = 'Agrabinta';
  let kecamatan = 'Agrabinta';
  let kota = 'Cianjur';
  let provinsi = 'Jawa Barat';
  let kodepos = '43273';
  
  if (student.alamat && student.alamat.includes(', RT ')) {
    try {
      const parts = student.alamat.split(', ');
      alamatJalan = parts[0] || '';
      if (parts[1] && parts[1].includes('RT ') && parts[1].includes('/RW ')) {
        const rtrwStr = parts[1].replace('RT ', '');
        const rtrwParts = rtrwStr.split('/RW ');
        rt = rtrwParts[0] || '01';
        rw = rtrwParts[1] || '02';
      }
      
      // Look for Desa/Ds.
      const desaPart = parts.find(p => p.startsWith('Ds. ') || p.startsWith('Desa '));
      if (desaPart) {
        desa = desaPart.replace('Ds. ', '').replace('Desa ', '');
      }
      
      // Look for Kec.
      const kecPart = parts.find(p => p.startsWith('Kec. '));
      if (kecPart) {
        kecamatan = kecPart.replace('Kec. ', '');
      }
      
      // The remaining parts could be kota or provinsi
      if (parts[4]) {
        kota = parts[4];
      }
    } catch (e) {
      // ignore
    }
  }

  // Determine fallback program previous education
  let pendidikanAsal = 'SMP';
  let sekolahAsal = 'SMP Negeri 1 Agrabinta';
  if (student.program === 'Paket A') {
    pendidikanAsal = 'Belum Sekolah / PAUD';
    sekolahAsal = '-';
  } else if (student.program === 'Paket B') {
    pendidikanAsal = 'SD';
    sekolahAsal = 'SD Negeri 1 Agrabinta';
  }

  return {
    nama: student.nama,
    nik: student.nik || '3201234567890001',
    nisn: student.nisn || '-',
    tempat_lahir: student.tempatLahir || 'Cianjur',
    tgl_lahir: student.tglLahir || '2008-04-14',
    jk: student.jk || 'Laki-laki',
    agama: 'Islam',
    kewarganegaraan: 'WNI',
    no_hp: '081234567890',
    email: student.username ? `${student.username}@lulus.id` : `${student.nama.toLowerCase().replace(/\s+/g, '')}@lulus.id`,
    alamat: alamatJalan,
    rt: rt,
    rw: rw,
    dusun: desa + ' Hilir',
    desa: desa,
    kecamatan: kecamatan,
    kota: kota,
    provinsi: provinsi,
    kodepos: kodepos,
    pendidikan: pendidikanAsal,
    sekolah_asal: sekolahAsal,
    tahun_lulus: '2024',
    no_ijazah: 'DN-01/D-' + (student.program === 'Paket C' ? 'SMP' : 'SD') + '/21/00123',
    program: student.program,
    nama_ayah: student.ayah || 'Slamet Rahardjo',
    nik_ayah: '3201234567890456',
    pekerjaan_ayah: student.pekerjaanAyah || 'Tani',
    pendidikan_ayah: 'SMA',
    nama_ibu: student.ibu || 'Siti Aminah',
    nik_ibu: '3201234567890789',
    pekerjaan_ibu: student.pekerjaanIbu || 'Ibu Rumah Tangga',
    pendidikan_ibu: 'SMA',
    gunakan_wali: !!student.namaWali,
    nama_wali: student.namaWali || '',
    hubungan_wali: student.hubunganWali || '',
    hp_wali: student.namaWali ? '081234567899' : '',
    doc_foto: student.dokumen?.foto || '',
    doc_ktp: student.dokumen?.ktp || '',
    doc_kk: student.dokumen?.kk || '',
    doc_ijazah: student.dokumen?.ijazah || '',
    doc_akta: '',
    sig_siswa_saved: !!student.tandaTanganSiswa,
    sig_siswa_data: student.tandaTanganSiswa,
    sig_ortu_saved: !!student.tandaTanganOrangTua,
    sig_ortu_data: student.tandaTanganOrangTua,
    metode_pembayaran: student.tipeKelas === 'Karyawan' ? 'VA Mandiri' : 'QRIS Instan',
    tipe_kelas: student.tipeKelas || 'Reguler'
  };
}

export default function FormulirPendaftaranModal({ student, onClose, showModal }: FormulirPendaftaranModalProps) {
  const data = getStudentPendaftaranData(student);
  const formNumber = generateFormNumber(student);
  const [showDownloadInstruction, setShowDownloadInstruction] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdfClick = () => {
    setShowDownloadInstruction(true);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const getStatusBadge = () => {
    switch (student.status) {
      case 'Menunggu Verifikasi':
        return {
          text: 'MENUNGGU VERIFIKASI',
          classes: 'bg-amber-100 text-amber-800 border-amber-300'
        };
      case 'Aktif':
        return {
          text: 'SUDAH DIVERIFIKASI / DITERIMA',
          classes: 'bg-emerald-100 text-emerald-800 border-emerald-300'
        };
      case 'Nonaktif':
        return {
          text: 'DITOLAK / NONAKTIF',
          classes: 'bg-rose-100 text-rose-800 border-rose-300'
        };
      default:
        return {
          text: 'BELUM DIKETAHUI',
          classes: 'bg-slate-100 text-slate-800 border-slate-300'
        };
    }
  };

  const statusInfo = getStatusBadge();

  // Color-coded document helper
  const getDocumentStatus = (val: string | undefined) => {
    const isOk = val && val !== 'belum_ada' && val !== 'belum_sekola' && val !== 'pas_foto_default.jpg' && val !== 'ktp_default.png' && val !== 'kk_default.pdf' && val !== 'ijazah_default.pdf';
    return {
      isOk,
      text: isOk ? 'Tersedia' : 'Belum Tersedia',
      badgeClass: isOk ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
    };
  };

  // Verification history log generator
  const riwayat = student.riwayatVerifikasi || [
    {
      admin: 'Admin PPDB Darul Ulum',
      tanggal: student.status === 'Aktif' ? '16 Juli 2026' : '16 Juli 2026',
      jam: student.status === 'Aktif' ? '14:30 WIB' : '20:15 WIB',
      status: student.status === 'Aktif' ? 'DISETUJUI' : student.status === 'Nonaktif' ? 'DITOLAK' : 'MENUNGGU',
      catatan: student.catatanVerifikasi || (student.status === 'Aktif' ? 'Persyaratan dokumen lengkap & terverifikasi sistem.' : 'Menunggu antrean verifikasi sistem.')
    }
  ];

  // Check photo availability
  const isFotoOk = student.dokumen?.foto && student.dokumen.foto !== 'pas_foto_default.jpg' && student.dokumen.foto !== 'belum_ada';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in no-print">
      
      {/* Dynamic styles injected exclusively when printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            visibility: hidden !important;
            background: white !important;
          }
          #printable-registration-form-container,
          #printable-registration-form,
          #printable-registration-form * {
            visibility: visible !important;
          }
          #printable-registration-form-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          #printable-registration-form {
            width: 210mm !important;
            min-height: 297mm !important;
            height: auto !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 10mm 12mm 10mm 12mm !important;
            background: white !important;
            color: black !important;
            font-size: 8.5px !important;
          }
          .section-block {
            page-break-inside: avoid !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      {/* Main Modal Card */}
      <div className="bg-slate-100 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
        
        {/* Modal Top Control Bar */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Formulir Pendaftaran Siswa (PPDB)</h3>
              <p className="text-[10px] text-slate-400 font-bold">Arsip Administrasi Terverifikasi Lulus.id V2</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-500/10 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Print</span>
            </button>
            <button
              onClick={handleDownloadPdfClick}
              className="px-3.5 py-1.8 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floating Download PDF Guide */}
        {showDownloadInstruction && (
          <div className="bg-emerald-50 border-y border-emerald-200 px-6 py-2.5 flex items-center justify-between animate-fade-in no-print text-[11px] font-bold text-emerald-800">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>PILIH TUJUAN: <strong>"Save as PDF" / "Simpan sebagai PDF"</strong> pada jendela browser yang terbuka untuk mengunduh dokumen resmi.</span>
            </div>
            <button 
              onClick={() => setShowDownloadInstruction(false)}
              className="text-[9px] uppercase font-black tracking-wider text-emerald-600 hover:text-emerald-800"
            >
              Mengerti
            </button>
          </div>
        )}

        {/* Scrollable Sheet Container Preview */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center bg-slate-200/80 no-print">
          
          {/* Printable Sheet A4 Wrap */}
          <div 
            id="printable-registration-form" 
            className="bg-white w-[210mm] min-h-[297mm] p-8 shadow-xl border border-slate-300 rounded-lg text-slate-800 relative flex flex-col justify-between"
          >
            
            {/* Upper Content wrapper */}
            <div className="space-y-3.5">
              
              {/* KOP SURAT / OFFICIAL LETTERHEAD */}
              <div className="flex items-start gap-4 border-b-2 border-slate-800 pb-2.5">
                {/* SVG Vector Logo */}
                <div className="w-12 h-12 bg-emerald-700 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md">
                  <svg viewBox="0 0 100 100" className="w-8 h-8 fill-current">
                    <path d="M50 15 L80 30 L80 60 C80 75 50 85 50 85 C50 85 20 75 20 60 L20 30 Z" className="stroke-white stroke-2 fill-emerald-700" />
                    <path d="M35 40 H65 M35 50 H65 M40 60 H60" className="stroke-white stroke-3 stroke-linecap-round" />
                    <circle cx="50" cy="30" r="4" className="fill-white" />
                  </svg>
                </div>

                <div className="flex-1">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">YAYASAN DARUL ULUM CIANJUR</span>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-tight block">PKBM DARUL ULUM</h2>
                  <span className="text-[7.5px] text-slate-500 font-bold block leading-tight">NPSN: P9960244 | Izin Operasional No: 421.9/3281/Bid.PNFI/Art/2026</span>
                  <span className="text-[7.5px] text-slate-500 font-bold block leading-tight">Alamat: Jl. Raya Agrabinta No. 24, Kec. Agrabinta, Kab. Cianjur, Jawa Barat, 43273</span>
                  <span className="text-[7.5px] text-slate-400 font-semibold block">Email: pkbm@darululum.sch.id | HP/WhatsApp: 0812-3456-7890</span>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 border border-slate-300 text-slate-500 rounded font-mono text-[6.5px] font-black uppercase block tracking-wider bg-slate-50">ORIGINAL ARSIP</span>
                  <div className="text-[7px] text-slate-400 font-bold mt-1">LULUS.ID V2</div>
                </div>
              </div>

              {/* DOCUMENT TITLE */}
              <div className="text-center space-y-0.5">
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">FORMULIR PENDAFTARAN PESERTA DIDIK BARU</h3>
                <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">TAHUN AJARAN {student.tahunAjaran || '2025/2026'}</p>
                
                {/* Meta details grid */}
                <div className="pt-2 max-w-lg mx-auto grid grid-cols-3 gap-2 text-[8px] font-extrabold">
                  <div className="p-1.5 bg-slate-50 border border-slate-200/60 rounded text-center">
                    <span className="text-slate-400 block uppercase font-bold text-[6px] leading-tight mb-0.5">No. Formulir / PPDB</span>
                    <span className="text-rose-600 font-black block tracking-wider font-mono">{formNumber}</span>
                  </div>
                  <div className="p-1.5 bg-slate-50 border border-slate-200/60 rounded text-center">
                    <span className="text-slate-400 block uppercase font-bold text-[6px] leading-tight mb-0.5">Tanggal Pendaftaran</span>
                    <span className="text-slate-800 font-black block">16 Juli 2026</span>
                  </div>
                  <div className="p-1.5 bg-slate-50 border border-slate-200/60 rounded text-center flex flex-col justify-center items-center">
                    <span className="text-slate-400 block uppercase font-bold text-[6px] leading-tight mb-0.5">Status Berkas</span>
                    <span className={`px-1.5 py-0.2 rounded font-black text-[6.5px] text-center inline-block ${statusInfo.classes} border`}>
                      {statusInfo.text}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTIONS */}
              <div className="space-y-3">
                
                {/* SECTION A: IDENTITAS & PHOTO/QR SIDEBAR */}
                <div className="space-y-1 section-block">
                  <h4 className="section-title bg-slate-100 text-slate-800 px-2 py-0.8 text-[8px] font-black uppercase tracking-wider rounded border border-slate-200/50 flex items-center gap-1">
                    <User className="w-3 h-3 text-emerald-600" /> A. IDENTITAS CALON PESERTA DIDIK
                  </h4>
                  
                  <div className="flex gap-4 items-start pl-2">
                    {/* Left Info Fields */}
                    <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1 text-[8px] font-bold text-slate-600">
                      <div className="grid grid-cols-3 gap-1">
                        <span className="col-span-1 text-slate-400 font-semibold">Nama Lengkap</span>
                        <span className="col-span-2 text-slate-900 font-black uppercase">: {data.nama}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <span className="col-span-1 text-slate-400 font-semibold">Alamat Lengkap</span>
                        <span className="col-span-2 text-slate-900 font-black">: {data.alamat}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        <span className="col-span-1 text-slate-400 font-semibold">No. NIK</span>
                        <span className="col-span-2 text-slate-900 font-black font-mono">: {data.nik}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <span className="col-span-1 text-slate-400 font-semibold">Kecamatan</span>
                        <span className="col-span-2 text-slate-900 font-black">: {data.kecamatan}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        <span className="col-span-1 text-slate-400 font-semibold">No. NISN</span>
                        <span className="col-span-2 text-slate-900 font-black font-mono">: {data.nisn}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <span className="col-span-1 text-slate-400 font-semibold">Kabupaten/Kota</span>
                        <span className="col-span-2 text-slate-900 font-black">: {data.kota}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        <span className="col-span-1 text-slate-400 font-semibold">Tempat Lahir</span>
                        <span className="col-span-2 text-slate-900 font-black">: {data.tempat_lahir}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <span className="col-span-1 text-slate-400 font-semibold">Provinsi</span>
                        <span className="col-span-2 text-slate-900 font-black">: {data.provinsi}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        <span className="col-span-1 text-slate-400 font-semibold">Tanggal Lahir</span>
                        <span className="col-span-2 text-slate-900 font-black font-mono">: {data.tgl_lahir}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <span className="col-span-1 text-slate-400 font-semibold">Kode Pos</span>
                        <span className="col-span-2 text-slate-900 font-black font-mono">: {data.kodepos}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        <span className="col-span-1 text-slate-400 font-semibold">Jenis Kelamin</span>
                        <span className="col-span-2 text-slate-900 font-black">: {data.jk}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <span className="col-span-1 text-slate-400 font-semibold">Nomor HP/WA</span>
                        <span className="col-span-2 text-slate-900 font-black font-mono">: {data.no_hp}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        <span className="col-span-1 text-slate-400 font-semibold">Agama</span>
                        <span className="col-span-2 text-slate-900 font-black">: {data.agama}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <span className="col-span-1 text-slate-400 font-semibold">Email Siswa</span>
                        <span className="col-span-2 text-slate-900 font-black font-mono">: {data.email}</span>
                      </div>
                    </div>

                    {/* Right-aligned Sidebar: Pas Foto & QR Code */}
                    <div className="shrink-0 flex items-center gap-2 border border-slate-200 bg-slate-50/50 p-2 rounded-xl">
                      {/* Area Pas Foto */}
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-22 border border-dashed border-slate-350 rounded bg-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                          {isFotoOk ? (
                            <img
                              src={data.doc_foto}
                              alt={`Pas Foto ${student.nama}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-1">
                              <Camera className="w-4 h-4 text-slate-350 mx-auto mb-0.5" />
                              <span className="text-[5px] font-black text-slate-400 block uppercase leading-tight">FOTO 3X4</span>
                            </div>
                          )}
                          <div className="absolute bottom-0.5 right-0.5 bg-white/90 p-0.5 rounded border border-slate-100">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                          </div>
                        </div>
                        <span className="text-[5px] font-black text-slate-400 mt-1 uppercase">Pas Foto Siswa</span>
                      </div>

                      {/* Official QR Code */}
                      <div className="flex flex-col items-center">
                        <FormQRCode code={formNumber} size={50} />
                        <span className="text-[5px] font-black text-slate-400 mt-1 uppercase">QR Verifikasi</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION B: AKADEMIK */}
                <div className="space-y-1 section-block">
                  <h4 className="section-title bg-slate-100 text-slate-800 px-2 py-0.8 text-[8px] font-black uppercase tracking-wider rounded border border-slate-200/50 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-emerald-600" /> B. DATA AKADEMIK & PROGRAM PILIHAN
                  </h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[8px] font-bold text-slate-600 pl-2">
                    <div className="grid grid-cols-3 gap-1">
                      <span className="col-span-1 text-slate-400 font-semibold">Program Kesetaraan</span>
                      <span className="col-span-2 text-emerald-700 font-black uppercase">: {data.program}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="col-span-1 text-slate-400 font-semibold">Tahun Ajaran</span>
                      <span className="col-span-2 text-slate-900 font-black">: {student.tahunAjaran || '2025/2026'}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="col-span-1 text-slate-400 font-semibold">Tipe / Kelas</span>
                      <span className="col-span-2 text-slate-900 font-black">: {data.tipe_kelas || 'Reguler'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="col-span-1 text-slate-400 font-semibold">Semester Awal</span>
                      <span className="col-span-2 text-slate-900 font-black">: 1 (Ganjil)</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="col-span-1 text-slate-400 font-semibold">Sekolah Asal</span>
                      <span className="col-span-2 text-slate-900 font-black">: {data.sekolah_asal}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="col-span-1 text-slate-400 font-semibold">Tahun Keluar/Lulus</span>
                      <span className="col-span-2 text-slate-900 font-black font-mono">: {data.tahun_lulus}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 col-span-2">
                      <span className="col-span-1/2 text-slate-400 font-semibold">Alasan Bergabung</span>
                      <span className="col-span-1.5 text-slate-900 font-black italic">: Ingin mendapatkan ijazah setara resmi untuk melanjutkan jenjang karier dan masa depan</span>
                    </div>
                  </div>
                </div>

                {/* SECTION C: ORANG TUA */}
                <div className="space-y-1 section-block">
                  <h4 className="section-title bg-slate-100 text-slate-800 px-2 py-0.8 text-[8px] font-black uppercase tracking-wider rounded border border-slate-200/50 flex items-center gap-1">
                    <User className="w-3 h-3 text-emerald-600" /> C. DATA ORANG TUA / WALI KANDUNG
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4 pl-2 text-[7.5px]">
                    {/* Father Block */}
                    <div className="p-2 border border-slate-200 rounded-xl space-y-0.5 bg-slate-50/20">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider block">Ayah Kandung</span>
                      <div className="space-y-0.5">
                        <p className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-400 font-semibold">Nama Lengkap:</span>
                          <span className="text-slate-900 font-black uppercase">{data.nama_ayah}</span>
                        </p>
                        <p className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-400 font-semibold">NIK KTP:</span>
                          <span className="text-slate-900 font-black font-mono">{data.nik_ayah}</span>
                        </p>
                        <p className="flex justify-between pb-0.5">
                          <span className="text-slate-400 font-semibold">Pekerjaan & Pend:</span>
                          <span className="text-slate-900 font-black">{data.pekerjaan_ayah} ({data.pendidikan_ayah})</span>
                        </p>
                      </div>
                    </div>

                    {/* Mother Block */}
                    <div className="p-2 border border-slate-200 rounded-xl space-y-0.5 bg-slate-50/20">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider block">Ibu Kandung</span>
                      <div className="space-y-0.5">
                        <p className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-400 font-semibold">Nama Lengkap:</span>
                          <span className="text-slate-900 font-black uppercase">{data.nama_ibu}</span>
                        </p>
                        <p className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-400 font-semibold">NIK KTP:</span>
                          <span className="text-slate-900 font-black font-mono">{data.nik_ibu}</span>
                        </p>
                        <p className="flex justify-between pb-0.5">
                          <span className="text-slate-400 font-semibold">Pekerjaan & Pend:</span>
                          <span className="text-slate-900 font-black">{data.pekerjaan_ibu} ({data.pendidikan_ibu})</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {data.gunakan_wali && (
                    <div className="mt-1 pl-2 grid grid-cols-1 text-[7.5px]">
                      <div className="p-1.5 border border-slate-200 rounded-xl space-y-0.5 bg-amber-50/10">
                        <span className="text-[7px] font-black text-amber-600 uppercase tracking-wider block">Wali Murid / Penghubung</span>
                        <div className="grid grid-cols-3 gap-2">
                          <p className="flex justify-between border-r border-slate-100 pr-2">
                            <span className="text-slate-400 font-semibold">Nama Wali:</span>
                            <span className="text-slate-900 font-black uppercase">{data.nama_wali}</span>
                          </p>
                          <p className="flex justify-between border-r border-slate-100 pr-2 pl-1">
                            <span className="text-slate-400 font-semibold">Hubungan:</span>
                            <span className="text-slate-900 font-black">{data.hubungan_wali}</span>
                          </p>
                          <p className="flex justify-between pl-1">
                            <span className="text-slate-400 font-semibold">No. HP Wali:</span>
                            <span className="text-slate-900 font-black font-mono">{data.hp_wali || '081234567899'}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION D: DOKUMEN PERSYARATAN */}
                <div className="space-y-1 section-block">
                  <h4 className="section-title bg-slate-100 text-slate-800 px-2 py-0.8 text-[8px] font-black uppercase tracking-wider rounded border border-slate-200/50 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-emerald-600" /> D. KELENGKAPAN DOKUMEN PERSYARATAN ADMINISTRASI (DIGITAL)
                  </h4>
                  
                  <div className="pl-2 space-y-2 text-[7.5px] font-bold text-slate-600">
                    <div className="grid grid-cols-2 gap-3 items-start">
                      {[
                        {
                          name: 'Foto KTP / KIA',
                          val: data.doc_ktp,
                          imageClass: 'w-full max-h-[170px] object-contain'
                        },
                        {
                          name: 'Pas Foto 3x4 Resmi',
                          val: data.doc_foto,
                          imageClass: 'mx-auto w-[90px] h-[120px] object-cover'
                        }
                      ].map((doc, idx) => {
                        const docStatus = getDocumentStatus(doc.val);

                        return (
                          <div
                            key={idx}
                            className={`rounded border p-2 ${
                              docStatus.isOk
                                ? 'border-emerald-200 bg-emerald-50/10'
                                : 'border-rose-200 bg-rose-50/10'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-black text-slate-700">{doc.name}</span>
                              <span className={`px-1 py-0.5 rounded border text-[6px] uppercase ${docStatus.badgeClass}`}>
                                {docStatus.text}
                              </span>
                            </div>

                            {docStatus.isOk ? (
                              <img
                                src={doc.val}
                                alt={doc.name}
                                className={`${doc.imageClass} border border-slate-200 rounded bg-white`}
                              />
                            ) : (
                              <div className="h-20 flex items-center justify-center border border-dashed border-slate-300 rounded text-slate-400">
                                Dokumen belum tersedia
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {[
                      {
                        name: 'Scan Kartu Keluarga (KK)',
                        val: data.doc_kk,
                        imageClass: 'mx-auto w-full max-w-[560px] max-h-[300px] object-contain'
                      },
                      {
                        name: 'Scan Ijazah Terakhir',
                        val: data.doc_ijazah,
                        imageClass: 'mx-auto w-full max-w-[560px] max-h-[320px] object-contain'
                      }
                    ].map((doc, idx) => {
                      const docStatus = getDocumentStatus(doc.val);

                      return (
                        <div
                          key={idx}
                          className={`rounded border p-2 ${
                            docStatus.isOk
                              ? 'border-emerald-200 bg-emerald-50/10'
                              : 'border-rose-200 bg-rose-50/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-slate-700">{doc.name}</span>
                            <span className={`px-1 py-0.5 rounded border text-[6px] uppercase ${docStatus.badgeClass}`}>
                              {docStatus.text}
                            </span>
                          </div>

                          {docStatus.isOk ? (
                            <img
                              src={doc.val}
                              alt={doc.name}
                              className={`${doc.imageClass} border border-slate-200 rounded bg-white`}
                            />
                          ) : (
                            <div className="h-24 flex items-center justify-center border border-dashed border-slate-300 rounded text-slate-400">
                              Dokumen belum tersedia
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION E: HASIL VERIFIKASI & RIWAYAT LOGS */}
                <div className="space-y-1 section-block">
                  <h4 className="section-title bg-slate-100 text-slate-800 px-2 py-0.8 text-[8px] font-black uppercase tracking-wider rounded border border-slate-200/50 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> E. HASIL AUDIT PENINJAUAN & VERIFIKASI SISTEM
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-3 pl-2">
                    {/* Status Box */}
                    <div className="col-span-1 p-2 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col justify-center items-center text-center">
                      <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">Status Kelayakan</span>
                      <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider border ${
                        student.status === 'Aktif' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : student.status === 'Nonaktif'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {student.status === 'Aktif' ? 'MEMENUHI SYARAT' : student.status === 'Nonaktif' ? 'TIDAK MEMENUHI' : 'DALAM PENINJAUAN'}
                      </span>
                    </div>

                    {/* Catatan Box */}
                    <div className="col-span-2 p-2 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col justify-center">
                      <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Catatan Petugas Verifikasi</span>
                      <p className="text-[7.5px] font-black text-slate-700 leading-snug italic">
                        "{student.catatanVerifikasi || (student.status === 'Aktif' ? 'Seluruh berkas persyaratan PPDB online telah diperiksa dan dinyatakan lengkap serta memenuhi syarat pendaftaran PKBM Darul Ulum.' : 'Sedang dalam antrean pemeriksaan kelayakan dokumen pendaftaran online.')}"
                      </p>
                    </div>
                  </div>

                  {/* Riwayat Table */}
                  <div className="pl-2 mt-2">
                    <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">Log Riwayat Verifikasi Arsip</span>
                    <div className="border border-slate-200 rounded-lg overflow-hidden text-[7px]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider">
                            <th className="p-1 pl-2">Petugas Verifikator</th>
                            <th className="p-1">Tanggal & Waktu</th>
                            <th className="p-1">Status</th>
                            <th className="p-1 pr-2">Keterangan / Hasil Audit Berkas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                          {riwayat.map((log, index) => (
                            <tr key={index} className="hover:bg-slate-50/50">
                              <td className="p-1 pl-2 text-slate-900 font-extrabold">{log.admin}</td>
                              <td className="p-1 font-mono">{log.tanggal} | {log.jam}</td>
                              <td className="p-1">
                                <span className={`px-1 py-0.2 rounded font-black text-[5.5px] ${
                                  log.status === 'DISETUJUI' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  log.status === 'DITOLAK' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                  'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                              <td className="p-1 pr-2 text-slate-500 italic font-medium">{log.catatan}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* SECTION F: STATEMENT */}
                <div className="p-2 border border-dashed border-slate-300 bg-slate-50/50 rounded-xl space-y-0.5 section-block">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Shield className="w-3 h-3 text-rose-500" /> F. PERNYATAAN RESMI KEABSAHAN DATA (SURAT PERNYATAAN)
                  </span>
                  <p className="text-[7.2px] font-bold text-slate-500 leading-normal italic text-justify">
                    "Saya menyatakan bahwa seluruh data yang saya berikan adalah benar. Apabila di kemudian hari terdapat data yang tidak benar maka saya bersedia menerima konsekuensi hukum dan administratif sesuai ketentuan PKBM Darul Ulum."
                  </p>
                </div>

              </div>
            </div>

            {/* SECTION G: SIGNATURES BLOCK */}
            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-200 text-center text-[8px] section-block">
              {/* Parent */}
              <div className="flex flex-col justify-between h-20">
                <span className="text-slate-400 uppercase tracking-wider font-bold">Orang Tua / Wali Murid</span>
                
                <div className="h-10 flex items-center justify-center relative my-0.5">
                  {data.sig_ortu_data ? (
                    <img 
                      src={data.sig_ortu_data} 
                      alt="Tanda Tangan Orang Tua" 
                      className="max-h-8 max-w-full object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-[6.5px] text-slate-300 italic font-medium">Tanda Tangan Digital</div>
                  )}
                  <div className="absolute bottom-0 left-2 right-2 h-px bg-slate-200"></div>
                </div>
                
                <span className="text-slate-900 font-black uppercase block">{data.nama_ayah || 'Orang Tua / Wali'}</span>
              </div>

              {/* Student */}
              <div className="flex flex-col justify-between h-20">
                <span className="text-slate-400 uppercase tracking-wider font-bold">Calon Peserta Didik</span>
                
                <div className="h-10 flex items-center justify-center relative my-0.5">
                  {data.sig_siswa_data ? (
                    <img 
                      src={data.sig_siswa_data} 
                      alt="Tanda Tangan Calon Siswa" 
                      className="max-h-8 max-w-full object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-[6.5px] text-slate-300 italic font-medium">Tanda Tangan Digital</div>
                  )}
                  <div className="absolute bottom-0 left-2 right-2 h-px bg-slate-200"></div>
                </div>
                
                <span className="text-slate-900 font-black uppercase block">{data.nama}</span>
              </div>

              {/* Verified officer */}
              <div className="flex flex-col justify-between h-20 border border-dashed border-slate-200 rounded-xl p-1 bg-slate-50/20 relative">
                <span className="text-slate-400 uppercase tracking-wider font-bold">Petugas Verifikasi PKBM</span>
                
                {/* Stamp overlay indicator */}
                <div className="absolute right-1 top-6 w-8 h-8 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500/35 font-black text-[4.5px] uppercase rotate-12 select-none">
                  STEMPEL PKBM
                </div>

                <div className="h-10 flex items-center justify-center relative my-0.5">
                  {student.status === 'Aktif' ? (
                    <div className="text-center">
                      <span className="text-[5.5px] text-emerald-600 font-black block uppercase leading-none">TERVERIFIKASI</span>
                      <span className="text-[4.5px] text-slate-400 block font-mono">16/07/2026</span>
                    </div>
                  ) : (
                    <div className="text-[6px] text-slate-300 font-bold italic uppercase">Area TTD & Stempel</div>
                  )}
                  <div className="absolute bottom-0 left-2 right-2 h-px bg-slate-200"></div>
                </div>
                
                <span className="text-slate-400 font-bold block">( ................................................. )</span>
              </div>
            </div>

            {/* DOCUMENT FOOTER IDENTITAS DOKUMEN */}
            <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-[6.5px] text-slate-400 font-extrabold font-mono uppercase tracking-wider section-block mt-2">
              <span>LULUS.ID V2 PPDB DIGITAL SYSTEM</span>
              <span>DOKUMEN INI ADALAH SALINAN RESMI ARSIP ELEKTRONIK</span>
              <span>HALAMAN 1 DARI 1 | DICETAK: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
