import { BarChart3, PieChart, TrendingUp, Download, Calendar, Filter, FileSpreadsheet, FilePieChart, Activity, Users, DollarSign } from "lucide-react";
import clsx from "clsx";

export default function ReportsDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Operational KPIs & Strategic Data Insights.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Calendar size={16} />
            Period: This Quarter
          </button>
          <button className="bg-brand-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-md flex items-center gap-2">
            <Download size={16} />
            Export Executive Summary
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Clinical Efficiency</h3>
          <div className="flex items-end gap-3 mb-6">
            <p className="text-4xl font-black text-slate-900">88.4%</p>
            <span className="text-emerald-500 font-bold text-sm mb-1">+2.4%</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Avg. Bed Turnaround</span>
              <span className="text-slate-900">45m</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-brand-500 h-full w-[88%]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Patient Satisfaction</h3>
          <div className="flex items-end gap-3 mb-6">
            <p className="text-4xl font-black text-slate-900">4.8</p>
            <span className="text-slate-400 font-bold text-sm mb-1">/ 5.0</span>
          </div>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Activity key={i} size={14} className={i <= 4 ? "text-emerald-500" : "text-slate-200"} fill={i <= 4 ? "currentColor" : "none"} />
            ))}
          </div>
          <p className="text-xs text-slate-500 font-medium">Based on 1,240 post-discharge surveys.</p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Readmission Rate</h3>
          <div className="flex items-end gap-3 mb-6">
            <p className="text-4xl font-black text-slate-900">3.2%</p>
            <span className="text-rose-500 font-bold text-sm mb-1">-0.8%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-rose-500 h-full w-[3.2%]" />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-3">Target threshold: 5.0%</p>
        </div>
      </div>

      {/* Analytics Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="text-brand-500" size={20} />
              Revenue vs Operations
            </h2>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-brand-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-200" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Admissions</span>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-slate-50 rounded-3xl border border-slate-200 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-x-8 bottom-8 top-16 flex items-end justify-between">
              {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                <div key={i} className="w-8 bg-brand-500 rounded-t-lg transition-all hover:bg-brand-600 cursor-pointer group relative" style={{ height: `${h}%` }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    ${h}k
                  </div>
                </div>
              ))}
            </div>
            <p className="text-slate-300 font-bold uppercase tracking-[0.2em] text-[10px] rotate-90 absolute right-4">Weekly Trend</p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl flex flex-col h-[400px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3" />
          <h2 className="text-lg font-bold mb-8 relative z-10 flex items-center gap-2">
            <PieChart className="text-brand-400" size={20} />
            Departmental Utilization
          </h2>
          <div className="flex-1 grid grid-cols-2 gap-6 relative z-10">
            <div className="space-y-6">
              {[
                { name: 'Emergency (ER)', val: 92, color: 'bg-rose-500' },
                { name: 'Inpatient (IPD)', val: 84, color: 'bg-blue-500' },
                { name: 'Outpatient (OPD)', val: 65, color: 'bg-emerald-500' },
                { name: 'Radiology (RIS)', val: 78, color: 'bg-amber-500' },
              ].map((dept, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                    <span>{dept.name}</span>
                    <span className="text-white">{dept.val}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className={clsx("h-full rounded-full transition-all duration-1000", dept.color)} style={{ width: `${dept.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800" />
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="251.2" strokeDashoffset="50.24" className="text-brand-500" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black">80%</span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Capacity</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Reports Export List */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Standard Reports Library</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Monthly Financial Audit', icon: FileSpreadsheet, type: 'XLSX / PDF' },
            { name: 'Patient Outcome Summary', icon: FilePieChart, type: 'PDF' },
            { name: 'Inventory Consumption', icon: FileSpreadsheet, type: 'CSV' },
            { name: 'Staff Performance Review', icon: Users, type: 'PDF' },
            { name: 'Insurance Claim Accuracy', icon: TrendingUp, type: 'PDF' },
            { name: 'Critical Incident Logs', icon: Activity, type: 'XLSX' },
          ].map((report, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 group hover:border-brand-500/50 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors">
                  <report.icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{report.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{report.type}</p>
                </div>
              </div>
              <button className="text-slate-300 group-hover:text-brand-500 transition-colors">
                <Download size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
