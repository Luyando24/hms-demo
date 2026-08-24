'use client'

import { useState, useEffect } from "react";
import { Wrench, Monitor, MapPin, Search, Plus, Settings, AlertCircle, CheckCircle2, History, Info } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";

export default function AssetsDashboard() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [maintenanceCutoff] = useState(() => Date.now() + 30 * 24 * 60 * 60 * 1000);
  const supabase = createClient();

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('clinic_assets')
      .select('*')
      .order('name');
    if (data) setAssets(data);
    setLoading(false);
  };

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedAssets,
  } = usePagination(filteredAssets, { initialPageSize: 6 });

  const stats = {
    total: assets.length,
    underRepair: assets.filter(a => a.status === 'UNDER_REPAIR').length,
    maintenanceDue: assets.filter(a => a.next_maintenance && new Date(a.next_maintenance) <= new Date(maintenanceCutoff)).length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Capital Assets & Equipment</h1>
          <p className="text-slate-500 mt-1">Track fixed assets, medical equipment, and maintenance schedules.</p>
        </div>
        <button className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl flex items-center gap-2">
          <Plus size={18} />
          Register New Asset
        </button>
      </div>

      {/* Asset Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Monitor size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Assets</p>
            <p className="text-2xl font-black text-slate-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Wrench size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">Under Repair</p>
            <p className="text-2xl font-black text-slate-900">{stats.underRepair}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Settings size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Maint. Due Soon</p>
            <p className="text-2xl font-black text-slate-900">{stats.maintenanceDue}</p>
          </div>
        </div>
      </div>

      {/* Asset Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Asset Inventory</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search assets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 min-w-[250px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase tracking-widest">Scanning assets...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase tracking-widest">No assets found</div>
          ) : paginatedAssets.map((asset) => (
            <div key={asset.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className={clsx(
                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                  asset.category === 'Medical Equipment' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"
                )}>
                  {asset.category}
                </div>
                <span className={clsx(
                  "w-3 h-3 rounded-full",
                  asset.status === 'OPERATIONAL' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" :
                  asset.status === 'UNDER_REPAIR' ? "bg-rose-500 animate-pulse" : "bg-slate-300"
                )} />
              </div>

              <h3 className="text-lg font-black text-slate-900 mb-1">{asset.name}</h3>
              <p className="text-xs text-slate-400 font-bold flex items-center gap-1 mb-6">
                <MapPin size={12} /> {asset.location || 'Unknown Location'}
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-xs border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-bold uppercase tracking-widest">Next Service</span>
                  <span className={clsx(
                    "font-black",
                    asset.next_maintenance && new Date(asset.next_maintenance) <= new Date() ? "text-rose-600" : "text-slate-900"
                  )}>
                    {asset.next_maintenance ? new Date(asset.next_maintenance).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-widest">Status</span>
                  <span className="font-black text-slate-900">{asset.status.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-slate-50 text-slate-600 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
                  <History size={14} /> Log Service
                </button>
                <button className="flex-1 bg-brand-50 text-brand-600 py-2 rounded-xl text-xs font-bold hover:bg-brand-600 hover:text-white transition-all flex items-center justify-center gap-2">
                  <Info size={14} /> Details
                </button>
              </div>
            </div>
          ))}
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="assets"
        />
      </div>
    </div>
  );
}
