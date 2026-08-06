'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BellRing, 
  X, 
  ArrowRight, 
  Clock, 
  Users, 
  FlaskConical, 
  Pill, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { playChime, isVoiceEnabled, setVoiceEnabled } from '@/utils/voiceNotification';
import clsx from 'clsx';

export interface PendingActionItem {
  id: string;
  type: 'QUEUE' | 'LAB' | 'PRESCRIPTION' | 'RADIOLOGY' | 'EMERGENCY';
  title: string;
  patientName: string;
  patientFileNo?: string;
  detail: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  targetPath: string;
  timestamp: string;
}

export default function StaffPendingActionPopup() {
  const [activeAction, setActiveAction] = useState<PendingActionItem | null>(null);
  const [totalPendingCount, setTotalPendingCount] = useState<number>(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [isVoiceOn, setIsVoiceOn] = useState<boolean>(true);

  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const lastActionIdRef = useRef<string | null>(null);

  // Sync voice preference
  useEffect(() => {
    setIsVoiceOn(isVoiceEnabled());
  }, []);

  // Fetch pending action items across system tables
  const checkForPendingActions = async () => {
    try {
      // Check if snoozed
      if (snoozedUntil && Date.now() < snoozedUntil) {
        return;
      }

      let actions: PendingActionItem[] = [];

      // 1. Check Walk-in OPD Queue (WAITING status)
      const { data: queueData, count: queueCount } = await supabase
        .from('walkin_queue')
        .select('*, patients(first_name, last_name, file_number), departments(name), rooms(name)', { count: 'exact' })
        .eq('status', 'WAITING')
        .order('created_at', { ascending: false })
        .limit(3);

      if (queueData && queueData.length > 0) {
        queueData.forEach((q: any) => {
          const pName = q.patients ? `${q.patients.first_name} ${q.patients.last_name}` : 'Walk-in Patient';
          actions.push({
            id: `queue-${q.id}`,
            type: 'QUEUE',
            title: 'New Patient Waiting',
            patientName: pName,
            patientFileNo: q.patients?.file_number || q.token_number || undefined,
            detail: `Checked in for ${q.departments?.name || 'OPD'} ${q.rooms?.name ? `(${q.rooms.name})` : ''}`,
            priority: q.priority === 'URGENT' ? 'URGENT' : q.priority === 'HIGH' ? 'HIGH' : 'NORMAL',
            targetPath: '/hospital/reception',
            timestamp: q.created_at || new Date().toISOString(),
          });
        });
      }

      // 2. Check Pending Lab Orders
      const { data: labData, count: labCount } = await supabase
        .from('lab_orders')
        .select('*, patients(first_name, last_name, file_number)', { count: 'exact' })
        .in('status', ['PENDING', 'REQUESTED'])
        .order('created_at', { ascending: false })
        .limit(3);

      if (labData && labData.length > 0) {
        labData.forEach((l: any) => {
          const pName = l.patients ? `${l.patients.first_name} ${l.patients.last_name}` : 'Patient';
          actions.push({
            id: `lab-${l.id}`,
            type: 'LAB',
            title: 'Pending Lab Order',
            patientName: pName,
            patientFileNo: l.patients?.file_number || undefined,
            detail: 'New laboratory test requested by doctor',
            priority: l.priority === 'URGENT' ? 'URGENT' : 'NORMAL',
            targetPath: '/hospital/laboratory',
            timestamp: l.created_at || new Date().toISOString(),
          });
        });
      }

      // 3. Check Pending Prescriptions
      const { data: rxData, count: rxCount } = await supabase
        .from('prescriptions')
        .select('*, patients(first_name, last_name, file_number)', { count: 'exact' })
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(3);

      if (rxData && rxData.length > 0) {
        rxData.forEach((rx: any) => {
          const pName = rx.patients ? `${rx.patients.first_name} ${rx.patients.last_name}` : 'Patient';
          actions.push({
            id: `rx-${rx.id}`,
            type: 'PRESCRIPTION',
            title: 'Prescription To Dispense',
            patientName: pName,
            patientFileNo: rx.patients?.file_number || undefined,
            detail: 'Medication order awaiting pharmacy dispensing',
            priority: 'NORMAL',
            targetPath: '/hospital/inventory',
            timestamp: rx.created_at || new Date().toISOString(),
          });
        });
      }

      const totalCount = (queueCount || 0) + (labCount || 0) + (rxCount || 0);
      setTotalPendingCount(totalCount);

      // Filter out dismissed items
      const undismissed = actions.filter(a => !dismissedIds.has(a.id));

      if (undismissed.length > 0) {
        const topAction = undismissed[0];
        
        // If this is a newly arrived action item, trigger alert voice & popup
        if (topAction.id !== lastActionIdRef.current) {
          lastActionIdRef.current = topAction.id;
          setActiveAction(topAction);

          playChime(topAction.priority === 'URGENT' ? 'warning' : 'info');
        }
      } else {
        setActiveAction(null);
      }
    } catch (err) {
      console.error('Error checking pending staff actions:', err);
    }
  };

  useEffect(() => {
    void checkForPendingActions();

    // Subscribe to real-time events on walkin_queue, lab_orders, prescriptions
    const channel = supabase
      .channel('staff-pending-actions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walkin_queue' }, () => {
        void checkForPendingActions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_orders' }, () => {
        void checkForPendingActions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, () => {
        void checkForPendingActions();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [dismissedIds, snoozedUntil]);

  const handleDismiss = () => {
    if (activeAction) {
      setDismissedIds(prev => new Set(prev).add(activeAction.id));
      setActiveAction(null);
    }
  };

  const handleSnooze = (minutes: number = 5) => {
    const snoozeEnd = Date.now() + minutes * 60 * 1000;
    setSnoozedUntil(snoozeEnd);
    setActiveAction(null);
  };

  const handleTakeAction = () => {
    if (activeAction) {
      setDismissedIds(prev => new Set(prev).add(activeAction.id));
      const target = activeAction.targetPath;
      setActiveAction(null);
      router.push(target);
    }
  };

  const toggleVoice = () => {
    const nextState = !isVoiceOn;
    setVoiceEnabled(nextState);
    setIsVoiceOn(nextState);
  };

  // Do not show popup if no active action or currently on queue-display screen
  if (!activeAction || pathname?.startsWith('/hospital/queue-display')) {
    return null;
  }

  const getTypeIcon = (type: PendingActionItem['type']) => {
    switch (type) {
      case 'LAB':
        return <FlaskConical className="text-purple-600" size={20} />;
      case 'PRESCRIPTION':
        return <Pill className="text-amber-600" size={20} />;
      case 'QUEUE':
        return <Users className="text-emerald-600" size={20} />;
      default:
        return <BellRing className="text-brand-600" size={20} />;
    }
  };

  const getTypeBadgeClass = (type: PendingActionItem['type']) => {
    switch (type) {
      case 'LAB':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PRESCRIPTION':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'QUEUE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-brand-100 text-brand-800 border-brand-200';
    }
  };

  return (
    <div className="fixed top-20 right-4 lg:right-8 z-[110] max-w-md w-full px-2 sm:px-0 pointer-events-none">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 lg:p-6 shadow-2xl border-2 border-slate-200/90 animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto relative overflow-hidden select-none">
        
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-brand-100/60 to-emerald-100/40 rounded-full -mr-16 -mt-16 -z-10 blur-xl" />

        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2.5 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              {getTypeIcon(activeAction.type)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={clsx("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", getTypeBadgeClass(activeAction.type))}>
                  {activeAction.type} ACTION
                </span>
                {activeAction.priority === 'URGENT' && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                    URGENT
                  </span>
                )}
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 truncate mt-0.5">
                {activeAction.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Audio Toggle */}
            <button
              onClick={toggleVoice}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title={isVoiceOn ? "Mute Voice Alerts" : "Enable Voice Alerts"}
            >
              {isVoiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            {/* Close / Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              title="Dismiss Popup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action Item Body Card */}
        <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-base font-extrabold text-slate-900 truncate uppercase">
              {activeAction.patientName}
            </h4>
            {activeAction.patientFileNo && (
              <span className="text-xs font-mono font-bold text-slate-500 shrink-0">
                {activeAction.patientFileNo}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            {activeAction.detail}
          </p>
        </div>

        {/* Footer Buttons: Take Action, Snooze, Dismiss */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={() => handleSnooze(5)}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all flex items-center gap-1.5"
            title="Snooze action alerts for 5 minutes"
          >
            <Clock size={14} />
            <span>Snooze 5m</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
            >
              Dismiss
            </button>
            <button
              onClick={handleTakeAction}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-600/20 transition-all flex items-center gap-1.5"
            >
              <span>Take Action</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {totalPendingCount > 1 && (
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Real-time System Action</span>
            <span className="text-brand-600 font-extrabold">{totalPendingCount} pending items</span>
          </div>
        )}
      </div>
    </div>
  );
}
