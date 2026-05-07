'use client'

import { useState, useEffect } from "react";
import { Users, Search, Plus, Calendar, Clock, UserPlus, FileText, CheckCircle2, MoreVertical, LogIn, ArrowRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import RegisterPatientModal from "@/components/hospital/RegisterPatientModal";
import StatusModal from "@/components/hospital/StatusModal";
import Link from "next/link";

export default function ReceptionDashboard() {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (searchQuery.length > 2) {
      searchPatients();
    } else {
      setPatients([]);
    }
  }, [searchQuery]);

  const searchPatients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,file_number.ilike.%${searchQuery}%`)
      .limit(5);
    
    if (data) setPatients(data);
    setLoading(false);
  };

  const handleCheckIn = async (patientId: string, patientName: string) => {
    setLoading(true);
    
    // 1. Create walk-in queue record
    const { data: queueData, error: queueError } = await supabase.from('walkin_queue').insert({
      patient_id: patientId,
      status: 'WAITING',
      priority: 'NORMAL'
    }).select().single();

    if (queueError) {
      setStatus({
        type: 'error',
        title: 'Check-in Failed',
        message: queueError.message
      });
      setLoading(false);
      return;
    }

    // 2. Create consultation fee invoice
    const { error: invoiceError } = await supabase.from('invoices').insert({
      patient_id: patientId,
      total_amount: 150.00, // Default consultation fee
      status: 'UNPAID'
    });

    if (invoiceError) {
      console.error('Error creating consultation invoice:', invoiceError.message);
    }

    setStatus({
      type: 'success',
      title: 'Check-in Successful',
      message: `${patientName} has been checked in to the OPD queue and a consultation invoice has been generated.`
    });
    
    setSearchQuery("");
    setPatients([]);
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Front Office / Reception</h1>
          <p className="text-slate-500 mt-1 font-medium">Patient Registration & Appointment Management.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/hospital/patients"
            className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Users size={16} />
            Patient Directory
          </Link>
          <button 
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
          >
            <UserPlus size={16} />
            Register New Patient
          </button>
        </div>
      </div>

      <RegisterPatientModal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)} 
        onSuccess={() => {
          setIsRegisterModalOpen(false);
          // The modal itself handles success messaging now
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Patient Search & Recent Check-ins */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full blur-3xl -mr-32 -mt-32" />
            
            <h2 className="text-xl font-black text-slate-900 mb-6 relative">Patient Search & Check-in</h2>
            <div className="relative mb-8 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search by Patient Name, File Number, or ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-lg focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all shadow-sm"
              />
            </div>

            {searchQuery.length > 0 && (
              <div className="mb-8 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search Results</h3>
                  <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">{patients.length} records found</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {loading ? (
                    <div className="p-12 text-center">
                      <Loader2 className="animate-spin text-brand-600 mx-auto" size={32} />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-4">Searching database...</p>
                    </div>
                  ) : patients.length === 0 ? (
                    <div className="p-12 text-center">
                      <Users className="text-slate-200 mx-auto mb-4" size={48} />
                      <p className="text-sm font-bold text-slate-500">No patients found matching your search.</p>
                      <button 
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="text-brand-600 text-xs font-black uppercase tracking-widest mt-2 hover:underline"
                      >
                        Register as new patient
                      </button>
                    </div>
                  ) : patients.map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-lg">
                          {patient.first_name?.[0]}{patient.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 group-hover:text-brand-600 transition-colors">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-slate-200 text-slate-600 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                              {patient.file_number}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">• {patient.gender}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCheckIn(patient.id, `${patient.first_name} ${patient.last_name}`)}
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-brand-600 transition-all shadow-md flex items-center gap-2 text-xs font-bold active:scale-95"
                      >
                        <LogIn size={16} />
                        Check-in to OPD
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Activity</h3>
                <Link href="/hospital/reports" className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                  View All <ArrowRight size={10} />
                </Link>
              </div>
              <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-100/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Patient</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { name: 'Kondwani Phiri', action: 'Appointment Check-in', time: '5m ago', status: 'In-Queue', type: 'info' },
                      { name: 'Natasha Zulu', action: 'New Registration', time: '15m ago', status: 'Completed', type: 'success' },
                      { name: 'Dalitso Lungu', action: 'Billing Inquiry', time: '1h ago', status: 'Resolved', type: 'success' },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-white transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{row.name}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{row.action}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs font-bold">{row.time}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            row.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                          }`}>
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
        </div>

        {/* Right: Quick Stats & Appointments */}
        <div className="space-y-8">
          <div className="bg-brand-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
            <h2 className="text-xl font-black mb-6 relative">Reception Stats</h2>
            <div className="grid grid-cols-2 gap-4 relative">
              <div className="bg-white/10 p-5 rounded-2xl border border-white/10 text-center backdrop-blur-sm">
                <p className="text-3xl font-black tracking-tighter">42</p>
                <p className="text-[10px] uppercase font-black text-brand-100 tracking-widest mt-1">Checked-in</p>
              </div>
              <div className="bg-white/10 p-5 rounded-2xl border border-white/10 text-center backdrop-blur-sm">
                <p className="text-3xl font-black tracking-tighter">12</p>
                <p className="text-[10px] uppercase font-black text-brand-100 tracking-widest mt-1">New Reg</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm overflow-hidden relative">
             <div className="absolute top-0 left-0 w-1 h-full bg-brand-600" />
            <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center justify-between">
              Upcoming
              <Calendar size={18} className="text-brand-600" />
            </h2>
            <div className="space-y-4">
              {[
                { name: 'Dr. Luyando Chansa', count: 12, time: 'Next: 09:00 AM' },
                { name: 'Dr. Mulenga Musonda', count: 8, time: 'Next: 10:30 AM' },
                { name: 'Dr. Mwansa Phiri', count: 5, time: 'Next: 11:15 AM' },
              ].map((apt, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-200 transition-colors group cursor-pointer">
                  <div>
                    <p className="text-sm font-black text-slate-800 group-hover:text-brand-600 transition-colors">{apt.name}</p>
                    <p className="text-[10px] text-brand-600 font-black uppercase tracking-widest mt-0.5">{apt.time}</p>
                  </div>
                  <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm group-hover:bg-brand-600 group-hover:text-white transition-all">
                    <span className="text-sm font-black">{apt.count}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95">
              View Full Schedule
            </button>
          </div>
        </div>
      </div>

      <StatusModal 
        isOpen={!!status}
        type={status?.type || 'success'}
        title={status?.title || ''}
        message={status?.message || ''}
        onClose={() => setStatus(null)}
      />
    </div>
  );
}

const Loader2 = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`animate-spin ${className}`}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)
