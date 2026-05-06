import { Activity, AlertTriangle, Clock, ActivitySquare, HeartPulse, Stethoscope, Search, Filter } from "lucide-react";
import Link from "next/link";

export default function EmergencyDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Emergency Department (ER)</h1>
          <p className="text-slate-500 mt-1">Live Triage and STAT Monitor.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Filter size={16} />
            Filter
          </button>
          <button className="bg-rose-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors shadow-md shadow-rose-500/20 flex items-center gap-2">
            <AlertTriangle size={16} />
            New Incoming Trauma
          </button>
        </div>
      </div>

      {/* STAT Monitor (Critical Resuscitations) */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-rose-600 mb-4 flex items-center gap-2">
          <Activity size={16} className="animate-pulse" />
          STAT Monitor / Resuscitation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active STAT 1 */}
          <div className="bg-rose-500 text-white rounded-xl p-6 shadow-xl shadow-rose-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
            <div className="relative z-10 flex justify-between items-start mb-6">
              <div>
                <span className="bg-rose-700/50 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">Bay 1 - Trauma</span>
                <h3 className="text-2xl font-black mt-3">Mutale Kapwepwe (M/42)</h3>
                <p className="text-rose-100 mt-1">Multiple Trauma - MVA</p>
              </div>
              <div className="text-right">
                <span className="text-rose-200 text-xs font-bold uppercase tracking-wider">Time in ER</span>
                <p className="text-xl font-bold font-mono mt-1">00:14:22</p>
              </div>
            </div>
            <div className="relative z-10 bg-rose-700/30 rounded-xl p-4 backdrop-blur-sm border border-rose-400/20 flex justify-between items-center">
              <div>
                <p className="text-xs text-rose-200 font-medium">Attending</p>
                <p className="font-bold">Dr. Sarah Jenkins</p>
              </div>
              <button className="bg-white text-rose-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-rose-50 transition-colors">
                View Chart
              </button>
            </div>
          </div>

          {/* Active STAT 2 */}
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
            <div className="relative z-10 flex justify-between items-start mb-6">
              <div>
                <span className="bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border border-rose-500/30">Bay 2 - Cardiac</span>
                <h3 className="text-2xl font-black mt-3">Unknown Patient (F/~60)</h3>
                <p className="text-slate-300 mt-1">Cardiac Arrest - Incoming ETA 2m</p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">ETA</span>
                <p className="text-xl font-bold font-mono text-rose-400 mt-1 animate-pulse">-02:00</p>
              </div>
            </div>
            <div className="relative z-10 bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm border border-slate-700/50 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400 font-medium">Team Alerted</p>
                <p className="font-bold text-slate-200">Trauma Team Alpha</p>
              </div>
              <button className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-rose-500 transition-colors">
                Prepare Bay
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Level Triage Board */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Active Triage Board</h2>
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search patients..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-xs uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Triage</th>
                  <th className="px-6 py-4">Patient Info</th>
                  <th className="px-6 py-4">Chief Complaint</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Wait Time</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Level 2: Orange (Emergent) */}
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-bold text-xs">
                      <div className="w-2 h-2 rounded-full bg-orange-500" /> Level 2 - Orange
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">Mwaba Musonda</p>
                    <p className="text-slate-500 text-xs">MRN: 948201 • M/55</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">Severe Chest Pain</td>
                  <td className="px-6 py-4 text-slate-600">Bed 4</td>
                  <td className="px-6 py-4">
                    <span className="text-orange-600 font-mono font-bold flex items-center gap-1.5">
                      <Clock size={14} /> 12m
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-brand-600 font-semibold hover:text-brand-700">View</button>
                  </td>
                </tr>

                {/* Level 3: Yellow (Urgent) */}
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-bold text-xs">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" /> Level 3 - Yellow
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">Luyando Hamubaba</p>
                    <p className="text-slate-500 text-xs">MRN: 112045 • F/28</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">Closed Fracture (Arm)</td>
                  <td className="px-6 py-4 text-slate-600">Waiting Room B</td>
                  <td className="px-6 py-4">
                    <span className="text-slate-600 font-mono font-medium flex items-center gap-1.5">
                      <Clock size={14} /> 45m
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-brand-600 font-semibold hover:text-brand-700">View</button>
                  </td>
                </tr>

                {/* Level 4: Green (Less Urgent) */}
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold text-xs">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" /> Level 4 - Green
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">Bupe Chanda</p>
                    <p className="text-slate-500 text-xs">MRN: 884920 • M/19</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">Minor Laceration</td>
                  <td className="px-6 py-4 text-slate-600">Waiting Room A</td>
                  <td className="px-6 py-4">
                    <span className="text-slate-600 font-mono font-medium flex items-center gap-1.5">
                      <Clock size={14} /> 1h 15m
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-brand-600 font-semibold hover:text-brand-700">View</button>
                  </td>
                </tr>

                {/* Level 5: Blue (Non-Urgent) */}
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold text-xs">
                      <div className="w-2 h-2 rounded-full bg-blue-500" /> Level 5 - Blue
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">Thandiwe Banda</p>
                    <p className="text-slate-500 text-xs">MRN: 339201 • F/34</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">Medication Refill</td>
                  <td className="px-6 py-4 text-slate-600">Waiting Room A</td>
                  <td className="px-6 py-4">
                    <span className="text-slate-600 font-mono font-medium flex items-center gap-1.5">
                      <Clock size={14} /> 2h 10m
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-brand-600 font-semibold hover:text-brand-700">View</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
