'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Pill,
  CreditCard,
  Stethoscope,
  CheckCircle2,
  Check,
  Send,
  CornerDownRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import StatusModal from './StatusModal';
import clsx from 'clsx';

type DispenseNextStep = 'DISCHARGE' | 'BILLING' | 'DOCTOR_REVIEW';

interface DispenseMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prescription: any;
}

export default function DispenseMedicationModal({
  isOpen,
  onClose,
  onSuccess,
  prescription,
}: DispenseMedicationModalProps) {
  const [loading, setLoading] = useState(false);
  const [nextStep, setNextStep] = useState<DispenseNextStep>('DISCHARGE');
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [statusModal, setStatusModal] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;
    async function loadDepts() {
      const { data } = await supabase.from('departments').select('id, name').order('name');
      if (data) setDepartments(data);
    }
    void loadDepts();
  }, [isOpen, supabase]);

  if (!isOpen || !prescription) return null;

  const patientName = prescription.patients
    ? `${prescription.patients.first_name || ''} ${prescription.patients.last_name || ''}`.trim()
    : 'Patient';

  const patientId = prescription.patient_id || prescription.patients?.id || null;

  const getDeptId = (key: string): string | null => {
    const norm = key.toLowerCase();
    const found = departments.find((d) => {
      const name = d.name.toLowerCase();
      if (norm === 'opd') return name.includes('opd') || name.includes('outpatient');
      if (norm === 'billing') return name.includes('billing') || name.includes('finance');
      return name.includes(norm);
    });
    return found?.id || null;
  };

  const handleDispenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const medicationNames = (prescription.prescription_items || [])
        .map((item: any) => item.inventory_items?.name || 'Medication')
        .join(', ');

      // 1. Execute atomic dispense RPC
      const { error: statusError } = await supabase.rpc('dispense_prescription', {
        target_prescription_id: prescription.id,
      });

      if (statusError) {
        setStatusModal({ type: 'error', title: 'Dispense Failed', message: statusError.message });
        setLoading(false);
        return;
      }

      // 2. Perform Patient Queue Routing
      if (patientId) {
        const { data: queueRow } = await supabase
          .from('walkin_queue')
          .select('token_number')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const token = queueRow?.token_number || null;

        if (nextStep === 'BILLING') {
          const billingDeptId = getDeptId('billing');
          if (billingDeptId) {
            await supabase.from('walkin_queue').insert({
              patient_id: patientId,
              department_id: billingDeptId,
              status: 'WAITING',
              priority: 'NORMAL',
              reason: 'Medication Bill Settlement',
              token_number: token,
            });
          }
          setStatusModal({
            type: 'success',
            title: 'Medications Dispensed & Forwarded',
            message: `${medicationNames} dispensed. ${patientName} was forwarded to Finance & Billing for payment.`,
          });
        } else if (nextStep === 'DOCTOR_REVIEW') {
          const opdDeptId = getDeptId('opd');
          if (opdDeptId) {
            await supabase.from('walkin_queue').insert({
              patient_id: patientId,
              department_id: opdDeptId,
              status: 'WAITING',
              priority: 'HIGH',
              reason: 'Post-Dispense Review & Follow-up',
              token_number: token,
            });
          }
          setStatusModal({
            type: 'success',
            title: 'Medications Dispensed & Forwarded',
            message: `${medicationNames} dispensed. ${patientName} was routed back to Doctor Consultation.`,
          });
        } else {
          // DISCHARGE
          await supabase
            .from('walkin_queue')
            .update({ status: 'COMPLETED' })
            .eq('patient_id', patientId)
            .eq('status', 'WAITING');

          setStatusModal({
            type: 'success',
            title: 'Medications Dispensed & Visit Completed',
            message: `${medicationNames} has been dispensed and stock deducted. Patient ${patientName} visit is complete.`,
          });
        }
      } else {
        setStatusModal({
          type: 'success',
          title: 'Medication Dispensed',
          message: `${medicationNames} has been dispensed and stock was deducted atomically.`,
        });
      }
    } catch (err: any) {
      setStatusModal({ type: 'error', title: 'Dispense Error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const nextStepOptions = [
    {
      id: 'DISCHARGE' as DispenseNextStep,
      label: 'Complete & Handover',
      tag: 'Discharge Patient Home',
      icon: CheckCircle2,
      theme: 'border-emerald-500 bg-emerald-50/60',
    },
    {
      id: 'BILLING' as DispenseNextStep,
      label: 'Forward to Billing',
      tag: 'Collect Pharmacy Invoice',
      icon: CreditCard,
      theme: 'border-amber-500 bg-amber-50/60',
    },
    {
      id: 'DOCTOR_REVIEW' as DispenseNextStep,
      label: 'Return to Doctor',
      tag: 'Follow-up Consultation',
      icon: Stethoscope,
      theme: 'border-brand-500 bg-brand-50/60',
    },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Pill size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Dispense Prescription</h2>
                <p className="text-xs text-slate-500 font-medium">Patient: <span className="font-bold text-slate-800">{patientName}</span></p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleDispenseSubmit} className="p-6 sm:p-7 space-y-5 overflow-y-auto flex-1">
            {/* Prescribed Items Box */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Prescribed Formulary Items
              </label>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 divide-y divide-slate-100">
                {(prescription.prescription_items || []).map((item: any) => (
                  <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">
                        {item.inventory_items?.name || 'Medication'}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        {item.dosage} · {item.frequency} · {item.duration}
                      </div>
                      {item.instructions && (
                        <div className="text-[11px] text-brand-700 italic mt-0.5">
                          Note: {item.instructions}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800">
                        Qty: {item.quantity_prescribed - (item.quantity_dispensed || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Step / Forwarding Selection */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div>
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Send size={14} className="text-emerald-600" />
                  Next Step After Dispensing
                </label>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Select what action or department queue should follow dispensing:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {nextStepOptions.map((opt) => {
                  const isSelected = nextStep === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setNextStep(opt.id)}
                      className={clsx(
                        'p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 relative shadow-xs',
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50/70',
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={clsx(
                            'w-7 h-7 rounded-xl flex items-center justify-center transition-colors',
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          <Icon size={14} />
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
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

            {/* Submit Actions */}
            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Confirm Dispense & Route <CornerDownRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <StatusModal
        isOpen={!!statusModal}
        type={statusModal?.type || 'success'}
        title={statusModal?.title || ''}
        message={statusModal?.message || ''}
        onClose={() => {
          const isSuccess = statusModal?.type === 'success';
          setStatusModal(null);
          if (isSuccess) {
            onSuccess();
            onClose();
          }
        }}
      />
    </>
  );
}
