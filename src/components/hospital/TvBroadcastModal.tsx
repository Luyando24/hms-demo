'use client';

import { useState, useEffect } from 'react';
import { 
  Tv, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  X, 
  Loader2, 
  Radio, 
  Monitor, 
  ShieldCheck,
  AlertCircle,
  Link2
} from 'lucide-react';
import { 
  generateTvBroadcastCode, 
  revokeTvBroadcastCode, 
  getTvBroadcastCodes, 
  type TvCodeItem 
} from '@/app/tv/actions';

interface TvBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TvBroadcastModal({ isOpen, onClose }: TvBroadcastModalProps) {
  const [tvName, setTvName] = useState('OPD Main Waiting Room TV');
  const [codes, setCodes] = useState<TvCodeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedTvUrl, setCopiedTvUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCodes = async () => {
    setLoading(true);
    const result = await getTvBroadcastCodes();
    if (result.ok && result.data) {
      setCodes(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      void fetchCodes();
      setActiveCode(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeCodesList = codes.filter((c) => c.is_active);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);

    const res = await generateTvBroadcastCode(tvName);
    if (res.ok && res.data) {
      setActiveCode(res.data.code);
      void fetchCodes();
    } else {
      setError(res.error || 'Failed to generate TV broadcast code.');
    }
    setGenerating(false);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this TV connection code? Any TV using this code will be disconnected.')) {
      return;
    }
    const res = await revokeTvBroadcastCode(id);
    if (res.ok) {
      void fetchCodes();
    } else {
      alert(res.error || 'Failed to revoke code.');
    }
  };

  const copyCodeToClipboard = async (codeStr: string) => {
    try {
      await navigator.clipboard.writeText(codeStr);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const copyTvLinkToClipboard = async () => {
    try {
      const cleanTvUrl = typeof window !== 'undefined' ? `${window.location.origin}/tv` : 'https://staff.kundahealthcare.org/tv';
      await navigator.clipboard.writeText(cleanTvUrl);
      setCopiedTvUrl(true);
      setTimeout(() => setCopiedTvUrl(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-500/20">
              <Tv size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Smart TV Queue Broadcast
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border border-amber-200">
                  Admin Only
                </span>
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Generate 6-character activation codes to pair Smart TVs & waiting room monitors.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyTvLinkToClipboard}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-200 shrink-0"
              title="Copy TV display page URL without code"
            >
              {copiedTvUrl ? <Check size={14} className="text-emerald-600" /> : <Link2 size={14} className="text-brand-600" />}
              <span>{copiedTvUrl ? 'TV Link Copied!' : 'Copy TV Link'}</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form to Generate New Code */}
          <form onSubmit={handleGenerate} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus size={16} className="text-brand-600" />
                Generate New Activation Code
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">Valid until revoked</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={tvName}
                  onChange={(e) => setTvName(e.target.value)}
                  placeholder="e.g. Main Reception TV 1"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-all shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 disabled:opacity-70 shrink-0"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Radio size={16} />}
                <span>Generate TV Code</span>
              </button>
            </div>
          </form>

          {/* Newly Generated Code Spotlight */}
          {activeCode && (
            <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-500/50 space-y-4 animate-in fade-in text-center">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5 mx-auto">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  TV Activation Code Generated
                </span>
              </div>

              {/* Unique Activation Code Display */}
              <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm max-w-sm mx-auto space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Enter This Code On Smart TV Screen
                </span>
                <div className="text-4xl font-black font-mono text-emerald-950 tracking-wider">
                  {activeCode}
                </div>
                <button
                  type="button"
                  onClick={() => copyCodeToClipboard(activeCode)}
                  className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                >
                  {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedCode ? 'Activation Code Copied!' : 'Copy Activation Code'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Paired TV Devices Table (Revoked items filtered out) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Active TV Activation Codes ({activeCodesList.length})</span>
              {loading && <Loader2 size={14} className="animate-spin text-slate-400" />}
            </h3>

            {activeCodesList.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-1">
                <Monitor size={28} className="mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No Active TV Activation Codes</p>
                <p className="text-[11px] text-slate-400">Use the form above to generate a 6-digit code for your Smart TV.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                {activeCodesList.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-600">
                        <Monitor size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                          <span className="font-mono text-xs font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                            {item.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>Created {new Date(item.created_at).toLocaleDateString()}</span>
                          {item.last_connected_at && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-medium">Last active {new Date(item.last_connected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => copyCodeToClipboard(item.code)}
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors text-xs font-semibold flex items-center gap-1"
                        title="Copy Activation Code"
                      >
                        <Copy size={15} />
                        <span>Copy Code</span>
                      </button>
                      <button
                        onClick={() => handleRevoke(item.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
                        title="Revoke TV Code"
                      >
                        <Trash2 size={15} />
                        <span className="hidden sm:inline">Revoke</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 p-4 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
