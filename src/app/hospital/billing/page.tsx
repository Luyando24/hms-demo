import { CreditCard, Search, Filter, Plus, FileText, CheckCircle2, AlertCircle, TrendingUp, DollarSign, ArrowUpRight } from "lucide-react";
import clsx from "clsx";

const invoices = [
  { id: "INV-1001", patient: "Mwaba Musonda", amount: 1250.00, status: "paid", insurance: "National Health", date: "2026-05-05" },
  { id: "INV-1002", patient: "Luyando Hamubaba", amount: 450.50, status: "pending", insurance: "Self-Pay", date: "2026-05-05" },
  { id: "INV-1003", patient: "Mapalo Ngosa", amount: 2800.00, status: "overdue", insurance: "Private Plus", date: "2026-04-20" },
  { id: "INV-1004", patient: "Bupe Chanda", amount: 120.00, status: "paid", insurance: "Self-Pay", date: "2026-05-04" },
];

export default function BillingDashboard() {
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
              <ArrowUpRight size={12} className="mr-1" /> 8.4%
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today's Revenue</p>
          <p className="text-2xl font-black text-slate-900">$12,840</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText size={20} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Claims</p>
          <p className="text-2xl font-black text-slate-900">42</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Overdue Invoices</p>
          <p className="text-2xl font-black text-slate-900">15</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Collection Rate</p>
          <p className="text-2xl font-black text-slate-900">94.2%</p>
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
                    placeholder="Search invoices..." 
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
                    <th className="px-6 py-3">Insurance</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{row.patient}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{row.id}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{row.insurance}</td>
                      <td className="px-6 py-4 font-black text-slate-900">${row.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={clsx(
                          "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                          row.status === 'paid' ? "bg-emerald-50 text-emerald-600" : 
                          row.status === 'pending' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Insurance Claims Status */}
        <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full" />
          <h2 className="text-lg font-bold mb-6 relative z-10">Claims Hub</h2>
          
          <div className="space-y-4 flex-1 relative z-10">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold text-slate-100">National Health Trust</p>
                <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded uppercase">Batch A42</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                <span>Processing Progress</span>
                <span>75%</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-brand-500 h-full w-[75%]" />
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold text-slate-100">Private Plus Insurance</p>
                <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase">Batch B12</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                <span>Verified & Ready</span>
                <span>100%</span>
              </div>
              <div className="w-full bg-emerald-500/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-full" />
              </div>
            </div>
          </div>

          <button className="w-full mt-8 bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 transition-all relative z-10">
            Review Rejections (3)
          </button>
        </div>
      </div>
    </div>
  );
}
