'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Printer, 
  Mail, 
  CheckCircle2, 
  Loader2, 
  Building2, 
  DollarSign, 
  ShieldCheck, 
  Calendar, 
  User, 
  CreditCard,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { getPayslipDetailsAction, sendPayslipEmailAction } from '@/app/hospital/hr/actions';
import { formatCurrencyAmount } from '@/utils/currency';

interface ViewPayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payrollRecordId: string | null;
}

export default function ViewPayslipModal({ isOpen, onClose, payrollRecordId }: ViewPayslipModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payslipData, setPayslipData] = useState<any>(null);
  const [emailing, setEmailing] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && payrollRecordId) {
      loadPayslip(payrollRecordId);
    } else {
      setPayslipData(null);
      setEmailSuccess(null);
      setErrorMsg(null);
    }
  }, [isOpen, payrollRecordId]);

  const loadPayslip = async (id: string) => {
    setLoading(true);
    setErrorMsg(null);
    setEmailSuccess(null);

    const res = await getPayslipDetailsAction(id);
    if (res.success && res.payslip) {
      setPayslipData(res.payslip);
    } else {
      setErrorMsg(res.error || 'Failed to load payslip information.');
    }
    setLoading(false);
  };

  const handleSendEmail = async () => {
    if (!payrollRecordId) return;
    setEmailing(true);
    setEmailSuccess(null);
    setErrorMsg(null);

    try {
      const res = await sendPayslipEmailAction(payrollRecordId);
      if (res.success) {
        setEmailSuccess(`Official payslip sent successfully to ${res.recipientEmail}!`);
      } else {
        setErrorMsg(res.error || 'Failed to send email payslip.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while dispatching payslip.');
    } finally {
      setEmailing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !mounted) return null;

  const h = payslipData?.hospital;
  const s = payslipData?.staff;
  const currencySym = h?.currencySymbol || '$';
  const currencyPos = h?.currencyPosition || 'prefix';

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-payslip, #printable-payslip * {
            visibility: visible;
          }
          #printable-payslip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <FileCheck size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold">Official Salary Payslip</h3>
              <p className="text-[11px] text-slate-400">Statement of Remuneration & Deductions</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={emailing || loading || !s?.email}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              title={s?.email ? `Send to ${s.email}` : 'No email on staff profile'}
            >
              {emailing ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
              <span>{emailing ? 'Sending...' : 'Email to Staff'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !payslipData}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Printer size={13} />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Alerts for Email or Errors */}
        {emailSuccess && (
          <div className="m-4 mb-0 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 no-print animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{emailSuccess}</span>
          </div>
        )}

        {errorMsg && (
          <div className="m-4 mb-0 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center gap-2 no-print animate-in fade-in">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Payslip Printable Area */}
        <div className="p-8 overflow-y-auto max-h-[80vh]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="animate-spin text-brand-600" size={32} />
              <p className="text-xs text-slate-500 font-bold">Generating Official Payslip Document...</p>
            </div>
          ) : !payslipData ? (
            <div className="py-20 text-center text-slate-400 font-bold text-xs">
              No payslip details available.
            </div>
          ) : (
            <div id="printable-payslip" className="space-y-6 text-slate-900">
              
              {/* Document Header with Hospital Letterhead */}
              <div className="border-b-2 border-slate-900 pb-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    {h?.logoUrl && (
                      <img 
                        src={h.logoUrl} 
                        alt={h.hospitalName} 
                        className="h-10 w-auto object-contain mb-2" 
                      />
                    )}
                    <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                      {h?.brandTitle || h?.name || 'Hospital Facility'}
                    </h1>
                    {h?.tagline && (
                      <p className="text-xs text-slate-500 font-semibold">{h.tagline}</p>
                    )}
                    {h?.address && (
                      <p className="text-xs text-slate-500 font-medium">{h.address}</p>
                    )}
                    {(h?.phone || h?.email) && (
                      <p className="text-[11px] text-slate-400 font-medium">
                        {h.phone ? `Tel: ${h.phone} ` : ''}{h.email ? `• Email: ${h.email}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="text-right space-y-1">
                    <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-black tracking-wider uppercase">
                      Salary Payslip
                    </div>
                    <p className="text-sm font-black text-slate-800 mt-1">Period: {payslipData.payPeriod}</p>
                    <p className="text-[11px] font-mono text-slate-400">Ref: #{payslipData.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
              </div>

              {/* Employee & Payment Details 2-Column Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Employee Name</span>
                    <span className="text-sm font-black text-slate-900">{s?.name || 'Staff Member'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Employee Staff ID</span>
                    <span className="text-xs font-mono font-bold text-slate-700">{s?.staffNumber || 'HMS-STAFF'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Work Email</span>
                    <span className="text-xs font-semibold text-slate-700">{s?.email || 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Designation / Role</span>
                    <span className="text-sm font-black text-slate-900">{s?.role || 'STAFF'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
                    <span className="text-xs font-bold text-slate-700">{s?.department || 'Clinical / General'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Disbursal Date & Channel</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {payslipData.disbursedAt ? new Date(payslipData.disbursedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString()} via {payslipData.paymentMethod.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized Earnings & Deductions Tables */}
              <div className="grid grid-cols-2 gap-4">
                {/* Earnings Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700">
                    Earnings Breakdown
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-slate-600 font-medium">Basic Salary</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrencyAmount(payslipData.baseSalary, currencySym, currencyPos)}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-slate-600 font-medium">Allowances & Benefits</span>
                      <span className="font-bold text-emerald-600">
                        +{formatCurrencyAmount(payslipData.allowances, currencySym, currencyPos)}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5 bg-slate-50 font-black">
                      <span className="text-slate-800">Gross Earnings</span>
                      <span className="text-slate-900">
                        {formatCurrencyAmount(payslipData.grossSalary, currencySym, currencyPos)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deductions Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700">
                    Deductions Breakdown
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-slate-600 font-medium">Statutory Tax / PAYE</span>
                      <span className="font-bold text-rose-600">
                        -{formatCurrencyAmount(payslipData.deductions, currencySym, currencyPos)}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-slate-600 font-medium">Other Deductions</span>
                      <span className="font-bold text-slate-400">
                        {formatCurrencyAmount(0, currencySym, currencyPos)}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5 bg-slate-50 font-black">
                      <span className="text-slate-800">Total Deductions</span>
                      <span className="text-rose-600">
                        -{formatCurrencyAmount(payslipData.deductions, currencySym, currencyPos)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Disbursed Banner */}
              <div className="p-5 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Net Remuneration Disbursed</span>
                  <span className="text-xs text-slate-300">Credited to staff bank account / channel</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400 tracking-tight">
                    {formatCurrencyAmount(payslipData.netSalary, currencySym, currencyPos)}
                  </span>
                </div>
              </div>

              {/* Document Signatures & Verification */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Authorized HR / Payroll Signatory</span>
                  <div className="h-10 border-b border-dashed border-slate-300 flex items-end">
                    <span className="text-xs font-serif italic text-slate-600">Director of Human Resources</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Official Electronic Certification</span>
                </div>

                <div className="space-y-1 text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Official Hospital Seal</span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>✓ Verified & Audited</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Generated electronically via HMS Payroll</p>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
