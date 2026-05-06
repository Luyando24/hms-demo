import { Pill, Search, Filter, RefreshCw, Clock, Calendar, CheckCircle2, AlertCircle, Info, ArrowRight } from "lucide-react";
import clsx from "clsx";

const activePrescriptions = [
  { id: "RX-402", name: "Amoxicillin 500mg", instructions: "1 capsule 3 times daily", duration: "7 Days", doctor: "Dr. Sarah Jenkins", status: "active", refills: 0 },
  { id: "RX-385", name: "Ibuprofen 400mg", instructions: "1 tablet every 6 hours as needed for pain", duration: "As needed", doctor: "Dr. Michael Brown", status: "active", refills: 2 },
  { id: "RX-210", name: "Lisinopril 10mg", instructions: "1 tablet daily in the morning", duration: "90 Days", doctor: "Dr. Emily Patel", status: "needs-refill", refills: 0 },
];

export default function PatientPrescriptions() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Prescriptions</h1>
          <p className="text-slate-500 mt-1">Track your active medications and refill history.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-brand-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-md flex items-center gap-2">
            <RefreshCw size={16} />
            Request Refills
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Active Medications */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Current Medications</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search medications..." 
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div className="space-y-4">
            {activePrescriptions.map((rx) => (
              <div key={rx.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4">
                    <div className={clsx(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                      rx.status === 'needs-refill' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      <Pill size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{rx.name}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">RX ID: {rx.id} • Prescribed by {rx.doctor}</p>
                    </div>
                  </div>
                  <span className={clsx(
                    "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                    rx.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {rx.status === 'active' ? 'Active' : 'Needs Refill'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Info size={12} />
                      Instructions
                    </p>
                    <p className="text-sm font-bold text-slate-700">{rx.instructions}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar size={12} />
                        Duration
                      </p>
                      <p className="text-sm font-bold text-slate-700">{rx.duration}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <RefreshCw size={12} />
                        Refills
                      </p>
                      <p className="text-sm font-bold text-slate-700">{rx.refills} Remaining</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Pharmacy & Reminders */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-2xl rounded-full" />
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Clock className="text-amber-400" size={20} />
              Refill Reminders
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <p className="text-sm font-bold text-slate-100">Lisinopril 10mg</p>
                <p className="text-xs text-slate-400 mt-1">Prescription expires in 5 days.</p>
                <button className="mt-4 text-brand-400 text-xs font-bold flex items-center gap-2 hover:text-brand-300 transition-colors">
                  Request Refill
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Preferred Pharmacy</h2>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-6">
              <p className="text-sm font-bold text-slate-800">Marybegg Pharmacy Main</p>
              <p className="text-xs text-slate-500 mt-1">123 Hospital Way, Lusaka</p>
              <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                Open until 09:00 PM
              </p>
            </div>
            <button className="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
              Change Pharmacy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
