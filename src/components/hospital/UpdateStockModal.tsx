'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { X, Plus, Minus, Save, Hash } from 'lucide-react'
import StatusModal from './StatusModal'

interface UpdateStockModalProps {
  isOpen: boolean
  onClose: () => void
  item: any
  onSuccess: () => void
}

export default function UpdateStockModal({ isOpen, onClose, item, onSuccess }: UpdateStockModalProps) {
  const [changeAmount, setChangeAmount] = useState(0)
  const [type, setType] = useState<'ADD' | 'SUBTRACT'>('ADD')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null)
  const supabase = createClient()

  if (!isOpen) return null

  const handleUpdate = async () => {
    if (changeAmount <= 0) {
      setStatus({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid amount greater than zero.'
      })
      return
    }
    setLoading(true)
    
    const newStock = type === 'ADD' 
      ? item.stock_level + changeAmount 
      : item.stock_level - changeAmount

    if (newStock < 0) {
      setStatus({
        type: 'error',
        title: 'Stock Error',
        message: 'Cannot reduce stock below zero.'
      })
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('inventory_items')
      .update({ stock_level: newStock })
      .eq('id', item.id)

    if (error) {
      setStatus({
        type: 'error',
        title: 'Update Failed',
        message: error.message
      })
    } else {
      // Optional: Log movement
      await supabase.from('inventory_movements').insert({
        item_id: item.id,
        quantity: type === 'ADD' ? changeAmount : -changeAmount,
        reason: reason || (type === 'ADD' ? 'Restock' : 'Adjustment')
      })
      
      setStatus({
        type: 'success',
        title: 'Inventory Updated',
        message: `Stock level for ${item.name} has been adjusted to ${newStock}.`
      })
    }
    
    setLoading(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black">Adjust Stock</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">{item?.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button 
                onClick={() => setType('ADD')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${type === 'ADD' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                <Plus size={16} /> ADD STOCK
              </button>
              <button 
                onClick={() => setType('SUBTRACT')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${type === 'SUBTRACT' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
              >
                <Minus size={16} /> REDUCE STOCK
              </button>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Current Level: {item?.stock_level} {item?.unit}s</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="number" 
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(parseInt(e.target.value) || 0)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Reason / Note</label>
              <textarea 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Purchase Order #123, Wastage, Correction..."
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              />
            </div>

            <div className="pt-4 text-center">
              <p className="text-xs text-slate-400 font-bold mb-4 uppercase tracking-wider">
                New Level will be <span className="text-slate-900 font-black">
                  {type === 'ADD' ? item?.stock_level + changeAmount : item?.stock_level - changeAmount}
                </span>
              </p>
              <button 
                onClick={handleUpdate}
                disabled={loading}
                className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 disabled:opacity-50"
              >
                <Save size={20} />
                {loading ? 'Saving...' : 'Update Inventory'}
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
