'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { X, DollarSign, CreditCard, Save } from 'lucide-react'
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
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null)
  const supabase = createClient()

  if (!isOpen) return null

  const handlePayment = async () => {
    setLoading(true)
    
    // 1. Insert payment record
    const { error: paymentError } = await supabase.from('payments').insert({
      invoice_id: invoice.id,
      amount: amount,
      payment_method: method,
      reference_number: reference
    })

    if (paymentError) {
      setStatus({
        type: 'error',
        title: 'Payment Failed',
        message: paymentError.message
      })
      setLoading(false)
      return
    }

    // 2. Update invoice status (simplification: mark as paid if full amount)
    const newPaidAmount = (invoice.paid_amount || 0) + parseFloat(amount.toString())
    const newStatus = newPaidAmount >= invoice.total_amount ? 'PAID' : 'PARTIAL'

    const { error: invoiceError } = await supabase.from('invoices').update({
      paid_amount: newPaidAmount,
      status: newStatus
    }).eq('id', invoice.id)

    if (invoiceError) {
      setStatus({
        type: 'error',
        title: 'Update Failed',
        message: invoiceError.message
      })
    } else {
      setStatus({
        type: 'success',
        title: 'Payment Recorded',
        message: `Payment of $${amount} has been successfully applied to Invoice #${invoice.id.slice(0, 8)}.`
      })
    }
    
    setLoading(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="bg-brand-600 p-6 text-white flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black">Record Payment</h2>
              <p className="text-brand-100 text-xs font-bold uppercase tracking-wider mt-1">Invoice #{invoice?.id?.slice(0, 8)}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Payment Amount ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value))}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                {['CASH', 'CARD', 'MOBILE_MONEY', 'INSURANCE'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                      method === m 
                      ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-brand-500'
                    }`}
                  >
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Reference Number (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. Transaction ID, Receipt #"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
