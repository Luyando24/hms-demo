import { Settings, User, Bell, Shield, Lock, CreditCard, ChevronRight, Save, Camera } from "lucide-react";
import clsx from "clsx";

export default function PatientSettings() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account preferences and personal information.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Navigation Tabs */}
        <div className="space-y-2">
          {[
            { name: 'Personal Profile', icon: User, active: true },
            { name: 'Security & Password', icon: Lock },
            { name: 'Notifications', icon: Bell },
            { name: 'Payment Methods', icon: CreditCard },
          ].map((tab) => (
            <button 
              key={tab.name}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                tab.active ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <tab.icon size={20} />
              {tab.name}
              {tab.active && <ChevronRight size={18} className="ml-auto opacity-60" />}
            </button>
          ))}
        </div>

        {/* Settings Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-8">
            
            {/* Profile Picture */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 text-3xl font-black border-4 border-white shadow-sm overflow-hidden">
                  M
                </div>
                <button className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                  <Camera size={24} />
                </button>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Mwansa Chanda</h3>
                <p className="text-sm text-slate-500">Patient ID: PAT-8420-11</p>
                <div className="flex gap-2 mt-2">
                  <button className="text-xs font-bold text-brand-600 hover:underline">Change Photo</button>
                  <span className="text-slate-300">•</span>
                  <button className="text-xs font-bold text-rose-500 hover:underline">Remove</button>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">First Name</label>
                <input 
                  type="text" 
                  defaultValue="Mwansa"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Last Name</label>
                <input 
                  type="text" 
                  defaultValue="Chanda"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                <input 
                  type="email" 
                  defaultValue="mwansa.chanda@example.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                <input 
                  type="tel" 
                  defaultValue="+260 97 1234567"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Home Address</label>
                <textarea 
                  defaultValue="123 Wellness Avenue, Rhodes Park, Lusaka, Zambia"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 h-24"
                />
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex justify-end gap-3 pt-4">
              <button className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm">
                Discard Changes
              </button>
              <button className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-sm flex items-center gap-2">
                <Save size={18} />
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
