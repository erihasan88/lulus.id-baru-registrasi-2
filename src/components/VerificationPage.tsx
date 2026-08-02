import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, Search, ArrowLeft, Building2, User, FileText, Calendar, BadgeCheck, BookOpen, Activity, ShieldAlert, XCircle } from 'lucide-react';
import Logo from './Logo';

interface VerificationPageProps {
  initialCode: string | null;
  onBack: () => void;
}

export default function VerificationPage({ initialCode, onBack }: VerificationPageProps) {
  const [searchCode, setSearchCode] = useState(initialCode || '');
  const [matchedDoc, setMatchedDoc] = useState<any | null>(null);
  const [searched, setSearched] = useState(false);

  const [lembagaIdentitas, setLembagaIdentitas] = useState({
    namaPkbm: '',
    namaYayasan: '',
    npsn: '',
    nomorIzinOperasional: '',
    namaKepalaSekolah: '',
    namaPejabatTtd: '',
    jabatanPejabatTtd: 'Kepala PKBM',
    tandaTanganKepalaSekolah: ''
  });

const performVerification = async (code: string) => {
    const cleanCode = code.trim();

    if (!cleanCode) {
        setMatchedDoc(null);
        setSearched(false);
        return;
    }

    try {
        const response = await fetch(
            `/api/public/verify-document/?code=${encodeURIComponent(cleanCode)}`
        );

        const result = await response.json();

        if (result.found) {
            setMatchedDoc(result);

            if (result.institution) {
                setLembagaIdentitas({
                    namaPkbm: result.institution.namaPkbm || '',
                    namaYayasan: result.institution.namaYayasan || '',
                    npsn: result.institution.npsn || '',
                    nomorIzinOperasional:
                        result.institution.nomorIzinOperasional || '',
                    namaKepalaSekolah:
                        result.institution.namaKepalaSekolah || '',
                    namaPejabatTtd:
                        result.institution.namaPenandatangan
                        || result.institution.namaKepalaSekolah
                        || '',
                    jabatanPejabatTtd: 'Kepala PKBM',
                    tandaTanganKepalaSekolah:
                        result.institution.atributPengesahanDigital || ''
                });
            }
        } else {
            setMatchedDoc(null);
        }

        setSearched(true);

    } catch (err) {
        console.error(err);
        setMatchedDoc(null);
        setSearched(true);
    }
};

useEffect(() => {
    if (initialCode) {
      performVerification(initialCode);
    }
  }, [initialCode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(searchCode);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-start p-4 md:p-8 relative">
      {/* Background glow decoration */}
      <div className="absolute top-0 inset-x-0 h-44 bg-gradient-to-b from-emerald-50/50 to-transparent pointer-events-none" />

      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 md:p-8 relative z-10 flex flex-col">
        
        {/* Header Back Button */}
        <button 
          onClick={onBack}
          className="self-start flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Login
        </button>

        {/* Logo and branding */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <Logo size={110} />
          <h2 className="text-sm font-extrabold text-slate-400 mt-2 uppercase tracking-widest">
            Portal Verifikasi Dokumen Digital
          </h2>
          <p className="text-[10px] text-slate-400 font-bold">
            Sistem Keamanan & Verifikasi Keaslian Lulus.id {lembagaIdentitas.namaPkbm}
          </p>
        </div>

        {/* Search input if no search has run, or to run a new search */}
        <form onSubmit={handleSearchSubmit} className="mb-6">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
            Masukkan Nomor / Kode Verifikasi Dokumen
          </label>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Contoh: TRK-2026-00001 atau DN-01/..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all uppercase placeholder:normal-case"
              />
            </div>
            <button 
              type="submit"
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
            >
              Verifikasi
            </button>
          </div>
        </form>

        {/* RESULTS AREA */}
        {searched ? (
          matchedDoc ? (
            <div className="space-y-6">
              
              {/* SUCCESS / REVOKED VALIDATION BANNER */}
              {(matchedDoc.isValid !== false && matchedDoc.status !== 'Dicabut') ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden animate-fade-in">
                  <div className="absolute -top-6 -right-6 w-16 h-16 bg-emerald-100/30 rounded-full blur-xl" />
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-2 shadow-lg shadow-emerald-500/20 animate-bounce">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-black text-emerald-800 uppercase tracking-wide">
                    DOKUMEN VALID & ASLI
                  </h3>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">
                    Dokumen ini terdaftar secara resmi pada pangkalan data akademik Lulus.id {lembagaIdentitas.namaPkbm}
                  </p>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden animate-fade-in">
                  <div className="absolute -top-6 -right-6 w-16 h-16 bg-rose-100/30 rounded-full blur-xl" />
                  <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white mb-2 shadow-lg shadow-rose-500/20 animate-pulse">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-black text-rose-800 uppercase tracking-wide">
                    DOKUMEN DICABUT / DITANGGUHKAN
                  </h3>
                  <p className="text-[10px] text-rose-600 font-bold mt-1 animate-pulse">
                    Otorisasi verifikasi dokumen ini ditarik sementara oleh administrator.
                  </p>
                </div>
              )}

              {/* DETAILS BENTO GRID */}
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-200">
                  Rincian Dokumen Resmi
                </h4>
                
                <div className="grid grid-cols-3 gap-y-2.5 text-xs text-left">
                  <span className="text-[10px] font-bold text-slate-400 self-center">Jenis Dokumen</span>
                  <span className="col-span-2 font-black text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    {matchedDoc.documentType}
                  </span>

                  <span className="text-[10px] font-bold text-slate-400 self-center">Nama Peserta Didik</span>
                  <span className="col-span-2 font-black text-slate-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    {matchedDoc.studentName}
                  </span>

                  <span className="text-[10px] font-bold text-slate-400 self-center">Program Layanan</span>
                  <span className="col-span-2 font-bold text-slate-700">
                    {matchedDoc.program} ({matchedDoc.kelas || 'Paket C'})
                  </span>

                  <span className="text-[10px] font-bold text-slate-400 self-center">Nomor Dokumen</span>
                  <span className="col-span-2 font-mono font-bold text-slate-800 bg-white border border-slate-200/60 rounded px-2 py-0.5 w-fit">
                    {matchedDoc.documentNumber}
                  </span>

                  <span className="text-[10px] font-bold text-slate-400 self-center">Diterbitkan Oleh</span>
                  <span className="col-span-2 font-bold text-slate-700 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {lembagaIdentitas.namaPkbm || '-'}
                  </span>

                  <span className="text-[10px] font-bold text-slate-400 self-center">NPSN</span>
                  <span className="col-span-2 font-mono font-bold text-slate-700">
                    {lembagaIdentitas.npsn || '-'}
                  </span>

                  <span className="text-[10px] font-bold text-slate-400 self-center">Nomor Izin Operasional</span>
                  <span className="col-span-2 font-mono font-bold text-slate-700 break-words">
                    {lembagaIdentitas.nomorIzinOperasional || '-'}
                  </span>

                  <span className="text-[10px] font-bold text-slate-400 self-center">Disahkan Oleh</span>
                  <span className="col-span-2 font-black text-slate-800">
                    {lembagaIdentitas.namaPejabatTtd || lembagaIdentitas.namaKepalaSekolah}
                  </span>

                  <span className="text-[10px] font-bold text-slate-400 self-center">Tanggal Terbit</span>
                  <span className="col-span-2 font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(matchedDoc.issueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>

                  <span className="text-[10px] font-bold text-slate-400 self-center">Status Validasi</span>
                  {(matchedDoc.isValid !== false && matchedDoc.status !== 'Dicabut') ? (
                    <span className="col-span-2 font-black text-emerald-600 flex items-center gap-1">
                      <BadgeCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      VALID & AKTIF
                    </span>
                  ) : (
                    <span className="col-span-2 font-black text-rose-600 flex items-center gap-1 animate-pulse">
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      TIDAK VALID / DICABUT SEMENTARA
                    </span>
                  )}

                  {(matchedDoc.notes || matchedDoc.catatanVerifikasi) && !matchedDoc.isRegistrationForm ? (
                    <>
                      <span className="text-[10px] font-bold text-slate-400 self-start">Catatan Verifikator</span>
                      <span className="col-span-2 font-medium text-slate-600 italic">
                        "{matchedDoc.notes || matchedDoc.catatanVerifikasi}"
                      </span>
                    </>
                  ) : null}

                  {matchedDoc.isRegistrationForm && (
                    <>
                      <span className="text-[10px] font-bold text-slate-400 self-center">Kelayakan PPDB</span>
                      <span className={`col-span-2 font-black flex items-center gap-1 ${
                        matchedDoc.studentStatus === 'Aktif' ? 'text-emerald-600' :
                        matchedDoc.studentStatus === 'Nonaktif' ? 'text-rose-600' :
                        'text-amber-500'
                      }`}>
                        {matchedDoc.studentStatus === 'Aktif' ? 'DISETUJUI / MEMENUHI SYARAT' :
                         matchedDoc.studentStatus === 'Nonaktif' ? 'DITOLAK / TIDAK LAYAK' :
                         'PROSES PENINJAUAN BERKAS'}
                      </span>

                      <span className="text-[10px] font-bold text-slate-400 self-start">Catatan Verifikator</span>
                      <span className="col-span-2 font-medium text-slate-700 italic">
                        "{matchedDoc.catatanVerifikasi || (matchedDoc.studentStatus === 'Aktif' ? 'Seluruh berkas persyaratan PPDB online telah diperiksa dan dinyatakan lengkap serta memenuhi syarat pendaftaran PKBM Darul Ulum.' : 'Sedang dalam antrean pemeriksaan kelayakan dokumen pendaftaran.')}"
                      </span>
                    </>
                  )}

                  {matchedDoc.documentType === 'E-Rapor' && matchedDoc.snapshotData && (
                    <div className="col-span-3 mt-4 pt-4 border-t border-slate-200 space-y-4">
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-150/80 shadow-3xs space-y-3">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                          <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                          <h5 className="text-[11px] font-black text-slate-800">Daftar Nilai Akhir Hasil Belajar</h5>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[9.5px] border-collapse text-left">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-2 font-bold text-slate-400">MATA PELAJARAN</th>
                                <th className="p-2 text-center font-bold text-slate-400">SKK</th>
                                <th className="p-2 text-center font-bold text-slate-400">NILAI</th>
                                <th className="p-2 text-center font-bold text-slate-400">STATUS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(matchedDoc.snapshotData?.subjects || []).map((sub: any) => {
                                const kkmVal = sub.kkm || 75;
                                const isPass = sub.grade >= kkmVal;
                                return (
                                  <tr key={sub.id} className="border-b border-slate-100">
                                    <td className="p-2 font-bold text-slate-700">{sub.name}</td>
                                    <td className="p-2 text-center font-medium text-slate-600">{sub.bobotSkk}</td>
                                    <td className="p-2 text-center font-black text-slate-800">{sub.grade}</td>
                                    <td className="p-2 text-center">
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                        isPass ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                                      }`}>
                                        {isPass ? 'TUNTAS' : 'PERBAIKAN'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-2xl border border-slate-150/80 shadow-3xs space-y-1 text-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Keaktifan Belajar</span>
                          <div className="text-xs font-black text-slate-800">
                            {matchedDoc.snapshotData.keaktifan?.score || 92} ({matchedDoc.snapshotData.keaktifan?.status || 'Sangat Aktif'})
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-slate-150/80 shadow-3xs space-y-1 text-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Kehadiran (Absensi)</span>
                          <div className="flex justify-around text-[9.5px] font-extrabold text-slate-700">
                            <span className="text-emerald-600">H: {matchedDoc.snapshotData.absensi?.hadirCount || 0}</span>
                            <span className="text-amber-500">S: {matchedDoc.snapshotData.absensi?.sakitCount || 0}</span>
                            <span className="text-blue-500">I: {matchedDoc.snapshotData.absensi?.izinCount || 0}</span>
                            <span className="text-rose-500">A: {matchedDoc.snapshotData.absensi?.alfaCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* TANDA TANGAN DIGITAL TERVERIFIKASI */}
              <div className="border border-slate-200/60 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-left space-y-1">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Pengesahan Lembaga
                  </h5>
                  <p className="text-xs font-black text-slate-800">
                    {lembagaIdentitas.namaPejabatTtd || lembagaIdentitas.namaKepalaSekolah}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {lembagaIdentitas.jabatanPejabatTtd || 'Kepala PKBM'}
                  </p>
                </div>
                <div className="p-1 bg-white border border-slate-100 rounded-xl max-w-[140px] flex items-center justify-center">
                  <img 
                    src={lembagaIdentitas.tandaTanganKepalaSekolah || 'https://placehold.co/200x100/ffffff/000000?text=Tanda+Tangan'} 
                    alt="Tanda Tangan Pejabat" 
                    className="max-h-12 object-contain mix-blend-multiply"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* COMPLIANCE INFORMATION */}
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 text-[9.5px] text-slate-500 leading-relaxed text-justify">
                <strong>Catatan Keamanan:</strong> Lembar verifikasi elektronik ini diterbitkan secara otomatis oleh server Lulus.id berdasarkan data tanda tangan elektronik tersertifikasi dan identitas digital {lembagaIdentitas.namaPkbm} yang sah. Modifikasi fisik maupun digital pada dokumen cetak tanpa QR Code yang valid dapat dituntut secara hukum.
              </div>

            </div>
          ) : (
            /* FAILED VALIDATION BANNER */
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white mb-2 shadow-lg shadow-rose-500/20">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-rose-800 uppercase tracking-wide">
                  DOKUMEN TIDAK VALID
                </h3>
                <p className="text-[10px] text-rose-600 font-bold mt-1">
                  Nomor dokumen atau kode verifikasi "{searchCode}" tidak ditemukan dalam database Lulus.id {lembagaIdentitas.namaPkbm}.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 text-[10px] text-slate-500 space-y-1 text-left">
                <p className="font-bold text-slate-700">Kemungkinan Penyebab:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Kode atau nomor dokumen yang dimasukkan salah/typo.</li>
                  <li>Dokumen telah dicabut, ditangguhkan, atau diganti dengan versi baru.</li>
                  <li>Dokumen bukan merupakan produk resmi keluaran {lembagaIdentitas.namaPkbm}.</li>
                </ul>
              </div>
            </div>
          )
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 space-y-2">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-[11px] font-bold">
              Masukkan nomor verifikasi atau pindai QR Code dokumen akademik Anda untuk melakukan pengecekan keabsahan secara langsung.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
