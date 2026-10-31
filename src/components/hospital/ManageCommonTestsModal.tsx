'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  FlaskConical,
  Save,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import clsx from 'clsx';
import {
  CommonTestType,
  COMMON_TEST_CATEGORIES,
} from '@/types/clinical';
import {
  listCommonTestTypesAction,
  createCommonTestTypeAction,
  updateCommonTestTypeAction,
  toggleCommonTestTypeStatusAction,
  deleteCommonTestTypeAction,
} from '@/app/hospital/settings/clinical-tests-actions';
import StatusModal from './StatusModal';

interface ManageCommonTestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestsChanged?: () => void;
}

export default function ManageCommonTestsModal({
  isOpen,
  onClose,
  onTestsChanged,
}: ManageCommonTestsModalProps) {
  const [tests, setTests] = useState<CommonTestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<CommonTestType | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('General');
  const [defaultUnit, setDefaultUnit] = useState('');
  const [defaultRefRange, setDefaultRefRange] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('0');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const supabase = createClient();
  const canManage = userRole === 'SUPER_USER' || userRole === 'ADMIN';

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: authData }, res] = await Promise.all([
        supabase.auth.getUser(),
        listCommonTestTypesAction({ activeOnly: false }),
      ]);

      if (authData?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .maybeSingle();
        setUserRole(profile?.role || 'STAFF');
      }

      if (res.success && res.data) {
        setTests(res.data);
      }
    } catch (err) {
      console.error('Error fetching common test types:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (isOpen) {
      void fetchTests();
    }
  }, [isOpen, fetchTests]);

  if (!isOpen) return null;

  const handleOpenAddForm = () => {
    setEditingTest(null);
    setName('');
    setCategory('General');
    setDefaultUnit('');
    setDefaultRefRange('');
    setDescription('');
    setPrice('0');
    setIsActive(true);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleStartEdit = (t: CommonTestType) => {
    setEditingTest(t);
    setName(t.name);
    setCategory(t.category || 'General');
    setDefaultUnit(t.default_unit || '');
    setDefaultRefRange(t.default_reference_range || '');
    setDescription(t.description || '');
    setPrice(t.price !== null ? String(t.price) : '0');
    setIsActive(t.is_active);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTest(null);
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      setFormError('Unauthorized: Only Administrators and Super Users can configure test types.');
      return;
    }

    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setFormError('Test name must be at least 2 characters long.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const numPrice = parseFloat(price);
    const parsedPrice = isNaN(numPrice) ? 0 : Math.max(0, numPrice);

    if (editingTest) {
      const res = await updateCommonTestTypeAction(editingTest.id, {
        name: cleanName,
        category: category.trim() || 'General',
        default_unit: defaultUnit.trim() || null,
        default_reference_range: defaultRefRange.trim() || null,
        description: description.trim() || null,
        price: parsedPrice,
        is_active: isActive,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to update common test type.');
        setSaving(false);
        return;
      }

      setStatus({
        type: 'success',
        title: 'Test Type Updated',
        message: `"${cleanName}" was updated successfully.`,
      });
    } else {
      const res = await createCommonTestTypeAction({
        name: cleanName,
        category: category.trim() || 'General',
        default_unit: defaultUnit.trim() || null,
        default_reference_range: defaultRefRange.trim() || null,
        description: description.trim() || null,
        price: parsedPrice,
        is_active: isActive,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to create common test type.');
        setSaving(false);
        return;
      }

      setStatus({
        type: 'success',
        title: 'Test Type Configured',
        message: `"${cleanName}" has been added to common medical test types.`,
      });
    }

    setSaving(false);
    handleCloseForm();
    void fetchTests();
    if (onTestsChanged) onTestsChanged();
  };

  const handleToggleStatus = async (testId: string, currentStatus: boolean) => {
    if (!canManage) return;
    const nextStatus = !currentStatus;
    const res = await toggleCommonTestTypeStatusAction(testId, nextStatus);

    if (!res.success) {
      setStatus({
        type: 'error',
        title: 'Update Failed',
        message: res.error || 'Failed to update test status.',
      });
    } else {
      setTests((prev) =>
        prev.map((t) => (t.id === testId ? { ...t, is_active: nextStatus } : t)),
      );
      if (onTestsChanged) onTestsChanged();
    }
  };

  const handleDelete = async (testId: string, testName: string) => {
    if (!canManage) return;
    if (
      !confirm(
        `Are you sure you want to delete "${testName}" from the common test catalog? Existing completed lab orders will not be affected.`,
      )
    )
      return;

    const res = await deleteCommonTestTypeAction(testId);
    if (!res.success) {
      setStatus({
        type: 'error',
        title: 'Delete Failed',
        message: res.error || 'Failed to delete test type.',
      });
    } else {
      setStatus({
        type: 'success',
        title: 'Test Type Removed',
        message: `"${testName}" has been removed from common tests.`,
      });
      void fetchTests();
      if (onTestsChanged) onTestsChanged();
    }
  };

  const filteredTests = tests.filter((t) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === '' ||
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.default_unit?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q);

    const matchesCategory =
      categoryFilter === 'ALL' || t.category.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 shadow-2xs">
                <FlaskConical size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900">
                    Common Medical Test Types
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 uppercase tracking-wider">
                    {tests.length} Configured
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Configurable test catalog available for quick selection across consultation orders and laboratory workflows.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200/60 rounded-xl transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Subheader Toolbar */}
          <div className="p-4 px-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search test name, category, or units..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="ALL">All Categories</option>
                {COMMON_TEST_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {canManage ? (
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <Plus size={15} />
                Add Common Test
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                <ShieldAlert size={14} />
                Read-only: Admin access required to add tests
              </div>
            )}
          </div>

          {/* Modal Main Content: List & Add/Edit Drawer */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            
            {/* Add / Edit Form Modal/Drawer */}
            {isFormOpen && (
              <form
                onSubmit={handleSave}
                className="bg-slate-50 border border-brand-200 rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <FlaskConical size={16} className="text-brand-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {editingTest ? 'Edit Medical Test Type' : 'Add New Common Medical Test Type'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Test Name / Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Full Blood Count (FBC), Serum Electrolytes"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Discipline / Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      {COMMON_TEST_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Default Unit of Measurement
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 10^9/L, mmol/L, g/dL, Qualitative"
                      value={defaultUnit}
                      onChange={(e) => setDefaultUnit(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Standard Reference Range
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4.0 - 11.0, Negative, 3.5 - 5.0"
                      value={defaultRefRange}
                      onChange={(e) => setDefaultRefRange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Standard Price / Charge
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Clinical Description / Specimen Instructions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Whole blood in EDTA tube; perform within 4 hours."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        Active (available for selection in clinical consultation & laboratory)
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCloseForm}
                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-white transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-5 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {saving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        <span>{editingTest ? 'Save Changes' : 'Create Test Type'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* Test Types Table */}
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 size={28} className="animate-spin text-brand-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-bold">Loading configured medical tests...</p>
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <FlaskConical size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No common test types found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {search
                    ? 'No tests match your search query.'
                    : 'Click "Add Common Test" above to configure your clinic\'s standard medical test types.'}
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Test Name & Details</th>
                      <th className="px-4 py-3">Discipline</th>
                      <th className="px-4 py-3">Default Unit</th>
                      <th className="px-4 py-3">Ref Range</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredTests.map((t) => (
                      <tr
                        key={t.id}
                        className={clsx(
                          'hover:bg-slate-50/60 transition-colors',
                          !t.is_active && 'opacity-60 bg-slate-50/30',
                        )}
                      >
                        <td className="px-4 py-3.5">
                          <div>
                            <span className="font-bold text-slate-900 block">{t.name}</span>
                            {t.description && (
                              <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                                {t.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Tag size={10} className="text-slate-400" />
                            {t.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                          {t.default_unit || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                          {t.default_reference_range || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(t.id, t.is_active)}
                              className="inline-flex items-center gap-1 cursor-pointer"
                              title={t.is_active ? 'Click to deactivate' : 'Click to activate'}
                            >
                              {t.is_active ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 size={11} /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200">
                                  Inactive
                                </span>
                              )}
                            </button>
                          ) : t.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200">
                              Inactive
                            </span>
                          )}
                        </td>
                        {canManage && (
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(t)}
                                className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Test Type"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(t.id, t.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Test Type"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Showing {filteredTests.length} of {tests.length} common test types
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>
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
