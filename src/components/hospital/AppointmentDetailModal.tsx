'use client';

import { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Stethoscope, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  LogIn, 
  X, 
  UserPlus, 
  Building, 
  Loader2,
  CalendarCheck,
  Hash,
  ShieldCheck,
  Activity
} from 'lucide-react';
import clsx from 'clsx';
import { AppointmentRecord } from '@/app/hospital/appointments/actions';

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentRecord | null;
  doctors: any[];
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
  onCheckInOpd: (apt: AppointmentRecord) => Promise<void>;
  onAssignDoctor: (id: string, doctorId: string) => Promise<void>;
}

export default function AppointmentDetailModal({
  isOpen,
  onClose,
  appointment,
  doctors,
  onStatusChange,
  onCheckInOpd,
  onAssignDoctor,
}: AppointmentDetailModalProps) {
  const [isReassigning, setIsReassigning] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(appointment?.provider_id || '');
  const [actionLoading, setActionLoading] = useState(false);

  if (!isOpen || !appointment) return null;

  const patient = appointment.patients;
  const doctor = appointment.provider;

  const aptDate = appointment.appointment_date
    ? new Date(appointment.appointment_date).toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Not Scheduled';

  const createdDate = appointment.created_at
    ? new Date(appointment.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  const handleStatusClick = async (newStatus: string) => {
    setActionLoading(true);
    await onStatusChange(appointment.id, newStatus);
    setActionLoading(false);
  };

  const handleCheckInClick = async () => {
    setActionLoading(true);
    await onCheckInOpd(appointment);
    setActionLoading(false);
  };

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    await onAssignDoctor(appointment.id, selectedDoctorId);
    setIsReassigning(false);
    setActionLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch ((status || '').toUpperCase()) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
            <CheckCircle2 size={13} /> Confirmed
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
            <Clock size={13} /> Scheduled
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
            <CheckCircle2 size={13} /> Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wider">
            <XCircle size={13} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-black shadow-xs">
              <CalendarCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-900">Appointment Details</h2>
                {getStatusBadge(appointment.status)}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Ref ID: <span className="font-mono font-bold text-slate-700">{appointment.id.substring(0, 13).toUpperCase()}</span> • Booked on {createdDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/60 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Patient Card Banner */}
          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-brand-500/20">
                {patient?.first_name?.[0] || 'P'}
                {patient?.last_name?.[0] || ''}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Information</p>
                <h3 className="text-lg font-black text-slate-900">
                  {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {patient?.file_number && (
                    <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold text-slate-700">
                      MRN: {patient.file_number}
                    </span>
                  )}
                  {patient?.gender && (
                    <span className="bg-slate-200/70 text-slate-700 text-xs px-2 py-0.5 rounded-md font-semibold capitalize">
                      {patient.gender}
                    </span>
                  )}
                  {patient?.dob && (
                    <span className="text-xs text-slate-500 font-medium">
                      DOB: {new Date(patient.dob).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1 text-xs text-slate-600 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
              {patient?.phone && (
                <div className="flex items-center gap-1.5 font-medium">
                  <Phone size={13} className="text-slate-400" />
                  <span>{patient.phone}</span>
                </div>
              )}
              {patient?.email && (
                <div className="flex items-center gap-1.5 font-medium">
                  <Mail size={13} className="text-slate-400" />
                  <span>{patient.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Schedule & Timing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Clock size={14} className="text-brand-600" />
                <span>Appointment Date & Time</span>
              </div>
              <p className="text-base font-extrabold text-slate-900">{aptDate}</p>
              <p className="text-[11px] text-slate-400 font-medium">Hospital Outpatient Clinic Schedule</p>
            </div>

            {/* Assigned Specialist Doctor */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <Stethoscope size={14} className="text-indigo-600" />
                  <span>Assigned Doctor</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDoctorId(appointment.provider_id || '');
                    setIsReassigning(!isReassigning);
                  }}
                  className="text-xs text-brand-600 font-bold hover:underline"
                >
                  {isReassigning ? 'Cancel' : doctor ? 'Change' : 'Assign'}
                </button>
              </div>

              {doctor ? (
                <div>
                  <p className="text-base font-extrabold text-slate-900">
                    Dr. {doctor.first_name} {doctor.last_name}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {doctor.departments?.name || 'General Medicine / OPD'}
                  </p>
                </div>
              ) : (
                <p className="text-sm font-bold text-amber-600">Unassigned Doctor</p>
              )}
            </div>
          </div>

          {/* Inline Doctor Reassignment Form */}
          {isReassigning && (
            <form onSubmit={handleDoctorSubmit} className="bg-brand-50/50 p-4 rounded-2xl border border-brand-200 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-900 block">
                Select Doctor from Registry
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="flex-1 p-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">-- Unassigned (Any Available Doctor) --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.first_name} {d.last_name} ({d.departments?.name || 'General Doctor'})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition-all shadow-xs disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          {/* Reason / Chief Complaint */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <FileText size={14} className="text-slate-600" />
              <span>Reason for Visit & Clinical Notes</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              {appointment.reason || 'General Medical Consultation / Checkup'}
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {/* Status updates */}
            {appointment.status === 'SCHEDULED' && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusClick('CONFIRMED')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> Confirm
              </button>
            )}

            {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusClick('COMPLETED')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> Mark Completed
              </button>
            )}

            {appointment.status !== 'CANCELLED' && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusClick('CANCELLED')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle size={14} /> Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* OPD Check-in Button */}
            {appointment.status !== 'CANCELLED' && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCheckInClick}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                Check-in to OPD Queue
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-all"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
