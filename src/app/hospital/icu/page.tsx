import { HeartPulse, Search, Filter, Plus, Activity, Zap, AlertCircle, Clock } from "lucide-react";
import clsx from "clsx";

const icuPatients = [
  { id: "ICU-01", name: "Mapalo Ngosa", age: 68, condition: "Critical", hr: 112, bp: "90/60", spo2: 91, alert: true },
  { id: "ICU-02", name: "Kunda Tembo", age: 29, condition: "Stable", hr: 84, bp: "120/80", spo2: 98, alert: false },
  { id: "ICU-03", name: "Mwaba Musonda", age: 45, condition: "Guarded", hr: 98, bp: "110/75", spo2: 94, alert: false },
];

export default function ICUDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Intensive Care (ICU)</h1>
          <p className="text-slate-500 mt-1">High-Acuity Monitoring & Life Support.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-rose-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors shadow-md flex items-center gap-2">
            <Zap size={16} />
            Emergency Resuscitation
          </button>
        </div>
      </div>

      {/* Monitor Wall View */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Patient Monitors</h2>
          <span className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Vitals Linked
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {icuPatients.map((p) => (
            <div key={p.id} className={clsx(
              "bg-slate-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden border-2 transition-all",
              p.alert ? "border-rose-500 animate-pulse-slow" : "border-slate-800"
            )}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="bg-slate-800 text-slate-400 text-[10px] font-black uppercase px-2 py-1 rounded-lg">Bed {p.id.split('-')[1]}</span>
                  <h3 className="text-xl font-black text-white mt-2">{p.name}</h3>
                </div>
                <div className={clsx(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                  p.condition === 'Critical' ? "bg-rose-500 text-white" : "bg-blue-500 text-white"
                )}>
                  {p.condition}
                </div>
              </div>

              {/* Vital Signs Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">HR</p>
                  <p className={clsx("text-xl font-black", p.hr > 100 ? "text-rose-400" : "text-emerald-400")}>{p.hr}</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">BP</p>
                  <p className="text-xl font-black text-blue-400">{p.bp}</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">SpO2</p>
                  <p className={clsx("text-xl font-black", p.spo2 < 92 ? "text-rose-400" : "text-emerald-400")}>{p.spo2}%</p>
                </div>
              </div>

              {/* Waveform Visualization Simulator */}
              <div className="h-16 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center relative overflow-hidden mb-6">
                <svg className="absolute inset-0 w-full h-full text-emerald-500/30" preserveAspectRatio="none" viewBox="0 0 100 20">
                  <path d="M0 10 Q 5 0, 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10" fill="none" stroke="currentColor" strokeWidth="1" />
                </svg>
                <div className="flex items-center gap-2 text-emerald-500 font-mono text-[10px] font-bold">
                  <Activity size={14} className="animate-pulse" />
                  ECG LIVE FEED
                </div>
              </div>

              <button className="w-full bg-white text-slate-900 py-3 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all">
                Full Vital History
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Ventilator & Equipment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="text-brand-500" size={20} />
            Life Support Systems
          </h2>
          <div className="space-y-4">
            {[
              { name: 'Ventilator V10', patient: 'Mapalo Ngosa', status: 'Active', mode: 'AC/VC' },
              { name: 'Dialysis Machine D02', patient: 'Kunda Tembo', status: 'Active', mode: 'CRRT' },
              { name: 'Infusion Pump P42', patient: 'Mwaba Musonda', status: 'Alarm', mode: 'Maintenance' },
            ].map((eq, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-sm font-bold text-slate-800">{eq.name}</p>
                  <p className="text-xs text-slate-500">{eq.patient} • {eq.mode}</p>
                </div>
                <span className={clsx(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                  eq.status === 'Active' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white animate-pulse"
                )}>
                  {eq.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-2xl rounded-full" />
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <AlertCircle className="text-amber-400" size={20} />
            Staffing Status (ICU)
          </h2>
          <div className="space-y-4 flex-1">
            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold">Intensivist on Duty</p>
                <p className="text-xs text-slate-400">Dr. Alan Grant</p>
              </div>
              <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-lg">
                <Clock size={16} />
              </div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold">Nurse-to-Patient Ratio</p>
                <p className="text-xs text-slate-400">Target: 1:1 • Current: 1:1</p>
              </div>
              <div className="bg-blue-500/20 text-blue-400 p-2 rounded-lg">
                <Users size={16} />
              </div>
            </div>
          </div>
          <button className="w-full mt-8 bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 transition-all">
            Request Additional Staff
          </button>
        </div>
      </div>
    </div>
  );
}

function Users({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
