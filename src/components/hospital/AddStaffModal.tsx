'use client'

import React, { useState } from 'react';
import { X, User, Mail, Shield, Loader2, Save, Hash, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { createStaffMember } from '@/app/hospital/staff/actions';
import StatusModal from './StatusModal';
import { SearchableCombobox } from '../ui/SearchableCombobox';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddStaffModal({ isOpen, onClose, onSuccess }: AddStaffModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'NURSE',
    department: 'General Outpatient (OPD)',
    staffNumber: ''
  });

  if (!isOpen) return null;

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setStepError('Please enter both First Name and Last Name.');
        return false;
      }
    }
    if (step === 2) {
      if (!formData.role) {
        setStepError('Please select a valid staff role.');
        return false;
      }
    }
    if (step === 3) {
      if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        setStepError('Please enter a valid work email address.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission on early steps if user presses Enter
    if (currentStep < 3) {
      handleNext();
      return;
    }

    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }

    if (!validateStep(2)) {
      setCurrentStep(2);
      return;
    }

    if (!validateStep(3)) {
      return;
    }

    setLoading(true);

    try {
      const effectiveEmail = formData.email.trim() || `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}.${Math.floor(1000 + Math.random() * 9000)}@hospital.com`;

      const result = await createStaffMember({
        email: effectiveEmail,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role,
        staffNumber: formData.staffNumber.trim()
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.tempPassword) {
        setStatus({
          type: 'success',
          title: 'Staff Account Created',
          message: `${formData.firstName} ${formData.lastName} (${result.staffNumber}) has been registered. Initial Password: ${result.tempPassword}`
        });
      } else {
        setStatus({
          type: 'success',
          title: 'Staff Member Added',
          message: `${formData.firstName} ${formData.lastName} (${result.staffNumber}) has been registered and sent an invitation email.`
        });
      }

    } catch (err: unknown) {
      setStatus({
        type: 'error',
        title: 'Creation Failed',
        message: err instanceof Error ? err.message : 'Failed to add staff member'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header & Step Wizard Bar */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Add New Staff Member</h2>
                <p className="text-xs text-slate-500 font-medium">Multi-step staff registration & credentialing wizard.</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200">
                <X size={20} />
              </button>
            </div>

            {/* Step Pills */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                currentStep === 1 
                  ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20' 
                  : currentStep > 1 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' 
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  currentStep === 1 ? 'bg-white text-brand-600' : currentStep > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {currentStep > 1 ? <CheckCircle2 size={12} /> : '1'}
                </div>
                <span className="text-[11px] font-bold truncate">Personal Details</span>
              </div>

              <div className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                currentStep === 2 
                  ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20' 
                  : currentStep > 2 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' 
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  currentStep === 2 ? 'bg-white text-brand-600' : currentStep > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {currentStep > 2 ? <CheckCircle2 size={12} /> : '2'}
                </div>
                <span className="text-[11px] font-bold truncate">Role & ID</span>
              </div>

              <div className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                currentStep === 3 
                  ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20' 
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  currentStep === 3 ? 'bg-white text-brand-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  3
                </div>
                <span className="text-[11px] font-bold truncate">Email & Invite</span>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <form id="add-staff-form" onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
            {stepError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold animate-in fade-in">
                ⚠️ {stepError}
              </div>
            )}

            {/* STEP 1: Personal Identification */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center gap-2 text-xs font-black text-brand-600 uppercase tracking-wider">
                  <User size={15} /> Step 1: Personal Details
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">First Name *</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" size={16} />
                      <input 
                        required
                        value={formData.firstName}
                        onChange={e => setFormData({...formData, firstName: e.target.value})}
                        placeholder="e.g. Luyando"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">Last Name *</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" size={16} />
                      <input 
                        required
                        value={formData.lastName}
                        onChange={e => setFormData({...formData, lastName: e.target.value})}
                        placeholder="e.g. Chansa"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Role & ID Assignment */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center gap-2 text-xs font-black text-brand-600 uppercase tracking-wider">
                  <Shield size={15} /> Step 2: Role & System Identification
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">Assign Role *</label>
                    <div className="relative group">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" size={16} />
                      <select 
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value})}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
                      >
                        <option value="DOCTOR">Medical Doctor</option>
                        <option value="NURSE">Nurse / Clinical Staff</option>
                        <option value="RECEPTIONIST">Receptionist / Front Desk</option>
                        <option value="PHARMACIST">Pharmacist</option>
                        <option value="ACCOUNTANT">Accountant / Billing</option>
                        <option value="WAITING_ROOM">Waiting Room Display Kiosk</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">Department Assignment</label>
                    <SearchableCombobox
                      value={formData.department}
                      onChange={(val) => setFormData(prev => ({ ...prev, department: val }))}
                      placeholder="Search or select department..."
                      options={[
                        { value: 'General Outpatient (OPD)', label: 'General Outpatient (OPD)', badge: 'Clinical' },
                        { value: 'Emergency & Trauma (ER)', label: 'Emergency & Trauma (ER)', badge: 'Emergency' },
                        { value: 'Inpatient Wards (IPD)', label: 'Inpatient Wards (IPD)', badge: 'Clinical' },
                        { value: 'Intensive Care Unit (ICU)', label: 'Intensive Care Unit (ICU)', badge: 'Critical' },
                        { value: 'Cardiology', label: 'Cardiology Department', badge: 'Specialist' },
                        { value: 'General Surgery & OT', label: 'General Surgery & Operating Theatre', badge: 'Surgical' },
                        { value: 'Obstetrics & Gynecology', label: 'Obstetrics & Gynecology (OB-GYN)', badge: 'Specialist' },
                        { value: 'Pediatrics', label: 'Pediatrics & Neonatal Care', badge: 'Specialist' },
                        { value: 'Central Pharmacy', label: 'Central Pharmacy', badge: 'Pharmacy' },
                        { value: 'Diagnostic Laboratory', label: 'Diagnostic Laboratory', badge: 'Lab' },
                        { value: 'Radiology & Imaging', label: 'Radiology & Imaging', badge: 'Imaging' },
                        { value: 'Finance & Billing', label: 'Finance & Accounts', badge: 'Admin' },
                        { value: 'Administration & HR', label: 'Administration & HR', badge: 'Admin' },
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">Staff ID Number</label>
                    <div className="relative group">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" size={16} />
                      <input 
                        value={formData.staffNumber}
                        onChange={e => setFormData({...formData, staffNumber: e.target.value})}
                        placeholder="Auto-generated if left blank"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Work Email & Final Confirmation */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center gap-2 text-xs font-black text-brand-600 uppercase tracking-wider">
                  <Mail size={15} /> Step 3: Work Email & Credentials
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider flex items-center justify-between">
                    Work Email Address
                    <span className="text-[10px] text-slate-400 normal-case font-normal">(Auto-generated if left blank)</span>
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" size={16} />
                    <input 
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder={`${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}@hospital.com`}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="text-[10px] font-black uppercase text-slate-400">Registration Summary</div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">Name:</span>
                    <span className="text-slate-900">{formData.firstName} {formData.lastName}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">Assigned Role:</span>
                    <span className="text-brand-600">{formData.role}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">Staff ID:</span>
                    <span className="text-slate-900">{formData.staffNumber || 'Auto-generated'}</span>
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

            {currentStep < 3 ? (
              <button 
                type="button" 
                onClick={handleNext}
                className="px-6 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 shadow-md shadow-brand-500/20 flex items-center gap-1.5"
              >
                Next Step <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                disabled={loading} 
                type="submit" 
                form="add-staff-form" 
                className="px-6 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Complete Registration
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <StatusModal
        isOpen={!!status}
        type={status?.type || 'success'}
        title={status?.title || ''}
        message={status?.message || ''}
        onClose={() => {
          const isSuccess = status?.type === 'success'
          setStatus(null)
          if (isSuccess) {
            onSuccess();
            onClose();
          }
        }}
      />
    </>
  );
}
