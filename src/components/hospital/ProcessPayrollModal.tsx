'use client'

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, DollarSign, Calculator, Loader2, Save, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatCurrencyAmount } from '@/utils/currency';
import { useFormDraft } from '@/hooks/useFormDraft';
import { FormDraftAlert } from '@/components/common/FormDraftAlert';

interface ProcessPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currencySymbol?: string;
  currencyPosition?: 'prefix' | 'suffix';
}

export default function ProcessPayrollModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  currencySymbol = '$',
  currencyPosition = 'prefix'
}: ProcessPayrollModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingStaff, setFetchingStaff] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [payPeriod, setPayPeriod] = useState<string>('July 2026');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  
  const [baseSalary, setBaseSalary] = useState<number>(3500);
  const [allowances, setAllowances] = useState<number>(500);
  const [deductions, setDeductions] = useState<number>(350);
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const payrollFormData = {
    payPeriod,
    selectedStaffId,
    baseSalary,
    allowances,
    deductions,
    paymentMethod,
  };

  const handleRestorePayroll = (saved: any) => {
    if (saved.payPeriod !== undefined) setPayPeriod(saved.payPeriod);
    if (saved.selectedStaffId !== undefined) setSelectedStaffId(saved.selectedStaffId);
    if (saved.baseSalary !== undefined) setBaseSalary(saved.baseSalary);
    if (saved.allowances !== undefined) setAllowances(saved.allowances);
    if (saved.deductions !== undefined) setDeductions(saved.deductions);
    if (saved.paymentMethod !== undefined) setPaymentMethod(saved.paymentMethod);
  };

  const {
    hasDraft,
    draftTimestamp,
    restoreDraft,
    clearDraft,
    lastSavedAt,
  } = useFormDraft('process_payroll', payrollFormData, handleRestorePayroll as any, {
    debounceMs: 300,
    isEnabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      fetchStaffProfiles();
    }
  }, [isOpen]);

  const fetchStaffProfiles = async () => {
    setFetchingStaff(true);
    // Fetch ONLY staff profiles (exclude patients)
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, staff_number')
      .neq('role', 'PATIENT')
      .order('first_name', { ascending: true });

    if (data && data.length > 0) {
      setStaffList(data);
      if (!selectedStaffId) {
        setSelectedStaffId(data[0].id);
      }
    }
    setFetchingStaff(false);
  };

  if (!isOpen || !mounted) return null;

  const netSalary = Math.max(0, baseSalary + allowances - deductions);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      alert('Please select a staff member.');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrorMsg('Offline Mode Active: Your payroll calculation is preserved locally. Please wait until your connection returns to disburse.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('payroll_records')
        .insert({
          staff_id: selectedStaffId,
          pay_period: payPeriod,
          base_salary: baseSalary,
          allowances: allowances,
          deductions: deductions,
          net_salary: netSalary,
          payment_method: paymentMethod,
          status: 'PROCESSED'
        });

      if (error) throw error;

      clearDraft();
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg('Error processing payroll record: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-8 border border-slate-200 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Calculator size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Process Staff Payroll</h2>
              <p className="text-xs text-slate-500 font-medium">Calculate earnings, tax deductions, and net salary disbursement.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Offline & Auto-save Draft Alert */}
          <FormDraftAlert
            hasDraft={hasDraft}
            draftTimestamp={draftTimestamp}
            onRestore={restoreDraft}
            onDiscard={clearDraft}
            lastSavedAt={lastSavedAt}
          />

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold animate-in fade-in">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pay Period</label>
              <input 
                type="text" 
                required
                value={payPeriod}
                onChange={(e) => setPayPeriod(e.target.value)}
                placeholder="e.g. August 2026"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 mt-1 font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Employee Staff *</label>
              <select 
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                disabled={fetchingStaff}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 mt-1 font-bold text-slate-900"
              >
                {fetchingStaff ? (
                  <option>Loading staff list...</option>
                ) : (
                  staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.role})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Salary Breakdown</h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600">Base Salary</label>
                <input 
                  type="number" 
                  min="0"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-600">+ Allowances</label>
                <input 
                  type="number" 
                  min="0"
                  value={allowances}
                  onChange={(e) => setAllowances(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 mt-1 text-emerald-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-rose-600">- Deductions (Tax/SSN)</label>
                <input 
                  type="number" 
                  min="0"
                  value={deductions}
                  onChange={(e) => setDeductions(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 mt-1 text-rose-600"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600">Payment Channel</label>
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 mt-1 text-slate-900"
              >
                <option value="BANK_TRANSFER">Direct Bank Deposit / Wire</option>
                <option value="CASH">Cash in Hand</option>
                <option value="CHEQUE">Corporate Cheque</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
              </select>
            </div>

            {/* Net Calculation Summary */}
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 uppercase">Calculated Net Payable</span>
              <span className="text-lg font-black text-emerald-700">
                {formatCurrencyAmount(netSalary, currencySymbol, currencyPosition)}
              </span>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || fetchingStaff}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
              Disburse Payroll
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
