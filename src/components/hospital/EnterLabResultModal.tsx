'use client';

import { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Save,
  Loader2,
  Stethoscope,
  Pill,
  CreditCard,
  Check,
  Send,
  CornerDownRight,
  FlaskConical,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import StatusModal from './StatusModal';
import clsx from 'clsx';

type LabNextStep = 'DOCTOR_REVIEW' | 'PHARMACY' | 'BILLING' | 'DISCHARGE';

interface EnterLabResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  labResult: any;
  patientName: string;
}

export default function EnterLabResultModal({
  isOpen,
  onClose,
  onSuccess,
  labResult,
  patientName,
}: EnterLabResultModalProps) {
  const [loading, setLoading] = useState(false);
  const [nextStep, setNextStep] = useState<LabNextStep>('DOCTOR_REVIEW');
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [tokenNumber, setTokenNumber] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !labResult) return;

    async function loadMetadata() {
      const [deptsRes, orderRes] = await Promise.all([
        supabase.from('departments').select('id, name').order('name'),
        labResult.order_id
          ? supabase
              .from('lab_orders')
              .select('patient_id')
              .eq('id', labResult.order_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setDepartments(deptsRes.data || []);
      const pId = orderRes.data?.patient_id || labResult.patient_id || null;
      setPatientId(pId);

      if (pId) {
        const { data: queueRow } = await supabase
          .from('walkin_queue')
          .select('token_number')
          .eq('patient_id', pId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (queueRow?.token_number) {
          setTokenNumber(queueRow.token_number);
        }
      }
    }

    void loadMetadata();
  }, [isOpen, labResult, supabase]);

  if (!isOpen || !labResult) return null;

  const getDeptId = (key: string): string | null => {
    const norm = key.toLowerCase();
    const found = departments.find((d) => {
      const name = d.name.toLowerCase();
      if (norm === 'opd') return name.includes('opd') || name.includes('outpatient');
      if (norm === 'pharmacy') return name.includes('pharmacy');
      if (norm === 'billing') return name.includes('billing') || name.includes('finance');
      return name.includes(norm);
    });
    return found?.id || null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const resultValue = formData.get('result_value') as string;
    const unit = formData.get('unit') as string;
    const referenceRange = formData.get('reference_range') as string;
    const resultStatus = formData.get('status') as string;

    // 1. Update lab_results
    const { error: resultError } = await supabase
      .from('lab_results')
      .update({
        result_value: resultValue,
        unit: unit,
        reference_range: referenceRange,
        status: resultStatus || 'COMPLETED',
      })
      .eq('id', labResult.id);

    if (resultError) {
      setStatus({ type: 'error', title: 'Update Failed', message: resultError.message });
      setLoading(false);
      return;
    }

    // 2. Update order status
    if (labResult.order_id) {
      await supabase
        .from('lab_orders')
        .update({ status: resultStatus === 'COMPLETED' ? 'COMPLETED' : 'PROCESSING' })
        .eq('id', labResult.order_id);
    }

    // 3. Department Forwarding & Queue Routing
    try {
      if (patientId) {
        if (nextStep === 'DOCTOR_REVIEW') {
          const opdDeptId = getDeptId('opd');
          if (opdDeptId) {
            await supabase.from('walkin_queue').insert({
              patient_id: patientId,
              department_id: opdDeptId,
              status: 'WAITING',
              priority: 'HIGH',
              reason: `Lab Results Ready: ${labResult.test_name || 'Tests'}`,
              token_number: tokenNumber,
            });
          }
          setStatus({
            type: 'success',
            title: 'Results Saved & Patient Forwarded',
            message: `Lab results recorded. ${patientName} has been routed back to Doctor Consultation for clinical review.`,
          });
        } else if (nextStep === 'PHARMACY') {
          const pharmDeptId = getDeptId('pharmacy');
          if (pharmDeptId) {
            await supabase.from('walkin_queue').insert({
              patient_id: patientId,
              department_id: pharmDeptId,
              status: 'WAITING',
              priority: 'NORMAL',
              reason: 'Prescription Dispensing',
              token_number: tokenNumber,
            });
          }
          setStatus({
            type: 'success',
            title: 'Results Saved & Forwarded to Pharmacy',
            message: `Lab results recorded. ${patientName} was forwarded to Central Pharmacy.`,
          });
        } else if (nextStep === 'BILLING') {
          const billingDeptId = getDeptId('billing');
          if (billingDeptId) {
            await supabase.from('walkin_queue').insert({
              patient_id: patientId,
              department_id: billingDeptId,
              status: 'WAITING',
              priority: 'NORMAL',
              reason: 'Lab Fee Settlement',
              token_number: tokenNumber,
            });
          }
          setStatus({
            type: 'success',
            title: 'Results Saved & Forwarded to Billing',
            message: `Lab results recorded. ${patientName} was forwarded to Finance & Billing.`,
          });
        } else {
          // DISCHARGE
          setStatus({
            type: 'success',
            title: 'Lab Results Finalized',
            message: `Lab results recorded for ${patientName}. Test workflow completed.`,
          });
        }
      } else {
        setStatus({
          type: 'success',
          title: 'Results Submitted',
          message: `Lab results recorded for ${patientName}.`,
        });
      }
    } catch (routeErr) {
      console.error('Error during lab post-routing:', routeErr);
      setStatus({
        type: 'success',
        title: 'Results Submitted',
        message: `Lab results recorded for ${patientName}.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStepOptions = [
    {
      id: 'DOCTOR_REVIEW' as LabNextStep,
      label: 'Doctor OPD Review',
      tag: 'Results Interpretation',
      icon: Stethoscope,
      theme: 'border-brand-500 bg-brand-50/60',
    },
    {
      id: 'PHARMACY' as LabNextStep,
      label: 'Central Pharmacy',
      tag: 'Medication Pickup',
      icon: Pill,
      theme: 'border-emerald-500 bg-emerald-50/60',
    },
    {
      id: 'BILLING' as LabNextStep,
      label: 'Finance / Cashier',
      tag: 'Invoice Payment',
      icon: CreditCard,
      theme: 'border-amber-500 bg-amber-50/60',
    },
    {
      id: 'DISCHARGE' as LabNextStep,
      label: 'Complete & Exit',
      tag: 'Finalize Visit',
      icon: CheckCircle2,
      theme: 'border-slate-500 bg-slate-50',
    },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
                <FlaskConical size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Enter Lab Results</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {patientName} • <span className="font-bold text-slate-700">{labResult.test_name}</span>
                  {tokenNumber && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 text-[10px] font-black font-mono">Token #{tokenNumber}</span>}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form id="enter-result-form" onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5 overflow-y-auto flex-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                Result Value *
              </label>
              <input
                required
                name="result_value"
                defaultValue={labResult.result_value || ''}
                placeholder="e.g. 13.5, Negative, 5.4 mmol/L, Reactive"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                  Unit (Optional)
                </label>
                <input
                  name="unit"
                  defaultValue={labResult.unit || ''}
                  placeholder="g/dL, mg/dL, %"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                  Ref Range (Optional)
                </label>
                <input
                  name="reference_range"
                  defaultValue={labResult.reference_range || ''}
                  placeholder="11.5 - 16.0"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                Status
              </label>
              <select
                name="status"
                defaultValue={labResult.status || 'COMPLETED'}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 outline-none"
              >
                <option value="COMPLETED">Completed (Final Results)</option>
                <option value="PROCESSING">Processing / Interim</option>
                <option value="VALIDATED">Validated by Pathologist</option>
              </select>
            </div>

            {/* Next Step / Patient Forwarding Section */}
            <div className="pt-5 border-t border-slate-200 space-y-3">
              <div>
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Send size={14} className="text-brand-600" />
                  Forward Patient & Next Action
                </label>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Where should the patient be routed once results are saved?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
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
                          ? clsx('border-brand-600 bg-brand-50/70 ring-2 ring-brand-500/20')
                          : 'border-slate-200 bg-white hover:bg-slate-50/70',
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
          </form>

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
              disabled={loading}
              type="submit"
              form="enter-result-form"
              className="flex-[2] bg-brand-600 text-white px-5 py-3 rounded-xl text-xs font-black hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <Save size={16} /> Save & Forward Patient <CornerDownRight size={14} />
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
            onSuccess();
            onClose();
          }
        }}
      />
    </>
  );
}
