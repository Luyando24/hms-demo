import { FileText, Search, Filter, Download, ExternalLink, Calendar, CheckCircle2, FlaskConical, Microscope, Activity } from "lucide-react";
import clsx from "clsx";

const records = [
  { id: "REC-201", title: "Full Blood Count (FBC)", date: "May 02, 2026", type: "Laboratory", status: "Available", icon: FlaskConical },
  { id: "REC-198", title: "Chest X-Ray Report", date: "April 28, 2026", type: "Radiology", status: "Available", icon: Microscope },
  { id: "REC-185", title: "General Consultation Summary", date: "April 15, 2026", type: "Clinical", status: "Available", icon: Activity },
  { id: "REC-154", title: "Lipid Profile", date: "March 10, 2026", type: "Laboratory", status: "Available", icon: FlaskConical },
];

export default function PatientRecords() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Medical Records</h1>
          <p className="text-slate-500 mt-1">Access your clinical history, reports, and results.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Download size={16} />
            Download All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left: Filters & Categories */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Categories</h2>
            <nav className="space-y-1">
              {[
                { name: 'All Records', count: 24, active: true },
                { name: 'Lab Results', count: 12 },
                { name: 'Radiology', count: 5 },
                { name: 'Consultations', count: 7 },
                { name: 'Immunizations', count: 3 },
              ].map((cat) => (
                <button 
                  key={cat.name}
                  className={clsx(
                    "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                    cat.active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {cat.name}
                  <span className={clsx(
                    "text-[10px] font-black px-1.5 py-0.5 rounded-md",
                    cat.active ? "bg-brand-200/50" : "bg-slate-100 text-slate-400"
                  )}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="bg-emerald-600 rounded-xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full" />
            <h3 className="text-lg font-bold mb-4">Request Records</h3>
            <p className="text-emerald-100 text-sm leading-relaxed mb-6">
              Need certified copies for insurance or travel?
            </p>
            <button className="w-full bg-white text-emerald-600 py-3 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all">
              Start Request
            </button>
          </div>
        </div>

        {/* Right: Records List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search reports or dates..." 
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <button className="bg-white border border-slate-200 text-slate-700 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
              <Filter size={18} />
            </button>
          </div>

          <div className="space-y-4">
            {records.map((rec) => (
              <div key={rec.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group flex items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                    <rec.icon size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{rec.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {rec.date}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>{rec.type}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="hidden md:flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    <CheckCircle2 size={12} />
                    {rec.status}
                  </span>
                  <div className="flex gap-2">
                    <button className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-all" title="View">
                      <ExternalLink size={18} />
                    </button>
                    <button className="p-2.5 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-all" title="Download">
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center py-8">
            <button className="text-slate-400 font-bold hover:text-brand-600 transition-colors flex items-center gap-2 mx-auto">
              Load Older Records
              <Calendar size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
