'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Search, 
  Filter, 
  Clock, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Stethoscope, 
  RefreshCw, 
  Building, 
  UserPlus, 
  LogIn,
  MoreVertical,
  Plus
} from 'lucide-react';
import clsx from 'clsx';
import { 
  getHospitalAppointmentsAction, 
  updateAppointmentStatusAction, 
  assignAppointmentDoctorAction, 
  checkInAppointmentToOpdAction,
  getDoctorProfilesAction,
  type AppointmentRecord 
} from './actions';
import StatusModal from '@/components/hospital/StatusModal';
import Link from 'next/link';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals & Assignments
  const [assigningAppointment, setAssigningAppointment] = useState<AppointmentRecord | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const res = await getHospitalAppointmentsAction();
    if (res.success && res.data) {
      setAppointments(res.data);
    } else {
      setStatusFeedback({
        type: 'error',
        title: 'Fetch Error',
        message: res.error || 'Failed to load appointments.',
      });
    }
    setLoading(false);
  }, []);

  const fetchDoctors = useCallback(async () => {
    const res = await getDoctorProfilesAction();
    if (res.success && res.doctors) {
      setDoctors(res.doctors);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, [fetchAppointments, fetchDoctors]);

  // Compute Stat Metrics dynamically from database records
  const isSameDay = (d1Str: string | null | undefined, d2: Date) => {
    if (!d1Str) return false;
    const d1 = new Date(d1Str);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const now = new Date();
  const totalToday = appointments.filter(
    (a) => isSameDay(a.appointment_date, now) || isSameDay(a.created_at, now)
  ).length;

  const scheduledCount = appointments.filter(
    (a) => (a.status || '').toUpperCase() === 'SCHEDULED'
  ).length;
  const confirmedCount = appointments.filter(
    (a) => (a.status || '').toUpperCase() === 'CONFIRMED'
  ).length;
  const completedCount = appointments.filter(
    (a) => (a.status || '').toUpperCase() === 'COMPLETED'
  ).length;
  const cancelledCount = appointments.filter(
    (a) => (a.status || '').toUpperCase() === 'CANCELLED'
  ).length;

  // Filter appointments by search & tab
  const filteredAppointments = appointments.filter((apt) => {
    // Status Filter
    if (
      selectedStatus !== 'ALL' &&
      (apt.status || '').toUpperCase() !== selectedStatus.toUpperCase()
    ) {
      return false;
    }

    // Search Query Filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const patientName = `${apt.patients?.first_name || ''} ${apt.patients?.last_name || ''}`.toLowerCase();
    const fileNumber = (apt.patients?.file_number || '').toLowerCase();
    const phone = (apt.patients?.phone || '').toLowerCase();
    const reason = (apt.reason || '').toLowerCase();
    const doctorName = `${apt.provider?.first_name || ''} ${apt.provider?.last_name || ''}`.toLowerCase();

    return (
      patientName.includes(q) ||
      fileNumber.includes(q) ||
      phone.includes(q) ||
      reason.includes(q) ||
      doctorName.includes(q)
    );
  });

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedAppointments,
  } = usePagination(filteredAppointments, { initialPageSize: 10 });

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setActionLoading(id);
    const res = await updateAppointmentStatusAction(id, newStatus);
    setActionLoading(null);

    if (res.success) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
      setStatusFeedback({
        type: 'success',
        title: 'Status Updated',
        message: `Appointment status changed to ${newStatus}.`,
      });
    } else {
      setStatusFeedback({
        type: 'error',
        title: 'Update Failed',
        message: res.error || 'Failed to update status.',
      });
    }
  };

  const handleCheckInOpd = async (apt: AppointmentRecord) => {
    if (!apt.patients?.id) return;
    setActionLoading(apt.id);
    const res = await checkInAppointmentToOpdAction(apt.id, apt.patients.id, apt.reason);
    setActionLoading(null);

    if (res.success) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === apt.id ? { ...a, status: 'CONFIRMED' } : a))
      );
      setStatusFeedback({
        type: 'success',
        title: 'OPD Check-In Successful',
        message: `${apt.patients.first_name} ${apt.patients.last_name} has been added to the OPD waiting queue.`,
      });
    } else {
      setStatusFeedback({
        type: 'error',
        title: 'Check-In Failed',
        message: res.error || 'Failed to check-in to OPD.',
      });
    }
  };

  const handleAssignDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningAppointment) return;

    setActionLoading(assigningAppointment.id);
    const res = await assignAppointmentDoctorAction(
      assigningAppointment.id,
      selectedDoctorId || null
    );
    setActionLoading(null);

    if (res.success) {
      const assignedDoc = doctors.find((d) => d.id === selectedDoctorId) || null;
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === assigningAppointment.id
            ? {
                ...a,
                provider_id: selectedDoctorId || null,
                provider: assignedDoc,
              }
            : a
        )
      );
      setAssigningAppointment(null);
      setStatusFeedback({
        type: 'success',
        title: 'Doctor Assigned',
        message: 'Specialist doctor has been assigned to the appointment.',
      });
    } else {
      setStatusFeedback({
        type: 'error',
        title: 'Assignment Failed',
        message: res.error || 'Failed to assign doctor.',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 w-fit">
            <CheckCircle2 size={13} className="text-emerald-600" /> CONFIRMED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1.5 w-fit">
            <CheckCircle2 size={13} className="text-blue-600" /> COMPLETED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 w-fit">
            <XCircle size={13} className="text-rose-600" /> CANCELLED
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 w-fit">
            <Clock size={13} className="text-amber-600" /> SCHEDULED
          </span>
        );
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Total</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-slate-900">{totalToday}</span>
            <span className="text-xs font-semibold text-slate-400">Booked Today</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Scheduled</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-amber-600">{scheduledCount}</span>
            <span className="text-xs font-semibold text-slate-400">Pending</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Confirmed</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-emerald-600">{confirmedCount}</span>
            <span className="text-xs font-semibold text-slate-400">Active</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Completed</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-blue-600">{completedCount}</span>
            <span className="text-xs font-semibold text-slate-400">Attended</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Cancelled</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-rose-600">{cancelledCount}</span>
            <span className="text-xs font-semibold text-slate-400">Inactive</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Status Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, phone, file #, or doctor..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Tab Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={clsx(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                selectedStatus === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <Loader2 size={32} className="animate-spin text-brand-600 mx-auto" />
            <p className="text-sm font-bold text-slate-600">Loading appointments database...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar size={24} />
            </div>
            <p className="text-base font-extrabold text-slate-800">No Appointments Found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedStatus !== 'ALL'
                ? 'No appointments matched your search or status filter.'
                : 'No patient appointments have been booked yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Patient</th>
                  <th className="py-4 px-6">Date & Time</th>
                  <th className="py-4 px-6">Assigned Doctor</th>
                  <th className="py-4 px-6">Reason / Notes</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedAppointments.map((apt) => {
                  const patient = apt.patients;
                  const doctor = apt.provider;
                  const aptDate = apt.appointment_date
                    ? new Date(apt.appointment_date).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'N/A';

                  const isBusy = actionLoading === apt.id;

                  return (
                    <tr key={apt.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Patient */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 font-black flex items-center justify-center text-xs shrink-0 border border-brand-200">
                            {patient?.first_name?.[0] || 'P'}
                            {patient?.last_name?.[0] || ''}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block">
                              {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                              {patient?.file_number && (
                                <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[10px] text-slate-600 font-bold">
                                  {patient.file_number}
                                </span>
                              )}
                              {patient?.phone && <span>{patient.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-4 px-6 font-semibold text-slate-800 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400 shrink-0" />
                          <span>{aptDate}</span>
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="py-4 px-6">
                        {doctor ? (
                          <div className="flex items-center gap-2">
                            <Stethoscope size={14} className="text-brand-600 shrink-0" />
                            <span className="font-extrabold text-slate-900 text-xs">
                              Dr. {doctor.first_name} {doctor.last_name}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAssigningAppointment(apt);
                              setSelectedDoctorId(apt.provider_id || '');
                            }}
                            className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-all flex items-center gap-1.5"
                          >
                            <UserPlus size={13} /> Unassigned (Click to Assign)
                          </button>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="py-4 px-6 text-xs text-slate-600 max-w-xs truncate">
                        {apt.reason || 'General Medical Consultation'}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">{getStatusBadge(apt.status)}</td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isBusy ? (
                            <Loader2 size={16} className="animate-spin text-brand-600" />
                          ) : (
                            <>
                              {/* OPD Check-in button */}
                              {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                                <button
                                  onClick={() => handleCheckInOpd(apt)}
                                  title="Check-in to OPD Queue"
                                  className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-98"
                                >
                                  <LogIn size={13} />
                                  Check In
                                </button>
                              )}

                              {/* Assign / Change Doctor */}
                              <button
                                onClick={() => {
                                  setAssigningAppointment(apt);
                                  setSelectedDoctorId(apt.provider_id || '');
                                }}
                                title="Reassign Specialist Doctor"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                              >
                                <Stethoscope size={16} />
                              </button>

                              {/* Status Toggle Dropdown / Buttons */}
                              {apt.status === 'SCHEDULED' && (
                                <button
                                  onClick={() => handleUpdateStatus(apt.id, 'CONFIRMED')}
                                  title="Confirm Appointment"
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all font-bold text-xs"
                                >
                                  Confirm
                                </button>
                              )}

                              {apt.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => handleUpdateStatus(apt.id, 'CANCELLED')}
                                  title="Cancel Appointment"
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-all font-bold text-xs"
                                >
                                  Cancel
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemName="appointments"
            />
          </div>
        )}
      </div>

      {/* Assign Doctor Modal */}
      {assigningAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAssignDoctorSubmit}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Assign Specialist Doctor</h3>
                  <p className="text-xs text-slate-500">Select doctor for patient appointment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssigningAppointment(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-900">
                  Patient: {assigningAppointment.patients?.first_name} {assigningAppointment.patients?.last_name}
                </span>
                <p className="text-slate-500">Reason: {assigningAppointment.reason || 'General Medical Visit'}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Select Specialist Doctor
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">-- Unassigned (Any Available Doctor) --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.first_name} {d.last_name} ({d.departments?.name || 'General Doctor'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssigningAppointment(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-md shadow-brand-500/20"
              >
                Save Doctor Assignment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Feedback Status Modal */}
      {statusFeedback && (
        <StatusModal
          isOpen={true}
          onClose={() => setStatusFeedback(null)}
          type={statusFeedback.type}
          title={statusFeedback.title}
          message={statusFeedback.message}
        />
      )}
    </div>
  );
}
