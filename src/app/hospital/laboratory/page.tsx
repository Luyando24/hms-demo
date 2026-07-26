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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Laboratory Information System (LIS)</h1>
          <p className="text-slate-500 mt-1 font-medium font-sans">Sample tracking, diagnostic test execution, and result verification desk.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchOrders}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
          >
            <Plus size={16} />
            Receive Sample / Order Test
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Test Orders</p>
          <p className="text-3xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Pending Specimen Analysis</p>
          <p className="text-3xl font-black text-slate-900">{stats.pending}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Completed Results</p>
          <p className="text-3xl font-black text-slate-900">{stats.completed}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Worklist Table */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-black text-slate-900">Laboratory Specimen Worklist ({filteredOrders.length})</h2>
            
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ORDERED">Ordered</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search order, patient, or test..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Sample / Order ID</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Test Description</th>
                  <th className="px-6 py-4">Result</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-xs">
                      <Loader2 className="animate-spin text-brand-600 mx-auto mb-2" size={24} />
                      Loading lab worklist...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold text-xs">
                      No laboratory orders found.
                    </td>
                  </tr>
                ) : filteredOrders.map((order) => {
                  const result = order.lab_results?.[0];
                  const patientName = `${order.patients?.first_name || 'Unknown'} ${order.patients?.last_name || ''}`;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                            order.priority === 'CRITICAL' ? "bg-rose-100 text-rose-600" : 
                            order.priority === 'URGENT' ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600"
                          )}>
                            <FlaskConical size={16} />
                          </div>
                          <span className="font-black text-slate-900 text-xs">#{order.id.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 capitalize">{patientName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{order.patients?.file_number || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {result?.test_name || 'Standard Panel'}
                      </td>
                      <td className="px-6 py-4">
                        {result?.result_value ? (
                          <span className="font-black text-slate-900">{result.result_value} <span className="text-[10px] text-slate-400">{result.unit}</span></span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold italic">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                          order.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600" :
                          order.status === 'PROCESSING' ? "bg-blue-50 text-blue-600" :
                          "bg-amber-50 text-amber-600"
                        )}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {result && (
                            <button 
                              onClick={() => {
                                setSelectedResult(result);
                                setSelectedPatientName(patientName);
                                setIsEnterResultModalOpen(true);
                              }}
                              className="text-brand-600 font-bold hover:underline text-xs"
                            >
                              {result.result_value ? 'Edit Result' : 'Enter Result'}
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Cancel Order"
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
