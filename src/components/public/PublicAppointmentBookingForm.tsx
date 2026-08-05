'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Stethoscope, 
  Building, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  Printer, 
  Home, 
  HeartPulse,
  AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import { bookPublicAppointmentAction } from '@/app/book-appointment/actions';

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface Doctor {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  department_id: string | null;
  department_name?: string | null;
}

interface SystemSettings {
  hospital_name?: string | null;
  brand_title?: string | null;
  logo_url?: string | null;
  tagline?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

interface Props {
  departments: Department[];
  doctors: Doctor[];
  settings: SystemSettings | null;
}

const TIME_SLOTS = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

export function PublicAppointmentBookingForm({ departments, doctors, settings }: Props) {
  const hospitalTitle = settings?.hospital_name || settings?.brand_title?.trim() || 'Hospital';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    department_id: '',
    provider_id: '',
    date: '',
    time: '09:00',
    reason: '',
  });

  // Confirmation Result State
  const [bookingResult, setBookingResult] = useState<{
    bookingReference: string;
    patientName: string;
    fileNumber: string | null;
    appointmentDate: string;
    providerName: string | null;
    email: string | null;
  } | null>(null);

  // Filter doctors by chosen department
  const filteredDoctors = formData.department_id
    ? doctors.filter(doc => doc.department_id === formData.department_id)
    : doctors;

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setErrorMsg('Please enter your full first and last name.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg('Please enter a valid contact phone number.');
      return;
    }
    if (!formData.dob) {
      setErrorMsg('Please provide your date of birth.');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.date) {
      setErrorMsg('Please select your preferred appointment date.');
      return;
    }
    if (!formData.time) {
      setErrorMsg('Please select a preferred time slot.');
      return;
    }
    if (!formData.reason.trim()) {
      setErrorMsg('Please provide a brief reason for your medical visit.');
      return;
    }

    const appointmentDateTime = `${formData.date}T${formData.time}:00`;

    setSubmitting(true);
    const res = await bookPublicAppointmentAction({
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone,
      email: formData.email,
      dob: formData.dob,
      gender: formData.gender,
      department_id: formData.department_id,
      provider_id: formData.provider_id,
      appointment_date: appointmentDateTime,
      reason: formData.reason,
    });

    setSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.success && res.bookingReference) {
      setBookingResult({
        bookingReference: res.bookingReference,
        patientName: res.patientName || `${formData.first_name} ${formData.last_name}`,
        fileNumber: res.fileNumber || null,
        appointmentDate: res.appointmentDate || appointmentDateTime,
        providerName: res.providerName || null,
        email: res.email || null,
      });
      setStep(4);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress Bar Header */}
      {step !== 4 && (
        <div className="mb-8">
          <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto px-4">
            <div className={clsx('flex items-center gap-2 font-bold text-xs sm:text-sm', step >= 1 ? 'text-brand-600' : 'text-slate-400')}>
              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center font-black transition-all', step >= 1 ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30' : 'bg-slate-200 text-slate-500')}>1</div>
              <span className="hidden sm:inline">Patient Info</span>
            </div>
            <div className={clsx('flex-1 h-1 rounded-full transition-all', step >= 2 ? 'bg-brand-500' : 'bg-slate-200')} />
            <div className={clsx('flex items-center gap-2 font-bold text-xs sm:text-sm', step >= 2 ? 'text-brand-600' : 'text-slate-400')}>
              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center font-black transition-all', step >= 2 ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30' : 'bg-slate-200 text-slate-500')}>2</div>
              <span className="hidden sm:inline">Department & Doctor</span>
            </div>
            <div className={clsx('flex-1 h-1 rounded-full transition-all', step >= 3 ? 'bg-brand-500' : 'bg-slate-200')} />
            <div className={clsx('flex items-center gap-2 font-bold text-xs sm:text-sm', step >= 3 ? 'text-brand-600' : 'text-slate-400')}>
              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center font-black transition-all', step >= 3 ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30' : 'bg-slate-200 text-slate-500')}>3</div>
              <span className="hidden sm:inline">Schedule & Reason</span>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 animate-in fade-in duration-200">
          <AlertCircle size={20} className="text-rose-600 shrink-0" />
          <p className="text-sm font-bold">{errorMsg}</p>
        </div>
      )}

      {/* STEP 1: PATIENT INFORMATION */}
      {step === 1 && (
        <form onSubmit={handleNextStep1} className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-8 animate-in fade-in duration-300">
          <div className="border-b border-slate-100 pb-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-black">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Step 1: Patient Contact & Profile</h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Please enter your basic information so our clinic team can contact you and process your appointment.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="e.g. Chipo"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="e.g. Banda"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Phone Number (WhatsApp / Mobile) *</label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+260 971 234567"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Email Address (Optional)</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="chipo@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Date of Birth *</label>
              <input
                type="date"
                required
                value={formData.dob}
                onChange={e => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Gender *</label>
              <select
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other / Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="bg-brand-600 text-white px-8 py-3.5 rounded-2xl text-sm font-bold hover:bg-brand-700 transition-all flex items-center gap-2 shadow-lg shadow-brand-500/20 hover:-translate-y-0.5"
            >
              Continue to Select Specialist <ArrowRight size={18} />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: DEPARTMENT & SPECIALIST SELECTION */}
      {step === 2 && (
        <form onSubmit={handleNextStep2} className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-8 animate-in fade-in duration-300">
          <div className="border-b border-slate-100 pb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <Stethoscope size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Step 2: Department & Doctor (Optional)</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Select a department or specific physician if you have a preference.</p>
              </div>
            </div>
          </div>

          {/* Department Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Choose Medical Department</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, department_id: '', provider_id: '' })}
                className={clsx(
                  "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2",
                  !formData.department_id
                    ? "bg-brand-50 border-brand-500 text-brand-900 ring-2 ring-brand-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm">General Outpatient (OPD)</span>
                  <Building size={16} className={!formData.department_id ? "text-brand-600" : "text-slate-400"} />
                </div>
                <span className="text-[11px] text-slate-500 font-medium">General consultation and triage</span>
              </button>

              {departments.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, department_id: dept.id, provider_id: '' })}
                  className={clsx(
                    "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2",
                    formData.department_id === dept.id
                      ? "bg-brand-50 border-brand-500 text-brand-900 ring-2 ring-brand-500/20"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm">{dept.name}</span>
                    <Building size={16} className={formData.department_id === dept.id ? "text-brand-600" : "text-slate-400"} />
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium line-clamp-1">{dept.description || 'Specialist care'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Doctor / Specialist Selection */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Select Specialist / Doctor</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, provider_id: '' })}
                className={clsx(
                  "p-4 rounded-2xl border text-left flex items-center gap-3 transition-all",
                  !formData.provider_id
                    ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center font-black shrink-0 text-slate-600">
                  ⚡
                </div>
                <div>
                  <div className="font-extrabold text-sm">Any Available Specialist</div>
                  <div className="text-[11px] text-slate-500 font-medium">Assigns next available doctor on duty</div>
                </div>
              </button>

              {filteredDoctors.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, provider_id: doc.id })}
                  className={clsx(
                    "p-4 rounded-2xl border text-left flex items-center gap-3 transition-all",
                    formData.provider_id === doc.id
                      ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 text-xs">
                    Dr
                  </div>
                  <div>
                    <div className="font-extrabold text-sm">Dr. {doc.first_name} {doc.last_name}</div>
                    <div className="text-[11px] text-slate-500 font-medium">{doc.department_name || doc.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-3 rounded-2xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <button
              type="submit"
              className="bg-brand-600 text-white px-8 py-3.5 rounded-2xl text-sm font-bold hover:bg-brand-700 transition-all flex items-center gap-2 shadow-lg shadow-brand-500/20 hover:-translate-y-0.5"
            >
              Continue to Select Date & Time <ArrowRight size={18} />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: SCHEDULE & REASON */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-8 animate-in fade-in duration-300">
          <div className="border-b border-slate-100 pb-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              <Calendar size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Step 3: Appointment Date & Reason</h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Select your preferred date, time slot, and reason for consultation.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Preferred Date *</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Select Time Slot *</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setFormData({ ...formData, time: slot })}
                    className={clsx(
                      "py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1",
                      formData.time === slot
                        ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <Clock size={12} /> {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Reason for Visit / Symptoms *</label>
              <textarea
                required
                rows={3}
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Please describe your symptoms, medical concerns, or reason for requesting a consultation..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-2xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-600 text-white px-8 py-3.5 rounded-2xl text-sm font-bold hover:bg-brand-700 transition-all flex items-center gap-2 shadow-lg shadow-brand-500/20 hover:-translate-y-0.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Submitting Request...
                </>
              ) : (
                <>
                  Confirm & Book Appointment <ShieldCheck size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: CONFIRMATION VIEW */}
      {step === 4 && bookingResult && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 animate-bounce">
            <CheckCircle2 size={44} strokeWidth={2.5} />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold uppercase tracking-widest mb-2">
              Appointment Confirmed
            </div>
            <h2 className="text-3xl font-black text-slate-900">Booking Request Received!</h2>
            <p className="text-slate-500 max-w-md mx-auto font-medium text-sm">
              Your appointment request has been submitted successfully to <strong>{hospitalTitle}</strong>.
            </p>
          </div>

          {/* Reference Banner */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl max-w-md mx-auto space-y-1 shadow-lg">
            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-400">Booking Reference Code</span>
            <div className="text-2xl sm:text-3xl font-mono font-black tracking-wider text-white">
              #{bookingResult.bookingReference}
            </div>
            {bookingResult.fileNumber && (
              <p className="text-xs text-slate-400 pt-1 font-mono">Patient File #: {bookingResult.fileNumber}</p>
            )}
          </div>

          {/* Details Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left max-w-md mx-auto space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Patient Name</span>
              <span className="font-bold text-slate-900">{bookingResult.patientName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Date & Time</span>
              <span className="font-bold text-slate-900">
                {new Date(bookingResult.appointmentDate).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </span>
            </div>
            {bookingResult.providerName && (
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Physician</span>
                <span className="font-bold text-slate-900">{bookingResult.providerName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Facility</span>
              <span className="font-bold text-slate-900">{hospitalTitle}</span>
            </div>
          </div>

          {bookingResult.email && (
            <p className="text-xs text-slate-500 font-medium">
              A confirmation summary has been sent to <strong>{bookingResult.email}</strong>.
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => window.print()}
              className="px-6 py-3 rounded-2xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
            >
              <Printer size={16} /> Print Confirmation
            </button>

            <button
              onClick={() => {
                setBookingResult(null);
                // Keep personal details; only reset appointment-specific fields
                setFormData(prev => ({
                  ...prev,
                  department_id: '',
                  provider_id: '',
                  date: '',
                  time: '09:00',
                  reason: '',
                }));
                setStep(2);
              }}
              className="px-6 py-3 rounded-2xl text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 hover:bg-brand-100 transition-all flex items-center gap-2"
            >
              <HeartPulse size={16} /> Book Another Appointment
            </button>

            <Link
              href="/"
              className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all flex items-center gap-2 shadow-md shadow-slate-900/20"
            >
              <Home size={16} /> Return to Home Page
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
