'use client';

import React, { useState } from 'react';
import { WifiOff, Wifi, RefreshCw, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import clsx from 'clsx';

export function OfflineProtectionBanner() {
  const { isOnline, wasOffline, checkConnection } = useNetworkStatus();
  const [isChecking, setIsChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleRetry = async () => {
    setIsChecking(true);
    await checkConnection();
    setTimeout(() => setIsChecking(false), 500);
  };

  // If online and wasn't recently offline, or dismissed, render nothing
  if (isOnline && !wasOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] animate-in slide-in-from-top duration-300 pointer-events-none">
      <div className="max-w-4xl mx-auto p-2 sm:p-3 pointer-events-auto">
        {!isOnline ? (
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-2xl border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <WifiOff size={20} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-white">
                    Offline Mode Active
                  </h4>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={11} /> Auto-Saving Locally
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Internet connection is interrupted. Form inputs and clinical notes are preserved on this device. Do not close or refresh this tab.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleRetry}
                disabled={isChecking}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 active:scale-98 disabled:opacity-50"
              >
                <RefreshCw size={13} className={clsx(isChecking && 'animate-spin')} />
                {isChecking ? 'Checking...' : 'Check Connection'}
              </button>
            </div>
          </div>
        ) : wasOffline ? (
          <div className="bg-emerald-950/90 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-emerald-500/40 flex items-center justify-between gap-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Wifi size={18} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-emerald-300">
                  Internet Connection Restored
                </h4>
                <p className="text-[11px] text-slate-300">
                  Your network is back online. You can now safely submit forms and sync records.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
