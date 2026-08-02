import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Loader2,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  User,
  Users
} from 'lucide-react';
import { api } from '../lib/api';
import { Teacher, ClassData, Student } from '../types';

type Role = 'admin' | 'guru' | 'siswa';

interface ChatContact {
  user_id: number;
  username: string;
  nama: string;
  role: Role;
  mapels?: string[];
  kelas_list?: string[];
  program?: string;
  kelas?: string;
  status?: string;
}

interface ChatParticipant {
  id: string;
  user_id: number;
  username: string;
  nama: string;
  role: Role;
  last_read_at?: string | null;
  joined_at: string;
}

interface ChatMessage {
  id: string;
  conversation: string;
  sender_id: number;
  sender_name: string;
  sender_role: Role;
  text: string;
  reply_to?: string | null;
  is_deleted: boolean;
  created_at: string;
}

interface ChatConversation {
  id: string;
  conversation_type: 'PRIVATE' | 'BROADCAST';
  title: string;
  participants: ChatParticipant[];
  last_message?: ChatMessage | null;
  unread_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UnifiedChatProps {
  currentUserRole: Role;
  onBack: () => void;
  showModal: (
    title: string,
    desc: string,
    type?: 'info' | 'warning' | 'success'
  ) => void;
  initialCategory?: 'pribadi' | 'forum';
  initialContactId?: string;
  teachers?: Teacher[];
  classes?: ClassData[];
  students?: Student[];
}

const getStoredUserId = (): number | null => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;

    const user = JSON.parse(raw);
    const id = Number(user?.id);

    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
};

