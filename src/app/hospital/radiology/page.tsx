'use client'

import { useState, useEffect } from "react";
import { Microscope, Plus, CheckCircle2, Image as ImageIcon, Search, Filter, Loader2, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";
import CreateRadiologyOrderModal from "@/components/hospital/CreateRadiologyOrderModal";
import StatusModal from "@/components/hospital/StatusModal";

interface RadiologyOrder {
  id: string;
  patient_id: string;
  modality: string;
  body_part: string;
  status: string;
  created_at: string;
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    file_number: string;
  };
  radiology_results?: Array<{
    id: string;
    findings?: string;
    conclusion?: string;
    is_finalized?: boolean;
    signed_at?: string;
  }>;
}

export default function RadiologyDashboard() {
  const [orders, setOrders] = useState<RadiologyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<RadiologyOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModality, setFilterModality] = useState<string>('ALL');

  const [findings, setFindings] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [nextStep, setNextStep] = useState<'DOCTOR_REVIEW' | 'IPD' | 'BILLING' | 'DISCHARGE'>('DOCTOR_REVIEW');
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchOrders();
    fetchDepartments();

    // Subscribe to realtime radiology changes
    const channel = supabase
      .channel('radiology_live_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'radiology_orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'radiology_results' }, () => fetchOrders())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name').order('name');
    if (data) setDepartments(data);
  };

  const getDepartmentId = (deptKey: string): string | null => {
    const normalized = deptKey.toLowerCase();
    const found = departments.find((d) => {
      const name = d.name.toLowerCase();
      if (normalized === 'opd') return name.includes('opd') || name.includes('outpatient');
      if (normalized === 'ipd') return name.includes('ipd') || name.includes('inpatient') || name.includes('ward');
      if (normalized === 'billing') return name.includes('billing') || name.includes('finance');
      return name.includes(normalized);
    });
    return found?.id || null;
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('radiology_orders')
        .select('*, patients(*), radiology_results(*)')
        .order('created_at', { ascending: false });

      if (data) {
        const orderList = data as RadiologyOrder[];
        setOrders(orderList);
        if (orderList.length > 0 && !selectedOrder) {
          setSelectedOrder(orderList[0]);
          const res = orderList[0].radiology_results?.[0];
          setFindings(res?.findings || "");
          setConclusion(res?.conclusion || "");
        }
      }
    } catch (err) {
      console.error('Error fetching radiology orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = (order: RadiologyOrder) => {
    setSelectedOrder(order);
    const res = order.radiology_results?.[0];
    setFindings(res?.findings || "");
    setConclusion(res?.conclusion || "");
  };

  const handleSaveReport = async () => {
    if (!selectedOrder) return;
    setIsSubmittingReport(true);

    try {
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

      // Perform Patient Queue Routing
      const pId = selectedOrder.patient_id;
      const pName = selectedOrder.patients ? `${selectedOrder.patients.first_name} ${selectedOrder.patients.last_name}` : 'Patient';

      if (pId) {
        const { data: queueRow } = await supabase
          .from('walkin_queue')
          .select('token_number')
          .eq('patient_id', pId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const token = queueRow?.token_number || null;

        if (nextStep === 'DOCTOR_REVIEW') {
          const opdDeptId = getDepartmentId('opd');
          if (opdDeptId) {
            await supabase.from('walkin_queue').insert({
              patient_id: pId,
              department_id: opdDeptId,
              status: 'WAITING',
              priority: 'HIGH',
              reason: `Imaging Report Finalized: ${selectedOrder.modality} (${selectedOrder.body_part})`,
              token_number: token,
            });
          }
          setStatusModal({
            type: 'success',
            title: 'Report Finalized & Forwarded',
            message: `Radiology report signed. ${pName} has been routed back to Doctor Consultation for review.`
          });
        } else if (nextStep === 'IPD') {
          const ipdDeptId = getDepartmentId('ipd');
          if (ipdDeptId) {
            await supabase.from('walkin_queue').insert({
              patient_id: pId,
              department_id: ipdDeptId,
              status: 'WAITING',
              priority: 'NORMAL',
              reason: `Inpatient Imaging Completed: ${selectedOrder.modality}`,
              token_number: token,
            });
          }
          setStatusModal({
            type: 'success',
            title: 'Report Finalized & Forwarded to Ward',
            message: `Radiology report signed. ${pName} has been forwarded to Inpatient Wards (IPD).`
          });
        } else if (nextStep === 'BILLING') {
          const billingDeptId = getDepartmentId('billing');
          if (billingDeptId) {
            await supabase.from('walkin_queue').insert({
              patient_id: pId,
              department_id: billingDeptId,
              status: 'WAITING',
              priority: 'NORMAL',
              reason: 'Radiology Scan Fee Settlement',
              token_number: token,
            });
          }
          setStatusModal({
            type: 'success',
            title: 'Report Finalized & Forwarded to Billing',
            message: `Radiology report signed. ${pName} has been forwarded to Finance & Billing.`
          });
        } else {
          setStatusModal({
            type: 'success',
            title: 'Report Finalized',
            message: `Radiology report signed and saved to electronic health record for ${pName}.`
          });
        }
      } else {
        setStatusModal({
          type: 'success',
          title: 'Report Finalized',
          message: 'Radiology report signed and saved to electronic health record.'
        });
      }

      fetchOrders();
    } catch (err: any) {
      setStatusModal({ type: 'error', title: 'Save Failed', message: err.message });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel and delete this radiology order?')) return;
    
    await supabase.from('radiology_results').delete().eq('order_id', orderId);
    const { error } = await supabase.from('radiology_orders').delete().eq('id', orderId);
    
    if (error) {
      setStatusModal({ type: 'error', title: 'Delete Failed', message: error.message });
    } else {
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      setStatusModal({ type: 'success', title: 'Order Cancelled', message: 'Radiology order removed from worklist.' });
      fetchOrders();
    }
  };

  const filteredOrders = orders.filter(o => {
    const pName = `${o.patients?.first_name || ''} ${o.patients?.last_name || ''}`;
    const matchesSearch = searchQuery === '' || 
      pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.body_part?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesModality = filterModality === 'ALL' || o.modality === filterModality;
    return matchesSearch && matchesModality;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status !== 'COMPLETED').length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Radiology Information System (RIS)</h1>
          <p className="text-slate-500 mt-1 font-medium">PACS Diagnostic Imaging Worklist & Radiologist Reporting.</p>
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
            New Imaging Order
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Imaging Orders</p>
          <p className="text-3xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Pending DICOM Studies</p>
          <p className="text-3xl font-black text-slate-900">{stats.pending}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Signed Reports</p>
          <p className="text-3xl font-black text-slate-900">{stats.completed}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Imaging Worklist */}
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Worklist ({filteredOrders.length})</h2>
              <select
                value={filterModality}
                onChange={(e) => setFilterModality(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Modalities</option>
                <option value="X-RAY">X-Ray</option>
                <option value="CT">CT Scan</option>
                <option value="MRI">MRI</option>
                <option value="ULTRASOUND">Ultrasound</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search patient or body part..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 font-bold">
                <Loader2 className="animate-spin text-brand-600 mx-auto mb-2" size={24} />
                Loading RIS worklist...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold">
                No radiology orders found.
              </div>
            ) : filteredOrders.map((order) => {
              const isSelected = selectedOrder?.id === order.id;
              const patientName = `${order.patients?.first_name || 'Unknown'} ${order.patients?.last_name || ''}`;
              return (
                <div 
                  key={order.id} 
                  onClick={() => handleSelectOrder(order)}
                  className={clsx(
                    "p-4 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md relative group",
                    isSelected ? "border-brand-500 bg-brand-50/30 shadow-sm" : "border-slate-200 bg-white"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={clsx(
                      "text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full text-white",
                      order.modality === 'CT' ? 'bg-purple-600' : order.modality === 'MRI' ? 'bg-blue-600' : 'bg-brand-600'
                    )}>
                      {order.modality}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 capitalize">{patientName}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{order.body_part} &bull; #{order.id.slice(0, 8)}</p>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <span className={clsx(
                      "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase",
                      order.status === 'COMPLETED' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {order.status}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Cancel Order"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: PACS Viewer Workstation */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <div className="bg-slate-900 rounded-3xl overflow-hidden flex flex-col h-[700px] shadow-2xl relative border border-slate-800">
            {/* PACS Toolbar Header */}
            <div className="bg-slate-800/80 backdrop-blur-md px-6 py-4 border-b border-slate-700 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3 text-white">
                <ImageIcon size={20} className="text-brand-400" />
                <span className="font-bold text-sm tracking-tight text-slate-200">
                  {selectedOrder ? `${selectedOrder.patients?.first_name || ''} ${selectedOrder.patients?.last_name || ''} • ${selectedOrder.modality} (${selectedOrder.body_part})` : 'Select an order from worklist'}
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-slate-700 text-slate-300">
                DICOM 3.0 Viewer
              </span>
            </div>

            {/* Diagnostic Image Display Area */}
            <div className="flex-1 bg-black flex items-center justify-center relative p-8">
              <div className="relative w-full h-full max-w-lg mx-auto bg-slate-800/60 rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 via-black to-slate-900/40 mix-blend-overlay" />
                
                <div className="absolute top-4 left-4 text-[10px] font-mono text-emerald-400/60 leading-tight">
                  <p>ORDER_ID: {selectedOrder?.id.slice(0, 8) || 'N/A'}</p>
                  <p>MODALITY: {selectedOrder?.modality || 'DICOM'}</p>
                  <p>REGION: {selectedOrder?.body_part || 'FULL'}</p>
                </div>

                <div className="text-center opacity-40">
                  <Microscope size={90} className="text-white mx-auto mb-3" />
                  <p className="text-white text-xs font-bold uppercase tracking-widest">
                    {selectedOrder ? `PACS Diagnostic Station - ${selectedOrder.modality}` : 'No DICOM Image Loaded'}
                  </p>
                </div>
              </div>
            </div>

            {/* Diagnostic Report Editor */}
            <div className="bg-slate-800/95 backdrop-blur-md p-6 border-t border-slate-700 relative z-10 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Radiologist Diagnostic Findings & Impression</label>
                <textarea 
                  value={findings}
                  onChange={e => setFindings(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-slate-600 h-20 outline-none"
                  placeholder="Enter diagnostic findings, impression, and conclusion..."
                />
              </div>

              {/* Next Step Selector & Finalize Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-700/60">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">Forward to:</span>
                  {[
                    { id: 'DOCTOR_REVIEW' as const, label: 'Doctor OPD', tag: 'Review' },
                    { id: 'IPD' as const, label: 'Ward (IPD)', tag: 'Inpatient' },
                    { id: 'BILLING' as const, label: 'Billing', tag: 'Cashier' },
                    { id: 'DISCHARGE' as const, label: 'Discharge', tag: 'Exit' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setNextStep(opt.id)}
                      className={clsx(
                        'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0',
                        nextStep === opt.id
                          ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-400'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <button 
                  disabled={!selectedOrder || isSubmittingReport}
                  onClick={handleSaveReport}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {isSubmittingReport ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Sign & Forward Report
                </button>
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
