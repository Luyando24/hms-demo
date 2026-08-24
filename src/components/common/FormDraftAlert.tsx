'use client';

import React from 'react';
import { History, RotateCcw, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

interface FormDraftAlertProps {
  hasDraft: boolean;
  draftTimestamp: Date | null;
  onRestore: () => void;
  onDiscard: () => void;
  lastSavedAt?: Date | null;
  className?: string;
}

export function FormDraftAlert({
  hasDraft,
  draftTimestamp,
  onRestore,
  onDiscard,
  lastSavedAt,
  className,
}: FormDraftAlertProps) {
  if (!hasDraft && !lastSavedAt) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (hasDraft && draftTimestamp) {
    return (
      <div
        className={clsx(
          'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl text-amber-900 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200',
          className,
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <History size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight">Unsaved Draft Recovered</p>
            <p className="text-[10px] text-amber-700 font-medium mt-0.5 truncate">
              Auto-saved locally at {formatTime(draftTimestamp)}. Would you like to restore your inputs?
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={onDiscard}
            className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:text-rose-700 hover:bg-amber-100/60 rounded-lg transition-colors flex items-center gap-1"
          >
            <Trash2 size={12} /> Discard
          </button>
          <button
            type="button"
            onClick={onRestore}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all flex items-center gap-1 active:scale-98"
          >
            <RotateCcw size={12} /> Restore Draft
          </button>
        </div>
      </div>
    );
  }

  if (lastSavedAt) {
    return (
      <div className={clsx('flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold', className)}>
        <ShieldCheck size={12} className="text-emerald-500" />
        <span>Draft saved locally ({formatTime(lastSavedAt)})</span>
      </div>
    );
  }

  return null;
}
