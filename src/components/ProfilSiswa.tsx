import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserCheck, ShieldCheck, Download, GraduationCap, Users, Bookmark, CheckCircle, LogOut, FileText, Camera, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import FormulirPendaftaranModal from './FormulirPendaftaranModal';

interface ProfilSiswaProps {
  onBack: () => void;
  showModal: (title: string, desc: string, type?: 'info' | 'warning' | 'success') => void;
  onBackToLogin?: () => void;
  students?: any[];
  setStudents?: React.Dispatch<React.SetStateAction<any[]>>;
  username?: string;
}

export default function ProfilSiswa({ 
  onBack, 
  showModal, 
  onBackToLogin,
  students,
  setStudents,
  username
}: ProfilSiswaProps) {
  const [profileData, setProfileData] = useState<any>(() => {
    const cached = localStorage.getItem('user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [showPPDB, setShowPPDB] = useState(false);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await api.getCurrentUser();
        if (data) {
          setProfileData(data);
          localStorage.setItem('user', JSON.stringify(data));
        }
      } catch (e) {
        console.warn('Gagal memuat profil terbaru dari API Django, menggunakan data lokal/mock.', e);
      }
    }
    loadProfile();
  }, []);

  const currentStudent = (students && students.find(s => 
    s.nama === username || 
    s.username?.toLowerCase() === username?.toLowerCase() ||
    s.id === profileData?.id
  )) || (students && students[0]) || {
    id: 'SIS-1001',
    nama: 'Fajar Pratama',
    dokumen: { foto: '' }
  };

  // Map fields dynamically with fallbacks
  const getField = (pathStr: string, fallback: string) => {
    if (!profileData) return fallback;
    const parts = pathStr.split('.');
    let current = profileData;
    for (const part of parts) {
      if (current === null || current === undefined) return fallback;
      current = current[part];
    }
    return current !== undefined && current !== null ? String(current) : fallback;
  };

  const namaLengkap = getField('nama_lengkap', getField('username', 'Fajar Pratama')).toUpperCase();
  const nisn = getField('siswa_detail.nisn', getField('nisn', '0098765432'));
  const nis = getField('siswa_detail.nis', getField('nis', '2025100039'));
  const program = getField('siswa_detail.program', getField('program', 'Kesetaraan Paket C'));
  const kelas = getField('siswa_detail.kelas', getField('kelas', 'X (Sepuluh)'));
  const nik = getField('siswa_detail.nik', getField('nik', '3201234567890123'));
  const tglLahir = getField('siswa_detail.tanggal_lahir', '14 April 2008');
  const tempatLahir = getField('siswa_detail.tempat_lahir', 'Cianjur');
  const jk = getField('siswa_detail.jenis_kelamin', 'Laki-Laki');
  const agama = getField('siswa_detail.agama', 'Islam');
  const namaAyah = getField('siswa_detail.nama_ayah', 'Slamet Rahardjo');
  const namaIbu = getField('siswa_detail.nama_ibu', 'Siti Aminah');
  const alamat = getField('siswa_detail.alamat', 'Kp. Agrabinta RT 03 / RW 04, Desa Agrabinta, Cianjur, Jawa Barat');

  // Photo handlers
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Format validation
    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedFormats.includes(file.type)) {
      showModal(
        'Format File Salah',
        'Format file tidak didukung. Harap pilih foto berformat JPG, JPEG, PNG, atau WEBP.',
        'warning'
      );
      return;
    }

    // Size limit validation (800KB to prevent localStorage bloat)
    const maxSize = 800 * 1024;
    if (file.size > maxSize) {
      showModal(
        'Ukuran File Terlalu Besar',
        'Ukuran foto terlalu besar. Harap pilih foto dengan ukuran maksimal 800 KB agar sistem tetap lancar.',
        'warning'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setTempPhoto(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = () => {
    if (!tempPhoto) return;

    if (setStudents && currentStudent) {
      setStudents(prev => prev.map(s => {
        if (s.id === currentStudent.id) {
          return {
            ...s,
            photo: tempPhoto
          };
        }
        return s;
      }));

      const cached = localStorage.getItem('user');
      if (cached) {
        try {
          const userObj = JSON.parse(cached);
          userObj.photo = tempPhoto;
          if (userObj.siswa_detail) {
            if (!userObj.siswa_detail.dokumen) {
              userObj.siswa_detail.dokumen = {};
            }
            userObj.siswa_detail.dokumen.foto = tempPhoto;
          }
          localStorage.setItem('user', JSON.stringify(userObj));
          setProfileData(userObj);
        } catch (e) {}
      }

      setTempPhoto(null);
      showModal('Foto Profil Disimpan', 'Foto profil Anda berhasil diperbarui secara aman.', 'success');
    } else {
      const cached = localStorage.getItem('user');
      if (cached) {
        try {
          const userObj = JSON.parse(cached);
          userObj.photo = tempPhoto;
          if (userObj.siswa_detail) {
            if (!userObj.siswa_detail.dokumen) {
              userObj.siswa_detail.dokumen = {};
            }
            userObj.siswa_detail.dokumen.foto = tempPhoto;
          }
          localStorage.setItem('user', JSON.stringify(userObj));
          setProfileData(userObj);
        } catch (e) {}
      }
      setTempPhoto(null);
      showModal('Foto Profil Disimpan', 'Foto profil Anda berhasil diperbarui.', 'success');
    }
  };

  const handleCancelPhoto = () => {
    setTempPhoto(null);
  };

  const handleDeletePhoto = () => {
    if (setStudents && currentStudent) {
      setStudents(prev => prev.map(s => {
        if (s.id === currentStudent.id) {
          return {
            ...s,
            photo: undefined
          };
        }
        return s;
      }));
    }

    const cached = localStorage.getItem('user');
    if (cached) {
      try {
        const userObj = JSON.parse(cached);
        delete userObj.photo;
        if (userObj.siswa_detail && userObj.siswa_detail.dokumen) {
          userObj.siswa_detail.dokumen.foto = 'pas_foto_default.jpg';
        }
        localStorage.setItem('user', JSON.stringify(userObj));
        setProfileData(userObj);
      } catch (e) {}
    }

    showModal('Foto Profil Dihapus', 'Foto profil telah dihapus dan dikembalikan ke default.', 'success');
  };

  const currentPhoto = tempPhoto || currentStudent?.photo || profileData?.photo || (profileData?.siswa_detail?.dokumen?.foto && (profileData.siswa_detail.dokumen.foto.startsWith('data:') || profileData.siswa_detail.dokumen.foto.startsWith('blob:')) ? profileData.siswa_detail.dokumen.foto : null);
  const displayPhotoUrl = currentPhoto || `https://placehold.co/150x150/15803d/ffffff?text=${encodeURIComponent(namaLengkap[0] || 'S')}`;

  const handleDownload = (docName: string) => {
    showModal(
      'Mengunduh Identitas Rapor', 
      `Salinan digital berkas ${docName} sedang digenerate untuk dicetak sebagai halaman depan binder fisik Rapor...`, 
      'success'
    );
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-50 overflow-hidden z-10 font-sans">
      
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-extrabold text-slate-800">Profil Siswa</h2>
        </div>
        <span className="px-2 py-0.5 text-[8px] font-extrabold bg-emerald-100 text-emerald-600 rounded-full border border-emerald-200">
          Aktif / Terdaftar
        </span>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        
        {/* Profile Card Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-[40px] pointer-events-none flex justify-center items-center pl-4 pb-4">
            <Bookmark className="w-5 h-5 text-emerald-500/20" />
          </div>
          <div className="relative group">
            <img 
              src={displayPhotoUrl} 
              alt={namaLengkap} 
              className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-md bg-slate-100"
            />
            <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-md cursor-pointer transition-colors">
              <Camera className="w-4 h-4" />
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg, image/webp" 
                onChange={handlePhotoChange} 
                className="hidden" 
              />
            </label>
          </div>

          {tempPhoto && (
            <div className="mt-3 flex items-center gap-1.5">
              <button 
                onClick={handleSavePhoto}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Simpan
              </button>
              <button 
                onClick={handleCancelPhoto}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] font-bold rounded-lg transition-all cursor-pointer"
              >
                Batal
              </button>
            </div>
          )}

          {!tempPhoto && (currentStudent?.photo || profileData?.photo) && (
            <button 
              onClick={handleDeletePhoto}
              className="mt-3 text-[9px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer bg-rose-50/50 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100/50 transition-all"
            >
              <Trash2 className="w-3 h-3" /> Hapus Foto Profil
            </button>
          )}

          <h3 className="text-sm font-black text-slate-850 mt-3">{namaLengkap}</h3>
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">NISN: {nisn}</p>
          
          <div className="w-full h-[1px] bg-slate-100 my-3"></div>
          
          <div className="grid grid-cols-2 gap-y-1.5 w-full text-left text-[9px] font-bold text-slate-500">
            <div>Program Kesetaraan</div>
            <div className="text-slate-800 text-right">{program}</div>
            <div>Tingkat Kelas</div>
            <div className="text-slate-800 text-right">{kelas}</div>
            <div>Tahun Pelajaran</div>
            <div className="text-slate-800 text-right">2025/2026 - Genap</div>
          </div>
        </div>

        {/* Section A: Identitas Siswa */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <h4 className="text-xs font-black text-slate-800 border-l-3 border-emerald-500 pl-2">
            A. Identitas Diri Siswa
          </h4>
          <div className="space-y-2 text-[10px] text-slate-500 font-semibold divide-y divide-slate-50">
            <div className="flex justify-between items-center py-1.5">
              <span>Nama Lengkap</span>
              <strong className="text-slate-800">{namaLengkap}</strong>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>Nomor Induk Siswa (NIS)</span>
              <strong className="text-slate-800">{nis}</strong>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>Nomor Induk Siswa Nasional (NISN)</span>
              <strong className="text-slate-800">{nisn}</strong>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>Tempat, Tanggal Lahir</span>
              <strong className="text-slate-800">{tempatLahir}, {tglLahir}</strong>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>Jenis Kelamin</span>
              <strong className="text-slate-800">{jk}</strong>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>Agama</span>
              <strong className="text-slate-800">{agama}</strong>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>Status dalam Keluarga</span>
              <strong className="text-slate-800">Anak Kandung</strong>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>Anak Ke-</span>
              <strong className="text-slate-800">2 (Dua)</strong>
            </div>
            <div className="flex flex-col py-1.5 space-y-1">
              <span>Alamat Domisili Tempat Tinggal</span>
              <strong className="text-slate-800 leading-normal">
                {alamat}
              </strong>
            </div>
          </div>
        </div>

        {/* Section B: Orang Tua */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <h4 className="text-xs font-black text-slate-800 border-l-3 border-emerald-500 pl-2">
            B. Identitas Orang Tua / Wali
          </h4>
          <div className="space-y-2 text-[10px] text-slate-500 font-semibold divide-y divide-slate-50">
            <div className="flex justify-between items-center py-1.5">
              <span>Nama Ayah Kandung</span>
              <strong className="text-slate-800">{namaAyah}</strong>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>Nama Ibu Kandung</span>
              <strong className="text-slate-800">{namaIbu}</strong>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>Pekerjaan Ayah</span>
              <strong className="text-slate-800">Petani</strong>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>Pekerjaan Ibu</span>
              <strong className="text-slate-800">Ibu Rumah Tangga</strong>
            </div>
          </div>
        </div>

        {/* Section C: Data Akademik & Satuan Pendidikan */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <h4 className="text-xs font-black text-slate-800 border-l-3 border-emerald-500 pl-2">
            C. Pendaftaran Satuan Pendidikan
          </h4>
          <div className="space-y-2 text-[10px] text-slate-500 font-semibold divide-y divide-slate-50">
            <div className="flex justify-between items-center py-1.5">
              <span>Sekolah Asal Terakhir</span>
              <strong className="text-slate-800">SMP Negeri 1 Agrabinta</strong>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>Tanggal Masuk Sekolah</span>
              <strong className="text-slate-800">12 Juli 2025</strong>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>Sinkronisasi Data Akademik Kemdikbud</span>
              <strong className="text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Sudah Sinkron
              </strong>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>Wali Kelas Akademik</span>
              <strong className="text-slate-800">Bu Rina, S.Pd.</strong>
            </div>
          </div>
        </div>

        {/* Download Identity Sheet Action Button */}
        <div className="px-1 pb-2 space-y-2">
          <button 
            onClick={() => handleDownload('Lembar_Identitas_Rapor_Fajar')}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Lembar Identitas Rapor (PDF)</span>
          </button>
          
          <button 
            onClick={() => setShowPPDB(true)}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>Cetak / Unduh Formulir PPDB (PDF)</span>
          </button>
        </div>

        {/* Logout Action Button */}
        {onBackToLogin && (
          <div className="px-1 pb-6">
            <button 
              onClick={onBackToLogin}
              className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar / Log Out</span>
            </button>
          </div>
        )}

      </div>

      {showPPDB && profileData && (
        <FormulirPendaftaranModal
          student={{
            id: profileData.id || profileData.siswa_detail?.id || 'SIS-1001',
            nama: namaLengkap,
            nisn: nisn,
            nik: nik,
            kk: nik,
            jk: jk,
            tempatLahir: tempatLahir,
            tglLahir: tglLahir,
            status: 'Aktif',
            program: (program.includes('Paket A') ? 'Paket A' : program.includes('Paket B') ? 'Paket B' : 'Paket C') as "Paket C" | "Paket B" | "Paket A",
            kelas: kelas,
            tahunAjaran: '2025/2026',
            ayah: namaAyah,
            ibu: namaIbu,
            alamat: alamat,
            pendaftaranData: profileData.pendaftaranData || undefined,
            dokumen: profileData.siswa_detail?.dokumen || profileData.dokumen || {
              foto: profileData.siswa_detail?.foto || 'pas_foto_default.jpg',
              ktp: 'ktp_default.png',
              kk: 'kk_default.pdf',
              ijazah: 'ijazah_default.pdf'
            }
          }}
          onClose={() => setShowPPDB(false)}
          showModal={showModal}
        />
      )}
    </div>
  );
}
