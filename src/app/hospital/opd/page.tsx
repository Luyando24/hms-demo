import { Search, Filter, Plus, Calendar, Clock, User, CheckCircle2, MoreVertical, Stethoscope } from "lucide-react";
import clsx from "clsx";


const opdQueue = [
  { id: "OPD-001", patient: "Alice Mumba", sex: "F", age: 45, time: "09:00 AM", doctor: "Dr. Smith", status: "completed" },
  { id: "OPD-002", patient: "Bob Chanda", sex: "M", age: 36, time: "09:30 AM", doctor: "Dr. Jones", status: "in-consultation" },
  { id: "OPD-003", patient: "Charlie Musonda", sex: "M", age: 12, time: "10:00 AM", doctor: "Dr. Smith", status: "waiting" },
  { id: "OPD-004", patient: "Diana Banda", sex: "F", age: 29, time: "10:15 AM", doctor: "Dr. Patel", status: "waiting" },
  { id: "OPD-005", patient: "Elvis Lungu", sex: "M", age: 62, time: "10:45 AM", doctor: "Dr. Jones", status: "waiting" },
];

export default function OutpatientDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Outpatient Department (OPD)</h1>
          <p className="text-slate-500 mt-1">Daily Consultation Queue & Patient Flow.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Calendar size={16} />
            Today: May 05
          </button>
          <button className="bg-brand-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-md flex items-center gap-2">
            <Plus size={16} />
            Register Patient
          </button>
        </div>
      </div>

      {/* OPD Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Registered</p>
          <p className="text-2xl font-black text-slate-900">124</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">In Consultation</p>
          <p className="text-2xl font-black text-slate-900">8</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Waiting</p>
          <p className="text-2xl font-black text-slate-900">42</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Completed</p>
          <p className="text-2xl font-black text-slate-900">74</p>
        </div>
      </div>

      {/* Main Queue Table */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Patient Queue</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search patient or ID..." 
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <button className="bg-white border border-slate-200 text-slate-700 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Doctor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {opdQueue.map((patient) => (
                <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-400 text-xs">{patient.id}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{patient.patient}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-medium">{patient.sex}/{patient.age}Y</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Clock size={14} className="text-slate-400" />
                      {patient.time}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{patient.doctor}</td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      patient.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                      patient.status === 'in-consultation' ? "bg-blue-50 text-blue-600" :
                      "bg-amber-50 text-amber-600"
                    )}>
                      {patient.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Doctors Availability & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Doctor Availability</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Dr. Sarah Smith', spec: 'General Physician', status: 'Available', room: 'Consultation Room 1' },
              { name: 'Dr. Robert Jones', spec: 'Pediatrician', status: 'Busy', room: 'Consultation Room 3' },
              { name: 'Dr. Emily Patel', spec: 'Dermatologist', status: 'Available', room: 'Consultation Room 2' },
              { name: 'Dr. Michael Brown', spec: 'Orthopedic', status: 'On Break', room: 'Consultation Room 4' },
            ].map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                    <Stethoscope size={20} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{doc.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{doc.spec}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={clsx(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                    doc.status === 'Available' ? "bg-emerald-500 text-white" :
                    doc.status === 'Busy' ? "bg-blue-500 text-white" : "bg-slate-400 text-white"
                  )}>
                    {doc.status}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">{doc.room}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-brand-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full" />
          <h2 className="text-lg font-bold mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl text-sm font-bold flex items-center justify-between transition-all group">
              New Appointment
              <CheckCircle2 size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button className="w-full bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl text-sm font-bold flex items-center justify-between transition-all group">
              Manage Queue
              <CheckCircle2 size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button className="w-full bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl text-sm font-bold flex items-center justify-between transition-all group">
              View Schedule
              <CheckCircle2 size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
