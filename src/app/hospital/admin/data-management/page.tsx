'use client';

import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Users,
  Calendar,
  Stethoscope,
  CreditCard,
  BedDouble,
  Droplet,
  Box,
  Calculator,
  Mail,
  RefreshCw,
  CheckCircle2,
  X,
  Loader2,
  Lock,
  ArrowRight,
  Database,
  Sparkles,
  Info,
} from 'lucide-react';
import clsx from 'clsx';
import {
  getDataCategoryCountsAction,
  purgeDataCategoryAction,
  PurgeCategoryKey,
  CategoryCountSummary,
} from './actions';
import StatusModal from '@/components/hospital/StatusModal';

const CATEGORY_ICONS: Record<PurgeCategoryKey, React.ElementType> = {
  PATIENTS: Users,
  APPOINTMENTS_QUEUE: Calendar,
  CLINICAL_RECORDS: Stethoscope,
  BILLING_FINANCE: CreditCard,
  INPATIENT_ADMISSIONS: BedDouble,
  BLOOD_BANK: Droplet,
  INVENTORY_PHARMACY: Box,
  HR_PAYROLL: Calculator,
  NOTIFICATIONS_LOGS: Mail,
  ALL_TRANSACTIONAL_DATA: Sparkles,
};

export default function AdminDataManagementPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Record<PurgeCategoryKey, CategoryCountSummary> | null>(null);
  const [overallTotal, setOverallTotal] = useState(0);

  // Modal State
  const [activePurgeTarget, setActivePurgeTarget] = useState<CategoryCountSummary | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [agreedCheckbox, setAgreedCheckbox] = useState(false);
  const [purging, setPurging] = useState(false);

  // Status Modal
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getDataCategoryCountsAction();
      setCategories(res.counts);
      setOverallTotal(res.overallTotal);
    } catch (err: any) {
      setStatus({
        type: 'error',
        title: 'Access Restricted',
        message: err?.message || 'Failed to load system data counts. Please ensure you are logged in as an Administrator.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenPurgeModal = (category: CategoryCountSummary) => {
    setActivePurgeTarget(category);
    setConfirmationInput('');
    setAgreedCheckbox(false);
  };

  const handleClosePurgeModal = () => {
    if (purging) return;
    setActivePurgeTarget(null);
    setConfirmationInput('');
    setAgreedCheckbox(false);
  };

  const handleExecutePurge = async () => {
    if (!activePurgeTarget) return;

    if (confirmationInput.trim() !== activePurgeTarget.confirmationWord) {
      alert(`Please type exactly "${activePurgeTarget.confirmationWord}" to confirm.`);
      return;
    }

    if (!agreedCheckbox) {
      alert('Please check the confirmation box to proceed.');
      return;
    }

    setPurging(true);

    try {
      const result = await purgeDataCategoryAction(
        activePurgeTarget.key,
        confirmationInput.trim(),
      );

      handleClosePurgeModal();
      setStatus({
        type: 'success',
        title: 'Data Permanently Deleted',
        message: result.message,
      });

      // Reload fresh counts
      await loadCounts(true);
    } catch (err: any) {
      setStatus({
        type: 'error',
        title: 'Purge Failed',
        message: err?.message || 'An error occurred during permanent data deletion.',
      });
    } finally {
      setPurging(false);
    }
  };

  const categoryList = categories
    ? (Object.keys(categories) as PurgeCategoryKey[])
        .filter((k) => k !== 'ALL_TRANSACTIONAL_DATA')
        .map((k) => categories[k])
    : [];

  const fullWipeTarget = categories ? categories['ALL_TRANSACTIONAL_DATA'] : null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-wide">
              <ShieldAlert size={13} />
              Admin Danger Zone
            </span>
            <span className="text-xs text-slate-400 font-bold">•</span>
            <span className="text-xs text-slate-500 font-bold">Client Handover & Reset Utility</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            System Data Purge & Wipe
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Permanently delete test records or execute a clean reset before delivering the system to the client.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadCounts(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh Counts
          </button>
        </div>
      </div>

      {/* Full Wipe Banner */}
      {fullWipeTarget && (
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-rose-950 via-slate-900 to-rose-900 border border-rose-700/40 p-8 text-white shadow-2xl">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-black uppercase tracking-wider">
                <Sparkles size={14} /> Master Handover Action
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Complete System Reset (Client Handover)
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                Atomically clear all test patients, queues, clinical SOAP notes, vitals, prescriptions, lab orders, radiology scans, billing invoices, admissions, and notification logs in one step.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-300 pt-1">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={15} />
                  Preserves System Settings
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={15} />
                  Preserves Departments & Wards
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={15} />
                  Preserves Admin Accounts
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 shrink-0">
              <div className="text-left lg:text-right">
                <span className="text-xs uppercase tracking-widest text-rose-300 font-bold block">
                  Total Transactional Data
                </span>
                <span className="text-4xl font-black text-white">{overallTotal}</span>
                <span className="text-xs text-slate-400 block mt-0.5">records in database</span>
              </div>

              <button
                type="button"
                onClick={() => handleOpenPurgeModal(fullWipeTarget)}
                className="px-6 py-3.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-2xl text-sm font-black shadow-lg shadow-rose-600/30 flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5"
              >
                <Trash2 size={18} />
                Wipe Entire Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Subheader */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-xl font-black text-slate-900">Categorical Data Deletion</h2>
          <p className="text-xs text-slate-500 font-medium">
            Select a specific functional module below to delete test data selectively.
          </p>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs animate-pulse h-64 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 bg-slate-100 rounded-2xl" />
                <div className="h-5 bg-slate-100 rounded-md w-3/4" />
                <div className="h-3 bg-slate-100 rounded-md w-full" />
                <div className="h-3 bg-slate-100 rounded-md w-2/3" />
              </div>
              <div className="h-10 bg-slate-100 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : (
        /* Categorical Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryList.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.key] || Database;
            const hasRecords = cat.totalRecords > 0;

            return (
              <div
                key={cat.key}
                className={clsx(
                  'bg-white rounded-3xl p-6 border transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md',
                  hasRecords
                    ? 'border-slate-200 hover:border-rose-300'
                    : 'border-slate-200/60 opacity-80',
                )}
              >
                <div className="space-y-4">
                  {/* Top Row: Icon + Count Badge */}
                  <div className="flex items-center justify-between">
                    <div
                      className={clsx(
                        'w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-xs',
                        hasRecords
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-slate-100 text-slate-400',
                      )}
                    >
                      <Icon size={22} />
                    </div>

                    <span
                      className={clsx(
                        'px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider',
                        hasRecords
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200',
                      )}
                    >
                      {cat.totalRecords} {cat.totalRecords === 1 ? 'Record' : 'Records'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-snug">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed line-clamp-3">
                      {cat.description}
                    </p>
                  </div>

                  {/* Affected Database Tables */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Affected Tables:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {cat.affectedTables.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-mono font-bold"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Breakdown if multi-table */}
                  {Object.keys(cat.breakdown).length > 1 && (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-xs">
                      {Object.entries(cat.breakdown).map(([label, count]) => (
                        <div key={label} className="flex justify-between text-slate-600 font-semibold">
                          <span className="text-[11px]">{label}:</span>
                          <span className="font-bold text-slate-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Action Button */}
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => handleOpenPurgeModal(cat)}
                    disabled={!hasRecords}
                    className={clsx(
                      'w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all',
                      hasRecords
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 shadow-xs'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                    )}
                  >
                    <Trash2 size={15} />
                    {hasRecords ? `Purge ${cat.title}` : 'No Records to Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation & Safety Modal */}
      {activePurgeTarget && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden border border-rose-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/20">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-rose-950">Confirm Permanent Deletion</h3>
                  <p className="text-xs text-rose-700 font-bold uppercase tracking-wider">
                    {activePurgeTarget.title}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClosePurgeModal}
                disabled={purging}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Warning Alert */}
              <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-rose-900 text-xs font-black uppercase tracking-wider">
                  <ShieldAlert size={16} className="text-rose-600" />
                  Irreversible Action Warning
                </div>
                <p className="text-xs text-rose-800 font-medium leading-relaxed">
                  You are about to permanently erase{' '}
                  <span className="font-black text-rose-950 underline">
                    {activePurgeTarget.totalRecords} records
                  </span>{' '}
                  from the system database. This action CANNOT be undone and data recovery is not possible.
                </p>
              </div>

              {/* Affected Tables */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Targeted Database Tables:
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {activePurgeTarget.affectedTables.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-mono font-bold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Confirmation Phrase Instruction */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 block">
                  To confirm, type{' '}
                  <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 select-all">
                    {activePurgeTarget.confirmationWord}
                  </span>{' '}
                  in the box below:
                </label>
                <input
                  type="text"
                  placeholder={`Type "${activePurgeTarget.confirmationWord}"`}
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  disabled={purging}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              {/* Acknowledgment Checkbox */}
              <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedCheckbox}
                  onChange={(e) => setAgreedCheckbox(e.target.checked)}
                  disabled={purging}
                  className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs font-bold text-slate-700 select-none">
                  I understand that this data will be permanently wiped from the database and cannot be recovered.
                </span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClosePurgeModal}
                disabled={purging}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePurge}
                disabled={
                  purging ||
                  confirmationInput.trim() !== activePurgeTarget.confirmationWord ||
                  !agreedCheckbox
                }
                className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {purging ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Erasing Database Records...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Permanently Delete Records
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Result Modal */}
      <StatusModal
        isOpen={!!status}
        type={status?.type || 'success'}
        title={status?.title || ''}
        message={status?.message || ''}
        onClose={() => setStatus(null)}
      />
    </div>
  );
}
