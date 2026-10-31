'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, Plus, Edit2, Trash2, Loader2, Layers, Save } from 'lucide-react';
import { CapitalItemCategory } from '@/types/inventory';
import StatusModal from './StatusModal';

interface ManageCapitalCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged?: () => void;
}

export default function ManageCapitalCategoriesModal({
  isOpen,
  onClose,
  onCategoriesChanged,
}: ManageCapitalCategoriesModalProps) {
  const [categories, setCategories] = useState<CapitalItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<CapitalItemCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const supabase = createClient();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('capital_item_categories')
        .select('*')
        .order('name', { ascending: true });

      if (data) {
        setCategories(data as unknown as CapitalItemCategory[]);
      }
    } catch (err) {
      console.error('Error fetching capital categories:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (isOpen) {
      void fetchCategories();
    }
  }, [isOpen, fetchCategories]);

  if (!isOpen) return null;

  const handleStartEdit = (cat: CapitalItemCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    const cleanName = name.trim();
    const cleanDesc = description.trim() || null;

    let error = null;

    if (editingCategory) {
      const res = await supabase
        .from('capital_item_categories')
        .update({
          name: cleanName,
          description: cleanDesc,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCategory.id);
      error = res.error;
    } else {
      const res = await supabase
        .from('capital_item_categories')
        .insert({
          name: cleanName,
          description: cleanDesc,
          is_active: true,
        });
      error = res.error;
    }

    setSaving(false);

    if (error) {
      setStatus({
        type: 'error',
        title: 'Operation Failed',
        message: error.message || 'Could not save category.',
      });
    } else {
      handleCancelEdit();
      await fetchCategories();
      onCategoriesChanged?.();
      setStatus({
        type: 'success',
        title: editingCategory ? 'Category Updated' : 'Category Created',
        message: `Category "${cleanName}" was successfully saved.`,
      });
    }
  };

  const handleDelete = async (cat: CapitalItemCategory) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    const { error } = await supabase
      .from('capital_item_categories')
      .delete()
      .eq('id', cat.id);

    if (error) {
      setStatus({
        type: 'error',
        title: 'Delete Failed',
        message: error.message || 'Could not delete category.',
      });
    } else {
      await fetchCategories();
      onCategoriesChanged?.();
      setStatus({
        type: 'success',
        title: 'Category Removed',
        message: `Category "${cat.name}" was removed.`,
      });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Layers size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Capital Item Categories</h2>
                <p className="text-slate-400 text-xs font-medium">
                  Manage durable equipment classifications
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

          <div className="p-6 sm:p-8 space-y-6">
            {/* Create / Edit Form */}
            <form onSubmit={handleSave} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Capital Category'}
              </h3>
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Category Name (e.g. Diagnostic Equipment, Laptops)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <input
                  type="text"
                  placeholder="Optional description (e.g. Medical monitors, centrifuges)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                {editingCategory && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : editingCategory ? <Save size={13} /> : <Plus size={13} />}
                  <span>{editingCategory ? 'Update Category' : 'Add Category'}</span>
                </button>
              </div>
            </form>

            {/* List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Active Categories ({categories.length})
              </h3>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {loading ? (
                  <div className="py-8 text-center text-slate-400">
                    <Loader2 size={18} className="animate-spin mx-auto mb-2" />
                    <span>Loading categories...</span>
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No categories configured yet.</p>
                ) : (
                  categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{cat.name}</p>
                        {cat.description && (
                          <p className="text-[11px] text-slate-500 font-medium">{cat.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                Done
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
        onClose={() => setStatus(null)}
      />
    </>
  );
}
