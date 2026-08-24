'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, User, Phone, Mail, MapPin, Calendar, Heart, Shield, Save } from 'lucide-react'
import StatusModal from './StatusModal'
import { updatePatientAction } from '@/app/hospital/actions'

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  patient: any;
}

export default function EditPatientModal({ isOpen, onClose, onSuccess, patient }: EditPatientModalProps) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted || !patient) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus({
        type: 'error',
        title: 'Offline Mode Active',
        message: 'Your updates are preserved in the form. Please wait until your internet connection returns to save edits to the patient registry.'
      })
      return
    }

    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const patientData = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      dob: formData.get('dob') as string,
      gender: formData.get('gender') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      emergency_contact_name: formData.get('emergency_contact_name') as string,
      emergency_contact_phone: formData.get('emergency_contact_phone') as string,
      insurance_provider: formData.get('insurance_provider') as string,
      insurance_policy_number: formData.get('insurance_policy_number') as string,
    }

    const { success, error } = await updatePatientAction(patient.id, patientData)
    
    if (error) {
      setStatus({
        type: 'error',
        title: 'Update Failed',
        message: error
      })
    } else {
      setStatus({
        type: 'success',
        title: 'Patient Updated',
        message: `${patientData.first_name} ${patientData.last_name}'s details have been successfully updated.`
      })
    }
    setLoading(false)
  }

  return createPortal(
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xl font-black text-slate-900">Edit Patient Record</h2>
              <p className="text-sm text-slate-500">MRN File Number: <span className="font-bold text-slate-700">{patient.file_number}</span></p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200">
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form id="edit-patient-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
            {/* Basic Info Section */}
            <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User size={14} /> Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1">Gender</label>
                  <select required name="gender" defaultValue={patient.gender} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold">
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1">Date of Birth</label>
                  <input required name="dob" type="date" defaultValue={patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1">First Name</label>
                  <input required name="first_name" type="text" defaultValue={patient.first_name} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1">Last Name</label>
                  <input required name="last_name" type="text" defaultValue={patient.last_name} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold" />
                </div>
              </div>
            </section>

            {/* Contact Details */}
            <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Phone size={14} /> Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1">Phone Number</label>
                  <input name="phone" defaultValue={patient.phone} type="tel" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1">Email Address</label>
                  <input name="email" defaultValue={patient.email} type="email" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 ml-1">Home Address</label>
                  <input name="address" defaultValue={patient.address} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium" />
                </div>
              </div>
            </section>

            {/* Emergency & Insurance Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
              <section className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Heart size={14} /> Emergency Contact
                </h3>
                <div className="space-y-3">
                  <input name="emergency_contact_name" type="text" defaultValue={patient.emergency_contact_name || ''} placeholder="Contact Name" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium" />
                  <input name="emergency_contact_phone" type="tel" defaultValue={patient.emergency_contact_phone || ''} placeholder="Contact Phone" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium" />
                </div>
              </section>
              <section className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield size={14} /> Insurance
                </h3>
                <div className="space-y-3">
                  <input name="insurance_provider" type="text" defaultValue={patient.insurance_provider || ''} placeholder="Insurance Provider" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium" />
                  <input name="insurance_policy_number" type="text" defaultValue={patient.insurance_policy_number || ''} placeholder="Policy Number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium" />
                </div>
              </section>
            </div>
          </form>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
            <button onClick={onClose} type="button" className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-white transition-colors">
              Cancel
            </button>
            <button disabled={loading} type="submit" form="edit-patient-form" className="flex-[2] bg-brand-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? 'Updating...' : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
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
          const isSuccess = status?.type === 'success'
          setStatus(null)
          if (isSuccess) {
            onClose()
            onSuccess?.()
          }
        }}
      />
    </>,
    document.body
  )
}
