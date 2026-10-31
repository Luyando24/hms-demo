'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Box, 
  Monitor, 
  Search, 
  Filter, 
  Plus, 
  Package, 
  AlertCircle, 
  RefreshCw, 
  Sliders, 
  Trash2, 
  Edit2, 
  Loader2, 
  Layers, 
  Eye, 
  CheckCircle2, 
  Wrench, 
  Building, 
  Calendar, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  FileText,
  Tag
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import clsx from 'clsx';
import UpdateStockModal from '@/components/hospital/UpdateStockModal';
import AddItemModal from '@/components/hospital/AddItemModal';
import AddCapitalItemModal from '@/components/hospital/AddCapitalItemModal';
import ViewCapitalItemModal from '@/components/hospital/ViewCapitalItemModal';
import ManageCapitalCategoriesModal from '@/components/hospital/ManageCapitalCategoriesModal';
import StatusModal from '@/components/hospital/StatusModal';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { InventoryCategory, InventoryItem, CapitalItem, CapitalItemCategory } from '@/types/inventory';
import { evaluateMedicalStock } from '@/utils/stockWarnings';
import { deleteCapitalAssetAction } from '@/app/hospital/actions';
import Link from 'next/link';

function InventoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab State: 'medical' | 'capital'
  const initialTab = searchParams.get('tab') === 'capital' ? 'capital' : 'medical';
  const [activeTab, setActiveTab] = useState<'medical' | 'capital'>(initialTab);

  const handleTabChange = (tab: 'medical' | 'capital') => {
    setActiveTab(tab);
    router.replace(`/hospital/inventory?tab=${tab}`, { scroll: false });
  };

  // User profile role
  const [userRole, setUserRole] = useState<string | null>(null);

  // Common system settings
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // ==========================================
  // MEDICAL STOCK STATE
  // ==========================================
  const [medicalItems, setMedicalItems] = useState<InventoryItem[]>([]);
  const [medicalCategories, setMedicalCategories] = useState<InventoryCategory[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [medicalLoading, setMedicalLoading] = useState(true);
  const [medicalSearch, setMedicalSearch] = useState('');
  const [medicalCategoryFilter, setMedicalCategoryFilter] = useState('ALL');
  const [medicalStatusFilter, setMedicalStatusFilter] = useState<
    'ALL' | 'NEEDS_RESTOCK' | 'OUT_OF_STOCK' | 'CRITICAL_LOW' | 'APPROACHING_LOW' | 'IN_STOCK'
  >('ALL');
  const [dispensedTodayCount, setDispensedTodayCount] = useState(0);

  // Medical Modals
  const [selectedStockItem, setSelectedStockItem] = useState<InventoryItem | null>(null);
  const [selectedEditMedicalItem, setSelectedEditMedicalItem] = useState<InventoryItem | null>(null);
  const [isUpdateStockModalOpen, setIsUpdateStockModalOpen] = useState(false);
  const [isAddMedicalModalOpen, setIsAddMedicalModalOpen] = useState(false);

  // ==========================================
  // CAPITAL ITEMS STATE
  // ==========================================
  const [capitalItems, setCapitalItems] = useState<CapitalItem[]>([]);
  const [capitalCategories, setCapitalCategories] = useState<CapitalItemCategory[]>([]);
  const [capitalLoading, setCapitalLoading] = useState(true);
  const [capitalSearch, setCapitalSearch] = useState('');
  const [capitalCategoryFilter, setCapitalCategoryFilter] = useState('ALL');
  const [capitalStatusFilter, setCapitalStatusFilter] = useState<string>('ALL');

  // Capital Modals
  const [selectedEditCapitalItem, setSelectedEditCapitalItem] = useState<CapitalItem | null>(null);
  const [selectedViewCapitalItem, setSelectedViewCapitalItem] = useState<CapitalItem | null>(null);
  const [isAddCapitalModalOpen, setIsAddCapitalModalOpen] = useState(false);
  const [isManageCapitalCategoriesOpen, setIsManageCapitalCategoriesOpen] = useState(false);

  // Global Status Modal
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const supabase = createClient();

  // Load User Role & System Settings
  useEffect(() => {
    async function loadMeta() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          setUserRole(profile?.role || 'STAFF');
        }
        const { data: sys } = await supabase
          .from('system_settings')
          .select('currency_symbol')
          .limit(1)
          .maybeSingle();
        if (sys?.currency_symbol) {
          setCurrencySymbol(sys.currency_symbol);
        }
      } catch (err) {
        console.error('Error loading metadata:', err);
      }
    }
    void loadMeta();
  }, []);

  // ==========================================
  // DATA FETCHING & REALTIME SUBSCRIPTIONS
  // ==========================================
  const fetchMedicalData = useCallback(async () => {
    setMedicalLoading(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [itemsRes, catRes, pRes, countRes] = await Promise.all([
        supabase
          .from('inventory_items')
          .select('*')
          .order('name', { ascending: true }),
        supabase
          .from('inventory_categories')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('prescriptions')
          .select('id, status, created_at, patients(first_name, last_name), prescription_items(id, dosage, frequency, duration, quantity_prescribed, quantity_dispensed, inventory_items(id, name, stock_level, unit))')
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false }),
        supabase
          .from('prescriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'DISPENSED')
          .gte('created_at', todayStart.toISOString()),
      ]);

      if (itemsRes.data) {
        const medItems = (itemsRes.data as any[]).filter(
          (i) => !i.inventory_type || i.inventory_type === 'MEDICAL'
        );
        setMedicalItems(medItems as InventoryItem[]);
      }
      if (catRes.data) setMedicalCategories(catRes.data as InventoryCategory[]);
      if (pRes.data) setPrescriptions(pRes.data);
      if (countRes.count !== null) setDispensedTodayCount(countRes.count);
    } catch (err) {
      console.error('Error fetching medical data:', err);
    } finally {
      setMedicalLoading(false);
    }
  }, []);

  const fetchCapitalData = useCallback(async () => {
    setCapitalLoading(true);
    try {
      const [assetsRes, catRes] = await Promise.all([
        supabase
          .from('clinic_assets')
          .select('*')
          .order('name', { ascending: true }),
        supabase
          .from('capital_item_categories')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true }),
      ]);

      if (assetsRes.data) setCapitalItems(assetsRes.data as unknown as CapitalItem[]);
      if (catRes.data) setCapitalCategories(catRes.data as unknown as CapitalItemCategory[]);
    } catch (err) {
      console.error('Error fetching capital data:', err);
    } finally {
      setCapitalLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMedicalData();
    void fetchCapitalData();

    const channel = supabase
      .channel('inventory_unified_live_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => void fetchMedicalData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_categories' }, () => void fetchMedicalData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, () => void fetchMedicalData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clinic_assets' }, () => void fetchCapitalData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capital_item_categories' }, () => void fetchCapitalData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMedicalData, fetchCapitalData]);

  // ==========================================
  // MEDICAL STOCK ACTIONS & FILTERING
  // ==========================================
  const handleDeleteMedicalItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete medical stock item "${itemName}"?`)) return;

    const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);

    if (error) {
      setStatusModal({ type: 'error', title: 'Delete Failed', message: error.message });
    } else {
      setStatusModal({ type: 'success', title: 'Item Removed', message: `"${itemName}" was deleted from medical inventory.` });
      void fetchMedicalData();
    }
  };

  const handleDispense = async (prescription: any) => {
    const medicationNames = (prescription.prescription_items || [])
      .map((item: any) => item.inventory_items?.name || 'Medication')
      .join(', ');
    const confirmDispense = window.confirm(
      `Dispense ${medicationNames || 'this prescription'} to ${prescription.patients?.first_name || 'Patient'}?`
    );
    if (!confirmDispense) return;

    const { error: statusError } = await supabase.rpc('dispense_prescription', {
      target_prescription_id: prescription.id,
    });

    if (statusError) {
      setStatusModal({ type: 'error', title: 'Dispense Failed', message: statusError.message });
    } else {
      setStatusModal({
        type: 'success',
        title: 'Medication Dispensed',
        message: `${medicationNames} has been dispensed and stock deducted.`,
      });
      void fetchMedicalData();
    }
  };

  const filteredMedicalItems = useMemo(() => {
    return medicalItems.filter((item) => {
      const q = medicalSearch.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        item.name.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.batch_number?.toLowerCase().includes(q) ||
        item.manufacturer?.toLowerCase().includes(q);

      const matchesCategory =
        medicalCategoryFilter === 'ALL' ||
        item.category?.toLowerCase() === medicalCategoryFilter.toLowerCase();

      const evalRes = evaluateMedicalStock(item);

      let matchesStatus = true;
      if (medicalStatusFilter === 'IN_STOCK') {
        matchesStatus = evalRes.status === 'ADEQUATE';
      } else if (medicalStatusFilter === 'NEEDS_RESTOCK') {
        matchesStatus = evalRes.needsRestock || evalRes.isApproaching;
      } else if (medicalStatusFilter === 'OUT_OF_STOCK') {
        matchesStatus = evalRes.status === 'OUT_OF_STOCK';
      } else if (medicalStatusFilter === 'CRITICAL_LOW') {
        matchesStatus = evalRes.status === 'CRITICAL_LOW';
      } else if (medicalStatusFilter === 'APPROACHING_LOW') {
        matchesStatus = evalRes.status === 'APPROACHING_LOW';
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [medicalItems, medicalSearch, medicalCategoryFilter, medicalStatusFilter]);

  const {
    currentPage: medicalPage,
    setCurrentPage: setMedicalPage,
    pageSize: medicalPageSize,
    setPageSize: setMedicalPageSize,
    totalItems: medicalTotalItems,
    totalPages: medicalTotalPages,
    paginatedItems: paginatedMedicalItems,
  } = usePagination(filteredMedicalItems, { initialPageSize: 10 });

  const medicalStats = useMemo(() => {
    let outCount = 0;
    let criticalLowCount = 0;
    let approachingLowCount = 0;
    let inStockCount = 0;

    medicalItems.forEach((item) => {
      const evalRes = evaluateMedicalStock(item);
      if (evalRes.status === 'OUT_OF_STOCK') outCount++;
      else if (evalRes.status === 'CRITICAL_LOW') criticalLowCount++;
      else if (evalRes.status === 'APPROACHING_LOW') approachingLowCount++;
      else if (evalRes.status === 'ADEQUATE') inStockCount++;
    });

    return {
      total: medicalItems.length,
      outOfStock: outCount,
      criticalLow: criticalLowCount,
      approachingLow: approachingLowCount,
      needsRestockTotal: outCount + criticalLowCount + approachingLowCount,
      inStock: inStockCount,
      dispensedToday: dispensedTodayCount,
    };
  }, [medicalItems, dispensedTodayCount]);

  // ==========================================
  // CAPITAL ITEMS ACTIONS & FILTERING
  // ==========================================
  const handleDeleteCapitalItem = async (assetId: string, assetName: string) => {
    if (userRole !== 'SUPER_USER') {
      setStatusModal({ type: 'error', title: 'Unauthorized', message: 'Only Super Users are authorized to delete capital items.' });
      return;
    }
    if (!confirm(`Are you sure you want to remove capital item "${assetName}" from registry?`)) return;

    const res = await deleteCapitalAssetAction(assetId);

    if (!res.success) {
      setStatusModal({ type: 'error', title: 'Delete Failed', message: res.error || 'Failed to remove capital asset' });
    } else {
      setStatusModal({ type: 'success', title: 'Asset Removed', message: `"${assetName}" was removed from capital assets.` });
      void fetchCapitalData();
    }
  };

  const filteredCapitalItems = useMemo(() => {
    return capitalItems.filter((asset) => {
      const q = capitalSearch.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        asset.name.toLowerCase().includes(q) ||
        asset.model_number?.toLowerCase().includes(q) ||
        asset.serial_number?.toLowerCase().includes(q) ||
        asset.asset_tag?.toLowerCase().includes(q) ||
        asset.location?.toLowerCase().includes(q) ||
        asset.department?.toLowerCase().includes(q);

      const matchesCategory =
        capitalCategoryFilter === 'ALL' ||
        asset.category.toLowerCase() === capitalCategoryFilter.toLowerCase();

      const matchesStatus =
        capitalStatusFilter === 'ALL' || asset.status === capitalStatusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [capitalItems, capitalSearch, capitalCategoryFilter, capitalStatusFilter]);

  const {
    currentPage: capitalPage,
    setCurrentPage: setCapitalPage,
    pageSize: capitalPageSize,
    setPageSize: setCapitalPageSize,
    totalItems: capitalTotalItems,
    totalPages: capitalTotalPages,
    paginatedItems: paginatedCapitalItems,
  } = usePagination(filteredCapitalItems, { initialPageSize: 10 });

  const [maintenanceCutoff] = useState(() => Date.now() + 30 * 24 * 60 * 60 * 1000);

  const capitalStats = useMemo(() => {
    return {
      total: capitalItems.length,
      operational: capitalItems.filter((a) => a.status === 'OPERATIONAL').length,
      underRepair: capitalItems.filter((a) => a.status === 'UNDER_REPAIR' || a.status === 'UNDER_MAINTENANCE').length,
      maintDue: capitalItems.filter((a) => a.next_maintenance && new Date(a.next_maintenance).getTime() <= maintenanceCutoff).length,
    };
  }, [capitalItems, maintenanceCutoff]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header & Inventory Module Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
              Inventory Domain
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-bold text-slate-500">
              {activeTab === 'medical' ? 'Pharmaceuticals & Consumables' : 'Durable Assets & Equipment'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {activeTab === 'medical' ? 'Medical Stock Management' : 'Capital Items & Durable Assets'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {activeTab === 'medical'
              ? 'Real-time consumable inventory monitoring, dosage tracking, unit pricing, and prescription dispensing.'
              : 'Durable equipment tracking, asset registry, physical location audits, and maintenance schedules.'}
          </p>
        </div>

        {/* Global Tab Switcher */}
        <div className="flex items-center p-1.5 rounded-2xl bg-slate-100 border border-slate-200/80 shadow-inner self-start md:self-center">
          <button
            type="button"
            onClick={() => handleTabChange('medical')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer',
              activeTab === 'medical'
                ? 'bg-white text-brand-700 shadow-md shadow-slate-900/5'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Box size={16} className={activeTab === 'medical' ? 'text-brand-600' : 'text-slate-400'} />
            <span>Medical Stock</span>
            <span
              className={clsx(
                'ml-1 px-1.5 py-0.5 text-[10px] rounded-full font-bold',
                activeTab === 'medical' ? 'bg-brand-50 text-brand-700' : 'bg-slate-200 text-slate-600'
              )}
            >
              {medicalItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('capital')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer',
              activeTab === 'capital'
                ? 'bg-white text-indigo-700 shadow-md shadow-slate-900/5'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Monitor size={16} className={activeTab === 'capital' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Capital Items</span>
            <span
              className={clsx(
                'ml-1 px-1.5 py-0.5 text-[10px] rounded-full font-bold',
                activeTab === 'capital' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
              )}
            >
              {capitalItems.length}
            </span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: MEDICAL STOCK */}
      {/* ================================================================= */}
      {activeTab === 'medical' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Medical Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Consumables & Pharma</span>
              <span className="text-xs text-slate-300">|</span>
              <span className="text-xs text-slate-500 font-medium">Pricing, stock alerts & packaging</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/hospital/admin/inventory-categories"
                className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
              >
                <Layers size={14} className="text-brand-600" />
                Categories & Units
              </Link>
              <button
                type="button"
                onClick={fetchMedicalData}
                className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={14} className={medicalLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedEditMedicalItem(null);
                  setIsAddMedicalModalOpen(true);
                }}
                className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5 active:scale-98 cursor-pointer"
              >
                <Plus size={15} />
                Add Medical Item
              </button>
            </div>
          </div>

          {/* Medical Stock Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Medical Items</p>
              <p className="text-2xl font-black tracking-tight text-slate-900">{medicalStats.total}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Consumables & drugs</p>
            </div>

            <div 
              onClick={() => setMedicalStatusFilter(medicalStatusFilter === 'OUT_OF_STOCK' ? 'ALL' : 'OUT_OF_STOCK')}
              className={clsx(
                "bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-xs",
                medicalStatusFilter === 'OUT_OF_STOCK' ? "border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20" : "border-slate-200/80 hover:border-rose-200"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Out of Stock</p>
                <span className={clsx("w-2.5 h-2.5 rounded-full", medicalStats.outOfStock > 0 ? "bg-rose-500 animate-pulse" : "bg-slate-300")} />
              </div>
              <p className="text-2xl font-black tracking-tight text-rose-600">{medicalStats.outOfStock}</p>
              <p className="text-[10px] text-rose-500 font-medium mt-1">Depleted (0 remaining)</p>
            </div>

            <div 
              onClick={() => setMedicalStatusFilter(medicalStatusFilter === 'CRITICAL_LOW' ? 'ALL' : 'CRITICAL_LOW')}
              className={clsx(
                "bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-xs",
                medicalStatusFilter === 'CRITICAL_LOW' ? "border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20" : "border-slate-200/80 hover:border-amber-200"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">At/Below Reorder</p>
                <span className={clsx("w-2.5 h-2.5 rounded-full", medicalStats.criticalLow > 0 ? "bg-amber-500" : "bg-slate-300")} />
              </div>
              <p className="text-2xl font-black tracking-tight text-amber-600">{medicalStats.criticalLow}</p>
              <p className="text-[10px] text-amber-600 font-medium mt-1">Threshold reached</p>
            </div>

            <div 
              onClick={() => setMedicalStatusFilter(medicalStatusFilter === 'APPROACHING_LOW' ? 'ALL' : 'APPROACHING_LOW')}
              className={clsx(
                "bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-xs",
                medicalStatusFilter === 'APPROACHING_LOW' ? "border-yellow-400 ring-2 ring-yellow-400/20 bg-yellow-50/20" : "border-slate-200/80 hover:border-yellow-200"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approaching Min</p>
                <span className={clsx("w-2.5 h-2.5 rounded-full", medicalStats.approachingLow > 0 ? "bg-yellow-500" : "bg-slate-300")} />
              </div>
              <p className="text-2xl font-black tracking-tight text-yellow-600">{medicalStats.approachingLow}</p>
              <p className="text-[10px] text-yellow-600 font-medium mt-1">Within 25% of reorder</p>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dispensed Today</p>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-2xl font-black tracking-tight text-slate-900">{medicalStats.dispensedToday}</p>
              <p className="text-[10px] text-emerald-600 font-medium mt-1">Dispensed prescriptions</p>
            </div>
          </div>

          {/* Actionable Restock Attention Banner */}
          {medicalStats.needsRestockTotal > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-700 rounded-xl shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-amber-950">
                    Restock Attention Required ({medicalStats.needsRestockTotal} Items Total)
                  </p>
                  <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                    {medicalStats.outOfStock > 0 && <span className="font-bold text-rose-700 mr-2">🚨 {medicalStats.outOfStock} Depleted</span>}
                    {medicalStats.criticalLow > 0 && <span className="font-bold text-amber-700 mr-2">⚠️ {medicalStats.criticalLow} Below Reorder Level</span>}
                    {medicalStats.approachingLow > 0 && <span className="font-semibold text-yellow-800">⏳ {medicalStats.approachingLow} Approaching Threshold</span>}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMedicalStatusFilter(medicalStatusFilter === 'NEEDS_RESTOCK' ? 'ALL' : 'NEEDS_RESTOCK')}
                className={clsx(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer",
                  medicalStatusFilter === 'NEEDS_RESTOCK'
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-white text-amber-900 border border-amber-300 hover:bg-amber-50"
                )}
              >
                {medicalStatusFilter === 'NEEDS_RESTOCK' ? 'Showing Restock Items (Reset)' : 'Filter All Items Requiring Restock'}
              </button>
            </div>
          )}

          {/* Medical Stock Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Inventory List */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Medical Stock Catalog</span>
                  <span className="text-xs text-slate-400 font-normal">({filteredMedicalItems.length} items)</span>
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={medicalCategoryFilter}
                    onChange={(e) => setMedicalCategoryFilter(e.target.value)}
                    className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none shadow-xs max-w-[160px] truncate"
                  >
                    <option value="ALL">All Categories</option>
                    {medicalCategories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    value={medicalStatusFilter}
                    onChange={(e) => setMedicalStatusFilter(e.target.value as any)}
                    className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none shadow-xs"
                  >
                    <option value="ALL">All Stock Status</option>
                    <option value="NEEDS_RESTOCK">⚠️ Needs Restock ({medicalStats.needsRestockTotal})</option>
                    <option value="OUT_OF_STOCK">🚨 Out of Stock ({medicalStats.outOfStock})</option>
                    <option value="CRITICAL_LOW">⚠️ Reorder Reached ({medicalStats.criticalLow})</option>
                    <option value="APPROACHING_LOW">⏳ Approaching Min ({medicalStats.approachingLow})</option>
                    <option value="IN_STOCK">✅ Adequate Stock ({medicalStats.inStock})</option>
                  </select>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="Search medical catalog..."
                      value={medicalSearch}
                      onChange={(e) => setMedicalSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-xs w-44 sm:w-52"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Items Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-2.5">Item Name</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5">Stock Level</th>
                      <th className="px-4 py-2.5">Unit Price</th>
                      <th className="px-4 py-2.5">Stock Warning</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {medicalLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-slate-400 font-normal">
                          <Loader2 className="animate-spin text-slate-500 mx-auto mb-2" size={22} />
                          Loading medical inventory...
                        </td>
                      </tr>
                    ) : filteredMedicalItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-slate-400 font-medium">
                          No medical items found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedMedicalItems.map((item) => {
                        const evalRes = evaluateMedicalStock(item);

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900">{item.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-medium">
                                <span>{item.unit || 'units'}</span>
                                {item.strength && <span>&bull; {item.strength}</span>}
                                {item.dosage_form && <span>&bull; {item.dosage_form}</span>}
                                {item.batch_number && (
                                  <span className="font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded">
                                    Lot: {item.batch_number}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                                {item.category || 'General'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={clsx(
                                  'font-black text-xs',
                                  evalRes.textClass
                                )}
                              >
                                {item.stock_level?.toLocaleString() ?? 0}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">/ min {evalRes.threshold}</span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">
                              {currencySymbol}
                              {(Number(item.unit_price) || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={clsx(
                                  'px-2.5 py-1 rounded-md text-[10px] font-bold inline-flex items-center gap-1.5 border shadow-2xs',
                                  evalRes.badgeClass
                                )}
                              >
                                <span
                                  className={clsx(
                                    'w-1.5 h-1.5 rounded-full shrink-0',
                                    evalRes.dotClass
                                  )}
                                />
                                {evalRes.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStockItem(item);
                                    setIsUpdateStockModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  title="Adjust Stock Quantity"
                                >
                                  <Sliders size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedEditMedicalItem(item);
                                    setIsAddMedicalModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Medical Item"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMedicalItem(item.id, item.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                <Pagination
                  currentPage={medicalPage}
                  totalPages={medicalTotalPages}
                  totalItems={medicalTotalItems}
                  pageSize={medicalPageSize}
                  onPageChange={setMedicalPage}
                  onPageSizeChange={setMedicalPageSize}
                  itemName="medical items"
                />
              </div>
            </div>

            {/* Right: Pharmacy Dispensing Desk */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Package size={16} className="text-brand-600" />
                  <span>Dispensing Queue</span>
                </h2>
                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {prescriptions.length} Pending
                </span>
              </div>

              <div className="space-y-3">
                {prescriptions.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
                    <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-900">Dispensing Queue Empty</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">No doctor prescriptions waiting for fulfillment.</p>
                  </div>
                ) : (
                  prescriptions.slice(0, 6).map((rx) => (
                    <div
                      key={rx.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-xs text-slate-900">
                            {rx.patients?.first_name} {rx.patients?.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(rx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                          Ready for Desk
                        </span>
                      </div>

                      <div className="space-y-1">
                        {(rx.prescription_items || []).map((pItem: any) => (
                          <div key={pItem.id} className="text-[11px] text-slate-600 flex justify-between font-medium">
                            <span className="truncate max-w-[180px]">{pItem.inventory_items?.name || 'Medication'}</span>
                            <span className="font-bold text-slate-800 shrink-0">Qty: {pItem.quantity_prescribed}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDispense(rx)}
                        className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Dispense Medication
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: CAPITAL ITEMS */}
      {/* ================================================================= */}
      {activeTab === 'capital' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Capital Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Fixed Assets & Durable Equipment</span>
              <span className="text-xs text-slate-300">|</span>
              <span className="text-xs text-slate-500 font-medium">Computers, televisions, chairs, machinery</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsManageCapitalCategoriesOpen(true)}
                className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Layers size={14} className="text-indigo-600" />
                Manage Categories
              </button>
              <button
                type="button"
                onClick={fetchCapitalData}
                className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={14} className={capitalLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedEditCapitalItem(null);
                  setIsAddCapitalModalOpen(true);
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-xs flex items-center gap-1.5 active:scale-98 cursor-pointer"
              >
                <Plus size={15} />
                Register Capital Item
              </button>
            </div>
          </div>

          {/* Capital Items Statistics Cards (NO medical low-stock warnings!) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Capital Assets</p>
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Monitor size={14} />
                </div>
              </div>
              <p className="text-2xl font-black tracking-tight text-slate-900">{capitalStats.total}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Computers, screens, furniture, machinery</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fully Operational</p>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-2xl font-black tracking-tight text-emerald-600">{capitalStats.operational}</p>
              <p className="text-[10px] text-emerald-600 font-medium mt-1">In active service across facilities</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Under Repair / Maint.</p>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
              <p className="text-2xl font-black tracking-tight text-amber-600">{capitalStats.underRepair}</p>
              <p className="text-[10px] text-amber-600 font-medium mt-1">Scheduled service or servicing</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Maint. Due (30 Days)</p>
                <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Wrench size={14} />
                </div>
              </div>
              <p className="text-2xl font-black tracking-tight text-slate-900">{capitalStats.maintDue}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Upcoming inspection window</p>
            </div>
          </div>

          {/* Capital Items Table & Search Controls */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Capital Equipment Registry</span>
                <span className="text-xs text-slate-400 font-normal">({filteredCapitalItems.length} records)</span>
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                {/* Category Filter */}
                <select
                  value={capitalCategoryFilter}
                  onChange={(e) => setCapitalCategoryFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none shadow-xs max-w-[170px] truncate"
                >
                  <option value="ALL">All Categories</option>
                  {capitalCategories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={capitalStatusFilter}
                  onChange={(e) => setCapitalStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none shadow-xs"
                >
                  <option value="ALL">All Status</option>
                  <option value="OPERATIONAL">Operational</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  <option value="UNDER_REPAIR">Under Repair</option>
                  <option value="DECOMMISSIONED">Decommissioned</option>
                </select>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search asset, S/N, tag, location..."
                    value={capitalSearch}
                    onChange={(e) => setCapitalSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 shadow-xs w-48 sm:w-60"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-2.5">Asset / Model</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Serial / Tag</th>
                    <th className="px-4 py-2.5">Location & Dept</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Next Maintenance</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {capitalLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400 font-normal">
                        <Loader2 className="animate-spin text-indigo-500 mx-auto mb-2" size={22} />
                        Loading capital items...
                      </td>
                    </tr>
                  ) : filteredCapitalItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400 font-medium">
                        No capital items registered yet. Click &quot;Register Capital Item&quot; to add computers, screens, or durable assets.
                      </td>
                    </tr>
                  ) : (
                    paginatedCapitalItems.map((asset) => {
                      const isOper = asset.status === 'OPERATIONAL';
                      const isRepair = asset.status === 'UNDER_REPAIR' || asset.status === 'UNDER_MAINTENANCE';

                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{asset.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {asset.model_number || 'Model: Standard'}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100">
                              {asset.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                            <div>{asset.serial_number || 'No S/N'}</div>
                            {asset.asset_tag && (
                              <span className="text-[10px] font-bold text-slate-400">Tag: {asset.asset_tag}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800">{asset.location || 'Unassigned'}</p>
                            <p className="text-[10px] text-slate-400">{asset.department || 'General Facility'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1',
                                isOper
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  : isRepair
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                              )}
                            >
                              <span
                                className={clsx(
                                  'w-1.5 h-1.5 rounded-full',
                                  isOper ? 'bg-emerald-500' : isRepair ? 'bg-amber-500' : 'bg-rose-500'
                                )}
                              />
                              {asset.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-600">
                            {asset.next_maintenance ? (
                              <span className="font-medium">{asset.next_maintenance}</span>
                            ) : (
                              <span className="text-slate-400">None scheduled</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedViewCapitalItem(asset)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="View Asset Details"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEditCapitalItem(asset);
                                  setIsAddCapitalModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit Asset"
                              >
                                <Edit2 size={14} />
                              </button>
                               {userRole === 'SUPER_USER' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCapitalItem(asset.id, asset.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Asset"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <Pagination
                currentPage={capitalPage}
                totalPages={capitalTotalPages}
                totalItems={capitalTotalItems}
                pageSize={capitalPageSize}
                onPageChange={setCapitalPage}
                onPageSizeChange={setCapitalPageSize}
                itemName="capital items"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODALS */}
      {/* ================================================================= */}
      {/* 1. Update Stock Modal (Medical only) */}
      <UpdateStockModal
        isOpen={isUpdateStockModalOpen}
        onClose={() => {
          setIsUpdateStockModalOpen(false);
          setSelectedStockItem(null);
        }}
        onSuccess={() => void fetchMedicalData()}
        item={selectedStockItem}
      />

      {/* 2. Add / Edit Medical Stock Modal */}
      <AddItemModal
        isOpen={isAddMedicalModalOpen}
        onClose={() => {
          setIsAddMedicalModalOpen(false);
          setSelectedEditMedicalItem(null);
        }}
        onSuccess={() => void fetchMedicalData()}
        initialItem={selectedEditMedicalItem}
      />

      {/* 3. Add / Edit Capital Item Modal */}
      <AddCapitalItemModal
        isOpen={isAddCapitalModalOpen}
        onClose={() => {
          setIsAddCapitalModalOpen(false);
          setSelectedEditCapitalItem(null);
        }}
        onSuccess={() => void fetchCapitalData()}
        initialItem={selectedEditCapitalItem}
      />

      {/* 4. View Capital Item Modal */}
      <ViewCapitalItemModal
        isOpen={Boolean(selectedViewCapitalItem)}
        onClose={() => setSelectedViewCapitalItem(null)}
        item={selectedViewCapitalItem}
        currencySymbol={currencySymbol}
      />

      {/* 5. Manage Capital Categories Modal */}
      <ManageCapitalCategoriesModal
        isOpen={isManageCapitalCategoriesOpen}
        onClose={() => setIsManageCapitalCategoriesOpen(false)}
        onCategoriesChanged={() => void fetchCapitalData()}
      />

      {/* 6. Status Feedback Modal */}
      <StatusModal
        isOpen={Boolean(statusModal)}
        type={statusModal?.type || 'success'}
        title={statusModal?.title || ''}
        message={statusModal?.message || ''}
        onClose={() => setStatusModal(null)}
      />
    </div>
  );
}

export default function InventoryDashboard() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto py-20 text-center text-slate-400 font-bold">
          <Loader2 className="animate-spin mx-auto mb-2 text-brand-600" size={32} />
          Loading inventory workspace...
        </div>
      }
    >
      <InventoryContent />
    </Suspense>
  );
}
