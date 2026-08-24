'use client'

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Search, Loader2, ArrowRight, ArrowLeft, CheckCircle2, Stethoscope, MapPin, User, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useFormDraft } from '@/hooks/useFormDraft';
import { FormDraftAlert } from '@/components/common/FormDraftAlert';

interface AddErTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddErTriageModal({ isOpen, onClose, onSuccess }: AddErTriageModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stepError, setStepError] = useState<string | null>(null);

  // Quick New Emergency Patient
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dob, setDob] = useState('');

  // ER Triage Details
  const [priority, setPriority] = useState<'EMERGENCY' | 'URGENT' | 'NORMAL'>('EMERGENCY');
  const [triageLevel, setTriageLevel] = useState('Level 1 - Resuscitation');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [location, setLocation] = useState('ER Trauma Bay 1');

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const erFormData = {
    firstName,
    lastName,
    gender,
    dob,
    priority,
    triageLevel,
    chiefComplaint,
    location,
    selectedPatientId,
    selectedPatientName,
    isNewPatient,
  };

  const handleRestoreEr = (saved: any) => {
    if (saved.firstName !== undefined) setFirstName(saved.firstName);
    if (saved.lastName !== undefined) setLastName(saved.lastName);
    if (saved.gender !== undefined) setGender(saved.gender);
    if (saved.dob !== undefined) setDob(saved.dob);
    if (saved.priority !== undefined) setPriority(saved.priority);
    if (saved.triageLevel !== undefined) setTriageLevel(saved.triageLevel);
    if (saved.chiefComplaint !== undefined) setChiefComplaint(saved.chiefComplaint);
    if (saved.location !== undefined) setLocation(saved.location);
    if (saved.selectedPatientId !== undefined) setSelectedPatientId(saved.selectedPatientId);
    if (saved.selectedPatientName !== undefined) setSelectedPatientName(saved.selectedPatientName);
    if (saved.isNewPatient !== undefined) setIsNewPatient(saved.isNewPatient);
  };

  const {
    hasDraft,
    draftTimestamp,
    restoreDraft,
    clearDraft,
    lastSavedAt,
  } = useFormDraft('er_triage', erFormData, handleRestoreEr as any, {
    debounceMs: 300,
    isEnabled: isOpen,
  });

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

  if (!isOpen) return null;

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!isNewPatient && !selectedPatientId) {
        setStepError('Please search and select an existing patient, or choose Quick Emergency Register.');
        return false;
      }
      if (isNewPatient && (!firstName.trim() || !lastName.trim())) {
        setStepError('Please enter at least First Name and Last Name for emergency registration.');
        return false;
      }
    } else if (step === 2) {
      if (!chiefComplaint.trim()) {
        setStepError('Please provide a Chief Complaint or Trauma Description.');
        return false;
      }
    }
    setStepError(null);
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => (prev < 3 ? (prev + 1) as 1 | 2 | 3 : prev));
    }
  };

  const handleBack = () => {
    setStepError(null);
    setCurrentStep(prev => (prev > 1 ? (prev - 1) as 1 | 2 | 3 : prev));
  };

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStepError('Offline Mode Active: Your emergency triage case is securely saved locally. Please wait until your connection returns to queue the patient.');
      return;
    }

    setLoading(true);
    let patientIdToUse = selectedPatientId;

    if (isNewPatient || !patientIdToUse) {
      const fileNo = `ER-${Math.floor(100000 + Math.random() * 900000)}`;
      const { data: newPatient, error: pErr } = await supabase
        .from('patients')
        .insert({
          first_name: firstName.trim() || 'Unknown',
          last_name: lastName.trim() || 'Trauma Patient',
          file_number: fileNo,
          gender,
          dob: dob || new Date().toISOString().slice(0, 10),
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

    const { error: queueErr } = await supabase
      .from('walkin_queue')
      .insert({
        patient_id: patientIdToUse,
        status: 'WAITING',
        priority: priority,
        reason: `${triageLevel} - ${chiefComplaint || 'Acute Trauma'} (${location})`,
        created_at: new Date().toISOString()
      });

    if (queueErr) {
      alert(`Error logging ER triage: ${queueErr.message}`);
    } else {
      clearDraft();
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header & Step Bar */}
        <div className="p-6 border-b border-slate-100 bg-rose-50/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/20">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">New ER Triage Case</h2>
                <p className="text-xs text-slate-500 font-medium">Step-by-step emergency assessment & queueing.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white border border-transparent hover:border-slate-200 transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Step Progress Pills */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
              currentStep === 1 
                ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-500/20' 
                : currentStep > 1 
                ? 'bg-rose-100/60 border-rose-200 text-rose-900' 
                : 'bg-white border-slate-200 text-slate-400'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                currentStep === 1 ? 'bg-white text-rose-600' : currentStep > 1 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {currentStep > 1 ? <CheckCircle2 size={12} /> : '1'}
              </div>
              <span className="text-[11px] font-bold truncate">Patient</span>
            </div>

            <div className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
              currentStep === 2 
                ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-500/20' 
                : currentStep > 2 
                ? 'bg-rose-100/60 border-rose-200 text-rose-900' 
                : 'bg-white border-slate-200 text-slate-400'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                currentStep === 2 ? 'bg-white text-rose-600' : currentStep > 2 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {currentStep > 2 ? <CheckCircle2 size={12} /> : '2'}
              </div>
              <span className="text-[11px] font-bold truncate">Acuity</span>
            </div>

            <div className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
              currentStep === 3 
                ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-500/20' 
                : 'bg-white border-slate-200 text-slate-400'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                currentStep === 3 ? 'bg-white text-rose-600' : 'bg-slate-100 text-slate-400'
              }`}>
                3
              </div>
              <span className="text-[11px] font-bold truncate">Bay & Log</span>
            </div>
          </div>
        </div>

        {/* Modal Form Body */}
        <form id="er-triage-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Offline & Form Draft Alert */}
          <FormDraftAlert
            hasDraft={hasDraft}
            draftTimestamp={draftTimestamp}
            onRestore={restoreDraft}
            onDiscard={clearDraft}
            lastSavedAt={lastSavedAt}
          />

          {stepError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold animate-in fade-in">
              ⚠️ {stepError}
            </div>
          )}

          {/* STEP 1: Patient Selection / Quick Register */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 text-xs font-black text-rose-600 uppercase tracking-wider">
                <User size={15} /> Step 1: Emergency Patient Identification
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setIsNewPatient(false)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!isNewPatient ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                >
                  Search Existing Patient
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewPatient(true)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${isNewPatient ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                >
                  Quick Emergency Intake
                </button>
              </div>

              {!isNewPatient ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Search Registry by Name or MRN</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Type name or file number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>

                  {selectedPatientName && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">Selected: {selectedPatientName}</span>
                      <button 
                        type="button" 
                        onClick={() => { setSelectedPatientId(''); setSelectedPatientName(''); setSearchQuery(''); }}
                        className="text-[10px] font-bold text-rose-600 underline"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {existingPatients.length > 0 && (
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-40 overflow-y-auto">
                      {existingPatients.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { 
                            setSelectedPatientId(p.id); 
                            setSelectedPatientName(`${p.first_name} ${p.last_name}`); 
                            setSearchQuery(''); 
                            setExistingPatients([]); 
                            setStepError(null);
                          }}
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
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <label className="text-xs font-bold text-slate-700">First Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Last Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER')}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other / Unknown</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Emergency Severity & Complaint */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 text-xs font-black text-rose-600 uppercase tracking-wider">
                <Stethoscope size={15} /> Step 2: Severity Priority & Chief Complaint
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-2 block">Triage Emergency Level *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setPriority('EMERGENCY'); setTriageLevel('Level 1 - Resuscitation'); }}
                    className={`py-3 px-2 rounded-xl text-xs font-black uppercase border transition-all ${priority === 'EMERGENCY' ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                  >
                    Critical (L1-L2)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPriority('URGENT'); setTriageLevel('Level 3 - Urgent'); }}
                    className={`py-3 px-2 rounded-xl text-xs font-black uppercase border transition-all ${priority === 'URGENT' ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                  >
                    Urgent (L3)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPriority('NORMAL'); setTriageLevel('Level 4-5 - Less Urgent'); }}
                    className={`py-3 px-2 rounded-xl text-xs font-black uppercase border transition-all ${priority === 'NORMAL' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                  >
                    Non-Urgent (L4-L5)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Chief Complaint / Trauma Notes *</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="e.g. Acute chest pain, shortness of breath, MVA trauma..."
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 mt-1 resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Bay Assignment & Submission */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 text-xs font-black text-rose-600 uppercase tracking-wider">
                <MapPin size={15} /> Step 3: ER Location Assignment
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Assigned ER Trauma Bay / Bed</label>
                <select 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 mt-1"
                >
                  <option value="ER Trauma Bay 1">ER Trauma Bay 1</option>
                  <option value="ER Resus Bay 2">ER Resus Bay 2</option>
                  <option value="ER Bed 3">ER Bed 3</option>
                  <option value="ER Bed 4">ER Bed 4</option>
                  <option value="Waiting Room A">Waiting Room A</option>
                </select>
              </div>

              {/* Triage Summary Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-[10px] font-black uppercase text-slate-400">Case Summary</div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">Patient:</span>
                  <span className="text-slate-900">{isNewPatient ? `${firstName} ${lastName}` : selectedPatientName || 'Selected Patient'}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">Priority Level:</span>
                  <span className={priority === 'EMERGENCY' ? 'text-rose-600' : priority === 'URGENT' ? 'text-amber-600' : 'text-blue-600'}>{triageLevel}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">Location:</span>
                  <span className="text-slate-900">{location}</span>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Wizard Footer Navigation */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0">
          {currentStep > 1 ? (
            <button 
              type="button" 
              onClick={handleBack}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          )}

          {currentStep < 3 ? (
            <button 
              type="button" 
              onClick={handleNext}
              className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 shadow-md shadow-rose-500/20 flex items-center gap-1.5"
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button 
              type="submit" 
              form="er-triage-form"
              disabled={loading}
              className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'Submit ER Triage Case'}
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
