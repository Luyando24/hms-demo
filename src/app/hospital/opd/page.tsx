'use client'

import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Activity, 
  Stethoscope, 
  MoreVertical, 
  CheckCircle2,
  Loader2,
  DoorOpen
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import CaptureVitalsModal from "@/components/hospital/CaptureVitalsModal";
import ConsultationModal from "@/components/hospital/ConsultationModal";

export default function OutpatientDashboard() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedQueueItem, setSelectedQueueItem] = useState<any>(null);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchQueue();
    
    // Subscribe to changes
    const channel = supabase
      .channel('queue_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walkin_queue' }, () => {
        fetchQueue();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('walkin_queue')
      .select('*, patients(*), rooms(*)')
      .order('created_at', { ascending: true });
    
    if (data) setQueue(data);
    setLoading(false);
  };
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Outpatient Department (OPD)</h1>
          <p className="text-slate-500 mt-1 font-medium">Daily Consultation Queue & Patient Flow.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Calendar size={16} />
            Today: May 05
          </button>
          <button className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2">
            <Plus size={16} />
            Check-in Patient
          </button>
        </div>
      </div>

      {/* OPD Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Registered</p>
          <p className="text-2xl font-black text-slate-900">124</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">In Consultation</p>
          <p className="text-2xl font-black text-slate-900">8</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Waiting Triage</p>
          <p className="text-2xl font-black text-slate-900">
            {queue.filter(i => i.status === 'WAITING').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Completed</p>
          <p className="text-2xl font-black text-slate-900">74</p>
        </div>
      </div>

      {/* Main Queue Table */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-900">Patient Queue</h2>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-brand-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Search queue..." 
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/20"
              />
            </div>
            <button className="bg-white border border-slate-200 text-slate-700 p-2 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Token</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Wait Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Room</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                    <Loader2 className="animate-spin text-brand-600 mx-auto mb-2" size={24} />
                    Loading live queue...
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Clock size={32} />
                    </div>
                    <p className="text-slate-400 font-bold">No patients currently in queue.</p>
                  </td>
                </tr>
              ) : queue.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-black text-slate-400 text-xs tracking-tighter">#{item.token_number || item.id.slice(0, 4)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 capitalize group-hover:text-brand-600 transition-colors">{item.patients.first_name} {item.patients.last_name}</p>
                      {item.priority !== 'NORMAL' && (
                        <span className={clsx(
                          "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                          item.priority === 'EMERGENCY' ? "bg-rose-500 text-white animate-pulse" : "bg-amber-500 text-white"
                        )}>
                          {item.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">MRN: {item.patients.file_number}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-slate-600 font-bold text-xs">
                      <Clock size={12} className="text-slate-400" />
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {item.rooms ? (
                      <div className="flex items-center gap-2 text-brand-600">
                        <DoorOpen size={14} />
                        <span className="text-xs font-black uppercase tracking-widest">{item.rooms.name}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">Triage Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                      item.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      item.status === 'CONSULTATION' ? "bg-brand-50 text-brand-600 border-brand-100 animate-pulse" :
                      item.status === 'TRIAGED' ? "bg-blue-50 text-blue-600 border-blue-100" :
                      "bg-amber-50 text-amber-600 border-amber-100"
                    )}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {item.status === 'WAITING' && (
                        <button 
                          onClick={() => { setSelectedPatient(item.patients); setIsVitalsModalOpen(true); }}
                          className="bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-brand-700 transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                        >
                          <Activity size={14} />
                          Capture Vitals
                        </button>
                      )}
                      {(item.status === 'TRIAGED' || item.status === 'CONSULTATION') && (
                        <button 
                          onClick={() => { setSelectedPatient(item.patients); setSelectedQueueItem(item); setIsConsultationModalOpen(true); }}
                          className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                        >
                          <Stethoscope size={14} />
                          Start Consult
                        </button>
                      )}
                      <button className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-100">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedPatient && (
        <CaptureVitalsModal 
          isOpen={isVitalsModalOpen} 
          onClose={() => { setIsVitalsModalOpen(false); setSelectedPatient(null); fetchQueue(); }} 
          patientId={selectedPatient.id} 
          patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`} 
        />
      )}

      {selectedPatient && selectedQueueItem && (
        <ConsultationModal 
          isOpen={isConsultationModalOpen} 
          onClose={() => { setIsConsultationModalOpen(false); setSelectedPatient(null); setSelectedQueueItem(null); fetchQueue(); }} 
          patientId={selectedPatient.id} 
          patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
          queueId={selectedQueueItem.id}
        />
      )}

      {/* Doctors Availability & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Doctor Availability</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Dr. Luyando Chansa', spec: 'General Physician', status: 'Available', room: 'Consultation Room 1' },
              { name: 'Dr. Mulenga Musonda', spec: 'Pediatrician', status: 'Busy', room: 'Consultation Room 3' },
              { name: 'Dr. Mwansa Phiri', spec: 'Dermatologist', status: 'Available', room: 'Consultation Room 2' },
              { name: 'Dr. Mutale Banda', spec: 'Orthopedic', status: 'On Break', room: 'Consultation Room 4' },
            ].map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                    <Stethoscope size={20} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{doc.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{doc.spec}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={clsx(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                    doc.status === 'Available' ? "bg-emerald-500 text-white" :
                    doc.status === 'Busy' ? "bg-blue-500 text-white" : "bg-slate-400 text-white"
                  )}>
                    {doc.status}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">{doc.room}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-brand-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full" />
          <h2 className="text-lg font-bold mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl text-sm font-bold flex items-center justify-between transition-all group">
              New Appointment
              <CheckCircle2 size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button className="w-full bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl text-sm font-bold flex items-center justify-between transition-all group">
              Manage Queue
              <CheckCircle2 size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button className="w-full bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl text-sm font-bold flex items-center justify-between transition-all group">
              View Schedule
              <CheckCircle2 size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
