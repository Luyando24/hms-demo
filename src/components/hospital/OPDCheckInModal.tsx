'use client'

import { useState, useEffect } from 'react';
import { X, Search, LogIn, User, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import clsx from 'clsx';
import StatusModal from './StatusModal';

interface OPDCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OPDCheckInModal({ isOpen, onClose }: OPDCheckInModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setPatients([]);
      setSelectedPatient(null);
    }
  }, [isOpen]);

  const searchPatients = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setPatients([]);
      return;
    }
    
    setLoading(true);
    const { data } = await supabase
      .from('patients')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,file_number.ilike.%${query}%`)
      .limit(5);
    
    if (data) setPatients(data);
    setLoading(false);
  };

  const handleCheckIn = async () => {
    if (!selectedPatient) return;

    setLoading(true);
    
    // 1. Create walk-in queue record
    const { error: queueError } = await supabase.from('walkin_queue').insert({
      patient_id: selectedPatient.id,
      status: 'WAITING',
      priority: 'NORMAL'
    });

    if (queueError) {
      setStatus({
        type: 'error',
        title: 'Check-in Failed',
        message: queueError.message
      });
      setLoading(false);
      return;
    }

    // 2. Create consultation fee invoice (optional but consistent with reception flow)
    await supabase.from('invoices').insert({
      patient_id: selectedPatient.id,
      total_amount: 150.00,
      status: 'UNPAID'
    });

    setStatus({
      type: 'success',
      title: 'Check-in Successful',
      message: `${selectedPatient.first_name} ${selectedPatient.last_name} has been added to the OPD queue.`
    });
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <LogIn className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 leading-tight">OPD Check-in</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Quick Patient Queuing</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <User size={14} className="text-brand-600" />
                Select Patient
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search name or file number..."
                  value={searchQuery}
                  onChange={(e) => searchPatients(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {patients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={clsx(
                      "w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between group",
                      selectedPatient?.id === p.id ? "bg-brand-50 border-brand-200 shadow-sm" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                        selectedPatient?.id === p.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        {p.first_name[0]}{p.last_name[0]}
                      </div>
                      <div>
                        <p className={clsx("text-sm font-black", selectedPatient?.id === p.id ? "text-brand-900" : "text-slate-900")}>
                          {p.first_name} {p.last_name}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.file_number}</p>
                      </div>
                    </div>
                    {selectedPatient?.id === p.id && <CheckCircle2 className="text-brand-600" size={20} />}
                  </button>
                ))}
                {searchQuery.length >= 2 && patients.length === 0 && !loading && (
                  <p className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest italic">No patients found</p>
                )}
              </div>
            </div>

            <button 
              onClick={handleCheckIn}
              disabled={loading || !selectedPatient}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
              Complete Check-in
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
          if (isSuccess) onClose();
        }}
      />
    </>
  );
}
