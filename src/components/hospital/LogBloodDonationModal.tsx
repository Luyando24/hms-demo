'use client'

import React, { useState } from 'react';
import { X, Droplet, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface LogBloodDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LogBloodDonationModal({ isOpen, onClose, onSuccess }: LogBloodDonationModalProps) {
  const [loading, setLoading] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [units, setUnits] = useState(1);
  const [componentType, setComponentType] = useState('Whole Blood');

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Insert into blood_donations if exists or update blood_inventory
      const { data: existingStock } = await supabase
        .from('blood_inventory')
        .select('*')
        .eq('blood_group', bloodGroup)
        .maybeSingle();

      if (existingStock) {
        await supabase
          .from('blood_inventory')
          .update({
            units_in_stock: (existingStock.units_in_stock || 0) + units,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStock.id);
      } else {
        await supabase
          .from('blood_inventory')
          .insert({
            blood_group: bloodGroup,
            units_in_stock: units,
            status: 'AVAILABLE'
          });
      }

      // Try inserting into blood_donations
      await supabase.from('blood_donations').insert({
        donor_name: donorName,
        blood_group: bloodGroup,
        units_donated: units,
        component_type: componentType,
        donation_date: new Date().toISOString()
      }).select();

      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Error logging blood donation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
    </div>
  );
}
