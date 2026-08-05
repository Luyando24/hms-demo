'use client'

import { useState, useEffect } from "react";
import { Activity, AlertTriangle, Clock, Search, Filter, RefreshCw, CheckCircle2, UserCheck } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import AddErTriageModal from "@/components/hospital/AddErTriageModal";
import StatusModal from "@/components/hospital/StatusModal";
import clsx from "clsx";

interface ErQueueItem {
  id: string;
  patient_id: string | null;
  status: string;
  priority: string;
  reason: string | null;
  created_at: string | null;
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    file_number: string;
    gender?: string;
    dob?: string;
  } | null;
}

export default function EmergencyDashboard() {
  const [loading, setLoading] = useState(true);
  const [erCases, setErCases] = useState<ErQueueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<'ALL' | 'EMERGENCY' | 'URGENT' | 'NORMAL'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchErData();

    // Subscribe to realtime ER updates
    const channel = supabase
      .channel('er-triage-live-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walkin_queue' }, () => fetchErData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchErData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('walkin_queue')
        .select('*, patients(*)')
        .order('created_at', { ascending: false });

      if (data) {
        // Filter for ER or emergency cases, or all queue items
        setErCases(data);
      }
    } catch (err) {
      console.error('Error fetching ER queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('walkin_queue')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      setStatusModal({ type: 'error', title: 'Update Failed', message: error.message });
    } else {
      setStatusModal({ type: 'success', title: 'Status Updated', message: `ER case status changed to ${newStatus}.` });
      fetchErData();
    }
  };

  function formatTimeAgo(dateStr: string | null) {
    if (!dateStr) return 'Just now';
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  // Filtered cases
  const statCases = erCases.filter(c => c.priority === 'EMERGENCY' && c.status === 'WAITING');
  const filteredCases = erCases.filter(c => {
    const matchesSearch = searchQuery === '' || 
      c.patients?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.patients?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.patients?.file_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority = filterPriority === 'ALL' || c.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Emergency Department (ER)</h1>
          <p className="text-slate-500 mt-1 font-medium">Real-time Triage, Trauma Monitor, and STAT Resuscitation Desk.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchErData}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors shadow-md shadow-rose-500/20 flex items-center gap-2"
          >
            <AlertTriangle size={16} />
            New Incoming Trauma
          </button>
        </div>
      </div>

      {/* STAT Monitor (Critical Emergency Resuscitations) */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-rose-600 mb-4 flex items-center gap-2">
          <Activity size={16} className="animate-pulse" />
          STAT Monitor & Resuscitation Bays ({statCases.length} Critical)
        </h2>
        
        {statCases.length === 0 ? (
          <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-400" />
              <div>
                <p className="font-bold text-sm">Resuscitation Bays Clear</p>
                <p className="text-xs text-slate-400">No active STAT 1 critical trauma alerts pending.</p>
              </div>
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-500 transition-colors"
            >
              Log Emergency Patient
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {statCases.slice(0, 2).map((item, idx) => {
              const pName = item.patients ? `${item.patients.first_name} ${item.patients.last_name}` : 'Unknown Trauma Patient';
              const pAge = item.patients?.dob ? new Date().getFullYear() - new Date(item.patients.dob).getFullYear() : 'N/A';
              const gender = item.patients?.gender?.[0] || 'M';

              return (
                <div key={item.id} className={clsx(
                  "rounded-2xl p-6 shadow-xl relative overflow-hidden text-white",
                  idx === 0 ? "bg-rose-600" : "bg-slate-900 border border-slate-800"
                )}>
                  <div className="relative z-10 flex justify-between items-start mb-6">
                    <div>
                      <span className="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-wide uppercase">
                        CRITICAL TRAUMA &bull; STAT 1
                      </span>
                      <h3 className="text-2xl font-black mt-3">{pName} ({gender}/{pAge})</h3>
                      <p className="text-rose-100 mt-1 text-sm font-medium">{item.reason || 'Acute Emergency Trauma'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-rose-100 text-xs font-bold uppercase tracking-wider">Arrival Time</span>
                      <p className="text-lg font-bold font-mono mt-1">{formatTimeAgo(item.created_at)}</p>
                    </div>
                  </div>
                  <div className="relative z-10 bg-black/20 rounded-xl p-4 backdrop-blur-sm border border-white/10 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-rose-200 font-bold uppercase">MRN File Number</p>
                      <p className="font-bold text-sm">{item.patients?.file_number || 'EMERGENCY'}</p>
                    </div>
                    <button 
                      onClick={() => handleUpdateStatus(item.id, 'IN_CONSULTATION')}
                      className="bg-white text-rose-600 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:bg-rose-50 transition-colors"
                    >
                      Triage to Doctor
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5-Level Triage Board */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900">Active ER Triage Queue</h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
              {filteredCases.length} Patients
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="EMERGENCY">Emergency (Critical)</option>
              <option value="URGENT">Urgent</option>
              <option value="NORMAL">Normal / Non-Urgent</option>
            </select>

            <div className="relative w-64">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ER queue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Triage Priority</th>
                  <th className="px-6 py-4">Patient Info</th>
                  <th className="px-6 py-4">Chief Complaint / Location</th>
                  <th className="px-6 py-4">Wait Time</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-bold text-xs uppercase">Loading ER Triage Cases...</td></tr>
                ) : filteredCases.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-bold text-xs uppercase">No emergency queue records found.</td></tr>
                ) : filteredCases.map((row) => {
                  const pName = row.patients ? `${row.patients.first_name} ${row.patients.last_name}` : 'Walk-in ER Patient';
                  const pAge = row.patients?.dob ? new Date().getFullYear() - new Date(row.patients.dob).getFullYear() : 'N/A';
                  const gender = row.patients?.gender || 'N/A';

                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs uppercase",
                          row.priority === 'EMERGENCY' ? "bg-rose-100 text-rose-700" :
                          row.priority === 'URGENT' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                        )}>
                          <div className={clsx(
                            "w-2 h-2 rounded-full",
                            row.priority === 'EMERGENCY' ? "bg-rose-500 animate-ping" :
                            row.priority === 'URGENT' ? "bg-amber-500" : "bg-blue-500"
                          )} />
                          {row.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{pName}</p>
                        <p className="text-slate-400 text-xs font-bold uppercase">{row.patients?.file_number || 'N/A'} &bull; {gender}/{pAge}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {row.reason || 'General Emergency Assessment'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600 font-mono font-bold flex items-center gap-1.5 text-xs">
                          <Clock size={14} /> {formatTimeAgo(row.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {row.status === 'WAITING' ? (
                          <button 
                            onClick={() => handleUpdateStatus(row.id, 'IN_CONSULTATION')}
                            className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-brand-600 transition-colors"
                          >
                            Attend Patient
                          </button>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase">
                            {row.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <AddErTriageModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchErData();
        }}
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
