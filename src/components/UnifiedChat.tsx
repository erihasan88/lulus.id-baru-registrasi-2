import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, ArrowLeft, Search, MessageSquare, Sparkles, Smile, Paperclip, 
  CornerUpLeft, Image, FileText, Check, CheckCheck, Bot, User, Trash2, Globe, Heart,
  MoreVertical, Phone, Video, Mic, Plus, Megaphone, Volume2, Play
} from 'lucide-react';
import { Teacher, ClassData, Student } from '../types';

interface ChatMessage {
  id: string;
  senderId: 'currentUser' | string; // 'currentUser' or contactId
  senderName: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  attachment?: {
    type: 'image' | 'document';
    name: string;
    size: string;
    url?: string;
  };
  replyTo?: {
    senderName: string;
    text: string;
  };
}

interface Contact {
  id: string;
  name: string;
  role: 'siswa' | 'guru' | 'ai' | 'forum';
  photo: string;
  status: string;
  unreadCount: number;
  class?: string;
  category?: 'pribadi' | 'forum';
}

interface UnifiedChatProps {
  currentUserRole: 'siswa' | 'guru' | 'admin';
  onBack: () => void;
  showModal: (title: string, desc: string, type?: 'info' | 'warning' | 'success') => void;
  initialCategory?: 'pribadi' | 'forum';
  initialContactId?: string;
  teachers?: Teacher[];
  classes?: ClassData[];
  students?: Student[];
}

