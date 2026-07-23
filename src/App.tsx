import VerificationPage from './components/VerificationPage';
import { useState, useEffect, lazy, Suspense } from 'react';

import { 
  GraduationCap, Sparkles, BookOpen, Key, Info, 
  Smartphone, Wifi, Battery, Signal, User, Lock, ArrowRight, School,
  Bell, FileText, Code, Check, Database, Copy, MessageSquare, Home, Award, UserCheck,
  Eye, EyeOff, ShieldCheck
} from 'lucide-react';

// Import API Client
import { api } from './lib/api';

// Import Types & Mock Data
import { Role, Subject, Task, TaskSubmission, ChatMessage, Student, Teacher, ClassData, SystemNotification, PaymentMethod, Question, Exam, Competency, StudentCompetency, SKKReport, AcademicYear } from './types';
import { mockSubjects, mockTasks, initialChatMessages } from './data/mockData';
import { initialStudents, initialTeachers, initialClasses, initialNotifications, initialCompetencies, initialStudentCompetencies, initialSKKReports } from './data/adminMockData';

// Import Django code strings for developers
import { 
  djangoViewsCode, 
  djangoUrlsCode, 
  djangoModelsCode, 
  djangoTemplateCode 
} from './data/djangoCode';

// Import Components
import Modal from './components/Modal';
const RegistrationWizard = lazy(() => import('./components/RegistrationWizard'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const UnifiedChat = lazy(() => import('./components/UnifiedChat'));
const GeminiChat = lazy(() => import('./components/GeminiChat'));
const DashboardGuru = lazy(() => import('./components/DashboardGuru'));
const DashboardAdmin = lazy(() => import('./components/DashboardAdmin'));
const BillTracker = lazy(() => import('./components/BillTracker'));
const RaporMerdeka = lazy(() => import('./components/RaporMerdeka'));
const ProfilSiswa = lazy(() => import('./components/ProfilSiswa'));
import Logo from './components/Logo';
const BankSoal = lazy(() => import('./components/BankSoal'));
const PWAManager = lazy(() => import('./components/PWAManager'));
const PaymentPage = lazy(() => import('./components/PaymentPage').then(m => ({default: m.PaymentPage})));
const OrientationDashboard = lazy(() => import('./components/OrientationDashboard').then(m => ({default: m.OrientationDashboard})));
const RegistrationStatusPage = lazy(() => import('./components/RegistrationStatusPage'));


export default function App() {

  // Sync restore session synchronously on initial render
  const getInitialRole = (): Role => {
    const cachedUser = localStorage.getItem('user');
    const cachedToken = localStorage.getItem('token');
    if (cachedUser && cachedToken) {
      try {
        const userObj = JSON.parse(cachedUser);
        const djangoRole = userObj.role?.toLowerCase() || '';
        if (djangoRole === 'admin') return 'admin';
        if (djangoRole === 'teacher' || djangoRole === 'guru') return 'guru';
        return 'siswa';
      } catch (e) {}
    }
    return 'siswa';
  };

  const getInitialUsername = (): string => {
    const cachedUser = localStorage.getItem('user');
    const cachedToken = localStorage.getItem('token');
    if (cachedUser && cachedToken) {
      try {
        const userObj = JSON.parse(cachedUser);
        return userObj.nama_lengkap || userObj.username || '';
      } catch (e) {}
    }
    return '';
  };

  const getInitialScreen = (): 'login' | 'register' | 'workspace' => {
    const cachedUser = localStorage.getItem('user');
    const cachedToken = localStorage.getItem('token');
    if (cachedUser && cachedToken) {
      return 'workspace';
    }
    return 'login';
  };

  const getInitialActiveTab = (): string => {
    const cachedUser = localStorage.getItem('user');
    const cachedToken = localStorage.getItem('token');
    if (cachedUser && cachedToken) {
      try {
        const userObj = JSON.parse(cachedUser);
        const djangoRole = userObj.role?.toLowerCase() || '';
        if (djangoRole === 'admin') return 'dashboardAdmin';
      } catch (e) {}
    }
    return 'beranda';
  };

  const getInitialActiveSubTab = (): string => {
    const cachedUser = localStorage.getItem('user');
    const cachedToken = localStorage.getItem('token');
    if (cachedUser && cachedToken) {
      try {
        const userObj = JSON.parse(cachedUser);
        const djangoRole = userObj.role?.toLowerCase() || '';
        if (djangoRole === 'teacher' || djangoRole === 'guru') return 'dashboardGuru';
      } catch (e) {}
    }
    return 'dashboardGuru';
  };

  // Screen views: 'login' | 'register' | 'workspace' | 'verifikasi'
  const [screen, setScreen] = useState<'login' | 'register' | 'workspace' | 'verifikasi'>(getInitialScreen);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);

  // Routing simulation for QR Code / verification pages
  useEffect(() => {
    const cleanVerificationCode = (code: string): string => {
      if (!code) return '';
      // Split by '?' first to remove any query parameters
      let clean = code.split('?')[0];
      // Split by '#' next to remove any trailing hash
      clean = clean.split('#')[0];
      // Trim and remove any trailing slashes or spaces
      clean = clean.trim().replace(/\/+$/, '');
      return clean;
    };

    const checkVerificationPath = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      
      const queryCode = params.get('verifikasi') || params.get('verify');
      if (queryCode) {
        setVerificationCode(cleanVerificationCode(queryCode));
        setScreen('verifikasi');
        return;
      }

      if (path.includes('/verifikasi/')) {
        const rawCode = path.split('/verifikasi/')[1];
        if (rawCode && rawCode.trim() !== '') {
          setVerificationCode(cleanVerificationCode(rawCode));
          setScreen('verifikasi');
          return;
        }
      }

      if (hash.includes('/verifikasi/')) {
        const rawCode = hash.split('/verifikasi/')[1];
        if (rawCode && rawCode.trim() !== '') {
          setVerificationCode(cleanVerificationCode(rawCode));
          setScreen('verifikasi');
          return;
        }
      }
    };

    checkVerificationPath();
    window.addEventListener('hashchange', checkVerificationPath);
    return () => window.removeEventListener('hashchange', checkVerificationPath);
  }, []);

  // Workspace tabs
  const [activeTab, setActiveTab] = useState<string>(getInitialActiveTab);
  // Active sub-tab for Teacher workspace: 'dashboardGuru' | 'chat'
  const [activeSubTab, setActiveSubTab] = useState<string>(getInitialActiveSubTab);
  const [autoOpenPdf, setAutoOpenPdf] = useState(false);
  
  // Custom display modes to focus entirely on the simulator app
  const [isFullScreen, setIsFullScreen] = useState<boolean>(true);
  const [deviceMode, setDeviceMode] = useState<'phone' | 'browser'>('browser');
  
  // App states
  const [role, setRole] = useState<Role>(getInitialRole);
  const [username, setUsername] = useState<string>(getInitialUsername);

  // Identitas lembaga global Lulus.id
  const [lembagaIdentitas, setLembagaIdentitas] = useState(() => {
    const saved = localStorage.getItem('lulus_lembaga_identitas');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      namaPkbm: 'PKBM Agrabinta Lulus.id'
    };
  });

  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Left Panel developer portal state
  const [leftTab, setLeftTab] = useState<'panduan' | 'views' | 'templates' | 'models'>('panduan');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  
  // Dynamic Session Verification State
  const [isValidatingSession, setIsValidatingSession] = useState<boolean>(() => {
    return !!localStorage.getItem('token');
  });

  // Verify Session on mount
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('token');
      const cachedUser = localStorage.getItem('user');

      if (!token) {
        setIsValidatingSession(false);
        return;
      }

      try {
        // Call the endpoint /api/user/me/ to validate token
        const userObj = await api.getCurrentUser();
        
        if (userObj) {
          localStorage.setItem('user', JSON.stringify(userObj));
          
          // Map Django role to frontend role representation
          const djangoRole = userObj.role?.toLowerCase() || '';
          let mappedRole: Role = 'siswa';
          
          if (djangoRole === 'admin') {
            mappedRole = 'admin';
          } else if (djangoRole === 'teacher' || djangoRole === 'guru') {
            mappedRole = 'guru';
          } else if (djangoRole === 'student' || djangoRole === 'siswa') {
            mappedRole = 'siswa';
          }
          
          setRole(mappedRole);
          setUsername(userObj.nama_lengkap || userObj.username || 'Fajar');
          setScreen('workspace');
          
          // Set appropriate navigation tabs
          if (mappedRole === 'admin') {
            setActiveTab('dashboardAdmin');
          } else if (mappedRole === 'guru') {
            setActiveTab('beranda');
            setActiveSubTab('dashboardGuru');
          } else {
            setActiveTab('beranda');
          }
        }
      } catch (error: any) {
        console.warn('Gagal memverifikasi session via Django API:', error);
        
        // If it's our mock token, just stay logged in, don't clear localStorage!
        if (token === 'mock-token-12345') {
          // Since it's mock token, just keep existing cached user!
          setIsValidatingSession(false);
          return;
        }
        
        const errorMsg = error?.message || '';
        // If explicit auth error, clear token and cached credentials
        if (
          errorMsg.includes('401') || 
          errorMsg.includes('403') || 
          errorMsg.includes('Unauthorized') || 
          errorMsg.includes('invalid') || 
          errorMsg.includes('Token')
        ) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setScreen('login');
        } else {
          // If network error/offline development, fallback to offline cached session
          if (cachedUser) {
            try {
              const userObj = JSON.parse(cachedUser);
              const djangoRole = userObj.role?.toLowerCase() || '';
              let mappedRole: Role = 'siswa';
              
              if (djangoRole === 'admin') {
                mappedRole = 'admin';
              } else if (djangoRole === 'teacher' || djangoRole === 'guru') {
                mappedRole = 'guru';
              } else if (djangoRole === 'student' || djangoRole === 'siswa') {
                mappedRole = 'siswa';
              }
              
              setRole(mappedRole);
              setUsername(userObj.nama_lengkap || userObj.username || 'Fajar');
              setScreen('workspace');
              
              if (mappedRole === 'admin') {
                setActiveTab('dashboardAdmin');
              } else if (mappedRole === 'guru') {
                setActiveTab('beranda');
                setActiveSubTab('dashboardGuru');
              } else {
                setActiveTab('beranda');
              }
            } catch (e) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setScreen('login');
            }
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setScreen('login');
          }
        }
      } finally {
        setIsValidatingSession(false);
      }
    };

    verifySession();
  }, []);

  // States for student V2 registration and payment status flow
  const [studentReg, setStudentReg] = useState<any | null>(null);
  
  console.log("STUDENT REG APP", studentReg);

  const [regLoading, setRegLoading] = useState<boolean>(false);

  const fetchStudentRegistration = async () => {
    try {
      setRegLoading(true);

      console.log("FETCH REGISTRATION START");

      const reg = await api.getMyRegistration();

      console.log("REGISTRATION RESULT", reg);

      setStudentReg(reg);

    } catch (err) {
      console.warn("Gagal mengambil data pendaftaran...", err);
    } finally {
      setRegLoading(false);
    }
};

  useEffect(() => {
    if (screen === 'workspace' && role === 'siswa') {
      fetchStudentRegistration();
    }
  }, [screen, role]);

  // Stateful mock records
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('lulus_subjects');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return mockSubjects;
  });
  
  // Bank Soal states
  const [questions, setQuestions] = useState<Question[]>(() => {
    const saved = localStorage.getItem('questions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'Q-1',
        type: 'pilihan_ganda',
        questionText: 'Manakah dari struktur berikut yang merupakan bagian dari struktur teks eksplanasi?',
        options: ['A. Abstraksi - Orientasi - Krisis', 'B. Pernyataan Umum - Deretan Penjelas - Interpretasi', 'C. Tesis - Argumentasi - Penegasan Ulang', 'D. Orientasi - Komplikasi - Resolusi'],
        correctAnswer: 'B',
        subject: 'Bahasa Indonesia',
        difficulty: 'Mudah'
      },
      {
        id: 'Q-2',
        type: 'essay',
        questionText: 'Jelaskan mengapa teks eksplanasi banyak menggunakan kata kerja material dan relasional!',
        correctAnswer: 'Teks eksplanasi menjelaskan proses terjadinya peristiwa secara ilmiah, sehingga membutuhkan kata kerja material untuk menjelaskan tindakan fisik proses, dan kata kerja relasional untuk menjelaskan hubungan sebab-akibat.',
        subject: 'Bahasa Indonesia',
        difficulty: 'Sedang'
      },
      {
        id: 'Q-3',
        type: 'pilihan_ganda',
        questionText: 'Jika x + 5 = 12, maka nilai dari 2x - 3 adalah...',
        options: ['A. 11', 'B. 14', 'C. 17', 'D. 21'],
        correctAnswer: 'A',
        subject: 'Matematika Kesetaraan',
        difficulty: 'Mudah'
      },
      {
        id: 'Q-4',
        type: 'essay',
        questionText: 'Sebutkan dan jelaskan langkah-langkah dalam menyelesaikan persamaan kuadrat dengan metode melengkapkan kuadrat sempurna!',
        correctAnswer: '1. Pindahkan konstanta ke ruas kanan. 2. Bagi kedua ruas dengan koefisien x^2. 3. Tambahkan kuadrat dari setengah koefisien x pada kedua ruas. 4. Ubah ruas kiri menjadi bentuk kuadrat sempurna. 5. Tarik akar kuadrat pada kedua ruas dan selesaikan x.',
        subject: 'Matematika Kesetaraan',
        difficulty: 'Sulit'
      },
      {
        id: 'Q-5',
        type: 'pilihan_ganda',
        questionText: 'Bagian sel hewan yang berfungsi sebagai pusat pembangkit energi utama (powerhouse) adalah...',
        options: ['A. Lisosom', 'B. Ribosom', 'C. Mitokondria', 'D. Badan Golgi'],
        correctAnswer: 'C',
        subject: 'Ilmu Pengetahuan Alam (IPA)',
        difficulty: 'Mudah'
      },
      {
        id: 'Q-6',
        type: 'essay',
        questionText: 'Bagaimanakah mekanisme pertukaran gas O2 dan CO2 di dalam paru-paru manusia?',
        correctAnswer: 'Pertukaran gas terjadi di alveolus secara difusi, di mana oksigen dari udara berpindah ke pembuluh darah kapiler karena perbedaan tekanan parsial, sedangkan karbon dioksida di darah kapiler berdifusi masuk ke paru-paru untuk dikeluarkan.',
        subject: 'Ilmu Pengetahuan Alam (IPA)',
        difficulty: 'Sedang'
      }
    ];
  });

  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = localStorage.getItem('exams');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'EX-101',
        title: 'Evaluasi Teks Eksplanasi Kelas X',
        subject: 'Bahasa Indonesia',
        duration: 30,
        status: 'Aktif',
        questions: [
          {
            id: 'Q-1',
            type: 'pilihan_ganda',
            questionText: 'Manakah dari struktur berikut yang merupakan bagian dari struktur teks eksplanasi?',
            options: ['A. Abstraksi - Orientasi - Krisis', 'B. Pernyataan Umum - Deretan Penjelas - Interpretasi', 'C. Tesis - Argumentasi - Penegasan Ulang', 'D. Orientasi - Komplikasi - Resolusi'],
            correctAnswer: 'B',
            subject: 'Bahasa Indonesia',
            difficulty: 'Mudah'
          },
          {
            id: 'Q-2',
            type: 'essay',
            questionText: 'Jelaskan mengapa teks eksplanasi banyak menggunakan kata kerja material dan relasional!',
            correctAnswer: 'Teks eksplanasi menjelaskan proses terjadinya peristiwa secara ilmiah, sehingga membutuhkan kata kerja material untuk menjelaskan tindakan fisik proses, dan kata kerja relasional untuk menjelaskan hubungan sebab-akibat.',
            subject: 'Bahasa Indonesia',
            difficulty: 'Sedang'
          }
        ]
      },
      {
        id: 'EX-102',
        title: 'Ujian Harian Aljabar Linear Kelas XI',
        subject: 'Matematika Kesetaraan',
        duration: 45,
        status: 'Aktif',
        questions: [
          {
            id: 'Q-3',
            type: 'pilihan_ganda',
            questionText: 'Jika x + 5 = 12, maka nilai dari 2x - 3 adalah...',
            options: ['A. 11', 'B. 14', 'C. 17', 'D. 21'],
            correctAnswer: 'A',
            subject: 'Matematika Kesetaraan',
            difficulty: 'Mudah'
          },
          {
            id: 'Q-4',
            type: 'essay',
            questionText: 'Sebutkan dan jelaskan langkah-langkah dalam menyelesaikan persamaan kuadrat dengan metode melengkapkan kuadrat sempurna!',
            correctAnswer: '1. Pindahkan konstanta ke ruas kanan. 2. Bagi kedua ruas dengan koefisien x^2. 3. Tambahkan kuadrat dari setengah koefisien x pada kedua ruas. 4. Ubah ruas kiri menjadi bentuk kuadrat sempurna. 5. Tarik akar kuadrat pada kedua ruas dan selesaikan x.',
            subject: 'Matematika Kesetaraan',
            difficulty: 'Sulit'
          }
        ]
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('questions', JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem('exams', JSON.stringify(exams));
  }, [exams]);
  // Load tasks from localStorage or use mockTasks
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('lulus_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return mockTasks;
  });

  useEffect(() => {
    localStorage.setItem('lulus_tasks', JSON.stringify(tasks));
  }, [tasks]);
  
  useEffect(() => {
    localStorage.setItem('lulus_subjects', JSON.stringify(subjects));
  }, [subjects]);

  // Load task submissions
  const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>(() => {
    const saved = localStorage.getItem('lulus_task_submissions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { 
        id: 'SUB-101', 
        taskId: 'TSK-01',
        studentId: 'SIS-1001', 
        studentName: 'Fajar Pratama', 
        studentPhoto: 'https://placehold.co/100x100/15803d/ffffff?text=Fajar',
        kelas: 'Kelas X - Paket C', 
        subject: 'Bahasa Indonesia',
        taskTitle: 'Menulis Ringkasan Teks Eksplanasi',
        submissionDate: 'Hari Ini, 14:20',
        fileSize: '1.2 MB (PDF)',
        status: 'Menunggu Penilaian',
        submissionText: 'Berikut adalah ringkasan teks eksplanasi mengenai fenomena pelangi...',
        submissionFiles: [{ name: 'Ringkasan_Eksplanasi_Pelangi.pdf', type: 'document', size: '1.2 MB' }]
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('lulus_task_submissions', JSON.stringify(taskSubmissions));
  }, [taskSubmissions]);

  // Synchronize student data from Django DRF
  useEffect(() => {
    if (screen === 'workspace' && role === 'siswa') {
      const loadSiswaData = async () => {
        try {
          const fetchedSubjects = await api.getSiswaSubjects();
          if (fetchedSubjects && fetchedSubjects.length > 0) {
            const mappedSubjects: Subject[] = fetchedSubjects.map((item: any, idx: number) => {
              return {
                id: item.id?.toString() || `SUB-${idx + 1}`,
                name: item.name || item.judul || item.mata_pelajaran || 'Mata Pelajaran',
                category: item.category || 'Mata Pelajaran Wajib',
                materiCount: item.materiCount || item.materi_count || 12,
                progress: item.progress || 0,
                textBody: item.textBody || item.konten || item.deskripsi || 'Materi pelajaran PKBM Kesetaraan Lulus.id.',
                videoUrl: item.videoUrl || item.video_url || '',
                duration: item.duration || '2 Jam 30 Menit',
                kkm: item.kkm || 75,
                grade: item.grade || item.nilai || 0,
                status: item.status || ((item.grade || item.nilai || 0) >= (item.kkm || 75) ? 'Lulus' : 'Perlu Perbaikan'),
                capaianUtama: item.capaianUtama || 'Memahami materi pembelajaran pokok dengan sangat baik.',
                bimbinganUtama: item.bimbinganUtama || 'Pertahankan prestasi belajar Anda.'
              };
            });
            setSubjects(mappedSubjects);
          }
        } catch (error) {
          console.warn('Gagal memuat materi pembelajaran dari Django API, menggunakan mock fallback:', error);
        }

        try {
          const fetchedTasks = await api.getSiswaTasks();
          if (fetchedTasks && fetchedTasks.length > 0) {
            const mappedTasks: Task[] = fetchedTasks.map((item: any, idx: number) => {
              return {
                id: item.id?.toString() || `TSK-${idx + 1}`,
                subject: item.subject || item.mata_pelajaran || 'Umum',
                title: item.title || item.judul || 'Tugas Mandiri',
                program: item.program || 'Paket C',
                kelas: item.kelas || 'Kelas X - Paket C',
                semester: item.semester || 'Ganjil',
                tahunAjaran: item.tahunAjaran || '2026/2027',
                dueDate: item.dueDate || item.batas_waktu || '2026-07-30',
                status: item.status === 'Draft' || item.status === 'Ditutup' ? item.status : 'Dipublikasikan',
                description: item.description || item.deskripsi || 'Selesaikan tugas mandiri ini dengan mengunggah lembar jawaban atau mengetik penjelasan.',
              };
            });
            setTasks(mappedTasks);

            // Extract submissions if available
            const fetchedSubmissions: TaskSubmission[] = [];
            fetchedTasks.forEach((item: any, idx: number) => {
              const taskId = item.id?.toString() || `TSK-${idx + 1}`;
              if (item.status === 'Selesai' || item.submissionText || (item.submissionFiles && item.submissionFiles.length > 0)) {
                fetchedSubmissions.push({
                  id: `SUB-${Date.now()}-${idx}`,
                  taskId: taskId,
                  studentId: 'SIS-101',
                  studentName: 'Fajar Alfian',
                  kelas: item.kelas || 'Kelas X - Paket C',
                  subject: item.subject || item.mata_pelajaran || 'Umum',
                  taskTitle: item.title || item.judul || 'Tugas Mandiri',
                  submissionText: item.submissionText || '',
                  submissionFiles: item.submissionFiles || [],
                  submissionDate: new Date().toISOString().split('T')[0],
                  status: 'Menunggu Penilaian'
                });
              }
            });
            if (fetchedSubmissions.length > 0 && setTaskSubmissions) {
              setTaskSubmissions(prev => {
                const filtered = prev.filter(p => !fetchedSubmissions.some(f => f.taskId === p.taskId));
                return [...filtered, ...fetchedSubmissions];
              });
            }
          }
        } catch (error) {
          console.warn('Gagal memuat daftar tugas dari Django API, menggunakan mock fallback:', error);
        }
      };

      loadSiswaData();
    }
  }, [screen, role]);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(initialChatMessages);
  const [teacherChatHistory, setTeacherChatHistory] = useState<ChatMessage[]>([
    { role: 'model', text: 'Halo Bu Rina! Saya Lulus AI Guru. Saya siap membantu Anda membuat modul pembelajaran, RPP/modul ajar, silabus, bank soal, rubrik penilaian, atau administrasi pengajaran lainnya menggunakan kecerdasan Gemini.' }
  ]);
  const [explainRequest, setExplainRequest] = useState<string | null>(null);

  // SKK States
  const [competencies, setCompetencies] = useState<Competency[]>(() => {
    const saved = localStorage.getItem('competencies');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialCompetencies;
  });

  const [studentCompetencies, setStudentCompetencies] = useState<StudentCompetency[]>(() => {
    const saved = localStorage.getItem('studentCompetencies');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialStudentCompetencies;
  });

  const [skkReports, setSkkReports] = useState<SKKReport[]>(() => {
    const saved = localStorage.getItem('skkReports');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialSKKReports;
  });

  useEffect(() => {
    localStorage.setItem('competencies', JSON.stringify(competencies));
  }, [competencies]);

  useEffect(() => {
    localStorage.setItem('studentCompetencies', JSON.stringify(studentCompetencies));
  }, [studentCompetencies]);

  useEffect(() => {
    localStorage.setItem('skkReports', JSON.stringify(skkReports));
  }, [skkReports]);

  // Master Tahun Ajaran State
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(() => {
    const saved = localStorage.getItem('academicYears');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: 'ay-1', nama: '2025/2026', semester: 'Genap', tanggalMulai: '2026-01-01', tanggalSelesai: '2026-06-30', aktif: false },
      { id: 'ay-2', nama: '2026/2027', semester: 'Ganjil', tanggalMulai: '2026-07-01', tanggalSelesai: '2026-12-31', aktif: true },
      { id: 'ay-3', nama: '2027/2028', semester: 'Ganjil', tanggalMulai: '2027-07-01', tanggalSelesai: '2027-12-31', aktif: false }
    ];
  });

  const activeAcademicYear = academicYears.find(ay => ay.aktif) || academicYears[0];

  useEffect(() => {
    localStorage.setItem('academicYears', JSON.stringify(academicYears));
  }, [academicYears]);

  // Admin DB states
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('lulus_students');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return initialStudents;
  });
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('lulus_teachers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return initialTeachers;
  });
  const [classes, setClasses] = useState<ClassData[]>(() => {
    const saved = localStorage.getItem('lulus_classes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return initialClasses;
  });
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    const saved = localStorage.getItem('lulus_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return initialNotifications;
  });

  // Effects to save admin DB states to localStorage
  useEffect(() => {
    localStorage.setItem('lulus_students', JSON.stringify(students));
  }, [students]);
  
  useEffect(() => {
    localStorage.setItem('lulus_teachers', JSON.stringify(teachers));
  }, [teachers]);
  
  useEffect(() => {
    localStorage.setItem('lulus_classes', JSON.stringify(classes));
  }, [classes]);
  
  useEffect(() => {
    localStorage.setItem('lulus_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Pricing state for registration fees and SPP (persisted to localStorage)
  const [regFeeReguler, setRegFeeReguler] = useState<number>(() => {
    const saved = localStorage.getItem('regFeeReguler');
    return saved ? Number(saved) : 300000;
  });
  const [regFeeKaryawan, setRegFeeKaryawan] = useState<number>(() => {
    const saved = localStorage.getItem('regFeeKaryawan');
    return saved ? Number(saved) : 500000;
  });
  const [sppReguler, setSppReguler] = useState<number>(() => {
    const saved = localStorage.getItem('sppReguler');
    return saved ? Number(saved) : 150000;
  });
  const [sppKaryawan, setSppKaryawan] = useState<number>(() => {
    const saved = localStorage.getItem('sppKaryawan');
    return saved ? Number(saved) : 250000;
  });

  const updatePrices = (regReg: number, regKar: number, sppReg: number, sppKar: number) => {
    setRegFeeReguler(regReg);
    setRegFeeKaryawan(regKar);
    setSppReguler(sppReg);
    setSppKaryawan(sppKar);
    localStorage.setItem('regFeeReguler', regReg.toString());
    localStorage.setItem('regFeeKaryawan', regKar.toString());
    localStorage.setItem('sppReguler', sppReg.toString());
    localStorage.setItem('sppKaryawan', sppKar.toString());
  };

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => {
    const saved = localStorage.getItem('paymentMethods');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: 'qris', name: 'QRIS Instan (Gopay, OVO, ShopeePay)', provider: 'qris', isActive: true },
      { id: 'bca', name: 'Transfer Virtual Account BCA', provider: 'bca', isActive: true },
      { id: 'mandiri', name: 'Transfer Virtual Account Mandiri', provider: 'mandiri', isActive: true }
    ];
  });

  const updatePaymentMethods = (methods: PaymentMethod[]) => {
    setPaymentMethods(methods);
    localStorage.setItem('paymentMethods', JSON.stringify(methods));
  };

  const [financialTransactions, setFinancialTransactions] = useState<any[]>(() => {
    const saved = localStorage.getItem('financialTransactions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: 'TX-1001', studentName: 'Fajar Pratama', type: 'SPP Bulan Mei', amount: 150000, method: 'Transfer Virtual Account BCA', date: '2026-05-10', status: 'Lunas' },
      { id: 'TX-1002', studentName: 'Budi Santoso', type: 'Pendaftaran Paket B', amount: 300000, method: 'QRIS Instan', date: '2026-05-12', status: 'Lunas' },
      { id: 'TX-1003', studentName: 'Siti Rahma', type: 'Pendaftaran Paket C', amount: 500000, method: 'Transfer Virtual Account Mandiri', date: '2026-06-01', status: 'Menunggu Verifikasi' },
      { id: 'TX-1004', studentName: 'Rian Hidayat', type: 'SPP Bulan Juni', amount: 250000, method: 'QRIS Instan', date: '2026-06-08', status: 'Lunas' },
      { id: 'TX-1005', studentName: 'Aditya Perkasa', type: 'Pendaftaran Paket A', amount: 300000, method: 'Transfer Virtual Account BCA', date: '2026-07-10', status: 'Menunggu Verifikasi' }
    ];
  });

  const updateTransactions = (txs: any[]) => {
    setFinancialTransactions(txs);
    localStorage.setItem('financialTransactions', JSON.stringify(txs));
  };

  // Custom Modal dialog state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalDesc, setModalDescription] = useState<string>('');
  const [modalType, setModalType] = useState<'info' | 'warning' | 'success'>('info');

  // Status Bar live clock
  const [time, setTime] = useState<string>('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      setTime(`${hh}:${mm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const triggerModal = (title: string, desc: string, type: 'info' | 'warning' | 'success' = 'info') => {
    setModalTitle(title);
    setModalDescription(desc);
    setModalType(type);
    setModalOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setRole(null);
    setUsername('');
    setScreen('login');
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      // Prioritas Utama: Coba autentikasi menggunakan Django REST API
      const result = await api.login(username, password);
      
      if (result && result.token) {
        localStorage.setItem('token', result.token);
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
          
          // Adapter untuk memetakan role dari Django ke role frontend ('siswa' | 'guru' | 'admin')
          const djangoRole = result.user.role?.toLowerCase() || '';
          let mappedRole: Role = 'siswa';
          
          if (djangoRole === 'admin') {
            mappedRole = 'admin';
          } else if (djangoRole === 'teacher' || djangoRole === 'guru') {
            mappedRole = 'guru';
          } else if (djangoRole === 'student' || djangoRole === 'siswa') {
            mappedRole = 'siswa';
          }
          
          setRole(mappedRole);
          setUsername(result.user.nama_lengkap || result.user.username);
          setScreen('workspace');
          
          // Mengatur navigasi awal sesuai dengan hak akses / role
          if (mappedRole === 'admin') {
            setActiveTab('dashboardAdmin');
          } else if (mappedRole === 'guru') {
            setActiveTab('beranda');
            setActiveSubTab('dashboardGuru');
          } else {
            setActiveTab('beranda');
          }
          setIsLoggingIn(false);
          return; // Login berhasil, keluar dari fungsi
        }
      }
    } catch (apiError) {
      console.warn('Gagal masuk melalui Django REST API, mencoba menggunakan Fallback Mock Login...', apiError);
    }

    // Fallback Mock Login jika API Django belum dikonfigurasi / tidak merespon
    const enteredUsername = username.toLowerCase().trim();
    let detectedRole: Role = 'siswa';
    let finalUsername = username;
    let loginSuccess = false;

    // 1. Cek Admin
    if (enteredUsername === 'admin' || enteredUsername === 'admin utama' || enteredUsername === 'administrator') {
      detectedRole = 'admin';
      finalUsername = 'Admin Utama';
      loginSuccess = true;
    }

    // 2. Cek Guru
    if (!loginSuccess) {
      const matchedTeacher = teachers.find(t => {
        const teacherUsername = t.username || t.nama.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
        const teacherPassword = t.password || '123456';
        return (enteredUsername === teacherUsername.toLowerCase() || enteredUsername === t.id.toLowerCase() || enteredUsername === t.nip) && 
               (password === teacherPassword || password === '' || password === '••••••••' || password === '123456');
      });

      if (matchedTeacher) {
        detectedRole = 'guru';
        finalUsername = matchedTeacher.nama;
        loginSuccess = true;
      } else if (enteredUsername === 'rina' || enteredUsername === 'guru') {
        detectedRole = 'guru';
        finalUsername = 'Bu Rina, S.Pd.';
        loginSuccess = true;
      }
    }

    // 3. Cek Siswa
    if (!loginSuccess) {
      const matchedStudent = students.find(s => {
        const studentUsername = s.username || s.nama.split(' ')[0].toLowerCase();
        const studentPassword = s.password || '123456';
        return (enteredUsername === studentUsername.toLowerCase() || enteredUsername === s.id.toLowerCase() || enteredUsername === s.nisn) && 
               (password === studentPassword || password === '' || password === '••••••••' || password === '123456');
      });

      if (matchedStudent) {
        detectedRole = 'siswa';
        finalUsername = matchedStudent.nama;
        loginSuccess = true;
      } else if (enteredUsername === 'fajar' || enteredUsername === 'siswa') {
        detectedRole = 'siswa';
        finalUsername = 'Fajar Pratama';
        loginSuccess = true;
      }
    }

    if (loginSuccess) {
      // Save mock data to localStorage too!
      localStorage.setItem('token', 'mock-token-12345'); // Use a dummy token for mock login!
      localStorage.setItem('user', JSON.stringify({
        nama_lengkap: finalUsername,
        username: finalUsername.toLowerCase().split(' ').join('_'),
        role: detectedRole
      }));

      setRole(detectedRole);
      setUsername(finalUsername);
      setScreen('workspace');
      if (detectedRole === 'admin') {
        setActiveTab('dashboardAdmin');
      } else if (detectedRole === 'guru') {
        setActiveTab('beranda');
        setActiveSubTab('dashboardGuru');
      } else {
        setActiveTab('beranda');
      }
    } else {
      triggerModal('Gagal Masuk', 'Username atau password salah. Silakan periksa kembali kredensial Anda.', 'warning');
    }
    setIsLoggingIn(false);
  };

  const handleRegisterSuccess = (newUsername: string, newStudent?: Student) => {
    setUsername(newUsername);
    setPassword('123456');
    setScreen('login');
    
    if (newStudent) {
      setStudents(prev => [...prev, newStudent]);
      
      const isKaryawan = newStudent.tipeKelas === 'Karyawan';
      const feeAmount = isKaryawan ? regFeeKaryawan : regFeeReguler;
      const newTxObj = {
        id: `TX-${Date.now().toString().slice(-4)}`,
        studentName: newStudent.nama,
        type: `Pendaftaran ${newStudent.program}`,
        amount: feeAmount,
        method: isKaryawan ? 'Transfer Virtual Account Mandiri' : 'QRIS Instan',
        date: new Date().toISOString().split('T')[0],
        status: 'Menunggu Verifikasi'
      };
      setFinancialTransactions(prev => [newTxObj, ...prev]);

      const newNotif: SystemNotification = {
        id: `NOT-${Date.now()}`,
        type: 'pendaftaran',
        title: 'Pendaftar Baru Masuk',
        text: `${newStudent.nama} mendaftar di Paket ${newStudent.program.slice(-1)}. Berkas menunggu verifikasi admin.`,
        time: 'Baru saja',
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
    }

    triggerModal(
      'Pendaftaran Terkirim', 
      `Daftar kesetaraan berhasil! Berkas Anda sedang menunggu verifikasi admin. Silakan coba masuk ke portal secara berkala menggunakan username: ${newUsername} dan password: 123456.`, 
      'success'
    );
  };

  const handleTriggerExplainWithAi = (promptText: string) => {
    setExplainRequest(promptText);
    setActiveTab('tanyaAI');
  };

  const handleCopyCode = (codeText: string, fileName: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedFile(fileName);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  if (isValidatingSession && !localStorage.getItem('user')) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 font-sans p-4 relative">
        <div className="absolute top-0 inset-x-0 h-44 bg-gradient-to-b from-emerald-50/50 to-transparent pointer-events-none" />
        <div className="flex flex-col items-center justify-center text-center relative z-10">
          <div className="relative mb-6 flex items-center justify-center">
            <Logo size={135} className="filter drop-shadow-md hover:scale-105 transition-transform duration-300" />
            <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-1.5 -right-1.5 animate-pulse" />
          </div>
          <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h3 className="text-sm font-bold text-slate-800">Memverifikasi Sesi Anda...</h3>
          <p className="text-xs font-medium text-slate-400 mt-1">Menghubungkan dengan aman ke server Lulus.id</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-white text-slate-800 font-sans antialiased overflow-hidden relative">
      <PWAManager />
      {/* Core App screen display portal */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
        {/* LOGIN SCREEN */}
        {screen === 'login' && (
          <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative">
            <div className="absolute top-0 inset-x-0 h-44 bg-gradient-to-b from-emerald-50/50 to-transparent pointer-events-none" />
            
            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 md:p-8 relative z-10 flex flex-col">
              {/* Logo and Slogan */}
              <div className="flex flex-col items-center justify-center mt-2 mb-6 z-10 text-center">
                <div className="relative mb-3 flex items-center justify-center">
                  <Logo size={135} className="filter drop-shadow-md hover:scale-105 transition-transform duration-300" />
                  <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-1.5 -right-1.5 animate-pulse" />
                </div>
                <p className="text-[11px] font-bold text-slate-400 max-w-[240px] mt-1">
                  Belajar kesetaraan fleksibel, raih masa depan!
                </p>
              </div>

              <div className="text-center mb-6 z-10">
                <h3 className="text-2xl font-black text-slate-800 border-[#41609d]">
                  Login
                </h3>
              </div>

              {/* Fields */}
              <div className="space-y-3.5 z-10">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                    placeholder="Username / NISN / NIP"
                  />
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold px-1 text-slate-400">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-pink-500 border-slate-300 focus:ring-pink-500/20" />
                    <span>Ingat saya</span>
                  </label>
                  <a href="#" onClick={(e) => {e.preventDefault(); triggerModal('Lupa Password', 'Silakan hubungi Bu Rina (Wali Kelas) atau Administrator PKBM Agrabinta untuk mereset sandi Anda.', 'info')}} className="text-pink-600 hover:underline">Lupa Password?</a>
                </div>
              </div>

              {/* Action Submit */}
              <div className="mt-6 z-10">
                <button 
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full py-3.5 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-400 text-white rounded-2xl text-xs font-bold flex items-center justify-between px-5 transition-all shadow-md shadow-pink-500/10 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>{isLoggingIn ? 'Menyiapkan akses Lulus.id...' : 'Masuk ke Dashboard'}</span>
                  <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    {isLoggingIn ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    )}
                  </span>
                </button>
              </div>



              {/* Register Wizard Entry */}
              <div className="mt-8 text-center z-10 border-t border-slate-100 pt-5">
                <span className="text-[10px] font-bold text-slate-400">Belum memiliki akun siswa?</span>
                <div className="mt-3">
                  <button 
                    onClick={() => setScreen('register')}
                    className="w-full py-3 bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-100 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <School className="w-4 h-4 text-pink-500" /> daftar Siswa baru disini
                  </button>
                </div>
              </div>

              {/* Document verification entry point */}
              <div className="mt-3 text-center z-10">
                <button 
                  onClick={() => { setVerificationCode(null); setScreen('verifikasi'); }}
                  className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-emerald-600 border border-slate-200/80 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer animate-pulse"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verifikasi QR / Keaslian Dokumen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENT VERIFICATION LANDING PAGE SCREEN */}
        {screen === 'verifikasi' && (
          <VerificationPage 
            initialCode={verificationCode} 
            onBack={() => { setScreen('login'); setVerificationCode(null); }} 
          />
        )}

        {/* REGISTRATION WIZARD SCREEN */}
        {screen === 'register' && (
          <div className="min-h-screen w-full bg-slate-50 overflow-y-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
              <RegistrationWizard 
                onCancel={() => setScreen('login')}
                onSuccess={handleRegisterSuccess}
                showModal={triggerModal}
                regFeeReguler={regFeeReguler}
                regFeeKaryawan={regFeeKaryawan}
                sppReguler={sppReguler}
                sppKaryawan={sppKaryawan}
                paymentMethods={paymentMethods}
              />
            </div>
          </div>
        )}

        {/* MAIN WORKSPACE SCREEN */}
        {screen === 'workspace' && (
          <div className="min-h-screen flex flex-col bg-white overflow-y-auto">
            {role === 'siswa' ? (
              <>
                {studentReg && (() => {
                  const registration_status = studentReg.registration_status;
                  const payment_status = studentReg.invoice?.payment_status;

                  if (
                    registration_status === 'MENUNGGU_VERIFIKASI' ||
                    registration_status === 'PERBAIKAN_DOKUMEN' ||
                    registration_status === 'KLARIFIKASI_DATA'
                  ) {
                    return (
                      <RegistrationStatusPage
                        registration={studentReg}
                        onRefresh={fetchStudentRegistration}
                        onLogout={handleLogout}
                      />
                    );
                  }

                  if (
                    registration_status === 'DITERIMA' &&
                    payment_status !== 'PAID'
                  ) {
                    return (
                      <PaymentPage
                        registration={studentReg}
                        onRefresh={fetchStudentRegistration}
                        onLogout={handleLogout}
                      />
                    );
                  }

                  if (
                    payment_status === 'PAID' &&
                    !studentReg.biodata?.kelas_plotted
                  ) {
                    return (
                      <OrientationDashboard
                        registration={studentReg}
                        onRefresh={fetchStudentRegistration}
                        onCompleteOrientation={fetchStudentRegistration}
                      />
                    );
                  }

                  return null;
                })()}


                {/* Student workspace layouts */}
                {(!studentReg || studentReg.invoice?.payment_status === 'PAID') &&
                ['beranda', 'materi', 'tugas', 'cbt', 'nilai', 'pustaka', 'sertifikat', 'pengumuman', 'skk', 'absensi'].includes(activeTab) && (
                  <Dashboard 
                    subjects={subjects}
                    setSubjects={setSubjects}
                    tasks={tasks}
                    setTasks={setTasks}
                    taskSubmissions={taskSubmissions}
                    setTaskSubmissions={setTaskSubmissions}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onTriggerExplainWithAi={handleTriggerExplainWithAi}
                    showModal={triggerModal}
                    username={username}
                    onBackToLogin={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      setScreen('login');
                      triggerModal('Logout Berhasil', 'Anda telah keluar dari Portal Siswa Lulus.id secara aman.', 'success');
                    }}
                    exams={exams}
                    setExams={setExams}
                    competencies={competencies}
                    studentCompetencies={studentCompetencies}
                    setStudentCompetencies={setStudentCompetencies}
                    skkReports={skkReports}
                    setSkkReports={setSkkReports}
                    students={students}
                    lembagaIdentitas={lembagaIdentitas}
                    activeAcademicYear={activeAcademicYear}
                  />
                )}

                {/* Separate Tanya AI (GeminiChat) and Diskusi Siswa (UnifiedChat) */}
                {activeTab === 'tanyaAI' && (
                  <GeminiChat 
                    chatHistory={chatHistory}
                    setChatHistory={setChatHistory}
                    onBack={() => setActiveTab('beranda')}
                    explainTextRequest={explainRequest}
                    onClearExplainRequest={() => setExplainRequest(null)}
                    showModal={triggerModal}
                    currentUserRole={role}
                  />
                )}

                {activeTab === 'diskusi' && (
                  <UnifiedChat 
                    currentUserRole="siswa"
                    onBack={() => setActiveTab('beranda')}
                    showModal={triggerModal}
                    initialCategory="forum"
                    teachers={teachers}
                    classes={classes}
                    students={students}
                  />
                )}

                {activeTab === 'tagihan' && (
                  <BillTracker 
                    onBack={() => setActiveTab('beranda')}
                    showModal={triggerModal}
                    financialTransactions={financialTransactions}
                    onUpdateTransactions={updateTransactions}
                    paymentMethods={paymentMethods}
                  />
                )}

                {activeTab === 'rapor' && (
                  <RaporMerdeka 
                    subjects={subjects}
                    onBack={() => setActiveTab('beranda')}
                    showModal={triggerModal}
                    activeAcademicYear={activeAcademicYear}
                  />
                )}

                {activeTab === 'profil' && (
                  <ProfilSiswa 
                    onBack={() => setActiveTab('beranda')}
                    showModal={triggerModal}
                    students={students}
                    setStudents={setStudents}
                    username={username}
                    onBackToLogin={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      setScreen('login');
                      triggerModal('Logout Berhasil', 'Anda telah keluar dari Portal Siswa Lulus.id secara aman.', 'success');
                    }}
                  />
                )}
              </>
            ) : role === 'admin' ? (
              <DashboardAdmin 
                students={students}
                setStudents={setStudents}
                teachers={teachers}
                setTeachers={setTeachers}
                classes={classes}
                setClasses={setClasses}
                notifications={notifications}
                setNotifications={setNotifications}
                subjects={subjects}
                setSubjects={setSubjects}
                onBackToLogin={() => {
                   localStorage.removeItem('token');
                   localStorage.removeItem('user');
                   setScreen('login');
                   triggerModal('Logout Berhasil', 'Anda telah keluar dari Portal Admin Lulus.id.', 'success');
                }}
                showModal={triggerModal}
                regFeeReguler={regFeeReguler}
                regFeeKaryawan={regFeeKaryawan}
                sppReguler={sppReguler}
                sppKaryawan={sppKaryawan}
                onUpdatePrices={updatePrices}
                paymentMethods={paymentMethods}
                onUpdatePaymentMethods={updatePaymentMethods}
                financialTransactions={financialTransactions}
                onUpdateTransactions={updateTransactions}
                competencies={competencies}
                setCompetencies={setCompetencies}
                studentCompetencies={studentCompetencies}
                setStudentCompetencies={setStudentCompetencies}
                skkReports={skkReports}
                setSkkReports={setSkkReports}
                academicYears={academicYears}
                setAcademicYears={setAcademicYears}
                activeAcademicYear={activeAcademicYear}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col bg-white">
                {/* Teacher workspace layouts */}
                <div className="flex-1 relative overflow-hidden">
                  {(activeSubTab === 'dashboardGuru' || activeSubTab === 'skkSiswa') && (
                    <DashboardGuru 
                      onBackToLogin={() => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        setScreen('login');
                      }}
                      showModal={triggerModal}
                      activeSubTab={activeSubTab}
                      setActiveSubTab={setActiveSubTab}
                      subjects={subjects}
                      setSubjects={setSubjects}
                      tasks={tasks}
                      setTasks={setTasks}
                      taskSubmissions={taskSubmissions}
                      setTaskSubmissions={setTaskSubmissions}
                      teachers={teachers}
                      setTeachers={setTeachers}
                      username={username}
                      setUsername={setUsername}
                      setAutoOpenPdf={setAutoOpenPdf}
                      competencies={competencies}
                      setCompetencies={setCompetencies}
                      studentCompetencies={studentCompetencies}
                      setStudentCompetencies={setStudentCompetencies}
                      skkReports={skkReports}
                      setSkkReports={setSkkReports}
                      students={students}
                      activeAcademicYear={activeAcademicYear}
                    />
                  )}

                  {activeSubTab === 'bankSoal' && (
                    <BankSoal 
                      questions={questions}
                      setQuestions={setQuestions}
                      exams={exams}
                      setExams={setExams}
                      showModal={triggerModal}
                      onBack={() => setActiveSubTab('dashboardGuru')}
                      autoOpenPdf={autoOpenPdf}
                      setAutoOpenPdf={setAutoOpenPdf}
                    />
                  )}

                  {activeSubTab === 'chat' && (
                    <UnifiedChat 
                      currentUserRole="guru"
                      onBack={() => setActiveSubTab('dashboardGuru')}
                      showModal={triggerModal}
                      teachers={teachers}
                      classes={classes}
                      students={students}
                    />
                  )}

                  {activeSubTab === 'tanyaAIGuru' && (
                    <GeminiChat 
                      chatHistory={teacherChatHistory}
                      setChatHistory={setTeacherChatHistory}
                      onBack={() => setActiveSubTab('dashboardGuru')}
                      title="Lulus AI Guru"
                      placeholder="Buat silabus, kisi-kisi soal, rubrik nilai, atau materi..."
                      showModal={triggerModal}
                      currentUserRole={role}
                    />
                  )}
                </div>

                {/* Beautiful Sticky Bottom Navigation for Teacher */}
                <div className="h-16 border-t border-slate-100 bg-white flex items-center justify-around shrink-0 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] select-none">
                  <button 
                    onClick={() => setActiveSubTab('dashboardGuru')}
                    className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                      activeSubTab === 'dashboardGuru' ? 'text-pink-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Home className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-tight">Beranda</span>
                  </button>

                  <button 
                    onClick={() => setActiveSubTab('chat')}
                    className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer relative ${
                      activeSubTab === 'chat' ? 'text-pink-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-tight">Chat</span>
                    <span className="absolute top-[2px] right-2.5 w-1.5 h-1.5 bg-pink-500 rounded-full"></span>
                  </button>

                  <button 
                    onClick={() => setActiveSubTab('bankSoal')}
                    className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer relative ${
                      activeSubTab === 'bankSoal' ? 'text-pink-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Award className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-tight">Bank Soal</span>
                  </button>

                  <button 
                    onClick={() => setActiveSubTab('skkSiswa')}
                    className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer relative ${
                      activeSubTab === 'skkSiswa' ? 'text-pink-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <UserCheck className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-tight">SKK Siswa</span>
                  </button>

                  <button 
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      setScreen('login');
                      triggerModal('Logout Berhasil', 'Anda telah keluar dari Portal Guru Lulus.id secara aman.', 'success');
                    }}
                    className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-tight">Keluar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global alert replacements */}
      <Modal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        description={modalDesc}
        type={modalType}
      />
    </div>
  );
}
