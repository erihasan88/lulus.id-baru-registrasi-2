import React, { useState } from 'react';
import { 
  BookOpen, 
  Map, 
  CheckCircle, 
  FileCheck, 
  Info, 
  Smile, 
  Users, 
  UserCheck, 
  ExternalLink,
  ClipboardList
} from 'lucide-react';
import { api } from '../lib/api';

interface OrientationDashboardProps {
  registration: any;
  onRefresh: () => void;
  onCompleteOrientation: () => void;
}

export const OrientationDashboard: React.FC<OrientationDashboardProps> = ({
  registration,
  onRefresh,
  onCompleteOrientation
}) => {
  const [nik, setNik] = useState(registration?.biodata?.nik || '');
  const [nisn, setNisn] = useState(registration?.biodata?.nisn || '');
  const [noHp, setNoHp] = useState(registration?.biodata?.no_hp || '');
  const [alamat, setAlamat] = useState(registration?.biodata?.alamat || '');
  const [ibu, setIbu] = useState(registration?.biodata?.nama_ibu || '');
  const [ayah, setAyah] = useState(registration?.biodata?.nama_ayah || '');
  const [riwayatSekolah, setRiwayatSekolah] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(registration?.biodata?.is_akademik_complete || false);

  const isPlotted = registration?.biodata?.kelas_plotted || false;
  const plottedRombel = registration?.biodata?.rombel_nama || '';

  const handleSaveAcademic = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedBiodata = {
        ...registration.biodata,
        nik,
        nisn,
        no_hp: noHp,
        alamat,
        nama_ibu: ibu,
        nama_ayah: ayah,
        riwayat_sekolah: riwayatSekolah,
        is_akademik_complete: true
      };
      
      await api.updateMyRegistration({ biodata: updatedBiodata });
      setIsSaved(true);
      alert("Biodata Akademik berhasil disimpan! Data dikirim ke staf Kurikulum untuk Plotting Kelas Rombongan Belajar (Rombel).");
      onRefresh();
    } catch (err: any) {
      alert("Gagal menyimpan biodata akademik: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const orientationSteps = [
    { label: 'Aktivasi Berhasil', desc: 'Selamat, pembayaran biaya pendaftaran pendaftaran valid.', done: true },
    { label: 'Isi Biodata Akademik', desc: 'Lengkapi NISN, NIK, dan nama orang tua untuk pelaporan Data Dapodik Kemendikbud.', done: isSaved },
    { label: 'Plotting Kelas & Rombel', desc: 'Staf kurikulum memasukkan Anda ke kelas belajar utama.', done: isPlotted },
    { label: 'Buka Akses LMS Lulus.id', desc: 'Mulai akses materi ajar, latihan soal CBT, dan bertatap muka bersama Guru.', done: isPlotted }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Premium Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-pink-500/10 rounded-xl text-pink-500">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-100">Portal Orientasi Akademik Lulus.id</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PKBM Agrabinta Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPlotted && (
            <button
              onClick={onCompleteOrientation}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black text-white rounded-lg transition-all animate-bounce shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              Masuk LMS Sekolah 🚀
            </button>
          )}
          <button 
            onClick={onRefresh}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 rounded-lg transition-all cursor-pointer"
          >
            Refresh Status
          </button>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: GUIDES & ORIENTATION STEPS */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-6">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-none block">Panduan Onboarding</span>
              <h3 className="text-sm font-black text-slate-100">Langkah Masa Pengenalan</h3>
              <p className="text-[10.5px] text-slate-400 font-semibold leading-relaxed">
                Ikuti instruksi berikut untuk menyelesaikan administrasi Dapodik kesetaraan.
              </p>
            </div>

            <div className="space-y-4">
              {orientationSteps.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border mt-0.5 ${
                    step.done 
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                      : 'bg-slate-950 border-slate-850 text-slate-600'
                  }`}>
                    {step.done ? <CheckCircle className="w-3 h-3" /> : <span className="text-[8px] font-black">{idx + 1}</span>}
                  </div>
                  <div>
                    <h4 className={`text-[11px] font-black leading-tight ${step.done ? 'text-slate-200' : 'text-slate-500'}`}>
                      {step.label}
                    </h4>
                    <p className="text-[9.5px] text-slate-400 font-medium leading-relaxed mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* School Info Block */}
            <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-indigo-400 font-black uppercase text-[9px] tracking-wider">
                <Users className="w-4 h-4" /> Kelas Belajar Anda:
              </div>
              <p className="text-[10.5px] text-slate-400 font-semibold leading-relaxed">
                {isPlotted 
                  ? `Selamat! Anda telah di-plot ke rombel: **${plottedRombel}**. Akses LMS sekolah Anda kini telah terbuka lebar!`
                  : 'Kurikulum sedang menyiapkan kelas Anda. Setelah biodata akademik di bawah dikirimkan, admin akan langsung memplot Anda ke kelas.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: BIODATA FORM / WAITING PLOTTING PANEL */}
        <div className="lg:col-span-2 space-y-6">
          {isPlotted ? (
            /* CONGRATULATIONS AND LMS LAUNCH SCREEN */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center text-emerald-500 mx-auto">
                <Smile className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">Siswa Resmi PKBM Agrabinta</span>
                <h3 className="text-lg font-black text-slate-100">Selamat Belajar, Kak! 🎉</h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Akun Anda sudah sepenuhnya aktif dan terdaftar di kelas **{plottedRombel}**. Seluruh program pembelajaran di Lulus.id mulai dari Modul, Latihan Soal, hingga CBT, sudah bisa diakses sekarang.
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl max-w-sm mx-auto text-left space-y-1.5">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Rincian Penugasan Kelas:</span>
                <span className="block text-xs font-black text-slate-200">Program: {registration?.program_paket}</span>
                <span className="block text-xs font-black text-indigo-400">Rombel: {plottedRombel}</span>
                <span className="block text-xs font-black text-emerald-400">Kelas Akademik: {registration?.tipe_kelas}</span>
              </div>

              <button
                onClick={onCompleteOrientation}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-pink-600/15 cursor-pointer flex items-center gap-1.5 mx-auto"
              >
                Masuk LMS Kelas Belajar <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          ) : isSaved ? (
            /* WAITING FOR CLASS PLOTTING SCREEN */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-6">
              <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center text-indigo-400 mx-auto animate-pulse">
                <UserCheck className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">Pengajuan Berhasil</span>
                <h3 className="text-base font-black text-slate-100">Menunggu Plotting Rombongan Belajar (Rombel)</h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Terima kasih, Kak. Biodata akademik resmi Anda sudah terkirim secara valid di database kesiswaan. Tim kurikulum kami akan memvalidasi NISN/NIK Anda untuk pelaporan Dapodik dan mem-plot Anda ke dalam kelas utama dalam hitungan menit.
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl max-w-sm mx-auto text-left space-y-1.5 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-amber-400 font-extrabold uppercase text-[9px] tracking-wider mb-1">
                  <Info className="w-3.5 h-3.5" /> Apa yang harus dilakukan sekarang?
                </div>
                <p className="text-[10.5px] text-slate-400 leading-relaxed">
                  Anda bisa menyegarkan portal ini berkala. Setelah admin menyelesaikan penugasan kelas, tombol "Masuk LMS Kelas Belajar" akan otomatis aktif di bagian atas.
                </p>
              </div>
            </div>
          ) : (
            /* COMPLETING DAPODIK BIODATA FORM */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                  Formulir Biodata Pelaporan Dapodik Kemendikbud
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Seluruh data di bawah wajib diisi dengan benar sesuai Kartu Keluarga guna keselarasan ijazah kelulusan nasional resmi Anda.
                </p>
              </div>

              <form onSubmit={handleSaveAcademic} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* NIK Input */}
                  <div className="space-y-1.5 text-xs font-semibold">
                    <label className="text-[10.5px] text-slate-300">Nomor Induk Kependudukan (NIK) *</label>
                    <input 
                      type="text" 
                      maxLength={16} 
                      value={nik} 
                      onChange={(e) => setNik(e.target.value)}
                      placeholder="Sesuai KK (16 digit)"
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 outline-none transition-colors"
                      required
                    />
                  </div>

                  {/* NISN Input */}
                  <div className="space-y-1.5 text-xs font-semibold">
                    <label className="text-[10.5px] text-slate-300">Nomor Induk Siswa Nasional (NISN) - Jika Ada</label>
                    <input 
                      type="text" 
                      maxLength={10} 
                      value={nisn} 
                      onChange={(e) => setNisn(e.target.value)}
                      placeholder="NISN (10 digit, kosongkan bila tidak punya)"
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  {/* Nama Ibu Kandung */}
                  <div className="space-y-1.5 text-xs font-semibold">
                    <label className="text-[10.5px] text-slate-300">Nama Lengkap Ibu Kandung *</label>
                    <input 
                      type="text" 
                      value={ibu} 
                      onChange={(e) => setIbu(e.target.value)}
                      placeholder="Nama Ibu Kandung"
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 outline-none transition-colors"
                      required
                    />
                  </div>

                  {/* Nama Ayah */}
                  <div className="space-y-1.5 text-xs font-semibold">
                    <label className="text-[10.5px] text-slate-300">Nama Lengkap Ayah Kandung *</label>
                    <input 
                      type="text" 
                      value={ayah} 
                      onChange={(e) => setAyah(e.target.value)}
                      placeholder="Nama Ayah Kandung"
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Nomor Handphone & Alamat */}
                <div className="space-y-4">
                  <div className="space-y-1.5 text-xs font-semibold">
                    <label className="text-[10.5px] text-slate-300">Nomor Handphone (WhatsApp aktif) *</label>
                    <input 
                      type="tel" 
                      value={noHp} 
                      onChange={(e) => setNoHp(e.target.value)}
                      placeholder="Contoh: 0812XXXXXXXX"
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 text-xs font-semibold">
                    <label className="text-[10.5px] text-slate-300">Alamat Rumah Lengkap (RT/RW, Desa, Kecamatan, Kab/Kota) *</label>
                    <textarea 
                      value={alamat} 
                      onChange={(e) => setAlamat(e.target.value)}
                      placeholder="Alamat domisili lengkap sesuai KK..."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 outline-none transition-colors resize-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 text-xs font-semibold">
                    <label className="text-[10.5px] text-slate-300">Sekolah Asal Sebelumnya *</label>
                    <input 
                      type="text" 
                      value={riwayatSekolah} 
                      onChange={(e) => setRiwayatSekolah(e.target.value)}
                      placeholder="Contoh: SMP Negeri 1 Sukabumi"
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/10 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan Biodata Akademik Dapodik 💾'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
