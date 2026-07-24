import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Bell, Wallet, CheckCircle, Clock, ShieldAlert,
  CreditCard, ChevronRight, FileText, Upload, 
  History, X, Check, AlertCircle, Sparkles
} from 'lucide-react';
import { Bill, PaymentMethod } from '../types';
import { mockBills } from '../data/mockData';

interface BillTrackerProps {
  onBack: () => void;
  showModal: (title: string, desc: string, type?: 'info' | 'warning' | 'success') => void;
  financialTransactions: any[];
  onUpdateTransactions: (txs: any[]) => void;
  paymentMethods: PaymentMethod[];
}

export default function BillTracker({ 
  onBack, 
  showModal, 
  financialTransactions, 
  onUpdateTransactions, 
  paymentMethods 
}: BillTrackerProps) {
  // Load bills from localStorage or fallback to mock data
  const [bills, setBills] = useState<Bill[]>(() => {
    const saved = localStorage.getItem('lulus_bills');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((b: any) => ({
            ...b,
            status: b.status === 'Belum Bayar' ? 'Belum Dibayar' : b.status
          }));
        }
      } catch (e) {}
    }
    // Initialize defaults with standardized statuses
    return mockBills.map(b => ({
      ...b,
      status: b.status === 'Belum Bayar' ? 'Belum Dibayar' : b.status
    }));
  });

  const [activeBill, setActiveBill] = useState<Bill | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  
  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadNotes, setUploadNotes] = useState<string>('');

  // Admin Payment Settings State (reloaded on mount from localStorage or defaults)
  const [adminPaymentSettings] = useState(() => {
    const saved = localStorage.getItem('lulus_admin_payment_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      namaBank: 'Bank Central Asia (BCA)',
      noRekening: '52203049182',
      pemilikRekening: 'PKBM Agrabinta Lulus.id',
      qrisUrl: 'https://placehold.co/200x200/ffffff/000000?text=QRIS+LULUS+ID',
      instruksi: '1. Buka aplikasi M-Banking atau E-Wallet pilihan Anda.\n2. Lakukan transfer ke rekening di atas atau scan QRIS.\n3. Masukkan nominal yang sesuai dengan tagihan Anda.\n4. Simpan bukti pembayaran berupa struk atau screenshot.\n5. Upload bukti pembayaran di halaman ini untuk diverifikasi Admin.'
    };
  });

  // User Profile Data
  const [profileData] = useState<any>(() => {
    const cached = localStorage.getItem('user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });

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

  const studentName = getField('nama_lengkap', getField('username', 'Fajar Pratama')).toUpperCase();
  const nisn = getField('siswa_detail.nisn', getField('nisn', '0098765432'));
  const program = getField('siswa_detail.program', getField('program', 'Kesetaraan Paket C'));
  const kelas = getField('siswa_detail.kelas', getField('kelas', 'X (Sepuluh)'));
  const tahunAjaran = getField('siswa_detail.tahun_ajaran', '2025/2026');

  // Helper to save bills to localStorage and state
  const updateBills = (newBills: Bill[]) => {
    setBills(newBills);
    localStorage.setItem('lulus_bills', JSON.stringify(newBills));
    
    // Update activeBill in state if it's currently selected to keep view in sync
    if (activeBill) {
      const updatedActive = newBills.find(b => b.id === activeBill.id);
      if (updatedActive) {
        setActiveBill(updatedActive);
      }
    }
  };

  // Sync state if bills change in localStorage (from Admin actions)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('lulus_bills');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setBills(parsed);
            if (activeBill) {
              const updatedActive = parsed.find(b => b.id === activeBill.id);
              if (updatedActive) setActiveBill(updatedActive);
            }
          }
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    // Periodically poll since storage event doesn't trigger on same tab
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [activeBill]);

  // Calculations for Summary
  const totalBill = bills.reduce((acc, curr) => acc + curr.amount, 0);
  const paidBill = bills.filter(b => b.status === 'Lunas').reduce((acc, curr) => acc + curr.amount, 0);
  const unpaidBill = bills.filter(b => b.status === 'Belum Dibayar' || b.status === 'Ditolak').reduce((acc, curr) => acc + curr.amount, 0);
  const progressPercent = totalBill > 0 ? Math.round((paidBill / totalBill) * 100) : 0;

  // Status Styling Helpers
  const getStatusLabelClass = (status: Bill['status'] | 'Ditolak') => {
    switch (status) {
      case 'Lunas':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'Menunggu Verifikasi':
        return 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse';
      case 'Ditolak':
        return 'bg-rose-50 text-rose-600 border border-rose-100';
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const getStatusBadgeIcon = (status: Bill['status'] | 'Ditolak') => {
    switch (status) {
      case 'Lunas':
        return '✅ Lunas';
      case 'Menunggu Verifikasi':
        return '⏳ Menunggu Verifikasi';
      case 'Ditolak':
        return '❌ Ditolak';
      default:
        return '💳 Belum Dibayar';
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File | undefined) => {
    if (!file) return;

    // Size limit: 10 MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showModal(
        'File Terlalu Besar', 
        'Ukuran file bukti pembayaran tidak boleh melebihi 10 MB.', 
        'warning'
      );
      return;
    }

    // Allowed types: JPG, PNG, PDF
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      showModal(
        'Format File Salah', 
        'Format file tidak didukung. Unggah bukti dalam format JPG, PNG, atau PDF.', 
        'warning'
      );
      return;
    }

    setUploadedFile(file);
    showModal('Berhasil Memilih File', `File "${file.name}" berhasil dilampirkan.`, 'success');
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  // Submit Payment Proof Action
  const handleSubmitProof = () => {
    if (!uploadedFile || !activeBill) {
      showModal('Gagal', 'Harap lampirkan file bukti transfer terlebih dahulu.', 'warning');
      return;
    }

    // 1. Update bills status to 'Menunggu Verifikasi'
    const updatedBills = bills.map(b => {
      if (b.id === activeBill.id) {
        return {
          ...b,
          status: 'Menunggu Verifikasi' as any,
          buktiFile: uploadedFile.name,
          catatan: uploadNotes.trim()
        };
      }
      return b;
    });
    updateBills(updatedBills);

    // 2. Insert into financialTransactions list
    const txId = `TX-${Date.now().toString().slice(-4)}`;
    const newTx = {
      id: txId,
      billId: activeBill.id,
      studentName: studentName,
      type: activeBill.name,
      amount: activeBill.amount,
      method: adminPaymentSettings.namaBank,
      date: new Date().toISOString().split('T')[0],
      status: 'Menunggu Verifikasi',
      buktiUrl: uploadedFile.name,
      catatan: uploadNotes.trim()
    };

    const updatedTxs = [newTx, ...financialTransactions];
    onUpdateTransactions(updatedTxs);

    // Reset fields
    setUploadedFile(null);
    setUploadNotes('');

    showModal(
      'Bukti Pembayaran Terkirim',
      `Bukti transfer untuk "${activeBill.name}" berhasil diunggah. Pembayaran Anda kini sedang diperiksa oleh Admin Lulus.id. Mohon tunggu proses verifikasi selesai.`,
      'success'
    );
  };

  // Filter dynamic history list for this student (Only those with status "Lunas")
  const studentLunasPayments = financialTransactions.filter(
    tx => tx.studentName.toLowerCase() === studentName.toLowerCase() &&
          (tx.status.toLowerCase() === 'lunas' || tx.status.toLowerCase() === 'sukses')
  );

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-50 overflow-hidden z-10 font-sans">
      
      {/* HEADER */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => activeBill ? setActiveBill(null) : onBack()} 
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <h2 className="text-sm font-extrabold text-slate-800">
            {activeBill ? 'Detail & Bayar Tagihan' : 'Tagihan Saya'}
          </h2>
        </div>
        {!activeBill && (
          <button 
            onClick={() => setShowNotifications(!showNotifications)} 
            className="relative w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!activeBill ? (
          /* MAIN LIST VIEW */
          <motion.div 
            key="list-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar"
          >
            {/* Financial Summary */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Wallet className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[9px] font-extrabold uppercase tracking-wider">Total Tagihan</span>
                </div>
                <p className="text-sm font-black text-slate-800">Rp {totalBill.toLocaleString('id-ID')}</p>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[9px] font-extrabold uppercase tracking-wider">Sudah Dibayar</span>
                </div>
                <p className="text-sm font-black text-slate-800">Rp {paidBill.toLocaleString('id-ID')}</p>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[9px] font-extrabold uppercase tracking-wider">Sisa Tagihan</span>
                </div>
                <p className="text-sm font-black text-amber-600">Rp {unpaidBill.toLocaleString('id-ID')}</p>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-center items-center">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status Utama</span>
                <span className={`px-2.5 py-1 text-[9px] font-extrabold rounded-full ${
                  unpaidBill === 0 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-red-100 text-red-600 animate-pulse'
                }`}>
                  {unpaidBill === 0 ? 'LUNAS' : 'BELUM LUNAS'}
                </span>
              </div>
            </div>

            {/* Progress Bar info */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                <span>Kemajuan Pembayaran SPP</span>
                <span className="text-emerald-500">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <p className="text-[9px] font-bold text-slate-400 text-center">
                Pembayaran uang sekolah Anda telah diselesaikan sebanyak {progressPercent}%
              </p>
            </div>

            {/* SPP Bill List */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-500" /> Daftar Tagihan Aktif
              </h3>

              <div className="space-y-2">
                {bills.map((bill) => {
                  const statusLabel = bill.status === 'Belum Bayar' ? 'Belum Dibayar' : bill.status;
                  return (
                    <div 
                      key={bill.id}
                      onClick={() => setActiveBill(bill)}
                      className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between hover:border-emerald-400 transition-all cursor-pointer group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-slate-800 group-hover:text-emerald-600 transition-colors">{bill.name}</h4>
                          <span className="text-[8px] font-bold text-slate-400">({bill.id})</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-semibold">Batas Tempo: {bill.dueDate}</p>
                        <p className="text-xs font-black text-slate-850">Rp {bill.amount.toLocaleString('id-ID')}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`px-2 py-0.5 text-[8px] font-extrabold rounded-full ${getStatusLabelClass(statusLabel)}`}>
                          {getStatusBadgeIcon(statusLabel)}
                        </span>
                        
                        {/* Display pay button directly in row if unpaid/rejected */}
                        {(statusLabel === 'Belum Dibayar' || statusLabel === 'Ditolak') ? (
                          <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5 hover:underline">
                            💳 Bayar Sekarang <ChevronRight className="w-3 h-3" />
                          </span>
                        ) : statusLabel === 'Menunggu Verifikasi' ? (
                          <span className="text-[8px] font-bold text-amber-500">⏳ Sedang Diperiksa</span>
                        ) : (
                          <span className="text-[8px] font-bold text-emerald-500">✓ Berhasil</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <History className="w-4 h-4 text-purple-500" /> Riwayat Pembayaran Resmi
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[9px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-extrabold">
                      <th className="py-1.5 pb-2">Tagihan</th>
                      <th className="py-1.5 pb-2">Nominal</th>
                      <th className="py-1.5 pb-2">Metode</th>
                      <th className="py-1.5 pb-2">Tanggal</th>
                      <th className="py-1.5 pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold text-slate-600">
                    {studentLunasPayments.map((p, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 font-semibold text-slate-800">{p.type}</td>
                        <td className="py-2.5 text-slate-850 font-black">Rp {p.amount.toLocaleString('id-ID')}</td>
                        <td className="py-2.5 text-slate-400">{p.method}</td>
                        <td className="py-2.5 text-slate-400">{p.date}</td>
                        <td className="py-2.5 text-right">
                          <span className="px-1.5 py-0.5 text-[7px] font-black rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                            LUNAS
                          </span>
                        </td>
                      </tr>
                    ))}
                    {studentLunasPayments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400 font-semibold">
                          Belum ada riwayat pembayaran yang lunas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          /* DETAILED PAYMENT VIEW (HALAMAN BAYAR) */
          <motion.div 
            key="payment-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar"
          >
            {/* Status Information Box */}
            <div className={`p-4 rounded-2xl border ${
              activeBill.status === 'Lunas' 
                ? 'bg-emerald-50/50 border-emerald-150 text-emerald-800' 
                : activeBill.status === 'Menunggu Verifikasi'
                ? 'bg-amber-50/50 border-amber-150 text-amber-800'
                : activeBill.status === 'Ditolak'
                ? 'bg-rose-50/50 border-rose-150 text-rose-800'
                : 'bg-blue-50/40 border-blue-150 text-blue-800'
            }`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black">
                    Status: {getStatusBadgeIcon(activeBill.status)}
                  </h4>
                  <p className="text-[10px] font-medium leading-relaxed">
                    {activeBill.status === 'Lunas' && (
                      <span>Pembayaran tagihan ini telah dikonfirmasi dan divalidasi oleh Admin Keuangan pada sistem Lulus.id.</span>
                    )}
                    {activeBill.status === 'Menunggu Verifikasi' && (
                      <span>Pembayaran Anda sedang diperiksa oleh Admin. Mohon tunggu proses verifikasi selesai dalam maksimal 1x24 jam kerja.</span>
                    )}
                    {activeBill.status === 'Ditolak' && (
                      <span className="block font-semibold">
                        Pembayaran ditolak. Alasan: <span className="font-extrabold text-rose-600 underline">"{activeBill.alasanPenolakan || 'Bukti transfer tidak sesuai/kurang jelas.'}"</span>. Silakan periksa kembali transfer Anda dan kirim ulang bukti yang sah di form di bawah ini.
                      </span>
                    )}
                    {(activeBill.status === 'Belum Dibayar' || activeBill.status === 'Belum Bayar') && (
                      <span>Silakan lakukan transfer manual ke rekening sekolah yang tercantum di bawah ini dan unggah bukti transfer.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Lembar Detail Tagihan */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">
                Lembar Informasi Tagihan Resmi
              </h3>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[10px]">
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Nomor Tagihan</span>
                  <p className="font-extrabold text-slate-800 font-mono">{activeBill.id}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Nama Peserta Didik</span>
                  <p className="font-extrabold text-slate-850">{studentName}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">NISN</span>
                  <p className="font-extrabold text-slate-800">{nisn}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Program Belajar</span>
                  <p className="font-extrabold text-slate-800">{program}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Kelas</span>
                  <p className="font-extrabold text-slate-800">{kelas}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Tahun Ajaran</span>
                  <p className="font-extrabold text-slate-800">{tahunAjaran}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Jenis Tagihan</span>
                  <p className="font-extrabold text-slate-800">{activeBill.name}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Jatuh Tempo</span>
                  <p className="font-extrabold text-slate-800">{activeBill.dueDate}</p>
                </div>
                <div className="col-span-2 border-t border-slate-100 pt-3 flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-black">Nominal Tagihan</span>
                  <p className="font-black text-emerald-600 text-sm">Rp {activeBill.amount.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>

            {/* METODE PEMBAYARAN & UPLOAD FORM (Only shown if status is Belum Dibayar/Ditolak) */}
            {(activeBill.status === 'Belum Dibayar' || activeBill.status === 'Belum Bayar' || activeBill.status === 'Ditolak') && (
              <>
                {/* Metode Pembayaran Bank */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
                  <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-500" /> Detail Rekening Sekolah (Tujuan Transfer)
                  </h3>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-3 text-[11px]">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                        <span className="text-slate-400 font-bold">Nama Bank</span>
                        <span className="font-extrabold text-slate-800">{adminPaymentSettings.namaBank}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/50 pb-1.5 items-center">
                        <span className="text-slate-400 font-bold">Nomor Rekening</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-850 font-mono tracking-wider">{adminPaymentSettings.noRekening}</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(adminPaymentSettings.noRekening);
                              showModal('Disalin', 'Nomor rekening berhasil disalin ke clipboard.', 'success');
                            }}
                            className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 rounded text-[8px] font-bold transition-colors"
                          >
                            Salin
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                        <span className="text-slate-400 font-bold">Atas Nama (Pemilik)</span>
                        <span className="font-extrabold text-slate-800">{adminPaymentSettings.pemilikRekening}</span>
                      </div>
                    </div>

                    {/* QRIS section if available */}
                    {adminPaymentSettings.qrisUrl && (
                      <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200/50 mt-2 space-y-1.5">
                        <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Atau Scan QRIS Resmi</span>
                        <img 
                          src={adminPaymentSettings.qrisUrl} 
                          alt="QRIS Pembayaran" 
                          className="w-36 h-36 object-contain"
                        />
                        <span className="text-[7px] font-semibold text-slate-400">Scan QRIS menggunakan Mobile Banking atau E-Wallet</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Instruksi Pembayaran</span>
                    <p className="text-[9.5px] font-semibold text-slate-500 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {adminPaymentSettings.instruksi}
                    </p>
                  </div>
                </div>

                {/* Form Upload Bukti Pembayaran */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
                  <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-emerald-500" /> Form Upload Bukti Pembayaran
                  </h3>

                  {/* Drag & Drop Area */}
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition-colors ${
                      isDragging 
                        ? 'border-emerald-500 bg-emerald-50/10' 
                        : uploadedFile 
                        ? 'border-emerald-400 bg-emerald-50/5' 
                        : 'border-slate-300 bg-slate-50 hover:bg-emerald-50/10 hover:border-emerald-500'
                    }`}
                    onClick={() => document.getElementById('payment-file-input')?.click()}
                  >
                    <input 
                      id="payment-file-input"
                      type="file" 
                      accept=".jpg,.jpeg,.png,.pdf" 
                      onChange={handleFileSelection}
                      className="hidden"
                    />
                    <Upload className={`w-8 h-8 text-emerald-500 ${!uploadedFile && 'animate-bounce'}`} />
                    <p className="text-[10px] font-bold text-slate-700">
                      {uploadedFile ? 'Ganti file bukti transfer' : 'Seret file bukti transfer atau klik untuk memilih'}
                    </p>
                    <span className="text-[8px] font-semibold text-slate-400">
                      Format didukung: JPG, PNG, PDF (Maksimal 10 MB)
                    </span>
                  </div>

                  {/* Uploaded File Indicator */}
                  {uploadedFile && (
                    <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-150 rounded-xl">
                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="leading-tight overflow-hidden">
                          <p className="text-[10px] font-bold text-slate-800 truncate">{uploadedFile.name}</p>
                          <span className="text-[8px] text-slate-400 font-semibold">
                            {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile();
                        }}
                        className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Optional Notes */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Catatan Tambahan (Opsional)</label>
                    <textarea 
                      placeholder="Contoh: Transfer atas nama Budi Setiawan via M-BCA" 
                      value={uploadNotes}
                      onChange={(e) => setUploadNotes(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" 
                      rows={3}
                    />
                  </div>

                  <button 
                    onClick={handleSubmitProof}
                    disabled={!uploadedFile}
                    className={`w-full py-2.5 rounded-xl text-xs font-black transition-all shadow-md ${
                      uploadedFile 
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/15 cursor-pointer' 
                        : 'bg-slate-150 text-slate-400 shadow-none cursor-not-allowed'
                    }`}
                  >
                    Kirim Bukti Pembayaran
                  </button>
                </div>
              </>
            )}

            {/* Verification Detail for approved lunas payment */}
            {activeBill.status === 'Lunas' && (
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3 text-[10px]">
                <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">
                  Detail Verifikasi Keuangan
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5 col-span-2">
                    <span className="text-slate-400 font-semibold">Verifikasi Oleh</span>
                    <span className="font-extrabold text-slate-800 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" /> Admin Lulus.id
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5 col-span-2">
                    <span className="text-slate-400 font-semibold">Waktu Verifikasi</span>
                    <span className="font-extrabold text-slate-800">Sistem Terintegrasi</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-in Notifications Drawer */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="absolute inset-0 bg-black/50 z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute top-12 right-0 bottom-0 w-64 bg-white shadow-2xl border-l border-slate-100 z-50 flex flex-col p-4 space-y-3"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
                <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-emerald-500" /> Informasi Keuangan
                </h4>
                <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 space-y-2.5 overflow-y-auto no-scrollbar">
                <div className="bg-red-50 p-2.5 rounded-xl border border-red-100 text-[9px] text-red-700 font-bold space-y-0.5">
                  <p>Pembayaran SPP Bulan Juli 2026 jatuh tempo segera.</p>
                  <span className="text-[7px] text-red-400">Terbaru</span>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 text-[9px] text-emerald-700 font-bold space-y-0.5">
                  <p>Penyetoran SPP Bulan Juni telah divalidasi oleh PKBM Agrabinta.</p>
                  <span className="text-[7px] text-emerald-400">Selesai</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
