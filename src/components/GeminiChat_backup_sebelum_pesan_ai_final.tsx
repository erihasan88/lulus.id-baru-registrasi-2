import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Settings, Sparkles, AlertTriangle, ArrowLeft } from 'lucide-react';
import { ChatMessage, Role } from '../types';

interface GeminiChatProps {
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onBack: () => void;
  explainTextRequest?: string | null;
  onClearExplainRequest?: () => void;
  showModal: (title: string, desc: string, type?: 'info' | 'warning' | 'success') => void;
  title?: string;
  placeholder?: string;
  currentUserRole?: Role;
}

export default function GeminiChat({ 
  chatHistory, 
  setChatHistory, 
  onBack, 
  explainTextRequest, 
  onClearExplainRequest,
  showModal,
  title = 'Lulus AI',
  placeholder = 'Tanya rumus, materi, atau tugas kesetaraan...',
  currentUserRole
}: GeminiChatProps) {
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [customKey, setCustomApiKey] = useState<string>(() => localStorage.getItem('lulus_custom_gemini_key') || '');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle direct URL / hash queries for role based config access protection
  useEffect(() => {
    const checkDirectUrlAccess = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const hasConfigQuery = params.has('api_config') || params.has('config') || params.get('tab') === 'config' || params.has('showConfig') || params.has('api-config');
      const hasConfigHash = hash.toLowerCase().includes('config') || hash.toLowerCase().includes('api_config') || hash.toLowerCase().includes('api-config');

      if (hasConfigQuery || hasConfigHash) {
        if (currentUserRole === 'siswa') {
          // Block student directly
          showModal('Akses Ditolak', 'Siswa tidak memiliki izin untuk mengakses menu Lulus AI API Config.', 'warning');
          
          // Clear query parameters & hash to restore safety
          if (hasConfigQuery) {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
          }
          if (hasConfigHash) {
            window.location.hash = '';
          }
          setShowConfig(false);
        } else {
          // Open config for Teacher/Admin automatically if targeted by URL/hash
          setShowConfig(true);
        }
      }
    };

    checkDirectUrlAccess();
    window.addEventListener('hashchange', checkDirectUrlAccess);
    return () => window.removeEventListener('hashchange', checkDirectUrlAccess);
  }, [currentUserRole, showModal]);

  // Force showConfig to false if student
  useEffect(() => {
    if (currentUserRole === 'siswa') {
      setShowConfig(false);
    }
  }, [currentUserRole]);

  // Automatically scroll to bottom when chat updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, loading]);

  // Handle triggered simplified material requests
  useEffect(() => {
    if (explainTextRequest) {
      setInput('');
      handleSendMessage(explainTextRequest);
      if (onClearExplainRequest) {
        onClearExplainRequest();
      }
    }
  }, [explainTextRequest]);

  const handleSendMessage = async (textToSend: string) => {
    const messageText = textToSend || input.trim();
    if (!messageText) return;

    if (!textToSend) {
      setInput('');
    }

    // Add user message to state
    const updatedHistory = [...chatHistory, { role: 'user' as const, text: messageText }];
    setChatHistory(updatedHistory);
    setLoading(true);

    try {
      // Check if custom user API Key is saved
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: messageText,
          history: chatHistory.slice(-10) // Only send recent context to avoid token issues
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error('Lulus AI sedang tidak tersedia. Silakan coba kembali nanti.');
      }

      const data = await response.json();
      
      setChatHistory(prev => [
        ...prev, 
        { role: 'model', text: data.text }
      ]);
    } catch (error: any) {
      console.error('Gemini error:', error);
      setChatHistory(prev => [
        ...prev,
        { 
          role: 'model', 
          text: `Maaf, terjadi kendala saat menghubungi Lulus AI. Hubungi admin atau atur API Key Anda di setelan. Detail: ${error.message}`,
          isError: true 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    localStorage.setItem('lulus_custom_gemini_key', customKey);
    showModal('Setelan Disimpan', 'Simulasi API Key lokal diperbarui.', 'success');
    setShowConfig(false);
  };

  const formatText = (text: string) => {
    // Basic text transformations to render clean inline markdown equivalent
    return text.split('\n').map((line, index) => {
      let content = line;
      // Bold syntax
      content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Bullets
      if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
        return (
          <li key={index} className="ml-4 list-disc text-xs text-slate-100 mt-1 leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: content.substring(1).trim() }} />
          </li>
        );
      }
      return (
        <p key={index} className="text-xs text-slate-100 mt-1 leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: content }} />
      );
    });
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-900 overflow-hidden z-10 font-sans">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white shrink-0 select-none">
        <button onClick={onBack} className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-extrabold text-purple-400 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" /> {title}
        </h2>
        {currentUserRole !== 'siswa' ? (
          <button onClick={() => setShowConfig(!showConfig)} className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-300">
            <Settings className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-8 h-8" />
        )}
      </div>

      {/* Floating Setelan Key Config Drawer */}
      {showConfig && (
        <div className="bg-slate-950 border-b border-slate-800 p-4 space-y-2 text-slate-100 z-20 animate-fade-in shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Lulus AI API Config</span>
            <span className="text-[9px] text-slate-400">Pengujian Mandiri</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="password" 
              placeholder="Gunakan API Key pribadi..." 
              value={customKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 text-xs px-3 py-2 rounded-xl text-white focus:outline-none focus:border-purple-500"
            />
            <button 
              onClick={handleSaveConfig}
              className="px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors"
            >
              Simpan
            </button>
          </div>
          <p className="text-[8px] text-slate-400 leading-normal">
            Kosongkan input untuk mengandalkan GEMINI_API_KEY yang aman di server-side Cloud Run.
          </p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {chatHistory.map((msg, i) => (
          <div 
            key={i} 
            className={`flex gap-2 max-w-[85%] items-start ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-purple-500/20">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div className={`p-3 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-purple-600 text-white rounded-tr-none text-right' 
                : msg.isError 
                  ? 'bg-slate-800 border border-red-500/30 text-red-300 rounded-tl-none'
                  : 'bg-slate-800 text-slate-100 rounded-tl-none'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-xs break-words leading-relaxed">{msg.text}</p>
              ) : (
                <div className="space-y-1">
                  {formatText(msg.text)}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-center text-xs text-slate-400 bg-slate-900/50 p-2 rounded-xl w-fit">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
            <span>Lulus AI sedang berpikir...</span>
          </div>
        )}
      </div>

      {/* Input Form Footer */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2 shrink-0">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage('')}
          placeholder={placeholder}
          className="flex-1 bg-slate-800 text-white placeholder-slate-500 border border-slate-700 text-xs px-4 py-2.5 rounded-full focus:outline-none focus:border-purple-500"
        />
        <button 
          onClick={() => handleSendMessage('')}
          className="w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-md shadow-purple-500/10 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
