import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  QrCode, 
  CreditCard,
  LogOut,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { api } from '../lib/api';

interface PaymentPageProps {
  registration: any;
  onRefresh: () => void;
  onLogout: () => void;
}

export const PaymentPage: React.FC<PaymentPageProps> = ({
  registration,
  onRefresh,
  onLogout
}) => {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'qris' | 'bca' | 'mandiri'>('qris');
  const [proofFile, setProofFile] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadLog, setUploadLog] = useState<string>('');

  const biodata = registration?.biodata || {};
  const status = registration?.registration_status || 'DITERIMA';

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const inv = await api.getMyInvoice();
        setInvoice(inv);
        setError(null);
      } catch (err: any) {
        // Fallback mock invoice if not found in db yet
        const isKaryawan = registration?.tipe_kelas === 'Karyawan';
        const fallbackInv = {
          id: `inv-${Math.floor(Math.random() * 1000)}`,
          invoice_number: `INV/2026/07/${registration?.id?.slice(0, 4)?.toUpperCase() || 'MOCK'}`,
          amount: isKaryawan ? 500000 : 300000,
          payment_status: 'UNPAID',
          expired_at: new Date(Date.now() + 3600000 * 72).toISOString(),
          created_at: new Date().toISOString()
        };
        setInvoice(fallbackInv);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [registration]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Size validator (3MB)
    const MAX_SIZE = 3 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("Berkas bukti transfer tidak boleh melebihi 3MB!");
      return;
    }

    // Type validator
    const allowed = ['pdf', 'jpg', 'jpeg', 'png'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowed.includes(ext)) {
      alert("Format berkas salah! Hanya file PDF, JPG, JPEG, dan PNG yang diperbolehkan.");
      return;
    }

    const secureId = Math.random().toString(36).substring(2, 10);
    const renamed = `proof_${secureId}.${ext}`;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofFile(reader.result as string);
      setProofFileName(renamed);
      setUploadLog(`Bukti transfer termuat: ${renamed} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadProof = async () => {
    if (!proofFile) return;
    setIsUploading(true);
    try {
      await api.uploadPaymentProof(proofFile, selectedMethod === 'qris' ? 'QRIS Instan' : `Transfer VA ${selectedMethod.toUpperCase()}`);
      alert("Bukti pembayaran berhasil diunggah! Berkas sedang ditinjau oleh tim Keuangan PKBM.");
      onRefresh();
    } catch (err: any) {
      alert("Gagal mengunggah bukti pembayaran: " + (err.message || err));
    } finally {
      setIsUploading(false);
    }
  };

  // Generate dynamic mockup invoice print/download
  const handleDownloadInvoice = () => {
    alert(`Mengunduh Berkas Cetak Invoice Pendaftaran Lulus.id...\nNomor Tagihan: ${invoice?.invoice_number}\nTotal Nominal: Rp ${invoice?.amount?.toLocaleString('id-ID')}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-aplikasi text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-400">Memuat rincian tagihan Anda...</p>
        </div>
      </div>
    );
  }

  const isWaitingConfirm = invoice?.payment_status === 'WAITING_CONFIRMATION';
  const isPaid = invoice?.payment_status === 'PAID';

