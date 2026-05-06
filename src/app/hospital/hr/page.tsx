import { Users, Search, Filter, Plus, Calendar, Clock, UserCheck, Briefcase, Award, TrendingUp } from "lucide-react";
import clsx from "clsx";

const staffMembers = [
  { id: "EMP-001", name: "Dr. Sarah Jenkins", role: "Chief of Surgery", dept: "Clinical", status: "on-duty" },
  { id: "EMP-002", name: "Dr. Robert Jones", role: "Pediatrician", dept: "Clinical", status: "off-duty" },
  { id: "EMP-003", name: "Nurse Jane Doe", role: "Senior Nurse", dept: "IPD", status: "on-duty" },
  { id: "EMP-004", name: "John Smith", role: "Admin Officer", dept: "Reception", status: "on-duty" },
  { id: "EMP-005", name: "Nurse Peter Pan", role: "Staff Nurse", dept: "ER", status: "break" },
];

export default function HRDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">HR & Staffing</h1>
          <p className="text-slate-500 mt-1">Workforce Management & Personnel Directory.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Calendar size={16} />
            Duty Roster
          </button>
          <button className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-md flex items-center gap-2">
            <Plus size={16} />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* HR Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Staff</p>
          <p className="text-2xl font-black text-slate-900">342</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Currently On-Duty</p>
          <p className="text-2xl font-black text-slate-900">142</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">Pending Leave</p>
          <p className="text-2xl font-black text-slate-900">12</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-brand-500 uppercase tracking-wider mb-2">New Hires (Month)</p>
          <p className="text-2xl font-black text-slate-900">5</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Staff Directory */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Personnel Directory</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search by name or ID..." 
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
            
            <div className="overflow-hidden border border-slate-200 rounded-2xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Member</th>
                    <th className="px-6 py-3">Role & Dept</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffMembers.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{row.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{row.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-700 font-medium">{row.role}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{row.dept}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={clsx(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                          row.status === 'on-duty' ? "bg-emerald-500 text-white" : 
                          row.status === 'break' ? "bg-amber-500 text-white" : "bg-slate-400 text-white"
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

        {/* HR Quick Actions & Awards */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full" />
            <h2 className="text-lg font-bold mb-6">Staff Spotlight</h2>
            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center font-bold text-lg">
                JD
              </div>
              <div>
                <p className="font-bold text-slate-100">Nurse Jane Doe</p>
                <p className="text-xs text-brand-400">Excellence in Patient Care</p>
              </div>
              <Award className="text-amber-400 ml-auto" size={24} />
            </div>
            <button className="w-full mt-8 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-sm font-bold transition-all">
              View Monthly Recognition
            </button>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Staffing Analytics</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-emerald-500" size={18} />
                  <span className="text-sm font-bold text-slate-700">Attendance Rate</span>
                </div>
                <span className="font-black text-slate-900">98.5%</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Clock className="text-blue-500" size={18} />
                  <span className="text-sm font-bold text-slate-700">Avg. Overtime</span>
                </div>
                <span className="font-black text-slate-900">12.4h</span>
              </div>
            </div>
            <button className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
              Generate Payroll Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
