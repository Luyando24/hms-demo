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
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import clsx from 'clsx';
import StatusModal from './StatusModal';

type CheckInDestination = 'TRIAGE' | 'DOCTOR' | 'ER' | 'BILLING';

interface OPDCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OPDCheckInModal({ isOpen, onClose }: OPDCheckInModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [destination, setDestination] = useState<CheckInDestination>('TRIAGE');
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
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
      setDestination('TRIAGE');
    } else {
      void fetchDepartments();
    }
  }, [isOpen]);

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name').order('name');
    if (data) setDepartments(data);
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
      if (norm === 'billing') return name.includes('billing') || name.includes('finance');
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
    let targetPriority = 'NORMAL';
    let targetReason = 'OPD Nurse Triage & Vitals';

    if (destination === 'TRIAGE') {
      targetDeptId = getDeptId('nursing') || getDeptId('opd');
      targetStatus = 'WAITING';
      targetPriority = 'NORMAL';
      targetReason = 'OPD Nurse Triage & Vitals';
    } else if (destination === 'DOCTOR') {
      targetDeptId = getDeptId('opd');
      targetStatus = 'TRIAGED';
      targetPriority = 'NORMAL';
      targetReason = 'Doctor Outpatient Consultation';
    } else if (destination === 'ER') {
      targetDeptId = getDeptId('er');
      targetStatus = 'WAITING';
      targetPriority = 'EMERGENCY';
      targetReason = 'Emergency Room Acute Triage';
    } else if (destination === 'BILLING') {
      targetDeptId = getDeptId('billing');
      targetStatus = 'WAITING';
      targetPriority = 'NORMAL';
      targetReason = 'Consultation Fee Payment';
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

    // 2. Create consultation fee invoice
    await supabase.from('invoices').insert({
      patient_id: selectedPatient.id,
      total_amount: 150.0,
      status: 'UNPAID',
    });

    const destLabel = destination === 'TRIAGE' ? 'Nurse Triage Station' : destination === 'DOCTOR' ? 'Doctor OPD Consultation' : destination === 'ER' ? 'Emergency Room (ER)' : 'Finance & Billing';

    setStatus({
      type: 'success',
      title: 'Check-in Successful',
      message: `${selectedPatient.first_name} ${selectedPatient.last_name} checked in and queued for ${destLabel} (Token #${tokenNumber}).`,
    });
    setLoading(false);
  };

  const destinationOptions = [
    {
      id: 'TRIAGE' as CheckInDestination,
      label: 'Nurse Triage / Vitals',
      tag: 'Capture Vitals',
      icon: Activity,
    },
    {
      id: 'DOCTOR' as CheckInDestination,
      label: 'Doctor Consultation',
      tag: 'OPD Exam Room',
      icon: Stethoscope,
    },
    {
      id: 'ER' as CheckInDestination,
      label: 'Emergency (ER)',
      tag: 'Acute Trauma / Urgent',
      icon: AlertTriangle,
    },
    {
      id: 'BILLING' as CheckInDestination,
      label: 'Billing / Cashier',
      tag: 'Pay Fee First',
      icon: CreditCard,
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white">
                <LogIn size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 leading-tight">Patient Check-in</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Queue routing & Department assignment
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
            {/* Patient Search */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Search Patient (Name / MRN File Number) *
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Type name or file number..."
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
            </div>

            {/* Selected Patient Banner */}
            {selectedPatient && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-950">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </p>
                    <p className="text-xs text-emerald-700 font-medium">
                      MRN: {selectedPatient.file_number} • {selectedPatient.gender}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 p-1"
                >
                  Change
                </button>
              </div>
            )}

            {/* Patient Search Results */}
            {!selectedPatient && patients.length > 0 && (
              <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
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
                    <div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600">
                        {p.first_name} {p.last_name}
                      </p>
                      <p className="text-xs text-slate-500">{p.phone || 'No phone'}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-md">
                      {p.file_number}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Destination Department Selector */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div>
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Send size={14} className="text-brand-600" />
                  Route Patient Destination *
                </label>
                <p className="text-[11px] text-slate-500 font-medium">
                  Where should the patient go immediately upon check-in?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {destinationOptions.map((opt) => {
                  const isSelected = destination === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDestination(opt.id)}
                      className={clsx(
                        'p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 relative shadow-xs',
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
                          <div className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 leading-tight">
                          {opt.label}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          {opt.tag}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
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
          if (isSuccess) onClose();
        }}
      />
    </>
  );
}
