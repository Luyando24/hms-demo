'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Layers, 
  Edit2, 
  Trash2, 
  Loader2, 
  Save, 
  X, 
  RefreshCw, 
  Package, 
  Tag, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ChevronRight,
  Boxes,
  ArrowRight,
  ListFilter,
  Check,
  Building2,
  FolderPlus,
  Scale
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import clsx from 'clsx';
import StatusModal from '@/components/hospital/StatusModal';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { InventoryCategory, InventoryUnit } from '@/types/inventory';
import Link from 'next/link';

export default function InventoryCategoriesAdminPage() {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'units'>('categories');
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', is_active: true });

  // Unit Modal State
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<InventoryUnit | null>(null);
  const [unitForm, setUnitForm] = useState({ category_id: '', name: '', abbreviation: '', is_active: true });

  // Delete State
  const [deletingCategory, setDeletingCategory] = useState<InventoryCategory | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<InventoryUnit | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Status Modal
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('inventory_categories_units_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_categories' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_units' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, unitRes] = await Promise.all([
        supabase.from('inventory_categories').select('*').order('name', { ascending: true }),
        supabase.from('inventory_units').select('*, category:inventory_categories(*)').order('name', { ascending: true })
      ]);

      if (catRes.data) {
        setCategories(catRes.data as InventoryCategory[]);
      }
      if (unitRes.data) {
        setUnits(unitRes.data as InventoryUnit[]);
      }
    } catch (err) {
      console.error('Error fetching categories & units:', err);
    } finally {
      setLoading(false);
    }
  };

  // Grouped units per category lookup
  const unitsByCategory = useMemo(() => {
    const map = new Map<string, InventoryUnit[]>();
    units.forEach(unit => {
      const list = map.get(unit.category_id) || [];
      list.push(unit);
      map.set(unit.category_id, list);
    });
    return map;
  }, [units]);

  // Statistics
  const stats = useMemo(() => {
    const totalCategories = categories.length;
    const activeCategories = categories.filter(c => c.is_active).length;
    const totalUnits = units.length;
    
    // Find category with most units
    let maxUnitsCount = 0;
    let mostPopularCategory = 'None';
    categories.forEach(c => {
      const count = unitsByCategory.get(c.id)?.length || 0;
      if (count > maxUnitsCount) {
        maxUnitsCount = count;
        mostPopularCategory = c.name;
      }
    });

    return {
      totalCategories,
      activeCategories,
      totalUnits,
      mostPopularCategory,
      maxUnitsCount
    };
  }, [categories, units, unitsByCategory]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' || 
        c.name.toLowerCase().includes(q) || 
        (c.description && c.description.toLowerCase().includes(q));
      return matchesSearch;
    });
  }, [categories, searchQuery]);

  // Filtered units
  const filteredUnits = useMemo(() => {
    return units.filter(u => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
        u.name.toLowerCase().includes(q) ||
        (u.abbreviation && u.abbreviation.toLowerCase().includes(q)) ||
        (u.category?.name && u.category.name.toLowerCase().includes(q));
      
      const matchesCategory = selectedCategoryFilter === 'ALL' || u.category_id === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [units, searchQuery, selectedCategoryFilter]);

  // Pagination for Categories
  const {
    currentPage: catPage,
    setCurrentPage: setCatPage,
    pageSize: catPageSize,
    setPageSize: setCatPageSize,
    totalItems: totalCatItems,
    totalPages: totalCatPages,
    paginatedItems: paginatedCategories,
  } = usePagination(filteredCategories, { initialPageSize: 8 });

  // Pagination for Units
  const {
    currentPage: unitPage,
    setCurrentPage: setUnitPage,
    pageSize: unitPageSize,
    setPageSize: setUnitPageSize,
    totalItems: totalUnitItems,
    totalPages: totalUnitPages,
    paginatedItems: paginatedUnits,
  } = usePagination(filteredUnits, { initialPageSize: 12 });

  // Handle Category Save (Create / Update)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setStatusModal({ type: 'error', title: 'Validation Error', message: 'Category name is required.' });
      return;
    }

    setActionLoading(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('inventory_categories')
          .update({
            name: categoryForm.name.trim(),
            description: categoryForm.description.trim() || null,
            is_active: categoryForm.is_active
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        setStatusModal({
          type: 'success',
          title: 'Category Updated',
          message: `Category "${categoryForm.name}" has been updated successfully.`
        });
      } else {
        const { error } = await supabase
          .from('inventory_categories')
          .insert({
            name: categoryForm.name.trim(),
            description: categoryForm.description.trim() || null,
            is_active: categoryForm.is_active
          });

        if (error) throw error;
        setStatusModal({
          type: 'success',
          title: 'Category Created',
          message: `Category "${categoryForm.name}" has been registered.`
        });
      }

      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', is_active: true });
      fetchData();
    } catch (err: any) {
      setStatusModal({
        type: 'error',
        title: 'Operation Failed',
        message: err.message || 'An error occurred while saving category.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Unit Save (Create / Update)
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name.trim()) {
      setStatusModal({ type: 'error', title: 'Validation Error', message: 'Unit name is required.' });
      return;
    }
    if (!unitForm.category_id) {
      setStatusModal({ type: 'error', title: 'Validation Error', message: 'Please select a parent category.' });
      return;
    }

    setActionLoading(true);
    try {
      if (editingUnit) {
        const { error } = await supabase
          .from('inventory_units')
          .update({
            category_id: unitForm.category_id,
            name: unitForm.name.trim(),
            abbreviation: unitForm.abbreviation.trim() || null,
            is_active: unitForm.is_active
          })
          .eq('id', editingUnit.id);

        if (error) throw error;
        setStatusModal({
          type: 'success',
          title: 'Unit Updated',
          message: `Unit "${unitForm.name}" has been updated.`
        });
      } else {
        const { error } = await supabase
          .from('inventory_units')
          .insert({
            category_id: unitForm.category_id,
            name: unitForm.name.trim(),
            abbreviation: unitForm.abbreviation.trim() || null,
            is_active: unitForm.is_active
          });

        if (error) throw error;
        setStatusModal({
          type: 'success',
          title: 'Unit Registered',
          message: `Unit "${unitForm.name}" has been added to category.`
        });
      }

      setIsUnitModalOpen(false);
      setEditingUnit(null);
      setUnitForm({ category_id: '', name: '', abbreviation: '', is_active: true });
      fetchData();
    } catch (err: any) {
      setStatusModal({
        type: 'error',
        title: 'Operation Failed',
        message: err.message || 'An error occurred while saving unit.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Category Delete
  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('inventory_categories')
        .delete()
        .eq('id', deletingCategory.id);

      if (error) throw error;

      setStatusModal({
        type: 'success',
        title: 'Category Deleted',
        message: `Category "${deletingCategory.name}" and its associated units were deleted.`
      });
      setDeletingCategory(null);
      fetchData();
    } catch (err: any) {
      setStatusModal({
        type: 'error',
        title: 'Deletion Failed',
        message: err.message || 'Unable to delete category.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Unit Delete
  const handleDeleteUnit = async () => {
    if (!deletingUnit) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('inventory_units')
        .delete()
        .eq('id', deletingUnit.id);

      if (error) throw error;

      setStatusModal({
        type: 'success',
        title: 'Unit Deleted',
        message: `Unit "${deletingUnit.name}" was removed.`
      });
      setDeletingUnit(null);
      fetchData();
    } catch (err: any) {
      setStatusModal({
        type: 'error',
        title: 'Deletion Failed',
        message: err.message || 'Unable to delete unit.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openAddUnitForCategory = (categoryId: string) => {
    setEditingUnit(null);
    setUnitForm({
      category_id: categoryId,
      name: '',
      abbreviation: '',
      is_active: true
    });
    setIsUnitModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Layers size={20} />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Categories & Units</h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Configure item categories and their dependent measurement & dispensing units.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/hospital/inventory"
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
          >
            <Boxes size={14} className="text-slate-500" />
            Inventory Dashboard
          </Link>
          <button 
            onClick={fetchData}
            disabled={loading}
            className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-slate-500" : "text-slate-500"} />
            Refresh
          </button>
          <button 
            onClick={() => {
              setEditingUnit(null);
              setUnitForm({ category_id: categories[0]?.id || '', name: '', abbreviation: '', is_active: true });
              setIsUnitModalOpen(true);
            }}
            className="bg-indigo-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
          >
            <Plus size={14} />
            Add Unit
          </button>
          <button 
            onClick={() => {
              setEditingCategory(null);
              setCategoryForm({ name: '', description: '', is_active: true });
              setIsCategoryModalOpen(true);
            }}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
          >
            <FolderPlus size={14} />
            Add Category
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Categories</p>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Layers size={14} />
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.totalCategories}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">{stats.activeCategories} Active in Catalog</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Configured Units</p>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Scale size={14} />
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.totalUnits}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Dependent dispensing units</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Unit Category</p>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Package size={14} />
            </span>
          </div>
          <p className="text-base font-bold tracking-tight text-slate-900 truncate" title={stats.mostPopularCategory}>
            {stats.mostPopularCategory}
          </p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">{stats.maxUnitsCount} units registered</p>
        </div>
      </div>

      {/* Navigation Tabs & Search Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => { setActiveTab('categories'); setSearchQuery(''); }}
            className={clsx(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
              activeTab === 'categories' 
                ? "bg-white text-slate-900 shadow-xs font-bold" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Layers size={13} />
            Categories & Unit Hierarchy ({categories.length})
          </button>
          <button
            onClick={() => { setActiveTab('units'); setSearchQuery(''); }}
            className={clsx(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
              activeTab === 'units' 
                ? "bg-white text-slate-900 shadow-xs font-bold" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Scale size={13} />
            All Units Table ({units.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'units' && (
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none shadow-xs"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input 
              type="text" 
              placeholder={activeTab === 'categories' ? "Search categories..." : "Search units..."} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-xs w-full sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
          <Loader2 className="animate-spin text-slate-500 mx-auto mb-2" size={24} />
          <p className="text-xs font-medium">Loading inventory categories and units...</p>
        </div>
      ) : activeTab === 'categories' ? (
        /* Categories View */
        <div className="space-y-4">
          {filteredCategories.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
              <Layers className="mx-auto mb-2 text-slate-300" size={32} />
              <p className="text-sm font-semibold text-slate-700">No categories found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or create a new category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedCategories.map((cat) => {
                const catUnits = unitsByCategory.get(cat.id) || [];
                return (
                  <div 
                    key={cat.id} 
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top bar of card */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">{cat.name}</h3>
                            <span className={clsx(
                              "px-2 py-0.5 rounded-md text-[10px] font-semibold",
                              cat.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-slate-100 text-slate-500"
                            )}>
                              {cat.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {cat.description && (
                            <p className="text-xs text-slate-500 line-clamp-2">{cat.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setCategoryForm({
                                name: cat.name,
                                description: cat.description || '',
                                is_active: cat.is_active
                              });
                              setIsCategoryModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Category"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setDeletingCategory(cat)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Units Section in Card */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Tag size={12} />
                            Units ({catUnits.length})
                          </p>
                          <button
                            onClick={() => openAddUnitForCategory(cat.id)}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            <Plus size={12} />
                            Add Unit
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {catUnits.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">No units assigned yet.</span>
                          ) : (
                            catUnits.map(unit => (
                              <span 
                                key={unit.id}
                                className="group relative inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                              >
                                {unit.name}
                                {unit.abbreviation && (
                                  <span className="text-[10px] text-slate-400 font-mono">({unit.abbreviation})</span>
                                )}
                                <div className="hidden group-hover:inline-flex items-center gap-0.5 ml-1 pl-1 border-l border-slate-200">
                                  <button
                                    onClick={() => {
                                      setEditingUnit(unit);
                                      setUnitForm({
                                        category_id: unit.category_id,
                                        name: unit.name,
                                        abbreviation: unit.abbreviation || '',
                                        is_active: unit.is_active
                                      });
                                      setIsUnitModalOpen(true);
                                    }}
                                    className="text-slate-400 hover:text-slate-900"
                                    title="Edit Unit"
                                  >
                                    <Edit2 size={10} />
                                  </button>
                                  <button
                                    onClick={() => setDeletingUnit(unit)}
                                    className="text-slate-400 hover:text-rose-600"
                                    title="Delete Unit"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>ID: {cat.id.substring(0, 8)}...</span>
                      <span>{catUnits.length} units mapped</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Pagination
            currentPage={catPage}
            totalPages={totalCatPages}
            totalItems={totalCatItems}
            pageSize={catPageSize}
            onPageChange={setCatPage}
            onPageSizeChange={setCatPageSize}
            itemName="categories"
          />
        </div>
      ) : (
        /* Units Table View */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-4 py-2.5">Unit Name</th>
                <th className="px-4 py-2.5">Abbreviation</th>
                <th className="px-4 py-2.5">Parent Category</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-normal">
                    No units found matching filter.
                  </td>
                </tr>
              ) : (
                paginatedUnits.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {u.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {u.abbreviation ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold">
                          {u.abbreviation}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100">
                        <Layers size={11} />
                        {u.category?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-md text-[10px] font-semibold inline-flex items-center gap-1",
                        u.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-slate-100 text-slate-500"
                      )}>
                        <span className={clsx(
                          "w-1.5 h-1.5 rounded-full",
                          u.is_active ? "bg-emerald-500" : "bg-slate-400"
                        )} />
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingUnit(u);
                            setUnitForm({
                              category_id: u.category_id,
                              name: u.name,
                              abbreviation: u.abbreviation || '',
                              is_active: u.is_active
                            });
                            setIsUnitModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-900 rounded-lg transition-colors"
                          title="Edit Unit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDeletingUnit(u)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete Unit"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination
            currentPage={unitPage}
            totalPages={totalUnitPages}
            totalItems={totalUnitItems}
            pageSize={unitPageSize}
            onPageChange={setUnitPage}
            onPageSizeChange={setUnitPageSize}
            itemName="units"
          />
        </div>
      )}

      {/* ADD / EDIT CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-0.5">
                  Inventory Stock Classification
                </p>
              </div>
              <button 
                onClick={() => setIsCategoryModalOpen(false)} 
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Category Name *
                </label>
                <input 
                  type="text" 
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="e.g. Antibiotics, Surgical Consumables..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Description
                </label>
                <textarea 
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 min-h-[80px]"
                  placeholder="Optional details about this inventory category..."
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="cat_active"
                  checked={categoryForm.is_active}
                  onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900/20"
                />
                <label htmlFor="cat_active" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Category is Active in Item Catalog
                </label>
              </div>

              <div className="pt-4 flex gap-2">
                <button 
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT UNIT MODAL */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black">
                  {editingUnit ? 'Edit Unit' : 'Add Measurement Unit'}
                </h2>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mt-0.5">
                  Tied to Category
                </p>
              </div>
              <button 
                onClick={() => setIsUnitModalOpen(false)} 
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Parent Category *
                </label>
                <select 
                  value={unitForm.category_id}
                  onChange={(e) => setUnitForm({ ...unitForm, category_id: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                >
                  <option value="" disabled>Select category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Unit Name *
                </label>
                <input 
                  type="text" 
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. Tablet, Bottle 500ml, Syringe 5ml"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Abbreviation (Optional)
                </label>
                <input 
                  type="text" 
                  value={unitForm.abbreviation}
                  onChange={(e) => setUnitForm({ ...unitForm, abbreviation: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. tab, cap, btl, pc, vial"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="unit_active"
                  checked={unitForm.is_active}
                  onChange={(e) => setUnitForm({ ...unitForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/20"
                />
                <label htmlFor="unit_active" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Unit is Active & Selectable in Dropdowns
                </label>
              </div>

              <div className="pt-4 flex gap-2">
                <button 
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editingUnit ? 'Update Unit' : 'Save Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CATEGORY CONFIRMATION MODAL */}
      {deletingCategory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Category?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong className="text-slate-900">"{deletingCategory.name}"</strong>?
              </p>
              {(unitsByCategory.get(deletingCategory.id)?.length || 0) > 0 && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200/60 rounded-xl text-amber-800 text-[11px] text-left">
                  ⚠️ This category contains <strong>{unitsByCategory.get(deletingCategory.id)?.length}</strong> linked unit(s) which will also be deleted.
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingCategory(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCategory}
                disabled={actionLoading}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE UNIT CONFIRMATION MODAL */}
      {deletingUnit && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Unit?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete unit <strong className="text-slate-900">"{deletingUnit.name}"</strong>?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingUnit(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUnit}
                disabled={actionLoading}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS MODAL */}
      <StatusModal
        isOpen={!!statusModal}
        type={statusModal?.type || 'success'}
        title={statusModal?.title || ''}
        message={statusModal?.message || ''}
        onClose={() => setStatusModal(null)}
      />
    </div>
  );
}
