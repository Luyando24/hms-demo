import { Box, Search, Filter, Plus, Package, AlertCircle, RefreshCw, ClipboardCheck, ArrowDownRight, ArrowUpRight } from "lucide-react";
import clsx from "clsx";

const inventoryItems = [
  { id: "INV-001", name: "Paracetamol 500mg", category: "Analgesic", stock: 1240, min: 500, status: "in-stock" },
  { id: "INV-002", name: "Amoxicillin 250mg", category: "Antibiotic", stock: 240, min: 300, status: "low-stock" },
  { id: "INV-003", name: "Insulin Glargine", category: "Endocrine", stock: 15, min: 10, status: "in-stock" },
  { id: "INV-004", name: "Surgical Gloves (Size 7)", category: "Consumable", stock: 0, min: 100, status: "out-of-stock" },
  { id: "INV-005", name: "Ibuprofen 400mg", category: "Analgesic", stock: 850, min: 400, status: "in-stock" },
];

export default function InventoryDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Pharmacy & Inventory</h1>
          <p className="text-slate-500 mt-1">Medical Stock Tracking & Dispensing.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Package size={16} />
            Stock Take
          </button>
          <button className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-md flex items-center gap-2">
            <Plus size={16} />
            Add New Item
          </button>
        </div>
      </div>

      {/* Inventory Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Items</p>
          <p className="text-2xl font-black text-slate-900">1,245</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">Out of Stock</p>
          <p className="text-2xl font-black text-slate-900">8</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Low Stock Alerts</p>
          <p className="text-2xl font-black text-slate-900">24</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Today's Dispensing</p>
          <p className="text-2xl font-black text-slate-900">142</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Inventory List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Inventory Management</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search stock..." 
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Current Stock</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{item.id}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{item.category}</td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "font-black text-base",
                        item.status === 'out-of-stock' ? "text-rose-600" : 
                        item.status === 'low-stock' ? "text-amber-600" : "text-slate-900"
                      )}>
                        {item.stock.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        item.status === 'in-stock' ? "bg-emerald-50 text-emerald-600" :
                        item.status === 'low-stock' ? "bg-amber-50 text-amber-600" :
                        "bg-rose-50 text-rose-600"
                      )}>
                        {item.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-brand-600 font-bold hover:underline text-xs">Update</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Dispensing Queue & Reorders */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full" />
            <h2 className="text-lg font-bold mb-6 flex items-center justify-between relative z-10">
              Dispensing Queue
              <span className="bg-rose-500 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">12 Pending</span>
            </h2>
            
            <div className="space-y-4 flex-1 overflow-y-auto relative z-10">
              {[
                { patient: 'Michael Chen', items: '3 items', time: '5m ago' },
                { patient: 'Sarah Miller', items: '1 item', time: '12m ago' },
                { patient: 'David Wilson', items: '5 items', time: '20m ago' },
                { patient: 'Emma Watson', items: '2 items', time: '25m ago' },
              ].map((row, idx) => (
                <div key={idx} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-slate-800">
                  <div>
                    <p className="text-sm font-bold text-slate-100">{row.patient}</p>
                    <p className="text-xs text-slate-500 mt-1">{row.items} • {row.time}</p>
                  </div>
                  <button className="bg-brand-500 hover:bg-brand-600 text-white p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <ClipboardCheck size={16} />
                  </button>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-8 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-sm font-bold transition-all relative z-10">
              View All Prescriptions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
