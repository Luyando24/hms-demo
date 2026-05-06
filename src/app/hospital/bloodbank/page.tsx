import { Droplet, Search, Filter, Plus, Calendar, Clock, Activity, AlertCircle, Heart } from "lucide-react";
import clsx from "clsx";

const bloodStock = [
  { type: "O+", units: 142, status: "stable", trend: "+12" },
  { type: "A+", units: 85, status: "stable", trend: "-2" },
  { type: "B+", units: 42, status: "low", trend: "+5" },
  { type: "O-", units: 12, status: "critical", trend: "-3" },
  { type: "AB+", units: 28, status: "stable", trend: "+1" },
  { type: "A-", units: 18, status: "low", trend: "0" },
  { type: "B-", units: 15, status: "low", trend: "-1" },
  { type: "AB-", units: 5, status: "critical", trend: "0" },
];

export default function BloodBankDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Blood Bank</h1>
          <p className="text-slate-500 mt-1">Inventory Management & Donor Registry.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Activity size={16} />
            Compatibility Check
          </button>
          <button className="bg-rose-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors shadow-md flex items-center gap-2">
            <Plus size={16} />
            New Donation
          </button>
        </div>
      </div>

      {/* Blood Group Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Inventory Status</h2>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Real-time Units (450ml)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {bloodStock.map((stock) => (
            <div key={stock.type} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center flex flex-col items-center">
              <p className="text-xl font-black text-slate-900 mb-1">{stock.type}</p>
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                <Droplet size={20} className={clsx(
                  stock.status === 'critical' ? "text-rose-500" : 
                  stock.status === 'low' ? "text-amber-500" : "text-brand-500"
                )} fill="currentColor" />
              </div>
              <p className="text-lg font-black text-slate-900 leading-none">{stock.units}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1">Units</p>
              <div className={clsx(
                "mt-3 w-full h-1 rounded-full",
                stock.status === 'critical' ? "bg-rose-500" : 
                stock.status === 'low' ? "bg-amber-500" : "bg-emerald-500"
              )} />
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Donor Registry Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Recent Donors</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search donors..." 
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
            
            <div className="overflow-hidden border border-slate-200 rounded-2xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Donor Name</th>
                    <th className="px-6 py-3">Group</th>
                    <th className="px-6 py-3">Last Donation</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { name: 'Mapalo Ngosa', type: 'O+', date: '2026-05-01', status: 'Ready' },
                    { name: 'Natasha Zulu', type: 'AB-', date: '2026-03-15', status: 'Ineligible' },
                    { name: 'Kunda Tembo', type: 'A+', date: '2026-04-28', status: 'Ready' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{row.name}</td>
                      <td className="px-6 py-4 font-black text-brand-600">{row.type}</td>
                      <td className="px-6 py-4 text-slate-500">{row.date}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={clsx(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                          row.status === 'Ready' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
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

        {/* Expiry Alerts & Inventory Stats */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-2xl rounded-full" />
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <AlertCircle className="text-rose-400" size={20} />
              Expiry Alerts
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Platelets (O+)</p>
                <p className="text-sm font-bold text-rose-100 mt-1">Batch #4820 - 2 Units</p>
                <p className="text-xs text-rose-400 font-bold mt-2">Expires: 2h 45m</p>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Whole Blood (B+)</p>
                <p className="text-sm font-bold text-amber-100 mt-1">Batch #4815 - 5 Units</p>
                <p className="text-xs text-amber-400 font-bold mt-2">Expires: 12h 00m</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Heart size={32} fill="currentColor" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Blood Drives</h3>
            <p className="text-sm text-slate-500 mt-2">3 upcoming donation drives scheduled for this month.</p>
            <button className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
              Manage Campaigns
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
