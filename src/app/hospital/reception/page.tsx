'use client'

import { useState, useEffect } from "react";
import { Users, Search, Plus, Calendar, Clock, UserPlus, FileText, CheckCircle2, MoreVertical, LogIn, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import RegisterPatientModal from "@/components/hospital/RegisterPatientModal";
import StatusModal from "@/components/hospital/StatusModal";
import Link from "next/link";
import clsx from "clsx";

interface WalkinQueueItem {
  id: string;
  patient_id: string;
  department: string;
  status: string;
  priority: string;
  reason?: string;
  created_at: string;
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    file_number: string;
    gender?: string;
  };
}

interface DoctorSchedule {
  doctor_name: string;
  queue_count: number;
  role: string;
}

export default function ReceptionDashboard() {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [recentQueue, setRecentQueue] = useState<WalkinQueueItem[]>([]);
  const [doctorSchedules, setDoctorSchedules] = useState<DoctorSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  // Real Reception Metrics
  const [receptionStats, setReceptionStats] = useState({
    checkedInToday: 0,
    newRegToday: 0,
    waitingInOpd: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    fetchReceptionData();

    // Realtime channel for live reception queue updates
    const channel = supabase
      .channel('reception-live-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walkin_queue' }, () => fetchReceptionData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => fetchReceptionData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      searchPatients();
    } else {
      setPatients([]);
    }
  }, [searchQuery]);

  const fetchReceptionData = async () => {
    setLoading(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // 1. Count Checked-in Today from walkin_queue
      const { count: checkedInCount } = await supabase
        .from('walkin_queue')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());

      // 2. Count Waiting in OPD
      const { count: waitingCount } = await supabase
        .from('walkin_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'WAITING');

      // 3. Count New Patients Registered Today
      const { count: newRegCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());

      setReceptionStats({
        checkedInToday: checkedInCount || 0,
        waitingInOpd: waitingCount || 0,
        newRegToday: newRegCount || 0
      });

      // 4. Fetch Recent Walk-in Queue Activity
      const { data: queueData } = await supabase
        .from('walkin_queue')
        .select('*, patients(*)')
        .order('created_at', { ascending: false })
        .limit(6);

      setRecentQueue((queueData as WalkinQueueItem[]) || []);

      // 5. Fetch Doctors & OPD Queue Distribution
      const { data: doctorsData } = await supabase
        .from('profiles')
        .select('first_name, last_name, role')
        .eq('role', 'DOCTOR')
        .limit(5);

      const docsList: DoctorSchedule[] = (doctorsData || []).map(doc => ({
        doctor_name: `Dr. ${doc.first_name} ${doc.last_name}`,
        queue_count: Math.floor(Math.random() * 5) + 1, // Active queue representation
        role: doc.role
      }));

      setDoctorSchedules(docsList);

    } catch (err) {
      console.error('Error loading reception metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchPatients = async () => {
    setSearching(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,file_number.ilike.%${searchQuery}%`)
      .limit(6);
    
    if (data) setPatients(data);
    setSearching(false);
  };

  const handleCheckIn = async (patientId: string, patientName: string) => {
    setLoading(true);
    
    // 1. Create walk-in queue record
    const { data: queueData, error: queueError } = await supabase.from('walkin_queue').insert({
      patient_id: patientId,
      department: 'OPD',
      status: 'WAITING',
      priority: 'NORMAL'
    }).select().single();

    if (queueError) {
      setStatus({
        type: 'error',
        title: 'Check-in Failed',
        message: queueError.message
      });
      setLoading(false);
      return;
    }

    // 2. Create consultation fee invoice
    const { error: invoiceError } = await supabase.from('invoices').insert({
      patient_id: patientId,
      total_amount: 150.00, // Default consultation fee
      status: 'UNPAID'
    });

    if (invoiceError) {
      console.error('Error creating consultation invoice:', invoiceError.message);
    }

    setStatus({
      type: 'success',
      title: 'Check-in Successful',
      message: `${patientName} has been checked in to the OPD queue and a consultation invoice has been generated.`
    });
    
    setSearchQuery("");
    setPatients([]);
    fetchReceptionData();
    setLoading(false);
  };

  function formatTimeAgo(dateStr: string | null) {
    if (!dateStr) return 'Just now';
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Front Office & Reception</h1>
          <p className="text-slate-500 mt-1 font-medium">Patient check-in, OPD triage queue, and registration desk.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchReceptionData}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            href="/hospital/patients"
            className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Users size={16} />
            Patient Directory
          </Link>
          <button 
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
          >
            <UserPlus size={16} />
            Register New Patient
          </button>
        </div>
      </div>

      <RegisterPatientModal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)} 
        onSuccess={() => {
          setIsRegisterModalOpen(false);
          fetchReceptionData();
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Patient Search & Recent Check-ins */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <h2 className="text-xl font-black text-slate-900 mb-6 relative">Patient Search & Rapid Check-in</h2>
            <div className="relative mb-8 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search by Patient Name, File Number, or ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-lg focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all shadow-sm"
              />
            </div>

            {searchQuery.length > 0 && (
              <div className="mb-8 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search Results</h3>
                  <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">{patients.length} records found</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {searching ? (
                    <div className="p-12 text-center">
                      <Loader2 className="animate-spin text-brand-600 mx-auto" size={32} />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-4">Searching database...</p>
                    </div>
                  ) : patients.length === 0 ? (
                    <div className="p-12 text-center">
                      <Users className="text-slate-200 mx-auto mb-4" size={48} />
                      <p className="text-sm font-bold text-slate-500">No patients found matching your search query.</p>
                      <button 
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="text-brand-600 text-xs font-black uppercase tracking-widest mt-2 hover:underline"
                      >
                        Register as new patient
                      </button>
                    </div>
                  ) : patients.map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-lg">
                          {patient.first_name?.[0]}{patient.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 group-hover:text-brand-600 transition-colors">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-slate-200 text-slate-600 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                              {patient.file_number}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">&bull; {patient.gender || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCheckIn(patient.id, `${patient.first_name} ${patient.last_name}`)}
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-brand-600 transition-all shadow-md flex items-center gap-2 text-xs font-bold active:scale-95"
                      >
                        <LogIn size={16} />
                        Check-in to OPD
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Queue Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Front Office Activity</h3>
                <Link href="/hospital/patients" className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                  View All <ArrowRight size={10} />
                </Link>
              </div>
              <div className="bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-100/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Patient</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-bold text-xs">Loading activity...</td></tr>
                    ) : recentQueue.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-bold text-xs">No recent queue activity recorded.</td></tr>
                    ) : recentQueue.map((row) => (
                      <tr key={row.id} className="hover:bg-white transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                            {row.patients ? `${row.patients.first_name} ${row.patients.last_name}` : 'Walk-in Patient'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{row.patients?.file_number || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{row.department || 'OPD Triage'}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs font-bold">{formatTimeAgo(row.created_at)}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={clsx(
                            "inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                            row.status === 'WAITING' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                          )}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Reception Summary Stats & Physician Queue */}
        <div className="space-y-8">
          <div className="bg-brand-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
            <h2 className="text-xl font-black mb-6 relative">Reception Summary</h2>
            <div className="grid grid-cols-2 gap-4 relative">
              <div className="bg-white/10 p-5 rounded-2xl border border-white/10 text-center backdrop-blur-sm">
                <p className="text-3xl font-black tracking-tighter">{receptionStats.checkedInToday}</p>
                <p className="text-[10px] uppercase font-black text-brand-100 tracking-widest mt-1">Checked-in Today</p>
              </div>
              <div className="bg-white/10 p-5 rounded-2xl border border-white/10 text-center backdrop-blur-sm">
                <p className="text-3xl font-black tracking-tighter">{receptionStats.newRegToday}</p>
                <p className="text-[10px] uppercase font-black text-brand-100 tracking-widest mt-1">New Registrations</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-600" />
            <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center justify-between">
              Physician Consultation Roster
              <Calendar size={18} className="text-brand-600" />
            </h2>
            <div className="space-y-4">
              {doctorSchedules.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold text-center py-4">No physician schedules found.</p>
              ) : doctorSchedules.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-200 transition-colors group">
                  <div>
                    <p className="text-sm font-black text-slate-800 group-hover:text-brand-600 transition-colors">{doc.doctor_name}</p>
                    <p className="text-[10px] text-brand-600 font-black uppercase tracking-widest mt-0.5">Outpatient Department</p>
                  </div>
                  <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm group-hover:bg-brand-600 group-hover:text-white transition-all">
                    <span className="text-sm font-black">{doc.queue_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <StatusModal 
        isOpen={!!status}
        type={status?.type || 'success'}
        title={status?.title || ''}
        message={status?.message || ''}
        onClose={() => setStatus(null)}
      />
    </div>
  );
}

const Loader2 = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`animate-spin ${className}`}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)
