'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BellRing,
  X,
  ArrowRight,
  Clock,
  Users,
  FlaskConical,
  Pill,
  Camera,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Sparkles,
  Stethoscope,
  CreditCard,
  Send,
  CornerDownRight,
  User,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import {
  playChime,
  playVoiceNotification,
  isVoiceEnabled,
  setVoiceEnabled,
} from '@/utils/voiceNotification';
import clsx from 'clsx';

export interface PendingActionItem {
  id: string;
  type: 'TRIAGE' | 'DOCTOR' | 'LAB' | 'PRESCRIPTION' | 'RADIOLOGY' | 'EMERGENCY' | 'BILLING';
  title: string;
  patientName: string;
  patientFileNo?: string;
  tokenNumber?: string;
  detail: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY';
  targetPath: string;
  actionLabel: string;
  timestamp: string;
}

export default function StaffPendingActionPopup() {
  const [activeAction, setActiveAction] = useState<PendingActionItem | null>(null);
  const [totalPendingCount, setTotalPendingCount] = useState<number>(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [isVoiceOn, setIsVoiceOn] = useState<boolean>(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const lastActionIdRef = useRef<string | null>(null);

  // Sync sound preference and load active user role
  useEffect(() => {
    setIsVoiceOn(isVoiceEnabled());
    void fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle();
      if (profile?.role) {
        setCurrentUserRole(profile.role);
      }
    }
  };

  // Determines if an action item is relevant to the logged-in staff role
  const isActionForRole = (
    actionType: PendingActionItem['type'],
    role: string | null,
    path: string | null,
  ): boolean => {
    if (!role) return false;

    // ADMIN: contextual alerts based on current dashboard page or critical emergency
    if (role === 'ADMIN') {
      if (actionType === 'EMERGENCY') return true;
      if (actionType === 'LAB' && path?.includes('/laboratory')) return true;
      if (actionType === 'PRESCRIPTION' && path?.includes('/inventory')) return true;
      if (actionType === 'RADIOLOGY' && path?.includes('/radiology')) return true;
      if (actionType === 'TRIAGE' && path?.includes('/opd')) return true;
      if (actionType === 'DOCTOR' && path?.includes('/opd')) return true;
      if (actionType === 'BILLING' && (path?.includes('/billing') || path?.includes('/finance')))
        return true;
      return false;
    }

    // Role-specific routing:
    // DOCTORS only receive Doctor consultation / follow-up review alerts
    if (role === 'DOCTOR') {
      return actionType === 'DOCTOR' || actionType === 'EMERGENCY';
    }

    // LAB TECHS only receive Laboratory investigation referrals
    if (role === 'LAB_TECH') {
      return actionType === 'LAB';
    }

    // PHARMACISTS only receive Pharmacy dispensing referrals
    if (role === 'PHARMACIST') {
      return actionType === 'PRESCRIPTION';
    }

    // RADIOLOGISTS only receive Radiology & Imaging scan referrals
    if (role === 'RADIOLOGIST') {
      return actionType === 'RADIOLOGY';
    }

    // NURSES only receive Triage & Vitals capture referrals
    if (role === 'NURSE') {
      return actionType === 'TRIAGE' || actionType === 'EMERGENCY';
    }

    // ACCOUNTANTS & RECEPTIONISTS receive Billing referrals
    if (role === 'ACCOUNTANT' || role === 'RECEPTIONIST') {
      return actionType === 'BILLING';
    }

    return false;
  };

  // Fetch pending action items across hospital tables
  const checkForPendingActions = async () => {
    try {
      // Check if snoozed
      if (snoozedUntil && Date.now() < snoozedUntil) {
        return;
      }

      const actions: PendingActionItem[] = [];

      // 1. Check Walk-in Queue for Triage, ER, or Doctor
      const { data: queueData } = await supabase
        .from('walkin_queue')
        .select('*, patients(first_name, last_name, file_number), departments(name), rooms(name)')
        .in('status', ['WAITING', 'TRIAGED'])
        .order('created_at', { ascending: false })
        .limit(6);

      if (queueData && queueData.length > 0) {
        queueData.forEach((q: any) => {
          const pName = q.patients
            ? `${q.patients.first_name} ${q.patients.last_name}`
            : 'Walk-in Patient';
          const token = q.token_number || undefined;
          const fileNo = q.patients?.file_number || undefined;
          const isEmergency = q.priority === 'EMERGENCY';
          const isTriage =
            q.status === 'WAITING' &&
            (!q.room_id || (q.reason && q.reason.toLowerCase().includes('triage')));

          if (isEmergency) {
            actions.push({
              id: `queue-${q.id}`,
              type: 'EMERGENCY',
              title: 'Emergency Trauma Referral',
              patientName: pName,
              patientFileNo: fileNo,
              tokenNumber: token,
              detail: q.reason || 'Critical patient escalated to Emergency Room (ER) queue.',
              priority: 'EMERGENCY',
              targetPath: '/hospital/er',
              actionLabel: 'Open Emergency Bay',
              timestamp: q.created_at || new Date().toISOString(),
            });
          } else if (isTriage) {
            actions.push({
              id: `queue-${q.id}`,
              type: 'TRIAGE',
              title: 'Pending Referral: Nurse Triage & Vitals',
              patientName: pName,
              patientFileNo: fileNo,
              tokenNumber: token,
              detail: `Patient referred from Reception to OPD. Waiting for vitals capture & triage.`,
              priority: q.priority === 'URGENT' ? 'URGENT' : 'NORMAL',
              targetPath: '/hospital/opd',
              actionLabel: 'Capture Vitals Now',
              timestamp: q.created_at || new Date().toISOString(),
            });
          } else if (q.status === 'TRIAGED' || q.status === 'CONSULTATION') {
            actions.push({
              id: `queue-${q.id}`,
              type: 'DOCTOR',
              title: 'Patient Ready: Doctor OPD Consultation',
              patientName: pName,
              patientFileNo: fileNo,
              tokenNumber: token,
              detail: `Vitals recorded. Patient waiting in queue for Doctor consultation ${
                q.rooms?.name ? `(${q.rooms.name})` : ''
              }.`,
              priority: q.priority === 'URGENT' ? 'URGENT' : 'NORMAL',
              targetPath: '/hospital/opd',
              actionLabel: 'Start Consultation',
              timestamp: q.created_at || new Date().toISOString(),
            });
          }
        });
      }

      // 2. Check Pending Lab Orders (intended for LAB_TECH)
      const { data: labData } = await supabase
        .from('lab_orders')
        .select('*, patients(first_name, last_name, file_number)')
        .in('status', ['ORDERED', 'PENDING', 'REQUESTED'])
        .order('created_at', { ascending: false })
        .limit(4);

      if (labData && labData.length > 0) {
        labData.forEach((l: any) => {
          const pName = l.patients
            ? `${l.patients.first_name} ${l.patients.last_name}`
            : 'Patient';
          actions.push({
            id: `lab-${l.id}`,
            type: 'LAB',
            title: 'Pending Referral: Diagnostic Lab Test',
            patientName: pName,
            patientFileNo: l.patients?.file_number || undefined,
            detail: `New laboratory investigation ordered by doctor awaiting sample collection.`,
            priority: l.priority === 'URGENT' || l.priority === 'CRITICAL' ? 'URGENT' : 'NORMAL',
            targetPath: '/hospital/laboratory',
            actionLabel: 'Open Lab Worklist',
            timestamp: l.created_at || new Date().toISOString(),
          });
        });
      }

      // 3. Check Pending Prescriptions (intended for PHARMACIST)
      const { data: rxData } = await supabase
        .from('prescriptions')
        .select('*, patients(first_name, last_name, file_number)')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(4);

      if (rxData && rxData.length > 0) {
        rxData.forEach((rx: any) => {
          const pName = rx.patients
            ? `${rx.patients.first_name} ${rx.patients.last_name}`
            : 'Patient';
          actions.push({
            id: `rx-${rx.id}`,
            type: 'PRESCRIPTION',
            title: 'Pending Referral: Pharmacy Dispensing',
            patientName: pName,
            patientFileNo: rx.patients?.file_number || undefined,
            detail: `Doctor prescription awaiting pharmacist verification & medication dispensing.`,
            priority: 'NORMAL',
            targetPath: '/hospital/inventory',
            actionLabel: 'Dispense Prescription',
            timestamp: rx.created_at || new Date().toISOString(),
          });
        });
      }

      // 4. Check Pending Radiology Orders (intended for RADIOLOGIST)
      const { data: radData } = await supabase
        .from('radiology_orders')
        .select('*, patients(first_name, last_name, file_number)')
        .eq('status', 'ORDERED')
        .order('created_at', { ascending: false })
        .limit(3);

      if (radData && radData.length > 0) {
        radData.forEach((rad: any) => {
          const pName = rad.patients
            ? `${rad.patients.first_name} ${rad.patients.last_name}`
            : 'Patient';
          actions.push({
            id: `rad-${rad.id}`,
            type: 'RADIOLOGY',
            title: `Pending Referral: Radiology (${rad.modality})`,
            patientName: pName,
            patientFileNo: rad.patients?.file_number || undefined,
            detail: `Imaging scan for ${rad.body_part || 'Study'} requested by clinician.`,
            priority: 'NORMAL',
            targetPath: '/hospital/radiology',
            actionLabel: 'Open Imaging Station',
            timestamp: rad.created_at || new Date().toISOString(),
          });
        });
      }

      // 5. Filter strictly by the current user's role & permissions
      const roleTargetedActions = actions.filter((a) =>
        isActionForRole(a.type, currentUserRole, pathname),
      );

      setTotalPendingCount(roleTargetedActions.length);

      // Filter out dismissed items
      const undismissed = roleTargetedActions.filter((a) => !dismissedIds.has(a.id));

      if (undismissed.length > 0) {
        const topAction = undismissed[0];

        // Trigger sound notification on new arrival
        if (topAction.id !== lastActionIdRef.current) {
          lastActionIdRef.current = topAction.id;
          setActiveAction(topAction);

          if (topAction.priority === 'EMERGENCY' || topAction.priority === 'URGENT') {
            playChime('warning');
            playVoiceNotification(topAction.title, topAction.detail, 'warning');
          } else {
            playChime('info');
            playVoiceNotification(topAction.title, undefined, 'info');
          }
        }
      } else {
        setActiveAction(null);
      }
    } catch (err) {
      console.error('Error checking pending staff referral actions:', err);
    }
  };

  useEffect(() => {
    if (currentUserRole) {
      void checkForPendingActions();
    }

    // Subscribe to realtime database changes across relevant tables
    const channel = supabase
      .channel('staff-pending-referrals-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'walkin_queue' },
        () => void checkForPendingActions(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lab_orders' },
        () => void checkForPendingActions(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prescriptions' },
        () => void checkForPendingActions(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'radiology_orders' },
        () => void checkForPendingActions(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [dismissedIds, snoozedUntil, currentUserRole, pathname]);

  const handleDismiss = () => {
    if (activeAction) {
      setDismissedIds((prev) => new Set(prev).add(activeAction.id));
      setActiveAction(null);
    }
  };

  const handleSnooze = (minutes: number = 5) => {
    const snoozeEnd = Date.now() + minutes * 60 * 1000;
    setSnoozedUntil(snoozeEnd);
    if (activeAction) {
      setDismissedIds((prev) => new Set(prev).add(activeAction.id));
    }
    setActiveAction(null);
  };

  const handleTakeAction = () => {
    if (activeAction) {
      setDismissedIds((prev) => new Set(prev).add(activeAction.id));
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

  // Do not show modal on public queue-display screen or when no action is active
  if (!activeAction || pathname?.startsWith('/hospital/queue-display')) {
    return null;
  }

  const getThemeConfig = (type: PendingActionItem['type']) => {
    switch (type) {
      case 'TRIAGE':
        return {
          icon: Activity,
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          bannerBg: 'bg-emerald-600',
          bannerLight: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          buttonColor: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white',
          accentBorder: 'border-emerald-500',
        };
      case 'DOCTOR':
        return {
          icon: Stethoscope,
          badgeBg: 'bg-brand-100 text-brand-800 border-brand-200',
          bannerBg: 'bg-brand-600',
          bannerLight: 'bg-brand-50 border-brand-200 text-brand-900',
          buttonColor: 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20 text-white',
          accentBorder: 'border-brand-500',
        };
      case 'LAB':
        return {
          icon: FlaskConical,
          badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
          bannerBg: 'bg-purple-600',
          bannerLight: 'bg-purple-50 border-purple-200 text-purple-900',
          buttonColor: 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20 text-white',
          accentBorder: 'border-purple-500',
        };
      case 'PRESCRIPTION':
        return {
          icon: Pill,
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          bannerBg: 'bg-emerald-600',
          bannerLight: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          buttonColor: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white',
          accentBorder: 'border-emerald-500',
        };
      case 'RADIOLOGY':
        return {
          icon: Camera,
          badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          bannerBg: 'bg-indigo-600',
          bannerLight: 'bg-indigo-50 border-indigo-200 text-indigo-900',
          buttonColor: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 text-white',
          accentBorder: 'border-indigo-500',
        };
      case 'EMERGENCY':
        return {
          icon: AlertTriangle,
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
          bannerBg: 'bg-rose-600',
          bannerLight: 'bg-rose-50 border-rose-200 text-rose-900',
          buttonColor: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20 text-white',
          accentBorder: 'border-rose-500',
        };
      case 'BILLING':
      default:
        return {
          icon: CreditCard,
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          bannerBg: 'bg-amber-600',
          bannerLight: 'bg-amber-50 border-amber-200 text-amber-900',
          buttonColor: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20 text-white',
          accentBorder: 'border-amber-500',
        };
    }
  };

  const theme = getThemeConfig(activeAction.type);
  const IconComp = theme.icon;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200/80 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-150">
        {/* Header Banner */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <IconComp size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {activeAction.type} Referral
                </span>
                {activeAction.priority === 'EMERGENCY' || activeAction.priority === 'URGENT' ? (
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    {activeAction.priority}
                  </span>
                ) : null}
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-0.5 leading-tight">
                {activeAction.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleVoice}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              title={isVoiceOn ? 'Mute Sound Alerts' : 'Enable Sound Alerts'}
            >
              {isVoiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              title="Dismiss Alert"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body Card */}
        <div className="p-5 space-y-3">
          {/* Patient Details Card */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                  <User size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase">
                    {activeAction.patientName}
                  </h3>
                  {activeAction.patientFileNo && (
                    <p className="text-[10px] font-mono text-slate-400">
                      MRN: {activeAction.patientFileNo}
                    </p>
                  )}
                </div>
              </div>

              {activeAction.tokenNumber && (
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-bold font-mono">
                    Token #{activeAction.tokenNumber}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 font-normal leading-relaxed pt-0.5">
              {activeAction.detail}
            </p>
          </div>

          {/* Pending Queue Count Banner */}
          {totalPendingCount > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium text-[11px]">
                <Sparkles size={13} className="text-slate-400" />
                Pending Queue Items
              </span>
              <span className="text-slate-900 font-bold text-[11px]">{totalPendingCount} pending</span>
            </div>
          )}
        </div>

        {/* Modal Footer Controls: Snooze 5 min, Dismiss, Take Action */}
        <div className="p-3.5 px-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2.5 shrink-0">
          <button
            onClick={() => handleSnooze(5)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 shadow-xs"
            title="Snooze popup alerts for 5 minutes"
          >
            <Clock size={13} className="text-slate-400" />
            <span>Snooze</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleTakeAction}
              className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-98"
            >
              <span>{activeAction.actionLabel}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
