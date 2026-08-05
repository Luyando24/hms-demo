'use client'

import { useState } from 'react'
import { X, User, Phone, Mail, MapPin, Calendar, Heart, Shield, Save, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import StatusModal from './StatusModal'
import { registerPatientAction } from '@/app/hospital/actions'
import { SearchableCombobox } from '../ui/SearchableCombobox'

export default function RegisterPatientModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess?: () => void }) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  // Controlled Form State for smooth multi-step validation
  const [formData, setFormData] = useState({
    file_number: '',
    first_name: '',
    last_name: '',
    dob: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    insurance_provider: '',
    insurance_policy_number: ''
  });

  const [stepError, setStepError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setStepError(null);
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.dob || !formData.gender) {
        setStepError('Please complete all required fields: First Name, Last Name, DOB, and Gender.');
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
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    const patientPayload = {
      ...(formData.file_number.trim() ? { file_number: formData.file_number.trim() } : {}),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      dob: formData.dob,
      gender: formData.gender,
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      emergency_contact_name: formData.emergency_contact_name.trim(),
      emergency_contact_phone: formData.emergency_contact_phone.trim(),
      insurance_provider: formData.insurance_provider.trim(),
      insurance_policy_number: formData.insurance_policy_number.trim(),
    };

    const { error, warning } = await registerPatientAction(patientPayload);
    
    if (error) {
      setStatus({
        type: 'error',
        title: 'Registration Failed',
        message: error
      });
    } else {
      setStatus({
        type: 'success',
        title: 'Patient Registered',
        message: warning || `${patientPayload.first_name} ${patientPayload.last_name} has been added to census records.`
      });
    }
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header & Step Wizard Bar */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Register New Patient</h2>
                <p className="text-xs text-slate-500 font-medium">Multi-step patient intake & census registration.</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200">
                <X size={20} />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                currentStep === 1 
                  ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20' 
                  : currentStep > 1 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' 
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  currentStep === 1 ? 'bg-white text-brand-600' : currentStep > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {currentStep > 1 ? <CheckCircle2 size={14} /> : '1'}
                </div>
                <span className="text-xs font-bold truncate">Personal Identity</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                currentStep === 2 
                  ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20' 
                  : currentStep > 2 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' 
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  currentStep === 2 ? 'bg-white text-brand-600' : currentStep > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {currentStep > 2 ? <CheckCircle2 size={14} /> : '2'}
                </div>
                <span className="text-xs font-bold truncate">Contact Info</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                currentStep === 3 
                  ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20' 
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  currentStep === 3 ? 'bg-white text-brand-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  3
                </div>
                <span className="text-xs font-bold truncate">Emergency & Ins.</span>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form id="registration-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            {stepError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold animate-in fade-in">
                ⚠️ {stepError}
              </div>
            )}

            {/* Step 1: Personal Identity */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center gap-2 text-xs font-black text-brand-600 uppercase tracking-wider">
                  <User size={16} /> Step 1: Basic Identification
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1">File Number (MRN)</label>
                    <input 
                      name="file_number" 
                      type="text" 
                      value={formData.file_number}
                      onChange={handleChange}
                      placeholder="Auto-generated if left blank" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1">Gender *</label>
                    <select 
                      required 
                      name="gender" 
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="">Select Gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1">First Name *</label>
                    <input 
                      required 
                      name="first_name" 
                      type="text" 
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="e.g. Mulenga" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1">Last Name *</label>
                    <input 
                      required 
                      name="last_name" 
                      type="text" 
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="e.g. Phiri" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" 
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 ml-1">Date of Birth *</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        required 
                        name="dob" 
                        type="date" 
                        value={formData.dob}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Contact Details */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center gap-2 text-xs font-black text-brand-600 uppercase tracking-wider">
                  <Phone size={16} /> Step 2: Patient Contact Info
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1">Phone Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        name="phone" 
                        type="tel" 
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+260..." 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        name="email" 
                        type="email" 
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="patient@example.com" 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" 
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1">Physical Home Address</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-4 top-3 text-slate-400" />
                      <textarea 
                        name="address" 
                        rows={3} 
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Full residential address..." 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Emergency & Insurance */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Heart size={16} className="text-rose-500" /> Emergency Contact
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Full Name</label>
                        <input 
                          name="emergency_contact_name" 
                          type="text" 
                          value={formData.emergency_contact_name}
                          onChange={handleChange}
                          placeholder="Kin / Guardian Name" 
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Phone Number</label>
                        <input 
                          name="emergency_contact_phone" 
                          type="tel" 
                          value={formData.emergency_contact_phone}
                          onChange={handleChange}
                          placeholder="Kin Phone Number" 
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 bg-purple-50/60 p-4 rounded-2xl border border-purple-200">
                    <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-2">
                      <Shield size={16} className="text-purple-600" /> Insurance Details
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-purple-700 uppercase mb-1 block">Insurance Provider</label>
                        <SearchableCombobox
                          name="insurance_provider"
                          value={formData.insurance_provider}
                          onChange={(val) => setFormData(prev => ({ ...prev, insurance_provider: val }))}
                          placeholder="Search or type provider..."
                          options={[
                            { value: 'NHIMA', label: 'NHIMA (National Health Insurance)', badge: 'Public' },
                            { value: 'Madison Health', label: 'Madison Health Insurance', badge: 'Private' },
                            { value: 'Professional Life', label: 'Professional Life Assurance', badge: 'Private' },
                            { value: 'Sanlam Medical', label: 'Sanlam Medical Insurance', badge: 'Private' },
                            { value: 'Prudential Health', label: 'Prudential Health', badge: 'Private' },
                            { value: 'Liberty Health', label: 'Liberty Health Cover', badge: 'Regional' },
                            { value: 'Hollard Health', label: 'Hollard Insurance', badge: 'Private' },
                            { value: 'Alliance Health', label: 'Alliance Health', badge: 'Private' },
                            { value: 'Medscheme', label: 'Medscheme Africa', badge: 'Regional' },
                            { value: 'Self-Pay', label: 'Self-Pay / Cash Patient', badge: 'Direct' },
                          ]}
                          inputClassName="bg-white border-purple-200 focus:ring-purple-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-purple-700 uppercase">Policy Number</label>
                        <input 
                          name="insurance_policy_number" 
                          type="text" 
                          value={formData.insurance_policy_number}
                          onChange={handleChange}
                          placeholder="Policy / Card ID Number" 
                          className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Wizard Footer Controls */}
          <div className="p-5 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4 shrink-0">
            {currentStep > 1 ? (
              <button 
                type="button" 
                onClick={handleBack} 
                className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-white transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <button 
                type="button" 
                onClick={onClose} 
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-white transition-colors"
              >
                Cancel
              </button>
            )}

            {currentStep < 3 ? (
              <button 
                type="button" 
                onClick={handleNext} 
                className="bg-brand-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/20 flex items-center gap-1.5"
              >
                Next Step <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                disabled={loading} 
                type="submit" 
                form="registration-form" 
                className="bg-brand-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Registering...' : (
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
            onClose()
            onSuccess?.()
          }
        }}
      />
    </>
  )
}
