'use client'

import { useState, useEffect } from "react";
import { Microscope, Plus, CheckCircle2, Image as ImageIcon, Maximize2, ZoomIn, Sun, MousePointer2, PenTool, Loader2, Trash2 } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";
import CreateRadiologyOrderModal from "@/components/hospital/CreateRadiologyOrderModal";

export default function RadiologyDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [findings, setFindings] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('radiology_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'radiology_orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'radiology_results' }, () => fetchOrders())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('radiology_orders')
      .select('*, patients(*), radiology_results(*)')
      .order('created_at', { ascending: false });

    if (data) {
      setOrders(data);
      if (data.length > 0 && !selectedOrder) {
        setSelectedOrder(data[0]);
        const res = data[0].radiology_results?.[0];
        setFindings(res?.findings || "");
        setConclusion(res?.conclusion || "");
      }
    }
    setLoading(false);
  };

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
    const res = order.radiology_results?.[0];
    setFindings(res?.findings || "");
    setConclusion(res?.conclusion || "");
  };

  const handleSaveReport = async () => {
    if (!selectedOrder) return;
    setIsSubmittingReport(true);

    const resultRecord = selectedOrder.radiology_results?.[0];
    
    if (resultRecord) {
      await supabase
        .from('radiology_results')
        .update({
          findings: findings,
          conclusion: conclusion,
          is_finalized: true,
          signed_at: new Date().toISOString()
        })
        .eq('id', resultRecord.id);
    } else {
      await supabase
        .from('radiology_results')
        .insert({
          order_id: selectedOrder.id,
          findings: findings,
          conclusion: conclusion,
          is_finalized: true,
          signed_at: new Date().toISOString()
        });
    }

    await supabase
      .from('radiology_orders')
      .update({ status: 'COMPLETED' })
      .eq('id', selectedOrder.id);

    alert('Radiology report finalized and saved to patient record.');
    setIsSubmittingReport(false);
    fetchOrders();
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel and delete this radiology order?')) return;
    
    await supabase.from('radiology_results').delete().eq('order_id', orderId);
    const { error } = await supabase.from('radiology_orders').delete().eq('id', orderId);
    
    if (error) alert('Delete failed: ' + error.message);
    else {
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      fetchOrders();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Radiology (RIS)</h1>
          <p className="text-slate-500 mt-1 font-medium">Imaging Worklist & Live PACS Viewer.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
          >
            <Plus size={16} />
            New Imaging Order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Imaging Worklist */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Worklist</h2>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
              {orders.length} Orders
            </span>
          </div>

          <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 font-bold">
                <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                Loading RIS worklist...
              </div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold">
                No radiology orders found.
              </div>
            ) : orders.map((order) => {
              const isSelected = selectedOrder?.id === order.id;
              const patientName = `${order.patients?.first_name || 'Unknown'} ${order.patients?.last_name || ''}`;
              return (
                <div 
                  key={order.id} 
                  onClick={() => handleSelectOrder(order)}
                  className={clsx(
                    "p-4 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md relative group",
                    isSelected ? "border-brand-500 bg-brand-50/30" : "border-slate-200 bg-white"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={clsx(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                      order.status === 'COMPLETED' ? "bg-emerald-500 text-white" : "bg-brand-500 text-white"
                    )}>
                      {order.modality}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 capitalize">{patientName}</h3>
                  <p className="text-xs text-slate-500 mt-1">{order.body_part} • #{order.id.slice(0, 8)}</p>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <span className={clsx(
                      "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase",
                      order.status === 'COMPLETED' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {order.status}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: PACS Viewer Simulator */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <div className="bg-slate-900 rounded-2xl overflow-hidden flex flex-col h-[700px] shadow-2xl relative">
            {/* Viewer Toolbar */}
            <div className="bg-slate-800/80 backdrop-blur-md px-6 py-4 border-b border-slate-700 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-white">
                  <ImageIcon size={20} className="text-brand-400" />
                  <span className="font-bold text-sm tracking-tight text-slate-200">
                    {selectedOrder ? `${selectedOrder.patients?.first_name || ''} ${selectedOrder.patients?.last_name || ''} • ${selectedOrder.modality} (${selectedOrder.body_part})` : 'Select an order from worklist'}
                  </span>
                </div>
              </div>
            </div>

            {/* Viewer Area */}
            <div className="flex-1 bg-black flex items-center justify-center relative p-8">
              <div className="relative w-full h-full max-w-lg mx-auto bg-slate-800 rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 via-black to-slate-900/40 mix-blend-overlay" />
                
                <div className="absolute top-4 left-4 text-[10px] font-mono text-emerald-400/60 leading-tight">
                  <p>ORDER_ID: {selectedOrder?.id.slice(0, 8) || 'N/A'}</p>
                  <p>MODALITY: {selectedOrder?.modality || 'DICOM'}</p>
                  <p>REGION: {selectedOrder?.body_part || 'FULL'}</p>
                </div>

                <div className="text-center opacity-30">
                  <Microscope size={100} className="text-white mx-auto mb-4" />
                  <p className="text-white text-xs font-bold uppercase tracking-widest">
                    {selectedOrder ? `PACS Viewer - ${selectedOrder.modality}` : 'No Image Selected'}
                  </p>
                </div>
              </div>
            </div>

            {/* Report Footer */}
            <div className="bg-slate-800/90 backdrop-blur-md p-6 border-t border-slate-700 relative z-10">
              <div className="flex justify-between items-end gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Radiologist Impression & Findings</label>
                  <textarea 
                    value={findings}
                    onChange={e => setFindings(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-slate-600 h-20"
                    placeholder="Enter diagnostic findings and impression..."
                  />
                </div>
                <div className="w-48 space-y-3">
                  <button 
                    disabled={!selectedOrder || isSubmittingReport}
                    onClick={handleSaveReport}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingReport ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    Finalize Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateRadiologyOrderModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchOrders}
      />
    </div>
  );
}
