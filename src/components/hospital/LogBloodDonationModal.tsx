'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Droplet, Loader2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useFormDraft } from '@/hooks/useFormDraft';
import { FormDraftAlert } from '@/components/common/FormDraftAlert';

interface LogBloodDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LogBloodDonationModal({ isOpen, onClose, onSuccess }: LogBloodDonationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [units, setUnits] = useState(1);
  const [componentType, setComponentType] = useState('Whole Blood');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const donationFormData = {
    donorName,
    bloodGroup,
    units,
    componentType,
  };

  const handleRestoreDonation = (saved: any) => {
    if (saved.donorName !== undefined) setDonorName(saved.donorName);
    if (saved.bloodGroup !== undefined) setBloodGroup(saved.bloodGroup);
    if (saved.units !== undefined) setUnits(saved.units);
    if (saved.componentType !== undefined) setComponentType(saved.componentType);
  };

  const {
    hasDraft,
    draftTimestamp,
    restoreDraft,
    clearDraft,
    lastSavedAt,
  } = useFormDraft('blood_donation', donationFormData, handleRestoreDonation as any, {
    debounceMs: 300,
    isEnabled: isOpen,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrorMsg('Offline Mode Active: Your blood donation entry is preserved locally. Please wait until your connection returns to log donor units.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.rpc('log_blood_donation', {
        p_donor_name: donorName.trim(),
        p_donor_contact: '',
        p_blood_group: bloodGroup,
        p_quantity_ml: units * 450,
        p_component_type: componentType
      });
      if (error) throw error;

      clearDraft();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        'Error logging blood donation: ' +
          (err instanceof Error ? err.message : 'Unknown error')
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 border border-slate-200 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Droplet size={20} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">New Blood Donation</h2>
              <p className="text-xs text-slate-500 font-medium">Log donor units to blood bank inventory.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="text-xs font-bold text-slate-700">Donor Name</label>
            <input 
              type="text" 
              required
              placeholder="Full Name of Donor"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 mt-1 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Blood Group</label>
              <select 
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 mt-1 font-bold text-rose-600"
              >
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Units (450ml)</label>
              <input 
                type="number" 
                min={1}
                max={10}
                required
                value={units}
                onChange={(e) => setUnits(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 mt-1 font-bold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Component Type</label>
            <select 
              value={componentType}
              onChange={(e) => setComponentType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 mt-1 font-bold text-slate-800"
            >
              <option value="Whole Blood">Whole Blood</option>
              <option value="Packed Red Cells">Packed Red Cells (PRBC)</option>
              <option value="Fresh Frozen Plasma">Fresh Frozen Plasma (FFP)</option>
              <option value="Platelets">Platelets</option>
            </select>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Log Donation'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
