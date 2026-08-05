'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Beaker,
  Camera,
  DollarSign,
  FileText,
  Pill,
  Plus,
  Save,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import StatusModal from './StatusModal';
import { createClient } from '@/utils/supabase/client';
import type { Database, Json } from '@/types/supabase';

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type Vital = Database['public']['Tables']['vitals']['Row'];
type TabId = 'notes' | 'prescriptions' | 'lab' | 'radiology' | 'billing';

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
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(false);
  const [vitals, setVitals] = useState<Vital | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('notes');
  const [notes, setNotes] = useState(emptyNotes);
  const [medications, setMedications] = useState<MedicationDraft[]>([]);
  const [labTests, setLabTests] = useState<LabDraft[]>([]);
  const [radiologyStudies, setRadiologyStudies] = useState<RadiologyDraft[]>([]);
  const [charges, setCharges] = useState<ChargeDraft[]>([]);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function loadConsultationReferences() {
      const [vitalsResult, inventoryResult] = await Promise.all([
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
      ]);

      if (!cancelled) {
        setVitals(vitalsResult.data || null);
        setInventory(inventoryResult.data || []);
      }
    }

    void loadConsultationReferences();
    return () => {
      cancelled = true;
    };
  }, [isOpen, patientId, supabase]);

  function resetDraft() {
    setActiveTab('notes');
    setNotes(emptyNotes);
    setMedications([]);
    setLabTests([]);
    setRadiologyStudies([]);
    setCharges([]);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

    const { error } = await supabase.rpc('complete_consultation', {
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

    if (error) {
      setStatus({
        type: 'error',
        title: 'Consultation Not Saved',
        message: error.message,
      });
    } else {
      resetDraft();
      setStatus({
        type: 'success',
        title: 'Consultation Complete',
        message: `The clinical note, orders, charges, and queue status for ${patientName} were saved atomically.`,
      });
    }
    setLoading(false);
  }

  async function handleReferToObservation() {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setStatus({
        type: 'error',
        title: 'Session Expired',
        message: 'Sign in again before creating an admission.',
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('admissions').insert({
      patient_id: patientId,
      admitting_doctor_id: authData.user.id,
      reason: 'Observation',
      status: 'ACTIVE',
    });

    if (error) {
      setStatus({ type: 'error', title: 'Referral Failed', message: error.message });
    } else {
      await supabase.from('walkin_queue').update({ status: 'COMPLETED' }).eq('id', queueId);
      setStatus({
        type: 'success',
        title: 'Patient Referred',
        message: 'The patient was referred to observation.',
      });
    }
    setLoading(false);
  }

  async function handleExternalReferral() {
    const destination = window.prompt('Enter destination hospital:')?.trim();
    const reason = window.prompt('Enter reason for referral:')?.trim();
    if (!destination || !reason) return;

    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setStatus({
        type: 'error',
        title: 'Session Expired',
        message: 'Sign in again before creating a referral.',
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('referrals').insert({
      patient_id: patientId,
      destination_hospital: destination,
      reason,
      referred_by: authData.user.id,
      status: 'PENDING',
    });

    if (error) {
      setStatus({ type: 'error', title: 'Referral Failed', message: error.message });
    } else {
      await supabase.from('walkin_queue').update({ status: 'COMPLETED' }).eq('id', queueId);
      setStatus({
        type: 'success',
        title: 'Referral Created',
        message: 'The external referral was initiated.',
      });
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  const tabs: Array<{ id: TabId; label: string; icon: typeof FileText }> = [
    { id: 'notes', label: 'Clinical Notes', icon: FileText },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
    { id: 'lab', label: 'Lab Orders', icon: Beaker },
    { id: 'radiology', label: 'Radiology', icon: Camera },
    { id: 'billing', label: 'Charges', icon: DollarSign },
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

  return (
    <>
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm'>
        <div className='flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl'>
          <div className='flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-6'>
            <div className='flex items-center gap-4'>
              <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white'>
                <Stethoscope size={24} />
              </div>
              <div>
                <h2 className='text-xl font-black text-slate-900'>{patientName}</h2>
                <p className='text-sm text-slate-500'>Consultation session</p>
              </div>
            </div>
            <button
              type='button'
              onClick={onClose}
              className='rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-600'
              aria-label='Close consultation'
            >
              <X size={20} />
            </button>
          </div>

          <div className='flex min-h-0 flex-1'>
            <aside className='hidden w-64 overflow-y-auto border-r border-slate-100 bg-slate-50 p-6 md:block'>
              <h3 className='mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400'>
                <Activity size={14} /> Latest vitals
              </h3>
              {vitals ? (
                <div className='space-y-3'>
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
                    <div key={vital.label} className='rounded-xl border border-slate-200 bg-white p-3'>
                      <p className='text-[10px] font-bold uppercase text-slate-400'>{vital.label}</p>
                      <p className='text-lg font-black text-slate-900'>
                        {vital.value}{' '}
                        <span className='text-[10px] font-medium text-slate-400'>{vital.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-sm italic text-slate-400'>No vitals recorded.</p>
              )}
            </aside>

            <div className='flex min-w-0 flex-1 flex-col'>
              <div className='flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/30 p-2'>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type='button'
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'flex min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all',
                      activeTab === tab.id
                        ? 'border border-slate-200 bg-white text-brand-600 shadow-sm'
                        : 'text-slate-400 hover:bg-white/50 hover:text-slate-600',
                    )}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <form
                id='consultation-form'
                onSubmit={handleSubmit}
                className='flex-1 overflow-y-auto p-6 md:p-8'
              >
                {activeTab === 'notes' && (
                  <div className='space-y-6'>
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
                        placeholder='e.g. Acute asthma'
                      />
                    </div>
                    <TextArea
                      label='Subjective (Chief Complaint, History)'
                      value={notes.subjective}
                      onChange={(value) => setNotes((current) => ({ ...current, subjective: value }))}
                    />
                    <TextArea
                      label='Objective (Examination Findings)'
                      value={notes.objective}
                      onChange={(value) => setNotes((current) => ({ ...current, objective: value }))}
                    />
                    <div className='grid gap-4 md:grid-cols-2'>
                      <TextArea
                        label='Assessment'
                        value={notes.assessment}
                        onChange={(value) => setNotes((current) => ({ ...current, assessment: value }))}
                      />
                      <TextArea
                        label='Plan'
                        value={notes.plan}
                        onChange={(value) => setNotes((current) => ({ ...current, plan: value }))}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'prescriptions' && (
                  <OrderSection
                    title='Medications'
                    addLabel='Add medication'
                    onAdd={addMedication}
                    empty={medications.length === 0}
                  >
                    {medications.map((medication) => (
                      <div
                        key={medication.id}
                        className='grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-6'
                      >
                        <label className='md:col-span-2'>
                          <FieldLabel>Medication</FieldLabel>
                          <select
                            value={medication.drugId}
                            onChange={(event) =>
                              setMedications((current) =>
                                current.map((item) =>
                                  item.id === medication.id
                                    ? { ...item, drugId: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            className={fieldClass}
                          >
                            {inventory.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.stock_level || 0} {item.unit})
                              </option>
                            ))}
                          </select>
                        </label>
                        <DraftInput
                          label='Dosage'
                          value={medication.dosage}
                          onChange={(value) =>
                            updateMedication(medication.id, 'dosage', value, setMedications)
                          }
                        />
                        <DraftInput
                          label='Frequency'
                          value={medication.frequency}
                          onChange={(value) =>
                            updateMedication(medication.id, 'frequency', value, setMedications)
                          }
                        />
                        <DraftInput
                          label='Duration'
                          value={medication.duration}
                          onChange={(value) =>
                            updateMedication(medication.id, 'duration', value, setMedications)
                          }
                        />
                        <div className='flex items-end gap-2'>
                          <label className='flex-1'>
                            <FieldLabel>Quantity</FieldLabel>
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
                          <RemoveButton
                            onClick={() =>
                              setMedications((current) =>
                                current.filter((item) => item.id !== medication.id),
                              )
                            }
                          />
                        </div>
                        <label className='md:col-span-6'>
                          <FieldLabel>Instructions</FieldLabel>
                          <input
                            value={medication.instructions}
                            onChange={(event) =>
                              updateMedication(
                                medication.id,
                                'instructions',
                                event.target.value,
                                setMedications,
                              )
                            }
                            className={fieldClass}
                            placeholder='Optional administration instructions'
                          />
                        </label>
                      </div>
                    ))}
                  </OrderSection>
                )}

                {activeTab === 'lab' && (
                  <OrderSection
                    title='Laboratory tests'
                    addLabel='Add lab test'
                    onAdd={addLabTest}
                    empty={labTests.length === 0}
                  >
                    {labTests.map((test) => (
                      <div
                        key={test.id}
                        className='grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-5'
                      >
                        <DraftInput
                          label='Test name'
                          value={test.testName}
                          onChange={(value) =>
                            updateLabTest(test.id, 'testName', value, setLabTests)
                          }
                        />
                        <label>
                          <FieldLabel>Priority</FieldLabel>
                          <select
                            value={test.priority}
                            onChange={(event) =>
                              setLabTests((current) =>
                                current.map((item) =>
                                  item.id === test.id
                                    ? {
                                        ...item,
                                        priority: event.target.value as LabDraft['priority'],
                                      }
                                    : item,
                                ),
                              )
                            }
                            className={fieldClass}
                          >
                            <option value='NORMAL'>Normal</option>
                            <option value='URGENT'>Urgent</option>
                            <option value='CRITICAL'>Critical</option>
                          </select>
                        </label>
                        <DraftInput
                          label='Unit'
                          value={test.unit}
                          onChange={(value) => updateLabTest(test.id, 'unit', value, setLabTests)}
                        />
                        <DraftInput
                          label='Reference range'
                          value={test.referenceRange}
                          onChange={(value) =>
                            updateLabTest(test.id, 'referenceRange', value, setLabTests)
                          }
                        />
                        <div className='flex items-end justify-end'>
                          <RemoveButton
                            onClick={() =>
                              setLabTests((current) =>
                                current.filter((item) => item.id !== test.id),
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </OrderSection>
                )}

                {activeTab === 'radiology' && (
                  <OrderSection
                    title='Radiology studies'
                    addLabel='Add imaging study'
                    onAdd={addRadiologyStudy}
                    empty={radiologyStudies.length === 0}
                  >
                    {radiologyStudies.map((study) => (
                      <div
                        key={study.id}
                        className='grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_2fr_auto]'
                      >
                        <label>
                          <FieldLabel>Modality</FieldLabel>
                          <select
                            value={study.modality}
                            onChange={(event) =>
                              setRadiologyStudies((current) =>
                                current.map((item) =>
                                  item.id === study.id
                                    ? {
                                        ...item,
                                        modality: event.target.value as RadiologyDraft['modality'],
                                      }
                                    : item,
                                ),
                              )
                            }
                            className={fieldClass}
                          >
                            <option value='X-Ray'>X-Ray</option>
                            <option value='CT Scan'>CT Scan</option>
                            <option value='MRI'>MRI</option>
                            <option value='Ultrasound'>Ultrasound</option>
                          </select>
                        </label>
                        <DraftInput
                          label='Body part / region'
                          value={study.bodyPart}
                          onChange={(value) =>
                            updateRadiology(study.id, value, setRadiologyStudies)
                          }
                        />
                        <div className='flex items-end'>
                          <RemoveButton
                            onClick={() =>
                              setRadiologyStudies((current) =>
                                current.filter((item) => item.id !== study.id),
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </OrderSection>
                )}

                {activeTab === 'billing' && (
                  <OrderSection
                    title={`Consultation charges · Total ${chargeTotal.toFixed(2)}`}
                    addLabel='Add charge'
                    onAdd={addCharge}
                    empty={charges.length === 0}
                  >
                    {charges.map((charge) => (
                      <div
                        key={charge.id}
                        className='grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[2fr_1fr_1fr_auto]'
                      >
                        <DraftInput
                          label='Description'
                          value={charge.description}
                          onChange={(value) =>
                            updateCharge(charge.id, 'description', value, setCharges)
                          }
                        />
                        <NumberDraftInput
                          label='Quantity'
                          min={1}
                          value={charge.quantity}
                          onChange={(value) =>
                            updateCharge(charge.id, 'quantity', value, setCharges)
                          }
                        />
                        <NumberDraftInput
                          label='Unit price'
                          min={0}
                          step='0.01'
                          value={charge.unitPrice}
                          onChange={(value) =>
                            updateCharge(charge.id, 'unitPrice', value, setCharges)
                          }
                        />
                        <div className='flex items-end'>
                          <RemoveButton
                            onClick={() =>
                              setCharges((current) =>
                                current.filter((item) => item.id !== charge.id),
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </OrderSection>
                )}
              </form>
            </div>
          </div>

          <div className='flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 p-6 sm:flex-row'>
            <div className='flex flex-1 gap-2'>
              <button
                type='button'
                onClick={handleReferToObservation}
                disabled={loading}
                className={secondaryButtonClass}
              >
                Refer to observation
              </button>
              <button
                type='button'
                onClick={handleExternalReferral}
                disabled={loading}
                className={secondaryButtonClass}
              >
                External referral
              </button>
            </div>
            <button
              disabled={loading}
              type='submit'
              form='consultation-form'
              className='flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800 disabled:opacity-50'
            >
              <Save size={18} />
              {loading ? 'Completing…' : 'Complete consultation'}
            </button>
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
    </>
  );
}

const fieldClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/20';
const secondaryButtonClass =
  'flex-1 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-50';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className='text-xs font-bold text-slate-700'>{children}</span>;
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
    <label>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
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
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <h3 className='text-sm font-bold text-slate-900'>{title}</h3>
        <button
          type='button'
          onClick={onAdd}
          className='flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700'
        >
          <Plus size={14} /> {addLabel}
        </button>
      </div>
      {empty ? (
        <p className='rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400'>
          No items added.
        </p>
      ) : (
        children
      )}
    </div>
  );
}

function DraftInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
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
    <label>
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
      className='rounded-lg p-2.5 text-rose-500 hover:bg-rose-50'
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
