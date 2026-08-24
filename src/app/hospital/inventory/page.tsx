'use client'

import { useState, useEffect } from "react";
import { Box, Search, Filter, Plus, Package, AlertCircle, RefreshCw, ClipboardCheck, Trash2, Edit2, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import UpdateStockModal from "@/components/hospital/UpdateStockModal";
import AddItemModal from "@/components/hospital/AddItemModal";
import DispenseMedicationModal from "@/components/hospital/DispenseMedicationModal";
import StatusModal from "@/components/hospital/StatusModal";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";

interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  stock_level: number;
  reorder_level?: number;
  min_reorder_level?: number;
  unit?: string;
  unit_price?: number;
}

export default function InventoryDashboard() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  const [dispensedTodayCount, setDispensedTodayCount] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    fetchData();

    // Subscribe to realtime inventory changes
    const channel = supabase.channel('inventory_live_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => fetchItems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, () => fetchPrescriptions())
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchItems(), fetchPrescriptions()]);
    setLoading(false);
  };

  const fetchItems = async () => {
    const { data } = await supabase.from('inventory_items').select('*').order('name');
    if (data) setItems(data as InventoryItem[]);
  };

  const fetchPrescriptions = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Pending Prescriptions Queue
    const { data: pData } = await supabase
      .from('prescriptions')
      .select('id, status, created_at, patients(first_name, last_name), prescription_items(id, dosage, frequency, duration, quantity_prescribed, quantity_dispensed, inventory_items(id, name, stock_level, unit))')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (pData) setPrescriptions(pData);

    // Dispensed Today Count
    const { count: dispCount } = await supabase
      .from('prescriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'DISPENSED')
      .gte('created_at', todayStart.toISOString());

    setDispensedTodayCount(dispCount || 0);
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
      target_prescription_id: prescription.id
    });

    if (statusError) {
      setStatusModal({ type: 'error', title: 'Dispense Failed', message: statusError.message });
    } else {
      setStatusModal({
        type: 'success',
        title: 'Medication Dispensed',
        message: `${medicationNames} has been dispensed and stock was deducted atomically.`
      });
      fetchPrescriptions();
      fetchItems();
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete ${itemName} from inventory?`)) return;

    const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);

    if (error) {
      setStatusModal({ type: 'error', title: 'Delete Failed', message: error.message });
    } else {
      setStatusModal({ type: 'success', title: 'Item Removed', message: `${itemName} was deleted from inventory.` });
      fetchItems();
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedItems,
  } = usePagination(filteredItems, { initialPageSize: 10 });

  const stats = {
    totalItems: items.length,
    outOfStock: items.filter(i => i.stock_level === 0).length,
    lowStock: items.filter(i => i.stock_level > 0 && i.stock_level <= (i.reorder_level || i.min_reorder_level || 50)).length,
    dispensingToday: dispensedTodayCount
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pharmacy & Inventory Management</h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">Medical stock control, reorder alerts, and pharmacy dispensing desk.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData}
            className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
          >
            <Plus size={14} />
            Add New Item
          </button>
        </div>
      </div>

      {/* Inventory Real Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Items</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.totalItems}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Configured pharmaceuticals</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Out of Stock</p>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.outOfStock}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Requires emergency purchase</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Low Stock Alerts</p>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.lowStock}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Under reorder threshold</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dispensed Today</p>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.dispensingToday}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Filled prescriptions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Inventory List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">Inventory Stock Catalog</h2>
            
            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none shadow-xs"
              >
                <option value="ALL">All Categories</option>
                <option value="Pharmacy">Pharmacy / Meds</option>
                <option value="Supplies">Medical Supplies</option>
                <option value="Reagents">Lab Reagents</option>
              </select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input 
                  type="text" 
                  placeholder="Search stock catalog..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-xs"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-2.5">Item Name</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Stock Level</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-normal">
                      <Loader2 className="animate-spin text-slate-500 mx-auto mb-1.5" size={20} />
                      Loading inventory stock...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-normal">No items found matching filter.</td></tr>
                ) : paginatedItems.map((item) => {
                  const reorderVal = item.reorder_level || item.min_reorder_level || 50;
                  const isOut = item.stock_level === 0;
                  const isLow = !isOut && item.stock_level <= reorderVal;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.unit || 'units'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-normal">{item.category || 'General'}</td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          "font-bold text-xs",
                          isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-slate-900"
                        )}>
                          {item.stock_level.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          "px-2 py-0.5 rounded-md text-[10px] font-semibold inline-flex items-center gap-1",
                          isOut ? "bg-rose-50 text-rose-700 border border-rose-200/60" :
                          isLow ? "bg-amber-50 text-amber-700 border border-amber-200/60" :
                          "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        )}>
                          <span className={clsx(
                            "w-1.5 h-1.5 rounded-full",
                            isOut ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-emerald-500"
                          )} />
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => { setSelectedItem(item); setIsUpdateModalOpen(true); }}
                            className="p-1 text-slate-400 hover:text-slate-900 rounded-lg transition-colors"
                            title="Update Stock"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemName="items"
            />
          </div>
        </div>

        {/* Right: Pharmacy Dispensing Queue */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col h-full min-h-[480px]">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
              Dispensing Queue
              <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                {prescriptions.length} Pending
              </span>
            </h2>
            
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {prescriptions.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Package className="mx-auto mb-2 text-slate-300" size={32} />
                  <p className="text-xs font-normal">No pending prescriptions in queue.</p>
                </div>
              ) : prescriptions.map((row) => (
                <div key={row.id} className="bg-slate-50/70 border border-slate-100 p-3 rounded-xl flex items-center justify-between hover:bg-slate-100/60 transition-all">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {row.patients ? `${row.patients.first_name} ${row.patients.last_name}` : 'Patient'}
                    </p>
                    <p className="text-[11px] text-slate-700 font-medium truncate">
                      {(row.prescription_items || []).map((item: any) => item.inventory_items?.name || 'Medication').join(', ')}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {(row.prescription_items || []).map((item: any) =>
                        `${item.dosage} · ${item.frequency} · Qty ${item.quantity_prescribed - (item.quantity_dispensed || 0)}`
                      ).join(' | ')}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedPrescription(row);
                      setIsDispenseModalOpen(true);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg transition-all shadow-xs text-xs font-medium flex items-center gap-1 shrink-0 active:scale-98"
                    title="Dispense Medication"
                  >
                    <ClipboardCheck size={13} />
                    Dispense
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedPrescription && (
        <DispenseMedicationModal
          isOpen={isDispenseModalOpen}
          onClose={() => {
            setIsDispenseModalOpen(false);
            setSelectedPrescription(null);
          }}
          prescription={selectedPrescription}
          onSuccess={() => {
            fetchPrescriptions();
            fetchItems();
          }}
        />
      )}

      {selectedItem && (
        <UpdateStockModal 
          isOpen={isUpdateModalOpen}
          onClose={() => { setIsUpdateModalOpen(false); setSelectedItem(null); }}
          item={selectedItem}
          onSuccess={fetchItems}
        />
      )}

      <AddItemModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchItems}
      />

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
