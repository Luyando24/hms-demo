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
  DoorOpen,
  RefreshCw,
  UserCheck,
  Tv
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import CaptureVitalsModal from "@/components/hospital/CaptureVitalsModal";
import ConsultationModal from "@/components/hospital/ConsultationModal";
import RegisterPatientModal from "@/components/hospital/RegisterPatientModal";
import Link from "next/link";

interface DoctorItem {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

export default function OutpatientDashboard() {
  const [queue, setQueue] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedQueueItem, setSelectedQueueItem] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Real OPD Metrics State
  const [opdStats, setOpdStats] = useState({
    totalToday: 0,
    inConsultation: 0,
    waitingTriage: 0,
    completedToday: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    fetchOpdData();
    fetchCurrentUser();
    
    // Subscribe to realtime OPD queue updates
    const channel = supabase
      .channel('opd-queue-live-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walkin_queue' }, () => fetchOpdData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCurrentUser = async () => {
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

  const fetchOpdData = async () => {
    setLoading(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // 1. Fetch Walkin Queue Items
      const { data: queueData } = await supabase
        .from('walkin_queue')
        .select('*, patients(*), rooms(*)')
        .order('created_at', { ascending: false });
      
      const qList = queueData || [];
      setQueue(qList);

      // 2. Compute OPD Metrics from DB
      const todayQueue = qList.filter(i => new Date(i.created_at || 0) >= todayStart);
      setOpdStats({
        totalToday: todayQueue.length || qList.length,
        inConsultation: qList.filter(i => i.status === 'CONSULTATION' || i.status === 'TRIAGED').length,
        waitingTriage: qList.filter(i => i.status === 'WAITING').length,
        completedToday: qList.filter(i => i.status === 'COMPLETED').length,
      });

      // 3. Fetch Doctors for Availability List
      const { data: docsData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('role', 'DOCTOR')
        .limit(6);

      setDoctors(docsData || []);

    } catch (err) {
      console.error('Error fetching OPD queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredQueue = queue.filter(item => {
    const p = item.patients;
    const matchesSearch = searchQuery === '' ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p?.file_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Outpatient Department (OPD)</h1>
          <p className="text-slate-500 mt-1 font-medium">Daily Consultation Queue, Patient Triage & Clinical Workflows.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchOpdData}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            href="/hospital/queue-display"
            target="_blank"
            className="bg-slate-900 text-white border border-slate-800 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-md"
          >
            <Tv size={16} className="text-emerald-400 animate-pulse" />
            TV Queue Screen
          </Link>
          <Link
            href="/hospital/reception"
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <UserCheck size={16} />
            Reception Desk
          </Link>
          <button 
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
          >
            <Plus size={16} />
            Register Patient
          </button>
        </div>
      </div>

      {/* OPD Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Total Queue Today</p>
          <p className="text-3xl font-black text-slate-900">{opdStats.totalToday}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-blue-500 uppercase tracking-wider mb-2">In Consultation</p>
          <p className="text-3xl font-black text-slate-900">{opdStats.inConsultation}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-amber-500 uppercase tracking-wider mb-2">Waiting Triage</p>
          <p className="text-3xl font-black text-slate-900">{opdStats.waitingTriage}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-emerald-500 uppercase tracking-wider mb-2">Completed</p>
          <p className="text-3xl font-black text-slate-900">{opdStats.completedToday}</p>
        </div>
      </div>

      {/* Main Queue Table */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-black text-slate-900">OPD Consultation Queue</h2>
          
          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="WAITING">Waiting Triage</option>
              <option value="TRIAGED">Triaged</option>
              <option value="CONSULTATION">In Consultation</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search queue..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Token / ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-in Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
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
              ) : filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Clock size={32} />
                    </div>
                    <p className="text-slate-400 font-bold text-sm">No OPD queue records found.</p>
                  </td>
                </tr>
              ) : filteredQueue.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-black text-slate-400 text-xs tracking-tighter">#{item.id.slice(0, 8)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 capitalize group-hover:text-brand-600 transition-colors">
                        {item.patients ? `${item.patients.first_name} ${item.patients.last_name}` : 'Walk-in Patient'}
                      </p>
                      {item.priority !== 'NORMAL' && (
                        <span className={clsx(
                          "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                          item.priority === 'EMERGENCY' ? "bg-rose-500 text-white animate-pulse" : "bg-amber-500 text-white"
                        )}>
                          {item.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">
                      MRN: {item.patients?.file_number || 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-slate-600 font-bold text-xs">
                      <Clock size={12} className="text-slate-400" />
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-brand-600">
                      <DoorOpen size={14} />
                      <span className="text-xs font-black uppercase tracking-widest">{item.department || 'General OPD'}</span>
                    </div>
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
                      {/* Vitals Capture is restricted EXCLUSIVELY to Nurses */}
                      {item.status === 'WAITING' && item.patients && currentUserRole === 'NURSE' && (
                        <button 
                          onClick={() => { setSelectedPatient(item.patients); setIsVitalsModalOpen(true); }}
                          className="bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-brand-700 transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                        >
                          <Activity size={14} />
                          Capture Vitals
                        </button>
                      )}

                      {/* Doctor Consultation is available for Doctors and Admins */}
                      {(item.status === 'TRIAGED' || item.status === 'CONSULTATION' || (item.status === 'WAITING' && currentUserRole !== 'NURSE')) && item.patients && (
                        <button 
                          onClick={() => { setSelectedPatient(item.patients); setSelectedQueueItem(item); setIsConsultationModalOpen(true); }}
                          className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                        >
                          <Stethoscope size={14} />
                          Start Consult
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Attending Physicians & Quick Nav */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-black text-slate-900">Attending Physicians</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctors.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold col-span-full">No attending physicians registered.</p>
            ) : doctors.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Stethoscope size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Dr. {doc.first_name} {doc.last_name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{doc.role}</p>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  Available
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-brand-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-brand-500">
          <div>
            <h2 className="text-lg font-black mb-6">OPD Quick Navigation</h2>
            <div className="space-y-3">
              <Link 
                href="/hospital/reception"
                className="w-full bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl text-xs font-bold flex items-center justify-between transition-all"
              >
                Front Office & Reception Desk
                <CheckCircle2 size={18} />
              </Link>
              <Link 
                href="/hospital/patients"
                className="w-full bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl text-xs font-bold flex items-center justify-between transition-all"
              >
                Patient Registry (EHR)
                <CheckCircle2 size={18} />
              </Link>
              <Link 
                href="/hospital/laboratory"
                className="w-full bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl text-xs font-bold flex items-center justify-between transition-all"
              >
                Laboratory Information System
                <CheckCircle2 size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {selectedPatient && (
        <CaptureVitalsModal 
          isOpen={isVitalsModalOpen} 
          onClose={() => { setIsVitalsModalOpen(false); setSelectedPatient(null); fetchOpdData(); }} 
          patientId={selectedPatient.id} 
          patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`} 
        />
      )}

      {selectedPatient && selectedQueueItem && (
        <ConsultationModal 
          isOpen={isConsultationModalOpen} 
          onClose={() => { setIsConsultationModalOpen(false); setSelectedPatient(null); setSelectedQueueItem(null); fetchOpdData(); }} 
          patientId={selectedPatient.id} 
          patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
          queueId={selectedQueueItem.id}
        />
      )}

      <RegisterPatientModal 
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => {
          setIsRegisterModalOpen(false);
          fetchOpdData();
        }}
      />
    </div>
  );
}
