'use client'

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, UserPlus, Search, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface AddErTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddErTriageModal({ isOpen, onClose, onSuccess }: AddErTriageModalProps) {
  const [loading, setLoading] = useState(false);
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New Patient Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('Male');

  // ER Triage Form
  const [priority, setPriority] = useState<'EMERGENCY' | 'URGENT' | 'NORMAL'>('EMERGENCY');
  const [triageLevel, setTriageLevel] = useState('Level 1 - Resuscitation');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [location, setLocation] = useState('ER Trauma Bay 1');

  const supabase = createClient();

  useEffect(() => {
    if (searchQuery.length > 1) {
      searchPatients();
    }
  }, [searchQuery]);

  const searchPatients = async () => {
    const { data } = await supabase
      .from('patients')
      .select('id, first_name, last_name, file_number')
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,file_number.ilike.%${searchQuery}%`)
      .limit(5);
    setExistingPatients(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let patientIdToUse = selectedPatientId;

    // 1. If registering a new emergency patient
    if (isNewPatient || !patientIdToUse) {
      const fileNo = `ER-${Math.floor(100000 + Math.random() * 900000)}`;
      const { data: newPatient, error: pErr } = await supabase
        .from('patients')
        .insert({
          first_name: firstName || 'Unknown',
          last_name: lastName || 'Trauma Patient',
          file_number: fileNo,
          gender: gender,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (pErr) {
        alert(`Failed to register emergency patient: ${pErr.message}`);
        setLoading(false);
        return;
      }
      patientIdToUse = newPatient.id;
    }

    // 2. Insert into walkin_queue for ER
    const { error: queueErr } = await supabase
      .from('walkin_queue')
      .insert({
        patient_id: patientIdToUse,
        department: 'ER',
        status: 'WAITING',
        priority: priority,
        reason: `${triageLevel} - ${chiefComplaint || 'Acute Trauma'} (${location})`,
        created_at: new Date().toISOString()
      });

    if (queueErr) {
      alert(`Error logging ER triage: ${queueErr.message}`);
    } else {
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 border border-slate-200 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">New ER Triage Case</h2>
              <p className="text-xs text-slate-500 font-medium">Log incoming emergency or STAT trauma patient.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Toggle Existing vs New Patient */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setIsNewPatient(false)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!isNewPatient ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              Select Existing Patient
            </button>
            <button
              type="button"
              onClick={() => setIsNewPatient(true)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${isNewPatient ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              Quick Emergency Register
            </button>
          </div>

          {!isNewPatient ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Search Patient Registry</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search name or MRN file number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              {existingPatients.length > 0 && (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-36 overflow-y-auto">
                  {existingPatients.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedPatientId(p.id); setSearchQuery(`${p.first_name} ${p.last_name}`); setExistingPatients([]); }}
                      className={`w-full p-2.5 text-left text-xs font-bold hover:bg-rose-50 flex justify-between ${selectedPatientId === p.id ? 'bg-rose-50 text-rose-700' : 'text-slate-800'}`}
                    >
                      <span>{p.first_name} {p.last_name}</span>
                      <span className="text-slate-400 uppercase">{p.file_number}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">First Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="First Name / Unknown"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Last Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>
          )}

          {/* Priority Select */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setPriority('EMERGENCY'); setTriageLevel('Level 1 - Resuscitation'); }}
              className={`py-2.5 rounded-xl text-xs font-black uppercase border transition-all ${priority === 'EMERGENCY' ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
            >
              Critical (Level 1-2)
            </button>
            <button
              type="button"
              onClick={() => { setPriority('URGENT'); setTriageLevel('Level 3 - Urgent'); }}
              className={`py-2.5 rounded-xl text-xs font-black uppercase border transition-all ${priority === 'URGENT' ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
            >
              Urgent (Level 3)
            </button>
            <button
              type="button"
              onClick={() => { setPriority('NORMAL'); setTriageLevel('Level 4-5 - Less Urgent'); }}
              className={`py-2.5 rounded-xl text-xs font-black uppercase border transition-all ${priority === 'NORMAL' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
            >
              Non-Urgent (4-5)
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Chief Complaint / Trauma Description</label>
            <input 
              type="text" 
              required
              placeholder="e.g., Severe Chest Pain, Multiple Trauma MVA, Acute Laceration"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Assigned ER Location / Bay</label>
            <select 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 mt-1 font-bold text-slate-800"
            >
              <option value="ER Trauma Bay 1">ER Trauma Bay 1</option>
              <option value="ER Resus Bay 2">ER Resus Bay 2</option>
              <option value="ER Bed 3">ER Bed 3</option>
              <option value="ER Bed 4">ER Bed 4</option>
              <option value="Waiting Room A">Waiting Room A</option>
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
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Submit ER Triage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
