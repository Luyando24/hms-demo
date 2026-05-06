import { TestTube2, Search, Filter, Plus, Clock, FileText, CheckCircle2, AlertTriangle, FlaskConical, Beaker } from "lucide-react";
import clsx from "clsx";

const labOrders = [
  { id: "LAB-501", patient: "Mwaba Musonda", test: "Full Blood Count (FBC)", status: "pending", priority: "high", received: "10m ago" },
  { id: "LAB-502", patient: "Luyando Hamubaba", test: "Lipid Profile", status: "completed", priority: "normal", received: "2h ago" },
  { id: "LAB-503", patient: "Dalitso Lungu", test: "Kidney Function Test (KFT)", status: "processing", priority: "critical", received: "5m ago" },
  { id: "LAB-504", patient: "Bupe Chanda", test: "Liver Function Test (LFT)", status: "pending", priority: "normal", received: "1h ago" },
];

export default function LaboratoryDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Laboratory (LIS)</h1>
          <p className="text-slate-500 mt-1">Sample Tracking & Result Management.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Filter size={16} />
            All Tests
          </button>
          <button className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-md flex items-center gap-2">
            <Plus size={16} />
            Receive Sample
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Pending Samples / Worklist */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Laboratory Worklist</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search orders..." 
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Sample ID</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Test Description</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {labOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          order.priority === 'critical' ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
                        )}>
                          <FlaskConical size={16} />
                        </div>
                        <span className="font-bold text-slate-900">{order.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{order.patient}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Received: {order.received}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{order.test}</td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        order.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                        order.status === 'processing' ? "bg-blue-50 text-blue-600" :
                        "bg-amber-50 text-amber-600"
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-brand-600 font-bold hover:underline text-xs">Enter Results</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Quick Entry / Analytics */}
        <div className="space-y-8">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Quick Result Entry</h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Selected: Mwaba Musonda (FBC)</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Hemoglobin (Hb)</span>
                    <input type="text" placeholder="13.5" className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-right focus:ring-1 focus:ring-brand-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">WBC Count</span>
                    <input type="text" placeholder="7.2" className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-right focus:ring-1 focus:ring-brand-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Platelets</span>
                    <input type="text" placeholder="250" className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-right focus:ring-1 focus:ring-brand-500" />
                  </div>
                </div>
                <button className="w-full mt-6 bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 transition-all">
                  Submit Results
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-2xl rounded-full" />
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <AlertTriangle className="text-rose-400" size={20} />
              Abnormal Flags
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <p className="text-sm font-bold text-slate-100">Glucose (Fasting)</p>
                <p className="text-2xl font-black text-rose-400 mt-1">182 <span className="text-xs font-medium text-slate-400 ml-1">mg/dL</span></p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Patient: Mapalo Ngosa (Bed 105)</p>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <p className="text-sm font-bold text-slate-100">Potassium (K+)</p>
                <p className="text-2xl font-black text-amber-400 mt-1">5.8 <span className="text-xs font-medium text-slate-400 ml-1">mmol/L</span></p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Patient: Natasha Zulu (Bed 107)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
