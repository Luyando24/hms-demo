'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  KeyRound, 
  Loader2, 
  AlertCircle, 
  ArrowRight,
  HeartPulse,
  Unplug,
  Maximize2
} from 'lucide-react';
import { verifyTvBroadcastCode, checkTvCodeStatus } from './actions';
import QueueDisplayPage from '@/app/hospital/queue-display/page';

const TV_STORAGE_KEY = 'tv_broadcast_code';
const TV_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 10; // 10 years in seconds

function getStoredTvCode(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Try LocalStorage
  try {
    const local = localStorage.getItem(TV_STORAGE_KEY);
    if (local && local.trim()) return local.trim().toUpperCase();
  } catch {
    // LocalStorage restricted or unavailable in TV browser
  }

  // 2. Fallback to Cookie
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${TV_STORAGE_KEY}=([^;]*)`));
    if (match && match[1]) {
      return decodeURIComponent(match[1]).trim().toUpperCase();
    }
  } catch {
    // Cookie read failed
  }

  return null;
}

function persistTvCode(code: string) {
  if (typeof window === 'undefined') return;

  const clean = code.trim().toUpperCase();
  try {
    localStorage.setItem(TV_STORAGE_KEY, clean);
  } catch {}

  try {
    document.cookie = `${TV_STORAGE_KEY}=${encodeURIComponent(clean)}; Path=/; Max-Age=${TV_COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {}
}

function clearPersistedTvCode() {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(TV_STORAGE_KEY);
  } catch {}

  try {
    document.cookie = `${TV_STORAGE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {}
}

function TvPageContent() {
  const searchParams = useSearchParams();
  const urlCode = searchParams.get('code');

  const [inputCode, setInputCode] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tvName, setTvName] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Monitor Fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const requestFullscreenMode = () => {
    if (typeof window !== 'undefined' && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Browser user gesture policy fallback
      });
    }
  };

  const performVerification = useCallback(async (codeToVerify: string, isAutoConnect = false) => {
    setVerifying(true);
    setErrorMsg(null);

    try {
      const res = await verifyTvBroadcastCode(codeToVerify);

      if (res.valid && res.code) {
        setIsConnected(true);
        setTvName(res.name || 'Smart TV Display');
        setActiveCode(res.code);
        persistTvCode(res.code);

        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        setIsConnected(false);
        setActiveCode(null);
        setTvName(null);
        clearPersistedTvCode();
        setErrorMsg(res.message || 'Invalid or revoked TV connection code.');
      }
    } catch {
      if (isAutoConnect) {
        setErrorMsg('Network error connecting to TV broadcast. Retrying...');
      } else {
        setErrorMsg('Network error while connecting. Please try again.');
      }
    } finally {
      setVerifying(false);
      setIsInitializing(false);
    }
  }, []);

  // Auto-restore session from permanent cookie/storage OR auto-connect from URL ?code=...
  useEffect(() => {
    const initSession = async () => {
      // 1. Direct URL query param takes priority if present
      if (urlCode) {
        let formatted = urlCode.trim().toUpperCase();
        if (!formatted.startsWith('TV-') && /^\d+$/.test(formatted)) {
          formatted = `TV-${formatted}`;
        }
        setInputCode(formatted);
        await performVerification(formatted, true);
        return;
      }

      // 2. Otherwise restore permanent session from Cookie / LocalStorage
      const savedCode = getStoredTvCode();
      if (savedCode) {
        setInputCode(savedCode);
        await performVerification(savedCode, true);
        return;
      }

      // 3. No stored code: proceed to code entry screen
      setIsInitializing(false);
    };

    void initSession();
  }, [urlCode, performVerification]);

  // Periodic revocation heartbeat while connected (checks every 30 seconds)
  // If an administrator revokes the code, the TV immediately disconnects and clears credentials
  useEffect(() => {
    if (!isConnected || !activeCode) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const check = await checkTvCodeStatus(activeCode);
        if (!isMounted) return;

        if (!check.valid) {
          // Administrator manually revoked the code!
          clearPersistedTvCode();
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
          setIsConnected(false);
          setActiveCode(null);
          setTvName(null);
          setErrorMsg(check.message || 'This TV connection code was manually revoked by an Administrator.');
        } else if (check.name && check.name !== tvName) {
          setTvName(check.name);
        }
      } catch {
        // Transient network blip: do not disconnect TV on brief network timeout
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isConnected, activeCode, tvName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    // Immediately trigger fullscreen on form submit gesture
    requestFullscreenMode();

    let codeToVerify = inputCode.trim().toUpperCase();
    if (!codeToVerify.startsWith('TV-') && /^\d+$/.test(codeToVerify)) {
      codeToVerify = `TV-${codeToVerify}`;
    }

    await performVerification(codeToVerify);
  };

  const handleDisconnect = () => {
    clearPersistedTvCode();
    if (typeof window !== 'undefined' && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    setIsConnected(false);
    setActiveCode(null);
    setTvName(null);
    setInputCode('');
    setErrorMsg(null);
  };

  // State 0: Initializing / Auto-reconnecting on boot or refresh
  if (isInitializing) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 font-sans text-slate-100 select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/30 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center space-y-4 text-center">
          <div className="rounded-3xl bg-brand-600 p-4 text-white shadow-xl shadow-brand-500/20 border border-brand-400/30">
            <HeartPulse size={44} strokeWidth={2.5} className="animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-brand-400 font-bold text-base">
            <Loader2 className="animate-spin" size={20} />
            <span>Connecting to TV Broadcast...</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Restoring permanent display session</p>
        </div>
      </main>
    );
  }

  // State A: Connected to TV Broadcast -> Render Full Queue Display
  if (isConnected && activeCode) {
    return (
      <div className="relative min-h-screen bg-slate-50 overflow-hidden">
        {/* Top Connection & Fullscreen Bar (Hidden when in Fullscreen) */}
        {!isFullscreen && (
          <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs font-semibold shadow-md animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span>Broadcasting: <strong>{tvName}</strong></span>
              <span className="ml-2 font-mono text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                {activeCode}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={requestFullscreenMode}
                className="flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-xl font-bold transition-all shadow-md shadow-brand-600/30"
              >
                <Maximize2 size={14} />
                <span>Enter Fullscreen</span>
              </button>

              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 text-[11px] bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-200 border border-slate-700 px-2.5 py-1.5 rounded-xl transition-colors"
                title="Disconnect this TV display"
              >
                <Unplug size={13} />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        )}

        <QueueDisplayPage />
      </div>
    );
  }

  // State B: Always First Screen on TV - Enter Activation Code Form
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 font-sans text-slate-100 select-none">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/30 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative z-10 w-full max-w-[480px] text-center space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-3xl bg-brand-600 p-4 text-white shadow-xl shadow-brand-500/20 border border-brand-400/30">
            <HeartPulse size={44} strokeWidth={2.5} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-400">
              OPD Waiting Room Broadcast
            </p>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Connect Smart TV
            </h1>
            <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">
              Enter the unique activation code provided by your Hospital Administrator.
            </p>
          </div>
        </div>

        {/* Pairing Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
          {errorMsg && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300 text-left animate-in fade-in">
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="text-xs font-medium leading-relaxed">
                <p className="font-bold text-rose-200">Connection Failed</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="tv-code" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300 text-left">
                TV Activation Code
              </label>
              <div className="relative">
                <KeyRound size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="tv-code"
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TV-849201"
                  required
                  maxLength={12}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-4 pl-12 pr-4 text-center font-mono text-2xl font-black tracking-widest text-white outline-none transition-all placeholder:text-slate-600 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={verifying || !inputCode.trim()}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 text-base font-bold text-white transition-all hover:bg-brand-500 hover:shadow-xl hover:shadow-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-brand-600/30"
            >
              {verifying ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Connecting TV...</span>
                </>
              ) : (
                <>
                  <span>Activate TV Fullscreen</span>
                  <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          Need a connection code? Contact your Hospital Administrator.
        </p>
      </div>
    </main>
  );
}

export default function TvPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <Loader2 className="animate-spin text-brand-400" size={36} />
        </main>
      }
    >
      <TvPageContent />
    </Suspense>
  );
}
