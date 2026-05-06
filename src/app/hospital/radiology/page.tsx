import { Microscope, Search, Filter, Play, Download, CheckCircle2, MoreVertical, Image as ImageIcon, Maximize2, ZoomIn, Sun, MousePointer2, PenTool } from "lucide-react";
import clsx from "clsx";

const imagingOrders = [
  { id: "RAD-201", patient: "Mwaba Musonda", type: "Chest X-Ray", date: "2026-05-05", status: "pending", priority: "high" },
  { id: "RAD-202", patient: "Luyando Hamubaba", type: "Brain MRI", date: "2026-05-05", status: "completed", priority: "normal" },
  { id: "RAD-203", patient: "Dalitso Lungu", type: "Abdominal CT", date: "2026-05-04", status: "in-progress", priority: "critical" },
  { id: "RAD-204", patient: "Bupe Chanda", type: "Leg X-Ray", date: "2026-05-04", status: "pending", priority: "normal" },
];

export default function RadiologyDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Radiology (RIS)</h1>
          <p className="text-slate-500 mt-1">Imaging Worklist & PACS Viewer.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Filter size={16} />
            Filter Orders
          </button>
          <button className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-md flex items-center gap-2">
            <Play size={16} />
            Start Batch Review
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Imaging Worklist */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Worklist</h2>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-md">8 Pending</span>
          </div>

          <div className="space-y-4">
            {imagingOrders.map((order) => (
              <div 
                key={order.id} 
                className={clsx(
                  "p-4 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md",
                  order.priority === 'critical' ? "border-rose-100 bg-rose-50/30" : 
                  order.id === 'RAD-201' ? "border-brand-500 bg-brand-50/30" : "border-slate-200 bg-white"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={clsx(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                    order.priority === 'critical' ? "bg-rose-500 text-white" :
                    order.priority === 'high' ? "bg-orange-500 text-white" : "bg-slate-400 text-white"
                  )}>
                    {order.priority}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{order.date}</span>
                </div>
                <h3 className="font-bold text-slate-900">{order.patient}</h3>
                <p className="text-xs text-slate-500 mt-1">{order.type} • {order.id}</p>
                
                <div className="mt-4 flex items-center justify-between">
                  <span className={clsx(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md",
                    order.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                    order.status === 'in-progress' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {order.status}
                  </span>
                  {order.status === 'completed' ? (
                    <button className="text-emerald-600">
                      <CheckCircle2 size={16} />
                    </button>
                  ) : (
                    <button className="text-brand-600 text-xs font-bold hover:underline">Open PACS</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: PACS Viewer Simulator */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <div className="bg-slate-900 rounded-2xl overflow-hidden flex flex-col h-[700px] shadow-2xl relative">
            {/* Viewer Toolbar */}
            <div className="bg-slate-800/80 backdrop-blur-md px-6 py-4 border-b border-slate-700 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-white">
                  <ImageIcon size={20} className="text-brand-400" />
                  <span className="font-bold text-sm tracking-tight text-slate-200">Mwaba Musonda • Chest X-Ray (AP View)</span>
                </div>
                <div className="h-4 w-px bg-slate-700" />
                <div className="flex items-center gap-4">
                  <button className="text-slate-400 hover:text-white transition-colors" title="Zoom">
                    <ZoomIn size={18} />
                  </button>
                  <button className="text-slate-400 hover:text-white transition-colors" title="Window Level">
                    <Sun size={18} />
                  </button>
                  <button className="text-slate-400 hover:text-white transition-colors" title="Pan">
                    <MousePointer2 size={18} />
                  </button>
                  <button className="text-brand-400 hover:text-white transition-colors" title="Annotate">
                    <PenTool size={18} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-slate-400 hover:text-white p-2">
                  <Maximize2 size={18} />
                </button>
                <button className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                  Series: 1/12
                </button>
              </div>
            </div>

            {/* Viewer Area (Mocked Image) */}
            <div className="flex-1 bg-black flex items-center justify-center relative p-8">
              {/* Simulated X-Ray image */}
              <div className="relative w-full h-full max-w-lg mx-auto bg-slate-800 rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center group cursor-crosshair shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 via-black to-slate-900/40 mix-blend-overlay" />
                
                {/* Mock DICOM Data Overlays */}
                <div className="absolute top-4 left-4 text-[10px] font-mono text-emerald-400/60 leading-tight">
                  <p>PATIENT_ID: 948201</p>
                  <p>STUDY_UID: 1.2.840.113619.2.2026.05.05</p>
                  <p>SERIES_NUM: 001</p>
                  <p>SLICE: 15/124</p>
                </div>

                <div className="absolute bottom-4 right-4 text-right text-[10px] font-mono text-emerald-400/60 leading-tight">
                  <p>WL: 400 WW: 1500</p>
                  <p>TR: 500 TE: 20</p>
                  <p>FOV: 350x350</p>
                  <p>MATRIX: 512x512</p>
                </div>

                {/* Simulated Bones/Anatomy using icons or patterns */}
                <div className="text-center opacity-20 group-hover:opacity-30 transition-opacity">
                  <Microscope size={120} className="text-white mx-auto mb-4" />
                  <p className="text-white text-xs font-bold uppercase tracking-widest">DICOM SIMULATOR ACTIVE</p>
                </div>
              </div>
            </div>

            {/* Report Footer */}
            <div className="bg-slate-800/90 backdrop-blur-md p-6 border-t border-slate-700 relative z-10">
              <div className="flex justify-between items-end">
                <div className="space-y-2 flex-1 max-w-lg">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Radiologist Impression</label>
                  <textarea 
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-slate-600 h-20"
                    placeholder="Enter findings and impressions..."
                  />
                </div>
                <div className="ml-6 space-y-4">
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700 w-48 text-center relative group">
                    <PenTool size={16} className="absolute top-2 right-2 text-slate-600" />
                    <div className="h-12 flex items-center justify-center italic text-slate-500 text-sm">
                      Sign here
                    </div>
                    <div className="h-px bg-slate-700 my-2" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Signature</p>
                  </div>
                  <button className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} />
                    Finalize Report
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-4">
            <button className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
              <Download size={16} />
              Export DICOM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
