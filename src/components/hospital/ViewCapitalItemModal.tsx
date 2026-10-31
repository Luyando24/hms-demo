'use client';

import { X, Monitor } from 'lucide-react';
import { CapitalItem } from '@/types/inventory';
import clsx from 'clsx';

interface ViewCapitalItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CapitalItem | null;
  currencySymbol?: string;
}

export default function ViewCapitalItemModal({
  isOpen,
  onClose,
  item,
  currencySymbol = '$',
}: ViewCapitalItemModalProps) {
  if (!isOpen || !item) return null;

  const isOperational = item.status === 'OPERATIONAL';
  const isRepair = item.status === 'UNDER_REPAIR' || item.status === 'UNDER_MAINTENANCE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0">
              <Monitor size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                  {item.category}
                </span>
                <span
                  className={clsx(
                    'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border',
                    isOperational
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : isRepair
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  )}
                >
                  {item.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">{item.name}</h2>
              {item.model_number && (
                <p className="text-xs text-slate-400 font-mono">Model: {item.model_number}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 text-xs">
          {/* Key Identifiers */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset Tag</p>
              <p className="font-bold text-slate-900 mt-0.5 font-mono">{item.asset_tag || 'Not Tagged'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serial Number</p>
              <p className="font-bold text-slate-900 mt-0.5 font-mono">{item.serial_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Physical Location</p>
              <p className="font-bold text-slate-900 mt-0.5">{item.location || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</p>
              <p className="font-bold text-slate-900 mt-0.5">{item.department || 'Hospital General'}</p>
            </div>
          </div>

          {/* Condition and Custodian */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Physical Condition</p>
              <p className="font-bold text-slate-800 text-sm mt-1">{item.condition || 'GOOD'}</p>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Custodian</p>
              <p className="font-bold text-slate-800 text-sm mt-1">{item.assigned_to || 'General Pool'}</p>
            </div>
          </div>

          {/* Financials & Dates */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purchase Cost</p>
              <p className="font-bold text-slate-900 mt-0.5 text-sm">
                {item.purchase_cost !== undefined && item.purchase_cost !== null
                  ? `${currencySymbol}${Number(item.purchase_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purchase Date</p>
              <p className="font-bold text-slate-900 mt-0.5">{item.purchase_date || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Warranty Expiry</p>
              <p className="font-bold text-slate-900 mt-0.5">{item.warranty_expiry || 'No Warranty Logged'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next Maintenance Due</p>
              <p className="font-bold text-slate-900 mt-0.5">{item.next_maintenance || 'Not Scheduled'}</p>
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset Notes</p>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed font-medium">
                {item.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
