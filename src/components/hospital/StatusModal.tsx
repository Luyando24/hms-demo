'use client'

import React from 'react'
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
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Top Accent Bar */}
        <div className={clsx(
          "h-2 w-full",
          type === 'success' ? "bg-emerald-500" : "bg-rose-500"
        )} />

        <div className="p-8 flex flex-col items-center text-center">
          {/* Icon */}
          <div className={clsx(
            "w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-lg",
            type === 'success' ? "bg-emerald-50 text-emerald-500 shadow-emerald-500/10" : "bg-rose-50 text-rose-500 shadow-rose-500/10"
          )}>
            {type === 'success' ? <CheckCircle2 size={40} strokeWidth={2.5} /> : <AlertCircle size={40} strokeWidth={2.5} />}
          </div>

          {/* Content */}
          <h3 className="text-2xl font-black text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-500 text-[15px] leading-relaxed mb-8">
            {message}
          </p>

          {/* Action Button */}
          <button
            onClick={onClose}
            className={clsx(
              "w-full py-4 rounded-2xl font-bold text-sm transition-all shadow-lg",
              type === 'success' 
                ? "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20" 
                : "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/20"
            )}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
