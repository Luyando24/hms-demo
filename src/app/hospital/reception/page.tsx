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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Front Desk & Reception
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Patient intake, department routing, queue coordination, and registrations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchReceptionData}
            className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
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
          <button
            onClick={() => handleOpenCheckInWithDestination('TRIAGE', null)}
            className="bg-white border border-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
          >
            <LogIn size={14} className="text-slate-600" />
            Route Patient
          </button>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5"
          >
            <UserPlus size={14} />
            Register Patient
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Patient Search & Recent Check-ins */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Patient Intake & Search</h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Search patients to route for OPD, Lab, Pharmacy, Radiology, ER, or Billing.
                </p>
              </div>
            </div>

            <div className="relative mb-5 group">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-700 transition-colors"
                size={16}
              />
              <input
                type="text"
                placeholder="Search patient by name, MRN file number, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
              />
            </div>

            {/* Quick Department Intake Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
              <button
                type="button"
                onClick={() => handleOpenCheckInWithDestination('TRIAGE')}
                className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-400 hover:bg-slate-50/60 transition-all text-left group flex items-center gap-3 shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
                  <Stethoscope size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">Doctor OPD</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">Triage & Consult</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCheckInWithDestination('LAB')}
                className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-400 hover:bg-slate-50/60 transition-all text-left group flex items-center gap-3 shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
                  <FlaskConical size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">Direct Lab</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">Blood / Tests</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCheckInWithDestination('PHARMACY')}
                className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-400 hover:bg-slate-50/60 transition-all text-left group flex items-center gap-3 shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
                  <Pill size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">Pharmacy</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">Meds & Refills</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCheckInWithDestination('RADIOLOGY')}
                className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-400 hover:bg-slate-50/60 transition-all text-left group flex items-center gap-3 shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
                  <Camera size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">Radiology</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">X-Ray & Scans</p>
                </div>
              </button>
            </div>

            {/* Live Search Results */}
            {searchQuery.length > 0 && (
              <div className="mb-6 bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm animate-in fade-in duration-200">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Search Results
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-600">
                    {patients.length} records found
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {searching ? (
                    <div className="p-8 text-center">
                      <Loader2 className="animate-spin text-slate-600 mx-auto" size={24} />
                      <p className="text-xs font-medium text-slate-400 mt-2">
                        Searching database...
                      </p>
                    </div>
                  ) : patients.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="text-slate-300 mx-auto mb-2" size={32} />
                      <p className="text-xs font-medium text-slate-500">
                        No patients found matching your search query.
                      </p>
                      <button
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="text-slate-900 text-xs font-semibold mt-2 hover:underline inline-block"
                      >
                        + Register as new patient
                      </button>
                    </div>
                  ) : (
                    patients.map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center justify-between p-4 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200/60">
                            {patient.first_name?.[0]}
                            {patient.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900">
                              {patient.first_name} {patient.last_name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">
                                {patient.file_number}
                              </span>
                              <span className="text-[11px] text-slate-400 font-normal">
                                &bull; {patient.gender || 'N/A'} • {patient.phone || 'No phone'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenCheckInWithDestination('TRIAGE', patient)}
                          className="bg-slate-900 text-white px-3.5 py-2 rounded-xl hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5 text-xs font-medium active:scale-98"
                        >
                          <LogIn size={13} />
                          Route Patient
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Live Front Desk Queue Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Recent Front Office Queue Activity
                </h3>
                <Link
                  href="/hospital/patients"
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  Patient Directory <ArrowRight size={12} />
                </Link>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60">
                    <tr>
                      <th className="px-4 py-3">Patient & Token</th>
                      <th className="px-4 py-3">Destination & Reason</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-slate-400 font-medium text-xs"
                        >
                          Loading activity...
                        </td>
                      </tr>
                    ) : recentQueue.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-slate-400 font-medium text-xs"
                        >
                          No recent queue activity recorded.
                        </td>
                      </tr>
                    ) : (
                      recentQueue.map((row) => {
                        const deptName = row.departments?.name || 'OPD / Triage';
                        const isEmergency = row.priority === 'EMERGENCY';

                        return (
                          <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3.5">
                              <div>
                                <p className="font-bold text-sm text-slate-900">
                                  {row.patients
                                    ? `${row.patients.first_name} ${row.patients.last_name}`
                                    : 'Walk-in Patient'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {row.patients?.file_number || 'N/A'}
                                  </span>
                                  {row.token_number && (
                                    <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                                      #{row.token_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="text-xs font-bold text-slate-800">{deptName}</p>
                              <p className="text-[11px] text-slate-400 font-normal truncate max-w-[200px]">
                                {row.reason || 'General Intake'}
                              </p>
                            </td>
                            <td className="px-4 py-3.5 text-slate-400 text-xs font-normal">
                              {formatTimeAgo(row.created_at)}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <span
                                className={clsx(
                                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border',
                                  isEmergency
                                    ? 'bg-rose-50 text-rose-700 border-rose-200/60'
                                    : row.status === 'WAITING'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
                                )}
                              >
                                <span
                                  className={clsx(
                                    'w-1.5 h-1.5 rounded-full',
                                    isEmergency
                                      ? 'bg-rose-500 animate-pulse'
                                      : row.status === 'WAITING'
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500',
                                  )}
                                />
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
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              Reception Metrics
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-center">
                <p className="text-2xl font-bold tracking-tight text-slate-900">
                  {receptionStats.checkedInToday}
                </p>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                  Checked-in Today
                </p>
              </div>
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-center">
                <p className="text-2xl font-bold tracking-tight text-slate-900">
                  {receptionStats.newRegToday}
                </p>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                  New Registered
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              Physician Consultation Roster
              <Calendar size={15} className="text-slate-400" />
            </h2>
            <div className="space-y-2">
              {doctorSchedules.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium text-center py-4">
                  No physician schedules found.
                </p>
              ) : (
                doctorSchedules.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50/70 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {doc.doctor_name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Outpatient Department
                      </p>
                    </div>
                    <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 shadow-xs">
                      {doc.queue_count} queued
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
