'use client'

import { useState, useEffect } from "react";
import { Search, Filter, Plus, Clock, CheckCircle2, AlertTriangle, FlaskConical, Loader2, Trash2, Edit, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";
import CreateLabOrderModal from "@/components/hospital/CreateLabOrderModal";
import EnterLabResultModal from "@/components/hospital/EnterLabResultModal";
import StatusModal from "@/components/hospital/StatusModal";

interface LabOrder {
  id: string;
  patient_id: string;
  doctor_id?: string;
  status: string;
  priority?: string;
  created_at: string;
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    file_number: string;
  };
  lab_results?: Array<{
    id: string;
    order_id: string;
    test_name: string;
    result_value?: string;
    unit?: string;
    reference_range?: string;
    is_abnormal?: boolean;
  }>;
}

export default function LaboratoryDashboard() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [isEnterResultModalOpen, setIsEnterResultModalOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('lab_changes_live_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_results' }, () => fetchOrders())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_orders')
        .select('*, patients(*), lab_results(*)')
        .order('created_at', { ascending: false });

      if (data) setOrders(data as LabOrder[]);
    } catch (err) {
      console.error('Error fetching lab orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel and delete this lab order?')) return;
    
    await supabase.from('lab_results').delete().eq('order_id', orderId);
    const { error } = await supabase.from('lab_orders').delete().eq('id', orderId);
    
    if (error) {
      setStatusModal({ type: 'error', title: 'Delete Failed', message: error.message });
    } else {
      setStatusModal({ type: 'success', title: 'Order Cancelled', message: 'Lab order removed from worklist.' });
      fetchOrders();
    }
  };

  const filteredOrders = orders.filter(order => {
    const patientName = `${order.patients?.first_name || ''} ${order.patients?.last_name || ''}`.toLowerCase();
    const testName = order.lab_results?.[0]?.test_name?.toLowerCase() || '';
    const fileNo = order.patients?.file_number?.toLowerCase() || '';

    const matchesSearch = searchQuery === '' || 
      patientName.includes(searchQuery.toLowerCase()) || 
      testName.includes(searchQuery.toLowerCase()) || 
      fileNo.includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'ORDERED' || o.status === 'WAITING').length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Laboratory Information System (LIS)</h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">Sample tracking, diagnostic test execution, and result verification desk.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchOrders}
            className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
          >
            <Plus size={14} />
            Receive Sample / Order Test
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Test Orders</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.total}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">All recorded specimens</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Analysis</p>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.pending}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Awaiting technician run</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed Results</p>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.completed}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Verified & posted</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">Laboratory Specimen Worklist ({filteredOrders.length})</h2>
          
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none shadow-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="ORDERED">Ordered</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input 
                type="text" 
                placeholder="Search order, patient, or test..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-xs"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-4 py-2.5">Sample / Order ID</th>
                <th className="px-4 py-2.5">Patient</th>
                <th className="px-4 py-2.5">Test Description</th>
                <th className="px-4 py-2.5">Result</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-normal">
                    <Loader2 className="animate-spin text-slate-500 mx-auto mb-1.5" size={20} />
                    Loading lab worklist...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-normal">
                    No laboratory orders found.
                  </td>
                </tr>
              ) : filteredOrders.map((order) => {
                const result = order.lab_results?.[0];
                const patientName = `${order.patients?.first_name || 'Unknown'} ${order.patients?.last_name || ''}`;
                return (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={clsx(
                          "w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs",
                          order.priority === 'CRITICAL' ? "bg-rose-50 text-rose-600 border border-rose-200" : 
                          order.priority === 'URGENT' ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                        )}>
                          <FlaskConical size={12} />
                        </div>
                        <span className="font-mono font-semibold text-slate-900 text-xs">#{order.id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900 capitalize">{patientName}</p>
                      <p className="text-[10px] text-slate-400">{order.patients?.file_number || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {result?.test_name || 'Standard Panel'}
                    </td>
                    <td className="px-4 py-3">
                      {result?.result_value ? (
                        <span className="font-semibold text-slate-900">{result.result_value} <span className="text-[10px] text-slate-400 font-normal">{result.unit}</span></span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Pending run</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-md text-[10px] font-semibold inline-flex items-center gap-1",
                        order.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" :
                        order.status === 'PROCESSING' ? "bg-blue-50 text-blue-700 border border-blue-200/60" :
                        "bg-amber-50 text-amber-700 border border-amber-200/60"
                      )}>
                        <span className={clsx(
                          "w-1.5 h-1.5 rounded-full",
                          order.status === 'COMPLETED' ? "bg-emerald-500" :
                          order.status === 'PROCESSING' ? "bg-blue-500" :
                          "bg-amber-500"
                        )} />
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {result && (
                          <button 
                            onClick={() => {
                              setSelectedResult(result);
                              setSelectedPatientName(patientName);
                              setIsEnterResultModalOpen(true);
                            }}
                            className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-slate-800 transition-all shadow-xs"
                          >
                            {result.result_value ? 'Edit Result' : 'Enter Result'}
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteOrder(order.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Cancel Order"
                        >
                          <Trash2 size={14} />
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

      <CreateLabOrderModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchOrders}
      />

      {selectedResult && (
        <EnterLabResultModal 
          isOpen={isEnterResultModalOpen}
          onClose={() => { setIsEnterResultModalOpen(false); setSelectedResult(null); }}
          onSuccess={fetchOrders}
          labResult={selectedResult}
          patientName={selectedPatientName}
        />
      )}

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
