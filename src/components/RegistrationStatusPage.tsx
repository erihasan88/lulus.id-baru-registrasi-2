import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  FileText, 
  AlertTriangle, 
  Upload, 
  CheckCircle2, 
  ArrowLeft, 
  Info,
  LogOut,
  XCircle
} from 'lucide-react';
import { api } from '../lib/api';

interface RegistrationStatusPageProps {
  registration: any;
  onRefresh: () => void;
  onLogout: () => void;
}

export const RegistrationStatusPage: React.FC<RegistrationStatusPageProps> = ({ 
  registration, 
  onRefresh,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'perbaikan'>('status');
  const [reUploadFiles, setReUploadFiles] = useState<{ [key: string]: string }>({});
  const [reUploadLogs, setReUploadLogs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('TRANSFER_MANUAL');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const status = registration?.registration_status || 'MENUNGGU_VERIFIKASI';
  const notes = registration?.catatan_admin || '';
  const biodata = registration?.biodata || {};
  const dokumen = registration?.dokumen || {};
  const invoice = registration?.invoice || null;
  const paymentStatus = invoice?.payment_status || 'NONE';

  const handleSubmitPayment = async () => {
    if (!paymentProof || !registration?.id) {
      setPaymentError('Silakan pilih bukti pembayaran terlebih dahulu.');
      return;
    }

    try {
      setIsSubmittingPayment(true);
      setPaymentError(null);

      const formData = new FormData();
      formData.append('file', paymentProof);

      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(
          uploadResult.detail || 'Gagal mengunggah bukti pembayaran.'
        );
      }

      const fileUrl = uploadResult?.file?.url;

      if (!fileUrl) {
        throw new Error('URL bukti pembayaran tidak ditemukan.');
      }

      await api.uploadPublicPaymentProof(registration.id, {
        bukti_transfer: fileUrl,
        metode_pembayaran: paymentMethod
      });

      setPaymentProof(null);
      await onRefresh();

      alert(
        'Bukti pembayaran berhasil dikirim dan sedang menunggu verifikasi admin.'
      );
    } catch (err: any) {
      setPaymentError(
        err?.message || 'Gagal mengirim bukti pembayaran.'
      );
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // File type and size validator helper (3MB limit)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (3MB = 3,145,728 bytes)
    const MAX_SIZE = 3 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert(`File ${file.name} melebihi batas ukuran 3MB!`);
      return;
    }

    // Check type
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      alert(`Format file .${extension} tidak didukung! Gunakan format PDF, JPG, JPEG, atau PNG.`);
      return;
    }

    // Simulate renaming to UUID format securely
    const secureId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const renamedFileName = `${docType}_${secureId}.${extension}`;

    // Convert file to Base64 mock URL for preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setReUploadFiles(prev => ({
        ...prev,
        [docType]: reader.result as string
      }));
      setReUploadLogs(prev => [...prev, `Berhasil memuat file: ${renamedFileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`]);
    };
    reader.readAsDataURL(file);
  };

  const handleResubmit = async () => {
    if (Object.keys(reUploadFiles).length === 0) {
      setSubmitError('Pilih minimal satu dokumen yang akan diperbaiki.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(
        `/api/registration/public/status/${registration.id}/resubmit/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dokumen: reUploadFiles
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.detail || 'Gagal mengirimkan berkas perbaikan.'
        );
      }

      setReUploadFiles({});
      setReUploadLogs([]);
      await onRefresh();

      alert(
        'Berkas perbaikan berhasil dikirim dan menunggu pemeriksaan admin.'
      );

      setActiveTab('status');
    } catch (err: any) {
      setSubmitError(
        err?.message || 'Gagal mengirimkan berkas perbaikan.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-100 border-slate-200 text-slate-700';
      case 'MENUNGGU_VERIFIKASI': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'PERBAIKAN_DOKUMEN': return 'bg-pink-50 border-pink-200 text-pink-700';
      case 'KLARIFIKASI_DATA': return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'DITERIMA': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'DITOLAK_PERMANEN': return 'bg-rose-50 border-rose-200 text-rose-700';
      default: return 'bg-slate-100 border-slate-200 text-slate-700';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'MENUNGGU_VERIFIKASI': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'PERBAIKAN_DOKUMEN': return <AlertTriangle className="w-5 h-5 text-pink-500" />;
      case 'KLARIFIKASI_DATA': return <Info className="w-5 h-5 text-orange-500" />;
      case 'DITERIMA': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'DITOLAK_PERMANEN': return <XCircle className="w-5 h-5 text-rose-500" />;
      default: return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'DRAFT': return 'Draft';
      case 'MENUNGGU_VERIFIKASI': return 'Menunggu Verifikasi Berkas';
      case 'PERBAIKAN_DOKUMEN': return 'Perbaikan Berkas / Dokumen';
      case 'KLARIFIKASI_DATA': return 'Perlu Klarifikasi Data';
      case 'DITERIMA': return 'Pendaftaran Diterima';
      case 'DITOLAK_PERMANEN': return 'Pendaftaran Ditolak Permanen';
      default: return status;
    }
  };

  // Timeline list mapping
  const timelineSteps = [
    { key: 'daftar', label: 'Registrasi Akun Berhasil', desc: 'Akun calon siswa berhasil dibuat di portal Lulus.id.', status: 'COMPLETED' },
    { 
      key: 'verifikasi', 
      label: 'Verifikasi Berkas Administrasi', 
      desc: status === 'MENUNGGU_VERIFIKASI' 
        ? 'Sedang ditinjau oleh staf tata usaha PKBM Agrabinta.' 
        : status === 'PERBAIKAN_DOKUMEN'
        ? 'Ditemukan ketidakcocokan berkas. Menunggu perbaikan dari Anda.'
        : status === 'KLARIFIKASI_DATA'
        ? 'Data Anda perlu diklarifikasi. Sila hubungi admin.'
        : status === 'DITOLAK_PERMANEN'
        ? 'Verifikasi gagal. Berkas ditolak permanen.'
        : 'Verifikasi berkas administrasi lolos & valid.', 
      status: status === 'MENUNGGU_VERIFIKASI' ? 'ACTIVE' : ['PERBAIKAN_DOKUMEN', 'KLARIFIKASI_DATA', 'DITOLAK_PERMANEN'].includes(status) ? 'WARNING' : 'COMPLETED' 
    },
    { 
      key: 'diterima', 
      label: 'Penerimaan Siswa Baru', 
      desc: status === 'DITERIMA' ? 'Selamat! Anda dinyatakan lulus seleksi administrasi Lulus.id.' : 'Menunggu tahap verifikasi selesai.', 
      status: status === 'DITERIMA' ? 'COMPLETED' : 'PENDING' 
    },
    { key: 'tagihan', label: 'Penerbitan Invoice Tagihan', desc: 'Tagihan biaya pendaftaran awal diterbitkan otomatis oleh sistem.', status: status === 'DITERIMA' ? 'ACTIVE' : 'PENDING' }
  ];

  const formatRupiah = (value: string | number) => {
    const amount = Number(value || 0);

    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const currentStep =
    status === 'AKUN_AKTIF' ? 5 :
    status === 'MENUNGGU_PLOTTING_ROMBEL' ? 4 :
    paymentStatus === 'PAID' ? 4 :
    paymentStatus === 'WAITING_CONFIRMATION' ? 3 :
    status === 'DITERIMA' ? 3 :
    status === 'MENUNGGU_VERIFIKASI' ? 2 : 1;

  const processSteps = [
    'Pendaftaran',
    'Verifikasi berkas',
    'Pembayaran',
    'Penempatan rombel',
    'Akun aktif'
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header Lulus.id */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#5EAF95] text-xl font-black text-white shadow-sm">
              L
            </div>

            <div>
              <h1 className="text-lg font-black tracking-tight text-[#478F79]">
                Lulus.id
              </h1>
              <p className="text-[11px] font-medium text-slate-500">
                Status pendaftaran siswa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100"
            title="Kembali ke halaman awal"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 pb-12">
        {status === 'AKUN_AKTIF' ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-[#5EAF95]">
              Langkah 7 dari 7
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-900">
              Registrasi Berhasil
            </h2>

            <div className="mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#EAF7F2] text-[#5EAF95]">
              <CheckCircle2 className="h-14 w-14" />
            </div>

            <h3 className="mt-6 text-xl font-black text-slate-900">
              Selamat! Akun Anda Sudah Aktif
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Pembayaran telah diverifikasi dan Anda sudah ditempatkan ke rombel.
              Gunakan akun berikut untuk masuk ke Lulus.id.
            </p>

            <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-5 text-left">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-500">
                  No. Registrasi
                </span>
                <span className="break-all text-right text-sm font-black text-slate-900">
                  {biodata?.no_registrasi || registration?.id}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-500">
                  NIPD
                </span>
                <span className="text-right text-base font-black text-[#478F79]">
                  {biodata?.nipd || registration?.username || '-'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-500">
                  Username
                </span>
                <span className="text-right text-base font-black text-[#478F79]">
                  {registration?.username || biodata?.nipd || '-'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-500">
                  Password Awal
                </span>
                <span className="text-right text-base font-black text-slate-900">
                  {registration?.password_awal || 'Hubungi admin'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-500">
                  Penempatan Rombel
                </span>
                <span className="text-right text-sm font-black text-slate-900">
                  {registration?.rombel_nama || biodata?.rombel_nama || '-'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-500">
                  Status Siswa
                </span>
                <span className="rounded-full bg-[#EAF7F2] px-3 py-1 text-xs font-black text-[#478F79]">
                  AKTIF
                </span>
              </div>
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-500">
              Simpan username dan password ini. Segera ganti password setelah login pertama.
            </p>

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('lulus_registration_id');
                window.location.href = '/';
              }}
              className="mt-6 w-full rounded-2xl bg-[#5EAF95] px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-[#478F79]"
            >
              Login Sekarang
            </button>
          </section>
        ) : (
          <>
        {/* Identitas calon siswa */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#5EAF95] to-[#478F79] p-5 text-white shadow-lg shadow-emerald-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-emerald-50">
                Calon siswa Lulus.id
              </p>

              <h2 className="mt-1 text-xl font-black leading-tight">
                {biodata.nama || 'Calon Siswa'}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  {registration?.program_paket || 'Program belum dipilih'}
                </span>

                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  Kelas {registration?.tipe_kelas || '-'}
                </span>
              </div>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-5 border-t border-white/15 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-50">
              Nomor pendaftaran
            </p>
            <p className="mt-1 break-all text-xs font-semibold text-white">
              {biodata?.no_registrasi || registration?.id}
            </p>
          </div>
        </section>

        {/* Status utama */}
        <section className={`rounded-3xl border p-5 shadow-sm ${getStatusColor()}`}>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
              {getStatusIcon()}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider opacity-70">
                Status pendaftaran
              </p>

              <h3 className="mt-1 text-base font-black">
                {getStatusLabel()}
              </h3>

              <p className="mt-2 text-sm font-medium leading-6 opacity-90">
                {status === 'MENUNGGU_VERIFIKASI' &&
                  'Berkas Anda telah diterima dan sedang diperiksa oleh admin.'}

                {status === 'DITERIMA' &&
                  paymentStatus === 'UNPAID' &&
                  'Berkas Anda sudah disetujui. Silakan selesaikan pembayaran biaya pendaftaran.'}

                {paymentStatus === 'WAITING_CONFIRMATION' &&
                  'Bukti pembayaran sudah dikirim dan sedang diperiksa oleh admin.'}

                {status === 'MENUNGGU_PLOTTING_ROMBEL' &&
                  'Pembayaran sudah diverifikasi. Admin sedang menempatkan Anda ke rombel.'}

                {status === 'AKUN_AKTIF' &&
                  'Pendaftaran selesai. Akun belajar Anda sudah aktif.'}

                {status === 'PERBAIKAN_DOKUMEN' &&
                  'Ada berkas yang perlu diperbaiki sebelum proses dapat dilanjutkan.'}

                {status === 'KLARIFIKASI_DATA' &&
                  'Admin memerlukan klarifikasi atas data pendaftaran Anda.'}

                {status === 'DITOLAK_PERMANEN' &&
                  'Pendaftaran tidak dapat dilanjutkan berdasarkan hasil pemeriksaan admin.'}
              </p>
            </div>
          </div>
        </section>

        {['PERBAIKAN_DOKUMEN', 'KLARIFIKASI_DATA'].includes(status) && (
          <section className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h3 className="text-base font-black text-slate-900">
                Perbaiki Berkas Pendaftaran
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {notes ||
                  'Silakan unggah kembali dokumen yang diminta oleh admin.'}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['foto', 'Pas Foto'],
                ['kk', 'Kartu Keluarga'],
                ['ktp', 'KTP / Identitas'],
                ['ijazah', 'Ijazah Terakhir']
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="block rounded-2xl border border-slate-200 p-4"
                >
                  <span className="mb-2 block text-sm font-bold text-slate-800">
                    {label}
                  </span>

                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) =>
                      handleFileChange(event, key)
                    }
                    className="block w-full text-xs text-slate-600
                      file:mr-3 file:rounded-xl file:border-0
                      file:bg-[#EAF7F2] file:px-3 file:py-2
                      file:text-xs file:font-bold file:text-[#478F79]"
                  />

                  {reUploadFiles[key] && (
                    <p className="mt-2 text-xs font-semibold text-[#478F79]">
                      Dokumen baru sudah dipilih
                    </p>
                  )}
                </label>
              ))}
            </div>

            {reUploadLogs.length > 0 && (
              <div className="mt-4 rounded-2xl bg-[#EAF7F2] p-4">
                {reUploadLogs.map((log, index) => (
                  <p
                    key={`${log}-${index}`}
                    className="text-xs text-[#478F79]"
                  >
                    {log}
                  </p>
                ))}
              </div>
            )}

            {submitError && (
              <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {submitError}
              </p>
            )}

            <button
              type="button"
              onClick={handleResubmit}
              disabled={
                isSubmitting ||
                Object.keys(reUploadFiles).length === 0
              }
              className="mt-5 w-full rounded-2xl bg-[#5EAF95] px-5 py-3
                text-sm font-black text-white transition
                hover:bg-[#478F79]
                disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? 'Mengirim berkas...'
                : 'Kirim Ulang untuk Verifikasi'}
            </button>
          </section>
        )}

        {/* Progres */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Proses pendaftaran
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Pantau setiap tahap sampai akun aktif.
              </p>
            </div>

            <span className="rounded-full bg-[#EAF7F2] px-3 py-1 text-xs font-bold text-[#478F79]">
              Tahap {currentStep} dari 5
            </span>
          </div>

          <div className="space-y-0">
            {processSteps.map((step, index) => {
              const stepNumber = index + 1;
              const completed = stepNumber < currentStep;
              const active = stepNumber === currentStep;

              return (
                <div key={step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                        completed
                          ? 'border-[#5EAF95] bg-[#5EAF95] text-white'
                          : active
                          ? 'border-[#5EAF95] bg-[#EAF7F2] text-[#478F79]'
                          : 'border-slate-200 bg-white text-slate-400'
                      }`}
                    >
                      {completed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-black">{stepNumber}</span>
                      )}
                    </div>

                    {index < processSteps.length - 1 && (
                      <div
                        className={`h-8 w-0.5 ${
                          completed ? 'bg-[#5EAF95]' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>

                  <div className="pt-1">
                    <p
                      className={`text-sm font-bold ${
                        completed || active
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {step}
                    </p>

                    {active && (
                      <p className="mt-0.5 text-xs text-[#5EAF95]">
                        Tahap saat ini
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tagihan */}
        {invoice && status === 'DITERIMA' && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF7F2] text-[#478F79]">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Tagihan pendaftaran
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {invoice.invoice_number}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  Total yang harus dibayar
                </p>

                <p className="mt-1 text-3xl font-black tracking-tight text-[#478F79]">
                  {formatRupiah(invoice.amount)}
                </p>
              </div>
            </div>

            {paymentStatus === 'UNPAID' && (
              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700">
                    Metode pembayaran
                  </label>

                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#5EAF95] focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="TRANSFER_MANUAL">
                      Transfer bank
                    </option>
                    <option value="DANA">DANA</option>
                    <option value="LAINNYA">Metode lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700">
                    Bukti pembayaran
                  </label>

                  <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-[#EAF7F2]/50 px-4 text-center transition hover:bg-[#EAF7F2]">
                    <Upload className="mb-2 h-6 w-6 text-[#5EAF95]" />

                    <span className="text-sm font-bold text-[#478F79]">
                      {paymentProof
                        ? paymentProof.name
                        : 'Pilih foto bukti pembayaran'}
                    </span>

                    <span className="mt-1 text-xs text-slate-500">
                      JPG, PNG, atau PDF maksimal 5 MB
                    </span>

                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="hidden"
                      onChange={(event) =>
                        setPaymentProof(event.target.files?.[0] || null)
                      }
                    />
                  </label>
                </div>

                {paymentError && (
                  <div className="flex items-start gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {paymentError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmitPayment}
                  disabled={!paymentProof || isSubmittingPayment}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#5EAF95] text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-[#478F79] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  <Upload className="h-4 w-4" />

                  {isSubmittingPayment
                    ? 'Mengirim bukti...'
                    : 'Kirim bukti pembayaran'}
                </button>
              </div>
            )}

            {paymentStatus === 'WAITING_CONFIRMATION' && (
              <div className="p-5">
                <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-800">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0" />

                  <div>
                    <p className="text-sm font-black">
                      Menunggu verifikasi pembayaran
                    </p>
                    <p className="mt-1 text-xs font-medium leading-5">
                      Bukti pembayaran sudah diterima. Admin akan memeriksanya.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Catatan admin */}
        {notes && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <Info className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Catatan admin
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {notes}
                </p>
              </div>
            </div>
          </section>
        )}

        <button
          type="button"
          onClick={onRefresh}
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-100"
        >
          Perbarui status
        </button>

        <p className="text-center text-[11px] leading-5 text-slate-400">
          Lulus.id · Cara Baru untuk Lulus
        </p>
          </>
        )}
      </main>
    </div>
  );
};
