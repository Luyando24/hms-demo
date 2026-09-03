'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, Save, Package, Layers, Scale, ExternalLink } from 'lucide-react';
import StatusModal from './StatusModal';
import { InventoryCategory, InventoryUnit } from '@/types/inventory';
import Link from 'next/link';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialItem?: {
    id?: string;
    name: string;
    category?: string;
    unit?: string;
    stock_level: number;
    reorder_level?: number;
    unit_price?: number;
  } | null;
}

export default function AddItemModal({ isOpen, onClose, onSuccess, initialItem }: AddItemModalProps) {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  const [formData, setFormData] = useState({
    name: '',
    category: 'Medication',
    unit: 'Tablet',
    stock_level: '',
    reorder_level: '',
    unit_price: ''
  });

  const [customUnitMode, setCustomUnitMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  
  const supabase = createClient();

  // Load Categories, Units & System Currency from DB
  useEffect(() => {
    if (isOpen) {
      loadSettingsAndOptions();
    }
  }, [isOpen]);

  // Sync initialItem if editing
  useEffect(() => {
    if (initialItem) {
      setFormData({
        name: initialItem.name || '',
        category: initialItem.category || 'Medication',
        unit: initialItem.unit || 'Tablet',
        stock_level: initialItem.stock_level !== undefined && initialItem.stock_level !== null ? String(initialItem.stock_level) : '',
        reorder_level: initialItem.reorder_level !== undefined && initialItem.reorder_level !== null ? String(initialItem.reorder_level) : '',
        unit_price: initialItem.unit_price !== undefined && initialItem.unit_price !== null ? String(initialItem.unit_price) : ''
      });
    } else {
      setFormData({
        name: '',
        category: 'Medication',
        unit: 'Tablet',
        stock_level: '',
        reorder_level: '',
        unit_price: ''
      });
    }
  }, [initialItem, isOpen]);

  const loadSettingsAndOptions = async () => {
    setCategoriesLoading(true);
    try {
      const [catRes, unitRes, settingsRes] = await Promise.all([
        supabase.from('inventory_categories').select('*').eq('is_active', true).order('name', { ascending: true }),
        supabase.from('inventory_units').select('*').eq('is_active', true).order('name', { ascending: true }),
        supabase.from('system_settings').select('currency_symbol').limit(1).maybeSingle()
      ]);

      if (catRes.data && catRes.data.length > 0) {
        setCategories(catRes.data as InventoryCategory[]);
      }
      if (unitRes.data && unitRes.data.length > 0) {
        setUnits(unitRes.data as InventoryUnit[]);
      }
      if (settingsRes.data?.currency_symbol) {
        setCurrencySymbol(settingsRes.data.currency_symbol);
      }
    } catch (err) {
      console.error('Error loading inventory categories/units/settings:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Find selected category object
  const selectedCategoryObj = useMemo(() => {
    return categories.find(c => c.name.toLowerCase() === formData.category.toLowerCase());
  }, [categories, formData.category]);

  // Filter units belonging to selected category
  const availableUnitsForCategory = useMemo(() => {
    if (!selectedCategoryObj) return [];
    return units.filter(u => u.category_id === selectedCategoryObj.id);
  }, [selectedCategoryObj, units]);

  // Handle Category Change -> Update Unit to first available unit of this category
  const handleCategoryChange = (newCategoryName: string) => {
    const targetCat = categories.find(c => c.name.toLowerCase() === newCategoryName.toLowerCase());
    let defaultUnit = '';
    
    if (targetCat) {
      const categoryUnits = units.filter(u => u.category_id === targetCat.id);
      if (categoryUnits.length > 0) {
        defaultUnit = categoryUnits[0].name;
        setCustomUnitMode(false);
      } else {
        defaultUnit = '';
        setCustomUnitMode(true);
      }
    }

    setFormData(prev => ({
      ...prev,
      category: newCategoryName,
      unit: defaultUnit || prev.unit
    }));
  };

  if (!isOpen) return null;

  const isEditing = Boolean(initialItem?.id);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setStatus({
        type: 'error',
        title: 'Validation Error',
        message: 'Item name is required.'
      });
      return;
    }
    if (!formData.category.trim()) {
      setStatus({
        type: 'error',
        title: 'Validation Error',
        message: 'Category is required.'
      });
      return;
    }
    if (!formData.unit.trim()) {
      setStatus({
        type: 'error',
        title: 'Validation Error',
        message: 'Unit is required.'
      });
      return;
    }

    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      unit: formData.unit.trim(),
      stock_level: formData.stock_level === '' ? 0 : Number(formData.stock_level) || 0,
      reorder_level: formData.reorder_level === '' ? 0 : Number(formData.reorder_level) || 0,
      unit_price: formData.unit_price === '' ? 0 : Number(formData.unit_price) || 0
    };

    let error = null;
    if (isEditing && initialItem?.id) {
      const res = await supabase
        .from('inventory_items')
        .update(payload)
        .eq('id', initialItem.id);
      error = res.error;
    } else {
      const res = await supabase
        .from('inventory_items')
        .insert(payload);
      error = res.error;
    }

    if (error) {
      setStatus({
        type: 'error',
        title: isEditing ? 'Update Failed' : 'Addition Failed',
        message: error.message
      });
    } else {
      setStatus({
        type: 'success',
        title: isEditing ? 'Item Updated' : 'Item Added',
        message: `"${formData.name}" has been successfully ${isEditing ? 'updated' : 'registered in inventory'}.`
      });
    }

    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black">
                {isEditing ? 'Edit Stock Item' : 'Add New Stock Item'}
              </h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                {isEditing ? 'Update item details and packaging' : 'Register new product/service'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-5">
              {/* Item Name */}
              <div className="col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Item Name *
                </label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    placeholder="e.g. Paracetamol 500mg, Normal Saline 0.9%"
                    required
                  />
                </div>
              </div>

              {/* Category (Dynamic) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                    Category *
                  </label>
                  <Link 
                    href="/hospital/admin/inventory-categories" 
                    target="_blank"
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                    title="Configure Categories in Admin"
                  >
                    Manage <ExternalLink size={9} />
                  </Link>
                </div>
                <div className="relative">
                  <select 
                    value={formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20 text-slate-800"
                  >
                    {categories.length > 0 ? (
                      categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="Medication">Medication</option>
                        <option value="IV Fluid">IV Fluid</option>
                        <option value="Consumable">Consumable</option>
                        <option value="Lab Test">Lab Test</option>
                        <option value="Radiology">Radiology</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Unit (Dependent on Category) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                    Unit *
                  </label>
                  {availableUnitsForCategory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCustomUnitMode(!customUnitMode)}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                    >
                      {customUnitMode ? 'Select list' : 'Custom'}
                    </button>
                  )}
                </div>

                {!customUnitMode && availableUnitsForCategory.length > 0 ? (
                  <select 
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20 text-slate-800"
                  >
                    {availableUnitsForCategory.map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name} {u.abbreviation ? `(${u.abbreviation})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    placeholder="e.g. Tablet, Vial, Bag 500ml"
                    required
                  />
                )}
              </div>

              {/* Initial Stock */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  {isEditing ? 'Current Stock' : 'Initial Stock'}
                </label>
                <input 
                  type="number" 
                  min={0}
                  value={formData.stock_level}
                  onChange={(e) => setFormData({ ...formData, stock_level: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>

              {/* Reorder Level */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Reorder Level
                </label>
                <input 
                  type="number" 
                  min={0}
                  value={formData.reorder_level}
                  onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                  placeholder="50"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>

              {/* Unit Price with System Set Currency Symbol */}
              <div className="col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Unit Price ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-sm select-none">
                    {currencySymbol}
                  </span>
                  <input 
                    type="number" 
                    step="0.01"
                    min={0}
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 active:scale-98"
              >
                <Save size={18} />
                {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Item'}
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
