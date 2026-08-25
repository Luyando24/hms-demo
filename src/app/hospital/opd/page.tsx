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
  Check,
  Loader2,
  DoorOpen,
  RefreshCw,
  UserCheck,
  Tv,
  ArrowRight
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import CaptureVitalsModal from "@/components/hospital/CaptureVitalsModal";
import ConsultationModal from "@/components/hospital/ConsultationModal";
import RegisterPatientModal from "@/components/hospital/RegisterPatientModal";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
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
  const [facilityRooms, setFacilityRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>('');
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
    if (typeof window !== 'undefined') {
      const savedRoom = localStorage.getItem('hms_active_room_id');
      if (savedRoom) setActiveRoomId(savedRoom);
    }
  }, []);

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

      const role = (
        profile?.role ||
        authData.user.user_metadata?.role ||
        (authData.user.app_metadata as any)?.role ||
        ''
      )
        .toString()
        .trim()
        .toUpperCase();

      if (role) {
        setCurrentUserRole(role);
      }
    }
  };

  const fetchOpdData = async () => {
    setLoading(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // 1. Fetch Walkin Queue Items and Active Rooms
      const [{ data: queueData }, { data: roomsData }, { data: docsData }] = await Promise.all([
        supabase
          .from('walkin_queue')
          .select('*, patients(*), rooms(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('rooms')
          .select('id, name')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('profiles')
          .select('id, first_name, last_name, role')
          .eq('role', 'DOCTOR')
          .limit(6),
      ]);
      
      const qList = queueData || [];
      setQueue(qList);
      if (roomsData) setFacilityRooms(roomsData);
      if (docsData) setDoctors(docsData);

      // 2. Compute OPD Metrics from DB
      const todayQueue = qList.filter(i => new Date(i.created_at || 0) >= todayStart);
      setOpdStats({
        totalToday: todayQueue.length || qList.length,
        inConsultation: qList.filter(i => i.status === 'CONSULTATION' || i.status === 'TRIAGED').length,
        waitingTriage: qList.filter(i => i.status === 'WAITING').length,
        completedToday: qList.filter(i => i.status === 'COMPLETED').length,
      });

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

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedQueue,
  } = usePagination(filteredQueue, { initialPageSize: 10 });

  const handleOpenCaptureVitals = async (item: any) => {
    setSelectedPatient(item.patients);
    setSelectedQueueItem(item);
    setIsVitalsModalOpen(true);

    const assignedRoomId = activeRoomId || item.room_id || null;
    try {
      if (item.status !== 'CALLING' || (!item.room_id && assignedRoomId)) {
        await supabase
          .from('walkin_queue')
          .update({
            status: 'CALLING',
            room_id: assignedRoomId,
          })
          .eq('id', item.id);
        void fetchOpdData();
      }
    } catch (err) {
      console.warn('Could not update queue status to CALLING:', err);
    }
  };

  const handleStartConsult = async (item: any) => {
    setSelectedPatient(item.patients);
    setSelectedQueueItem(item);
    setIsConsultationModalOpen(true);

    const assignedRoomId = activeRoomId || item.room_id || null;
    try {
      await supabase
        .from('walkin_queue')
        .update({
          status: 'CALLING',
          room_id: assignedRoomId,
        })
        .eq('id', item.id);
      void fetchOpdData();
    } catch (err) {
      console.warn('Could not update queue status to CALLING:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Outpatient Department (OPD)</h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">Daily consultation queue, patient triage, and physician workflows.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Room Selector for Clinicians */}
          {facilityRooms.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs">
              <DoorOpen size={14} className="text-emerald-600 shrink-0" />
              <span className="text-slate-400 font-bold uppercase text-[10px]">Room:</span>
              <select
                value={activeRoomId}
                onChange={(e) => {
                  setActiveRoomId(e.target.value);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('hms_active_room_id', e.target.value);
                  }
                }}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
              >
                <option value="">Select Room (Admin Configured)...</option>
                {facilityRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button 
            onClick={fetchOpdData}
            className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            href="/hospital/queue-display"
            target="_blank"
            className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all shadow-xs flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            TV Screen
          </Link>
          <Link
            href="/hospital/reception"
            className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
          >
            <UserCheck size={13} />
            Reception
          </Link>
          <button 
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5"
          >
            <Plus size={14} />
            Register Patient
          </button>
        </div>
      </div>

      {/* OPD Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Queue Total</p>
            <span className="w-2 h-2 rounded-full bg-slate-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{opdStats.totalToday}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Checked in today</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Consult</p>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{opdStats.inConsultation}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">With physician</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Waiting Triage</p>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{opdStats.waitingTriage}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Awaiting vitals</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed</p>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{opdStats.completedToday}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Discharged / routed</p>
        </div>
      </div>

      {/* Main Queue Table */}
      <section className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">OPD Consultation Queue</h2>
          
          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 text-slate-700 focus:outline-none shadow-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="WAITING">Waiting Triage</option>
              <option value="TRIAGED">Triaged</option>
              <option value="CONSULTATION">In Consultation</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input 
                type="text" 
                placeholder="Filter queue..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-xs"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/60">
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Token / ID</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Check-in</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium text-xs">
                    <Loader2 className="animate-spin text-slate-600 mx-auto mb-1.5" size={20} />
                    Loading live queue...
                  </td>
                </tr>
              ) : filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Clock size={20} />
                    </div>
                    <p className="text-slate-500 font-medium text-xs">No OPD queue records found.</p>
                  </td>
                </tr>
              ) : paginatedQueue.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-bold text-slate-700">#{item.id.slice(0, 8)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900 capitalize">
                        {item.patients ? `${item.patients.first_name} ${item.patients.last_name}` : 'Walk-in Patient'}
                      </p>
                      {item.priority !== 'NORMAL' && (
                        <span className={clsx(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide",
                          item.priority === 'EMERGENCY' ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        )}>
                          {item.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-normal">
                      MRN: {item.patients?.file_number || 'N/A'}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-1.5 text-slate-500 text-xs font-normal">
                      <Clock size={12} className="text-slate-400" />
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <DoorOpen size={13} className="text-slate-400" />
                      <span className="text-xs font-semibold">{item.department || 'General OPD'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={clsx(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border",
                      item.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" :
                      item.status === 'CONSULTATION' ? "bg-blue-50 text-blue-700 border-blue-200/60" :
                      item.status === 'TRIAGED' ? "bg-indigo-50 text-indigo-700 border-indigo-200/60" :
                      "bg-amber-50 text-amber-700 border-amber-200/60"
                    )}>
                      <span className={clsx(
                        "w-1.5 h-1.5 rounded-full",
                        item.status === 'COMPLETED' ? "bg-emerald-500" :
                        item.status === 'CONSULTATION' ? "bg-blue-500 animate-pulse" :
                        item.status === 'TRIAGED' ? "bg-indigo-500" :
                        "bg-amber-500"
                      )} />
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Vitals Capture is restricted EXCLUSIVELY to Nurses */}
                      {(item.status === 'WAITING' || item.status === 'CALLING') && item.patients && currentUserRole === 'NURSE' && (
                        <button 
                          onClick={() => void handleOpenCaptureVitals(item)}
                          className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
                        >
                          <Activity size={13} />
                          Capture Vitals
                        </button>
                      )}

                      {/* When Triaged or In Consult and viewed by a Nurse, display status badge (Never Start Consult) */}
                      {(item.status === 'TRIAGED' || item.status === 'CONSULTATION') && currentUserRole === 'NURSE' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 rounded-lg">
                          <Check size={12} className="text-indigo-600" />
                          Triaged & Forwarded
                        </span>
                      )}

                      {/* Doctor Consultation is strictly for Doctors and Admins (NEVER Nurses) */}
                      {currentUserRole !== 'NURSE' && (item.status === 'TRIAGED' || item.status === 'CONSULTATION' || item.status === 'WAITING') && item.patients && (
                        <button 
                          onClick={() => void handleStartConsult(item)}
                          className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
                        >
                          <Stethoscope size={13} />
                          Start Consult
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemName="queue items"
          />
        </div>
      </section>

      {/* Attending Physicians & Quick Nav */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Attending Physicians</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {doctors.length === 0 ? (
              <p className="text-xs text-slate-400 font-normal col-span-full">No attending physicians registered.</p>
            ) : doctors.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                    <Stethoscope size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Dr. {doc.first_name} {doc.last_name}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">{doc.role}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Available
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">OPD Quick Links</h2>
          <div className="space-y-2">
            <Link 
              href="/hospital/reception"
              className="w-full bg-slate-50 hover:bg-slate-100/80 text-slate-700 p-3 rounded-xl text-xs font-medium flex items-center justify-between border border-slate-100 transition-all"
            >
              Front Office & Reception
              <ArrowRight size={14} className="text-slate-400" />
            </Link>
            <Link 
              href="/hospital/patients"
              className="w-full bg-slate-50 hover:bg-slate-100/80 text-slate-700 p-3 rounded-xl text-xs font-medium flex items-center justify-between border border-slate-100 transition-all"
            >
              Patient Registry (EHR)
              <ArrowRight size={14} className="text-slate-400" />
            </Link>
            <Link 
              href="/hospital/laboratory"
              className="w-full bg-slate-50 hover:bg-slate-100/80 text-slate-700 p-3 rounded-xl text-xs font-medium flex items-center justify-between border border-slate-100 transition-all"
            >
              Laboratory LIS
              <ArrowRight size={14} className="text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {selectedPatient && (
        <CaptureVitalsModal 
          isOpen={isVitalsModalOpen} 
          onClose={() => { setIsVitalsModalOpen(false); setSelectedPatient(null); setSelectedQueueItem(null); fetchOpdData(); }} 
          patientId={selectedPatient.id} 
          patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
          queueId={selectedQueueItem?.id}
        />
      )}

      {selectedPatient && selectedQueueItem && (
        <ConsultationModal 
          isOpen={isConsultationModalOpen} 
          onClose={() => { setIsConsultationModalOpen(false); setSelectedPatient(null); setSelectedQueueItem(null); fetchOpdData(); }} 
          patientId={selectedPatient.id} 
          patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
          queueId={selectedQueueItem.id}
          initialRoomId={activeRoomId || selectedQueueItem.room_id}
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
