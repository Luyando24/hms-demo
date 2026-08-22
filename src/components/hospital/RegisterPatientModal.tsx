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

        // Create consultation invoice
        await supabase.from('invoices').insert({
          patient_id: createdPatientId,
          total_amount: 150.0,
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
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Register New Patient</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Multi-step patient intake & census registration.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                  currentStep === 1
                    ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20'
                    : currentStep > 1
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    currentStep === 1
                      ? 'bg-white text-brand-600'
                      : currentStep > 1
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {currentStep > 1 ? <CheckCircle2 size={14} /> : '1'}
                </div>
                <span className="text-xs font-bold truncate">Personal Identity</span>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                  currentStep === 2
                    ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20'
                    : currentStep > 2
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    currentStep === 2
                      ? 'bg-white text-brand-600'
                      : currentStep > 2
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {currentStep > 2 ? <CheckCircle2 size={14} /> : '2'}
                </div>
                <span className="text-xs font-bold truncate">Contact & Address</span>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                  currentStep === 3
                    ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    currentStep === 3 ? 'bg-white text-brand-600' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  3
                </div>
                <span className="text-xs font-bold truncate">Insurance & Route</span>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <form
            id="registration-form"
            onSubmit={handleSubmit}
            className="p-6 sm:p-7 overflow-y-auto flex-1 space-y-6"
          >
            {stepError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold animate-in fade-in">
                ⚠️ {stepError}
              </div>
            )}

            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center gap-2 text-xs font-black text-brand-600 uppercase tracking-wider">
                  <User size={15} /> Step 1: Personal Demographic Details
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-700">
                      Patient File # (Optional - Auto-generated if blank)
                    </label>
                    <input
                      name="file_number"
                      type="text"
                      value={formData.file_number}
                      onChange={handleChange}
                      placeholder="e.g. HMS-P-12345"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">First Name *</label>
                    <input
                      name="first_name"
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="e.g. Mwansa"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Last Name *</label>
                    <input
                      name="last_name"
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="e.g. Banda"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Date of Birth *</label>
                    <input
                      name="dob"
                      type="date"
                      required
                      value={formData.dob}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Gender *</label>
                    <select
                      name="gender"
                      required
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center gap-2 text-xs font-black text-brand-600 uppercase tracking-wider">
                  <Phone size={15} /> Step 2: Contact Details & Emergency Reach
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Phone Number</label>
                    <input
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+260 97 1234567"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Email Address</label>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="patient@example.com"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-700">Residential Address</label>
                    <textarea
                      name="address"
                      rows={2}
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Plot / House No, Street, City / Area"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">
                      Emergency Contact Name
                    </label>
                    <input
                      name="emergency_contact_name"
                      type="text"
                      value={formData.emergency_contact_name}
                      onChange={handleChange}
                      placeholder="Next of Kin / Spouse"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">
                      Emergency Contact Phone
                    </label>
                    <input
                      name="emergency_contact_phone"
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={handleChange}
                      placeholder="+260 96 7654321"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                {/* Insurance Box */}
                <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-3">
                  <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={16} className="text-purple-600" /> Insurance & Payment Scheme
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-purple-700 uppercase mb-1 block">
                        Insurance Provider
                      </label>
                      <SearchableCombobox
                        name="insurance_provider"
                        value={formData.insurance_provider}
                        onChange={(val) =>
                          setFormData((prev) => ({ ...prev, insurance_provider: val }))
                        }
                        placeholder="Search or type provider..."
                        options={[
                          {
                            value: 'NHIMA',
                            label: 'NHIMA (National Health Insurance)',
                            badge: 'Public',
                          },
                          {
                            value: 'Madison Health',
                            label: 'Madison Health Insurance',
                            badge: 'Private',
                          },
                          {
                            value: 'Professional Life',
                            label: 'Professional Life Assurance',
                            badge: 'Private',
                          },
                          {
                            value: 'Sanlam Medical',
                            label: 'Sanlam Medical Insurance',
                            badge: 'Private',
                          },
                          {
                            value: 'Prudential Health',
                            label: 'Prudential Health',
                            badge: 'Private',
                          },
                          {
                            value: 'Liberty Health',
                            label: 'Liberty Health Cover',
                            badge: 'Regional',
                          },
                          {
                            value: 'Self-Pay',
                            label: 'Self-Pay / Cash Patient',
                            badge: 'Direct',
                          },
                        ]}
                        inputClassName="bg-white border-purple-200 focus:ring-purple-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-purple-700 uppercase block mb-1">
                        Policy Number
                      </label>
                      <input
                        name="insurance_policy_number"
                        type="text"
                        value={formData.insurance_policy_number}
                        onChange={handleChange}
                        placeholder="Policy / Card ID Number"
                        className="w-full px-4 py-2 bg-white border border-purple-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Immediate Patient Disposition & Routing */}
                <div className="pt-2 space-y-3">
                  <div>
                    <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Send size={14} className="text-brand-600" />
                      Post-Registration Queue & Routing *
                    </label>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Where should the patient proceed immediately after registration?
                    </p>
                  </div>

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
                            'p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 shadow-xs',
                            isSelected
                              ? 'border-brand-600 bg-brand-50/70 ring-2 ring-brand-500/20'
                              : 'border-slate-200 bg-white hover:bg-slate-50',
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div
                              className={clsx(
                                'w-7 h-7 rounded-xl flex items-center justify-center transition-colors',
                                isSelected
                                  ? 'bg-brand-600 text-white'
                                  : 'bg-slate-100 text-slate-500',
                              )}
                            >
                              <Icon size={14} />
                            </div>
                            {isSelected && (
                              <div className="w-3.5 h-3.5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                                <Check size={8} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-[11px] font-black text-slate-900 leading-tight">
                              {opt.label}
                            </div>
                            <div className="text-[9px] font-semibold text-slate-400 mt-0.5">
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
          <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4 shrink-0">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-white transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-white transition-colors"
              >
                Cancel
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="bg-brand-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/20 flex items-center gap-1.5"
              >
                Next Step <ArrowRight size={16} />
              </button>
            ) : (
              <button
                disabled={loading}
                type="submit"
                form="registration-form"
                className="bg-brand-600 text-white px-6 py-2.5 rounded-xl text-xs font-black hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  'Registering...'
                ) : (
                  <>
                    <Save size={16} /> Register & Route Patient <CornerDownRight size={14} />
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
