import { Users, Activity, BedDouble, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import Link from "next/link";

export default function HospitalDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Hospital Overview</h1>
          <p className="text-slate-500 mt-1 font-medium">Live metrics and operational status for HMSdemo Hospital.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live System Status
          </span>
          <span className="text-sm text-slate-400 font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Activity size={24} strokeWidth={2.5} />
            </div>
            <span className="flex items-center text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md">
              <ArrowUpRight size={14} className="mr-1" /> 12%
            </span>
          </div>
          <h3 className="text-slate-500 font-semibold text-sm mb-1 uppercase tracking-wider">Active ER Cases</h3>
          <p className="text-3xl font-black text-slate-900">24</p>
          <p className="text-xs text-rose-600 font-medium mt-2 flex items-center gap-1">
            <AlertCircle size={14} /> 5 Critical Level 1
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BedDouble size={24} strokeWidth={2.5} />
            </div>
            <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
              <ArrowDownRight size={14} className="mr-1" /> 3%
            </span>
          </div>
          <h3 className="text-slate-500 font-semibold text-sm mb-1 uppercase tracking-wider">IPD Occupancy</h3>
          <p className="text-3xl font-black text-slate-900">82%</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 mb-1 overflow-hidden">
            <div className="bg-blue-500 h-1.5 rounded-full w-[82%]" />
          </div>
          <p className="text-xs text-slate-400 font-medium">14 beds available</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-brand-600 flex items-center justify-center">
              <TrendingUp size={24} strokeWidth={2.5} />
            </div>
            <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
              <ArrowUpRight size={14} className="mr-1" /> 8%
            </span>
          </div>
          <h3 className="text-slate-500 font-semibold text-sm mb-1 uppercase tracking-wider">Today's Revenue</h3>
          <p className="text-3xl font-black text-slate-900">$42.5k</p>
          <p className="text-xs text-brand-600 font-medium mt-2">+ $3.2k from yesterday</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              Live
            </span>
          </div>
          <h3 className="text-slate-500 font-semibold text-sm mb-1 uppercase tracking-wider">Staff on Duty</h3>
          <p className="text-3xl font-black text-slate-900">142</p>
          <p className="text-xs text-slate-400 font-medium mt-2">45 Doctors • 97 Nurses</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Placeholder Chart Area */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Patient Admissions (Weekly)</h2>
            <select className="bg-slate-50 border border-slate-200 text-sm font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-700">
              <option>Last 7 Days</option>
              <option>This Month</option>
            </select>
          </div>
          <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Chart visualization will render here</p>
            </div>
          </div>
        </div>

        {/* Recent Alerts / Admissions List */}
        <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3" />
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h2 className="text-lg font-bold">Critical Alerts</h2>
            <span className="bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-md">3 New</span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto relative z-10 pr-2">
            {[
              { title: "Code Blue - ER Ward B", time: "2 mins ago", level: "critical" },
              { title: "Low O2 Stock - ICU", time: "15 mins ago", level: "warning" },
              { title: "VIP Patient Admission", time: "1 hour ago", level: "info" },
              { title: "Network Maintenance", time: "2 hours ago", level: "info" },
            ].map((alert, idx) => (
              <div key={idx} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-4 rounded-xl flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  alert.level === 'critical' ? 'bg-rose-500' : 
                  alert.level === 'warning' ? 'bg-amber-500' : 'bg-blue-400'
                }`} />
                <div>
                  <p className="font-semibold text-sm text-slate-100 leading-snug">{alert.title}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Clock size={12} /> {alert.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold py-3 rounded-xl transition-colors relative z-10">
            View All Logs
          </button>
        </div>
      </div>
    </div>
  );
}
