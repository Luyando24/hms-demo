'use client'

import { useState, useEffect } from 'react';
import { X, Search, BedDouble, User, Calendar, Save, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import clsx from 'clsx';

interface NewAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewAdmissionModal({ isOpen, onClose, onSuccess }: NewAdmissionModalProps) {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [selectedBed, setSelectedBed] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchBeds();
    }
  }, [isOpen]);

  const fetchBeds = async () => {
    const { data } = await supabase
      .from('beds')
      .select('*, wards(*)')
      .eq('status', 'VACANT');
    if (data) setBeds(data);
  };

  const searchPatients = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setPatients([]);
      return;
    }
    const { data } = await supabase
      .from('patients')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,file_number.ilike.%${query}%`)
      .limit(5);
    if (data) setPatients(data);
  };

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedBed) return;

    setLoading(true);
    const { error: admissionError } = await supabase
      .from('admissions')
      .insert({
        patient_id: selectedPatient,
        bed_id: selectedBed,
        status: 'ACTIVE'
      });

    if (!admissionError) {
      await supabase
        .from('beds')
        .update({ status: 'OCCUPIED' })
        .eq('id', selectedBed);
      
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <BedDouble className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">Patient Admission</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">IPD Ward Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleAdmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Patient Selection */}
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <User size={14} className="text-brand-600" />
                Find Patient
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Name or File Number..."
                  value={searchQuery}
                  onChange={(e) => searchPatients(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {patients.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPatient(p.id)}
                    className={clsx(
                      "w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between group",
                      selectedPatient === p.id ? "bg-brand-50 border-brand-200 shadow-sm" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div>
                      <p className={clsx("text-sm font-bold", selectedPatient === p.id ? "text-brand-700" : "text-slate-700")}>
                        {p.first_name} {p.last_name}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">MRN: {p.file_number}</p>
                    </div>
                    <div className={clsx(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                      selectedPatient === p.id ? "border-brand-600 bg-brand-600" : "border-slate-200"
                    )}>
                      {selectedPatient === p.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bed Selection */}
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <BedDouble size={14} className="text-brand-600" />
                Assign Bed
              </label>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                {beds.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">No vacant beds available</p>
                ) : beds.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBed(b.id)}
                    className={clsx(
                      "w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between group",
                      selectedBed === b.id ? "bg-brand-50 border-brand-200 shadow-sm" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div>
                      <p className={clsx("text-sm font-bold", selectedBed === b.id ? "text-brand-700" : "text-slate-700")}>
                        Bed {b.bed_number}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                        {b.wards?.name} • {b.wards?.floor}
                      </p>
                    </div>
                    <div className={clsx(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                      selectedBed === b.id ? "border-brand-600 bg-brand-600" : "border-slate-200"
                    )}>
                      {selectedBed === b.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} className="text-brand-600" />
              Admission Details
            </label>
            <textarea 
              placeholder="Reason for admission / Preliminary diagnosis..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all min-h-[100px]"
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading || !selectedPatient || !selectedBed}
              className="flex-[2] bg-brand-600 text-white px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Confirm Admission
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
