'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  Play, 
  Check, 
  X, 
  AlertTriangle, 
  UserCheck, 
  Calendar, 
  Sparkles,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { 
  isVoiceEnabled, 
  setVoiceEnabled, 
  getVoiceGenderPreference, 
  setVoiceGenderPreference, 
  playVoiceNotification,
  speakText
} from '@/utils/voiceNotification';

export interface DashboardNotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'queue' | 'inventory' | 'appointment' | 'system';
  read?: boolean;
}

export function NotificationCenterDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [voiceActive, setVoiceActive] = useState(true);
  const [voiceGender, setVoiceGender] = useState('auto');
  const [notifications, setNotifications] = useState<DashboardNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load Voice Settings & Sync with custom events
  useEffect(() => {
    setVoiceActive(isVoiceEnabled());
    setVoiceGender(getVoiceGenderPreference());

    const handleSettingChange = () => {
      setVoiceActive(isVoiceEnabled());
      setVoiceGender(getVoiceGenderPreference());
    };

    window.addEventListener('hms-voice-setting-changed', handleSettingChange);
    return () => {
      window.removeEventListener('hms-voice-setting-changed', handleSettingChange);
    };
  }, []);

  // Fetch initial notifications & listen for real-time alerts
  useEffect(() => {
    loadRecentNotifications();

    // Subscribe to walk-in queue check-ins
    const queueChannel = supabase
      .channel('header-notifications-queue')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'walkin_queue',
        filter: 'status=eq.WAITING'
      }, async (payload: any) => {
        const patientId = payload.new?.patient_id;
        if (patientId) {
          const { data: patient } = await supabase
            .from('patients')
            .select('first_name, last_name')
            .eq('id', patientId)
            .maybeSingle();

          const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'A patient';
          const newNotif: DashboardNotificationItem = {
            id: `queue-${Date.now()}`,
            title: 'New OPD Patient Check-in',
            message: `${patientName} has arrived in the OPD waiting queue.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'info',
            category: 'queue',
            read: false,
          };

          addNotification(newNotif);
          playVoiceNotification(newNotif.title, newNotif.message, 'info');
        }
      })
      .subscribe();

    // Close dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      supabase.removeChannel(queueChannel);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadRecentNotifications = async () => {
    try {
      const items: DashboardNotificationItem[] = [];

      // 1. Fetch recent walk-in queue items
      const { data: recentQueue } = await supabase
        .from('walkin_queue')
        .select('id, created_at, patients(first_name, last_name)')
        .eq('status', 'WAITING')
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentQueue) {
        recentQueue.forEach((q: any) => {
          const name = q.patients ? `${q.patients.first_name || ''} ${q.patients.last_name || ''}`.trim() : 'Patient';
          items.push({
            id: `q-${q.id}`,
            title: 'OPD Queue Check-in',
            message: `${name} is waiting in OPD.`,
            timestamp: new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'info',
            category: 'queue',
            read: false,
          });
        });
      }

      // 2. Fetch low stock inventory items
      const { data: lowStock } = await supabase
        .from('inventory_items')
        .select('id, name, stock_level, unit')
        .lte('stock_level', 5)
        .limit(2);

      if (lowStock) {
        lowStock.forEach((inv: any) => {
          items.push({
            id: `inv-${inv.id}`,
            title: 'Critical Stock Alert',
            message: `Low inventory for ${inv.name}: only ${inv.stock_level ?? 0} ${inv.unit || 'units'} remaining.`,
            timestamp: 'System',
            type: 'warning',
            category: 'inventory',
            read: false,
          });
        });
      }

      // Default notification if empty
      if (items.length === 0) {
        items.push({
          id: 'welcome-1',
          title: 'Voice Notifications Ready',
          message: 'Human voice alerts are active for check-ins, clinical events, and system alerts.',
          timestamp: 'Just now',
          type: 'success',
          category: 'system',
          read: true,
        });
      }

      setNotifications(items);
      setUnreadCount(items.filter(n => !n.read).length);
    } catch {
      // Fallback
    }
  };

  const addNotification = (notif: DashboardNotificationItem) => {
    setNotifications(prev => [notif, ...prev.slice(0, 9)]);
    setUnreadCount(prev => prev + 1);
  };

  const toggleVoice = () => {
    const nextState = !voiceActive;
    setVoiceEnabled(nextState);
    setVoiceActive(nextState);
    if (nextState) {
      playVoiceNotification('Voice notifications enabled', 'Human voice alerts are now active.', 'success');
    }
  };

  const changeVoiceGender = (gender: 'auto' | 'female' | 'male') => {
    setVoiceGenderPreference(gender);
    setVoiceGender(gender);
    if (voiceActive) {
      playVoiceNotification('Voice preference updated', `Selected voice profile set to ${gender}.`, 'info');
    }
  };

  const handleTestVoice = () => {
    setIsTestingVoice(true);
    playVoiceNotification(
      'Voice Notification Test',
      'This is a sample human voice notification announcement for Kunda Healthcare Management System.',
      'info'
    );
    setTimeout(() => setIsTestingVoice(false), 3000);
  };

  const speakNotificationItem = (notif: DashboardNotificationItem) => {
    playVoiceNotification(notif.title, notif.message, notif.type);
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Bell Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100 flex items-center justify-center focus:outline-none"
        title="Notifications & Sound Settings"
      >
        <Bell size={20} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      {/* Notifications Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-brand-500/20 text-brand-400">
                <Bell size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight leading-tight text-white">Notifications</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Human Voice & Sound</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                className="text-[11px] font-bold text-brand-400 hover:text-brand-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Voice Settings Controls */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {voiceActive ? (
                  <Volume2 size={16} className="text-brand-600" />
                ) : (
                  <VolumeX size={16} className="text-slate-400" />
                )}
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Voice Announcements</span>
                  <span className="text-[10px] text-slate-500 block">Spoken text-to-speech for all alerts</span>
                </div>
              </div>
              
              {/* Toggle switch */}
              <button
                onClick={toggleVoice}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 relative flex items-center ${
                  voiceActive ? 'bg-brand-600' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform transform ${
                  voiceActive ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {voiceActive && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px]">
                  <Sliders size={13} className="text-slate-400" />
                  <span>Voice Voice Accent:</span>
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  {(['auto', 'female', 'male'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => changeVoiceGender(g)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase transition-all ${
                        voiceGender === g 
                          ? 'bg-slate-900 text-white shadow-xs' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Test Voice Button */}
            {voiceActive && (
              <button
                onClick={handleTestVoice}
                disabled={isTestingVoice}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-brand-50 border border-slate-200 text-brand-700 py-1.5 px-3 rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Play size={12} className={isTestingVoice ? 'animate-spin' : 'fill-brand-600 text-brand-600'} />
                <span>{isTestingVoice ? 'Speaking Sample...' : 'Test Human Voice Audio'}</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">
                No active notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors ${
                    !n.read ? 'bg-brand-50/40' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-white mt-0.5 ${
                    n.type === 'warning' ? 'bg-amber-500' :
                    n.type === 'error' ? 'bg-rose-500' :
                    n.type === 'success' ? 'bg-emerald-500' : 'bg-brand-600'
                  }`}>
                    {n.category === 'queue' ? <UserCheck size={16} /> :
                     n.category === 'inventory' ? <AlertTriangle size={16} /> :
                     n.category === 'appointment' ? <Calendar size={16} /> : <Sparkles size={16} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{n.title}</h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">{n.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-snug mt-0.5">{n.message}</p>
                  </div>

                  {/* Play Voice Icon Button */}
                  <button
                    onClick={() => speakNotificationItem(n)}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-100 rounded-lg transition-colors shrink-0"
                    title="Speak in human voice"
                  >
                    <Volume2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
