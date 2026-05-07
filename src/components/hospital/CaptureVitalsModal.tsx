'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { X, Activity, Thermometer, Weight, Ruler, Save, DoorOpen } from 'lucide-react'
import StatusModal from './StatusModal'

export default function CaptureVitalsModal({ isOpen, onClose, patientId, patientName }: { isOpen: boolean, onClose: () => void, patientId: string, patientName: string }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchRooms()
    }
  }, [isOpen])

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (data) setRooms(data)
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const roomId = formData.get('room_id') as string

    const vitalsData = {
      patient_id: patientId,
      bp_systolic: parseInt(formData.get('bp_systolic') as string),
      bp_diastolic: parseInt(formData.get('bp_diastolic') as string),
      heart_rate: parseInt(formData.get('heart_rate') as string),
      temperature: parseFloat(formData.get('temperature') as string),
      sp_o2: parseInt(formData.get('sp_o2') as string),
      weight: parseFloat(formData.get('weight') as string),
      height: parseFloat(formData.get('height') as string),
      recorded_at: new Date().toISOString()
    }

    const { error: vitalsError } = await supabase.from('vitals').insert(vitalsData)

    if (vitalsError) {
      setStatus({
        type: 'error',
        title: 'Save Failed',
        message: vitalsError.message
      })
      setLoading(false)
      return
    }

    // Update queue status to CONSULTATION and assign room
    const { error: queueError } = await supabase.from('walkin_queue')
      .update({ 
        status: 'CONSULTATION',
        room_id: roomId || null
      })
      .eq('patient_id', patientId)
      .eq('status', 'WAITING')

    if (queueError) {
      console.error('Queue update error:', queueError)
    }

    setStatus({
      type: 'success',
      title: 'Vitals Saved',
      message: `Vitals for ${patientName} have been recorded successfully. Patient moved to consultation queue.`
    })
    
    setLoading(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xl font-black text-slate-900">Capture Vitals</h2>
              <p className="text-sm text-slate-500">Recording vitals for <span className="text-brand-600 font-bold">{patientName}</span></p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                <Activity size={12} className="text-rose-500" /> BP Systolic
              </label>
              <input required name="bp_systolic" type="number" placeholder="120" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                <Activity size={12} className="text-rose-500" /> BP Diastolic
              </label>
              <input required name="bp_diastolic" type="number" placeholder="80" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                <Activity size={12} className="text-rose-500" /> Heart Rate
              </label>
              <input required name="heart_rate" type="number" placeholder="72" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                <Thermometer size={12} className="text-amber-500" /> Temp (°C)
              </label>
              <input required name="temperature" type="number" step="0.1" placeholder="36.5" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                <Activity size={12} className="text-blue-500" /> SpO2 (%)
              </label>
              <input required name="sp_o2" type="number" placeholder="98" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                <Weight size={12} className="text-slate-500" /> Weight (kg)
              </label>
              <input required name="weight" type="number" step="0.1" placeholder="70" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            
            {/* Room Assignment */}
            <div className="col-span-2 space-y-1.5 pt-4 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                <DoorOpen size={12} className="text-brand-600" /> Assign Consultation Room
              </label>
              <select 
                name="room_id" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">Select a room...</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 font-medium ml-1">Patient will be queued in this room for the doctor.</p>
            </div>

            <div className="col-span-2 flex gap-3 mt-4">
              <button onClick={onClose} type="button" className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button disabled={loading} type="submit" className="flex-[2] bg-brand-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? 'Saving...' : (
                  <>
                    <Save size={18} />
                    Complete Triage
                  </>
                )}
              </button>
            </div>
          </form>
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
          if (isSuccess) onClose()
        }}
      />
    </>
  )
}
