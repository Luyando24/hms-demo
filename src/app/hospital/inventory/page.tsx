'use client'

import { useState, useEffect } from "react";
import { Box, Search, Filter, Plus, Package, AlertCircle, RefreshCw, ClipboardCheck, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import UpdateStockModal from "@/components/hospital/UpdateStockModal";
import AddItemModal from "@/components/hospital/AddItemModal";

export default function InventoryDashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    // Subscribe to changes
    const itemsSub = supabase.channel('inventory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => fetchItems())
      .subscribe();
    
    return () => {
      supabase.removeChannel(itemsSub);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchItems(), fetchPrescriptions()]);
    setLoading(false);
  };

  const fetchItems = async () => {
    const { data } = await supabase.from('inventory_items').select('*').order('name');
    if (data) setItems(data);
  };

  const fetchPrescriptions = async () => {
    const { data } = await supabase
      .from('prescriptions')
      .select('*, patients(*)')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });
    if (data) setPrescriptions(data);
  };

  const handleDispense = async (prescription: any) => {
    const confirm = window.confirm(`Dispense ${prescription.medication_name} to ${prescription.patients?.first_name}?`);
    if (!confirm) return;

    // 1. Find the item in inventory to deduct stock
    const item = items.find(i => i.name.toLowerCase().includes(prescription.medication_name.toLowerCase()));
    
    if (item) {
      const { error: stockError } = await supabase
        .from('inventory_items')
        .update({ stock_level: Math.max(0, item.stock_level - (parseInt(prescription.dosage) || 1)) })
        .eq('id', item.id);
      
      if (stockError) {
        alert("Error updating stock: " + stockError.message);
        return;
      }
    }

    // 2. Update prescription status
    const { error: statusError } = await supabase
      .from('prescriptions')
      .update({ status: 'DISPENSED' })
      .eq('id', prescription.id);

    if (statusError) {
      alert("Error updating prescription: " + statusError.message);
    } else {
      fetchPrescriptions();
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalItems: items.length,
    outOfStock: items.filter(i => i.stock_level === 0).length,
    lowStock: items.filter(i => i.stock_level > 0 && i.stock_level <= (i.reorder_level || 50)).length,
    dispensingToday: 142 // Placeholder or fetch from history
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Pharmacy & Inventory</h1>
          <p className="text-slate-500 mt-1">Medical Stock Tracking & Dispensing.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Package size={16} />
            Stock Take
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-md flex items-center gap-2"
          >
            <Plus size={16} />
            Add New Item
          </button>
        </div>
      </div>

      {/* Inventory Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Items</p>
          <p className="text-2xl font-black text-slate-900">{stats.totalItems}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">Out of Stock</p>
          <p className="text-2xl font-black text-slate-900">{stats.outOfStock}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Low Stock Alerts</p>
          <p className="text-2xl font-black text-slate-900">{stats.lowStock}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Queue Length</p>
          <p className="text-2xl font-black text-slate-900">{prescriptions.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Inventory List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Inventory Management</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search stock..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
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
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading inventory...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No items found.</td></tr>
                ) : filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{item.unit}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{item.category}</td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "font-black text-base",
                        item.stock_level === 0 ? "text-rose-600" : 
                        item.stock_level <= (item.reorder_level || 50) ? "text-amber-600" : "text-slate-900"
                      )}>
                        {item.stock_level.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        item.stock_level > (item.reorder_level || 50) ? "bg-emerald-50 text-emerald-600" :
                        item.stock_level > 0 ? "bg-amber-50 text-amber-600" :
                        "bg-rose-50 text-rose-600"
                      )}>
                        {item.stock_level === 0 ? 'Out of Stock' : item.stock_level <= (item.reorder_level || 50) ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => { setSelectedItem(item); setIsUpdateModalOpen(true); }}
                        className="text-brand-600 font-bold hover:underline text-xs"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Dispensing Queue */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full" />
            <h2 className="text-lg font-bold mb-6 flex items-center justify-between relative z-10">
              Dispensing Queue
              <span className="bg-rose-500 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">{prescriptions.length} Pending</span>
            </h2>
            
            <div className="space-y-4 flex-1 overflow-y-auto relative z-10">
              {prescriptions.length === 0 ? (
                <div className="text-center py-12 opacity-50">
                  <Package className="mx-auto mb-4 opacity-20" size={48} />
                  <p className="text-xs font-bold uppercase tracking-widest">Queue is Empty</p>
                </div>
              ) : prescriptions.map((row) => (
                <div key={row.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-slate-800 transition-all">
                  <div>
                    <p className="text-sm font-bold text-slate-100">{row.patients?.first_name} {row.patients?.last_name}</p>
                    <p className="text-xs text-slate-400 mt-1">{row.medication_name}</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-black uppercase">{row.dosage} • {row.frequency}</p>
                  </div>
                  <button 
                    onClick={() => handleDispense(row)}
                    className="bg-brand-500 hover:bg-brand-600 text-white p-2 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100 shadow-lg shadow-brand-500/20"
                  >
                    <ClipboardCheck size={16} />
                  </button>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-8 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-sm font-bold transition-all relative z-10">
              Dispensing History
            </button>
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
    </div>
  );
}
