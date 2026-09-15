'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  DoorOpen,
  ShieldCheck,
  WifiOff,
  Copy,
  CheckCheck,
  Sparkles,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import StatusModal from './StatusModal';
import { registerPatientAction } from '@/app/hospital/actions';
import { SearchableCombobox } from '../ui/SearchableCombobox';
import { createClient } from '@/utils/supabase/client';
import { useFormDraft } from '@/hooks/useFormDraft';
import { FormDraftAlert } from '@/components/common/FormDraftAlert';
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
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [nextAction, setNextAction] = useState<PatientNextAction>('TRIAGE');
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [createdPatientCredentials, setCreatedPatientCredentials] = useState<{
    patientName: string;
    fileNumber: string;
    email: string;
    portalUrl: string;
    tokenNumber?: string;
    destText?: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const [adminProviders, setAdminProviders] = useState<string[]>([
    'NHIMA',
    'Prudential',
    'Sanlam',
    'Madison Health',
    'Professional Life',
    'Medland Direct',
  ]);
  const [facilityRooms, setFacilityRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [customInsuranceMode, setCustomInsuranceMode] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    async function loadInsuranceSettings() {
      try {
        const [{ data: settingsData }, { data: roomsData }] = await Promise.all([
          supabase
            .from('system_settings')
            .select('insurance_providers')
            .limit(1)
            .maybeSingle(),
          supabase
            .from('rooms')
            .select('id, name')
            .eq('is_active', true)
            .order('name', { ascending: true }),
        ]);

        if (
          settingsData?.insurance_providers &&
          Array.isArray(settingsData.insurance_providers) &&
          settingsData.insurance_providers.length > 0
        ) {
          setAdminProviders(settingsData.insurance_providers);
        }
        if (roomsData) {
          setFacilityRooms(roomsData);
        }
      } catch (e) {
        console.error('Error fetching registration references:', e);
      }
    }
    loadInsuranceSettings();
  }, []);

  const handleRestorePatient = (saved: any) => {
    if (!saved) return;
    setFormData((prev) => ({
      ...prev,
      ...saved,
      gender: saved.gender ? String(saved.gender).toUpperCase() : prev.gender,
    }));
    if (saved.insurance_provider && !['Self-Pay', 'NHIMA', 'Prudential', 'Sanlam', 'Madison Health', 'Professional Life', 'Medland Direct'].includes(saved.insurance_provider)) {
      setCustomInsuranceMode(true);
    }
  };

  const {
    hasDraft,
    draftTimestamp,
    restoreDraft,
    clearDraft,
    lastSavedAt,
  } = useFormDraft('patient_registration', formData, handleRestorePatient as any, {
    debounceMs: 300,
    isEnabled: isOpen,
  });

  const [stepError, setStepError] = useState<string | null>(null);

  if (!isOpen || !mounted) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const val = e.target.name === 'gender' ? e.target.value.toUpperCase() : e.target.value;
    setFormData((prev) => ({ ...prev, [e.target.name]: val }));
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
    if (step === 2) {
      if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        setStepError('Please enter a valid email address or leave it empty.');
        return false;
      }
    }
    if (step === 3) {
      if (customInsuranceMode && !formData.insurance_provider.trim()) {
        setStepError('Please enter the custom insurance provider name, or switch back to Self-Pay.');
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

  // Intercept Enter key inside the form so hitting Enter while typing never submits or skips fields
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      // Allow multi-line input in textareas
      if (e.target instanceof HTMLTextAreaElement) {
        return;
      }
      // Strictly prevent browser default form submit trigger
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleReviewClick = () => {
    // Validate all steps before opening confirmation
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }

    if (!validateStep(2)) {
      setCurrentStep(2);
      return;
    }

    if (!validateStep(3)) {
      return;
    }

    // Open explicit manual confirmation dialog
    setShowConfirmation(true);
  };

  const handleConfirmRegistration = async () => {
    // Guard: Prevent multiple concurrent submissions
    if (loading) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus({
        type: 'error',
        title: 'Offline Mode Active',
        message: 'Your patient registration draft is securely saved locally. Please wait until internet connection returns to finalize hospital census routing.',
      });
      return;
    }

    setLoading(true);
    const patientPayload = {
      ...(formData.file_number.trim() ? { file_number: formData.file_number.trim() } : {}),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      dob: formData.dob,
      gender: (formData.gender || '').toUpperCase(),
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
      setShowConfirmation(false);
      setStatus({
        type: 'error',
        title: 'Registration Failed',
        message: result.error || 'Could not register patient.',
      });
      setLoading(false);
      return;
    }

    // Clear auto-saved draft on confirmed success
    clearDraft();

    const createdPatientId = result.patientId;
    const tokenNumber = `${Math.floor(100 + Math.random() * 900)}`;

    try {
      if (nextAction !== 'NONE') {
        const { data: depts } = await supabase.from('departments').select('id, name');
        const getDept = (k: string) =>
          depts?.find((d: any) => d.name.toLowerCase().includes(k.toLowerCase()))?.id || null;

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
          room_id: (nextAction === 'TRIAGE' || nextAction === 'DOCTOR') ? (selectedRoomId || null) : null,
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

      const patientName = `${patientPayload.first_name} ${patientPayload.last_name}`;
      const portalUrl =
        result.portalUrl ||
        (typeof window !== 'undefined'
          ? `${window.location.origin}/patient/login`
          : '/patient/login');

      setShowConfirmation(false);
      setCreatedPatientCredentials({
        patientName,
        fileNumber: result.fileNumber || '',
        email: result.email || '',
        portalUrl,
        tokenNumber: nextAction !== 'NONE' ? tokenNumber : undefined,
        destText: nextAction !== 'NONE' ? destText : undefined,
      });
    } catch (err: any) {
      const patientName = `${patientPayload.first_name} ${patientPayload.last_name}`;
      const portalUrl =
        result.portalUrl ||
        (typeof window !== 'undefined'
          ? `${window.location.origin}/patient/login`
          : '/patient/login');

      setShowConfirmation(false);
      setCreatedPatientCredentials({
        patientName,
        fileNumber: result.fileNumber || '',
        email: result.email || '',
        portalUrl,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyAllCredentials = (creds: {
    patientName: string;
    fileNumber: string;
    email: string;
    portalUrl: string;
  }) => {
    const textToCopy = `🏥 HMS Patient Portal Access Credentials
------------------------------------------------
Patient Name: ${creds.patientName}
File Number: ${creds.fileNumber}
Login ID / Email: ${creds.email} (or use File Number: ${creds.fileNumber})
Portal Login URL: ${creds.portalUrl}

First-Time Access Instructions:
1. Open the portal URL: ${creds.portalUrl}
2. Click "First Time / Set Password".
3. Enter your File Number (${creds.fileNumber}) and Date of Birth to set your password and access your health records.
------------------------------------------------`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedField('all');
      setTimeout(() => setCopiedField(null), 3000);
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

  if (createdPatientCredentials) {
    return createPortal(
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
          {/* Header */}
          <div className="p-5 bg-emerald-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <CheckCircle2 size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold">Patient Registered Successfully</h2>
                <p className="text-xs text-emerald-100 font-medium">
                  {createdPatientCredentials.destText
                    ? `Routed & ${createdPatientCredentials.destText}`
                    : 'Saved to hospital census'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setCreatedPatientCredentials(null);
                onClose();
                onSuccess?.();
              }}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Patient Name
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {createdPatientCredentials.patientName}
                </p>
              </div>
              {createdPatientCredentials.tokenNumber && (
                <div className="px-3 py-1 bg-brand-50 border border-brand-200 rounded-xl text-center">
                  <span className="text-[9px] uppercase font-bold text-brand-600">Token</span>
                  <p className="text-sm font-black text-brand-900">
                    #{createdPatientCredentials.tokenNumber}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-brand-600" />
                  Portal Access Credentials
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Active
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {/* File Number */}
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/70">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">
                      FILE NUMBER (MRN)
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {createdPatientCredentials.fileNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdPatientCredentials.fileNumber);
                      setCopiedField('file');
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1"
                  >
                    {copiedField === 'file' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copiedField === 'file' ? 'Copied' : 'Copy'}
                  </button>
                </div>

                {/* Email / Login ID */}
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/70">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">
                      LOGIN EMAIL / ID
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {createdPatientCredentials.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdPatientCredentials.email);
                      setCopiedField('email');
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1"
                  >
                    {copiedField === 'email' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copiedField === 'email' ? 'Copied' : 'Copy'}
                  </button>
                </div>

                {/* Portal Login URL */}
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/70">
                  <div className="max-w-[280px] truncate">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      PATIENT PORTAL URL
                    </span>
                    <span className="font-mono text-slate-800 text-[11px] truncate block">
                      {createdPatientCredentials.portalUrl}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdPatientCredentials.portalUrl);
                      setCopiedField('url');
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1 shrink-0 ml-2"
                  >
                    {copiedField === 'url' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copiedField === 'url' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200/70 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                <strong>First-time Patient Login:</strong> The patient can navigate to the portal URL, select <em>"First Time / Set Password"</em>, and use their File Number & Date of Birth to set up their password.
              </div>
            </div>

            {/* Master Copy Button */}
            <button
              type="button"
              onClick={() => copyAllCredentials(createdPatientCredentials)}
              className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              {copiedField === 'all' ? (
                <>
                  <CheckCheck size={16} className="text-white" />
                  <span>✓ All Details Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>📋 Copy All Login Details (File #, URL & Email)</span>
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setCreatedPatientCredentials(null);
                onClose();
                onSuccess?.();
              }}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Done & Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
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
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onKeyDown={handleFormKeyDown}
            className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4"
          >
            {/* Offline & Form Draft Recovery Alert */}
            <FormDraftAlert
              hasDraft={hasDraft}
              draftTimestamp={draftTimestamp}
              onRestore={restoreDraft}
              onDiscard={clearDraft}
              lastSavedAt={lastSavedAt}
            />

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
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
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
                    <label className="text-xs font-semibold text-slate-700">Home Address</label>
                    <textarea
                      name="address"
                      rows={2}
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Residential address details"
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
                      placeholder="Contact name"
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
                
                {/* Insurance Provider Selector */}
                <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Insurance Provider / Payment Method
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomInsuranceMode(!customInsuranceMode)}
                      className="text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      {customInsuranceMode ? '📋 Choose from List' : '✏️ Type Custom Provider'}
                    </button>
                  </div>

                  {!customInsuranceMode ? (
                    <select
                      name="insurance_provider"
                      value={formData.insurance_provider}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setCustomInsuranceMode(true);
                          setFormData((prev) => ({ ...prev, insurance_provider: '' }));
                        } else {
                          handleChange(e);
                        }
                      }}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    >
                      <option value="">Select Insurance Provider (or Self-Pay)</option>
                      <option value="Self-Pay">Self-Pay / Cash</option>
                      <optgroup label="Registered Insurance Providers">
                        {adminProviders.map((provider) => (
                          <option key={provider} value={provider}>
                            {provider}
                          </option>
                        ))}
                      </optgroup>
                      <option value="__CUSTOM__">+ Other / Enter Custom Provider...</option>
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <input
                        name="insurance_provider"
                        type="text"
                        autoFocus
                        value={formData.insurance_provider}
                        onChange={handleChange}
                        placeholder="Type insurance provider name (e.g. Cigna, Bupa, Aetna)"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-medium">Quick Select:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, insurance_provider: 'Self-Pay' }));
                            setCustomInsuranceMode(false);
                          }}
                          className="text-[10px] font-bold text-slate-700 bg-slate-200/80 hover:bg-slate-300 px-2 py-0.5 rounded-md transition-colors"
                        >
                          Self-Pay
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Insurance Policy / Member Card # */}
                {formData.insurance_provider && formData.insurance_provider !== 'Self-Pay' && (
                  <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-1.5 animate-in fade-in">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CreditCard size={13} className="text-slate-600" />
                      Insurance Policy / Member Card # (Optional)
                    </label>
                    <input
                      name="insurance_policy_number"
                      type="text"
                      value={formData.insurance_policy_number}
                      onChange={handleChange}
                      placeholder="e.g. NHI-987654321 or Member Card ID"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                    />
                  </div>
                )}

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

                  {/* Room Assignment (Shown for Triage or Doctor Consultation) */}
                  {(nextAction === 'TRIAGE' || nextAction === 'DOCTOR') && facilityRooms.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-1.5 animate-in fade-in">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <DoorOpen size={13} className="text-slate-500" />
                        Assign Facility Room (Admin Configured - Optional)
                      </label>
                      <select
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                      >
                        <option value="">Auto-Assign / Default Room</option>
                        {facilityRooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
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
                type="button"
                onClick={handleReviewClick}
                className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-98"
              >
                <CheckCircle2 size={14} /> Review &amp; Confirm
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Explicit Manual Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-cyan-400">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 className="text-base font-bold">Confirm Patient Registration</h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Review and manually confirm before routing to census
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Confirmation Summary Body */}
            <div className="p-6 space-y-3.5 max-h-[65vh] overflow-y-auto">
              {/* Patient Basic Info */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Patient Demographics
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {formData.gender}
                  </span>
                </div>
                <div className="text-base font-black text-slate-900">
                  {formData.first_name} {formData.last_name}
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1 font-medium">
                  <span>DOB: <strong>{formData.dob}</strong></span>
                  {formData.phone && <span>Phone: <strong>{formData.phone}</strong></span>}
                  {formData.email && <span>Email: <strong>{formData.email}</strong></span>}
                </div>
                {formData.address && (
                  <div className="text-xs text-slate-500 pt-1 border-t border-slate-200/60 truncate">
                    📍 {formData.address}
                  </div>
                )}
              </div>

              {/* Insurance & Billing Method */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Insurance / Payment Method
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">
                    {formData.insurance_provider || 'Self-Pay / Cash'}
                  </span>
                  {formData.insurance_policy_number && (
                    <span className="text-xs font-mono font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      #{formData.insurance_policy_number}
                    </span>
                  )}
                </div>
              </div>

              {/* Routing Destination */}
              <div className="p-3.5 bg-cyan-50/60 border border-cyan-200/80 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">
                  Intake Routing Destination
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-cyan-950">
                    {nextActionOptions.find((o) => o.id === nextAction)?.label || nextAction}
                  </span>
                  {selectedRoomId && (
                    <span className="text-xs font-medium text-cyan-900 bg-white px-2 py-0.5 rounded-md border border-cyan-200">
                      Room: {facilityRooms.find((r) => r.id === selectedRoomId)?.name || 'Assigned Room'}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-2">
                <span>ℹ️ Please verify patient details above. Click <strong>Confirm &amp; Register Patient</strong> to complete registration.</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
                className="px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-xs"
              >
                ← Back to Edit
              </button>

              <button
                type="button"
                onClick={handleConfirmRegistration}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50 active:scale-98"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Confirm &amp; Register Patient</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </>,
    document.body
  );
}
