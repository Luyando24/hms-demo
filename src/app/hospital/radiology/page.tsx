'use client'

import { useState, useEffect } from "react";
import { Microscope, Plus, CheckCircle2, Image as ImageIcon, Search, Filter, Loader2, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";
import CreateRadiologyOrderModal from "@/components/hospital/CreateRadiologyOrderModal";
import StatusModal from "@/components/hospital/StatusModal";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";

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

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedOrders,
  } = usePagination(filteredOrders, { initialPageSize: 8 });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status !== 'COMPLETED').length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Radiology Information System (RIS)</h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">PACS diagnostic imaging worklist and radiologist reporting desk.</p>
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
            New Imaging Order
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Imaging Orders</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.total}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">All recorded modalities</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Studies</p>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.pending}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Awaiting radiologist review</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Signed Reports</p>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.completed}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Finalized & dispatched</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Imaging Worklist */}
        <div className="lg:col-span-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Worklist ({filteredOrders.length})</h2>
              <select
                value={filterModality}
                onChange={(e) => setFilterModality(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold rounded-xl px-2.5 py-1 text-slate-700 focus:outline-none shadow-xs"
              >
                <option value="ALL">All Modalities</option>
                <option value="X-RAY">X-Ray</option>
                <option value="CT">CT Scan</option>
                <option value="MRI">MRI</option>
                <option value="ULTRASOUND">Ultrasound</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input 
                type="text" 
                placeholder="Search patient or body part..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-xs"
              />
            </div>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 font-normal text-xs">
                <Loader2 className="animate-spin text-slate-500 mx-auto mb-2" size={20} />
                Loading RIS worklist...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-normal text-xs">
                No radiology orders found.
              </div>
            ) : paginatedOrders.map((order) => {
              const isSelected = selectedOrder?.id === order.id;
              const patientName = `${order.patients?.first_name || 'Unknown'} ${order.patients?.last_name || ''}`;
              return (
                <div 
                  key={order.id} 
                  onClick={() => handleSelectOrder(order)}
                  className={clsx(
                    "p-3.5 rounded-2xl border transition-all cursor-pointer relative",
                    isSelected ? "border-slate-900 bg-slate-900 text-white shadow-xs" : "border-slate-200/80 bg-white hover:border-slate-300 text-slate-900"
                  )}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className={clsx(
                      "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                    )}>
                      {order.modality}
                    </span>
                    <span className={clsx("text-[10px]", isSelected ? "text-slate-300" : "text-slate-400")}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold capitalize">{patientName}</h3>
                  <p className={clsx("text-[11px] mt-0.5 font-normal", isSelected ? "text-slate-300" : "text-slate-500")}>
                    {order.body_part} &bull; #{order.id.slice(0, 8)}
                  </p>
                  
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className={clsx(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase inline-flex items-center gap-1",
                      isSelected
                        ? "bg-white/20 text-white"
                        : order.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-amber-50 text-amber-700 border border-amber-200/60"
                    )}>
                      <span className={clsx(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-white" : order.status === 'COMPLETED' ? "bg-emerald-500" : "bg-amber-500"
                      )} />
                      {order.status}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                      className={clsx("transition-colors p-1", isSelected ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-rose-600")}
                      title="Cancel Order"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemName="orders"
            showPageNumbers={false}
            className="rounded-2xl border border-slate-200/80 bg-white"
          />
        </div>

        {/* Right: PACS Viewer Workstation */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="bg-slate-900 rounded-2xl overflow-hidden flex flex-col h-[650px] shadow-lg relative border border-slate-800">
            {/* PACS Toolbar Header */}
            <div className="bg-slate-800/90 backdrop-blur-md px-5 py-3 border-b border-slate-700 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5 text-white">
                <ImageIcon size={16} className="text-slate-300" />
                <span className="font-semibold text-xs text-slate-200 truncate">
                  {selectedOrder ? `${selectedOrder.patients?.first_name || ''} ${selectedOrder.patients?.last_name || ''} • ${selectedOrder.modality} (${selectedOrder.body_part})` : 'Select an order from worklist'}
                </span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                DICOM 3.0 Viewer
              </span>
            </div>

            {/* Diagnostic Image Display Area */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center relative p-6">
              <div className="relative w-full h-full max-w-md mx-auto bg-slate-900/60 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
                <div className="absolute top-3 left-3 text-[10px] font-mono text-emerald-400/60 leading-tight">
                  <p>ORDER_ID: {selectedOrder?.id.slice(0, 8) || 'N/A'}</p>
                  <p>MODALITY: {selectedOrder?.modality || 'DICOM'}</p>
                  <p>REGION: {selectedOrder?.body_part || 'FULL'}</p>
                </div>

                <div className="text-center opacity-30">
                  <Microscope size={60} className="text-white mx-auto mb-2" />
                  <p className="text-white text-[11px] font-semibold uppercase tracking-wider">
                    {selectedOrder ? `PACS Diagnostic Station - ${selectedOrder.modality}` : 'No DICOM Image Loaded'}
                  </p>
                </div>
              </div>
            </div>

            {/* Diagnostic Report Editor */}
            <div className="bg-slate-900 p-5 border-t border-slate-800 relative z-10 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Radiologist Diagnostic Findings & Impression</label>
                <textarea 
                  value={findings}
                  onChange={e => setFindings(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-600 h-16 outline-none resize-none font-normal"
                  placeholder="Enter diagnostic findings, impression, and conclusion..."
                />
              </div>

              {/* Next Step Selector & Finalize Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mr-1 shrink-0">Forward to:</span>
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
                        'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0',
                        nextStep === opt.id
                          ? 'bg-white text-slate-900 font-semibold'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <button 
                  disabled={!selectedOrder || isSubmittingReport}
                  onClick={handleSaveReport}
                  className="bg-white hover:bg-slate-100 text-slate-900 px-4 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 active:scale-98"
                >
                  {isSubmittingReport ? <Loader2 className="animate-spin" size={13} /> : <CheckCircle2 size={13} />}
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
