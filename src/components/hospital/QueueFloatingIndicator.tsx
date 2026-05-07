'use client'

import { useState, useEffect } from 'react';
import { Users, ChevronUp, Bell, X, User } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import clsx from 'clsx';

export default function QueueFloatingIndicator() {
  const [waitingCount, setWaitingCount] = useState(0);
  const [latestPatient, setLatestPatient] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchQueueStatus();

    const channel = supabase
      .channel('queue-floating-indicator')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'walkin_queue',
        filter: 'status=eq.WAITING'
      }, (payload: any) => {
        fetchQueueStatus();
        showNotification(payload.new.patient_id);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'walkin_queue'
      }, () => {
        fetchQueueStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchQueueStatus = async () => {
    const { count } = await supabase
      .from('walkin_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'WAITING');
    
    setWaitingCount(count || 0);
    setIsVisible((count || 0) > 0);
  };

  const showNotification = async (patientId: string) => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();
    
    if (data) {
      setLatestPatient(data);
      setIsExpanded(true);
      // Auto-collapse after 10 seconds
      setTimeout(() => setIsExpanded(false), 10000);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-8 right-8 z-[100] flex flex-col items-end gap-3 pointer-events-none">
      {/* Expanded Notification Panel */}
      {isExpanded && latestPatient && (
        <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-80 animate-in slide-in-from-bottom-4 fade-in duration-300 pointer-events-auto relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 -z-10" />
          
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
                <Bell size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">New Patient Arrival</p>
                <h3 className="text-sm font-black text-slate-900 leading-tight">OPD Queue Update</h3>
              </div>
            </div>
            <button 
              onClick={() => setIsExpanded(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-white text-slate-400 flex items-center justify-center font-bold border border-slate-200">
              {latestPatient.first_name[0]}{latestPatient.last_name[0]}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{latestPatient.first_name} {latestPatient.last_name}</p>
              <p className="text-xs text-slate-500">{latestPatient.file_number}</p>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>Just checked in</span>
            <span className="text-brand-600 font-black">{waitingCount} waiting total</span>
          </div>
        </div>
      )}

      {/* Floating Action Button / Small Indicator */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          "w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-95 pointer-events-auto border-4 border-white",
          isExpanded ? "bg-slate-900" : "bg-brand-600 hover:bg-brand-700"
        )}
      >
        <div className="relative">
          <Users className="text-white" size={24} />
          {waitingCount > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
              {waitingCount}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
