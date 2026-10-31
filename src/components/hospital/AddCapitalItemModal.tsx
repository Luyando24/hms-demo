'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, Save, Monitor, Loader2 } from 'lucide-react';
import StatusModal from './StatusModal';
import { CapitalItem, CapitalItemCategory } from '@/types/inventory';

interface AddCapitalItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialItem?: CapitalItem | null;
}

const DEFAULT_CATEGORIES = [
  'IT & Computers',
  'Office Equipment & Machinery',
  'Furniture & Fixtures',
  'Medical Devices & Machinery',
  'Audio/Visual & Displays',
  'Facility & Power Equipment',
];

const STATUS_OPTIONS: Array<CapitalItem['status']> = [
  'OPERATIONAL',
  'UNDER_MAINTENANCE',
  'UNDER_REPAIR',
  'DECOMMISSIONED',
];

const CONDITION_OPTIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'];

export default function AddCapitalItemModal({
  isOpen,
  onClose,
  onSuccess,
  initialItem,
}: AddCapitalItemModalProps) {
  const [categories, setCategories] = useState<CapitalItemCategory[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'IT & Computers',
    serial_number: '',
    model_number: '',
    asset_tag: '',
    location: '',
    department: '',
    assigned_to: '',
    status: 'OPERATIONAL' as CapitalItem['status'],
    condition: 'GOOD',
    purchase_date: '',
    purchase_cost: '',
    warranty_expiry: '',
    last_maintenance: '',
    next_maintenance: '',
    notes: '',
  });

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      loadCategoriesAndSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialItem) {
      setFormData({
        name: initialItem.name || '',
        category: initialItem.category || 'IT & Computers',
        serial_number: initialItem.serial_number || '',
        model_number: initialItem.model_number || '',
        asset_tag: initialItem.asset_tag || '',
        location: initialItem.location || '',
        department: initialItem.department || '',
        assigned_to: initialItem.assigned_to || '',
        status: (initialItem.status as CapitalItem['status']) || 'OPERATIONAL',
        condition: initialItem.condition || 'GOOD',
        purchase_date: initialItem.purchase_date || '',
        purchase_cost: initialItem.purchase_cost !== undefined && initialItem.purchase_cost !== null ? String(initialItem.purchase_cost) : '',
        warranty_expiry: initialItem.warranty_expiry || '',
        last_maintenance: initialItem.last_maintenance || '',
        next_maintenance: initialItem.next_maintenance || '',
        notes: initialItem.notes || '',
      });
    } else {
      setFormData({
        name: '',
        category: categories[0]?.name || 'IT & Computers',
        serial_number: '',
        model_number: '',
        asset_tag: '',
        location: '',
        department: '',
        assigned_to: '',
        status: 'OPERATIONAL',
        condition: 'GOOD',
        purchase_date: '',
        purchase_cost: '',
        warranty_expiry: '',
        last_maintenance: '',
        next_maintenance: '',
        notes: '',
      });
    }
  }, [initialItem, isOpen, categories]);

  const loadCategoriesAndSettings = async () => {
    try {
      const [catRes, settingsRes] = await Promise.all([
        supabase
          .from('capital_item_categories')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('system_settings')
          .select('currency_symbol')
          .limit(1)
          .maybeSingle(),
      ]);

      if (catRes.data && (catRes.data as any[]).length > 0) {
        setCategories(catRes.data as unknown as CapitalItemCategory[]);
      }
      if (settingsRes.data?.currency_symbol) {
        setCurrencySymbol(settingsRes.data.currency_symbol);
      }
    } catch (err) {
      console.error('Error loading capital item categories:', err);
    }
  };

  if (!isOpen) return null;

  const isEditing = Boolean(initialItem?.id);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setStatus({
        type: 'error',
        title: 'Validation Error',
        message: 'Capital item name is required.',
      });
      return;
    }

    if (!formData.category.trim()) {
      setStatus({
        type: 'error',
        title: 'Validation Error',
        message: 'Category is required.',
      });
      return;
    }

    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      serial_number: formData.serial_number.trim() || null,
      model_number: formData.model_number.trim() || null,
      asset_tag: formData.asset_tag.trim() || null,
      location: formData.location.trim() || null,
      department: formData.department.trim() || null,
      assigned_to: formData.assigned_to.trim() || null,
      status: formData.status,
      condition: formData.condition,
      purchase_date: formData.purchase_date || null,
      purchase_cost: formData.purchase_cost === '' ? null : Number(formData.purchase_cost) || null,
      warranty_expiry: formData.warranty_expiry || null,
      last_maintenance: formData.last_maintenance || null,
      next_maintenance: formData.next_maintenance || null,
      notes: formData.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let error = null;

    if (isEditing && initialItem?.id) {
      const res = await supabase
        .from('clinic_assets')
        .update(payload)
        .eq('id', initialItem.id);
      error = res.error;
    } else {
      const res = await supabase
        .from('clinic_assets')
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        });
      error = res.error;
    }

    setLoading(false);

    if (error) {
      setStatus({
        type: 'error',
        title: isEditing ? 'Update Failed' : 'Registration Failed',
        message: error.message,
      });
    } else {
      setStatus({
        type: 'success',
        title: isEditing ? 'Asset Updated' : 'Capital Item Registered',
        message: `"${formData.name}" has been successfully ${isEditing ? 'updated' : 'registered in capital inventory'}.`,
      });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Monitor size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  {isEditing ? 'Edit Capital Item' : 'Register New Capital Item'}
                </h2>
                <p className="text-slate-400 text-xs font-medium">
                  {isEditing ? 'Update durable equipment & asset parameters' : 'Record durable asset, hardware, furniture or machinery'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Asset Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Asset / Equipment Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dell OptiPlex 7090 Desktop, Samsung 55'' Smart TV, Hydraulic Examination Bed"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Capital Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                >
                  {categories.length > 0
                    ? categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))
                    : DEFAULT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                </select>
              </div>

              {/* Model Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Model / Spec Number
                </label>
                <input
                  type="text"
                  value={formData.model_number}
                  onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                  placeholder="e.g. 7090 MFF, UN55TU7000"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                />
              </div>

              {/* Serial Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Serial Number (S/N)
                </label>
                <input
                  type="text"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="e.g. SN-83920194A"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                />
              </div>

              {/* Asset Tag */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Hospital Asset Tag ID
                </label>
                <input
                  type="text"
                  value={formData.asset_tag}
                  onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                  placeholder="e.g. KUNDA-AST-0104"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                />
              </div>

              {/* Physical Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Physical Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. OPD Room 102, Main Reception, Lab 2"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department / Ward
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Outpatient, Administration, Radiology"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                />
              </div>

              {/* Operational Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Operational Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as CapitalItem['status'] })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Physical Condition */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Physical Condition
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                >
                  {CONDITION_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Purchase Cost */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Purchase Cost ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchase_cost}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                  />
                </div>
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                />
              </div>

              {/* Warranty Expiry */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Warranty Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.warranty_expiry}
                  onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                />
              </div>

              {/* Next Maintenance Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Next Scheduled Maintenance
                </label>
                <input
                  type="date"
                  value={formData.next_maintenance}
                  onChange={(e) => setFormData({ ...formData, next_maintenance: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Asset Notes & Vendor / Maintenance Specs
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Record vendor contact, maintenance agreements, serial licenses, or installation details..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/10 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{loading ? 'Saving...' : isEditing ? 'Update Asset' : 'Save Capital Item'}</span>
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
          const isSuccess = status?.type === 'success';
          setStatus(null);
          if (isSuccess) {
            onSuccess();
            onClose();
          }
        }}
      />
    </>
  );
}