console.log("PAYMENT DEBUG", {
  invoice,
  isPaid,
  isWaitingConfirm
});
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Banner */}
      <header className="bg-card-aplikasi border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-100">Portal Keuangan Siswa Lulus.id</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tahun Akademik 2026/2027</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onRefresh}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 rounded-lg transition-all cursor-pointer"
          >
            Segarkan Portal
          </button>
          <button 
            onClick={onLogout}
            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-rose-400 transition-all cursor-pointer"
            title="Keluar Akun"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Primary Layout Pane */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: INVOICE DETAILS PANEL */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Invoice Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden">
            {/* Status absolute label */}
            <span className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
              isPaid 
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : isWaitingConfirm
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/20 animate-pulse'
            }`}>
              {isPaid ? 'Lunas / Aktif' : isWaitingConfirm ? 'Menunggu Konfirmasi' : 'Belum Bayar'}
            </span>

            <div className="space-y-1">
              <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-none block">Dokumen Tagihan Resmi</span>
              <h3 className="text-base font-black text-slate-100">Tagihan Investasi Pendidikan Awal</h3>
              <p className="text-[10.5px] text-slate-400 font-semibold leading-relaxed">
                Nomor Invoice: <strong className="font-mono text-slate-200">{invoice?.invoice_number}</strong>
              </p>
            </div>

            <div className="h-px bg-slate-800"></div>

            {/* Price details layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-wider">Nama Calon Siswa:</span>
                <span className="block text-xs font-black text-slate-200 mt-1">{biodata.nama || registration?.username}</span>
              </div>
              <div>
                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-wider">Program / Paket:</span>
                <span className="block text-xs font-black text-slate-200 mt-1">{registration?.program_paket}</span>
              </div>
              <div>
                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-wider">Tipe Kelas:</span>
                <span className="block text-xs font-black text-rose-500 mt-1">{registration?.tipe_kelas}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Total Pembayaran</span>
                <span className="text-xl font-black text-emerald-400 block mt-0.5">Rp {invoice?.amount?.toLocaleString('id-ID')}</span>
              </div>
              <button 
                onClick={handleDownloadInvoice}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-[10px] font-black text-slate-300 rounded-xl border border-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-rose-500" /> Cetak / PDF
              </button>
            </div>

            {/* Deadline information banner */}
            {!isPaid && !isWaitingConfirm && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/15 rounded-xl flex items-center gap-3">
                <Clock className="w-5 h-5 text-rose-400 shrink-0" />
                <p className="text-[10.5px] text-rose-300 font-semibold leading-relaxed">
                  Batas waktu pembayaran berakhir pada <strong className="underline">{new Date(invoice?.expired_at || Date.now()).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB</strong>. Segera lakukan pelunasan untuk mengaktifkan akun LMS Anda.
                </p>
              </div>
            )}
          </div>

          {/* PAYMENT GATEWAY INTERFACE */}
          {!isPaid && !isWaitingConfirm && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest border-b border-slate-800 pb-2.5">
                Metode Pembayaran Instan & Virtual Account
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Method Option: QRIS */}
                <button
                  onClick={() => setSelectedMethod('qris')}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    selectedMethod === 'qris' 
                      ? 'bg-pink-500/10 border-pink-500 text-pink-400' 
                      : 'bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-300'
                  }`}
                >
                  <QrCode className="w-6 h-6 mb-2" />
                  <div>
                    <span className="block text-[11px] font-black leading-tight">QRIS GPN</span>
                    <span className="block text-[8px] text-slate-500 font-bold mt-0.5 uppercase tracking-wide">Gopay, OVO, Dana</span>
                  </div>
                </button>

                {/* Method Option: BCA */}
                <button
                  onClick={() => setSelectedMethod('bca')}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    selectedMethod === 'bca' 
                      ? 'bg-pink-500/10 border-pink-500 text-pink-400' 
                      : 'bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-300'
                  }`}
                >
                  <CreditCard className="w-6 h-6 mb-2 text-indigo-400" />
                  <div>
                    <span className="block text-[11px] font-black leading-tight">BCA Virtual Account</span>
                    <span className="block text-[8px] text-slate-500 font-bold mt-0.5 uppercase tracking-wide">Manual / M-Banking</span>
                  </div>
                </button>

                {/* Method Option: Mandiri */}
                <button
                  onClick={() => setSelectedMethod('mandiri')}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    selectedMethod === 'mandiri' 
                      ? 'bg-pink-500/10 border-pink-500 text-pink-400' 
                      : 'bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-300'
                  }`}
                >
                  <CreditCard className="w-6 h-6 mb-2 text-sky-400" />
                  <div>
                    <span className="block text-[11px] font-black leading-tight">Mandiri Transfer</span>
                    <span className="block text-[8px] text-slate-500 font-bold mt-0.5 uppercase tracking-wide">ATM / Livin Mandiri</span>
                  </div>
                </button>
              </div>

              {/* Method Instructions Layout */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                {selectedMethod === 'qris' ? (
                  <div className="flex flex-col md:flex-row items-center gap-5">
                    <div className="p-3.5 bg-white rounded-2xl shrink-0">
                      {/* Generated live QR code mock placeholder */}
                      <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Lulus.id-Invoice-Payment" 
                        alt="QRIS QR Code" 
                        className="w-[120px] h-[120px]"
                      />
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <h5 className="font-extrabold text-slate-200 uppercase tracking-wider text-[10px]">Instruksi Pembayaran QRIS:</h5>
                      <ol className="list-decimal pl-4 text-[10.5px] text-slate-400 font-semibold space-y-1">
                        <li>Buka aplikasi e-wallet Anda (Gopay, OVO, Dana, LinkAja) atau Mobile Banking.</li>
                        <li>Pilih opsi **Scan QR** / **Pindai QR**.</li>
                        <li>Scan gambar kode QR di samping kiri.</li>
                        <li>Verifikasi nominal tagihan: **Rp {invoice?.amount?.toLocaleString('id-ID')}**.</li>
                        <li>Masukkan PIN pembayaran Anda lalu simpan berkas bukti transaksi.</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs font-semibold">
                    <div className="flex justify-between items-center bg-slate-900 px-4 py-3 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[8px] text-slate-500 uppercase tracking-widest block">Nomor Virtual Account {selectedMethod.toUpperCase()}</span>
                        <span className="text-sm font-mono font-black text-pink-500 block mt-0.5">8099 0812 3456 7890</span>
                      </div>
                      <button 
                        onClick={() => { navigator.clipboard.writeText('8099081234567890'); alert('Nomor VA berhasil disalin!'); }}
                        className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-[10px] font-black text-slate-300 rounded-lg border border-slate-800 cursor-pointer transition-colors"
                      >
                        Salin No
                      </button>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <h5 className="font-extrabold text-slate-200 uppercase tracking-wider text-[10px]">Langkah Transfer VA:</h5>
                      <ol className="list-decimal pl-4 text-[10.5px] text-slate-400 font-semibold space-y-1">
                        <li>Masukkan Kartu ATM atau buka aplikasi M-Banking Anda.</li>
                        <li>Pilih menu **Transfer** {ChevronRight} **Transfer Ke Virtual Account**.</li>
                        <li>Masukkan nomor Virtual Account di atas.</li>
                        <li>Konfirmasi nominal tagihan otomatis terdeteksi tepat **Rp {invoice?.amount?.toLocaleString('id-ID')}**.</li>
                        <li>Selesaikan pembayaran dan simpan struk transfer Anda.</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PROOF UPLOAD & STATUS PANEL */}
        <div className="space-y-6">
          
          {/* Active Payment Proof Box */}
          {isWaitingConfirm && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-center">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 mx-auto animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest">Pembayaran Sedang Diverifikasi</h4>
                <p className="text-[10.5px] text-slate-400 font-semibold leading-relaxed">
                  Bukti pembayaran Anda sudah diunggah dan sedang ditinjau staf Keuangan PKBM Agrabinta. Proses peninjauan memakan waktu maks. 1 jam kerja.
                </p>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 text-left space-y-1">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Informasi Pengiriman:</span>
                <span className="block text-[10px] font-black text-slate-300 truncate">Metode: {invoice?.metode_pembayaran || 'Transfer VA'}</span>
                <span className="block text-[10px] font-black text-emerald-400">Status: Menunggu Konfirmasi Staf</span>
              </div>
            </div>
          )}

          {isPaid && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-center">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest">Aktivasi Akun Sukses!</h4>
                <p className="text-[10.5px] text-slate-400 font-semibold leading-relaxed">
                  Pembayaran Anda berhasil divalidasi. Akun portal siswa Anda telah resmi diaktifkan dan siap masuk ke langkah Orientasi Akademik!
                </p>
              </div>
              <button
                onClick={onRefresh}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-600/10"
              >
                Masuk Dashboard Orientasi 🚀
              </button>
            </div>
          )}

          {/* Upload Proof Form */}
          {!isPaid && !isWaitingConfirm && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest border-b border-slate-800 pb-2.5">
                Unggah Bukti Transfer Resmi
              </h4>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center hover:border-pink-500/50 transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-[10.5px] text-slate-200 font-black">Seret atau Klik Untuk Unggah Bukti</p>
                  <p className="text-[8.5px] text-slate-500 font-bold mt-0.5">Maksimal ukuran file 3MB (Format PDF, PNG, JPG)</p>
                </div>

                {uploadLog && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono text-[9px] text-emerald-400 truncate">
                    {uploadLog}
                  </div>
                )}

                <button
                  type="button"
                  disabled={isUploading || !proofFile}
                  onClick={handleUploadProof}
                  className="w-full py-3 bg-blue-600 hover:bg-pink-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-black shadow-lg shadow-pink-600/15 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Mengirim Bukti...' : 'Kirim Konfirmasi Pembayaran 🚀'}
                </button>
              </div>
            </div>
          )}

          {/* Security Assurance Card */}
          <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="block text-[9px] font-black text-slate-300 uppercase tracking-wider">Keamanan Transaksi Terjamin</span>
              <p className="text-[9.5px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                Seluruh transaksi keuangan Lulus.id diproses secara aman menggunakan protokol enkripsi standar industri kesetaraan nasional.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
