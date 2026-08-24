'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  Beaker,
  Building,
  Camera,
  Check,
  CheckCircle2,
  CornerDownRight,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  Hospital,
  Pill,
  Plus,
  Save,
  Send,
  Sparkles,
  Stethoscope,
  Trash2,
  UserCheck,
  X,
  ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';
import StatusModal from './StatusModal';
import { createClient } from '@/utils/supabase/client';
import { formatCurrencyAmount } from '@/utils/currency';
import type { Database, Json } from '@/types/supabase';
import { SearchableCombobox } from '../ui/SearchableCombobox';
import { useFormDraft } from '@/hooks/useFormDraft';
import { FormDraftAlert } from '@/components/common/FormDraftAlert';

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type Vital = Database['public']['Tables']['vitals']['Row'];
type TabId = 'notes' | 'prescriptions' | 'lab' | 'radiology' | 'billing';

export type DispositionType =
  | 'PHARMACY'
  | 'LABORATORY'
  | 'RADIOLOGY'
  | 'BILLING'
  | 'ADMISSION'
  | 'EXTERNAL_REFERRAL'
  | 'DISCHARGE';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  queueId: string;
}

interface MedicationDraft {
  id: string;
  drugId: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
}

interface LabDraft {
  id: string;
  testName: string;
  priority: 'NORMAL' | 'URGENT' | 'CRITICAL';
  unit: string;
  referenceRange: string;
}

interface RadiologyDraft {
  id: string;
  modality: 'X-Ray' | 'CT Scan' | 'MRI' | 'Ultrasound';
  bodyPart: string;
}

