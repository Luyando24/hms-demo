import { CreditCard, DollarSign, Download, Filter, Search, Plus, Calendar, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import clsx from "clsx";

const transactions = [
  { id: "TX-9021", description: "General Consultation Fee", date: "May 02, 2026", amount: 150.00, status: "paid" },
  { id: "TX-8842", description: "Blood Test Panel (FBC, Lipid)", date: "May 02, 2026", amount: 245.50, status: "pending" },
  { id: "TX-7740", description: "Pharmacy: Amoxicillin", date: "April 28, 2026", amount: 45.00, status: "paid" },
  { id: "TX-6621", description: "Annual Health Screening", date: "April 15, 2026", amount: 500.00, status: "paid" },
];

export default function PatientBilling() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Billing & Payments</h1>
          <p className="text-slate-500 mt-1">Manage your health account, insurance, and payments.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2">
            <Plus size={18} />
            Make a Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Statements & Transactions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50 rounded-full -translate-y-1/2 translate-x-1/2" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Account Balance</p>
              <p className="text-4xl font-black text-slate-900 mb-6">$245.50</p>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg w-fit">
                <AlertCircle size={14} />
                Payment Pending
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Total Paid (YTD)</p>
              <p className="text-4xl font-black text-slate-900 mb-6">$1,240.00</p>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg w-fit">
                <CheckCircle2 size={14} />
                Account in Good Standing
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-slate-900">Recent Transactions</h2>
              <div className="flex gap-2">
                <button className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all">
                  <Download size={18} />
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 group hover:border-brand-500/50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{tx.description}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tx.date} • {tx.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">${tx.amount.toFixed(2)}</p>
                    <span className={clsx(
                      "text-[9px] font-black uppercase tracking-widest",
                      tx.status === 'paid' ? "text-emerald-500" : "text-amber-500"
                    )}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Insurance & Quick Help */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full" />
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <ShieldCheck className="text-brand-400" size={20} />
              Insurance Details
            </h2>
            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 mb-6">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Provider</p>
              <p className="text-sm font-bold text-slate-100">National Health Trust</p>
              <div className="h-px bg-slate-700 my-4" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Policy Number</p>
              <p className="text-sm font-bold text-slate-100 font-mono">NHT-8402-991</p>
            </div>
            <button className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
              Update Coverage
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="bg-brand-50 rounded-2xl p-8 border border-brand-100 shadow-sm text-center">
            <div className="w-16 h-16 rounded-3xl bg-brand-500 text-white flex items-center justify-center mx-auto mb-4">
              <DollarSign size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Auto-Pay</h3>
            <p className="text-sm text-slate-600 mt-2">Enable auto-pay for seamless, hassle-free payments.</p>
            <button className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
              Setup Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
