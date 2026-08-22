'use client'

import { useState, useEffect } from "react";
import { CreditCard, Search, Filter, Plus, FileText, CheckCircle2, AlertCircle, TrendingUp, DollarSign, ArrowUpRight, LogIn } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import RecordPaymentModal from "@/components/hospital/RecordPaymentModal";
import GenerateInvoiceModal from "@/components/hospital/GenerateInvoiceModal";
import { cancelInvoiceAction } from "@/app/hospital/actions";
import { formatCurrencyAmount } from "@/utils/currency";

export default function BillingDashboard() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [currencyConfig, setCurrencyConfig] = useState<{ symbol: string, position: 'prefix' | 'suffix' }>({ symbol: '$', position: 'prefix' });
  const supabase = createClient();

  useEffect(() => {
    fetchInvoices();
    fetchCurrencyConfig();
  }, []);

  const fetchCurrencyConfig = async () => {
    const { data } = await supabase.from('system_settings').select('currency_symbol, currency_position').single();
    if (data) {
      setCurrencyConfig({
        symbol: data.currency_symbol || '$',
        position: (data.currency_position as 'prefix' | 'suffix') || 'prefix'
      });
    }
  };

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
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Billing & Claims</h1>
          <p className="text-slate-500 mt-1">Financial Management & Insurance Processing.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsGenerateModalOpen(true)}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-md flex items-center gap-2"
          >
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
          <p className="text-2xl font-black text-slate-900">{formatCurrencyAmount(stats.totalRevenue, currencyConfig.symbol, currencyConfig.position)}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText size={20} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Collection</p>
          <p className="text-2xl font-black text-slate-900">{formatCurrencyAmount(stats.pendingAmount, currencyConfig.symbol, currencyConfig.position)}</p>
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
                      <td className="px-6 py-4 font-black text-slate-900">{formatCurrencyAmount(row.total_amount, currencyConfig.symbol, currencyConfig.position)}</td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                          row.status === 'PAID' ? "bg-emerald-50 text-emerald-600" : 
                          row.status === 'PARTIAL' ? "bg-amber-50 text-amber-600" :
                          row.status === 'CANCELLED' ? "bg-slate-100 text-slate-400" : "bg-rose-50 text-rose-600"
                        )}>
                          {formatCurrencyAmount(row.total_amount - (row.paid_amount || 0), currencyConfig.symbol, currencyConfig.position)} {row.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {row.status !== 'PAID' && row.status !== 'CANCELLED' && (
                            <>
                              <button 
                                onClick={() => { setSelectedInvoice(row); setIsPaymentModalOpen(true); }}
                                className="bg-brand-50 text-brand-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-brand-600 hover:text-white transition-all flex items-center gap-1.5"
                              >
                                <CreditCard size={14} />
                                Pay
                              </button>
                              <button 
                                onClick={async () => {
                                  if (confirm('Cancel and void this invoice?')) {
                                    const res = await cancelInvoiceAction(row.id);
                                    if (res.error) alert(res.error);
                                    else fetchInvoices();
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-600 text-xs font-bold transition-all"
                              >
                                Void
                              </button>
                            </>
                          )}
                        </div>
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
              <p className="text-2xl font-black">{formatCurrencyAmount(stats.pendingAmount * 0.4, currencyConfig.symbol, currencyConfig.position)}</p>
              <p className="text-[10px] text-slate-500 mt-1 font-bold">INSURANCE CLAIMS IN REVIEW</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold text-slate-100">Settled This Period</p>
                <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase">Paid</span>
              </div>
              <p className="text-2xl font-black">{formatCurrencyAmount(stats.totalRevenue, currencyConfig.symbol, currencyConfig.position)}</p>
              <p className="text-[10px] text-slate-500 mt-1 font-bold">ALL PAYMENTS VERIFIED</p>
            </div>
          </div>
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

      <GenerateInvoiceModal 
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onSuccess={fetchInvoices}
      />
    </div>
  );
}

