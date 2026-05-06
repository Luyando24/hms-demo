import { CalendarDays, FileText, Pill, CreditCard, ArrowRight, Heart, Activity, Thermometer, Droplet, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

export default function PatientPortalOverview() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-slate-900 rounded-2xl p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-brand-500/30 transition-all duration-700" />
        <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-brand-500/20 text-brand-400 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-brand-500/30">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
              Patient Health Portal
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-3">Hello, Mwansa Chanda</h1>
            <p className="text-slate-400 text-lg max-w-lg leading-relaxed">
              Your health journey is looking great. You have <span className="text-white font-bold underline decoration-brand-500 underline-offset-4">1 appointment</span> and <span className="text-white font-bold underline decoration-emerald-500 underline-offset-4">2 new lab results</span> to review.
            </p>
          </div>
          
          <div className="flex gap-3 shrink-0">
            <Link 
              href="/patient/portal/appointments"
              className="bg-brand-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2 group/btn"
            >
              Book Visit
              <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Health Vitals Quick View */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Your Latest Vitals (May 02)</h2>
          <button className="text-xs font-bold text-brand-600 hover:underline">View Trends</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Heart Rate', val: '72', unit: 'bpm', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
            { label: 'Blood Pressure', val: '120/80', unit: 'mmHg', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Temperature', val: '36.6', unit: '°C', icon: Thermometer, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'SpO2', val: '98', unit: '%', icon: Droplet, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          ].map((vital) => (
            <div key={vital.label} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group">
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-4", vital.bg, vital.color)}>
                <vital.icon size={20} />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{vital.label}</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-black text-slate-900 tracking-tight">{vital.val}</p>
                <p className="text-xs font-bold text-slate-400">{vital.unit}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Feed: Activities & Results */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Upcoming Appointment Card */}
          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-8 relative overflow-hidden group hover:shadow-lg transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
              <div className="flex gap-5">
                <div className="w-16 h-16 rounded-3xl bg-white text-brand-600 flex items-center justify-center shadow-sm">
                  <CalendarDays size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Next Visit: Dr. Sarah Jenkins</h3>
                  <p className="text-slate-600 font-medium mt-1">General Surgery • Consultation Room 4</p>
                  <div className="flex gap-4 mt-4">
                    <span className="text-xs font-black text-brand-700 bg-brand-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">Mon, May 12</span>
                    <span className="text-xs font-black text-brand-700 bg-brand-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">10:30 AM</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-between items-end">
                <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">Confirmed</span>
                <button className="text-brand-600 font-bold text-sm flex items-center gap-1.5 group/link">
                  Prepare for Visit
                  <ChevronRight size={16} className="group-hover/link:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Recent Records Grid */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Recent Health Records</h2>
              <Link href="/patient/portal/records" className="text-xs font-bold text-brand-600 hover:underline">See All Records</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: 'Full Blood Count', date: 'May 02, 2026', type: 'Lab Result', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50' },
                { title: 'Chest X-Ray Report', date: 'April 28, 2026', type: 'Radiology', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center", item.bg, item.color)}>
                      <item.icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{item.title}</h4>
                      <p className="text-xs text-slate-400 font-medium mt-1">{item.type} • {item.date}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-600 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar: Wellness & Meds */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Active Meds Card */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-between">
              Medications
              <Pill className="text-slate-200" size={24} />
            </h2>
            <div className="space-y-4 mb-8">
              {[
                { name: 'Amoxicillin 500mg', instructions: '1 capsule • 3x daily' },
                { name: 'Ibuprofen 400mg', instructions: '1 tablet • As needed' },
              ].map((med, i) => (
                <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-500 shrink-0 shadow-sm">
                    <Pill size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{med.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{med.instructions}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link 
              href="/patient/portal/prescriptions"
              className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              Manage Prescriptions
            </Link>
          </div>

          {/* Billing Summary */}
          <div className="bg-emerald-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full" />
            <h2 className="text-lg font-bold mb-2">Account Balance</h2>
            <p className="text-emerald-100 text-sm mb-6">Last payment made May 01</p>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-lg font-bold opacity-80">$</span>
              <p className="text-5xl font-black">245.50</p>
            </div>
            <Link 
              href="/patient/portal/billing"
              className="w-full bg-white text-emerald-600 py-3.5 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
            >
              <CreditCard size={18} />
              Pay Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
