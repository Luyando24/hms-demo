'use client'

import { useState, useEffect } from "react";
import { Box, Search, Filter, Plus, Package, AlertCircle, RefreshCw, ClipboardCheck, Trash2, Edit2, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import UpdateStockModal from "@/components/hospital/UpdateStockModal";
import AddItemModal from "@/components/hospital/AddItemModal";
import StatusModal from "@/components/hospital/StatusModal";

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
      .select('*, patients(*)')
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
    const confirmDispense = window.confirm(`Dispense ${prescription.medication_name} to ${prescription.patients?.first_name || 'Patient'}?`);
    if (!confirmDispense) return;

    // 1. Find matching item to deduct stock
    const item = items.find(i => i.name.toLowerCase().includes(prescription.medication_name.toLowerCase()));
    
    if (item) {
      const deductQty = parseInt(prescription.dosage) || 1;
      const newStock = Math.max(0, item.stock_level - deductQty);

      const { error: stockError } = await supabase
        .from('inventory_items')
        .update({ stock_level: newStock })
        .eq('id', item.id);
      
      if (stockError) {
        setStatusModal({ type: 'error', title: 'Stock Update Failed', message: stockError.message });
        return;
      }
    }

    // 2. Update prescription status to DISPENSED
    const { error: statusError } = await supabase
      .from('prescriptions')
      .update({ status: 'DISPENSED' })
      .eq('id', prescription.id);

    if (statusError) {
      setStatusModal({ type: 'error', title: 'Dispense Failed', message: statusError.message });
    } else {
      setStatusModal({
        type: 'success',
        title: 'Medication Dispensed',
        message: `${prescription.medication_name} has been dispensed and stock deducted.`
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

  const stats = {
    totalItems: items.length,
    outOfStock: items.filter(i => i.stock_level === 0).length,
    lowStock: items.filter(i => i.stock_level > 0 && i.stock_level <= (i.reorder_level || i.min_reorder_level || 50)).length,
    dispensingToday: dispensedTodayCount
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Pharmacy & Inventory Management</h1>
          <p className="text-slate-500 mt-1 font-medium">Medical stock control, reorder alerts, and pharmacy dispensing.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-md flex items-center gap-2"
          >
            <Plus size={16} />
            Add New Item
          </button>
        </div>
      </div>

      {/* Inventory Real Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Inventory Items</p>
          <p className="text-3xl font-black text-slate-900">{stats.totalItems}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Out of Stock Items</p>
          <p className="text-3xl font-black text-rose-600">{stats.outOfStock}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Low Stock Reorder Alerts</p>
          <p className="text-3xl font-black text-amber-600">{stats.lowStock}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Dispensed Today</p>
          <p className="text-3xl font-black text-slate-900">{stats.dispensingToday}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Inventory List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-black text-slate-900">Inventory Stock Catalog</h2>
            
            <div className="flex items-center gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="Pharmacy">Pharmacy / Meds</option>
                <option value="Supplies">Medical Supplies</option>
                <option value="Reagents">Lab Reagents</option>
              </select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search stock catalog..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Stock Level</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase">
                      <Loader2 className="animate-spin text-brand-600 mx-auto mb-2" size={24} />
                      Loading inventory stock...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-bold text-xs">No items found matching filter.</td></tr>
                ) : filteredItems.map((item) => {
                  const reorderVal = item.reorder_level || item.min_reorder_level || 50;
                  const isOut = item.stock_level === 0;
                  const isLow = !isOut && item.stock_level <= reorderVal;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.unit || 'units'}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{item.category || 'General'}</td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "font-black text-base",
                          isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-slate-900"
                        )}>
                          {item.stock_level.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                          isOut ? "bg-rose-100 text-rose-700" :
                          isLow ? "bg-amber-100 text-amber-700" :
                          "bg-emerald-100 text-emerald-700"
                        )}>
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => { setSelectedItem(item); setIsUpdateModalOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"
                            title="Update Stock"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Pharmacy Dispensing Queue */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col h-full min-h-[500px] border border-slate-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full pointer-events-none" />
            <h2 className="text-lg font-black mb-6 flex items-center justify-between relative z-10">
              Pharmacy Dispensing Queue
              <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                {prescriptions.length} Pending
              </span>
            </h2>
            
            <div className="space-y-4 flex-1 overflow-y-auto relative z-10">
              {prescriptions.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Package className="mx-auto mb-4 opacity-20" size={48} />
                  <p className="text-xs font-bold uppercase tracking-widest">No pending prescriptions in queue.</p>
                </div>
              ) : prescriptions.map((row) => (
                <div key={row.id} className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between group hover:bg-slate-800 transition-all">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-100">
                      {row.patients ? `${row.patients.first_name} ${row.patients.last_name}` : 'Patient'}
                    </p>
                    <p className="text-xs text-brand-400 font-bold">{row.medication_name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Dosage: {row.dosage || 'Standard'} &bull; {row.frequency || 'Daily'}</p>
                  </div>
                  <button 
                    onClick={() => handleDispense(row)}
                    className="bg-brand-600 hover:bg-brand-500 text-white p-2.5 rounded-xl transition-all shadow-md shadow-brand-500/20"
                    title="Dispense Medication"
                  >
                    <ClipboardCheck size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
