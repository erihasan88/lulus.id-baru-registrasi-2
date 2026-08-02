import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, ArrowRight, X, IdCard, MapPin, GraduationCap, 
  Users, UserCheck, ShieldAlert, FileText, CheckCircle,
  Clock, 
  Trash2, Sparkles, Upload, FileSignature, Wallet, Check, QrCode
} from 'lucide-react';
import { RegistrationData, Student, PaymentMethod } from '../types';

interface RegistrationWizardProps {
  onCancel: () => void;
  onSuccess: (username: string, newStudent?: Student) => void;
  showModal: (title: string, desc: string, type?: 'info' | 'warning' | 'success') => void;
  regFeeReguler?: number;
  regFeeKaryawan?: number;
  sppReguler?: number;
  sppKaryawan?: number;
  paymentMethods?: PaymentMethod[];
}

export default function RegistrationWizard({ 
  onCancel, 
  onSuccess, 
  showModal,
  regFeeReguler = 300000,
  regFeeKaryawan = 500000,
  sppReguler = 150000,
  sppKaryawan = 250000,
  paymentMethods = []
}: RegistrationWizardProps) {
  const [step, setStep] = useState<number>(1);
  
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'qris':
        return <QrCode className="w-4 h-4 text-emerald-500" />;
      case 'bca':
        return <span className="font-bold text-[9px] text-blue-500">BCA</span>;
      case 'mandiri':
        return <span className="font-bold text-[9px] text-yellow-600">MDR</span>;
      case 'bni':
        return <span className="font-bold text-[9px] text-teal-600">BNI</span>;
      case 'gopay':
        return <span className="font-bold text-[9px] text-emerald-500 font-extrabold">GPY</span>;
      case 'ovo':
        return <span className="font-bold text-[9px] text-purple-600 font-extrabold">OVO</span>;
      default:
        return <Wallet className="w-4 h-4 text-indigo-500" />;
    }
  };

  const activeMethods = paymentMethods && paymentMethods.length > 0
    ? paymentMethods.filter(m => m.isActive)
    : [
        { id: 'qris', name: 'QRIS Instan (Gopay, OVO, ShopeePay)', provider: 'qris', isActive: true },
        { id: 'bca', name: 'Transfer Virtual Account BCA', provider: 'bca', isActive: true },
        { id: 'mandiri', name: 'Transfer Virtual Account Mandiri', provider: 'mandiri', isActive: true }
      ];

  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<RegistrationData>({
    nama: '',
    nik: '',
    nisn: '',
    tempat_lahir: '',
    tgl_lahir: '',
    jk: 'Laki-laki',
    agama: 'Islam',
    kewarganegaraan: 'WNI',
    no_hp: '',
    email: '',
    alamat: '',
    rt: '',
    rw: '',
    dusun: '',
    desa: '',
    kecamatan: '',
    kota: '',
    provinsi: '',
    kodepos: '',
    pendidikan: 'SMP',
    sekolah_asal: 'SMP Negeri 1 Agrabinta',
    tahun_lulus: '2024',
    no_ijazah: 'DN-01/D-SMP/21/00123',
    program: 'Paket C',
    nama_ayah: '',
    nik_ayah: '3201234567890456',
    pekerjaan_ayah: 'Tani',
    pendidikan_ayah: 'SMA',
    nama_ibu: '',
    nik_ibu: '3201234567890789',
    pekerjaan_ibu: 'Ibu Rumah Tangga',
    pendidikan_ibu: 'SMA',
    gunakan_wali: false,
    nama_wali: '',
    hubungan_wali: '',
    hp_wali: '',
    doc_foto: '',
    doc_ktp: '',
    doc_kk: '',
    doc_ijazah: '',
    doc_akta: '',
    sig_siswa_saved: false,
    sig_ortu_saved: false,
    metode_pembayaran: '',
    tipe_kelas: 'Reguler'
  });

  const [statementChecked, setStatementChecked] = useState<boolean>(false);
  const [paymentDone, setPaymentDone] = useState<boolean>(false);
  const [regNumber, setRegNumber] = useState<string>('');
  const [generatedUsername, setGeneratedUsername] = useState<string>('');
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});

  // Signature canvas refs
  const canvasSiswaRef = useRef<HTMLCanvasElement>(null);
  const canvasOrtuRef = useRef<HTMLCanvasElement>(null);

  // States for drawings
  const [drawingSiswa, setDrawingSiswa] = useState<boolean>(false);
  const [drawingOrtu, setDrawingOrtu] = useState<boolean>(false);

  // Signatures preview data-urls
  const [sigSiswaUrl, setSigSiswaUrl] = useState<string | null>(null);
  const [sigOrtuUrl, setSigOrtuUrl] = useState<string | null>(null);

  // Initialize signature pads when step 4 loads
  useEffect(() => {
    if (step === 4) {
      setTimeout(() => {
        initCanvas(canvasSiswaRef, setDrawingSiswa);
        initCanvas(canvasOrtuRef, setDrawingOrtu);
      }, 200);
    }
  }, [step]);

  const initCanvas = (canvasRef: React.RefObject<HTMLCanvasElement | null>, setDrawingState: React.Dispatch<React.SetStateAction<boolean>>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set correct dimensions
    canvas.width = canvas.parentElement?.clientWidth || 320;
    canvas.height = 112;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvasRef: React.RefObject<HTMLCanvasElement | null>, isSiswa: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    if (isSiswa) {
      setDrawingSiswa(true);
    } else {
      setDrawingOrtu(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvasRef: React.RefObject<HTMLCanvasElement | null>, isSiswa: boolean) => {
    const isDrawing = isSiswa ? drawingSiswa : drawingOrtu;
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (isSiswa: boolean) => {
    if (isSiswa) {
      setDrawingSiswa(false);
    } else {
      setDrawingOrtu(false);
    }
  };

  const clearCanvas = (canvasRef: React.RefObject<HTMLCanvasElement | null>, isSiswa: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (isSiswa) {
      setSigSiswaUrl(null);
      setFormData(prev => ({ ...prev, sig_siswa_saved: false }));
    } else {
      setSigOrtuUrl(null);
      setFormData(prev => ({ ...prev, sig_ortu_saved: false }));
    }
  };

  const saveSignature = (canvasRef: React.RefObject<HTMLCanvasElement | null>, isSiswa: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    if (isSiswa) {
      setSigSiswaUrl(dataUrl);
      setFormData(prev => ({ ...prev, sig_siswa_saved: true, sig_siswa_data: dataUrl }));
      showModal('Tanda Tangan Terkunci', 'Tanda tangan Siswa berhasil diverifikasi.', 'success');
    } else {
      setSigOrtuUrl(dataUrl);
      setFormData(prev => ({ ...prev, sig_ortu_saved: true, sig_ortu_data: dataUrl }));
      showModal('Tanda Tangan Terkunci', 'Tanda tangan Orang Tua / Wali berhasil diverifikasi.', 'success');
    }
  };

  const handleDocUpload = async (docKey: keyof RegistrationData, file: File) => {
    try {
      setUploadedFiles(prev => ({ ...prev, [docKey]: file }));

      const form = new FormData();
      form.append('file', file);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: form
      });

      const data = await response.json();

      if (data.success && data.file?.url) {
        setFormData(prev => ({ 
          ...prev, 
          [docKey]: data.file.url 
        }));

        showModal(
          'Dokumen Unggah',
          `${file.name} berhasil diupload.`,
          'success'
        );
      } else {
        throw new Error('URL file tidak ditemukan');
      }

    } catch (error) {
      console.error('Upload dokumen gagal:', error);
      showModal(
        'Upload Gagal',
        'Dokumen gagal diupload ke server.',
        'warning'
      );
    }
  };

  const handleInputChange = (field: keyof RegistrationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.nama || !formData.nik || !formData.tempat_lahir || !formData.tgl_lahir || !formData.no_hp) {
        showModal('Lengkapi Data', 'Nama, NIK, Tempat & Tanggal Lahir, serta No. HP wajib diisi.', 'warning');
        return false;
      }
      if (formData.nik.length < 16) {
        showModal('Format NIK', 'NIK kependudukan harus 16 digit angka.', 'warning');
        return false;
      }
      if (!formData.alamat || !formData.rt || !formData.rw || !formData.desa || !formData.kecamatan || !formData.kota || !formData.provinsi || !formData.kodepos) {
        showModal('Lengkapi Alamat', 'Alamat lengkap beserta RT/RW, kelurahan, kecamatan, kota, dan kode pos wajib diisi.', 'warning');
        return false;
      }
      if (!formData.sekolah_asal || !formData.tahun_lulus) {
        showModal('Lengkapi Riwayat Pendidikan', 'Sekolah asal dan tahun kelulusan wajib diisi.', 'warning');
        return false;
      }
    } else if (step === 2) {
      if (!formData.nama_ayah || !formData.nama_ibu) {
        showModal('Lengkapi Data Orang Tua', 'Nama Ayah Kandung dan Ibu Kandung wajib diisi.', 'warning');
        return false;
      }
      if (formData.gunakan_wali && (!formData.nama_wali || !formData.hubungan_wali || !formData.hp_wali)) {
        showModal('Lengkapi Data Wali', 'Silakan lengkapi data wali pendaftar.', 'warning');
        return false;
      }
    } else if (step === 3) {
      if (!formData.doc_foto || !formData.doc_ktp || !formData.doc_kk || !formData.doc_ijazah) {
        showModal('Dokumen Kurang', 'Unggah berkas wajib: Pas Foto, KTP/KIA, Kartu Keluarga, dan Ijazah Terakhir.', 'warning');
        return false;
      }
    } else if (step === 4) {
      if (!formData.sig_siswa_saved || !formData.sig_ortu_saved) {
        showModal('Tanda Tangan Belum Disimpan', 'Silakan torehkan tanda tangan siswa & orang tua lalu klik "Kunci & Simpan" pada masing-masing panel.', 'warning');
        return false;
      }
    } else if (step === 5) {
      if (!statementChecked) {
        showModal('Pernyataan Hukum', 'Anda wajib mencentang persetujuan keabsahan dokumen.', 'warning');
        return false;
      }
    } else if (step === 6) {
      if (!statementChecked) {
        showModal(
          'Persetujuan Belum Dicentang',
          'Centang persetujuan kebenaran data sebelum mengirim pendaftaran.',
          'warning'
        );
        return false;
      }
    }
    return true;
  };

  const nextStep = async () => {
    if (!validateStep()) return;

    if (step < 6) {
      setStep(prev => prev + 1);
      return;
    }

    if (step === 6) {
      showModal(
        'Mengirim Pendaftaran',
        'Formulir dan dokumen sedang disimpan ke sistem.',
        'info'
      );

      try {
        const response = await fetch('/api/registration/public/register/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: formData.email || '',
            program_paket: formData.program,
            tipe_kelas: formData.tipe_kelas,

            biodata: {
              nama: formData.nama,
              nik: formData.nik,
              nisn: formData.nisn || '',
              tempat_lahir: formData.tempat_lahir,
              tgl_lahir: formData.tgl_lahir,
              jk: formData.jk,
              agama: formData.agama,
              kewarganegaraan: formData.kewarganegaraan,
              no_hp: formData.no_hp,
              email: formData.email || '',

              alamat: formData.alamat,
              rt: formData.rt,
              rw: formData.rw,
              dusun: formData.dusun,
              desa: formData.desa,
              kecamatan: formData.kecamatan,
              kota: formData.kota,
              provinsi: formData.provinsi,
              kodepos: formData.kodepos,

              pendidikan: formData.pendidikan,
              sekolah_asal: formData.sekolah_asal,
              tahun_lulus: formData.tahun_lulus,
              no_ijazah: formData.no_ijazah,

              nama_ayah: formData.nama_ayah,
              pekerjaan_ayah: formData.pekerjaan_ayah,
              nama_ibu: formData.nama_ibu,
              pekerjaan_ibu: formData.pekerjaan_ibu,

              gunakan_wali: formData.gunakan_wali,
              nama_wali: formData.gunakan_wali
                ? formData.nama_wali
                : '',
              hubungan_wali: formData.gunakan_wali
                ? formData.hubungan_wali
                : '',
              hp_wali: formData.gunakan_wali
                ? formData.hp_wali
                : '',

              tanda_tangan_siswa: formData.sig_siswa_data || '',
              tanda_tangan_ortu: formData.sig_ortu_data || ''
            },

            dokumen: {
              foto: formData.doc_foto || '',
              ktp: formData.doc_ktp || '',
              kk: formData.doc_kk || '',
              ijazah: formData.doc_ijazah || '',
              akta: formData.doc_akta || ''
            }
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.detail ||
            'Pendaftaran gagal disimpan.'
          );
        }

        const nomorPendaftaran =
          result.registration?.id ||
          result.id ||
          '';

        setRegNumber(nomorPendaftaran);
        setStep(7);
        setPaymentDone(false);

        showModal(
          'Pendaftaran Berhasil Dikirim',
          'Formulir Anda sudah diterima dan sedang menunggu verifikasi admin.',
          'success'
        );
      } catch (error: any) {
        console.error('Pendaftaran gagal:', error);

        showModal(
          'Pendaftaran Gagal',
          error?.message ||
          'Data belum berhasil disimpan. Silakan periksa kembali.',
          'warning'
        );
      }
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-50 overflow-hidden z-30 font-sans">
      {/* Top Header */}
      <div className="px-5 pt-4 pb-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 select-none">
        {step < 7 ? (
          <button onClick={onCancel} className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Batal
          </button>
        ) : <div className="w-8"></div>}
        
        <div className="flex flex-col items-center text-center">
          <span className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-widest">
            Langkah {step} dari 7
          </span>
          <span className="text-[11px] font-black text-slate-800">
            {step === 1 && 'Data Diri & Alamat'}
            {step === 2 && 'Data Orang Tua / Wali'}
            {step === 3 && 'Kelengkapan Dokumen'}
            {step === 4 && 'Tanda Tangan Digital'}
            {step === 5 && 'Pratinjau Ringkasan'}
            {step === 6 && 'Metode Pembayaran'}
            {step === 7 && 'Registrasi Berhasil'}
          </span>
        </div>
        <div className="w-12 h-6"></div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-1 shrink-0">
        <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${(step / 7) * 100}%` }}></div>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        
        {/* STEP 1: Personal, Address, Education, Program */}
        {step === 1 && (
          <div className="space-y-3.5">
            {/* Identity Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <IdCard className="w-4 h-4 text-emerald-500" /> Identitas Utama Pendaftar
              </h3>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap Siswa *</label>
                <input 
                  type="text" 
                  value={formData.nama}
                  onChange={(e) => handleInputChange('nama', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                  placeholder="Sesuai Ijazah Kelulusan Terakhir"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">NIK No. KTP / KK *</label>
                  <input 
                    type="text" 
                    maxLength={16}
                    value={formData.nik}
                    onChange={(e) => handleInputChange('nik', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                    placeholder="16 Digit NIK"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">NISN Sekolah Asal</label>
                  <input 
                    type="text" 
                    maxLength={10}
                    value={formData.nisn}
                    onChange={(e) => handleInputChange('nisn', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                    placeholder="10 Digit NISN (Jika ada)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tempat Lahir *</label>
                  <input 
                    type="text" 
                    value={formData.tempat_lahir}
                    onChange={(e) => handleInputChange('tempat_lahir', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                    placeholder="Kota / Kabupaten"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Lahir *</label>
                  <input 
                    type="date" 
                    value={formData.tgl_lahir}
                    onChange={(e) => handleInputChange('tgl_lahir', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Jenis Kelamin *</label>
                  <select 
                    value={formData.jk}
                    onChange={(e) => handleInputChange('jk', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value="Laki-laki">Laki-Laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Agama *</label>
                  <select 
                    value={formData.agama}
                    onChange={(e) => handleInputChange('agama', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Kewarganegaraan</label>
                  <select 
                    value={formData.kewarganegaraan}
                    onChange={(e) => handleInputChange('kewarganegaraan', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value="WNI">WNI (Warga Negara Indonesia)</option>
                    <option value="WNA">WNA (Warga Negara Asing)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nomor WhatsApp *</label>
                  <input 
                    type="tel" 
                    value={formData.no_hp}
                    onChange={(e) => handleInputChange('no_hp', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                    placeholder="Contoh: 0812..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Email Aktif</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                  placeholder="fajar@domain.com"
                />
              </div>
            </div>

            {/* Address Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <MapPin className="w-4 h-4 text-emerald-500" /> Domisili Tempat Tinggal (Sesuai KK)
              </h3>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Alamat Jalan / Kp. / Dusun *</label>
                <textarea 
                  value={formData.alamat}
                  onChange={(e) => handleInputChange('alamat', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                  rows={2}
                  placeholder="Nama jalan, nomor rumah, nama kampung"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">RT *</label>
                  <input 
                    type="text" 
                    value={formData.rt}
                    onChange={(e) => handleInputChange('rt', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    placeholder="00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">RW *</label>
                  <input 
                    type="text" 
                    value={formData.rw}
                    onChange={(e) => handleInputChange('rw', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    placeholder="00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Kode Pos *</label>
                  <input 
                    type="text" 
                    value={formData.kodepos}
                    onChange={(e) => handleInputChange('kodepos', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    placeholder="12345"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Dusun</label>
                  <input 
                    type="text" 
                    value={formData.dusun}
                    onChange={(e) => handleInputChange('dusun', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    placeholder="Nama Dusun"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Desa / Kelurahan *</label>
                  <input 
                    type="text" 
                    value={formData.desa}
                    onChange={(e) => handleInputChange('desa', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    placeholder="Desa Kelurahan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Kecamatan *</label>
                  <input 
                    type="text" 
                    value={formData.kecamatan}
                    onChange={(e) => handleInputChange('kecamatan', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    placeholder="Kecamatan"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Kabupaten / Kota *</label>
                  <input 
                    type="text" 
                    value={formData.kota}
                    onChange={(e) => handleInputChange('kota', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    placeholder="Kota Asal"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Provinsi *</label>
                <input 
                  type="text" 
                  value={formData.provinsi}
                  onChange={(e) => handleInputChange('provinsi', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                  placeholder="Provinsi"
                />
              </div>
            </div>

            {/* Education & PKBM Selection */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <GraduationCap className="w-4 h-4 text-emerald-500" /> Riwayat Pendidikan & Program Tujuan
              </h3>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pendidikan Terakhir *</label>
                <select 
                  value={formData.pendidikan}
                  onChange={(e) => handleInputChange('pendidikan', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="SD">Sekolah Dasar (SD) / Sederajat</option>
                  <option value="SMP">Sekolah Menengah Pertama (SMP) / Sederajat</option>
                  <option value="SMA">Sekolah Menengah Atas (SMA) / Sederajat</option>
                  <option value="Paket A">Paket A (Kesetaraan SD)</option>
                  <option value="Paket B">Paket B (Kesetaraan SMP)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Sekolah Asal *</label>
                <input 
                  type="text" 
                  value={formData.sekolah_asal}
                  onChange={(e) => handleInputChange('sekolah_asal', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  placeholder="Contoh: SMP Negeri 1 Agrabinta"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tahun Kelulusan *</label>
                  <input 
                    type="number" 
                    value={formData.tahun_lulus}
                    onChange={(e) => handleInputChange('tahun_lulus', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    placeholder="2024"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">No. Seri Ijazah</label>
                  <input 
                    type="text" 
                    value={formData.no_ijazah}
                    onChange={(e) => handleInputChange('no_ijazah', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    placeholder="DN-01/D-SMP/..."
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-50">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pilihan Program Kesetaraan *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Paket A', 'Paket B', 'Paket C'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleInputChange('program', p)}
                      className={`py-3 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                        formData.program === p 
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-600 font-extrabold' 
                          : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs">{p}</span>
                      <span className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">
                        {p === 'Paket A' && 'Setara SD'}
                        {p === 'Paket B' && 'Setara SMP'}
                        {p === 'Paket C' && 'Setara SMA'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-50">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pilihan Tipe Kelas *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Reguler', title: 'Kelas Reguler', desc: 'Siswa Reguler / Umum' },
                    { id: 'Karyawan', title: 'Kelas Karyawan', desc: 'Pekerja / Fleksibel' }
                  ].map((tk) => (
                    <button
                      key={tk.id}
                      type="button"
                      onClick={() => handleInputChange('tipe_kelas', tk.id)}
                      className={`py-3 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                        formData.tipe_kelas === tk.id 
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-600 font-extrabold' 
                          : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs">{tk.title}</span>
                      <span className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">
                        {tk.desc}
                      </span>
                    </button>
                  ))}
                </div>
                
                {/* Penjelasan Tipe Kelas */}
                <div className="mt-2.5 p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-1.5 text-left">
                  <div className="text-[10px] text-indigo-800 font-bold leading-relaxed flex items-start gap-1.5">
                    <span className="text-indigo-500 font-black shrink-0">📌</span>
                    <span><strong>Siswa Reguler:</strong> Siswa yang berumur 15 tahun sampai 21 tahun.</span>
                  </div>
                  <div className="text-[10px] text-indigo-800 font-bold leading-relaxed flex items-start gap-1.5">
                    <span className="text-indigo-500 font-black shrink-0">📌</span>
                    <span><strong>Siswa Karyawan:</strong> Siswa yang sudah bekerja dan berumur 22 tahun keatas.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Parents & Guardian Data */}
        {step === 2 && (
          <div className="space-y-3.5">
            {/* Father Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <Users className="w-4 h-4 text-emerald-500" /> Data Ayah Kandung
              </h3>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap Ayah *</label>
                <input 
                  type="text" 
                  value={formData.nama_ayah}
                  onChange={(e) => handleInputChange('nama_ayah', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                  placeholder="Nama Lengkap Sesuai KK"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">NIK Ayah (Opsional)</label>
                  <input 
                    type="text" 
                    maxLength={16}
                    value={formData.nik_ayah}
                    onChange={(e) => handleInputChange('nik_ayah', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    placeholder="16 Digit NIK"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Pekerjaan Ayah</label>
                  <input 
                    type="text" 
                    value={formData.pekerjaan_ayah}
                    onChange={(e) => handleInputChange('pekerjaan_ayah', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    placeholder="Contoh: Wiraswasta, Tani"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pendidikan Terakhir Ayah</label>
                <select 
                  value={formData.pendidikan_ayah}
                  onChange={(e) => handleInputChange('pendidikan_ayah', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="SD">SD</option>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                  <option value="S1">D3 / S1 / S2</option>
                </select>
              </div>
            </div>

            {/* Mother Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <Users className="w-4 h-4 text-emerald-500" /> Data Ibu Kandung
              </h3>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap Ibu *</label>
                <input 
                  type="text" 
                  value={formData.nama_ibu}
                  onChange={(e) => handleInputChange('nama_ibu', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                  placeholder="Nama Lengkap Sesuai KK"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">NIK Ibu (Opsional)</label>
                  <input 
                    type="text" 
                    maxLength={16}
                    value={formData.nik_ibu}
                    onChange={(e) => handleInputChange('nik_ibu', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    placeholder="16 Digit NIK"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Pekerjaan Ibu</label>
                  <input 
                    type="text" 
                    value={formData.pekerjaan_ibu}
                    onChange={(e) => handleInputChange('pekerjaan_ibu', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    placeholder="Contoh: IRT, Swasta"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pendidikan Terakhir Ibu</label>
                <select 
                  value={formData.pendidikan_ibu}
                  onChange={(e) => handleInputChange('pendidikan_ibu', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="SD">SD</option>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                  <option value="S1">D3 / S1 / S2</option>
                </select>
              </div>
            </div>

            {/* Guardian Switch Option */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={formData.gunakan_wali}
                  onChange={(e) => handleInputChange('gunakan_wali', e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 border-slate-300 focus:ring-emerald-500/20"
                />
                <span className="text-xs font-extrabold text-slate-800">Lengkapi data Wali (Opsional / Jika Ortu Berhalangan)</span>
              </label>

              {formData.gunakan_wali && (
                <div className="pt-3 border-t border-slate-50 space-y-3 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap Wali *</label>
                    <input 
                      type="text" 
                      value={formData.nama_wali}
                      onChange={(e) => handleInputChange('nama_wali', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                      placeholder="Nama Lengkap Wali"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Hubungan Kekerabatan *</label>
                      <input 
                        type="text" 
                        value={formData.hubungan_wali}
                        onChange={(e) => handleInputChange('hubungan_wali', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                        placeholder="Paman / Bibi / Kakak"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">No. HP Wali *</label>
                      <input 
                        type="tel" 
                        value={formData.hp_wali}
                        onChange={(e) => handleInputChange('hp_wali', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                        placeholder="08..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Documents Upload with previews */}
        {step === 3 && (
          <div className="space-y-3.5">
            <p className="text-[10px] text-slate-400 font-semibold px-1">
              Unggah berkas kelengkapan registrasi. Format pendukung: JPG, PNG, atau PDF (Maksimal 5 MB).
            </p>

            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'Pas Foto 3×4 Resmi *', key: 'doc_foto', accept: 'image/*', bg: 'bg-emerald-50 text-emerald-500' },
                { label: 'Foto KTP / Kartu Identitas Anak *', key: 'doc_ktp', accept: 'image/*', bg: 'bg-blue-50 text-blue-500' },
                { label: 'Scan Kartu Keluarga *', key: 'doc_kk', accept: 'image/*,application/pdf', bg: 'bg-orange-50 text-orange-500' },
                { label: 'Scan Ijazah Terakhir *', key: 'doc_ijazah', accept: 'image/*,application/pdf', bg: 'bg-indigo-50 text-indigo-500' },
                { label: 'Scan Akta Kelahiran (Opsional)', key: 'doc_akta', accept: 'image/*,application/pdf', bg: 'bg-slate-100 text-slate-500' }
              ].map((doc) => (
                <div key={doc.key} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-8 h-8 ${doc.bg} rounded-full flex items-center justify-center text-xs`}>
                        <Upload className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="text-[11px] font-extrabold text-slate-800">{doc.label}</h4>
                        <span className={`text-[8px] font-bold ${formData[doc.key as keyof RegistrationData] ? 'text-emerald-500' : 'text-red-400'}`}>
                          {formData[doc.key as keyof RegistrationData] ? `✓ ${formData[doc.key as keyof RegistrationData]}` : 'Belum Diunggah'}
                        </span>
                      </div>
                    </div>
                    <label className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[10px] font-black rounded-lg transition-colors border border-emerald-100 cursor-pointer">
                      Unggah File
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleDocUpload(doc.key as keyof RegistrationData, file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Digital Signatures via Canvas */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Student signature pad */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <FileSignature className="w-4 h-4 text-emerald-500" /> Tanda Tangan Digital Siswa *
              </h3>
              <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                Goreskan tanda tangan pendaftar di area abu-abu di bawah ini menggunakan mouse atau sentuhan jari Anda.
              </p>

              <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 relative overflow-hidden h-28 w-full">
                <canvas 
                  ref={canvasSiswaRef}
                  onMouseDown={(e) => startDrawing(e, canvasSiswaRef, true)}
                  onMouseMove={(e) => draw(e, canvasSiswaRef, true)}
                  onMouseUp={() => stopDrawing(true)}
                  onMouseLeave={() => stopDrawing(true)}
                  onTouchStart={(e) => startDrawing(e, canvasSiswaRef, true)}
                  onTouchMove={(e) => draw(e, canvasSiswaRef, true)}
                  onTouchEnd={() => stopDrawing(true)}
                  className="absolute inset-0 w-full h-full block cursor-crosshair"
                />
              </div>

              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => clearCanvas(canvasSiswaRef, true)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg transition-colors"
                >
                  Bersihkan
                </button>
                <button
                  type="button"
                  onClick={() => saveSignature(canvasSiswaRef, true)}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-lg transition-colors shadow-sm"
                >
                  Kunci & Simpan
                </button>
              </div>

              {sigSiswaUrl && (
                <div className="pt-2 text-center border-t border-slate-50">
                  <span className="text-[8px] text-slate-400 font-bold block mb-1">Pratinjau Tanda Tangan:</span>
                  <img src={sigSiswaUrl} alt="Siswa Signature" className="h-14 object-contain mx-auto border border-dashed border-slate-200 p-0.5 rounded" />
                </div>
              )}
            </div>

            {/* Parent signature pad */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <FileSignature className="w-4 h-4 text-emerald-500" /> Tanda Tangan Orang Tua / Wali *
              </h3>
              <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                Torehkan tanda tangan penanggung jawab (Ayah / Ibu / Wali) di area bawah ini.
              </p>

              <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 relative overflow-hidden h-28 w-full">
                <canvas 
                  ref={canvasOrtuRef}
                  onMouseDown={(e) => startDrawing(e, canvasOrtuRef, false)}
                  onMouseMove={(e) => draw(e, canvasOrtuRef, false)}
                  onMouseUp={() => stopDrawing(false)}
                  onMouseLeave={() => stopDrawing(false)}
                  onTouchStart={(e) => startDrawing(e, canvasOrtuRef, false)}
                  onTouchMove={(e) => draw(e, canvasOrtuRef, false)}
                  onTouchEnd={() => stopDrawing(false)}
                  className="absolute inset-0 w-full h-full block cursor-crosshair"
                />
              </div>

              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => clearCanvas(canvasOrtuRef, false)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg transition-colors"
                >
                  Bersihkan
                </button>
                <button
                  type="button"
                  onClick={() => saveSignature(canvasOrtuRef, false)}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-lg transition-colors shadow-sm"
                >
                  Kunci & Simpan
                </button>
              </div>

              {sigOrtuUrl && (
                <div className="pt-2 text-center border-t border-slate-50">
                  <span className="text-[8px] text-slate-400 font-bold block mb-1">Pratinjau Tanda Tangan:</span>
                  <img src={sigOrtuUrl} alt="Ortu Signature" className="h-14 object-contain mx-auto border border-dashed border-slate-200 p-0.5 rounded" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Summary Review */}
        {step === 5 && (
          <div className="space-y-3.5">
            <p className="text-[10px] text-slate-400 font-semibold px-1">
              Tinjau ulang lembar pendaftaran Anda sebelum mengirim berkas digital ke Data Akademik PKBM Agrabinta.
            </p>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-[10px] leading-relaxed">
              <div className="border-b border-slate-100 pb-2.5">
                <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs mb-1.5">
                  <IdCard className="w-4 h-4 text-emerald-500" /> Identitas Pendaftar
                </h4>
                <div className="grid grid-cols-2 gap-y-1 text-slate-500 font-semibold">
                  <div>Nama Lengkap:</div><div className="text-slate-800 text-right">{formData.nama}</div>
                  <div>No. NIK KTP:</div><div className="text-slate-800 text-right">{formData.nik}</div>
                  <div>No. NISN:</div><div className="text-slate-800 text-right">{formData.nisn || '-'}</div>
                  <div>TTL Lahir:</div><div className="text-slate-800 text-right">{formData.tempat_lahir}, {formData.tgl_lahir}</div>
                  <div>WhatsApp:</div><div className="text-slate-800 text-right text-emerald-600">{formData.no_hp}</div>
                </div>
              </div>

              <div className="border-b border-slate-100 pb-2.5">
                <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs mb-1.5">
                  <MapPin className="w-4 h-4 text-emerald-500" /> Alamat Domisili
                </h4>
                <p className="text-slate-700 font-bold leading-normal">
                  {formData.alamat}, RT {formData.rt}/RW {formData.rw}, Ds. {formData.desa}, Kec. {formData.kecamatan}, {formData.kota}, Prov. {formData.provinsi} ({formData.kodepos})
                </p>
              </div>

              <div className="border-b border-slate-100 pb-2.5">
                <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs mb-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-500" /> Program PKBM
                </h4>
                <div className="grid grid-cols-2 gap-y-1 text-slate-500 font-semibold">
                  <div>Sekolah Asal:</div><div className="text-slate-800 text-right">{formData.sekolah_asal}</div>
                  <div>Program Kesetaraan:</div><div className="text-emerald-600 font-black text-right uppercase">{formData.program}</div>
                  <div>Tipe Kelas:</div><div className="text-indigo-600 font-black text-right uppercase">Kelas {formData.tipe_kelas || 'Reguler'}</div>
                </div>
              </div>

              <div className="border-b border-slate-100 pb-2.5">
                <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs mb-1.5">
                  <Users className="w-4 h-4 text-emerald-500" /> Penanggung Jawab Ortu
                </h4>
                <div className="space-y-1 text-slate-500 font-semibold">
                  <div>Ayah: <span className="text-slate-800">{formData.nama_ayah}</span> ({formData.pekerjaan_ayah})</div>
                  <div>Ibu: <span className="text-slate-800">{formData.nama_ibu}</span> ({formData.pekerjaan_ibu})</div>
                  {formData.gunakan_wali && (
                    <div className="text-emerald-600 font-bold border-t border-slate-50 pt-1 mt-1">
                      Wali: {formData.nama_wali} (Hubungan: {formData.hubungan_wali}, HP: {formData.hp_wali})
                    </div>
                  )}
                </div>
              </div>

              <div className="border-b border-slate-100 pb-2.5">
                <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs mb-1.5">
                  <FileText className="w-4 h-4 text-emerald-500" /> Berkas Terunggah
                </h4>
                <ul className="space-y-1 text-slate-600 font-bold">
                  <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Pas Foto: {formData.doc_foto}</li>
                  <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> KTP/KIA: {formData.doc_ktp}</li>
                  <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Kartu Keluarga: {formData.doc_kk}</li>
                  <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Ijazah Kelulusan: {formData.doc_ijazah}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs mb-2">
                  <FileSignature className="w-4 h-4 text-emerald-500" /> Lembar Tanda Tangan Digital
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-slate-100 p-2 rounded-xl text-center">
                    <span className="text-[8px] text-slate-400 block mb-1">Siswa</span>
                    {sigSiswaUrl && <img src={sigSiswaUrl} alt="Sig Siswa" className="h-10 object-contain mx-auto" />}
                  </div>
                  <div className="border border-slate-100 p-2 rounded-xl text-center">
                    <span className="text-[8px] text-slate-400 block mb-1">Orang Tua</span>
                    {sigOrtuUrl && <img src={sigOrtuUrl} alt="Sig Ortu" className="h-10 object-contain mx-auto" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Persetujuan Tambahan Section */}
            <div className="bg-slate-50 border border-slate-200/85 p-4 rounded-2xl space-y-2.5 text-[10px] text-slate-600 leading-relaxed shadow-xs">
              <h5 className="font-extrabold text-slate-800 text-[11px] flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-pink-500" /> Persetujuan Tambahan
              </h5>
              <p className="font-semibold text-slate-600">
                Dengan menyetujui pengiriman berkas, saya menyatakan bahwa seluruh dokumen yang saya kirimkan kepada Lembaga/PKBM melalui platform Lulus.id adalah benar, sah, dan sesuai dengan data yang sebenarnya.
              </p>
              <p className="font-bold text-slate-700">
                Saya juga memahami dan menyetujui bahwa:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 font-semibold text-slate-600">
                <li>
                  Berkas yang telah dikirimkan dan diterima oleh Lembaga/PKBM atau melalui platform Lulus.id menjadi bagian dari proses administrasi dan <strong className="text-slate-800">tidak dapat diminta kembali</strong>.
                </li>
                <li>
                  Biaya pendaftaran, biaya administrasi, atau pembayaran lain yang telah dibayarkan <strong className="text-slate-800">tidak dapat dikembalikan (non-refundable)</strong> setelah proses verifikasi atau administrasi pendaftaran dimulai, kecuali terdapat kesalahan yang sepenuhnya berasal dari pihak Lembaga/PKBM atau sesuai dengan ketentuan yang berlaku.
                </li>
                <li>
                  Saya telah membaca, memahami, dan menyetujui seluruh ketentuan yang berlaku serta bersedia mematuhi setiap proses dan kebijakan yang ditetapkan oleh Lembaga/PKBM dan Lulus.id.
                </li>
              </ol>
            </div>


            <div className="px-1 py-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={statementChecked}
                  onChange={(e) => setStatementChecked(e.target.checked)}
                  className="mt-0.5 w-4.5 h-4.5 rounded text-emerald-500 border-slate-300 focus:ring-emerald-500/20"
                />
                <span className="text-[10px] font-bold text-slate-500 leading-normal">
                  Saya menyatakan seluruh data pendaftaran kesetaraan yang saya isi adalah benar, akurat, dan dapat dipertanggungjawabkan keabsahannya.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* STEP 6: Fee Payment */}
        {step === 6 && (
          <div className="space-y-3.5">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-5 rounded-3xl text-white shadow-lg space-y-2.5 text-center">
              <span className="text-[9px] font-extrabold bg-white/20 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Uang Pangkal Registrasi Baru (Kelas {formData.tipe_kelas || 'Reguler'})
              </span>
              <h3 className="text-3xl font-black">
                Rp {(formData.tipe_kelas === 'Karyawan' ? regFeeKaryawan : regFeeReguler).toLocaleString('id-ID')}
              </h3>
              <p className="text-[10px] text-emerald-100 font-bold -mt-1 bg-white/10 py-1 px-3 rounded-xl inline-block">
                Estimasi SPP Bulanan: Rp {(formData.tipe_kelas === 'Karyawan' ? sppKaryawan : sppReguler).toLocaleString('id-ID')}/bulan
              </p>
              <div className="text-[9px] text-emerald-50 font-bold border-t border-white/20 pt-2.5 text-left space-y-1">
                <p className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-white" /> Akses CBT Ujian, Tugas & Materi Kesetaraan</p>
                <p className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-white" /> Hak Konsultasi Chat Asisten AI Lulus Tanpa Batas</p>
                <p className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-white" /> Kartu Pelajar PKBM & Sinkronisasi Data Akademik Kemdikbud</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-500" /> Metode Pembayaran Instan
              </h3>
              
              <div className="grid grid-cols-1 gap-2">
                {activeMethods.map((pay) => (
                  <button
                    key={pay.id}
                    type="button"
                    onClick={() => handleInputChange('metode_pembayaran', pay.id)}
                    className={`border rounded-xl p-3 flex justify-between items-center transition-all text-left ${
                      formData.metode_pembayaran === pay.id 
                        ? 'border-emerald-500 bg-emerald-50/10' 
                        : 'border-slate-150 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 shrink-0">
                        {getProviderIcon(pay.provider)}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{pay.name}</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      formData.metode_pembayaran === pay.id 
                        ? 'border-emerald-500 bg-emerald-500 text-white' 
                        : 'border-slate-300 bg-white'
                    }`}>
                      {formData.metode_pembayaran === pay.id && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </button>
                ))}
              </div>

              {(formData.metode_pembayaran === 'qris' || 
                (activeMethods.find(m => m.id === formData.metode_pembayaran)?.provider === 'qris') || 
                (formData.metode_pembayaran && formData.metode_pembayaran.toLowerCase().includes('qris'))) && (
                <div className="p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-center space-y-2 animate-fade-in">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Pindai Kode QRIS Resmi</span>
                  <div className="w-32 h-32 bg-white border border-slate-200 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                    {/* Mock QR SVG */}
                    <svg className="w-28 h-28 text-slate-800" viewBox="0 0 100 100" fill="currentColor">
                      <rect x="5" y="5" width="25" height="25" />
                      <rect x="10" y="10" width="15" height="15" fill="white" />
                      <rect x="13" y="13" width="9" height="9" />
                      <rect x="70" y="5" width="25" height="25" />
                      <rect x="75" y="10" width="15" height="15" fill="white" />
                      <rect x="78" y="13" width="9" height="9" />
                      <rect x="5" y="70" width="25" height="25" />
                      <rect x="10" y="75" width="15" height="15" fill="white" />
                      <rect x="13" y="78" width="9" height="9" />
                      <rect x="35" y="35" width="10" height="10" />
                      <rect x="55" y="55" width="10" height="10" />
                      <rect x="45" y="45" width="10" height="10" />
                      <rect x="80" y="45" width="10" height="15" />
                      <rect x="45" y="80" width="15" height="10" />
                    </svg>
                  </div>
                  <span className="text-[8px] font-extrabold text-slate-400 animate-pulse">Menunggu konfirmasi pembayaran Anda...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 7: Menunggu Verifikasi Admin */}
        {step === 7 && (
          <div className="space-y-4 animate-scale-up">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full border border-amber-100 flex items-center justify-center mx-auto shadow-sm">
                <Clock className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  Pendaftaran Sedang Diverifikasi
                </h3>

                <p className="text-[10px] text-slate-500 font-semibold mt-2 leading-relaxed">
                  Terima kasih, formulir dan berkas pendaftaran Anda
                  telah berhasil dikirim.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-left space-y-2">
                <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                  Tim admin Lulus.id sedang memeriksa kelengkapan dan
                  kesesuaian data Anda.
                </p>

                <p className="text-[9px] text-amber-700 font-semibold leading-relaxed">
                  Jika terdapat data atau dokumen yang perlu diperbaiki,
                  admin akan memberikan catatan perbaikan.
                </p>

                <p className="text-[9px] text-amber-700 font-semibold leading-relaxed">
                  Jika pendaftaran diterima, sistem akan menerbitkan
                  tagihan biaya pendaftaran.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-left text-[10px] space-y-2">
                <div className="flex justify-between gap-3 font-bold text-slate-500">
                  <span>Nomor Pendaftaran:</span>
                  <span className="text-slate-800 font-black text-right break-all">
                    {regNumber || '-'}
                  </span>
                </div>

                <div className="flex justify-between gap-3 font-bold text-slate-500">
                  <span>Nama:</span>
                  <span className="text-slate-800 font-black text-right">
                    {formData.nama}
                  </span>
                </div>

                <div className="flex justify-between gap-3 font-bold text-slate-500">
                  <span>Program:</span>
                  <span className="text-slate-800 font-black">
                    {formData.program}
                  </span>
                </div>

                <div className="flex justify-between gap-3 font-bold text-slate-500">
                  <span>Tipe Kelas:</span>
                  <span className="text-slate-800 font-black">
                    {formData.tipe_kelas}
                  </span>
                </div>

                <div className="flex justify-between gap-3 font-bold text-slate-500">
                  <span>Status:</span>
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[8px] font-black rounded-md uppercase">
                    Menunggu Verifikasi
                  </span>
                </div>
              </div>

              <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                Mohon tidak melakukan pendaftaran ulang selama proses
                verifikasi berlangsung.
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all"
              >
                Kembali ke Halaman Utama
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Navigation Buttons Panel */}
      {step < 7 && (
        <div className="p-4 bg-white border-t border-slate-100 flex gap-2 shrink-0 select-none">
          <button
            type="button"
            onClick={prevStep}
            className={`flex-1 py-3 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${step === 1 ? 'invisible' : ''}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali
          </button>
          
          <button
            type="button"
            onClick={nextStep}
            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10"
          >
            {step === 5 ? (
              <>Kirim Data <Check className="w-3.5 h-3.5" /></>
            ) : step === 6 ? (
              <>Bayar Sekarang <ArrowRight className="w-3.5 h-3.5" /></>
            ) : (
              <>Lanjut <ArrowRight className="w-3.5 h-3.5" /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
