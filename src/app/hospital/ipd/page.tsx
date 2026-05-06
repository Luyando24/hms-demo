import { BedDouble, Search, Filter, Plus, Users, ClipboardList, Info, AlertCircle, RefreshCw } from "lucide-react";
import clsx from "clsx";

const bedStatusStyles = {
  vacant: "bg-emerald-50 text-emerald-700 border-emerald-100",
  occupied: "bg-blue-50 text-blue-700 border-blue-100",
  cleaning: "bg-amber-50 text-amber-700 border-amber-100",
  maintenance: "bg-slate-100 text-slate-500 border-slate-200",
};

const beds = [
  { id: "101", status: "occupied", patient: "Mwaba Musonda", sex: "M", age: 55, admissionDate: "2026-05-01" },
  { id: "102", status: "vacant" },
  { id: "103", status: "occupied", patient: "Chipo Mumba", sex: "F", age: 34, admissionDate: "2026-05-03" },
  { id: "104", status: "cleaning" },
  { id: "105", status: "occupied", patient: "Mapalo Ngosa", sex: "M", age: 68, admissionDate: "2026-04-28" },
  { id: "106", status: "vacant" },
  { id: "107", status: "occupied", patient: "Natasha Zulu", sex: "F", age: 42, admissionDate: "2026-05-04" },
  { id: "108", status: "occupied", patient: "Kunda Tembo", sex: "M", age: 29, admissionDate: "2026-05-02" },
  { id: "109", status: "maintenance" },
  { id: "110", status: "vacant" },
  { id: "111", status: "occupied", patient: "Bupe Chanda", sex: "F", age: 31, admissionDate: "2026-05-05" },
  { id: "112", status: "cleaning" },
];

export default function InpatientDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Inpatient Department (IPD)</h1>
          <p className="text-slate-500 mt-1">Real-time Bed Tracking & Ward Management.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Filter size={16} />
            Ward: General A
          </button>
          <button className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-md flex items-center gap-2">
            <Plus size={16} />
            New Admission
          </button>
        </div>
      </div>

      {/* Ward Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Beds</p>
            <BedDouble size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900">48</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Occupied</p>
            <div className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">32</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Vacant</p>
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">12</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Cleaning/Maint</p>
            <div className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">4</p>
        </div>
      </div>

      {/* Bed Tracking Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Bed Occupancy Monitor</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Find bed or patient..." 
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {beds.map((bed) => (
            <div 
              key={bed.id} 
              className={clsx(
                "card-rounded border-2 p-6 transition-all duration-200 hover:shadow-lg relative overflow-hidden group",
                bedStatusStyles[bed.status as keyof typeof bedStatusStyles]
              )}
            >
              {/* Bed ID */}
              <div className="flex justify-between items-start mb-4">
                <span className="text-2xl font-black tracking-tight">{bed.id}</span>
                <span className={clsx(
                  "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                  bed.status === 'occupied' ? "bg-blue-600 text-white border-blue-600" : 
                  bed.status === 'vacant' ? "bg-emerald-600 text-white border-emerald-600" :
                  bed.status === 'cleaning' ? "bg-amber-600 text-white border-amber-600" :
                  "bg-slate-500 text-white border-slate-500"
                )}>
                  {bed.status}
                </span>
              </div>

              {/* Patient Info or Status Action */}
              {bed.status === 'occupied' ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900 truncate">{bed.patient}</p>
                    <p className="text-[11px] font-medium text-slate-500 opacity-80 uppercase tracking-wider">
                      {bed.sex}/{bed.age}Y • Adm: {bed.admissionDate}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-white border border-slate-200 text-slate-700 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5">
                      <ClipboardList size={14} />
                      Nurse Sheet
                    </button>
                    <button className="w-10 h-10 bg-white border border-slate-200 text-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-colors">
                      <Info size={16} />
                    </button>
                  </div>
                </div>
              ) : bed.status === 'vacant' ? (
                <div className="pt-2">
                  <p className="text-sm text-emerald-600 font-medium mb-4">Ready for admission</p>
                  <button className="w-full bg-emerald-600 text-white py-3 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-500/20">
                    Admit Patient
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <p className="text-sm text-slate-500 font-medium mb-4">
                    {bed.status === 'cleaning' ? 'Sanitization in progress...' : 'Scheduled maintenance'}
                  </p>
                  <button className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                    <RefreshCw size={14} className={clsx(bed.status === 'cleaning' && "animate-spin")} />
                    Update Status
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Nurse Activity / Alerts (Side Section) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Recent Ward Activity</h2>
          <div className="space-y-6">
            {[
              { type: 'med', time: '10 mins ago', desc: 'Medication administered to Mwaba Musonda (Bed 101)', user: 'Nurse Jane' },
              { type: 'vitals', time: '25 mins ago', desc: 'Vitals updated for Natasha Zulu (Bed 107)', user: 'Nurse Peter' },
              { type: 'status', time: '1 hour ago', desc: 'Bed 104 marked as cleaning', user: 'System' },
            ].map((activity, idx) => (
              <div key={idx} className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{activity.desc}</p>
                  <p className="text-xs text-slate-400 mt-1">{activity.time} • {activity.user}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full" />
          <h2 className="text-lg font-bold mb-6">Critical Alerts</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-rose-500/20 border border-rose-500/30 p-4 rounded-2xl">
              <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-bold text-rose-50">Bed 105: Mapalo Ngosa</p>
                <p className="text-xs text-rose-300 mt-1">Temp: 39.5°C • Alerted: 5m ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
              <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-bold text-amber-50">Bed 108: Medication Overdue</p>
                <p className="text-xs text-amber-300 mt-1">Dose: 16:00 • Scheduled: 2h ago</p>
              </div>
            </div>
          </div>
          <button className="w-full mt-8 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-sm font-bold transition-all">
            View All Alerts
          </button>
        </div>
      </div>
    </div>
  );
}
