'use client'

import { useState, useEffect } from "react";
import { CreditCard, Search, Filter, Plus, FileText, CheckCircle2, AlertCircle, TrendingUp, DollarSign, ArrowUpRight, LogIn } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import RecordPaymentModal from "@/components/hospital/RecordPaymentModal";

export default function BillingDashboard() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*, patients(*)')
      .order('created_at', { ascending: false });
    
    if (data) setInvoices(data);
    setLoading(false);
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.patients?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.patients?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.id.includes(searchQuery)
  );

  const stats = {
    totalRevenue: invoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0),
    pendingAmount: invoices.reduce((acc, inv) => acc + (inv.total_amount - (inv.paid_amount || 0)), 0),
    overdueCount: invoices.filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE').length,
    collectionRate: invoices.length > 0 ? (invoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0) / invoices.reduce((acc, inv) => acc + inv.total_amount, 0) * 100).toFixed(1) : "0.0"
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Billing & Claims</h1>
          <p className="text-slate-500 mt-1">Financial Management & Insurance Processing.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <TrendingUp size={16} />
            Revenue Report
          </button>
          <button className="bg-brand-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-md flex items-center gap-2">
            <Plus size={16} />
            Generate Invoice
          </button>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
            <span className="flex items-center text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
              <ArrowUpRight size={12} className="mr-1" /> Live
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Revenue</p>
          <p className="text-2xl font-black text-slate-900">${stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText size={20} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Collection</p>
          <p className="text-2xl font-black text-slate-900">${stats.pendingAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unpaid Invoices</p>
          <p className="text-2xl font-black text-slate-900">{stats.overdueCount}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Collection Rate</p>
          <p className="text-2xl font-black text-slate-900">{stats.collectionRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Invoices Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Recent Invoices</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Search patient or ID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>
            </div>
            
            <div className="overflow-hidden border border-slate-200 rounded-2xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Patient</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Balance</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Loading invoices...</td></tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No invoices found.</td></tr>
                  ) : filteredInvoices.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{row.patients?.first_name} {row.patients?.last_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {row.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900">${row.total_amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                          row.status === 'PAID' ? "bg-emerald-50 text-emerald-600" : 
                          row.status === 'PARTIAL' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                        )}>
                          ${(row.total_amount - (row.paid_amount || 0)).toLocaleString()} {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {row.status !== 'PAID' && (
                          <button 
                            onClick={() => { setSelectedInvoice(row); setIsPaymentModalOpen(true); }}
                            className="bg-brand-50 text-brand-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-brand-600 hover:text-white transition-all flex items-center gap-1.5 ml-auto"
                          >
                            <CreditCard size={14} />
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Claims Status Summary */}
        <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full" />
          <h2 className="text-lg font-bold mb-6 relative z-10">Insurance Insights</h2>
          
          <div className="space-y-4 flex-1 relative z-10">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold text-slate-100">Pending Approvals</p>
                <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded uppercase">In Review</span>
              </div>
              <p className="text-2xl font-black">$4,200</p>
              <p className="text-[10px] text-slate-500 mt-1 font-bold">12 CLAIMS ACROSS 3 PROVIDERS</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold text-slate-100">Settled This Week</p>
                <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase">Paid</span>
              </div>
              <p className="text-2xl font-black">$18,450</p>
              <p className="text-[10px] text-slate-500 mt-1 font-bold">ALL PAYMENTS VERIFIED</p>
            </div>
          </div>

          <button className="w-full mt-8 bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 transition-all relative z-10">
            Submit New Claim Batch
          </button>
        </div>
      </div>

      {selectedInvoice && (
        <RecordPaymentModal 
          isOpen={isPaymentModalOpen} 
          onClose={() => { setIsPaymentModalOpen(false); setSelectedInvoice(null); }} 
          invoice={selectedInvoice}
          onSuccess={fetchInvoices}
        />
      )}
    </div>
  );
}
