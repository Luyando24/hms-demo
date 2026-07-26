'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { X, DollarSign, CreditCard, Save, Shield } from 'lucide-react'
import StatusModal from './StatusModal'

interface RecordPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: any
  onSuccess: () => void
}

export default function RecordPaymentModal({ isOpen, onClose, invoice, onSuccess }: RecordPaymentModalProps) {
  const [amount, setAmount] = useState(invoice?.total_amount || 0)
  const [method, setMethod] = useState('CASH')
  const [insuranceProvider, setInsuranceProvider] = useState('')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [availableMethods, setAvailableMethods] = useState<string[]>(['CASH', 'CARD', 'MOBILE_MONEY', 'INSURANCE', 'BANK_TRANSFER', 'CHEQUE'])
  const [availableInsurances, setAvailableInsurances] = useState<string[]>(['NHIMA', 'Prudential', 'Sanlam', 'Madison Health', 'Professional Life', 'Medland Direct'])
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      setAmount(invoice ? (invoice.total_amount - (invoice.paid_amount || 0)) : 0);
      fetchPaymentSettings();
    }
  }, [isOpen, invoice]);

  const fetchPaymentSettings = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('payment_methods, insurance_providers')
      .limit(1)
      .maybeSingle();

    if (data) {
      if (data.payment_methods && Array.isArray(data.payment_methods) && data.payment_methods.length > 0) {
        setAvailableMethods(data.payment_methods);
        setMethod(data.payment_methods[0]);
      }
      if (data.insurance_providers && Array.isArray(data.insurance_providers) && data.insurance_providers.length > 0) {
        setAvailableInsurances(data.insurance_providers);
        setInsuranceProvider(data.insurance_providers[0]);
      }
    }
  };

  if (!isOpen) return null;

  const handlePayment = async () => {
    setLoading(true);
    
    const finalReference = method === 'INSURANCE' 
      ? `Insurance: ${insuranceProvider}${reference ? ` (Ref: ${reference})` : ''}`
      : reference;

    // 1. Insert payment record
    const { error: paymentError } = await supabase.from('payments').insert({
      invoice_id: invoice.id,
      amount: amount,
      payment_method: method,
      reference_number: finalReference
    });

    if (paymentError) {
      setStatus({
        type: 'error',
        title: 'Payment Failed',
        message: paymentError.message
      });
      setLoading(false);
      return;
    }

    // 2. Update invoice status
    const newPaidAmount = (invoice.paid_amount || 0) + parseFloat(amount.toString());
    const newStatus = newPaidAmount >= invoice.total_amount ? 'PAID' : 'PARTIAL';

    const { error: invoiceError } = await supabase.from('invoices').update({
      paid_amount: newPaidAmount,
      status: newStatus
    }).eq('id', invoice.id);

    if (invoiceError) {
      setStatus({
        type: 'error',
        title: 'Update Failed',
        message: invoiceError.message
      });
    } else {
      setStatus({
        type: 'success',
        title: 'Payment Recorded',
        message: `Payment of ${amount} (${method.replace('_', ' ')}) applied to Invoice #${invoice.id.slice(0, 8)}.`
      });
    }
    
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-slate-200">
          <div className="bg-brand-600 p-6 text-white flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black">Record Patient Payment</h2>
              <p className="text-brand-100 text-xs font-bold uppercase tracking-wider mt-1">Invoice #{invoice?.id?.slice(0, 8)}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Payment Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="number" 
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {availableMethods.map((m) => (
                  <option key={m} value={m}>
                    {m.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {method === 'INSURANCE' && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <label className="block text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Shield size={14} /> Insurance Provider
                </label>
                <select
                  value={insuranceProvider}
                  onChange={(e) => setInsuranceProvider(e.target.value)}
                  className="w-full px-4 py-3.5 bg-purple-50/50 border border-purple-200 rounded-2xl text-sm font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
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
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Reference / Policy # (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. Policy #, Claim #, Transaction ID"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="pt-4">
              <button 
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50"
              >
                <Save size={20} />
                {loading ? 'Processing...' : 'Complete Payment'}
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
          const isSuccess = status?.type === 'success'
          setStatus(null)
          if (isSuccess) {
            onSuccess()
            onClose()
          }
        }}
      />
    </>
  )
}
