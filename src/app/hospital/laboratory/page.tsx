'use client'

import { useState, useEffect } from "react";
import { Search, Filter, Plus, Clock, CheckCircle2, AlertTriangle, FlaskConical, Loader2, Trash2, Edit } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";
import CreateLabOrderModal from "@/components/hospital/CreateLabOrderModal";
import EnterLabResultModal from "@/components/hospital/EnterLabResultModal";

export default function LaboratoryDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [isEnterResultModalOpen, setIsEnterResultModalOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('lab_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_results' }, () => fetchOrders())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lab_orders')
      .select('*, patients(*), lab_results(*)')
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
    setLoading(false);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel and delete this lab order?')) return;
    
    await supabase.from('lab_results').delete().eq('order_id', orderId);
    const { error } = await supabase.from('lab_orders').delete().eq('id', orderId);
    
    if (error) alert('Delete failed: ' + error.message);
    else fetchOrders();
  };

  const filteredOrders = orders.filter(order => {
    const patientName = `${order.patients?.first_name || ''} ${order.patients?.last_name || ''}`.toLowerCase();
    const testName = order.lab_results?.[0]?.test_name?.toLowerCase() || '';
    return patientName.includes(searchQuery.toLowerCase()) || testName.includes(searchQuery.toLowerCase()) || order.id.includes(searchQuery);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Laboratory (LIS)</h1>
          <p className="text-slate-500 mt-1 font-medium">Sample Tracking & Live Result Management.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
          >
            <Plus size={16} />
            Receive Sample
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Pending Samples / Worklist */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Laboratory Worklist</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search orders..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                      Loading lab worklist...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No lab orders found.
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

        {/* Right: Overview & Flags */}
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Laboratory Overview</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-xs font-bold text-slate-600">Total Orders</span>
                <span className="text-lg font-black text-slate-900">{orders.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl">
                <span className="text-xs font-bold text-amber-700">Pending Samples</span>
                <span className="text-lg font-black text-amber-700">{orders.filter(o => o.status === 'ORDERED').length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl">
                <span className="text-xs font-bold text-emerald-700">Completed Today</span>
                <span className="text-lg font-black text-emerald-700">{orders.filter(o => o.status === 'COMPLETED').length}</span>
              </div>
            </div>
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
    </div>
  );
}
