import { Calendar, Clock, MapPin, Plus, ArrowRight, CheckCircle2, ChevronRight, Video } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

const upcomingAppointments = [
  { id: 1, doctor: "Dr. Sarah Jenkins", specialty: "General Surgeon", date: "May 12, 2026", time: "10:30 AM", type: "In-Person", room: "Consultation Room 4", status: "confirmed" },
  { id: 2, doctor: "Dr. Robert Jones", specialty: "Pediatrician", date: "May 15, 2026", time: "02:00 PM", type: "Telehealth", status: "pending" },
];

const pastAppointments = [
  { id: 3, doctor: "Dr. Emily Patel", specialty: "Dermatologist", date: "April 28, 2026", result: "Follow-up required" },
  { id: 4, doctor: "Dr. Michael Brown", specialty: "Orthopedic", date: "April 15, 2026", result: "Recovery on track" },
];

export default function PatientAppointments() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Appointments</h1>
          <p className="text-slate-500 mt-1">Manage your visits and telehealth sessions.</p>
        </div>
        <button className="bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2">
          <Plus size={18} />
          Book New Appointment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Upcoming & Past Appointments */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Upcoming Section */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Clock size={16} />
              Upcoming Visits
            </h2>
            <div className="space-y-4">
              {upcomingAppointments.map((appt) => (
                <div key={appt.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-brand-500">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                        {appt.type === 'Telehealth' ? <Video size={28} /> : <Calendar size={28} />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{appt.doctor}</h3>
                        <p className="text-sm text-slate-500 font-medium">{appt.specialty}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-3">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                            <Calendar size={14} className="text-slate-400" />
                            {appt.date}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                            <Clock size={14} className="text-slate-400" />
                            {appt.time}
                          </span>
                          {appt.room && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                              <MapPin size={14} className="text-slate-400" />
                              {appt.room}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col justify-between items-end gap-2">
                      <span className={clsx(
                        "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                        appt.status === 'confirmed' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {appt.status}
                      </span>
                      <button className="text-slate-400 hover:text-brand-600 transition-colors p-2">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* History Section */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Visit History</h2>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Doctor</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Result/Notes</th>
                    <th className="px-6 py-4 text-right">Records</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastAppointments.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{row.doctor}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{row.date}</td>
                      <td className="px-6 py-4 text-slate-600">{row.result}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-brand-600 font-bold hover:underline text-xs">View Summary</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right: Quick Help & Instructions */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full" />
            <h2 className="text-lg font-bold mb-4">Need Help?</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              If you need to reschedule or cancel your appointment, please do so at least 24 hours in advance.
            </p>
            <div className="space-y-3">
              <button className="w-full bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl text-xs font-bold flex items-center justify-between transition-all group">
                Reschedule Guidelines
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-all" />
              </button>
              <button className="w-full bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl text-xs font-bold flex items-center justify-between transition-all group">
                Telehealth Setup Guide
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            </div>
          </div>

          <div className="bg-brand-50 rounded-2xl p-8 border border-brand-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center mb-6 shadow-lg shadow-brand-500/20">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Virtual Check-in</h3>
            <p className="text-sm text-slate-600 mt-2 mb-6">
              Save time at the hospital by checking in virtually 15 minutes before your visit.
            </p>
            <button className="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
              Learn How
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