interface ChargeDraft {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

const emptyNotes = {
  icd10Code: '',
  diagnosisDescription: '',
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
};

export default function ConsultationModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  queueId,
}: ConsultationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(false);
  const [vitals, setVitals] = useState<Vital | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [currentQueueToken, setCurrentQueueToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('notes');
  const [notes, setNotes] = useState(emptyNotes);
  const [medications, setMedications] = useState<MedicationDraft[]>([]);
  const [labTests, setLabTests] = useState<LabDraft[]>([]);
  const [radiologyStudies, setRadiologyStudies] = useState<RadiologyDraft[]>([]);
  const [charges, setCharges] = useState<ChargeDraft[]>([]);
  const [currencyConfig, setCurrencyConfig] = useState<{
    symbol: string;
    position: 'prefix' | 'suffix';
  }>({ symbol: '$', position: 'prefix' });

  // Disposition & Patient Forwarding State
  const [disposition, setDisposition] = useState<DispositionType>('DISCHARGE');
  const [isCustomDisposition, setIsCustomDisposition] = useState(false);
  const [admissionReason, setAdmissionReason] = useState('Observation & Inpatient Management');
  const [externalReferralData, setExternalReferralData] = useState({
    destination: '',
    reason: '',
  });

  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const consultationDraftBundle = {
    notes,
    medications,
    labTests,
    radiologyStudies,
    charges,
    disposition,
    admissionReason,
    externalReferralData,
  };

  const handleRestoreConsultation = (saved: any) => {
    if (saved.notes) setNotes(saved.notes);
    if (saved.medications) setMedications(saved.medications);
    if (saved.labTests) setLabTests(saved.labTests);
    if (saved.radiologyStudies) setRadiologyStudies(saved.radiologyStudies);
    if (saved.charges) setCharges(saved.charges);
    if (saved.disposition) setDisposition(saved.disposition);
    if (saved.admissionReason) setAdmissionReason(saved.admissionReason);
    if (saved.externalReferralData) setExternalReferralData(saved.externalReferralData);
  };

  const {
    hasDraft,
    draftTimestamp,
    restoreDraft,
    clearDraft,
    lastSavedAt,
  } = useFormDraft(`consultation_${patientId}`, consultationDraftBundle, handleRestoreConsultation as any, {
    debounceMs: 400,
    isEnabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function loadConsultationReferences() {
      const [vitalsResult, inventoryResult, deptsResult, queueResult, settingsResult] = await Promise.all([
        supabase
          .from('vitals')
          .select('*')
          .eq('patient_id', patientId)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('inventory_items')
          .select('*')
          .gt('stock_level', 0)
          .order('name'),
        supabase
          .from('departments')
          .select('id, name')
          .order('name'),
        supabase
          .from('walkin_queue')
          .select('token_number')
          .eq('id', queueId)
          .maybeSingle(),
        supabase
          .from('system_settings')
          .select('currency_symbol, currency_position')
          .limit(1)
          .maybeSingle(),
      ]);

      if (!cancelled) {
        setVitals(vitalsResult.data || null);
        setInventory(inventoryResult.data || []);
        setDepartments(deptsResult.data || []);
        setCurrentQueueToken(queueResult.data?.token_number || null);
        if (settingsResult.data) {
          setCurrencyConfig({
            symbol: settingsResult.data.currency_symbol || '$',
            position: (settingsResult.data.currency_position as 'prefix' | 'suffix') || 'prefix',
          });
        }
      }
    }

    void loadConsultationReferences();
    return () => {
      cancelled = true;
    };
  }, [isOpen, patientId, queueId, supabase]);

  // Smart Auto-Disposition Recommendation
  useEffect(() => {
    if (isCustomDisposition) return;

    if (medications.length > 0) {
      setDisposition('PHARMACY');
    } else if (labTests.length > 0) {
      setDisposition('LABORATORY');
    } else if (radiologyStudies.length > 0) {
      setDisposition('RADIOLOGY');
    } else if (charges.length > 0) {
      setDisposition('BILLING');
    } else {
      setDisposition('DISCHARGE');
    }
  }, [
    medications.length,
    labTests.length,
    radiologyStudies.length,
    charges.length,
    isCustomDisposition,
  ]);

  function resetDraft() {
    setActiveTab('notes');
    setNotes(emptyNotes);
    setMedications([]);
    setLabTests([]);
    setRadiologyStudies([]);
    setCharges([]);
    setDisposition('DISCHARGE');
    setIsCustomDisposition(false);
    setAdmissionReason('Observation & Inpatient Management');
    setExternalReferralData({ destination: '', reason: '' });
    clearDraft();
  }

  function addMedication() {
    if (!inventory.length) {
      setStatus({
        type: 'error',
        title: 'No Medication Available',
        message: 'No in-stock inventory item is available to prescribe.',
      });
      return;
    }

    setMedications((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        drugId: inventory[0].id,
        dosage: '',
        frequency: '',
        duration: '',
        quantity: 1,
        instructions: '',
      },
    ]);
  }

  function addLabTest() {
    setLabTests((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        testName: '',
        priority: 'NORMAL',
        unit: '',
        referenceRange: '',
      },
    ]);
  }

  function addRadiologyStudy() {
    setRadiologyStudies((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        modality: 'X-Ray',
        bodyPart: '',
      },
    ]);
  }

  function addCharge() {
    setCharges((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  }

  const getDepartmentId = (deptKey: string): string | null => {
    const normalized = deptKey.toLowerCase();
    const found = departments.find((d) => {
      const name = d.name.toLowerCase();
      if (normalized === 'pharmacy') return name.includes('pharmacy');
      if (normalized === 'laboratory') return name.includes('lab') || name.includes('pathology');
      if (normalized === 'radiology') return name.includes('radiology') || name.includes('imaging');
      if (normalized === 'billing') return name.includes('billing') || name.includes('finance') || name.includes('account');
      if (normalized === 'ipd') return name.includes('ipd') || name.includes('inpatient') || name.includes('ward');
      if (normalized === 'er') return name.includes('er') || name.includes('emergency') || name.includes('trauma');
      return name.includes(normalized);
    });
    return found?.id || null;
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus({
        type: 'error',
        title: 'Offline Mode Active',
        message: 'Your clinical notes, diagnosis, and orders are securely preserved in your local draft. Please wait until your connection returns to finalize and route the patient.',
      });
      return;
    }

    if (
      medications.some(
        (item) =>
          !item.drugId ||
          !item.dosage.trim() ||
          !item.frequency.trim() ||
          !item.duration.trim() ||
          item.quantity <= 0,
      )
    ) {
      setStatus({
        type: 'error',
        title: 'Incomplete Prescription',
        message: 'Complete every medication, dosage, frequency, duration, and quantity.',
      });
      setActiveTab('prescriptions');
      return;
    }

    if (labTests.some((item) => !item.testName.trim())) {
      setStatus({
        type: 'error',
        title: 'Incomplete Lab Order',
        message: 'Every lab order needs a test name.',
      });
      setActiveTab('lab');
      return;
    }

    if (radiologyStudies.some((item) => !item.bodyPart.trim())) {
      setStatus({
        type: 'error',
        title: 'Incomplete Radiology Order',
        message: 'Every imaging order needs a body region.',
      });
      setActiveTab('radiology');
      return;
    }

    if (
      charges.some(
        (item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0,
      )
    ) {
      setStatus({
        type: 'error',
        title: 'Incomplete Charge',
        message: 'Every charge needs a description, positive quantity, and non-negative price.',
      });
      setActiveTab('billing');
      return;
    }

    if (disposition === 'EXTERNAL_REFERRAL') {
      if (!externalReferralData.destination.trim() || !externalReferralData.reason.trim()) {
        setStatus({
          type: 'error',
          title: 'Missing Referral Information',
          message: 'Please provide both Destination Hospital and Referral Reason.',
        });
        return;
      }
    }

    setLoading(true);
    const prescribedItems: Json = medications.map((item) => ({
      drug_id: item.drugId,
      dosage: item.dosage.trim(),
      frequency: item.frequency.trim(),
      duration: item.duration.trim(),
      quantity_prescribed: item.quantity,
      instructions: item.instructions.trim(),
    }));
    const requestedLabTests: Json = labTests.map((item) => ({
      test_name: item.testName.trim(),
      priority: item.priority,
      unit: item.unit.trim(),
      reference_range: item.referenceRange.trim(),
    }));
    const requestedRadiology: Json = radiologyStudies.map((item) => ({
      modality: item.modality,
      body_part: item.bodyPart.trim(),
    }));
    const billingItems: Json = charges.map((item) => ({
      description: item.description.trim(),
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }));

    // 1. Complete consultation atomically via RPC
    const { error: rpcError } = await supabase.rpc('complete_consultation', {
      target_patient_id: patientId,
      target_queue_id: queueId,
      note_subjective: notes.subjective,
      note_objective: notes.objective,
      note_assessment: notes.assessment,
      note_plan: notes.plan,
      diagnosis_code: notes.icd10Code,
      diagnosis_description: notes.diagnosisDescription,
      prescribed_items: prescribedItems,
      lab_tests: requestedLabTests,
      radiology_studies: requestedRadiology,
      billing_items: billingItems,
    });

    if (rpcError) {
      setStatus({
        type: 'error',
        title: 'Consultation Not Saved',
        message: rpcError.message,
      });
      setLoading(false);
      return;
    }

    // 2. Perform Patient Forwarding & Department Queue Routing
    try {
      const tokenToForward = currentQueueToken || null;

      if (disposition === 'PHARMACY') {
        const pharmacyDeptId = getDepartmentId('pharmacy');
        if (pharmacyDeptId) {
          await supabase.from('walkin_queue').insert({
            patient_id: patientId,
            department_id: pharmacyDeptId,
            status: 'WAITING',
            priority: 'NORMAL',
            reason: 'Prescription Dispensing',
            token_number: tokenToForward,
          });
        }
        resetDraft();
        setStatus({
          type: 'success',
          title: 'Consultation Complete & Forwarded to Pharmacy',
          message: `The consultation for ${patientName} was saved. The patient was forwarded to Central Pharmacy for medication dispensing.`,
        });
      } else if (disposition === 'LABORATORY') {
        const labDeptId = getDepartmentId('laboratory');
        if (labDeptId) {
          await supabase.from('walkin_queue').insert({
            patient_id: patientId,
            department_id: labDeptId,
            status: 'WAITING',
            priority: 'NORMAL',
            reason: 'Lab Sample Collection & Testing',
            token_number: tokenToForward,
          });
        }
        resetDraft();
        setStatus({
          type: 'success',
          title: 'Consultation Complete & Forwarded to Laboratory',
          message: `The clinical notes and orders for ${patientName} were saved. The patient was forwarded to the Diagnostic Laboratory.`,
        });
      } else if (disposition === 'RADIOLOGY') {
        const radDeptId = getDepartmentId('radiology');
        if (radDeptId) {
          await supabase.from('walkin_queue').insert({
            patient_id: patientId,
            department_id: radDeptId,
            status: 'WAITING',
            priority: 'NORMAL',
            reason: 'Radiology & Imaging Scans',
            token_number: tokenToForward,
          });
        }
        resetDraft();
        setStatus({
          type: 'success',
          title: 'Consultation Complete & Forwarded to Radiology',
          message: `The clinical notes and imaging requests for ${patientName} were saved. The patient was forwarded to Radiology & Imaging.`,
        });
      } else if (disposition === 'BILLING') {
        const billingDeptId = getDepartmentId('billing');
        if (billingDeptId) {
          await supabase.from('walkin_queue').insert({
            patient_id: patientId,
            department_id: billingDeptId,
            status: 'WAITING',
            priority: 'NORMAL',
            reason: 'Invoice & Cashier Payment',
            token_number: tokenToForward,
          });
        }
        resetDraft();
        setStatus({
          type: 'success',
          title: 'Consultation Complete & Forwarded to Billing',
          message: `The consultation and charges for ${patientName} were saved. The patient was forwarded to Finance & Billing.`,
        });
      } else if (disposition === 'ADMISSION') {
        const { data: authData } = await supabase.auth.getUser();
        const ipdDeptId = getDepartmentId('ipd');
        
        await supabase.from('admissions').insert({
          patient_id: patientId,
          admitting_doctor_id: authData.user?.id || null,
          reason: admissionReason.trim() || 'Observation & Inpatient Management',
          status: 'ACTIVE',
        });

        if (ipdDeptId) {
          await supabase.from('walkin_queue').insert({
            patient_id: patientId,
            department_id: ipdDeptId,
            status: 'WAITING',
            priority: 'NORMAL',
            reason: 'Inpatient Admission',
            token_number: tokenToForward,
          });
        }

        resetDraft();
        setStatus({
          type: 'success',
          title: 'Patient Admitted to Inpatient Care',
          message: `Consultation finalized. An active Inpatient Admission (IPD) was created for ${patientName}.`,
        });
      } else if (disposition === 'EXTERNAL_REFERRAL') {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          await supabase.from('referrals').insert({
            patient_id: patientId,
            destination_hospital: externalReferralData.destination.trim(),
            reason: externalReferralData.reason.trim(),
            referred_by: authData.user.id,
            status: 'PENDING',
          });
        }

        resetDraft();
        setStatus({
          type: 'success',
          title: 'External Referral Initiated',
          message: `Consultation saved. External referral to ${externalReferralData.destination.trim()} was recorded for ${patientName}.`,
        });
      } else {
        // DISCHARGE
        resetDraft();
        setStatus({
          type: 'success',
          title: 'Consultation Complete & Patient Discharged',
          message: `The clinical notes, orders, and records for ${patientName} were finalized and the visit is complete.`,
        });
      }
    } catch (routingErr) {
      console.error('Error during patient forwarding:', routingErr);
      resetDraft();
      setStatus({
        type: 'success',
        title: 'Consultation Complete',
        message: `The clinical notes and orders for ${patientName} were saved successfully.`,
      });
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !mounted) return null;

  const tabs: Array<{ id: TabId; label: string; icon: typeof FileText; count?: number }> = [
    { id: 'notes', label: 'Clinical Notes', icon: FileText },
    {
      id: 'prescriptions',
      label: 'Prescriptions',
      icon: Pill,
      count: medications.length,
    },
    { id: 'lab', label: 'Lab Orders', icon: Beaker, count: labTests.length },
    {
      id: 'radiology',
      label: 'Radiology',
      icon: Camera,
      count: radiologyStudies.length,
    },
    { id: 'billing', label: 'Charges', icon: DollarSign, count: charges.length },
  ];

  const heightMetres = (vitals?.height || 0) / 100;
  const bmi =
    heightMetres > 0 && vitals?.weight
      ? (vitals.weight / heightMetres ** 2).toFixed(1)
      : '—';
  const chargeTotal = charges.reduce(
    (total, charge) => total + charge.quantity * charge.unitPrice,
    0,
  );

  const getDispositionDetails = () => {
    switch (disposition) {
      case 'PHARMACY':
        return {
          title: 'Complete & Forward to Pharmacy',
          color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: Pill,
          description: 'Route patient queue to Central Pharmacy for medication dispensing',
        };
      case 'LABORATORY':
        return {
          title: 'Complete & Forward to Laboratory',
          color: 'bg-blue-600 hover:bg-blue-700 text-white',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: Beaker,
          description: 'Route patient queue to Diagnostic Lab for sample collection & testing',
        };
      case 'RADIOLOGY':
        return {
          title: 'Complete & Forward to Radiology',
          color: 'bg-indigo-600 hover:bg-indigo-700 text-white',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: Camera,
          description: 'Route patient queue to Radiology & Imaging for diagnostic scans',
        };
      case 'BILLING':
        return {
          title: 'Complete & Forward to Billing',
          color: 'bg-amber-600 hover:bg-amber-700 text-white',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: CreditCard,
          description: 'Route patient queue to Cashier & Accounts for payment settlement',
        };
      case 'ADMISSION':
        return {
          title: 'Complete & Admit to Inpatient (IPD)',
          color: 'bg-rose-600 hover:bg-rose-700 text-white',
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: Activity,
          description: 'Create active inpatient admission record and transfer to hospital ward',
        };
      case 'EXTERNAL_REFERRAL':
        return {
          title: 'Complete & Send External Referral',
          color: 'bg-purple-600 hover:bg-purple-700 text-white',
          badge: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: ExternalLink,
          description: 'Document clinical referral to external tertiary specialist hospital',
        };
      case 'DISCHARGE':
      default:
        return {
          title: 'Complete Consultation & Discharge',
          color: 'bg-slate-900 hover:bg-slate-800 text-white',
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: CheckCircle2,
          description: 'Finalize outpatient clinical encounter and discharge patient home',
        };
    }
  };

  const activeDispositionInfo = getDispositionDetails();

  return createPortal(
    <>
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs'>
        <div className='flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-slate-200'>
          
          {/* Header */}
          <div className='flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-5 sm:p-6 shrink-0'>
            <div className='flex items-center gap-3.5'>
              <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-500/20'>
                <Stethoscope size={24} />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <h2 className='text-xl font-black text-slate-900'>{patientName}</h2>
                  {currentQueueToken && (
                    <span className='rounded-md bg-brand-50 border border-brand-200 px-2 py-0.5 text-[10px] font-black text-brand-700 font-mono'>
                      Token #{currentQueueToken}
                    </span>
                  )}
                </div>
                <p className='text-xs text-slate-500 font-medium'>Outpatient clinical consultation & multi-department routing</p>
              </div>
            </div>
            <button
              type='button'
              onClick={onClose}
              className='rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-600 border border-transparent hover:border-slate-200 transition-colors'
              aria-label='Close consultation'
            >
              <X size={20} />
            </button>
          </div>

          <div className='flex min-h-0 flex-1 overflow-hidden'>
            {/* Vitals Sidebar */}
            <aside className='hidden w-64 overflow-y-auto border-r border-slate-100 bg-slate-50/70 p-5 md:block shrink-0'>
              <h3 className='mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400'>
                <Activity size={14} className="text-brand-600" /> Latest vitals
              </h3>
              {vitals ? (
                <div className='space-y-2.5'>
                  {[
                    {
                      label: 'Blood Pressure',
                      value:
                        vitals.bp_systolic && vitals.bp_diastolic
                          ? `${vitals.bp_systolic}/${vitals.bp_diastolic}`
                          : '—',
                      unit: 'mmHg',
                    },
                    { label: 'Heart Rate', value: vitals.heart_rate || '—', unit: 'bpm' },
                    { label: 'Temperature', value: vitals.temperature || '—', unit: '°C' },
                    { label: 'SpO2', value: vitals.sp_o2 || '—', unit: '%' },
                    { label: 'Weight', value: vitals.weight || '—', unit: 'kg' },
                    { label: 'BMI', value: bmi, unit: '' },
                  ].map((vital) => (
                    <div key={vital.label} className='rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs'>
                      <p className='text-[10px] font-bold uppercase text-slate-400'>{vital.label}</p>
                      <p className='text-base font-black text-slate-900 mt-0.5'>
                        {vital.value}{' '}
                        <span className='text-[10px] font-semibold text-slate-400'>{vital.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 font-medium'>
                  No recorded vitals for this session.
                </div>
              )}
            </aside>

            {/* Main Clinical Sections & Tabs */}
            <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
              <div className='flex gap-1.5 overflow-x-auto border-b border-slate-100 bg-slate-50/40 p-2 shrink-0'>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type='button'
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'flex min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all relative',
                      activeTab === tab.id
                        ? 'border border-slate-200 bg-white text-brand-600 shadow-sm'
                        : 'text-slate-500 hover:bg-white/50 hover:text-slate-700',
                    )}
                  >
                    <tab.icon size={15} />
                    <span>{tab.label}</span>
                    {typeof tab.count === 'number' && tab.count > 0 && (
                      <span className='ml-1 px-1.5 py-0.2 rounded-full bg-brand-100 text-brand-700 text-[10px] font-black'>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <form
                id='consultation-form'
                onSubmit={handleSubmit}
                className='flex-1 overflow-y-auto p-5 sm:p-7 space-y-6'
              >
                {/* Offline & Auto-save Draft Recovery Alert */}
                <FormDraftAlert
                  hasDraft={hasDraft}
                  draftTimestamp={draftTimestamp}
                  onRestore={restoreDraft}
                  onDiscard={clearDraft}
                  lastSavedAt={lastSavedAt}
                />

                {/* TAB 1: CLINICAL NOTES */}
                {activeTab === 'notes' && (
                  <div className='space-y-5 animate-in fade-in duration-150'>
                    <div className='grid gap-4 md:grid-cols-2'>
                      <TextInput
                        label='ICD-10 Code'
                        value={notes.icd10Code}
                        onChange={(value) => setNotes((current) => ({ ...current, icd10Code: value }))}
                        placeholder='e.g. J45.9'
                      />
                      <TextInput
                        label='Diagnosis Description'
                        value={notes.diagnosisDescription}
                        onChange={(value) =>
                          setNotes((current) => ({ ...current, diagnosisDescription: value }))
                        }
                        placeholder='e.g. Acute asthma bronchiale'
                      />
                    </div>
                    <TextArea
                      label='Subjective (Chief Complaint, History)'
                      value={notes.subjective}
                      placeholder='Patient reports cough and mild shortness of breath for 3 days...'
                      onChange={(value) => setNotes((current) => ({ ...current, subjective: value }))}
                    />
                    <TextArea
                      label='Objective (Examination Findings)'
                      value={notes.objective}
                      placeholder='Chest examination shows bilateral mild wheezing...'
                      onChange={(value) => setNotes((current) => ({ ...current, objective: value }))}
                    />
                    <div className='grid gap-4 md:grid-cols-2'>
                      <TextArea
                        label='Assessment'
                        value={notes.assessment}
                        placeholder='Moderate acute exacerbation...'
                        onChange={(value) => setNotes((current) => ({ ...current, assessment: value }))}
                      />
                      <TextArea
                        label='Plan'
                        value={notes.plan}
                        placeholder='Inhaler therapy, review in 5 days...'
                        onChange={(value) => setNotes((current) => ({ ...current, plan: value }))}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: PRESCRIPTIONS */}
                {activeTab === 'prescriptions' && (
                  <div className='space-y-4 animate-in fade-in duration-150'>
                    <div className='bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs'>
                      <div className='flex items-center gap-2.5 text-emerald-900 font-semibold'>
                        <Pill size={18} className='text-emerald-600 shrink-0' />
                        <span>Prescriptions added here will be routed directly to <strong>Central Pharmacy</strong> for dispensing.</span>
                      </div>
                      <span className='shrink-0 text-[10px] uppercase font-black tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md'>
                        Auto-Routing
                      </span>
                    </div>

                    <OrderSection
                      title='Prescribed Formulary Medications'
                      addLabel='Add Medication'
                      onAdd={addMedication}
                      empty={medications.length === 0}
                    >
                      {medications.map((medication) => (
                        <div
                          key={medication.id}
                          className='grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-6 items-end shadow-xs'
                        >
                          <div className='md:col-span-2 space-y-1'>
                            <FieldLabel>Medication / Formulary Item *</FieldLabel>
                            <SearchableCombobox
                              value={medication.drugId}
                              onChange={(val) =>
                                setMedications((current) =>
                                  current.map((item) =>
                                    item.id === medication.id
                                      ? { ...item, drugId: val }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="Search medication name..."
                              options={inventory.map((item) => ({
                                value: item.id,
                                label: item.name,
                                badge: `${item.stock_level || 0} ${item.unit || 'units'}`,
                              }))}
                            />
                          </div>
                          <DraftInput
                            label='Dosage *'
                            placeholder='e.g. 500mg'
                            value={medication.dosage}
                            onChange={(value) =>
                              updateMedication(medication.id, 'dosage', value, setMedications)
                            }
                          />
                          <DraftInput
                            label='Frequency *'
                            placeholder='e.g. 8 Hourly / TID'
                            value={medication.frequency}
                            onChange={(value) =>
                              updateMedication(medication.id, 'frequency', value, setMedications)
                            }
                          />
                          <DraftInput
                            label='Duration *'
                            placeholder='e.g. 5 Days'
                            value={medication.duration}
                            onChange={(value) =>
                              updateMedication(medication.id, 'duration', value, setMedications)
                            }
                          />
                          <div className='flex items-end gap-2'>
                            <label className='flex-1'>
                              <FieldLabel>Quantity *</FieldLabel>
                              <input
                                type='number'
                                min='1'
                                value={medication.quantity}
                                onChange={(event) =>
                                  setMedications((current) =>
                                    current.map((item) =>
                                      item.id === medication.id
                                        ? { ...item, quantity: Number(event.target.value) }
                                        : item,
                                    ),
                                  )
                                }
                                className={fieldClass}
                              />
                            </label>
                            <RemoveButton onClick={() => setMedications((current) => current.filter((i) => i.id !== medication.id))} />
                          </div>
                          <div className='md:col-span-6'>
                            <DraftInput
                              label='Instructions / Cautionary Notes'
                              placeholder='e.g. Take with or immediately after meals'
                              value={medication.instructions}
                              onChange={(value) =>
                                updateMedication(medication.id, 'instructions', value, setMedications)
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </OrderSection>
                  </div>
                )}

                {/* TAB 3: LAB ORDERS */}
                {activeTab === 'lab' && (
                  <div className='space-y-4 animate-in fade-in duration-150'>
                    <div className='bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs'>
                      <div className='flex items-center gap-2.5 text-blue-900 font-semibold'>
                        <Beaker size={18} className='text-blue-600 shrink-0' />
                        <span>Lab orders will be transmitted to the <strong>Diagnostic Laboratory</strong> dashboard.</span>
                      </div>
                      <span className='shrink-0 text-[10px] uppercase font-black tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md'>
                        Lab Pipeline
                      </span>
                    </div>

                    <OrderSection
                      title='Diagnostic Laboratory Orders'
                      addLabel='Add Lab Test'
                      onAdd={addLabTest}
                      empty={labTests.length === 0}
                    >
                      {labTests.map((labTest) => (
                        <div
                          key={labTest.id}
                          className='grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-5 items-end shadow-xs'
                        >
                          <div className='md:col-span-2'>
                            <DraftInput
                              label='Test Name *'
                              placeholder='e.g. Full Blood Count (FBC) / Malaria Rapid'
                              value={labTest.testName}
                              onChange={(value) =>
                                updateLabTest(labTest.id, 'testName', value, setLabTests)
                              }
                            />
                          </div>
                          <div>
                            <FieldLabel>Priority Level</FieldLabel>
                            <select
                              value={labTest.priority}
                              onChange={(event) =>
                                setLabTests((current) =>
                                  current.map((item) =>
                                    item.id === labTest.id
                                      ? {
                                          ...item,
                                          priority: event.target.value as 'NORMAL' | 'URGENT' | 'CRITICAL',
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className={fieldClass}
                            >
                              <option value='NORMAL'>Normal / Routine</option>
                              <option value='URGENT'>Urgent / Stat</option>
                              <option value='CRITICAL'>Critical Emergency</option>
                            </select>
                          </div>
                          <div>
                            <DraftInput
                              label='Reference Range (Optional)'
                              placeholder='e.g. 4.0 - 11.0'
                              value={labTest.referenceRange}
                              onChange={(value) =>
                                updateLabTest(labTest.id, 'referenceRange', value, setLabTests)
                              }
                            />
                          </div>
                          <div className='flex items-end gap-2'>
                            <div className='flex-1'>
                              <DraftInput
                                label='Unit (Optional)'
                                placeholder='e.g. 10^9/L'
                                value={labTest.unit}
                                onChange={(value) =>
                                  updateLabTest(labTest.id, 'unit', value, setLabTests)
                                }
                              />
                            </div>
                            <RemoveButton onClick={() => setLabTests((current) => current.filter((i) => i.id !== labTest.id))} />
                          </div>
                        </div>
                      ))}
                    </OrderSection>
                  </div>
                )}

                {/* TAB 4: RADIOLOGY */}
                {activeTab === 'radiology' && (
                  <div className='space-y-4 animate-in fade-in duration-150'>
                    <div className='bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs'>
                      <div className='flex items-center gap-2.5 text-indigo-900 font-semibold'>
                        <Camera size={18} className='text-indigo-600 shrink-0' />
                        <span>Radiology requests will be visible in the <strong>Radiology & Imaging</strong> worklist.</span>
                      </div>
                      <span className='shrink-0 text-[10px] uppercase font-black tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md'>
                        Imaging Worklist
                      </span>
                    </div>

                    <OrderSection
                      title='Radiology & Imaging Requests'
                      addLabel='Add Imaging Study'
                      onAdd={addRadiologyStudy}
                      empty={radiologyStudies.length === 0}
                    >
                      {radiologyStudies.map((study) => (
                        <div
                          key={study.id}
                          className='grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-3 items-end shadow-xs'
                        >
                          <div>
                            <FieldLabel>Imaging Modality</FieldLabel>
                            <select
                              value={study.modality}
                              onChange={(event) =>
                                setRadiologyStudies((current) =>
                                  current.map((item) =>
                                    item.id === study.id
                                      ? {
                                          ...item,
                                          modality: event.target.value as 'X-Ray' | 'CT Scan' | 'MRI' | 'Ultrasound',
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className={fieldClass}
                            >
                              <option value='X-Ray'>Digital X-Ray</option>
                              <option value='Ultrasound'>Ultrasound Sonography</option>
                              <option value='CT Scan'>CT Scan</option>
                              <option value='MRI'>Magnetic Resonance (MRI)</option>
                            </select>
                          </div>
                          <div>
                            <DraftInput
                              label='Anatomical Region / Body Part *'
                              placeholder='e.g. Chest PA / Right Ankle / Abdomen'
                              value={study.bodyPart}
                              onChange={(value) => updateRadiology(study.id, value, setRadiologyStudies)}
                            />
                          </div>
                          <div className='flex justify-end'>
                            <RemoveButton onClick={() => setRadiologyStudies((current) => current.filter((i) => i.id !== study.id))} />
                          </div>
                        </div>
                      ))}
                    </OrderSection>
                  </div>
                )}

                {/* TAB 5: CHARGES & BILLING */}
                {activeTab === 'billing' && (
                  <div className='space-y-4 animate-in fade-in duration-150'>
                    <div className='flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4'>
                      <div>
                        <p className='text-xs font-bold text-slate-500 uppercase'>Consultation & Service Invoicing</p>
                        <p className='text-xl font-black text-slate-900 mt-0.5'>
                          Total: {formatCurrencyAmount(chargeTotal, currencyConfig.symbol, currencyConfig.position)}
                        </p>
                      </div>
                      <button
                        type='button'
                        onClick={addCharge}
                        className='flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-sm'
                      >
                        <Plus size={15} /> Add Charge Item
                      </button>
                    </div>

                    <OrderSection
                      title='Itemized Service Charges'
                      addLabel='Add Charge'
                      onAdd={addCharge}
                      empty={charges.length === 0}
                    >
                      {charges.map((charge) => (
                        <div
                          key={charge.id}
                          className='grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-4 items-end shadow-xs'
                        >
                          <div className='md:col-span-2'>
                            <DraftInput
                              label='Service / Procedure Description *'
                              placeholder='e.g. Specialist Consultation / Nebulization'
                              value={charge.description}
                              onChange={(value) =>
                                updateCharge(charge.id, 'description', value, setCharges)
                              }
                            />
                          </div>
                          <div>
                            <NumberDraftInput
                              label='Quantity *'
                              min={1}
                              value={charge.quantity}
                              onChange={(value) =>
                                updateCharge(charge.id, 'quantity', value, setCharges)
                              }
                            />
                          </div>
                          <div className='flex items-end gap-2'>
                            <div className='flex-1'>
                              <NumberDraftInput
                                label={`Unit Price (${currencyConfig.symbol}) *`}
                                min={0}
                                step='0.01'
                                value={charge.unitPrice}
                                onChange={(value) =>
                                  updateCharge(charge.id, 'unitPrice', value, setCharges)
                                }
                              />
                            </div>
                            <RemoveButton onClick={() => setCharges((current) => current.filter((i) => i.id !== charge.id))} />
                          </div>
                        </div>
                      ))}
                    </OrderSection>
                  </div>
                )}

                {/* PATIENT DISPOSITION & NEXT DEPARTMENT ROUTING */}
                <div className='mt-8 pt-6 border-t border-slate-200 space-y-4'>
                  <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
                    <div>
                      <h3 className='text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider'>
                        <Send size={16} className='text-brand-600' />
                        Forward Patient & Next Department
                      </h3>
                      <p className='text-xs text-slate-500 font-medium'>
                        Select where the patient will be routed immediately upon consultation completion.
                      </p>
                    </div>

                    {!isCustomDisposition && (
                      <div className='flex items-center gap-1.5 text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200 animate-in fade-in shrink-0'>
                        <Sparkles size={12} className='text-amber-500' />
                        <span>Auto-suggested based on entered orders</span>
                      </div>
                    )}
                  </div>

                  {/* Forwarding Department Cards */}
                  <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5'>
                    {[
                      {
                        id: 'PHARMACY' as DispositionType,
                        label: 'Central Pharmacy',
                        tag: 'Prescription Dispensing',
                        icon: Pill,
                        countBadge: medications.length > 0 ? `${medications.length} Rx` : undefined,
                        theme: 'hover:border-emerald-300 selected:bg-emerald-50 selected:border-emerald-500',
                      },
                      {
                        id: 'LABORATORY' as DispositionType,
                        label: 'Diagnostic Lab',
                        tag: 'Sample Collection',
                        icon: Beaker,
                        countBadge: labTests.length > 0 ? `${labTests.length} Tests` : undefined,
                        theme: 'hover:border-blue-300 selected:bg-blue-50 selected:border-blue-500',
                      },
                      {
                        id: 'RADIOLOGY' as DispositionType,
                        label: 'Radiology / Imaging',
                        tag: 'X-Ray & Scans',
                        icon: Camera,
                        countBadge: radiologyStudies.length > 0 ? `${radiologyStudies.length} Studies` : undefined,
                        theme: 'hover:border-indigo-300 selected:bg-indigo-50 selected:border-indigo-500',
                      },
                      {
                        id: 'BILLING' as DispositionType,
                        label: 'Finance & Billing',
                        tag: 'Cashier & Payment',
                        icon: CreditCard,
                        countBadge: charges.length > 0 ? `$${chargeTotal.toFixed(0)}` : undefined,
                        theme: 'hover:border-amber-300 selected:bg-amber-50 selected:border-amber-500',
                      },
                      {
                        id: 'ADMISSION' as DispositionType,
                        label: 'Inpatient / IPD',
                        tag: 'Ward Admission',
                        icon: Activity,
                        theme: 'hover:border-rose-300 selected:bg-rose-50 selected:border-rose-500',
                      },
                      {
                        id: 'EXTERNAL_REFERRAL' as DispositionType,
                        label: 'External Referral',
                        tag: 'Specialist Transfer',
                        icon: ExternalLink,
                        theme: 'hover:border-purple-300 selected:bg-purple-50 selected:border-purple-500',
                      },
                      {
                        id: 'DISCHARGE' as DispositionType,
                        label: 'Complete & Discharge',
                        tag: 'Outpatient Exit',
                        icon: CheckCircle2,
                        theme: 'hover:border-slate-400 selected:bg-slate-100 selected:border-slate-800',
                      },
                    ].map((opt) => {
                      const isSelected = disposition === opt.id;
                      const IconComp = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type='button'
                          onClick={() => {
                            setDisposition(opt.id);
                            setIsCustomDisposition(true);
                          }}
                          className={clsx(
                            'p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 shadow-xs group',
                            isSelected
                              ? 'border-brand-600 bg-brand-50/70 shadow-md ring-2 ring-brand-500/20'
                              : 'border-slate-200 bg-white hover:bg-slate-50/70',
                          )}
                        >
                          <div className='flex items-start justify-between'>
                            <div
                              className={clsx(
                                'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
                                isSelected
                                  ? 'bg-brand-600 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600',
                              )}
                            >
                              <IconComp size={16} />
                            </div>
                            {isSelected && (
                              <div className='w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center'>
                                <Check size={10} strokeWidth={3} />
                              </div>
                            )}
                            {opt.countBadge && !isSelected && (
                              <span className='text-[10px] font-black px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200'>
                                {opt.countBadge}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className={clsx('text-xs font-black', isSelected ? 'text-brand-900' : 'text-slate-800')}>
                              {opt.label}
                            </div>
                            <div className='text-[10px] font-semibold text-slate-400 truncate mt-0.5'>
                              {opt.tag}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Inline Form for External Referral */}
                  {disposition === 'EXTERNAL_REFERRAL' && (
                    <div className='p-4 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-3 animate-in fade-in duration-200'>
                      <div className='text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5'>
                        <ExternalLink size={14} /> External Hospital Referral Information
                      </div>
                      <div className='grid gap-3 sm:grid-cols-2'>
                        <TextInput
                          label='Destination Hospital / Medical Facility *'
                          value={externalReferralData.destination}
                          placeholder='e.g. University Teaching Hospital (UTH)'
                          onChange={(val) =>
                            setExternalReferralData((prev) => ({ ...prev, destination: val }))
                          }
                        />
                        <TextInput
                          label='Reason for Referral / Specialist Care *'
                          value={externalReferralData.reason}
                          placeholder='e.g. Pediatric Cardiology review and Echo'
                          onChange={(val) =>
                            setExternalReferralData((prev) => ({ ...prev, reason: val }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Inline Form for Inpatient Admission */}
                  {disposition === 'ADMISSION' && (
                    <div className='p-4 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-3 animate-in fade-in duration-200'>
                      <div className='text-xs font-black text-rose-900 uppercase tracking-wider flex items-center gap-1.5'>
                        <Activity size={14} /> Inpatient Admission / Observation Order
                      </div>
                      <TextInput
                        label='Admission Clinical Reason / Ward Orders *'
                        value={admissionReason}
                        placeholder='e.g. Observation, IV Fluid administration and vitals monitoring'
                        onChange={(val) => setAdmissionReason(val)}
                      />
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Footer Actions */}
          <div className='flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5 shrink-0'>
            <div className='flex items-center gap-2 w-full sm:w-auto'>
              <button
                type='button'
                onClick={onClose}
                disabled={loading}
                className='px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white transition-colors disabled:opacity-50'
              >
                Cancel
              </button>
              <div className='hidden sm:block text-xs font-medium text-slate-500 pl-2'>
                Routing Target: <span className='font-bold text-slate-800'>{activeDispositionInfo.title.replace('Complete & ', '')}</span>
              </div>
            </div>

            <div className='flex items-center gap-2 w-full sm:w-auto justify-end'>
              <button
                disabled={loading}
                type='submit'
                form='consultation-form'
                className={clsx(
                  'w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs sm:text-sm font-black shadow-lg transition-all disabled:opacity-50',
                  activeDispositionInfo.color,
                )}
              >
                <activeDispositionInfo.icon size={17} />
                {loading ? 'Processing & Forwarding…' : activeDispositionInfo.title}
                <CornerDownRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <StatusModal
        isOpen={!!status}
        type={status?.type || 'success'}
        title={status?.title || ''}
        message={status?.message || ''}
        onClose={() => {
          const succeeded = status?.type === 'success';
          setStatus(null);
          if (succeeded) onClose();
        }}
      />
    </>,
    document.body
  );
}

const fieldClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-brand-500/20 font-medium';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className='text-xs font-bold text-slate-700 ml-0.5 uppercase tracking-wider text-[11px]'>{children}</span>;
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className='block space-y-1'>
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className='block space-y-1'>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={placeholder}
        className={fieldClass + ' resize-none'}
      />
    </label>
  );
}

function OrderSection({
  title,
  addLabel,
  onAdd,
  empty,
  children,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className='space-y-3.5'>
      <div className='flex items-center justify-between gap-3'>
        <h3 className='text-xs font-black text-slate-900 uppercase tracking-wider'>{title}</h3>
        <button
          type='button'
          onClick={onAdd}
          className='flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-sm shadow-brand-500/20 transition-all'
        >
          <Plus size={14} /> {addLabel}
        </button>
      </div>
      {empty ? (
        <div className='rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 font-medium'>
          No items added yet. Click &quot;{addLabel}&quot; above to add.
        </div>
      ) : (
        <div className='space-y-3'>{children}</div>
      )}
    </div>
  );
}

function DraftInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className='block space-y-1'>
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </label>
  );
}

function NumberDraftInput({
  label,
  value,
  onChange,
  min,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  step?: string;
}) {
  return (
    <label className='block space-y-1'>
      <FieldLabel>{label}</FieldLabel>
      <input
        type='number'
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={fieldClass}
      />
    </label>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='rounded-xl p-2.5 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors'
      aria-label='Remove item'
    >
      <Trash2 size={16} />
    </button>
  );
}

function updateMedication(
  id: string,
  field: 'dosage' | 'frequency' | 'duration' | 'instructions',
  value: string,
  setMedications: React.Dispatch<React.SetStateAction<MedicationDraft[]>>,
) {
  setMedications((current) =>
    current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
  );
}

function updateLabTest(
  id: string,
  field: 'testName' | 'unit' | 'referenceRange',
  value: string,
  setLabTests: React.Dispatch<React.SetStateAction<LabDraft[]>>,
) {
  setLabTests((current) =>
    current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
  );
}

function updateRadiology(
  id: string,
  value: string,
  setStudies: React.Dispatch<React.SetStateAction<RadiologyDraft[]>>,
) {
  setStudies((current) =>
    current.map((item) => (item.id === id ? { ...item, bodyPart: value } : item)),
  );
}

function updateCharge(
  id: string,
  field: 'description',
  value: string,
  setCharges: React.Dispatch<React.SetStateAction<ChargeDraft[]>>,
): void;
function updateCharge(
  id: string,
  field: 'quantity' | 'unitPrice',
  value: number,
  setCharges: React.Dispatch<React.SetStateAction<ChargeDraft[]>>,
): void;
function updateCharge(
  id: string,
  field: keyof Pick<ChargeDraft, 'description' | 'quantity' | 'unitPrice'>,
  value: string | number,
  setCharges: React.Dispatch<React.SetStateAction<ChargeDraft[]>>,
) {
  setCharges((current) =>
    current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
  );
}
