'use client'

import { useState } from 'react';
import { X, CheckCircle2, Save, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import StatusModal from './StatusModal';

interface EnterLabResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  labResult: any;
  patientName: string;
}

export default function EnterLabResultModal({ isOpen, onClose, onSuccess, labResult, patientName }: EnterLabResultModalProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const supabase = createClient();

  if (!isOpen || !labResult) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const resultValue = formData.get('result_value') as string;
    const unit = formData.get('unit') as string;
    const referenceRange = formData.get('reference_range') as string;
    const resultStatus = formData.get('status') as string;

    // 1. Update lab_results
    const { error: resultError } = await supabase
      .from('lab_results')
      .update({
        result_value: resultValue,
        unit: unit,
        reference_range: referenceRange,
        status: resultStatus || 'COMPLETED'
      })
      .eq('id', labResult.id);

    if (resultError) {
      setStatus({ type: 'error', title: 'Update Failed', message: resultError.message });
      setLoading(false);
      return;
    }

    // 2. Update order status
    if (labResult.order_id) {
      await supabase
        .from('lab_orders')
        .update({ status: resultStatus === 'COMPLETED' ? 'COMPLETED' : 'PROCESSING' })
        .eq('id', labResult.order_id);
    }

    setStatus({ type: 'success', title: 'Results Submitted', message: `Lab results recorded for ${patientName}.` });
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xl font-black text-slate-900">Enter Lab Results</h2>
              <p className="text-sm text-slate-500">{patientName} • <span className="font-bold text-slate-700">{labResult.test_name}</span></p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200">
              <X size={20} />
            </button>
          </div>

          <form id="enter-result-form" onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Result Value</label>
              <input required name="result_value" defaultValue={labResult.result_value || ''} placeholder="e.g. 13.5, Positive, 120/80" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Unit</label>
                <input name="unit" defaultValue={labResult.unit || ''} placeholder="g/dL, mg/dL" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Ref Range</label>
                <input name="reference_range" defaultValue={labResult.reference_range || ''} placeholder="11.5 - 16.0" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Status</label>
              <select name="status" defaultValue={labResult.status || 'COMPLETED'} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20">
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="VALIDATED">Validated</option>
              </select>
            </div>
          </form>

          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
            <button onClick={onClose} type="button" className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-white transition-colors">
              Cancel
            </button>
            <button disabled={loading} type="submit" form="enter-result-form" className="flex-[2] bg-brand-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={18} /> Save Lab Result</>}
            </button>
          </div>
        </div>
      </div>

      <StatusModal
        isOpen={!!status}
        type={status?.type || 'success'}
        title={status?.title || ''}
        message={status?.message || ''}
        onClose={() => {
          const isSuccess = status?.type === 'success';
          setStatus(null);
          if (isSuccess) {
            onSuccess();
            onClose();
          }
        }}
      />
    </>
  );
}
