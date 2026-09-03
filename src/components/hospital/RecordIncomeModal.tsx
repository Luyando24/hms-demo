'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, DollarSign, Loader2, Save, FileText, Calendar, Tag, CreditCard, ArrowDownLeft, CheckCircle2 } from 'lucide-react';
import { recordIncomeAction } from '@/app/hospital/finance/actions';

interface RecordIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currencySymbol?: string;
  currencyPosition?: 'prefix' | 'suffix';
}

const INCOME_CATEGORIES = [
  { id: 'DIRECT_PATIENT', label: 'Direct Patient Consultation / Cashier Inflow' },
  { id: 'PHARMACY_CASH', label: 'Over-the-counter Pharmacy & Meds Sales' },
  { id: 'LAB_DIAGNOSTICS', label: 'Walk-in Lab & Pathology Diagnostic Fees' },
  { id: 'RADIOLOGY_IMAGING', label: 'Walk-in Radiology / Scan Imaging Fees' },
  { id: 'AMBULANCE_TRANSPORT', label: 'Emergency Ambulance & Transport Fees' },
  { id: 'DONATION_GRANT', label: 'Philanthropic Donation / Medical Grant' },
  { id: 'INSURANCE_SETTLEMENT', label: 'Third-party Insurance Settlement' },
  { id: 'CANTEEN_LEASE', label: 'Facility Lease / Cafeteria Revenue' },
  { id: 'RESEARCH_TRAINING', label: 'Clinical Training & Research Practicum' },
  { id: 'OTHER', label: 'Other Miscellaneous Inflow' },
];

export default function RecordIncomeModal({
  isOpen,
  onClose,
  onSuccess,
  currencySymbol = '$',
  currencyPosition = 'prefix',
}: RecordIncomeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('DIRECT_PATIENT');
  const [amount, setAmount] = useState<string | number>('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setCategory('DIRECT_PATIENT');
      setAmount('');
      setIncomeDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('CASH');
      setReferenceNumber('');
      setNotes('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      setErrorMsg('Please enter a valid income amount greater than zero.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const res = await recordIncomeAction({
      title,
      category,
      amount: numAmount,
      incomeDate,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to record income entry.');
    }
    setSubmitting(false);
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 border border-slate-200 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Record Manual Income</h2>
              <p className="text-xs text-slate-500 font-medium">Log direct cash collections, grants, or auxiliary facility revenue.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Income Title / Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. Donation from Rotary Club, Cafeteria Rent, Walk-in Consultation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none mt-1"
              >
                {INCOME_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Amount ({currencySymbol}) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date *</label>
              <input
                type="date"
                required
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none mt-1"
              >
                <option value="CASH">Cash Payment</option>
                <option value="BANK_TRANSFER">Bank Wire / Transfer</option>
                <option value="MOBILE_MONEY">Mobile Money (M-Pesa, Airtel, MTN)</option>
                <option value="POS_CARD">Credit / Debit Card (POS)</option>
                <option value="CHEQUE">Bank Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Reference / Receipt Number</label>
            <input
              type="text"
              placeholder="e.g. REC-8921, TXN-998812, CHQ-4401"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Additional Notes / Payer Details</label>
            <textarea
              rows={2}
              placeholder="Optional remarks, payer name, organization..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none mt-1"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving Inflow...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Record Income</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
