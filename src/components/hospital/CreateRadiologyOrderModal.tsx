'use client'

import { useState, useEffect } from 'react';
import { X, Microscope, Save, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import StatusModal from './StatusModal';

interface CreateRadiologyOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateRadiologyOrderModal({ isOpen, onClose, onSuccess }: CreateRadiologyOrderModalProps) {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      supabase.from('patients').select('id, first_name, last_name, file_number').order('first_name').then(({ data }) => {
        if (data) setPatients(data);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const patientId = formData.get('patient_id') as string;
    const modality = formData.get('modality') as string;
    const bodyPart = formData.get('body_part') as string;

    // 1. Insert radiology order
    const { data: order, error: orderError } = await supabase
      .from('radiology_orders')
      .insert({
        patient_id: patientId,
        modality: modality,
        body_part: bodyPart,
        status: 'ORDERED'
      })
      .select()
      .single();

    if (orderError) {
      setStatus({ type: 'error', title: 'Order Failed', message: orderError.message });
      setLoading(false);
      return;
    }

    // 2. Initialize radiology result
    await supabase.from('radiology_results').insert({
      order_id: order.id,
      findings: '',
      conclusion: ''
    });

    setStatus({ type: 'success', title: 'Imaging Order Created', message: `${modality} order for ${bodyPart} placed successfully.` });
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xl font-black text-slate-900">New Radiology Order (RIS)</h2>
              <p className="text-sm text-slate-500">Schedule X-Ray, CT Scan, MRI, or Ultrasound.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200">
              <X size={20} />
            </button>
          </div>

          <form id="create-rad-form" onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Select Patient</label>
              <select required name="patient_id" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20">
                <option value="">Choose Patient...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.file_number})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Modality</label>
                <select required name="modality" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20">
                  <option value="X-Ray">X-Ray</option>
                  <option value="CT Scan">CT Scan</option>
                  <option value="MRI">MRI</option>
                  <option value="Ultrasound">Ultrasound</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Body Part / Region</label>
                <input required name="body_part" placeholder="e.g. Chest AP, Abdomen, Brain" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20" />
              </div>
            </div>
          </form>

          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
            <button onClick={onClose} type="button" className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-white transition-colors">
              Cancel
            </button>
            <button disabled={loading} type="submit" form="create-rad-form" className="flex-[2] bg-brand-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><Microscope size={18} /> Order Radiology</>}
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
