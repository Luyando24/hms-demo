'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Printer,
} from 'lucide-react';
import { formatCurrencyAmount } from '@/utils/currency';
import { printInvoiceDocument, PrintableInvoiceData } from '@/utils/invoicePrintGenerator';
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
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState(invoice?.total_amount || 0);
  const [method, setMethod] = useState('CASH');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [reference, setReference] = useState('');
  const [nextStep, setNextStep] = useState<PaymentNextStep>('DISCHARGE');
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [hospitalSettings, setHospitalSettings] = useState<any>(null);
  const [currencyConfig, setCurrencyConfig] = useState<{
    symbol: string;
    position: 'prefix' | 'suffix';
  }>({ symbol: '$', position: 'prefix' });

  useEffect(() => {
    setMounted(true);
  }, []);

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
      .select('payment_methods, insurance_providers, currency_symbol, currency_position, hospital_name, brand_title, tagline, logo_url, address, phone, email')
      .limit(1)
      .maybeSingle();

    if (data) {
      setHospitalSettings(data);
      if (data.currency_symbol) {
        setCurrencyConfig({
          symbol: data.currency_symbol,
          position: (data.currency_position as 'prefix' | 'suffix') || 'prefix',
        });
      }
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

  if (!isOpen || !mounted) return null;

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

  const handlePayment = async (shouldPrint = true) => {
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

    // If print requested, prepare and launch print screen
    if (shouldPrint) {
      try {
        const { data: items } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', invoice.id);

        const newPaidAmount = (invoice.paid_amount || 0) + Number(amount);
        const newStatus = newPaidAmount >= invoice.total_amount ? 'PAID' : 'PARTIAL';

        const printableData: PrintableInvoiceData = {
          invoiceId: invoice.id,
          createdAt: new Date().toISOString(),
          status: newStatus,
          totalAmount: invoice.total_amount,
          paidAmount: newPaidAmount,
          paymentMethod: method,
          paymentReference: finalReference || undefined,
          hospital: {
            name: hospitalSettings?.hospital_name || 'Hospital Medical Center',
            brandTitle: hospitalSettings?.brand_title,
            tagline: hospitalSettings?.tagline,
            logoUrl: hospitalSettings?.logo_url,
            address: hospitalSettings?.address,
            phone: hospitalSettings?.phone,
            email: hospitalSettings?.email,
            currencySymbol: currencyConfig.symbol,
            currencyPosition: currencyConfig.position,
          },
          patient: {
            firstName: invoice.patients?.first_name || 'Patient',
            lastName: invoice.patients?.last_name || '',
            fileNumber: invoice.patients?.file_number,
            phone: invoice.patients?.phone,
            email: invoice.patients?.email,
            gender: invoice.patients?.gender,
            dob: invoice.patients?.dob,
          },
          items: (items && items.length > 0) ? items.map((i: any) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unit_price,
            totalPrice: i.total_price || (i.quantity * i.unit_price),
          })) : [
            {
              description: 'General Medical Consultation / Service',
              quantity: 1,
              unitPrice: invoice.total_amount,
              totalPrice: invoice.total_amount,
            }
          ],
        };

        printInvoiceDocument(printableData);
      } catch (err) {
        console.error('Failed to trigger receipt print:', err);
      }
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
        const formattedAmt = formatCurrencyAmount(amount, currencyConfig.symbol, currencyConfig.position);
        setStatus({
          type: 'success',
          title: 'Payment Recorded & Patient Routed',
          message: `Payment of ${formattedAmt} recorded. ${patientName} was forwarded to Central Pharmacy for medication collection.`,
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
        const formattedAmt = formatCurrencyAmount(amount, currencyConfig.symbol, currencyConfig.position);
        setStatus({
          type: 'success',
          title: 'Payment Recorded & Patient Routed',
          message: `Payment of ${formattedAmt} recorded. ${patientName} was forwarded to Diagnostic Laboratory.`,
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
        const formattedAmt = formatCurrencyAmount(amount, currencyConfig.symbol, currencyConfig.position);
        setStatus({
          type: 'success',
          title: 'Payment Recorded & Patient Routed',
          message: `Payment of ${formattedAmt} recorded. ${patientName} was queued for Doctor OPD Consultation.`,
        });
      } else {
        const formattedAmt = formatCurrencyAmount(amount, currencyConfig.symbol, currencyConfig.position);
        setStatus({
          type: 'success',
          title: 'Payment Settled',
          message: `Payment of ${formattedAmt} (${method.replace('_', ' ')}) applied. Receipt issued and patient visit complete.`,
        });
      }
    } else {
      const formattedAmt = formatCurrencyAmount(amount, currencyConfig.symbol, currencyConfig.position);
      setStatus({
        type: 'success',
        title: 'Payment Recorded',
        message: `Payment of ${formattedAmt} (${method.replace('_', ' ')}) applied to Invoice #${invoice.id.slice(0, 8)}.`,
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

  return createPortal(
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-slate-200 flex flex-col max-h-[92vh]">
          
          {/* Header */}
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-xl font-black">Record Patient Payment</h2>
              <p className="text-slate-300 text-xs font-bold uppercase tracking-wider mt-1">
                Invoice #{invoice?.id?.slice(0, 8)} •{' '}
                {invoice.patients
                  ? `${invoice.patients.first_name || ''} ${invoice.patients.last_name || ''}`.trim()
                  : 'Patient'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Amount input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                Amount Paid *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  {currencyConfig.symbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                Payment Method *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {availableMethods.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={clsx(
                      'py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center uppercase tracking-wider',
                      method === m
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100',
                    )}
                  >
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Insurance Provider Selector */}
            {method === 'INSURANCE' && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                  Insurance Provider *
                </label>
                <select
                  value={insuranceProvider}
                  onChange={(e) => setInsuranceProvider(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                >
                  {availableInsurances.map((ins) => (
                    <option key={ins} value={ins}>
                      {ins}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Transaction / Policy Reference */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                {method === 'INSURANCE' ? 'Member / Claim No.' : 'Transaction Reference'}
              </label>
              <input
                type="text"
                placeholder={
                  method === 'INSURANCE'
                    ? 'e.g. NHIMA-992384'
                    : 'e.g. Mobile Money Ref / POS Auth'
                }
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
              />
            </div>

            {/* Next Step / Patient Routing Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CornerDownRight size={14} className="text-slate-400" />
                Route Patient After Settlement
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {nextStepOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = nextStep === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setNextStep(opt.id)}
                      className={clsx(
                        'p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all',
                        isSelected
                          ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10'
                          : 'border-slate-200 bg-white hover:bg-slate-50',
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={clsx(
                            'w-6 h-6 rounded-lg flex items-center justify-center',
                            isSelected
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          <Icon size={12} />
                        </div>
                        {isSelected && (
                          <div className="w-3.5 h-3.5 rounded-full bg-slate-900 text-white flex items-center justify-center">
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

            <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => handlePayment(false)}
                disabled={loading}
                className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-all shadow-xs disabled:opacity-50"
              >
                <Save size={15} /> Save Only
              </button>
              <button
                type="button"
                onClick={() => handlePayment(true)}
                disabled={loading}
                className="flex-[1.6] bg-slate-900 text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xs disabled:opacity-50 active:scale-98"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={15} />
                ) : (
                  <>
                    <Printer size={15} /> Complete & Print Receipt
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
    </>,
    document.body
  );
}
