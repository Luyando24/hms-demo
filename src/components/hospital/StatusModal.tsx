'use client'

import { useEffect } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import clsx from 'clsx'

interface StatusModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'success' | 'error'
  title: string
  message: string
  actionLabel?: string
}

export default function StatusModal({ 
  isOpen, 
  onClose, 
  type, 
  title, 
  message,
  actionLabel = 'Continue'
}: StatusModalProps) {
  // StatusModal relies on visual confirmation rather than spoken TTS voice announcements
  useEffect(() => {
    // Silent confirmation
  }, [isOpen]);

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-200/80 animate-in zoom-in-95 duration-150">
        <div className="p-6 flex flex-col items-center text-center">
          {/* Icon */}
          <div className={clsx(
            "w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-xs",
            type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60" : "bg-rose-50 text-rose-600 border border-rose-200/60"
          )}>
            {type === 'success' ? <CheckCircle2 size={24} strokeWidth={2.2} /> : <AlertCircle size={24} strokeWidth={2.2} />}
          </div>

          {/* Content */}
          <h3 className="text-base font-bold text-slate-900 mb-1.5">{title}</h3>
          <p className="text-slate-500 text-xs leading-relaxed mb-6 font-normal">
            {message}
          </p>

          {/* Action Button */}
          <button
            onClick={onClose}
            className={clsx(
              "w-full py-2.5 rounded-xl font-semibold text-xs transition-all shadow-xs active:scale-98",
              type === 'success' 
                ? "bg-slate-900 text-white hover:bg-slate-800" 
                : "bg-rose-600 text-white hover:bg-rose-700"
            )}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
