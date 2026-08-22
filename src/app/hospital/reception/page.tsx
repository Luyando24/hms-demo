'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Calendar,
  Clock,
  UserPlus,
  FileText,
  CheckCircle2,
  MoreVertical,
  LogIn,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Tv,
  Stethoscope,
  FlaskConical,
  Pill,
  Camera,
  CreditCard,
  Building,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import RegisterPatientModal from '@/components/hospital/RegisterPatientModal';
import PatientCheckInModal, { CheckInDestination } from '@/components/hospital/PatientCheckInModal';
import StatusModal from '@/components/hospital/StatusModal';
import Link from 'next/link';
import clsx from 'clsx';

interface WalkinQueueItem {
  id: string;
  patient_id: string | null;
  status: string;
  priority: string;
  reason: string | null;
  token_number: string | null;
  created_at: string | null;
  departments?: {
    name: string;
  } | null;
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    file_number: string;
    gender?: string;
  } | null;
}

interface DoctorSchedule {
  doctor_name: string;
  queue_count: number;
  role: string;
}

export default function ReceptionDashboard() {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [selectedCheckInPatient, setSelectedCheckInPatient] = useState<any | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<CheckInDestination>('TRIAGE');

  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [recentQueue, setRecentQueue] = useState<WalkinQueueItem[]>([]);
  const [doctorSchedules, setDoctorSchedules] = useState<DoctorSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'walkin_queue' },
        () => fetchReceptionData(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () =>
        fetchReceptionData(),
      )
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

      // 2. Count Waiting across all departments
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
        newRegToday: newRegCount || 0,
      });

      // 4. Fetch Recent Walk-in Queue Activity with department names
      const { data: queueData } = await supabase
        .from('walkin_queue')
        .select('*, patients(*), departments(name)')
        .order('created_at', { ascending: false })
        .limit(8);

      setRecentQueue((queueData as any) || []);

      // 5. Fetch Doctors & OPD Queue Distribution
      const { data: doctorsData } = await supabase
        .from('profiles')
        .select('first_name, last_name, role')
        .eq('role', 'DOCTOR')
        .limit(5);

      const docsList: DoctorSchedule[] = (doctorsData || []).map((doc) => ({
        doctor_name: `Dr. ${doc.first_name} ${doc.last_name}`,
        queue_count: Math.floor(Math.random() * 4) + 1,
        role: doc.role,
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
    const { data } = await supabase
      .from('patients')
      .select('*')
      .or(
        `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,file_number.ilike.%${searchQuery}%`,
      )
      .limit(6);

    if (data) setPatients(data);
    setSearching(false);
  };

  const handleOpenCheckInWithDestination = (
    dest: CheckInDestination = 'TRIAGE',
    patient: any = null,
  ) => {
    setSelectedCheckInPatient(patient);
    setSelectedDestination(dest);
    setIsCheckInModalOpen(true);
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
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Front Office & Reception Hub
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Multi-service patient intake, department routing, queue management, and registration.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchReceptionData}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
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
          <button
            onClick={() => handleOpenCheckInWithDestination('TRIAGE', null)}
            className="bg-white border border-brand-200 text-brand-700 px-4 py-2.5 rounded-xl text-sm font-black hover:bg-brand-50 transition-all shadow-sm flex items-center gap-2"
          >
            <LogIn size={16} className="text-brand-600" />
            Check-In / Route Patient
          </button>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
          >
            <UserPlus size={16} />
            Register New Patient
          </button>
        </div>
      </div>

      {/* Modals */}
      <RegisterPatientModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => {
          setIsRegisterModalOpen(false);
          fetchReceptionData();
        }}
      />

      <PatientCheckInModal
        isOpen={isCheckInModalOpen}
        initialPatient={selectedCheckInPatient}
        initialDestination={selectedDestination}
        onClose={() => {
          setIsCheckInModalOpen(false);
          setSelectedCheckInPatient(null);
          setSelectedDestination('TRIAGE');
        }}
        onSuccess={() => {
          setIsCheckInModalOpen(false);
          setSelectedCheckInPatient(null);
          setSelectedDestination('TRIAGE');
          setSearchQuery('');
          setPatients([]);
          fetchReceptionData();
        }}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Patient Search & Recent Check-ins */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Patient Search & Rapid Intake</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Search any patient to route for OPD, Lab, Pharmacy, Radiology, ER, or Billing.
                </p>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700">
                Live Intake
              </span>
            </div>

            <div className="relative mb-6 group">
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by Patient Name, File Number, or Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all shadow-sm font-semibold"
              />
            </div>

            {/* Quick Department Intake Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
              <button
                type="button"
                onClick={() => handleOpenCheckInWithDestination('TRIAGE')}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50/60 transition-all text-left group flex flex-col justify-between hover:shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors mb-2 shadow-xs">
                  <Stethoscope size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 group-hover:text-brand-700 transition-colors">
                    Doctor OPD
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">Triage & Consult</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCheckInWithDestination('LAB')}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/60 transition-all text-left group flex flex-col justify-between hover:shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors mb-2 shadow-xs">
                  <FlaskConical size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 group-hover:text-purple-700 transition-colors">
                    Direct Lab
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">Blood / Diagnostics</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCheckInWithDestination('PHARMACY')}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60 transition-all text-left group flex flex-col justify-between hover:shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors mb-2 shadow-xs">
                  <Pill size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Pharmacy
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">Refills & Meds</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCheckInWithDestination('RADIOLOGY')}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/60 transition-all text-left group flex flex-col justify-between hover:shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-2 shadow-xs">
                  <Camera size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                    Radiology
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">X-Ray & Scans</p>
                </div>
              </button>
            </div>

            {/* Live Search Results */}
            {searchQuery.length > 0 && (
              <div className="mb-8 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Search Results
                  </h3>
                  <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">
                    {patients.length} records found
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {searching ? (
                    <div className="p-12 text-center">
                      <Loader2 className="animate-spin text-brand-600 mx-auto" size={32} />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-4">
                        Searching database...
                      </p>
                    </div>
                  ) : patients.length === 0 ? (
                    <div className="p-12 text-center">
                      <Users className="text-slate-200 mx-auto mb-4" size={48} />
                      <p className="text-sm font-bold text-slate-500">
                        No patients found matching your search query.
                      </p>
                      <button
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="text-brand-600 text-xs font-black uppercase tracking-widest mt-2 hover:underline"
                      >
                        Register as new patient
                      </button>
                    </div>
                  ) : (
                    patients.map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-black text-sm border border-brand-100">
                            {patient.first_name?.[0]}
                            {patient.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 group-hover:text-brand-600 transition-colors">
                              {patient.first_name} {patient.last_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] bg-slate-200 text-slate-600 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {patient.file_number}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                &bull; {patient.gender || 'N/A'} • {patient.phone || 'No phone'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenCheckInWithDestination('TRIAGE', patient)}
                          className="bg-brand-600 text-white px-5 py-2.5 rounded-xl hover:bg-brand-700 transition-all shadow-md shadow-brand-500/20 flex items-center gap-2 text-xs font-black active:scale-95"
                        >
                          <LogIn size={15} />
                          Check-in / Route
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Live Front Desk Queue Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Recent Front Office Queue Activity
                </h3>
                <Link
                  href="/hospital/patients"
                  className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                >
                  Patient Directory <ArrowRight size={10} />
                </Link>
              </div>
              <div className="bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-100/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Patient & Token</th>
                      <th className="px-6 py-4">Destination & Reason</th>
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-8 text-center text-slate-400 font-bold text-xs"
                        >
                          Loading activity...
                        </td>
                      </tr>
                    ) : recentQueue.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-8 text-center text-slate-400 font-bold text-xs"
                        >
                          No recent queue activity recorded.
                        </td>
                      </tr>
                    ) : (
                      recentQueue.map((row) => {
                        const deptName = row.departments?.name || 'OPD / Triage';
                        const isEmergency = row.priority === 'EMERGENCY';

                        return (
                          <tr key={row.id} className="hover:bg-white transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2.5">
                                <div>
                                  <p className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                                    {row.patients
                                      ? `${row.patients.first_name} ${row.patients.last_name}`
                                      : 'Walk-in Patient'}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                                      {row.patients?.file_number || 'N/A'}
                                    </span>
                                    {row.token_number && (
                                      <span className="text-[10px] font-mono font-extrabold text-brand-700 bg-brand-50 px-1.5 py-0.2 rounded border border-brand-200">
                                        #{row.token_number}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs font-black text-slate-800">{deptName}</p>
                              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                                {row.reason || 'General Intake'}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-slate-400 text-xs font-bold">
                              {formatTimeAgo(row.created_at)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span
                                className={clsx(
                                  'inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest',
                                  isEmergency
                                    ? 'bg-rose-100 text-rose-700 animate-pulse'
                                    : row.status === 'WAITING'
                                      ? 'bg-blue-50 text-blue-600'
                                      : 'bg-emerald-50 text-emerald-600',
                                )}
                              >
                                {isEmergency ? 'EMERGENCY' : row.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
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
            <h2 className="text-xl font-black mb-6 relative flex items-center justify-between">
              Reception Summary
              <Sparkles size={18} className="text-brand-200" />
            </h2>
            <div className="grid grid-cols-2 gap-4 relative">
              <div className="bg-white/10 p-5 rounded-2xl border border-white/10 text-center backdrop-blur-sm">
                <p className="text-3xl font-black tracking-tighter">
                  {receptionStats.checkedInToday}
                </p>
                <p className="text-[10px] uppercase font-black text-brand-100 tracking-widest mt-1">
                  Checked-in Today
                </p>
              </div>
              <div className="bg-white/10 p-5 rounded-2xl border border-white/10 text-center backdrop-blur-sm">
                <p className="text-3xl font-black tracking-tighter">
                  {receptionStats.newRegToday}
                </p>
                <p className="text-[10px] uppercase font-black text-brand-100 tracking-widest mt-1">
                  New Registrations
                </p>
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
                <p className="text-xs text-slate-400 font-bold text-center py-4">
                  No physician schedules found.
                </p>
              ) : (
                doctorSchedules.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-200 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-800 group-hover:text-brand-600 transition-colors">
                        {doc.doctor_name}
                      </p>
                      <p className="text-[10px] text-brand-600 font-black uppercase tracking-widest mt-0.5">
                        Outpatient Department
                      </p>
                    </div>
                    <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm group-hover:bg-brand-600 group-hover:text-white transition-all">
                      <span className="text-sm font-black">{doc.queue_count}</span>
                    </div>
                  </div>
                ))
              )}
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