const formatTime = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function UnifiedChat({
  currentUserRole,
  onBack,
  showModal
}: UnifiedChatProps) {
  const currentUserId = useMemo(getStoredUserId, []);

  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [selectedContact, setSelectedContact] =
    useState<ChatContact | null>(null);

  const [activeConversation, setActiveConversation] =
    useState<ChatConversation | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');

  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTarget, setBroadcastTarget] =
    useState<'all' | 'siswa' | 'guru'>('all');
  const [broadcastText, setBroadcastText] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadBaseData = async () => {
    setLoadingContacts(true);

    try {
      const [contactData, conversationData] = await Promise.all([
        api.getChatContacts(),
        api.getChatConversations()
      ]);

      setContacts(Array.isArray(contactData) ? contactData : []);
      setConversations(
        Array.isArray(conversationData) ? conversationData : []
      );
    } catch (error) {
      console.error('Gagal memuat Chat:', error);
      showModal(
        'Chat Tidak Tersedia',
        'Data percakapan belum dapat dimuat. Silakan coba kembali.',
        'warning'
      );
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  const findPrivateConversation = (
    contactUserId: number
  ): ChatConversation | null => {
    return conversations.find(conversation =>
      conversation.conversation_type === 'PRIVATE' &&
      conversation.participants.some(
        participant => participant.user_id === contactUserId
      )
    ) || null;
  };

  const loadMessages = async (conversation: ChatConversation) => {
    setLoadingMessages(true);

    try {
      const data = await api.getChatMessages(conversation.id, 50);
      setMessages(Array.isArray(data) ? data : []);

      await api.markChatRead(conversation.id);

      setConversations(previous =>
        previous.map(item =>
          item.id === conversation.id
            ? { ...item, unread_count: 0 }
            : item
        )
      );
    } catch (error) {
      console.error('Gagal memuat pesan:', error);
      showModal(
        'Pesan Tidak Tersedia',
        'Riwayat pesan belum dapat dimuat.',
        'warning'
      );
    } finally {
      setLoadingMessages(false);
    }
  };

  const openContact = async (contact: ChatContact) => {
    setSelectedContact(contact);

    const existing = findPrivateConversation(contact.user_id);

    setActiveConversation(existing);
    setMessages([]);

    if (existing) {
      await loadMessages(existing);
    }
  };

  const openBroadcastConversation = async (
    conversation: ChatConversation
  ) => {
    setSelectedContact(null);
    setActiveConversation(conversation);
    setMessages([]);

    await loadMessages(conversation);
  };

  const ensureConversation = async (): Promise<ChatConversation | null> => {
    if (activeConversation) {
      return activeConversation;
    }

    if (!selectedContact) {
      return null;
    }

    try {
      const created = await api.createChatConversation(
        selectedContact.user_id,
        selectedContact.nama
      );

      const conversation = created as ChatConversation;

      setActiveConversation(conversation);

      setConversations(previous => [
        conversation,
        ...previous.filter(item => item.id !== conversation.id)
      ]);

      return conversation;
    } catch (error) {
      console.error('Gagal membuat percakapan:', error);

      showModal(
        'Percakapan Gagal Dibuat',
        'Akun tujuan belum dapat dihubungi.',
        'warning'
      );

      return null;
    }
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();

    if (!text || sending) {
      return;
    }

    if (activeConversation?.conversation_type === 'BROADCAST') {
      return;
    }

    const conversation = await ensureConversation();

    if (!conversation) {
      return;
    }

    setSending(true);
    setInputText('');

    try {
      const created = await api.sendChatMessage(
        conversation.id,
        text
      );

      const newMessage = created as ChatMessage;

      setMessages(previous => [...previous, newMessage]);

      setConversations(previous => {
        const updated = previous.map(item =>
          item.id === conversation.id
            ? {
                ...item,
                last_message: newMessage,
                updated_at: newMessage.created_at
              }
            : item
        );

        return updated.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime()
        );
      });
    } catch (error) {
      console.error('Gagal mengirim pesan:', error);

      setInputText(text);

      showModal(
        'Pesan Gagal Dikirim',
        'Periksa koneksi lalu coba kembali.',
        'warning'
      );
    } finally {
      setSending(false);
    }
  };

  const handleBroadcast = async () => {
    const text = broadcastText.trim();

    if (!text || sendingBroadcast) {
      showModal(
        'Pesan Kosong',
        'Isi pesan broadcast terlebih dahulu.',
        'warning'
      );

      return;
    }

    setSendingBroadcast(true);

    try {
      const result = await api.sendChatBroadcast(
        broadcastTarget,
        text
      );

      const recipientCount = result?.recipient_count || 0;

      setBroadcastText('');
      setShowBroadcast(false);

      await loadBaseData();

      showModal(
        'Broadcast Terkirim',
        `Pesan berhasil dikirim kepada ${recipientCount} pengguna.`,
        'success'
      );
    } catch (error) {
      console.error('Gagal mengirim broadcast:', error);

      showModal(
        'Broadcast Gagal',
        'Pesan broadcast belum dapat dikirim.',
        'warning'
      );
    } finally {
      setSendingBroadcast(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages]);

  useEffect(() => {
    if (!activeConversation) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const data = await api.getChatMessages(
          activeConversation.id,
          50
        );

        if (Array.isArray(data)) {
          setMessages(data);
          await api.markChatRead(activeConversation.id);
        }
      } catch {
        // Polling gagal tidak mengganggu pengguna.
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [activeConversation?.id]);

  const filteredContacts = contacts.filter(contact => {
    const query = searchQuery.toLowerCase();

    return (
      contact.nama.toLowerCase().includes(query) ||
      contact.username.toLowerCase().includes(query) ||
      contact.role.toLowerCase().includes(query) ||
      (contact.program || '').toLowerCase().includes(query)
    );
  });

  const broadcastConversations = conversations.filter(
    item => item.conversation_type === 'BROADCAST'
  );

  const activeTitle =
    activeConversation?.conversation_type === 'BROADCAST'
      ? activeConversation.title
      : selectedContact?.nama || 'Pilih kontak';;

  return (
    <div className="h-full bg-white rounded-2xl border border-slate-200 overflow-hidden flex">
      <aside
        className={`w-full md:w-[340px] border-r border-slate-200 flex-col ${
          selectedContact || activeConversation
            ? 'hidden md:flex'
            : 'flex'
        }`}
      >
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <h2 className="text-sm font-black text-slate-900">
                Chat Lulus.id
              </h2>

              <p className="text-[10px] text-slate-500">
                Pesan Admin, Guru, dan Siswa
              </p>
            </div>

            <button
              onClick={loadBaseData}
              className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
              title="Muat ulang"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {currentUserRole === 'admin' && (
            <button
              onClick={() => setShowBroadcast(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer hover:bg-rose-700"
            >
              <Megaphone className="w-4 h-4" />
              Kirim Broadcast
            </button>
          )}

          <div className="mt-3 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />

            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Cari kontak..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 text-xs outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingContacts ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              {broadcastConversations.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-[10px] font-black uppercase text-slate-400">
                    Pengumuman
                  </div>

                  {broadcastConversations.map(conversation => (
                    <button
                      key={conversation.id}
                      onClick={() =>
                        openBroadcastConversation(conversation)
                      }
                      className={`w-full p-3 flex items-center gap-3 text-left border-b border-slate-100 cursor-pointer ${
                        activeConversation?.id === conversation.id
                          ? 'bg-rose-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                        <Megaphone className="w-4 h-4 text-rose-600" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">
                          {conversation.title}
                        </p>

                        <p className="text-[10px] text-slate-500 truncate">
                          {conversation.last_message?.text || 'Pengumuman'}
                        </p>
                      </div>

                      {conversation.unread_count > 0 && (
                        <span className="min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center">
                          {conversation.unread_count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 py-2 text-[10px] font-black uppercase text-slate-400">
                Kontak
              </div>

              {filteredContacts.length === 0 ? (
                <div className="p-6 text-center">
                  <Users className="w-8 h-8 mx-auto text-slate-300" />

                  <p className="mt-2 text-xs text-slate-500">
                    Belum ada kontak yang tersedia.
                  </p>
                </div>
              ) : (
                filteredContacts.map(contact => {
                  const conversation =
                    findPrivateConversation(contact.user_id);

                  return (
                    <button
                      key={contact.user_id}
                      onClick={() => openContact(contact)}
                      className={`w-full p-3 flex items-center gap-3 text-left border-b border-slate-100 cursor-pointer ${
                        selectedContact?.user_id === contact.user_id
                          ? 'bg-emerald-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">
                          {contact.nama}
                        </p>

                        <p className="text-[10px] text-slate-500 truncate">
                          {contact.role === 'guru'
                            ? `Guru${
                                contact.mapels?.length
                                  ? ` • ${contact.mapels.join(', ')}`
                                  : ''
                              }`
                            : contact.role === 'siswa'
                              ? `Siswa${
                                  contact.program
                                    ? ` • ${contact.program}`
                                    : ''
                                }`
                              : 'Admin'}
                        </p>
                      </div>

                      {(conversation?.unread_count || 0) > 0 && (
                        <span className="min-w-5 h-5 px-1 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center">
                          {conversation?.unread_count}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </>
          )}
        </div>
      </aside>

      <main
        className={`flex-1 flex-col min-w-0 ${
          selectedContact || activeConversation
            ? 'flex'
            : 'hidden md:flex'
        }`}
      >
        {!selectedContact && !activeConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <MessageSquare className="w-12 h-12 text-slate-300" />

            <h3 className="mt-3 text-sm font-black text-slate-700">
              Pilih kontak
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Pilih Admin, Guru, atau Siswa untuk mulai mengirim pesan.
            </p>
          </div>
        ) : (
          <>
            <div className="h-16 px-4 md:px-5 border-b border-slate-200 flex items-center">
              <button
                onClick={() => {
                  setSelectedContact(null);
                  setActiveConversation(null);
                  setMessages([]);
                }}
                className="md:hidden mr-2 p-2 rounded-xl hover:bg-slate-100"
                title="Kembali ke kontak"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                {activeConversation?.conversation_type === 'BROADCAST' ? (
                  <Megaphone className="w-4 h-4 text-rose-600" />
                ) : (
                  <User className="w-4 h-4 text-slate-500" />
                )}
              </div>

              <div className="ml-3 min-w-0">
                <h3 className="text-sm font-black truncate">
                  {activeTitle}
                </h3>

                <p className="text-[10px] text-slate-500">
                  {activeConversation?.conversation_type === 'BROADCAST'
                    ? 'Pengumuman resmi Admin'
                    : selectedContact?.role || ''}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-5 space-y-3">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Belum ada pesan. Mulai percakapan sekarang.
                </div>
              ) : (
                messages.map(message => {
                  const mine =
                    currentUserId !== null &&
                    message.sender_id === currentUserId;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        mine ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                          mine
                            ? 'bg-emerald-600 text-white rounded-br-md'
                            : 'bg-white text-slate-800 rounded-bl-md'
                        }`}
                      >
                        {!mine && (
                          <p className="text-[10px] font-black mb-1">
                            {message.sender_name}
                          </p>
                        )}

                        <p className="text-xs whitespace-pre-wrap break-words">
                          {message.text}
                        </p>

                        <p
                          className={`mt-1 text-right text-[9px] ${
                            mine ? 'text-emerald-100' : 'text-slate-400'
                          }`}
                        >
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={bottomRef} />
            </div>

            {activeConversation?.conversation_type === 'BROADCAST' ? (
              <div className="p-4 border-t border-slate-200 text-center text-xs text-slate-500">
                Broadcast hanya dapat dibaca dan tidak dapat dibalas.
              </div>
            ) : (
              <div className="p-4 border-t border-slate-200 flex items-end gap-2">
                <textarea
                  value={inputText}
                  onChange={event => setInputText(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  maxLength={4000}
                  rows={1}
                  placeholder="Tulis pesan..."
                  className="flex-1 min-h-11 max-h-28 resize-none rounded-xl bg-slate-100 px-4 py-3 text-xs outline-none"
                />

                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || sending}
                  className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center disabled:opacity-50 cursor-pointer"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {showBroadcast && currentUserRole === 'admin' && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-rose-600" />

              <h3 className="text-sm font-black">
                Kirim Broadcast
              </h3>
            </div>

            <label className="block mt-4 text-xs font-bold">
              Tujuan
            </label>

            <select
              value={broadcastTarget}
              onChange={event =>
                setBroadcastTarget(
                  event.target.value as 'all' | 'siswa' | 'guru'
                )
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs"
            >
              <option value="all">Semua Guru dan Siswa</option>
              <option value="siswa">Semua Siswa</option>
              <option value="guru">Semua Guru</option>
            </select>

            <label className="block mt-4 text-xs font-bold">
              Pesan
            </label>

            <textarea
              value={broadcastText}
              onChange={event => setBroadcastText(event.target.value)}
              maxLength={4000}
              rows={6}
              placeholder="Tulis pengumuman resmi..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-xs resize-none"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowBroadcast(false)}
                disabled={sendingBroadcast}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>

              <button
                onClick={handleBroadcast}
                disabled={!broadcastText.trim() || sendingBroadcast}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {sendingBroadcast && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}

                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