// Deterministic color assignment for sender names in group discussions (WhatsApp style)
const getSenderColor = (name: string) => {
  const colors = [
    'text-rose-600',
    'text-blue-600',
    'text-emerald-600',
    'text-indigo-600',
    'text-pink-600',
    'text-amber-600',
    'text-teal-600',
    'text-purple-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function UnifiedChat({ 
  currentUserRole, 
  onBack, 
  showModal,
  initialCategory = 'pribadi',
  initialContactId,
  teachers = [],
  classes = [],
  students = []
}: UnifiedChatProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeContactId, setActiveContactId] = useState<string>(
    initialContactId || ''
  );
  const [inputText, setInputText] = useState('');
  const [chatCategory, setChatCategory] = useState<'pribadi' | 'forum'>(initialCategory);
  
  // Admin broadcast and extra states
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'siswa' | 'guru' | 'kelas' | 'program'>('all');
  const [broadcastClass, setBroadcastClass] = useState<string>('');
  const [broadcastProgram, setBroadcastProgram] = useState<'Paket A' | 'Paket B' | 'Paket C'>('Paket A');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  
  // Voice note simulation state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceTimer, setVoiceTimer] = useState(0);
  const voiceTimerIntervalRef = useRef<any>(null);
  
  // Custom states for rich chat features
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; text: string } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize separate conversation histories
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({
    target_semua_siswa: [
      {
        id: 'ts-1',
        senderId: 'currentUser',
        senderName: 'Admin Lulus.id',
        text: 'Pengumuman awal semester genap telah didistribusikan ke seluruh siswa kesetaraan.',
        timestamp: 'Kemarin, 09:00',
        status: 'read'
      }
    ],
    target_semua_guru: [
      {
        id: 'tg-1',
        senderId: 'currentUser',
        senderName: 'Admin Lulus.id',
        text: 'Agenda rapat koordinasi pengunggahan modul ajar kurikulum merdeka telah di-broadcast ke seluruh dewan tutor.',
        timestamp: 'Kemarin, 09:30',
        status: 'read'
      }
    ],
    target_paket_a: [
      {
        id: 'tpa-1',
        senderId: 'currentUser',
        senderName: 'Admin Lulus.id',
        text: 'Selamat belajar untuk siswa program Paket A! Silakan cek menu modul ajar baru.',
        timestamp: 'Kemarin, 10:00',
        status: 'read'
      }
    ],
    target_paket_b: [
      {
        id: 'tpb-1',
        senderId: 'currentUser',
        senderName: 'Admin Lulus.id',
        text: 'Info pengisian berkas ujian modul kesetaraan Paket B.',
        timestamp: 'Kemarin, 10:15',
        status: 'read'
      }
    ],
    target_paket_c: [
      {
        id: 'tpc-1',
        senderId: 'currentUser',
        senderName: 'Admin Lulus.id',
        text: 'Persiapan uji coba ujian nasional kesetaraan mandiri berbasis komputer (UNBK) Paket C.',
        timestamp: 'Kemarin, 11:00',
        status: 'read'
      }
    ],
    ai: [
      {
        id: 'ai-init',
        senderId: 'ai',
        senderName: 'Lulus AI',
        text: currentUserRole === 'guru' 
          ? 'Selamat datang Bu Rina di Lulus AI Guru! Saya adalah asisten kurikulum pribadi Ibu. Saya siap membantu menyusun rencana pembelajaran, modul ajar, bank soal pilihan ganda maupun esai, kuis interaktif, rubrik penilaian, atau rangkuman materi kurikulum merdeka. Ada yang bisa saya bantu hari ini?'
          : 'Halo! Saya Lulus AI, asisten belajarmu di Lulus.id. Ada materi atau tugas pelajaran hari ini yang ingin kita kupas bersama? Tanyakan apa saja, saya siap membantu!',
        timestamp: 'Hari Ini, 08:00',
        status: 'read'
      }
    ],
    fajar: [
      {
        id: 'fj-1',
        senderId: 'fajar',
        senderName: 'Fajar Pratama',
        text: 'Selamat siang Ibu. Terkait tugas Bahasa Indonesia tentang ringkasan teks eksplanasi, apakah boleh diketik menggunakan Google Docs atau wajib ditulis tangan di buku tulis kesetaraan?',
        timestamp: 'Kemarin, 14:15',
        status: 'read'
      },
      {
        id: 'fj-2',
        senderId: 'currentUser',
        senderName: 'Bu Rina, S.Pd.',
        text: 'Selamat siang Fajar. Sangat disarankan diketik rapi lalu dikumpulkan dalam format PDF di LMS ya. Semangat!',
        timestamp: 'Kemarin, 14:30',
        status: 'read'
      },
      {
        id: 'fj-3',
        senderId: 'fajar',
        senderName: 'Fajar Pratama',
        text: 'Ibu, apakah ringkasan materi IPA bab 3 sudah boleh dikumpulkan?',
        timestamp: 'Hari Ini, 14:25',
        status: 'delivered'
      }
    ],
    budi: [
      {
        id: 'bd-1',
        senderId: 'budi',
        senderName: 'Budi Santoso',
        text: 'Ibu, saya mohon izin telat mengumpulkan latihan aljabar hari ini karena harus membantu mengantar barang dagangan orang tua ke pasar.',
        timestamp: '2 hari lalu',
        status: 'read'
      },
      {
        id: 'bd-2',
        senderId: 'currentUser',
        senderName: 'Bu Rina, S.Pd.',
        text: 'Tidak apa-apa Budi, utamakan membantu keluarga dahulu. Namun usahakan diselesaikan sebelum jam 10 malam ya.',
        timestamp: '2 hari lalu',
        status: 'read'
      },
      {
        id: 'bd-3',
        senderId: 'budi',
        senderName: 'Budi Santoso',
        text: 'Baik bu, terima kasih arahannya.',
        timestamp: 'Kemarin, 19:15',
        status: 'read'
      }
    ],
    slamet: [
      {
        id: 'sl-1',
        senderId: 'slamet',
        senderName: 'Pak Slamet (Guru IPA)',
        text: currentUserRole === 'guru'
          ? 'Bu Rina, nanti sore jam 4 kita rapat koordinasi kurikulum di kantor?'
          : 'Halo Fajar, tugas ringkasan IPA bab 3 kamu sudah bapak koreksi dan hasilnya bagus sekali ya.',
        timestamp: 'Hari Ini, 13:10',
        status: 'delivered'
      }
    ],
    rina_guru: [ // Conversation with Bu Rina when user is "Siswa"
      {
        id: 'rn-1',
        senderId: 'rina_guru',
        senderName: 'Bu Rina, S.Pd.',
        text: 'Fajar, jangan lupa tugas menulis ringkasan teks eksplanasi Bahasa Indonesia paling lambat lusa ya.',
        timestamp: 'Kemarin, 10:00',
        status: 'read'
      },
      {
        id: 'rn-2',
        senderId: 'currentUser',
        senderName: 'Fajar Pratama',
        text: 'Siap Bu Rina, sedang saya selesaikan hari ini.',
        timestamp: 'Kemarin, 11:30',
        status: 'read'
      },
      {
        id: 'rn-3',
        senderId: 'rina_guru',
        senderName: 'Bu Rina, S.Pd.',
        text: 'Kerjakan latihan soal di halaman 45 ya, Fajar. Jika ada kendala, tanyakan ke ibu.',
        timestamp: 'Hari Ini, 09:00',
        status: 'read'
      }
    ],
    kartika_guru: [
      {
        id: 'kt-1',
        senderId: 'kartika_guru',
        senderName: 'Ibu Kartika, S.Si.',
        text: 'Halo Fajar, latihan soal deret aritmatika kesetaraan yang kamu tanyakan kemarin sudah benar jalannya. Tinggal ketelitian di bagian perhitungan akhir saja ya.',
        timestamp: 'Kemarin, 16:00',
        status: 'read'
      }
    ],
    bambang_guru: [
      {
        id: 'bb-1',
        senderId: 'bambang_guru',
        senderName: 'Pak Bambang, S.H.',
        text: 'Jangan lupa kumpulkan tugas analisis hak dan kewajiban warga negara di portal tugas sebelum akhir pekan ini ya, Fajar.',
        timestamp: 'Hari Ini, 07:30',
        status: 'read'
      }
    ],
    forum_umum: [
      {
        id: 'fu-1',
        senderId: 'budi',
        senderName: 'Budi Santoso',
        text: 'Teman-teman Paket C, ada yang tahu jadwal ujian kesetaraan semester genap kapan dirilis?',
        timestamp: 'Kemarin, 11:00',
        status: 'read'
      },
      {
        id: 'fu-2',
        senderId: 'rina_guru',
        senderName: 'Bu Rina, S.Pd. (Wali Kelas)',
        text: 'Halo Budi, jadwal resmi akan dirilis akhir bulan ini. Tetap fokus belajar materi modul mandiri dulu ya semuanya.',
        timestamp: 'Kemarin, 11:15',
        status: 'read'
      },
      {
        id: 'fu-3',
        senderId: 'currentUser',
        senderName: currentUserRole === 'guru' ? 'Bu Rina, S.Pd.' : 'Fajar Pratama',
        text: currentUserRole === 'guru' ? 'Dan persiapkan juga berkas kelengkapan rapor portofolio kalian masing-masing.' : 'Baik Bu Rina, terima kasih infonya! Saya sedang mencicil ringkasan materi.',
        timestamp: 'Kemarin, 11:20',
        status: 'read'
      }
    ],
    forum_matematika: [
      {
        id: 'fm-1',
        senderId: 'budi',
        senderName: 'Budi Santoso',
        text: 'Aduh, soal persamaan kuadrat nomor 5 di modul ajar halaman 22 kok susah ya? Ada yang sudah dapat rumusnya?',
        timestamp: 'Hari Ini, 10:15',
        status: 'read'
      },
      {
        id: 'fm-2',
        senderId: 'kartika_guru',
        senderName: 'Ibu Kartika, S.Si. (Guru Matematika)',
        text: 'Budi, untuk nomor 5, coba gunakan rumus kuadratik (rumus abc). Identifikasi dulu nilai a, b, dan c dari persamaan tersebut ya.',
        timestamp: 'Hari Ini, 10:30',
        status: 'read'
      }
    ],
    forum_ipa: [
      {
        id: 'fi-1',
        senderId: 'slamet',
        senderName: 'Pak Slamet, M.Pd. (Guru IPA)',
        text: 'Anak-anak kelas kesetaraan Paket C, silakan tonton video simulasi hukum Newton yang bapak bagikan di portal pustaka, lalu diskusikan di forum ini jika ada konsep yang belum dipahami.',
        timestamp: 'Kemarin, 09:00',
        status: 'read'
      }
    ],
    forum_indonesia: [
      {
        id: 'fn-1',
        senderId: 'rina_guru',
        senderName: 'Bu Rina, S.Pd. (Guru B. Indonesia)',
        text: 'Selamat pagi! Di forum ini kita akan mendiskusikan perbedaan teks eksplanasi dan teks prosedur. Ada yang bisa memberikan satu contoh perbedaan mendasar?',
        timestamp: 'Hari Ini, 08:30',
        status: 'read'
      }
    ]
  });

  // Contacts list - dynamically compiled from props (teachers, classes, students) to ensure synchronization
  const allContacts: Contact[] = React.useMemo(() => {
    const contactsList: Contact[] = [];

    // Always include Lulus AI as a friendly learning companion
    contactsList.push({
      id: 'ai',
      name: 'Lulus AI (Asisten Belajar)',
      role: 'ai',
      photo: '',
      status: 'Online',
      unreadCount: 0,
      category: 'pribadi'
    });

    if (currentUserRole === 'admin') {
      // Admin target channels
      contactsList.push(
        {
          id: 'target_semua_siswa',
          name: '📢 Semua Siswa (Broadcast)',
          role: 'siswa',
          photo: '',
          status: 'Target: Seluruh Siswa Lulus.id',
          unreadCount: 0,
          category: 'pribadi',
          class: 'Distribusi Massal'
        },
        {
          id: 'target_semua_guru',
          name: '📢 Semua Guru (Broadcast)',
          role: 'guru',
          photo: '',
          status: 'Target: Seluruh Guru Lulus.id',
          unreadCount: 0,
          category: 'pribadi',
          class: 'Distribusi Massal'
        },
        {
          id: 'target_paket_a',
          name: '📢 Program Paket A (Broadcast)',
          role: 'siswa',
          photo: '',
          status: 'Target: Siswa Paket A',
          unreadCount: 0,
          category: 'pribadi',
          class: 'Program Paket A'
        },
        {
          id: 'target_paket_b',
          name: '📢 Program Paket B (Broadcast)',
          role: 'siswa',
          photo: '',
          status: 'Target: Siswa Paket B',
          unreadCount: 0,
          category: 'pribadi',
          class: 'Program Paket B'
        },
        {
          id: 'target_paket_c',
          name: '📢 Program Paket C (Broadcast)',
          role: 'siswa',
          photo: '',
          status: 'Target: Siswa Paket C',
          unreadCount: 0,
          category: 'pribadi',
          class: 'Program Paket C'
        }
      );

      // Admins see all students
      if (students && students.length > 0) {
        students.forEach(s => {
          contactsList.push({
            id: s.id,
            name: s.nama,
            role: 'siswa',
            photo: `https://placehold.co/100x100/15803d/ffffff?text=${encodeURIComponent(s.nama.substring(0, 2))}`,
            status: s.status === 'Aktif' ? 'Online' : 'Offline',
            unreadCount: 0,
            class: s.kelas,
            category: 'pribadi'
          });
        });
      } else {
        contactsList.push(
          { id: 'fajar', name: 'Fajar Pratama', role: 'siswa', photo: 'https://placehold.co/100x100/15803d/ffffff?text=Fajar', status: 'Online', unreadCount: 1, class: 'Kelas X - Paket C', category: 'pribadi' },
          { id: 'budi', name: 'Budi Santoso', role: 'siswa', photo: 'https://placehold.co/100x100/1e3a8a/ffffff?text=Budi', status: 'Offline', unreadCount: 0, class: 'Kelas XI - Paket C', category: 'pribadi' }
        );
      }

      // Admins see all teachers too
      if (teachers && teachers.length > 0) {
        teachers.forEach(t => {
          contactsList.push({
            id: t.id,
            name: `${t.nama} (${t.mapel})`,
            role: 'guru',
            photo: `https://placehold.co/100x100/475569/ffffff?text=${encodeURIComponent(t.nama.replace(/^(Bu|Pak)\s+/, '').substring(0, 2))}`,
            status: t.status === 'Aktif' ? 'Online' : 'Offline',
            unreadCount: 0,
            category: 'pribadi'
          });
        });
      } else {
        contactsList.push(
          { id: 'slamet', name: 'Pak Slamet (Guru IPA)', role: 'guru', photo: 'https://placehold.co/100x100/475569/ffffff?text=Slamet', status: 'Online', unreadCount: 1, category: 'pribadi' }
        );
      }
    } else if (currentUserRole === 'guru') {
      // Teachers see students
      if (students && students.length > 0) {
        students.forEach(s => {
          contactsList.push({
            id: s.id,
            name: s.nama,
            role: 'siswa',
            photo: `https://placehold.co/100x100/15803d/ffffff?text=${encodeURIComponent(s.nama.substring(0, 2))}`,
            status: s.status === 'Aktif' ? 'Online' : 'Offline',
            unreadCount: 0,
            class: s.kelas,
            category: 'pribadi'
          });
        });
      } else {
        contactsList.push(
          { id: 'fajar', name: 'Fajar Pratama', role: 'siswa', photo: 'https://placehold.co/100x100/15803d/ffffff?text=Fajar', status: 'Online', unreadCount: 1, class: 'Kelas X - Paket C', category: 'pribadi' },
          { id: 'budi', name: 'Budi Santoso', role: 'siswa', photo: 'https://placehold.co/100x100/1e3a8a/ffffff?text=Budi', status: 'Offline', unreadCount: 0, class: 'Kelas XI - Paket C', category: 'pribadi' }
        );
      }

      // Teachers also see fellow teachers
      if (teachers && teachers.length > 0) {
        teachers.forEach(t => {
          contactsList.push({
            id: t.id,
            name: `${t.nama} (${t.mapel})`,
            role: 'guru',
            photo: `https://placehold.co/100x100/475569/ffffff?text=${encodeURIComponent(t.nama.replace(/^(Bu|Pak)\s+/, '').substring(0, 2))}`,
            status: t.status === 'Aktif' ? 'Online' : 'Offline',
            unreadCount: 0,
            category: 'pribadi'
          });
        });
      } else {
        contactsList.push(
          { id: 'slamet', name: 'Pak Slamet (Guru IPA)', role: 'guru', photo: 'https://placehold.co/100x100/475569/ffffff?text=Slamet', status: 'Online', unreadCount: 1, category: 'pribadi' }
        );
      }
    } else {
      // Students see all teachers
      if (teachers && teachers.length > 0) {
        teachers.forEach(t => {
          contactsList.push({
            id: t.id,
            name: `${t.nama} (${t.mapel})`,
            role: 'guru',
            photo: `https://placehold.co/100x100/db2777/ffffff?text=${encodeURIComponent(t.nama.replace(/^(Bu|Pak)\s+/, '').substring(0, 2))}`,
            status: t.status === 'Aktif' ? 'Online' : 'Offline',
            unreadCount: 0,
            category: 'pribadi'
          });
        });
      } else {
        contactsList.push(
          { id: 'rina_guru', name: 'Bu Rina, S.Pd. (Wali Kelas / B.Indo)', role: 'guru', photo: 'https://placehold.co/100x100/db2777/ffffff?text=Rina', status: 'Online', unreadCount: 0, category: 'pribadi' },
          { id: 'slamet', name: 'Pak Slamet, M.Pd. (Guru IPA)', role: 'guru', photo: 'https://placehold.co/100x100/475569/ffffff?text=Slamet', status: 'Offline', unreadCount: 0, category: 'pribadi' },
          { id: 'kartika_guru', name: 'Ibu Kartika, S.Si. (Guru Matematika)', role: 'guru', photo: 'https://placehold.co/100x100/0ea5e9/ffffff?text=Kartika', status: 'Online', unreadCount: 0, category: 'pribadi' },
          { id: 'bambang_guru', name: 'Pak Bambang, S.H. (Guru PPKn)', role: 'guru', photo: 'https://placehold.co/100x100/64748b/ffffff?text=Bambang', status: 'Offline', unreadCount: 0, category: 'pribadi' }
        );
      }
    }

    // Dynamic classes/forums: Map every ClassData to a learning forum
    if (classes && classes.length > 0) {
      classes.forEach(c => {
        contactsList.push({
          id: `forum_${c.id}`,
          name: `👥 Forum Belajar ${c.nama}`,
          role: 'forum',
          photo: '',
          status: `${c.siswaIds ? c.siswaIds.length : 0} Siswa Terdaftar`,
          unreadCount: 0,
          category: 'forum'
        });
      });
    } else {
      contactsList.push(
        { id: 'forum_umum', name: '👥 Forum Komunitas Umum', role: 'forum', photo: '', status: '15 Siswa Aktif', unreadCount: 0, category: 'forum' },
        { id: 'forum_matematika', name: '📐 Forum Belajar Matematika', role: 'forum', photo: '', status: '8 Siswa Aktif', unreadCount: 0, category: 'forum' },
        { id: 'forum_ipa', name: '🔬 Forum Diskusi Sains & IPA', role: 'forum', photo: '', status: '6 Siswa Aktif', unreadCount: 0, category: 'forum' },
        { id: 'forum_indonesia', name: '✍️ Forum Bahasa Indonesia', role: 'forum', photo: '', status: '10 Siswa Aktif', unreadCount: 0, category: 'forum' }
      );
    }

    return contactsList;
  }, [currentUserRole, teachers, classes, students]);

  // Filtering based on search query with support for multiple fields for admin
  const contacts = allContacts.filter(contact => {
    const term = searchQuery.toLowerCase();
    if (!term) return true;

    // Default search in name
    if (contact.name.toLowerCase().includes(term)) return true;

    // Extra fields search for admin
    if (currentUserRole === 'admin') {
      if (contact.role === 'siswa') {
        const stud = students.find(s => s.id === contact.id);
        if (stud) {
          if (stud.username && stud.username.toLowerCase().includes(term)) return true;
          if (stud.nisn && stud.nisn.toLowerCase().includes(term)) return true;
          if (stud.program && stud.program.toLowerCase().includes(term)) return true;
          if (stud.kelas && stud.kelas.toLowerCase().includes(term)) return true;
        }
      } else if (contact.role === 'guru') {
        const teach = teachers.find(t => t.id === contact.id);
        if (teach) {
          if (teach.username && teach.username.toLowerCase().includes(term)) return true;
          if (teach.nip && teach.nip.toLowerCase().includes(term)) return true;
          if (teach.kelas && teach.kelas.toLowerCase().includes(term)) return true;
        }
      }
    }
    return false;
  });

  const aiContacts = contacts.filter(c => c.role === 'ai' && !c.id.startsWith('target_'));
  const guruContacts = contacts.filter(c => c.role === 'guru' && !c.id.startsWith('target_'));
  const forumContacts = contacts.filter(c => c.role === 'forum' && !c.id.startsWith('target_'));
  const siswaContacts = contacts.filter(c => c.role === 'siswa' && !c.id.startsWith('target_'));
  const adminTargetContacts = contacts.filter(c => c.id.startsWith('target_'));

  const activeContact = allContacts.find(c => c.id === activeContactId) || allContacts[0];
  const activeMessages = conversations[activeContactId] || [];

  // Mark active contact messages as read when switched
  useEffect(() => {
    setConversations(prev => {
      const currentChat = prev[activeContactId] || [];
      const updatedChat = currentChat.map(msg => 
        msg.senderId !== 'currentUser' ? { ...msg, status: 'read' as const } : msg
      );
      return {
        ...prev,
        [activeContactId]: updatedChat
      };
    });
  }, [activeContactId]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeMessages, isTyping, apiLoading]);

  // Handle messages sending
  const handleSendMessage = async (textOveride?: string, attachFile?: any) => {
    const textToSend = textOveride !== undefined ? textOveride : inputText.trim();
    if (!textToSend && !attachFile) return;

    if (textOveride === undefined) {
      setInputText('');
    }
    setReplyingTo(null);

    const timeString = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'currentUser',
      senderName: currentUserRole === 'guru' ? 'Bu Rina, S.Pd.' : 'Fajar Pratama',
      text: textToSend,
      timestamp: `Hari Ini, ${timeString}`,
      status: 'sent',
      replyTo: replyingTo ? { senderName: replyingTo.senderName, text: replyingTo.text } : undefined,
      attachment: attachFile || undefined
    };

    // Update conversation
    setConversations(prev => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), newMsg]
    }));

    // Trigger simulated transitions: sent -> delivered -> read
    setTimeout(() => {
      setConversations(prev => {
        const list = prev[activeContactId] || [];
        return {
          ...prev,
          [activeContactId]: list.map(m => m.id === newMsg.id ? { ...m, status: 'delivered' as const } : m)
        };
      });
    }, 800);

    // Simulated responses
    if (activeContactId === 'ai') {
      // API call to server-side Gemini
      setApiLoading(true);
      try {
        const sysInst = currentUserRole === 'guru' 
          ? 'Kamu adalah Lulus AI Guru, asisten ahli pendamping guru kesetaraan PKBM Lulus.id. Bantu guru merumuskan ATP, Tujuan Pembelajaran, membuat modul pengajaran yang detail, atau bank soal berkualitas tinggi. Berikan format markdown rapi dengan bullet points, tabel, dan contoh konkret.'
          : 'Kamu adalah Lulus AI, asisten belajar suportif untuk siswa PKBM Lulus.id. Berikan bimbingan belajar dengan bahasa yang ramah, sopan, mendalam namun mudah dipahami anak sekolah kesetaraan.';
          
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: textToSend,
            systemInstruction: sysInst,
            history: activeMessages.slice(-8).map(m => ({
              role: m.senderId === 'currentUser' ? 'user' : 'model',
              text: m.text
            }))
          })
        });

        if (!response.ok) throw new Error('API down');
        const data = await response.json();

        // Simulate reading
        setConversations(prev => {
          const list = prev[activeContactId] || [];
          return {
            ...prev,
            [activeContactId]: list.map(m => m.id === newMsg.id ? { ...m, status: 'read' as const } : m)
          };
        });

        setConversations(prev => ({
          ...prev,
          ai: [...(prev.ai || []), {
            id: `ai-${Date.now()}`,
            senderId: 'ai',
            senderName: 'Lulus AI',
            text: data.text,
            timestamp: `Hari Ini, ${timeString}`,
            status: 'read'
          }]
        }));
      } catch (error) {
        // Fallback response if API offline or missing key
        setTimeout(() => {
          setConversations(prev => ({
            ...prev,
            ai: [...(prev.ai || []), {
              id: `ai-err-${Date.now()}`,
              senderId: 'ai',
              senderName: 'Lulus AI',
              text: `Terima kasih atas pertanyaannya! Berhubung server simulasi sedang dibatasi, berikut adalah konsep pembelajaran yang Anda tanyakan mengenai "${textToSend}". Pastikan untuk menyusun silabus sesuai dengan Alur Tujuan Pembelajaran (ATP) Kurikulum Merdeka Fase E.`,
              timestamp: `Hari Ini, ${timeString}`,
              status: 'read'
            }]
          }));
        }, 1500);
      } finally {
        setApiLoading(false);
      }
    } else {
      // Human contact simulator
      setIsTyping(true);
      setTimeout(() => {
        setConversations(prev => {
          const list = prev[activeContactId] || [];
          return {
            ...prev,
            [activeContactId]: list.map(m => m.id === newMsg.id ? { ...m, status: 'read' as const } : m)
          };
        });
      }, 1800);

      setTimeout(() => {
        setIsTyping(false);
        let simulatedReply = "Baik, terima kasih informasinya. Saya akan segera tindak lanjuti.";
        let simulatedSenderId = activeContactId;
        let simulatedSenderName = activeContact.name;

        if (activeContactId === 'fajar') {
          simulatedReply = "Baik Bu Rina, ringkasan IPA bab 3 sudah selesai saya rapikan dalam format PDF. Saya unggah ke LMS sekarang ya bu. Terima kasih bimbingannya!";
        } else if (activeContactId === 'slamet') {
          simulatedReply = currentUserRole === 'guru' 
            ? "Mantap Bu Rina, kita rapat jam 4 sore ya. Jangan lupa bawa draf rekap kriteria ketuntasan tujuan pembelajaran (KKTP)."
            : "Bagus Fajar! Bapak sangat mengapresiasi keaktifan belajarmu. Lanjutkan membaca bab berikutnya ya.";
        } else if (activeContactId === 'rina_guru') {
          simulatedReply = "Bagus Fajar! Ibu bangga dengan keaktifan belajarmu. Kerjakan latihan di halaman 45 itu dengan teliti, jika ada kesulitan segera tanyakan di forum diskusi atau chat langsung ibu.";
        } else if (activeContactId === 'kartika_guru') {
          simulatedReply = "Sama-sama Fajar. Terus berlatih ya, matematika itu asyik jika kita sering melatih logika penyelesaian soal.";
        } else if (activeContactId === 'bambang_guru') {
          simulatedReply = "Bagus sekali Fajar. Tugas PPKn kamu sudah bapak terima dan bapak koreksi. Tetap pertahankan nilaimu!";
        } else if (activeContactId === 'forum_umum') {
          simulatedSenderId = 'budi';
          simulatedSenderName = 'Budi Santoso';
          simulatedReply = "Wah, terima kasih infonya! Senang sekali bisa berdiskusi di forum Lulus.id ini, jadi tambah semangat belajar Paket C.";
        } else if (activeContactId === 'forum_matematika') {
          simulatedSenderId = 'kartika_guru';
          simulatedSenderName = 'Ibu Kartika, S.Si.';
          simulatedReply = "Jawaban yang sangat tepat! Benar sekali penjelasan rumusnya. Budi, silakan dicoba langkah penyelesaian tersebut ya.";
        } else if (activeContactId === 'forum_ipa') {
          simulatedSenderId = 'slamet';
          simulatedSenderName = 'Pak Slamet, M.Pd.';
          simulatedReply = "Penjelasan yang sangat baik! Hukum III Newton memang menerangkan bahwa gaya aksi-reaksi besarnya sama dan arahnya berlawanan.";
        } else if (activeContactId === 'forum_indonesia') {
          simulatedSenderId = 'rina_guru';
          simulatedSenderName = 'Bu Rina, S.Pd.';
          simulatedReply = "Luar biasa! Benar sekali perbedaan mendasarnya. Teks eksplanasi memaparkan hubungan kausalitas kejadian alam/sosial, sedangkan teks prosedur menjelaskan runtutan instruksi teknis.";
        }

        setConversations(prev => ({
          ...prev,
          [activeContactId]: [...(prev[activeContactId] || []), {
            id: `sim-${Date.now()}`,
            senderId: simulatedSenderId,
            senderName: simulatedSenderName,
            text: simulatedReply,
            timestamp: `Hari Ini, ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
            status: 'read'
          }]
        }));
      }, 3500);
    }
  };

  // Voice note recording logic
  const handleStartVoiceRecording = () => {
    setIsRecordingVoice(true);
    setVoiceTimer(0);
    voiceTimerIntervalRef.current = setInterval(() => {
      setVoiceTimer(prev => prev + 1);
    }, 1000);
  };

  const handleCancelVoiceRecording = () => {
    if (voiceTimerIntervalRef.current) {
      clearInterval(voiceTimerIntervalRef.current);
    }
    setIsRecordingVoice(false);
    setVoiceTimer(0);
  };

  const handleFinishVoiceRecording = () => {
    if (voiceTimerIntervalRef.current) {
      clearInterval(voiceTimerIntervalRef.current);
    }
    const totalSeconds = voiceTimer;
    const durationStr = `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
    setIsRecordingVoice(false);
    setVoiceTimer(0);

    // Send simulated voice note as attachment
    const mockAudioAttachment = {
      type: 'audio' as const,
      name: `Voice Note (${durationStr})`,
      size: `${Math.round(totalSeconds * 8.5 || 8.5)} KB`
    };

    handleSendMessage(`Mengirimkan pesan suara: ${mockAudioAttachment.name}`, mockAudioAttachment);
  };

  // Admin Broadcast Sending
  const handleSendBroadcast = () => {
    if (!broadcastMessage.trim()) {
      showModal('Peringatan', 'Pesan siaran tidak boleh kosong.', 'warning');
      return;
    }

    const timeString = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const bId = `broadcast-${Date.now()}`;
    const broadcastMsgObj: ChatMessage = {
      id: bId,
      senderId: 'currentUser',
      senderName: 'Admin Lulus.id',
      text: `📢 BROADCAST RESMI:\n${broadcastMessage}`,
      timestamp: `Hari Ini, ${timeString}`,
      status: 'sent'
    };

    // Update conversations of all matching contacts
    setConversations(prev => {
      const updated = { ...prev };
      const targetIds: string[] = [];

      allContacts.forEach(contact => {
        if (contact.id === 'ai' || contact.id.startsWith('target_')) return;

        let matches = false;
        if (broadcastTarget === 'all') {
          matches = true;
        } else if (broadcastTarget === 'siswa' && contact.role === 'siswa') {
          matches = true;
        } else if (broadcastTarget === 'guru' && contact.role === 'guru') {
          matches = true;
        } else if (broadcastTarget === 'kelas' && contact.role === 'forum' && contact.id.includes(broadcastClass)) {
          matches = true;
        } else if (broadcastTarget === 'program' && contact.role === 'siswa') {
          const stud = students.find(s => s.id === contact.id);
          if (stud && stud.program === broadcastProgram) {
            matches = true;
          }
        }

        if (matches) {
          targetIds.push(contact.id);
        }
      });

      // Append message to target contact IDs
      targetIds.forEach(id => {
        updated[id] = [...(updated[id] || []), { ...broadcastMsgObj, id: `${bId}-${id}` }];
      });

      // Append to the corresponding virtual target channel
      const targetChannelMap: Record<string, string> = {
        siswa: 'target_semua_siswa',
        guru: 'target_semua_guru',
        program: broadcastProgram === 'Paket A' ? 'target_paket_a' : broadcastProgram === 'Paket B' ? 'target_paket_b' : 'target_paket_c'
      };
      const virtualChannelId = targetChannelMap[broadcastTarget] || 'target_semua_siswa';
      updated[virtualChannelId] = [...(updated[virtualChannelId] || []), broadcastMsgObj];

      return updated;
    });

    showModal(
      'Broadcast Berhasil Disiarkan', 
      `Pengumuman massal berhasil dikirimkan kepada ${
        broadcastTarget === 'all' ? 'semua pengguna' : 
        broadcastTarget === 'siswa' ? 'seluruh siswa' : 
        broadcastTarget === 'guru' ? 'seluruh dewan guru' : 
        broadcastTarget === 'kelas' ? `Forum Kelas ${broadcastClass}` : 
        `Siswa Program ${broadcastProgram}`
      }.`, 
      'success'
    );

    // Reset state
    setBroadcastMessage('');
    setShowBroadcastModal(false);
  };

  // Preset emojis helper
  const handleAddEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Preset attachment simulator helper
  const handleSendAttachment = (type: 'image' | 'document') => {
    setShowAttachmentMenu(false);
    const mockFile = type === 'image' 
      ? { type: 'image' as const, name: 'Tugas_Kesetaraan_X_Fajar.jpg', size: '1.4 MB' }
      : { type: 'document' as const, name: 'Modul_Ajar_Fase_E_Merdeka.pdf', size: '2.8 MB' };
    
    handleSendMessage(`Mengirimkan lampiran ${type}: ${mockFile.name}`, mockFile);
  };

  const renderContactRow = (contact: Contact) => {
    const isSelected = contact.id === activeContactId;
    const history = conversations[contact.id] || [];
    const lastMsg = history[history.length - 1];
    
    return (
      <div 
        key={contact.id}
        onClick={() => setActiveContactId(contact.id)}
        className={`px-3 py-3 flex items-center justify-between cursor-pointer transition-all border-b border-slate-100 ${
          isSelected 
            ? 'bg-[#f0f2f5]' 
            : 'bg-white hover:bg-[#f5f6f6]'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          {contact.id.startsWith('target_') ? (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-rose-500/10">
              <Megaphone className="w-4 h-4 text-white" />
            </div>
          ) : contact.role === 'ai' ? (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-purple-500/20">
              <Bot className="w-4 h-4" />
            </div>
          ) : contact.role === 'forum' ? (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00a884] to-[#005c4b] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Globe className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="relative shrink-0">
              <img 
                src={contact.photo} 
                alt={contact.name} 
                className="w-9 h-9 rounded-full object-cover border border-slate-100"
              />
            </div>
          )}
          <div className="overflow-hidden flex-1">
            <div className="flex justify-between items-baseline">
              <h4 className="text-[10.5px] font-bold text-[#111b21] leading-tight truncate">
                {contact.name}
              </h4>
              <span className={`text-[7.5px] font-medium shrink-0 ml-1 ${
                contact.unreadCount > 0 && !isSelected ? 'text-[#00a884] font-bold' : 'text-[#667781]'
              }`}>
                {lastMsg ? lastMsg.timestamp.replace('Hari Ini, ', '') : ''}
              </span>
            </div>
            {contact.class && (
              <p className="text-[7.5px] text-[#00a884] font-bold mt-0.5">{contact.class}</p>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              {lastMsg && lastMsg.senderId === 'currentUser' && (
                <span className="shrink-0 flex items-center">
                  {lastMsg.status === 'read' ? (
                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                  ) : lastMsg.status === 'delivered' ? (
                    <CheckCheck className="w-3.5 h-3.5 text-[#8696a0]" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                  )}
                </span>
              )}
              <p className="text-[8.5px] text-[#667781] truncate font-medium flex-1">
                {lastMsg ? lastMsg.text : 'Mulai chat baru...'}
              </p>
            </div>
          </div>
        </div>

        {contact.unreadCount > 0 && !isSelected && (
          <div className="shrink-0 ml-2 flex items-center justify-center">
            <span className="min-w-[15px] h-[15px] px-1 rounded-full bg-[#25d366] text-white font-extrabold text-[7.5px] flex items-center justify-center">
              {contact.unreadCount}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-50 overflow-hidden z-20 font-sans">
      
      {/* Top Title Header */}
      <div className={`px-4 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm z-10 ${activeContactId ? 'hidden' : 'flex'}`}>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onBack} 
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Lulus.id Komunikasi Terpadu</h3>
            <h2 className="text-sm font-extrabold text-slate-800 leading-tight">Sistem Chatting Internal</h2>
          </div>
        </div>
      </div>

      {/* Main Multi-panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: Chat Threads list */}
        <div className={`w-full border-r border-slate-150 bg-white flex flex-col shrink-0 ${activeContactId ? 'hidden' : 'flex'}`}>
          {/* Thread Search Box */}
          <div className="p-3 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari kontak/pesan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Threads stream scrollable with structured groups */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 no-scrollbar pb-6 bg-slate-50/20">
            {currentUserRole === 'admin' && adminTargetContacts.length > 0 && (
              <div className="flex flex-col">
                <div className="px-3 py-1.5 bg-rose-50/80 text-[7.5px] font-black tracking-wider text-rose-600 uppercase border-y border-rose-100/60 flex items-center gap-1 select-none font-extrabold">
                  <span>📢</span> Saluran Distribusi & Broadcast Admin
                </div>
                <div className="divide-y divide-rose-50">
                  {adminTargetContacts.map(renderContactRow)}
                </div>
              </div>
            )}

            {guruContacts.length > 0 && (
              <div className="flex flex-col">
                <div className="px-3 py-1.5 bg-slate-50/50 text-[7.5px] font-black tracking-wider text-slate-400 uppercase border-y border-slate-100/60 flex items-center gap-1 select-none">
                  <span>👨‍🏫</span> Konsultasi Guru Mata Pelajaran
                </div>
                <div className="divide-y divide-slate-50">
                  {guruContacts.map(renderContactRow)}
                </div>
              </div>
            )}

            {forumContacts.length > 0 && (
              <div className="flex flex-col">
                <div className="px-3 py-1.5 bg-slate-50/50 text-[7.5px] font-black tracking-wider text-emerald-600 uppercase border-y border-slate-100/60 flex items-center gap-1 select-none font-extrabold">
                  <span>👥</span> Forum Diskusi Kelas
                </div>
                <div className="divide-y divide-slate-50">
                  {forumContacts.map(renderContactRow)}
                </div>
              </div>
            )}

            {siswaContacts.length > 0 && (
              <div className="flex flex-col">
                <div className="px-3 py-1.5 bg-slate-50/50 text-[7.5px] font-black tracking-wider text-slate-400 uppercase border-y border-slate-100/60 flex items-center gap-1 select-none">
                  <span>🧑‍🎓</span> Chat Siswa / Konseling
                </div>
                <div className="divide-y divide-slate-50">
                  {siswaContacts.map(renderContactRow)}
                </div>
              </div>
            )}
            
            {contacts.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <User className="w-8 h-8 mx-auto text-slate-200 mb-1.5" />
                <p className="text-[10px] font-bold">Kontak tidak ditemukan</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Chat box conversation */}
        <div className={`w-full flex flex-col bg-[#efeae2] overflow-hidden relative ${activeContactId ? 'flex' : 'hidden'}`}>
          {activeContactId ? (
            <>
              {/* Active Chat Header */}
              <div className="px-4 py-2.5 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between shrink-0 select-none z-10">
                <div className="flex items-center gap-3">
                  {/* Back button for mobile & desktop views */}
                  <button 
                    onClick={() => setActiveContactId('')} 
                    className="p-1.5 -ml-1.5 mr-0.5 hover:bg-slate-200/80 rounded-full text-slate-600 transition-colors cursor-pointer"
                    title="Kembali ke daftar kontak"
                  >
                    <ArrowLeft className="w-4.5 h-4.5" />
                  </button>
                  {activeContact.id.startsWith('target_') ? (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-md">
                      <Megaphone className="w-4.5 h-4.5 text-white" />
                    </div>
                  ) : activeContact.role === 'ai' ? (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                      <Bot className="w-4.5 h-4.5 animate-spin-slow" />
                    </div>
                  ) : activeContact.role === 'forum' ? (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00a884] to-[#005c4b] flex items-center justify-center text-white shrink-0 shadow-sm">
                      <Globe className="w-4.5 h-4.5 text-white" />
                    </div>
                  ) : (
                    <img 
                      src={activeContact.photo} 
                      alt={activeContact.name} 
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                  )}
                  <div>
                    <h3 className="text-[11.5px] font-black text-slate-800 leading-tight flex items-center gap-1.5">
                      {activeContact.name}
                      {activeContact.role === 'forum' && <span className="text-[6.5px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 font-extrabold rounded-full uppercase tracking-wider">GRUP</span>}
                      {activeContact.id.startsWith('target_') && <span className="text-[6.5px] px-1.5 py-0.5 bg-rose-100 text-rose-700 font-extrabold rounded-full uppercase tracking-wider">BROADCAST</span>}
                    </h3>
                  </div>
                </div>

            {/* Quick Action Buttons for Search */}
            <div className="flex items-center gap-4 text-slate-600">
              <button 
                onClick={() => showModal('Cari Pesan', 'Cari kata kunci dalam riwayat obrolan ini secara cepat.', 'info')}
                className="p-1 hover:bg-slate-200 rounded-full cursor-pointer transition-colors"
                title="Cari obrolan"
              >
                <Search className="w-4 h-4" />
              </button>
              <button 
                onClick={() => showModal('Opsi Obrolan', 'Anda dapat menyematkan obrolan, membisukan notifikasi forum, atau menghapus riwayat obrolan lokal ini.', 'info')}
                className="p-1 hover:bg-slate-200 rounded-full cursor-pointer transition-colors"
                title="Opsi obrolan"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Scrollbox with iconic WhatsApp doodle wallpaper */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar" 
            ref={scrollRef}
            style={{
              backgroundColor: '#efeae2',
              backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
              backgroundRepeat: 'repeat',
              backgroundSize: '360px',
              backgroundBlendMode: 'overlay',
              opacity: 0.98,
            }}
          >
            {activeMessages.map((msg) => {
              const isMe = msg.senderId === 'currentUser';
              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  {/* Sender Name header only for group style */}
                  {!isMe && activeContact.role === 'forum' && (
                    <span className={`text-[7.5px] font-extrabold mb-0.5 px-1 bg-white/70 rounded px-1.5 py-0.5 backdrop-blur-xs select-none ${getSenderColor(msg.senderName)}`}>
                      {msg.senderName}
                    </span>
                  )}
                  
                  {/* Message Bubble Container */}
                  <div className={`p-2.5 rounded-xl text-[9.5px] leading-relaxed relative group shadow-xs ${
                    isMe 
                      ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none' 
                      : 'bg-white text-[#111b21] rounded-tl-none'
                  }`}>
                    
                    {/* Quoted Reply reference block */}
                    {msg.replyTo && (
                      <div className={`p-2 rounded-lg mb-2 text-[8px] border-l-4 font-semibold ${
                        isMe 
                          ? 'bg-[#cbf1c4] border-[#00a884] text-slate-700' 
                          : 'bg-slate-100 border-slate-400 text-slate-600'
                      }`}>
                        <p className="text-[7.5px] font-black opacity-80">Membalas {msg.replyTo.senderName}:</p>
                        <p className="truncate mt-0.5 italic">"{msg.replyTo.text}"</p>
                      </div>
                    )}

                    {/* Image Attachment Rendering */}
                    {msg.attachment?.type === 'image' && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 max-w-[200px]">
                        <img 
                          src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300&auto=format&fit=crop&q=60" 
                          alt="Lampiran Gambar" 
                          className="w-full h-24 object-cover"
                        />
                        <div className="p-1.5 bg-white text-slate-800 text-[8px] font-bold truncate flex justify-between">
                          <span>{msg.attachment.name}</span>
                          <span className="text-slate-400 shrink-0">{msg.attachment.size}</span>
                        </div>
                      </div>
                    )}

                    {/* PDF/Doc Attachment Rendering */}
                    {msg.attachment?.type === 'document' && (
                      <div className={`p-2 rounded-lg mb-2 flex items-center gap-2 border text-[8px] font-bold ${
                        isMe ? 'bg-[#cbf1c4]/60 border-[#a3e498]' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                        <div className="overflow-hidden">
                          <p className="truncate text-slate-800">{msg.attachment.name}</p>
                          <p className="text-[7px] text-slate-400 mt-0.5">{msg.attachment.size}</p>
                        </div>
                      </div>
                    )}

                    {/* Audio Voice Note Rendering */}
                    {msg.attachment?.type === 'audio' && (
                      <div className={`p-2 rounded-xl mb-2 flex items-center gap-3 border text-[8.5px] font-bold ${
                        isMe ? 'bg-[#cbf1c4]/60 border-[#a3e498]' : 'bg-slate-50 border-slate-200'
                      } min-w-[200px]`}>
                        <button
                          onClick={() => {
                            showModal('Simulasi Memutar Suara', 'Memutar rekaman voice note... (Simulasi visual)', 'info');
                          }}
                          className="w-8 h-8 rounded-full bg-[#00a884] hover:bg-[#008f72] text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[7.5px] text-slate-700 font-extrabold">Pesan Suara</span>
                            <span className="text-[6.5px] text-slate-400 font-medium">({msg.attachment.size})</span>
                          </div>
                          {/* Simulated waveform visualization */}
                          <div className="flex items-center gap-0.5 h-4 mt-1">
                            {[2, 4, 3, 5, 2, 6, 8, 4, 3, 5, 4, 6, 8, 5, 3, 4, 2, 3].map((val, idx) => (
                              <div
                                key={idx}
                                className={`w-0.5 rounded-full ${isMe ? 'bg-[#00a884]/60' : 'bg-[#667781]/60'}`}
                                style={{ height: `${val * 1.8}px` }}
                              ></div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Core Text Body */}
                    <div className="whitespace-pre-wrap pr-10">{msg.text}</div>

                    {/* Timestamp & Status checks aligned bottom right inside the bubble */}
                    <div className="absolute bottom-1 right-2 flex items-center gap-0.5 select-none">
                      <span className="text-[6.5px] font-medium text-[#667781]">{msg.timestamp.replace('Hari Ini, ', '')}</span>
                      {isMe && (
                        <span className="flex items-center shrink-0">
                          {msg.status === 'sent' && <Check className="w-3 h-3 text-[#8696a0]" />}
                          {msg.status === 'delivered' && <CheckCheck className="w-3 h-3 text-[#8696a0]" />}
                          {msg.status === 'read' && <CheckCheck className="w-3 h-3 text-[#53bdeb]" />}
                        </span>
                      )}
                    </div>

                    {/* Quick action: hover to Reply */}
                    <button 
                      onClick={() => setReplyingTo({ id: msg.id, senderName: msg.senderName, text: msg.text })}
                      className={`absolute top-1/2 -translate-y-1/2 p-1 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer ${
                        isMe ? 'left-[-28px]' : 'right-[-28px]'
                      }`}
                    >
                      <CornerUpLeft className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Typing indicators */}
            {isTyping && (
              <div className="flex flex-col items-start max-w-[70%]">
                <span className="text-[7.5px] font-extrabold text-slate-500 mb-0.5 px-1">{activeContact.name}</span>
                <div className="bg-white p-2.5 rounded-xl rounded-tl-none flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-150"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-300"></span>
                </div>
                <span className="text-[7.5px] text-emerald-600 font-bold mt-1 px-1">sedang mengetik...</span>
              </div>
            )}

            {/* AI loading indicator */}
            {apiLoading && (
              <div className="flex flex-col items-start max-w-[80%]">
                <span className="text-[7.5px] font-extrabold text-slate-500 mb-0.5 px-1">Lulus AI Guru</span>
                <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl rounded-tl-none flex items-center gap-2 shadow-sm text-emerald-850 font-bold text-[8.5px]">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Lulus AI sedang memformulasikan modul pembelajaran terbaik...</span>
                </div>
              </div>
            )}
          </div>

          {/* Replying quote bar preview */}
          {replyingTo && (
            <div className="bg-[#f0f2f5] px-4 py-2 border-t border-[#e9edef] flex justify-between items-center text-[8.5px] font-semibold text-slate-600 select-none animate-slide-up shrink-0">
              <div className="border-l-4 border-[#00a884] pl-2">
                <p className="font-bold">Membalas <span className="text-[#00a884]">{replyingTo.senderName}</span></p>
                <p className="truncate text-slate-500 italic">"{replyingTo.text}"</p>
              </div>
              <button 
                onClick={() => setReplyingTo(null)} 
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 font-black"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick interactive attachment and emoji overlays */}
          <div className="relative shrink-0">
            {/* Emojis list box */}
            {showEmojiPicker && (
              <div className="absolute bottom-14 left-4 bg-white p-2 rounded-xl border border-slate-200 shadow-xl flex gap-1 z-40 select-none animate-fade-in">
                {['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥', '📝', '📚', '💡', '✅'].map(em => (
                  <button 
                    key={em} 
                    onClick={() => handleAddEmoji(em)}
                    className="text-sm p-1.5 hover:bg-[#f0f2f5] rounded-lg transition-transform hover:scale-110 cursor-pointer"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}

            {/* Attachment options box */}
            {showAttachmentMenu && (
              <div className="absolute bottom-14 left-10 bg-white rounded-xl border border-slate-150 shadow-xl overflow-hidden z-40 w-40 select-none animate-fade-in text-[10px] font-bold text-slate-700">
                <button 
                  onClick={() => handleSendAttachment('image')}
                  className="w-full p-2.5 hover:bg-[#f0f2f5] flex items-center gap-2.5 cursor-pointer border-b border-[#e9edef]"
                >
                  <Image className="w-4 h-4 text-emerald-500" /> Kirim Gambar
                </button>
                <button 
                  onClick={() => handleSendAttachment('document')}
                  className="w-full p-2.5 hover:bg-[#f0f2f5] flex items-center gap-2.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-blue-500" /> Kirim PDF/Dokumen
                </button>
              </div>
            )}
          </div>

          {/* Bottom Chat Inputs bar */}
          <div className="p-3 bg-[#f0f2f5] border-t border-[#e9edef] flex items-center gap-2.5 shrink-0 z-10">
            <button 
              onClick={() => {
                if (isRecordingVoice) return;
                setShowEmojiPicker(prev => !prev);
                setShowAttachmentMenu(false);
              }}
              disabled={isRecordingVoice}
              className={`p-2 hover:bg-slate-200/80 rounded-full text-slate-600 transition-all shrink-0 cursor-pointer ${showEmojiPicker ? 'bg-slate-200 text-slate-800' : ''} ${isRecordingVoice ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Smile className="w-5 h-5" />
            </button>

            <button 
              onClick={() => {
                if (isRecordingVoice) return;
                setShowAttachmentMenu(prev => !prev);
                setShowEmojiPicker(false);
              }}
              disabled={isRecordingVoice}
              className={`p-2 hover:bg-slate-200/80 rounded-full text-slate-600 transition-all shrink-0 cursor-pointer ${showAttachmentMenu ? 'bg-slate-200 text-slate-800' : ''} ${isRecordingVoice ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Plus className="w-5 h-5" />
            </button>
            
            {isRecordingVoice ? (
              <div className="flex-1 bg-white rounded-lg flex items-center justify-between px-3 py-1.5 border border-rose-400 animate-pulse select-none">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping shrink-0"></span>
                  <span className="text-[9px] font-black text-rose-600 uppercase tracking-wider">MEREKAM VOICE NOTE...</span>
                  <span className="text-[10px] font-mono font-black text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {Math.floor(voiceTimer / 60).toString().padStart(2, '0')}:{(voiceTimer % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelVoiceRecording}
                    className="px-2.5 py-1 text-[8.5px] font-black text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors uppercase"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleFinishVoiceRecording}
                    className="px-2.5 py-1 text-[8.5px] font-black bg-[#00a884] hover:bg-[#008f72] text-white rounded-lg cursor-pointer transition-colors uppercase"
                  >
                    Selesai & Kirim
                  </button>
                </div>
              </div>
            ) : (
              <input 
                type="text" 
                placeholder="Tulis pesan Anda..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                className="flex-1 px-4 py-2 bg-white rounded-lg text-[10.5px] font-semibold text-slate-800 placeholder-slate-500 focus:outline-none shadow-xs border border-transparent focus:border-[#00a884] transition-all"
              />
            )}

            {inputText.trim() === '' && !isRecordingVoice ? (
              <button 
                onClick={handleStartVoiceRecording}
                className="p-2 hover:bg-slate-200/80 rounded-full text-slate-600 transition-all shrink-0 cursor-pointer"
                title="Rekam Voice Note"
              >
                <Mic className="w-5 h-5 text-[#8696a0] hover:text-slate-600" />
              </button>
            ) : !isRecordingVoice ? (
              <button 
                onClick={() => handleSendMessage()}
                className="p-2.5 bg-[#00a884] hover:bg-[#008f72] rounded-full text-white shadow-md cursor-pointer transition-colors shrink-0 flex items-center justify-center w-9 h-9"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : null}
          </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#f8f9fa] text-center p-8 select-none border-l border-slate-150">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-[#00a884] mb-4 shadow-xs">
                <MessageSquare className="w-7 h-7 text-[#00a884]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">WhatsApp Web Lulus.id</h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-4">
                Kirim dan terima pesan diskusi tanpa kendala. Pilih kontak atau forum diskusi di sebelah kiri untuk memulai obrolan.
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#25d366]"></span> Sistem Komunikasi PKBM Terintegrasi
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Admin Broadcast Modal */}
      {showBroadcastModal && (
        <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85%] animate-fade-in">
            {/* Header */}
            <div className="bg-rose-600 px-4 py-3 text-white flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-white" />
                <span className="text-[10px] font-black tracking-wider uppercase">SIARAN PENGUMUMAN MASSAL</span>
              </div>
              <button 
                onClick={() => setShowBroadcastModal(false)}
                className="text-white hover:text-rose-100 text-[10px] font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4 text-slate-800 text-[10px] font-bold">
              <div>
                <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-black mb-1.5">Target Penerima</label>
                <select
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 font-bold"
                >
                  <option value="all">Semua Pengguna Lulus.id (Siswa & Guru)</option>
                  <option value="siswa">Semua Siswa Aktif</option>
                  <option value="guru">Semua Dewan Tutor / Guru</option>
                  <option value="kelas">Kelas Tertentu</option>
                  <option value="program">Program Tertentu (Paket A/B/C)</option>
                </select>
              </div>

              {/* Conditional Class Selector */}
              {broadcastTarget === 'kelas' && (
                <div className="animate-fade-in">
                  <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-black mb-1.5">Pilih Kelas</label>
                  <select
                    value={broadcastClass}
                    onChange={(e) => setBroadcastClass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 font-bold"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>
              )}

              {/* Conditional Program Selector */}
              {broadcastTarget === 'program' && (
                <div className="animate-fade-in">
                  <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-black mb-1.5">Pilih Program</label>
                  <select
                    value={broadcastProgram}
                    onChange={(e) => setBroadcastProgram(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 font-bold"
                  >
                    <option value="Paket A">Program Paket A (SD Kesetaraan)</option>
                    <option value="Paket B">Program Paket B (SMP Kesetaraan)</option>
                    <option value="Paket C">Program Paket C (SMA Kesetaraan)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-black mb-1.5">Isi Pengumuman</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Ketik draf pengumuman resmi yang akan didistribusikan secara massal..."
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 font-bold text-slate-800 placeholder-slate-400"
                ></textarea>
                <p className="text-[7.5px] text-slate-400 mt-1.5 font-semibold leading-relaxed">
                  Catatan: Pesan siaran ini akan didistribusikan langsung ke riwayat chat setiap penerima secara resmi dari Admin, serta terekam di saluran distribusi admin.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => {
                  setShowBroadcastModal(false);
                  setBroadcastMessage('');
                }}
                className="px-3 py-1.5 text-slate-500 hover:text-slate-700 font-black text-[8.5px] uppercase cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSendBroadcast}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[8.5px] uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-rose-500/15 cursor-pointer transition-colors"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Kirim Siaran</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
