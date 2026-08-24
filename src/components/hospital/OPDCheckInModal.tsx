'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

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

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus({
        type: 'error',
        title: 'Offline Mode Active',
        message: 'Your patient intake selections are preserved locally. Please wait until your network connection returns to route into department queues.',
      });
      return;
    }

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
      label: 'Doctor (OPD)',
      tag: 'Nurse Triage First',
      icon: Stethoscope,
    },
    {
      id: 'LAB' as CheckInDestination,
      label: 'Laboratory',
      tag: 'Blood & Specimen',
      icon: FlaskConical,
    },
    {
      id: 'PHARMACY' as CheckInDestination,
      label: 'Pharmacy',
      tag: 'Medication Refill',
      icon: Pill,
    },
    {
      id: 'RADIOLOGY' as CheckInDestination,
      label: 'Radiology',
      tag: 'X-Ray & Scans',
      icon: Camera,
    },
    {
      id: 'ER' as CheckInDestination,
      label: 'Emergency (ER)',
      tag: 'Acute Trauma',
      icon: AlertTriangle,
    },
    {
      id: 'BILLING' as CheckInDestination,
      label: 'Billing / Cashier',
      tag: 'Invoice Payment',
      icon: CreditCard,
    },
    {
      id: 'ADMISSION' as CheckInDestination,
      label: 'Inpatient (IPD)',
      tag: 'Ward Admission',
      icon: Building,
    },
    {
      id: 'DOCTOR' as CheckInDestination,
      label: 'Doctor (Direct)',
      tag: 'Skip Triage / Review',
      icon: Activity,
    },
  ];

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] border border-slate-200/80">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
                <LogIn size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Patient Intake & Routing
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Route patient to the appropriate clinic workstation
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Patient Search (if not preselected) */}
            {!selectedPatient ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Search Patient (Name / MRN / Phone) *
                </label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={15}
                  />
                  <input
                    type="text"
                    placeholder="Type name, phone or file number..."
                    value={searchQuery}
                    onChange={(e) => searchPatients(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                  />
                  {loading && (
                    <Loader2
                      className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-500"
                      size={15}
                    />
                  )}
                </div>

                {/* Patient Search Dropdown Results */}
                {patients.length > 0 && (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-44 overflow-y-auto mt-1.5 shadow-sm bg-white">
                    {patients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          setSearchQuery('');
                          setPatients([]);
                        }}
                        className="w-full p-3 text-left hover:bg-slate-50 flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                            {p.first_name?.[0]}{p.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {p.first_name} {p.last_name}
                            </p>
                            <p className="text-[10px] text-slate-400">{p.phone || 'No phone'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          {p.file_number}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Patient Banner */
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono font-medium text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                        MRN: {selectedPatient.file_number}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        • {selectedPatient.gender || 'N/A'} • {selectedPatient.phone || 'No phone'}
                      </span>
                    </div>
                  </div>
                </div>
                {!initialPatient && (
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-200/60 transition-colors"
                  >
                    Change
                  </button>
                )}
              </div>
            )}

            {/* Visit Purpose & Destination Department Selector */}
            <div className="space-y-2 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  Select Department & Intake Destination *
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {destinationOptions.map((opt) => {
                  const isSelected = destination === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectDestination(opt.id)}
                      className={clsx(
                        'p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-1.5 shadow-xs',
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-900',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={clsx(
                            'w-6 h-6 rounded-lg flex items-center justify-center shrink-0',
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700',
                          )}
                        >
                          <Icon size={13} />
                        </div>
                        <div className="min-w-0">
                          <div className={clsx('text-[11px] font-bold leading-tight truncate', isSelected ? 'text-white' : 'text-slate-900')}>
                            {opt.label}
                          </div>
                          <div className={clsx('text-[9px] mt-0.5 truncate', isSelected ? 'text-slate-300' : 'text-slate-400')}>
                            {opt.tag}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <Check size={13} className="text-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Specific Reason & Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Investigation / Clinical Notes
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="e.g. Routine checkup, Full Blood Count test, Prescription refill..."
                className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
              />
            </div>

            {/* Priority & Consultation Fee Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Care</option>
                  <option value="EMERGENCY">Emergency / Trauma</option>
                </select>
              </div>

              {(destination === 'TRIAGE' || destination === 'DOCTOR') && (
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="gen-invoice"
                    checked={generateInvoice}
                    onChange={(e) => setGenerateInvoice(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900/10"
                  />
                  <label htmlFor="gen-invoice" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Add Consultation Fee Invoice (
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
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2.5 shrink-0 justify-end">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors shadow-xs"
            >
              Cancel
            </button>
            <button
              disabled={!selectedPatient || loading}
              onClick={handleCheckIn}
              className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-98"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <>
                  <CheckCircle2 size={14} /> Route Patient
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
    </>,
    document.body,
  );
}
