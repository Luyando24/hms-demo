'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { X, Save, Package } from 'lucide-react'
import StatusModal from './StatusModal'

interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddItemModal({ isOpen, onClose, onSuccess }: AddItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Medication',
    unit: 'Tablet',
    stock_level: 0,
    reorder_level: 50
  })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null)
  const supabase = createClient()

  if (!isOpen) return null

  const handleSave = async () => {
    if (!formData.name) {
      setStatus({
        type: 'error',
        title: 'Validation Error',
        message: 'Item name is required.'
      })
      return
    }
    setLoading(true)
    
    const { error } = await supabase
      .from('inventory_items')
      .insert(formData)

    if (error) {
      setStatus({
        type: 'error',
        title: 'Addition Failed',
        message: error.message
      })
    } else {
      setStatus({
        type: 'success',
        title: 'Item Added',
        message: `${formData.name} has been successfully added to the inventory.`
      })
    }
    
    setLoading(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="bg-brand-600 p-6 text-white flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black">Add New Stock Item</h2>
              <p className="text-brand-100 text-xs font-bold uppercase tracking-wider mt-1">Register new product/service</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Item Name</label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="e.g. Paracetamol 500mg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none"
                >
                  <option>Medication</option>
                  <option>IV Fluid</option>
                  <option>Consumable</option>
                  <option>Lab Test</option>
                  <option>Radiology</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Unit</label>
                <input 
                  type="text" 
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none"
                  placeholder="e.g. Tablet, Vial"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Initial Stock</label>
                <input 
                  type="number" 
                  value={formData.stock_level}
                  onChange={(e) => setFormData({...formData, stock_level: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Reorder Level</label>
                <input 
                  type="number" 
                  value={formData.reorder_level}
                  onChange={(e) => setFormData({...formData, reorder_level: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50"
              >
                <Save size={20} />
                {loading ? 'Saving...' : 'Register Item'}
              </button>
            </div>
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
            onSuccess()
            onClose()
          }
        }}
      />
    </>
  )
}
