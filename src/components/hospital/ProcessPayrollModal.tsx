'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  DollarSign, 
  Calculator, 
  Loader2, 
  Save, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Mail, 
  Users, 
  UserCheck, 
  AlertCircle,
  Building,
  Check
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatCurrencyAmount } from '@/utils/currency';
import { useFormDraft } from '@/hooks/useFormDraft';
import { FormDraftAlert } from '@/components/common/FormDraftAlert';
import { processSinglePayrollAction, processBatchPayrollAction } from '@/app/hospital/hr/actions';

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
  const [mode, setMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [fetchingStaff, setFetchingStaff] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  // Single Staff Form State
  const [payPeriod, setPayPeriod] = useState<string>('August 2026');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [baseSalary, setBaseSalary] = useState<number>(3500);
  const [allowances, setAllowances] = useState<number>(500);
  const [deductions, setDeductions] = useState<number>(350);
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [sendEmailImmediately, setSendEmailImmediately] = useState<boolean>(true);

  // Batch Form State
  const [batchDepartmentFilter, setBatchDepartmentFilter] = useState<string>('ALL');
  const [statusResult, setStatusResult] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear();
    setPayPeriod(`${monthName} ${year}`);
  }, []);

  const payrollFormData = {
    payPeriod,
    selectedStaffId,
    baseSalary,
    allowances,
    deductions,
    paymentMethod,
    sendEmailImmediately,
  };

  const handleRestorePayroll = (saved: any) => {
    if (saved.payPeriod !== undefined) setPayPeriod(saved.payPeriod);
    if (saved.selectedStaffId !== undefined) setSelectedStaffId(saved.selectedStaffId);
    if (saved.baseSalary !== undefined) setBaseSalary(saved.baseSalary);
    if (saved.allowances !== undefined) setAllowances(saved.allowances);
    if (saved.deductions !== undefined) setDeductions(saved.deductions);
    if (saved.paymentMethod !== undefined) setPaymentMethod(saved.paymentMethod);
    if (saved.sendEmailImmediately !== undefined) setSendEmailImmediately(saved.sendEmailImmediately);
  };

  const {
    hasDraft,
    draftTimestamp,
    restoreDraft,
    clearDraft,
    lastSavedAt,
  } = useFormDraft('process_payroll', payrollFormData, handleRestorePayroll as any, {
    debounceMs: 300,
    isEnabled: isOpen && mode === 'SINGLE',
  });

  useEffect(() => {
    if (isOpen) {
      void fetchStaffProfiles();
      setStatusResult(null);
    }
  }, [isOpen]);

  const fetchStaffProfiles = async () => {
    setFetchingStaff(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, staff_number, departments(id, name)')
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

  const currentStaff = staffList.find((s) => s.id === selectedStaffId);
  const netSalary = Math.max(0, baseSalary + allowances - deductions);
  const grossSalary = baseSalary + allowances;

  // Filtered staff list for batch
  const filteredBatchStaff = staffList.filter((s) => {
    if (batchDepartmentFilter === 'ALL') return true;
    const deptName = (s.departments as any)?.name || '';
    return deptName.toLowerCase().includes(batchDepartmentFilter.toLowerCase());
  });

  const batchTotalPayout = filteredBatchStaff.length * netSalary;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusResult(null);

    try {
      if (mode === 'SINGLE') {
        if (!selectedStaffId) {
          throw new Error('Please select an employee.');
        }

        const res = await processSinglePayrollAction({
          staffId: selectedStaffId,
          payPeriod,
          baseSalary: Number(baseSalary),
          allowances: Number(allowances),
          deductions: Number(deductions),
          paymentMethod,
          sendEmailImmediately,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to disburse salary.');
        }

        clearDraft();
        const staffName = currentStaff ? `${currentStaff.first_name} ${currentStaff.last_name}` : 'Staff member';

        if (res.emailSent) {
          setStatusResult({
            type: 'success',
            title: 'Payroll Disbursed & Payslip Emailed',
            message: `${staffName}'s salary of ${formatCurrencyAmount(res.netSalary || 0, currencySymbol, currencyPosition)} has been recorded and an official payslip has been emailed to ${res.recipientEmail}.`,
          });
        } else if (res.emailWarning) {
          setStatusResult({
            type: 'warning',
            title: 'Payroll Processed (Email Notice)',
            message: `${staffName}'s payroll was recorded. Notice: ${res.emailWarning}`,
          });
        } else {
          setStatusResult({
            type: 'success',
            title: 'Payroll Disbursed',
            message: `${staffName}'s salary of ${formatCurrencyAmount(res.netSalary || 0, currencySymbol, currencyPosition)} was processed.`,
          });
        }

        onSuccess();
      } else {
        // BATCH DISBURSAL
        const staffIds = filteredBatchStaff.map((s) => s.id);
        if (staffIds.length === 0) {
          throw new Error('No staff members selected for this batch run.');
        }

        const res = await processBatchPayrollAction({
          payPeriod,
          paymentMethod,
          defaultBaseSalary: Number(baseSalary),
          defaultAllowances: Number(allowances),
          defaultDeductions: Number(deductions),
          sendEmailImmediately,
          staffIds,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to process batch payroll.');
        }

        setStatusResult({
          type: 'success',
          title: 'Batch Payroll Completed',
          message: `Disbursed salaries for ${res.processedCount} employees (Total: ${formatCurrencyAmount(res.totalPayout || 0, currencySymbol, currencyPosition)}). ${res.emailedCount || 0} payslips emailed automatically.`,
        });

        onSuccess();
      }
    } catch (err: any) {
      setStatusResult({
        type: 'error',
        title: 'Payroll Processing Failed',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-8 border border-slate-200 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Calculator size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Process Staff Payroll</h2>
              <p className="text-xs text-slate-500 font-medium">Disburse salaries and automatically send official payslips to staff emails.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/80 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setMode('SINGLE');
              setStatusResult(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'SINGLE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCheck size={14} />
            <span>Single Employee</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('BATCH');
              setStatusResult(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'BATCH'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users size={14} />
            <span>Batch All-Staff Run ({staffList.length})</span>
          </button>
        </div>

        {statusResult && (
          <div
            className={`p-4 rounded-2xl border text-xs font-medium animate-in fade-in space-y-1 ${
              statusResult.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : statusResult.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-1.5 font-black text-sm">
              {statusResult.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : (
                <AlertCircle size={16} className={statusResult.type === 'warning' ? 'text-amber-600' : 'text-rose-600'} />
              )}
              <span>{statusResult.title}</span>
            </div>
            <p className="leading-relaxed">{statusResult.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'SINGLE' && (
            <FormDraftAlert
              hasDraft={hasDraft}
              draftTimestamp={draftTimestamp}
              onRestore={restoreDraft}
              onDiscard={clearDraft}
              lastSavedAt={lastSavedAt}
            />
          )}

          {/* Pay Period & Target Selection */}
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

            {mode === 'SINGLE' ? (
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
                {currentStaff?.email && (
                  <span className="text-[11px] text-slate-400 font-medium block mt-1 truncate">
                    ✉️ {currentStaff.email}
                  </span>
                )}
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department Scope</label>
                <select 
                  value={batchDepartmentFilter}
                  onChange={(e) => setBatchDepartmentFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 mt-1 font-bold text-slate-900"
                >
                  <option value="ALL">All Departments ({staffList.length} Staff)</option>
                  <option value="Outpatient">Outpatient (OPD)</option>
                  <option value="Emergency">Emergency (ER)</option>
                  <option value="Laboratory">Laboratory</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Administration">Administration & HR</option>
                </select>
                <span className="text-[11px] text-emerald-600 font-bold block mt-1">
                  ✓ {filteredBatchStaff.length} Employees Selected
                </span>
              </div>
            )}
          </div>

          {/* Salary Breakdown Inputs */}
          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {mode === 'SINGLE' ? 'Salary Breakdown' : 'Default Standard Breakdown per Staff'}
              </h3>
              <span className="text-xs font-bold text-slate-500">
                Payment: {paymentMethod.replace(/_/g, ' ')}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600">Base Salary</label>
                <input 
                  type="number" 
                  min="0"
                  required
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold mt-1 text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-700">Allowances (+)</label>
                <input 
                  type="number" 
                  min="0"
                  value={allowances}
                  onChange={(e) => setAllowances(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-bold mt-1 text-emerald-700"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-rose-700">Deductions (-)</label>
                <input 
                  type="number" 
                  min="0"
                  value={deductions}
                  onChange={(e) => setDeductions(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-sm font-bold mt-1 text-rose-700"
                />
              </div>
            </div>

            {/* Live Net Salary Summary Banner */}
            <div className="p-4 bg-slate-900 rounded-xl text-white flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  {mode === 'SINGLE' ? 'Net Remuneration Disbursed' : `Total Batch Budget (${filteredBatchStaff.length} Staff)`}
                </span>
                <span className="text-xs font-medium text-slate-300">
                  Gross: {formatCurrencyAmount(grossSalary, currencySymbol, currencyPosition)} • Deductions: -{formatCurrencyAmount(deductions, currencySymbol, currencyPosition)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-emerald-400">
                  {formatCurrencyAmount(mode === 'SINGLE' ? netSalary : batchTotalPayout, currencySymbol, currencyPosition)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Disbursement Channel</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { id: 'DIRECT_DEPOSIT', label: 'Direct Deposit' },
                { id: 'CASH', label: 'Cash / Cheque' }
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    paymentMethod === m.id
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Automatic Email Option Checkbox */}
          <div 
            onClick={() => setSendEmailImmediately(!sendEmailImmediately)}
            className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 flex items-start gap-3 cursor-pointer select-none hover:bg-emerald-50 transition-colors"
          >
            <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${sendEmailImmediately ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'}`}>
              {sendEmailImmediately && <Check size={14} strokeWidth={3} />}
            </div>
            <div className="text-xs">
              <span className="font-bold text-emerald-950 block flex items-center gap-1.5">
                <Mail size={13} className="text-emerald-700" /> Automatically send official payslip to staff emails
              </span>
              <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                Generates a branded electronic payslip with hospital letterhead and delivers it to the employee&#39;s registered inbox.
              </p>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing Disbursal...</span>
                </>
              ) : (
                <>
                  <Calculator size={16} />
                  <span>{mode === 'SINGLE' ? 'Disburse & Send Payslip' : `Disburse ${filteredBatchStaff.length} Staff Salaries`}</span>
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
