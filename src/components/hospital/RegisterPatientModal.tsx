'use client';

import { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  Shield,
  Save,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Activity,
  Stethoscope,
  CreditCard,
  Check,
  Send,
  CornerDownRight,
  ShieldCheck,
} from 'lucide-react';
import StatusModal from './StatusModal';
import { registerPatientAction } from '@/app/hospital/actions';
import { SearchableCombobox } from '../ui/SearchableCombobox';
import { createClient } from '@/utils/supabase/client';
import clsx from 'clsx';

type PatientNextAction = 'TRIAGE' | 'DOCTOR' | 'BILLING' | 'NONE';

export default function RegisterPatientModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [nextAction, setNextAction] = useState<PatientNextAction>('TRIAGE');
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const supabase = createClient();

  // Controlled Form State for smooth multi-step validation
  const [formData, setFormData] = useState({
    file_number: '',
    first_name: '',
    last_name: '',
    dob: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    insurance_provider: '',
    insurance_policy_number: '',
  });

  const [stepError, setStepError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setStepError(null);
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (
        !formData.first_name.trim() ||
        !formData.last_name.trim() ||
        !formData.dob ||
        !formData.gender
      ) {
        setStepError(
          'Please complete all required fields: First Name, Last Name, DOB, and Gender.',
        );
        return false;
      }
    }
    setStepError(null);
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev));
    }
  };

  const handleBack = () => {
    setStepError(null);
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    const patientPayload = {
      ...(formData.file_number.trim() ? { file_number: formData.file_number.trim() } : {}),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      dob: formData.dob,
      gender: formData.gender,
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      emergency_contact_name: formData.emergency_contact_name.trim(),
      emergency_contact_phone: formData.emergency_contact_phone.trim(),
      insurance_provider: formData.insurance_provider.trim(),
      insurance_policy_number: formData.insurance_policy_number.trim(),
    };

    const result = await registerPatientAction(patientPayload);

    if (!result.success || !result.patientId) {
      setStatus({
        type: 'error',
        title: 'Registration Failed',
        message: result.error || 'Could not register patient.',
      });
      setLoading(false);
      return;
    }

    const createdPatientId = result.patientId;
    const tokenNumber = `${Math.floor(100 + Math.random() * 900)}`;

    try {
      if (nextAction !== 'NONE') {
        const { data: depts } = await supabase.from('departments').select('id, name');
        const getDept = (k: string) =>
          depts?.find((d) => d.name.toLowerCase().includes(k.toLowerCase()))?.id || null;

        let deptId: string | null = null;
        let queueStatus = 'WAITING';
        let queueReason = 'OPD Nurse Triage';

        if (nextAction === 'TRIAGE') {
          deptId = getDept('nursing') || getDept('opd');
          queueStatus = 'WAITING';
          queueReason = 'OPD Nurse Triage & Vitals';
        } else if (nextAction === 'DOCTOR') {
          deptId = getDept('opd');
          queueStatus = 'TRIAGED';
          queueReason = 'Doctor Consultation';
        } else if (nextAction === 'BILLING') {
          deptId = getDept('billing');
          queueStatus = 'WAITING';
          queueReason = 'Consultation Fee Payment';
        }

        await supabase.from('walkin_queue').insert({
          patient_id: createdPatientId,
          department_id: deptId,
          status: queueStatus,
          priority: 'NORMAL',
          reason: queueReason,
          token_number: tokenNumber,
        });

        // Create consultation invoice using system configured fee
        const { data: settingsData } = await supabase
          .from('system_settings')
          .select('consultation_fee')
          .limit(1)
          .maybeSingle();

        const consultationFee = Number(settingsData?.consultation_fee) || 150.0;

        await supabase.from('invoices').insert({
          patient_id: createdPatientId,
          total_amount: consultationFee,
          status: 'UNPAID',
        });
      }

      const destText =
        nextAction === 'TRIAGE'
          ? `routed to Nurse Triage (Token #${tokenNumber})`
          : nextAction === 'DOCTOR'
          ? `queued for Doctor Consultation (Token #${tokenNumber})`
          : nextAction === 'BILLING'
          ? `directed to Billing / Cashier (Token #${tokenNumber})`
          : 'registered in hospital census';

      setStatus({
        type: 'success',
        title: 'Patient Registered & Routed',
        message: `${patientPayload.first_name} ${patientPayload.last_name} (${result.fileNumber}) was successfully registered and ${destText}.`,
      });
    } catch (err: any) {
      setStatus({
        type: 'success',
        title: 'Patient Registered',
        message: `${patientPayload.first_name} ${patientPayload.last_name} has been added to census records.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const nextActionOptions = [
    {
      id: 'TRIAGE' as PatientNextAction,
      label: 'Nurse Triage / Vitals',
      tag: 'Capture Vitals',
      icon: Activity,
    },
    {
      id: 'DOCTOR' as PatientNextAction,
      label: 'Doctor Consultation',
      tag: 'OPD Queue',
      icon: Stethoscope,
    },
    {
      id: 'BILLING' as PatientNextAction,
      label: 'Billing / Cashier',
      tag: 'Pay Fee First',
      icon: CreditCard,
    },
    {
      id: 'NONE' as PatientNextAction,
      label: 'Census Only',
      tag: 'No Active Queue',
      icon: User,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
          {/* Header & Step Wizard Bar */}
          <div className="p-5 border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Register New Patient</h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Patient intake, demographic details, and initial routing.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div
                className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                  currentStep === 1
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs font-semibold'
                    : currentStep > 1
                    ? 'bg-slate-100 border-slate-200 text-slate-800 font-medium'
                    : 'bg-white border-slate-200/80 text-slate-400 font-normal'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep === 1
                      ? 'bg-white/20 text-white'
                      : currentStep > 1
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {currentStep > 1 ? <CheckCircle2 size={12} /> : '1'}
                </div>
                <span className="text-xs truncate">1. Identity</span>
              </div>

              <div
                className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                  currentStep === 2
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs font-semibold'
                    : currentStep > 2
                    ? 'bg-slate-100 border-slate-200 text-slate-800 font-medium'
                    : 'bg-white border-slate-200/80 text-slate-400 font-normal'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep === 2
                      ? 'bg-white/20 text-white'
                      : currentStep > 2
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {currentStep > 2 ? <CheckCircle2 size={12} /> : '2'}
                </div>
                <span className="text-xs truncate">2. Contact</span>
              </div>

              <div
                className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                  currentStep === 3
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs font-semibold'
                    : 'bg-white border-slate-200/80 text-slate-400 font-normal'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep === 3 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  3
                </div>
                <span className="text-xs truncate">3. Route</span>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <form
            id="registration-form"
            onSubmit={handleSubmit}
            className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4"
          >
            {stepError && (
              <div className="p-3 bg-rose-50 border border-rose-200/60 rounded-xl text-rose-700 text-xs font-medium animate-in fade-in">
                ⚠️ {stepError}
              </div>
            )}

            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="space-y-3.5 animate-in fade-in slide-in-from-right-4 duration-150">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <User size={14} /> Step 1: Personal Demographic Details
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Patient File # (Optional - Auto-generated if blank)
                    </label>
                    <input
                      name="file_number"
                      type="text"
                      value={formData.file_number}
                      onChange={handleChange}
                      placeholder="e.g. HMS-P-12345"
                      className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">First Name *</label>
                    <input
                      name="first_name"
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="First name"
                      className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Last Name *</label>
                    <input
                      name="last_name"
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="Last name"
                      className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Date of Birth *</label>
                    <input
                      name="dob"
                      type="date"
                      required
                      value={formData.dob}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Gender *</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
              <div className="space-y-3.5 animate-in fade-in slide-in-from-right-4 duration-150">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Phone size={14} /> Step 2: Contact & Residential Details
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                    <input
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+260 970 000 000"
                      className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Email Address</label>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="patient@example.com"
                      className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-700">Residential Address</label>
                    <input
                      name="address"
                      type="text"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Plot / Street / City"
                      className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Emergency Contact Name</label>
                    <input
                      name="emergency_contact_name"
                      type="text"
                      value={formData.emergency_contact_name}
                      onChange={handleChange}
                      placeholder="Next of Kin / Relative"
                      className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Emergency Contact Phone</label>
                    <input
                      name="emergency_contact_phone"
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={handleChange}
                      placeholder="Phone number"
                      className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
              <div className="space-y-3.5 animate-in fade-in slide-in-from-right-4 duration-150">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <ShieldCheck size={14} /> Step 3: Insurance & Rapid Queue Routing
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Insurance Provider</label>
                    <input
                      name="insurance_provider"
                      type="text"
                      value={formData.insurance_provider}
                      onChange={handleChange}
                      placeholder="e.g. NHIMA, Madison, Self-Pay"
                      className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Insurance Policy Number</label>
                    <input
                      name="insurance_policy_number"
                      type="text"
                      value={formData.insurance_policy_number}
                      onChange={handleChange}
                      placeholder="Policy / Card ID"
                      className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                    <Send size={13} className="text-slate-600" />
                    Intake Routing Destination
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {nextActionOptions.map((opt) => {
                      const isSelected = nextAction === opt.id;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setNextAction(opt.id)}
                          className={clsx(
                            'p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 shadow-xs',
                            isSelected
                              ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                              : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-900',
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div
                              className={clsx(
                                'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-100 text-slate-600',
                              )}
                            >
                              <Icon size={13} />
                            </div>
                            {isSelected && (
                              <Check size={12} className="text-white" />
                            )}
                          </div>
                          <div>
                            <div className={clsx('text-[11px] font-bold leading-tight truncate', isSelected ? 'text-white' : 'text-slate-900')}>
                              {opt.label}
                            </div>
                            <div className={clsx('text-[9px] mt-0.5 truncate', isSelected ? 'text-slate-300' : 'text-slate-400')}>
                              {opt.tag}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Footer Controls */}
          <div className="p-4 px-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <ArrowLeft size={14} /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors shadow-xs"
              >
                Cancel
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
              >
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button
                disabled={loading}
                type="submit"
                form="registration-form"
                className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-98"
              >
                {loading ? (
                  'Registering...'
                ) : (
                  <>
                    <Save size={14} /> Register & Route
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <StatusModal
        isOpen={!!status}
        type={status?.type || 'success'}
        title={status?.title || ''}
        message={status?.message || ''}
        onClose={() => {
          const isSuccess = status?.type === 'success';
          setStatus(null);
          if (isSuccess) {
            onClose();
            onSuccess?.();
          }
        }}
      />
    </>
  );
}
