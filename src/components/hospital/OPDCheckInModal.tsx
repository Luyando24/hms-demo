'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Search,
  LogIn,
  User,
  Loader2,
  CheckCircle2,
  Stethoscope,
  Activity,
  AlertTriangle,
  CreditCard,
  Check,
  Send,
  CornerDownRight,
  FlaskConical,
  Pill,
  Camera,
  Building,
  Calendar,
  FileText,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatCurrencyAmount } from '@/utils/currency';
import clsx from 'clsx';
import StatusModal from './StatusModal';

export type CheckInDestination =
  | 'TRIAGE'
  | 'DOCTOR'
  | 'LAB'
  | 'PHARMACY'
  | 'RADIOLOGY'
  | 'ER'
  | 'BILLING'
  | 'ADMISSION';

const defaultDepartmentReasons: Record<CheckInDestination, string> = {
  TRIAGE: 'General Outpatient Consultation & Triage',
  DOCTOR: 'Doctor Outpatient Consultation',
  LAB: 'Direct Laboratory Diagnostic Test',
  PHARMACY: 'Medication Collection & Prescription Refill',
  RADIOLOGY: 'Diagnostic Imaging & Radiology Scan',
  ER: 'Acute Emergency & Trauma Intake',
  BILLING: 'Invoice Settlement & Cashier Clearance',
  ADMISSION: 'Inpatient Ward Bed Admission',
};

interface OPDCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPatient?: any | null;
  initialDestination?: CheckInDestination;
  onSuccess?: () => void;
}

