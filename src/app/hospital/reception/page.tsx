import { Users, Search, Plus, Calendar, Clock, UserPlus, FileText, CheckCircle2 } from "lucide-react";

export default function ReceptionDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Front Office / Reception</h1>
          <p className="text-slate-500 mt-1">Patient Registration & Appointment Management.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-brand-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-md flex items-center gap-2">
            <UserPlus size={16} />
            Register New Patient
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Patient Search & Recent Check-ins */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Patient Search & Check-in</h2>
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search by Patient Name, MRN, or National ID..." 
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Activity</h3>
              <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100/50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Patient</th>
                      <th className="px-6 py-3">Action</th>
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {[
                      { name: 'Kondwani Phiri', action: 'Appointment Check-in', time: '5m ago', status: 'In-Queue' },
                      { name: 'Natasha Zulu', action: 'New Registration', time: '15m ago', status: 'Completed' },
                      { name: 'Dalitso Lungu', action: 'Billing Inquiry', time: '1h ago', status: 'Resolved' },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-white transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{row.name}</td>
                        <td className="px-6 py-4 text-slate-600">{row.action}</td>
                        <td className="px-6 py-4 text-slate-400">{row.time}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
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
        </div>

        {/* Right: Quick Stats & Appointments */}
        <div className="space-y-8">
          <div className="bg-brand-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full" />
            <h2 className="text-lg font-bold mb-6">Reception Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-2xl font-black">42</p>
                <p className="text-[10px] uppercase font-bold text-white/60">Checked-in</p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-2xl font-black">12</p>
                <p className="text-[10px] uppercase font-bold text-white/60">New Reg</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-between">
              Upcoming Appointments
              <Calendar size={18} className="text-slate-300" />
            </h2>
            <div className="space-y-4">
              {[
                { name: 'Dr. Sarah Smith', count: 12, time: 'Next: 09:00 AM' },
                { name: 'Dr. Robert Jones', count: 8, time: 'Next: 10:30 AM' },
                { name: 'Dr. Emily Patel', count: 5, time: 'Next: 11:15 AM' },
              ].map((apt, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{apt.name}</p>
                    <p className="text-xs text-brand-600 font-medium">{apt.time}</p>
                  </div>
                  <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                    <span className="text-sm font-black text-slate-900">{apt.count}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
              View Full Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
