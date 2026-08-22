'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  X,
  DollarSign,
  CreditCard,
  Save,
  Shield,
  Pill,
  FlaskConical,
  Stethoscope,
  CheckCircle2,
  Check,
  Send,
  CornerDownRight,
  Loader2,
} from 'lucide-react';
import StatusModal from './StatusModal';
import clsx from 'clsx';

type PaymentNextStep = 'PHARMACY' | 'LAB' | 'DOCTOR' | 'DISCHARGE';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess: () => void;
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState(invoice?.total_amount || 0);
  const [method, setMethod] = useState('CASH');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [reference, setReference] = useState('');
  const [nextStep, setNextStep] = useState<PaymentNextStep>('DISCHARGE');
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  const [availableMethods, setAvailableMethods] = useState<string[]>([
    'CASH',
    'CARD',
    'MOBILE_MONEY',
    'INSURANCE',
    'BANK_TRANSFER',
    'CHEQUE',
  ]);
  const [availableInsurances, setAvailableInsurances] = useState<string[]>([
    'NHIMA',
    'Prudential',
    'Sanlam',
    'Madison Health',
    'Professional Life',
    'Medland Direct',
  ]);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setAmount(invoice ? invoice.total_amount - (invoice.paid_amount || 0) : 0);
      fetchPaymentSettings();
      fetchDepartments();
      detectPendingOrders();
    }
  }, [isOpen, invoice]);

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name').order('name');
    if (data) setDepartments(data);
  };

  const detectPendingOrders = async () => {
    if (!invoice?.patient_id) return;
    const [pRes, lRes] = await Promise.all([
      supabase
        .from('prescriptions')
        .select('id')
        .eq('patient_id', invoice.patient_id)
        .eq('status', 'PENDING')
        .limit(1),
      supabase
        .from('lab_orders')
        .select('id')
        .eq('patient_id', invoice.patient_id)
        .eq('status', 'ORDERED')
        .limit(1),
    ]);

    if (pRes.data && pRes.data.length > 0) {
      setNextStep('PHARMACY');
    } else if (lRes.data && lRes.data.length > 0) {
      setNextStep('LAB');
    } else {
      setNextStep('DISCHARGE');
    }
  };

  const fetchPaymentSettings = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('payment_methods, insurance_providers')
      .limit(1)
      .maybeSingle();

    if (data) {
      if (
        data.payment_methods &&
        Array.isArray(data.payment_methods) &&
        data.payment_methods.length > 0
      ) {
        setAvailableMethods(data.payment_methods);
        setMethod(data.payment_methods[0]);
      }
      if (
        data.insurance_providers &&
        Array.isArray(data.insurance_providers) &&
        data.insurance_providers.length > 0
      ) {
        setAvailableInsurances(data.insurance_providers);
        setInsuranceProvider(data.insurance_providers[0]);
      }
    }
  };

  if (!isOpen) return null;

  const getDeptId = (key: string): string | null => {
    const norm = key.toLowerCase();
    const found = departments.find((d) => {
      const name = d.name.toLowerCase();
      if (norm === 'opd') return name.includes('opd') || name.includes('outpatient');
      if (norm === 'pharmacy') return name.includes('pharmacy');
      if (norm === 'laboratory') return name.includes('lab') || name.includes('pathology');
      return name.includes(norm);
    });
    return found?.id || null;
  };

  const handlePayment = async () => {
    const outstanding = invoice.total_amount - (invoice.paid_amount || 0);
    if (amount <= 0 || amount > outstanding) {
      setStatus({
        type: 'error',
        title: 'Invalid Payment',
        message: `Enter an amount between 0.01 and ${outstanding.toFixed(2)}.`,
      });
      return;
    }
    setLoading(true);

    const finalReference =
      method === 'INSURANCE'
        ? `Insurance: ${insuranceProvider}${reference ? ` (Ref: ${reference})` : ''}`
        : reference;

    const { error: paymentError } = await supabase.rpc('record_invoice_payment', {
      target_invoice_id: invoice.id,
      payment_amount: amount,
      method,
      reference: finalReference || undefined,
    });

    if (paymentError) {
      setStatus({
        type: 'error',
        title: 'Payment Failed',
        message: paymentError.message,
      });
      setLoading(false);
      return;
    }

    // Patient Direction Routing
    const patientId = invoice.patient_id;
    const patientName = invoice.patients
      ? `${invoice.patients.first_name || ''} ${invoice.patients.last_name || ''}`.trim()
      : 'Patient';

    if (patientId) {
      const { data: queueRow } = await supabase
        .from('walkin_queue')
        .select('token_number')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const token = queueRow?.token_number || null;

      if (nextStep === 'PHARMACY') {
        const pharmDeptId = getDeptId('pharmacy');
        if (pharmDeptId) {
          await supabase.from('walkin_queue').insert({
            patient_id: patientId,
            department_id: pharmDeptId,
            status: 'WAITING',
            priority: 'NORMAL',
            reason: 'Medication Collection (Paid)',
            token_number: token,
          });
        }
        setStatus({
          type: 'success',
          title: 'Payment Recorded & Patient Routed',
          message: `Payment of $${amount.toFixed(2)} recorded. ${patientName} was forwarded to Central Pharmacy for medication collection.`,
        });
      } else if (nextStep === 'LAB') {
        const labDeptId = getDeptId('laboratory');
        if (labDeptId) {
          await supabase.from('walkin_queue').insert({
            patient_id: patientId,
            department_id: labDeptId,
            status: 'WAITING',
            priority: 'NORMAL',
            reason: 'Lab Sample Collection (Paid)',
            token_number: token,
          });
        }
        setStatus({
          type: 'success',
          title: 'Payment Recorded & Patient Routed',
          message: `Payment of $${amount.toFixed(2)} recorded. ${patientName} was forwarded to Diagnostic Laboratory.`,
        });
      } else if (nextStep === 'DOCTOR') {
        const opdDeptId = getDeptId('opd');
        if (opdDeptId) {
          await supabase.from('walkin_queue').insert({
            patient_id: patientId,
            department_id: opdDeptId,
            status: 'WAITING',
            priority: 'HIGH',
            reason: 'Consultation Check-In (Paid)',
            token_number: token,
          });
        }
        setStatus({
          type: 'success',
          title: 'Payment Recorded & Patient Routed',
          message: `Payment of $${amount.toFixed(2)} recorded. ${patientName} was queued for Doctor OPD Consultation.`,
        });
      } else {
        // DISCHARGE
        setStatus({
          type: 'success',
          title: 'Payment Settled',
          message: `Payment of $${amount.toFixed(2)} (${method.replace('_', ' ')}) applied. Receipt issued and patient visit complete.`,
        });
      }
    } else {
      setStatus({
        type: 'success',
        title: 'Payment Recorded',
        message: `Payment of $${amount.toFixed(2)} (${method.replace('_', ' ')}) applied to Invoice #${invoice.id.slice(0, 8)}.`,
      });
    }

    setLoading(false);
  };

  const nextStepOptions = [
    {
      id: 'PHARMACY' as PaymentNextStep,
      label: 'Pharmacy',
      tag: 'Collect Drugs',
      icon: Pill,
    },
    {
      id: 'LAB' as PaymentNextStep,
      label: 'Diagnostic Lab',
      tag: 'Sample Testing',
      icon: FlaskConical,
    },
    {
      id: 'DOCTOR' as PaymentNextStep,
      label: 'Doctor OPD',
      tag: 'Consultation',
      icon: Stethoscope,
    },
    {
      id: 'DISCHARGE' as PaymentNextStep,
      label: 'Discharge',
      tag: 'Visit Complete',
      icon: CheckCircle2,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-slate-200 flex flex-col max-h-[92vh]">
          
          {/* Header */}
          <div className="bg-brand-600 p-6 text-white flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-xl font-black">Record Patient Payment</h2>
              <p className="text-brand-100 text-xs font-bold uppercase tracking-wider mt-1">
                Invoice #{invoice?.id?.slice(0, 8)} •{' '}
                {invoice.patients
                  ? `${invoice.patients.first_name || ''} ${invoice.patients.last_name || ''}`.trim()
                  : 'Patient'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 sm:p-7 space-y-5 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Payment Amount ($) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Payment Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {availableMethods.map((m) => (
                  <option key={m} value={m}>
                    {m.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {method === 'INSURANCE' && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="block text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Shield size={14} /> Insurance Provider
                </label>
                <select
                  value={insuranceProvider}
                  onChange={(e) => setInsuranceProvider(e.target.value)}
                  className="w-full px-4 py-3 bg-purple-50/50 border border-purple-200 rounded-2xl text-sm font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  {availableInsurances.map((ins) => (
                    <option key={ins} value={ins}>
                      {ins}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Reference / Policy # (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Policy #, Claim #, Transaction ID"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Next Action / Patient Direction */}
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <div>
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Send size={14} className="text-brand-600" />
                  Direct Patient Next:
                </label>
                <p className="text-[11px] text-slate-500 font-medium">
                  Select destination queue following payment confirmation:
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {nextStepOptions.map((opt) => {
                  const isSelected = nextStep === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setNextStep(opt.id)}
                      className={clsx(
                        'p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 shadow-xs',
                        isSelected
                          ? 'border-brand-600 bg-brand-50/70 ring-2 ring-brand-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50',
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={clsx(
                            'w-6 h-6 rounded-lg flex items-center justify-center',
                            isSelected
                              ? 'bg-brand-600 text-white'
                              : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          <Icon size={12} />
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

            <div className="pt-3">
              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Save size={18} /> Complete Payment & Direct Patient <CornerDownRight size={15} />
                  </>
                )}
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
