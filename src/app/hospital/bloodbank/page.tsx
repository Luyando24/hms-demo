'use client'

import { useState, useEffect } from "react";
import { Droplet, Search, Filter, Plus, Calendar, Clock, Activity, AlertCircle, Heart, RefreshCw, Loader2, Minus } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";
import LogBloodDonationModal from "@/components/hospital/LogBloodDonationModal";
import StatusModal from "@/components/hospital/StatusModal";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";

interface BloodStockItem {
  blood_group: string;
  units_in_stock: number;
  status: 'stable' | 'low' | 'critical';
}

interface BloodDonationItem {
  id: string;
  donor_name: string;
  blood_group: string;
  quantity_ml: number;
  donation_date: string | null;
}

const ALL_BLOOD_GROUPS = ['O+', 'A+', 'B+', 'O-', 'AB+', 'A-', 'B-', 'AB-'];

export default function BloodBankDashboard() {
  const [loading, setLoading] = useState(true);
  const [bloodStock, setBloodStock] = useState<BloodStockItem[]>([]);
  const [donations, setDonations] = useState<BloodDonationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchBloodBankData();

    // Subscribe to realtime blood bank updates
    const channel = supabase
      .channel('bloodbank_live_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_inventory' }, () => fetchBloodBankData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_donations' }, () => fetchBloodBankData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBloodBankData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Blood Inventory from DB
      const { data: invData } = await supabase
        .from('blood_inventory')
        .select('*');

      const invMap = new Map<string, number>();
      (invData || []).forEach(row => {
        invMap.set(row.blood_group, row.quantity_units || 0);
      });

      const formattedStock: BloodStockItem[] = ALL_BLOOD_GROUPS.map(bg => {
        const units = invMap.get(bg) || (bg === 'O+' ? 14 : bg === 'A+' ? 8 : 4);
        const status = units <= 5 ? 'critical' : units <= 15 ? 'low' : 'stable';
        return {
          blood_group: bg,
          units_in_stock: units,
          status: status
        };
      });

      setBloodStock(formattedStock);

      // 2. Fetch Recent Donations from DB
      const { data: donData } = await supabase
        .from('blood_donations')
        .select('*')
        .order('donation_date', { ascending: false })
        .limit(10);

      setDonations(donData || []);

    } catch (err) {
      console.error('Error fetching blood bank data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueUnit = async (bloodGroup: string) => {
    const confirmIssue = confirm(`Issue 1 unit of ${bloodGroup} blood for transfusion?`);
    if (!confirmIssue) return;

    const currentStock = bloodStock.find(s => s.blood_group === bloodGroup);
    if (!currentStock || currentStock.units_in_stock <= 0) {
      setStatusModal({ type: 'error', title: 'Insufficient Reserve', message: `No available ${bloodGroup} units in blood bank.` });
      return;
    }

    const newUnits = Math.max(0, currentStock.units_in_stock - 1);

    const { data: existing } = await supabase
      .from('blood_inventory')
      .select('id')
      .eq('blood_group', bloodGroup)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('blood_inventory')
        .update({ quantity_units: newUnits })
        .eq('id', existing.id);
    }

    setStatusModal({
      type: 'success',
      title: 'Blood Unit Issued',
      message: `1 unit of ${bloodGroup} issued for clinical transfusion.`
    });

    fetchBloodBankData();
  };

  const filteredDonations = donations.filter(d => 
    searchQuery === '' ||
    d.donor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.blood_group?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedDonations,
  } = usePagination(filteredDonations, { initialPageSize: 8 });

  const totalReserveUnits = bloodStock.reduce((sum, s) => sum + s.units_in_stock, 0);
  const criticalGroups = bloodStock.filter(s => s.status === 'critical');

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Blood Bank & Transfusion Service</h1>
          <p className="text-slate-500 mt-1 font-medium">Blood group reserves, donor registry, and transfusion unit tracking.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchBloodBankData}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button 
            onClick={() => setIsDonationModalOpen(true)}
            className="bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors shadow-md flex items-center gap-2"
          >
            <Plus size={16} />
            Log New Donation
          </button>
        </div>
      </div>

      {/* Blood Group Reserves Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Blood Group Reserves ({totalReserveUnits} Total Units)</h2>
          {criticalGroups.length > 0 && (
            <span className="text-xs font-black bg-rose-100 text-rose-700 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
              <AlertCircle size={14} /> Low Supply: {criticalGroups.map(c => c.blood_group).join(', ')}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {bloodStock.map((stock) => (
            <div key={stock.blood_group} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-between relative group hover:border-slate-300 transition-all">
              <div>
                <p className="text-xl font-black text-slate-900 mb-1">{stock.blood_group}</p>
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2 mx-auto">
                  <Droplet size={20} className={clsx(
                    stock.status === 'critical' ? "text-rose-500 animate-pulse" : 
                    stock.status === 'low' ? "text-amber-500" : "text-brand-500"
                  )} fill="currentColor" />
                </div>
                <p className="text-xl font-black text-slate-900 leading-none">{stock.units_in_stock}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Units</p>
              </div>

              <div className="w-full mt-3 space-y-2">
                <div className={clsx(
                  "w-full h-1.5 rounded-full",
                  stock.status === 'critical' ? "bg-rose-500" : 
                  stock.status === 'low' ? "bg-amber-500" : "bg-emerald-500"
                )} />

                <button 
                  onClick={() => handleIssueUnit(stock.blood_group)}
                  className="w-full py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1"
                  title="Issue 1 Unit"
                >
                  <Minus size={12} /> Issue Unit
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Donor Registry Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-lg font-black text-slate-900">Recent Blood Donor Registry</h2>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search donor or group..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
            
            <div className="overflow-hidden border border-slate-200 rounded-2xl">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Donor Name</th>
                    <th className="px-6 py-3">Group</th>
                    <th className="px-6 py-3">Units Donated</th>
                    <th className="px-6 py-3">Component Type</th>
                    <th className="px-6 py-3 text-right">Donation Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-bold text-xs">Loading donor registry...</td></tr>
                  ) : filteredDonations.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-bold text-xs">No donor records found.</td></tr>
                  ) : paginatedDonations.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{row.donor_name || 'Anonymous Donor'}</td>
                      <td className="px-6 py-4 font-black text-rose-600">{row.blood_group}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">
                        {Math.max(1, Math.ceil(row.quantity_ml / 450))} unit(s)
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">Whole Blood</td>
                      <td className="px-6 py-4 text-right text-xs text-slate-500 font-bold">
                        {row.donation_date ? new Date(row.donation_date).toLocaleDateString() : 'Pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemName="donors"
              />
            </div>
          </div>
        </div>

        {/* Inventory Overview & Blood Drive Info */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-2xl rounded-full pointer-events-none" />
            <h2 className="text-lg font-black mb-6 flex items-center gap-2">
              <AlertCircle className="text-rose-400" size={20} />
              Blood Bank Safety Overview
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Reserve Capacity</p>
                <p className="text-lg font-bold text-rose-100 mt-1">{totalReserveUnits} Units Stored</p>
                <p className="text-xs text-emerald-400 font-bold mt-2">&bull; Tested for Infectious Agents</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Heart size={32} fill="currentColor" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Community Blood Drives</h3>
            <p className="text-sm text-slate-500 mt-2 font-medium">Schedule and manage voluntary blood donation campaigns.</p>
            <button 
              onClick={() => setIsDonationModalOpen(true)}
              className="w-full mt-6 bg-slate-900 text-white py-3 rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md"
            >
              Log Donation Unit
            </button>
          </div>
        </div>
      </div>

      <LogBloodDonationModal 
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        onSuccess={fetchBloodBankData}
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
