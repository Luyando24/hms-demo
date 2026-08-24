'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, BedDouble, User, Calendar, Save, Loader2, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useFormDraft } from '@/hooks/useFormDraft';
import { FormDraftAlert } from '@/components/common/FormDraftAlert';
import clsx from 'clsx';

interface NewAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewAdmissionModal({ isOpen, onClose, onSuccess }: NewAdmissionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [selectedPatientObj, setSelectedPatientObj] = useState<any | null>(null);
  const [selectedBed, setSelectedBed] = useState<string | null>(null);
  const [selectedBedObj, setSelectedBedObj] = useState<any | null>(null);
  const [admissionReason, setAdmissionReason] = useState('');
  const [stepError, setStepError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const admissionFormData = {
    selectedPatient,
    selectedPatientObj,
    selectedBed,
    selectedBedObj,
    admissionReason,
  };

  const handleRestoreAdmission = (saved: any) => {
    if (saved.selectedPatient !== undefined) setSelectedPatient(saved.selectedPatient);
    if (saved.selectedPatientObj !== undefined) setSelectedPatientObj(saved.selectedPatientObj);
    if (saved.selectedBed !== undefined) setSelectedBed(saved.selectedBed);
    if (saved.selectedBedObj !== undefined) setSelectedBedObj(saved.selectedBedObj);
    if (saved.admissionReason !== undefined) setAdmissionReason(saved.admissionReason);
  };

  const {
    hasDraft,
    draftTimestamp,
    restoreDraft,
    clearDraft,
    lastSavedAt,
  } = useFormDraft('new_admission', admissionFormData, handleRestoreAdmission as any, {
    debounceMs: 300,
    isEnabled: isOpen,
  });

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

  if (!isOpen || !mounted) return null;

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!selectedPatient || !selectedBed) {
        setStepError('Please select both a Patient and an Available Ward Bed to proceed.');
        return false;
      }
    }
    setStepError(null);
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setStepError(null);
    setCurrentStep(1);
  };

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedBed) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStepError('Offline Mode Active: Your ward admission draft is preserved locally. Please wait until your connection returns to confirm bed placement.');
      return;
    }

    setLoading(true);
    const { error: admissionError } = await supabase
      .from('admissions')
      .insert({
        patient_id: selectedPatient,
        bed_id: selectedBed,
        reason: admissionReason.trim() || undefined,
        status: 'ACTIVE'
      });

    if (!admissionError) {
      await supabase
        .from('beds')
        .update({ status: 'OCCUPIED' })
        .eq('id', selectedBed);
      
      clearDraft();
      onSuccess();
      onClose();
    } else {
      alert(`Admission failed: ${admissionError.message}`);
    }
    setLoading(false);
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
        
        {/* Header & Wizard Bar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <BedDouble className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 leading-tight">Patient Ward Admission</h2>
                <p className="text-xs text-slate-500 font-medium">Inpatient Bed Placement & Clinical Assignment.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200">
              <X size={20} />
            </button>
          </div>

          {/* Step Indicators */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
              currentStep === 1 
                ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep === 1 ? 'bg-white text-brand-600' : 'bg-emerald-600 text-white'
              }`}>
                {currentStep > 1 ? <CheckCircle2 size={12} /> : '1'}
              </div>
              <span className="text-xs font-bold truncate">Patient & Ward Bed</span>
            </div>

            <div className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
              currentStep === 2 
                ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20' 
                : 'bg-white border-slate-200 text-slate-400'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep === 2 ? 'bg-white text-brand-600' : 'bg-slate-100 text-slate-400'
              }`}>
                2
              </div>
              <span className="text-xs font-bold truncate">Clinical Reason & Confirm</span>
            </div>
          </div>
        </div>

        {/* Modal Form Body */}
        <form id="admission-form" onSubmit={handleAdmit} className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
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

          {/* STEP 1: Patient & Bed Selection */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Patient Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-brand-600" />
                    1. Select Patient
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Name or File Number..."
                      value={searchQuery}
                      onChange={(e) => searchPatients(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {patients.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedPatient(p.id); setSelectedPatientObj(p); setStepError(null); }}
                        className={clsx(
                          "w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between group text-xs",
                          selectedPatient === p.id ? "bg-brand-50 border-brand-200 shadow-sm" : "border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div>
                          <p className={clsx("font-bold", selectedPatient === p.id ? "text-brand-700" : "text-slate-800")}>
                            {p.first_name} {p.last_name}
                          </p>
                          <p className="text-[10px] font-medium text-slate-400 uppercase">MRN: {p.file_number}</p>
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
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <BedDouble size={14} className="text-brand-600" />
                    2. Select Vacant Bed
                  </label>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {beds.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-8">No vacant beds available</p>
                    ) : beds.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { setSelectedBed(b.id); setSelectedBedObj(b); setStepError(null); }}
                        className={clsx(
                          "w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between group text-xs",
                          selectedBed === b.id ? "bg-brand-50 border-brand-200 shadow-sm" : "border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div>
                          <p className={clsx("font-bold", selectedBed === b.id ? "text-brand-700" : "text-slate-800")}>
                            Bed {b.bed_number}
                          </p>
                          <p className="text-[10px] font-medium text-slate-400 uppercase">
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
            </div>
          )}

          {/* STEP 2: Clinical Details & Confirmation */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-brand-600" />
                  Reason for Admission / Preliminary Notes
                </label>
                <textarea 
                  rows={3}
                  placeholder="Clinical reason for admission, admitting physician notes, or diagnostic summary..."
                  value={admissionReason}
                  onChange={(e) => setAdmissionReason(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                />
              </div>

              {/* Admission Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="text-[10px] font-black uppercase text-slate-400">Admission Overview</div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">Patient:</span>
                  <span className="text-slate-900">{selectedPatientObj ? `${selectedPatientObj.first_name} ${selectedPatientObj.last_name}` : 'Selected Patient'}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">Ward & Bed:</span>
                  <span className="text-brand-600">{selectedBedObj ? `Bed ${selectedBedObj.bed_number} (${selectedBedObj.wards?.name})` : 'Selected Bed'}</span>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Controls Footer */}
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

          {currentStep < 2 ? (
            <button 
              type="button" 
              onClick={handleNext}
              className="px-6 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 shadow-md shadow-brand-500/20 flex items-center gap-1.5"
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button 
              type="submit"
              form="admission-form"
              disabled={loading || !selectedPatient || !selectedBed}
              className="px-6 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Confirm Admission
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
