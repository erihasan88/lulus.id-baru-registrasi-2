import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, RefreshCw, Wifi, WifiOff, X, Sparkles, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAManager() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showNetworkAlert, setShowNetworkAlert] = useState<boolean>(false);
  const [networkAlertType, setNetworkAlertType] = useState<'online' | 'offline'>('online');
  
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);
  
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // 1. Monitor Online/Offline Events
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkAlertType('online');
      setShowNetworkAlert(true);
      // Auto-hide online alert after 3 seconds
      setTimeout(() => {
        setShowNetworkAlert(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkAlertType('offline');
      setShowNetworkAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Intercept Custom Install Prompt (beforeinstallprompt)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Only show install prompt banner if not already standalone
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
      if (!isStandalone) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen to when the app is successfully installed
    const handleAppInstalled = () => {
      console.log('Lulus.id PWA was installed successfully!');
      setIsAppInstalled(true);
      setShowInstallBanner(false);
      setInstallPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 3. Register Service Worker with Clean Cache Update Lifecycles
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          setSwRegistration(reg);
          console.log('[PWA] Service Worker registered with scope:', reg.scope);

          // Check for updates on register
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, notify the user!
                  setUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err);
        });

      // Handle immediate reloading when controller changes (SKIP_WAITING completes)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // Clean up listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger Native PWA installation
  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Show native prompt
    await installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await installPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
      setIsAppInstalled(true);
      setShowInstallBanner(false);
    } else {
      console.log('[PWA] User dismissed the install prompt');
    }
    setInstallPrompt(null);
  };

  // Skip waiting and update Service Worker cache instantly
  const handleUpdateClick = () => {
    if (swRegistration && swRegistration.waiting) {
      // Send skip waiting message to service worker
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Fallback reload
      window.location.reload();
    }
  };

  return (
    <>
      {/* 1. NETWORK ALERTS (Online/Offline) */}
      <AnimatePresence>
        {showNetworkAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 z-[9999] max-w-sm rounded-2xl p-4 shadow-xl border flex items-center gap-3.5 ${
              networkAlertType === 'offline' 
                ? 'bg-rose-50 border-rose-200 text-rose-800' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              networkAlertType === 'offline' ? 'bg-rose-100 border-rose-300' : 'bg-emerald-100 border-emerald-300'
            }`}>
              {networkAlertType === 'offline' ? (
                <WifiOff className="w-5 h-5 text-rose-600 animate-pulse" />
              ) : (
                <Wifi className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div className="flex-1 space-y-0.5">
              <h4 className="text-xs font-extrabold tracking-tight">
                {networkAlertType === 'offline' ? 'Koneksi Terputus' : 'Koneksi Terhubung'}
              </h4>
              <p className="text-[10px] font-semibold text-slate-500">
                {networkAlertType === 'offline' 
                  ? 'Anda sedang dalam mode offline. Anda masih dapat mengakses data yang tersimpan.' 
                  : 'Koneksi internet Anda telah kembali. Semua data sinkron secara realtime.'}
              </p>
            </div>
            <button 
              onClick={() => setShowNetworkAlert(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. UPDATE AVAILABLE BANNER */}
      <AnimatePresence>
        {updateAvailable && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-[9999] max-w-md bg-slate-900 text-white rounded-3xl p-5 shadow-2xl border border-slate-800 flex flex-col gap-3.5"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-pink-500/20">
                <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black tracking-tight flex items-center gap-1.5 text-white">
                  Versi Baru Tersedia! <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                </h4>
                <p className="text-[10.5px] font-medium text-slate-300 leading-relaxed">
                  Lulus.id V2 diperbarui ke versi terbaru untuk performa dan keamanan terbaik. Perbarui sekarang untuk menerapkan pembaruan.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setUpdateAvailable(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black tracking-wide transition-all cursor-pointer"
              >
                Nanti
              </button>
              <button 
                onClick={handleUpdateClick}
                className="px-4 py-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-xl text-[10px] font-black tracking-wide shadow-md shadow-pink-600/10 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Perbarui Sekarang
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. INSTALLATION BANNER */}
      <AnimatePresence>
        {showInstallBanner && installPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 md:left-4 md:right-auto z-[9990] max-w-sm bg-white rounded-3xl p-4.5 shadow-2xl border border-slate-150 flex flex-col gap-3"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Pasang Lulus.id App</h4>
                  <p className="text-[9px] font-bold text-slate-400">Dapatkan akses instan di layar utama Anda</p>
                </div>
              </div>
              <button 
                onClick={() => setShowInstallBanner(false)}
                className="p-1 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[9.5px] font-semibold text-slate-500 leading-relaxed">
              Nikmati kenyamanan belajar PKBM di HP dan Laptop dengan mode fullscreen, loading cepat, dan offline yang andal.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowInstallBanner(false)}
                className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black transition-all cursor-pointer"
              >
                Abaikan
              </button>
              <button 
                onClick={handleInstallClick}
                className="flex-1 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-[9px] font-black transition-all shadow-md shadow-pink-500/10 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" /> Pasang Sekarang
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. OFFLINE OVERLAY WATERMARK IN THE FOOTER / SCREEN CORNER WHEN OFFLINE */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-[9980] bg-rose-600 text-white px-3 py-1.5 rounded-full text-[8.5px] font-extrabold uppercase tracking-widest shadow-lg flex items-center gap-1.5 animate-bounce">
          <WifiOff className="w-3.5 h-3.5" /> Mode Offline
        </div>
      )}
    </>
  );
}