export default function OPDCheckInModal({
  isOpen,
  onClose,
  initialPatient = null,
  initialDestination = 'TRIAGE',
  onSuccess,
}: OPDCheckInModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(initialPatient);
  const [destination, setDestination] = useState<CheckInDestination>(initialDestination || 'TRIAGE');
  const [customReason, setCustomReason] = useState(
    defaultDepartmentReasons[initialDestination || 'TRIAGE'],
  );
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY'>(
    initialDestination === 'ER' ? 'EMERGENCY' : 'NORMAL',
  );
  const [generateInvoice, setGenerateInvoice] = useState(
    initialDestination === 'TRIAGE' || initialDestination === 'DOCTOR',
  );
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [currencyConfig, setCurrencyConfig] = useState<{
    symbol: string;
    position: 'prefix' | 'suffix';
  }>({ symbol: '$', position: 'prefix' });
  const [consultationFee, setConsultationFee] = useState<number>(150);

  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setPatients([]);
      setSelectedPatient(null);
      const initialDest = initialDestination || 'TRIAGE';
      setDestination(initialDest);
      setCustomReason(defaultDepartmentReasons[initialDest]);
      setPriority(initialDest === 'ER' ? 'EMERGENCY' : 'NORMAL');
      setGenerateInvoice(initialDest === 'TRIAGE' || initialDest === 'DOCTOR');
    } else {
      if (initialPatient) {
        setSelectedPatient(initialPatient);
      }
      const initialDest = initialDestination || 'TRIAGE';
      setDestination(initialDest);
      setCustomReason(defaultDepartmentReasons[initialDest]);
      setPriority(initialDest === 'ER' ? 'EMERGENCY' : 'NORMAL');
      setGenerateInvoice(initialDest === 'TRIAGE' || initialDest === 'DOCTOR');
      void fetchDepartmentsAndSettings();
    }
  }, [isOpen, initialPatient, initialDestination]);

  const handleSelectDestination = (dest: CheckInDestination) => {
    setDestination(dest);
    setCustomReason(defaultDepartmentReasons[dest]);
    if (dest === 'ER') {
      setPriority('EMERGENCY');
      setGenerateInvoice(false);
    } else if (dest === 'TRIAGE' || dest === 'DOCTOR') {
      setPriority('NORMAL');
      setGenerateInvoice(true);
    } else {
      setPriority('NORMAL');
      setGenerateInvoice(false);
    }
  };

  const fetchDepartmentsAndSettings = async () => {
    const [{ data: deptData }, { data: settingsData }] = await Promise.all([
      supabase.from('departments').select('id, name').order('name'),
      supabase
        .from('system_settings')
        .select('currency_symbol, currency_position, consultation_fee')
        .limit(1)
        .maybeSingle(),
    ]);

    if (deptData) setDepartments(deptData);
    if (settingsData) {
      if (settingsData.currency_symbol) {
        setCurrencyConfig({
          symbol: settingsData.currency_symbol,
          position: (settingsData.currency_position as 'prefix' | 'suffix') || 'prefix',
        });
      }
      if (settingsData.consultation_fee !== null && settingsData.consultation_fee !== undefined) {
        setConsultationFee(Number(settingsData.consultation_fee) || 150);
      }
    }
  };

  const searchPatients = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setPatients([]);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('patients')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,file_number.ilike.%${query}%`)
      .limit(5);

    if (data) setPatients(data);
    setLoading(false);
  };

  const getDeptId = (key: string): string | null => {
    const norm = key.toLowerCase();
    const found = departments.find((d) => {
      const name = d.name.toLowerCase();
      if (norm === 'opd') return name.includes('opd') || name.includes('outpatient');
      if (norm === 'er') return name.includes('er') || name.includes('emergency');
      if (norm === 'nursing') return name.includes('nurs') || name.includes('triage');
      if (norm === 'laboratory') return name.includes('lab') || name.includes('patholog');
      if (norm === 'pharmacy') return name.includes('pharm') || name.includes('dispens');
      if (norm === 'radiology') return name.includes('radio') || name.includes('imag') || name.includes('x-ray');
      if (norm === 'billing') return name.includes('billing') || name.includes('finance') || name.includes('cashier');
      if (norm === 'inpatient') return name.includes('inpatient') || name.includes('ipd') || name.includes('ward');
      return name.includes(norm);
    });
    return found?.id || null;
  };

  const handleCheckIn = async () => {
    if (!selectedPatient) return;

    setLoading(true);

    const tokenNumber = `${Math.floor(100 + Math.random() * 900)}`;
    let targetDeptId: string | null = null;
    let targetStatus = 'WAITING';
    let targetPriority = priority;
    let targetReason = customReason.trim() || 'Hospital Patient Intake';

    if (destination === 'TRIAGE') {
      targetDeptId = getDeptId('nursing') || getDeptId('opd');
      targetStatus = 'WAITING';
      targetReason = customReason.trim() || 'OPD Nurse Triage & Vitals';
    } else if (destination === 'DOCTOR') {
      targetDeptId = getDeptId('opd');
      targetStatus = 'TRIAGED';
      targetReason = customReason.trim() || 'Doctor Outpatient Consultation';
    } else if (destination === 'LAB') {
      targetDeptId = getDeptId('laboratory');
      targetStatus = 'WAITING';
      targetReason = customReason.trim() || 'Direct Laboratory Diagnostic Test';
    } else if (destination === 'PHARMACY') {
      targetDeptId = getDeptId('pharmacy');
      targetStatus = 'WAITING';
      targetReason = customReason.trim() || 'Pharmacy Medication Refill';
    } else if (destination === 'RADIOLOGY') {
      targetDeptId = getDeptId('radiology');
      targetStatus = 'WAITING';
      targetReason = customReason.trim() || 'Direct Radiology & Imaging Scan';
    } else if (destination === 'ER') {
      targetDeptId = getDeptId('er');
      targetStatus = 'WAITING';
      targetPriority = 'EMERGENCY';
      targetReason = customReason.trim() || 'Emergency Room Acute Triage';
    } else if (destination === 'BILLING') {
      targetDeptId = getDeptId('billing');
      targetStatus = 'WAITING';
      targetReason = customReason.trim() || 'Fee Settlement & Clearance';
    } else if (destination === 'ADMISSION') {
      targetDeptId = getDeptId('inpatient') || getDeptId('opd');
      targetStatus = 'WAITING';
      targetReason = customReason.trim() || 'Inpatient Ward Bed Admission';
    }

    // 1. Create walk-in queue record
    const { error: queueError } = await supabase.from('walkin_queue').insert({
      patient_id: selectedPatient.id,
      department_id: targetDeptId,
      status: targetStatus,
      priority: targetPriority,
      reason: targetReason,
      token_number: tokenNumber,
    });

    if (queueError) {
      setStatus({
        type: 'error',
        title: 'Check-in Failed',
        message: queueError.message,
      });
      setLoading(false);
      return;
    }

    // 2. Generate Consultation Fee Invoice if requested
    if (generateInvoice) {
      await supabase.from('invoices').insert({
        patient_id: selectedPatient.id,
        total_amount: consultationFee,
        status: 'UNPAID',
      });
    }

    const destOpt = destinationOptions.find((o) => o.id === destination);
    const destLabel = destOpt?.label || 'Target Department';

    setStatus({
      type: 'success',
      title: 'Patient Checked In & Routed',
      message: `${selectedPatient.first_name} ${selectedPatient.last_name} has been routed to ${destLabel} (Token #${tokenNumber}). Purpose: ${targetReason}.`,
    });
    setLoading(false);
  };

  const destinationOptions = [
    {
      id: 'TRIAGE' as CheckInDestination,
      label: 'Doctor Consultation (OPD)',
      tag: 'Nurse Triage & Vitals First',
      icon: Stethoscope,
      accent: 'border-brand-500 bg-brand-50/70',
      iconBg: 'bg-brand-600 text-white',
    },
    {
      id: 'LAB' as CheckInDestination,
      label: 'Diagnostic Laboratory',
      tag: 'Blood / Specimen Collection',
      icon: FlaskConical,
      accent: 'border-purple-500 bg-purple-50/70',
      iconBg: 'bg-purple-600 text-white',
    },
    {
      id: 'PHARMACY' as CheckInDestination,
      label: 'Central Pharmacy',
      tag: 'Medication Refill & Collection',
      icon: Pill,
      accent: 'border-emerald-500 bg-emerald-50/70',
      iconBg: 'bg-emerald-600 text-white',
    },
    {
      id: 'RADIOLOGY' as CheckInDestination,
      label: 'Radiology & Imaging',
      tag: 'X-Ray, Ultrasound, CT, MRI',
      icon: Camera,
      accent: 'border-indigo-500 bg-indigo-50/70',
      iconBg: 'bg-indigo-600 text-white',
    },
    {
      id: 'ER' as CheckInDestination,
      label: 'Emergency (ER)',
      tag: 'Acute Trauma & Resuscitation',
      icon: AlertTriangle,
      accent: 'border-rose-500 bg-rose-50/70',
      iconBg: 'bg-rose-600 text-white',
    },
    {
      id: 'BILLING' as CheckInDestination,
      label: 'Billing & Cashier',
      tag: 'Invoice Payment & Settlement',
      icon: CreditCard,
      accent: 'border-amber-500 bg-amber-50/70',
      iconBg: 'bg-amber-600 text-white',
    },
    {
      id: 'ADMISSION' as CheckInDestination,
      label: 'Inpatient Ward Admission',
      tag: 'IPD Bed & Room Placement',
      icon: Building,
      accent: 'border-cyan-500 bg-cyan-50/70',
      iconBg: 'bg-cyan-600 text-white',
    },
    {
      id: 'DOCTOR' as CheckInDestination,
      label: 'Direct Doctor Consultation',
      tag: 'Skip Triage (Follow-up / Specialist)',
      icon: Activity,
      accent: 'border-blue-500 bg-blue-50/70',
      iconBg: 'bg-blue-600 text-white',
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] border border-slate-100">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white">
                <LogIn size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 leading-tight">
                  Front Desk Patient Check-in & Intake
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Multi-Service Hospital Queue Routing
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-colors border border-transparent hover:border-slate-200"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 sm:p-7 space-y-5 overflow-y-auto flex-1">
            {/* Patient Search (if not preselected) */}
            {!selectedPatient ? (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Search Patient (Name / MRN File Number / Phone) *
                </label>
                <div className="relative">
                  <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Type name, phone or file number..."
                    value={searchQuery}
                    onChange={(e) => searchPatients(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  {loading && (
                    <Loader2
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-brand-600"
                      size={18}
                    />
                  )}
                </div>

                {/* Patient Search Dropdown Results */}
                {patients.length > 0 && (
                  <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-48 overflow-y-auto mt-2 shadow-lg">
                    {patients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          setSearchQuery('');
                          setPatients([]);
                        }}
                        className="w-full p-3.5 text-left hover:bg-slate-50 flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                            {p.first_name?.[0]}{p.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600">
                              {p.first_name} {p.last_name}
                            </p>
                            <p className="text-xs text-slate-500">{p.phone || 'No phone'}</p>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {p.file_number}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Patient Banner */
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
                    <User size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-950">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        MRN: {selectedPatient.file_number}
                      </span>
                      <span className="text-xs text-emerald-700 font-medium">
                        • {selectedPatient.gender || 'N/A'} • {selectedPatient.phone || 'No phone'}
                      </span>
                    </div>
                  </div>
                </div>
                {!initialPatient && (
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    Change
                  </button>
                )}
              </div>
            )}

            {/* Visit Purpose & Destination Department Selector */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Send size={14} className="text-brand-600" />
                  Select Visit Purpose & Service Department *
                </label>
                <p className="text-[11px] text-slate-500 font-medium">
                  Select why the patient visited the hospital today to route to the correct workstation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {destinationOptions.map((opt) => {
                  const isSelected = destination === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectDestination(opt.id)}
                      className={clsx(
                        'p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between gap-2 relative shadow-xs group',
                        isSelected
                          ? `${opt.accent} ring-2 ring-brand-500/20`
                          : 'border-slate-200 bg-white hover:bg-slate-50',
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={clsx(
                            'w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0',
                            isSelected ? opt.iconBg : 'bg-slate-100 text-slate-600',
                          )}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-900 leading-tight">
                            {opt.label}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">
                            {opt.tag}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Specific Reason & Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Specific Visit Details / Investigation Notes
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="e.g. Routine hypertension check, Full Blood Count test, Amoxicillin refill..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Priority & Consultation Fee Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Care</option>
                  <option value="EMERGENCY">Emergency / Trauma</option>
                </select>
              </div>

              {(destination === 'TRIAGE' || destination === 'DOCTOR') && (
                <div className="flex items-center gap-2.5 pt-4">
                  <input
                    type="checkbox"
                    id="gen-invoice"
                    checked={generateInvoice}
                    onChange={(e) => setGenerateInvoice(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500/20"
                  />
                  <label htmlFor="gen-invoice" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Generate Consultation Fee Invoice (
                    {formatCurrencyAmount(
                      consultationFee,
                      currencyConfig.symbol,
                      currencyConfig.position,
                    )}
                    )
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!selectedPatient || loading}
              onClick={handleCheckIn}
              className="flex-[2] bg-brand-600 text-white px-5 py-3 rounded-xl text-xs font-black hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <CheckCircle2 size={16} /> Check In & Queue Patient <CornerDownRight size={14} />
                </>
              )}
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
          const isSuccess = status?.type === 'success';
          setStatus(null);
          if (isSuccess) {
            onSuccess?.();
            onClose();
          }
        }}
      />
    </>
  );
}
