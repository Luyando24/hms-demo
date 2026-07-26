'use client'

import { useState, useEffect } from "react";
import { BedDouble, Search, Filter, Plus, Users, ClipboardList, Info, AlertCircle, RefreshCw, Loader2, LogOut, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import NewAdmissionModal from "@/components/hospital/NewAdmissionModal";
import StatusModal from "@/components/hospital/StatusModal";

const bedStatusStyles = {
  VACANT: "bg-emerald-50 text-emerald-700 border-emerald-100",
  OCCUPIED: "bg-blue-50 text-blue-700 border-blue-100",
  CLEANING: "bg-amber-50 text-amber-700 border-amber-100",
  MAINTENANCE: "bg-slate-100 text-slate-500 border-slate-200",
};

interface BedItem {
  id: string;
  bed_number: string;
  status: string;
  ward_id?: string;
  wards?: { id: string, name: string };
  admissions?: Array<{
    id: string;
    patient_id: string;
    admission_date: string;
    discharge_date?: string;
    status: string;
    primary_diagnosis?: string;
    patients?: {
      id: string;
      first_name: string;
      last_name: string;
      file_number: string;
      gender?: string;
    };
  }>;
}

export default function InpatientDashboard() {
  const [beds, setBeds] = useState<BedItem[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchBedsAndWards();
    
    // Subscribe to realtime bed & admission updates
    const channel = supabase
      .channel('ipd-bed-updates-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, () => fetchBedsAndWards())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admissions' }, () => fetchBedsAndWards())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBedsAndWards = async () => {
    setLoading(true);
    try {
      // 1. Fetch Wards
      const { data: wardsData } = await supabase
        .from('wards')
        .select('*')
        .order('name', { ascending: true });

      setWards(wardsData || []);

      // 2. Fetch Beds with Admissions & Patients
      const { data } = await supabase
        .from('beds')
        .select('*, wards(*), admissions(*, patients(*))')
        .order('bed_number', { ascending: true });
      
      if (data) setBeds(data as BedItem[]);
    } catch (err) {
      console.error('Error fetching IPD data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDischargePatient = async (admissionId: string, bedId: string, patientName: string) => {
    if (!confirm(`Are you sure you want to discharge ${patientName}?`)) return;

    setLoading(true);

    // 1. Update admission status
    const { error: admErr } = await supabase
      .from('admissions')
      .update({
        status: 'DISCHARGED',
        discharge_date: new Date().toISOString()
      })
      .eq('id', admissionId);

    if (admErr) {
      setStatusModal({ type: 'error', title: 'Discharge Failed', message: admErr.message });
      setLoading(false);
      return;
    }

    // 2. Update bed status to CLEANING
    const { error: bedErr } = await supabase
      .from('beds')
      .update({ status: 'CLEANING' })
      .eq('id', bedId);

    if (bedErr) {
      console.error('Error updating bed status:', bedErr.message);
    }

    setStatusModal({
      type: 'success',
      title: 'Patient Discharged',
      message: `${patientName} has been successfully discharged. Bed has been marked for cleaning.`
    });

    fetchBedsAndWards();
  };

  const handleUpdateBedStatus = async (bedId: string, newStatus: string) => {
    const { error } = await supabase
      .from('beds')
      .update({ status: newStatus })
      .eq('id', bedId);

    if (error) {
      setStatusModal({ type: 'error', title: 'Update Failed', message: error.message });
    } else {
      setStatusModal({ type: 'success', title: 'Bed Status Updated', message: `Bed status changed to ${newStatus}.` });
      fetchBedsAndWards();
    }
  };

  const getBedPatient = (bed: BedItem) => {
    const activeAdmission = bed.admissions?.find(a => a.status === 'ACTIVE' || !a.discharge_date);
    return activeAdmission?.patients;
  };

  const getActiveAdmission = (bed: BedItem) => {
    return bed.admissions?.find(a => a.status === 'ACTIVE' || !a.discharge_date);
  };

  // Filtered beds
  const filteredBeds = beds.filter(bed => {
    const matchesWard = selectedWard === 'ALL' || bed.ward_id === selectedWard;
    const patient = getBedPatient(bed);
    const matchesSearch = searchQuery === '' ||
      bed.bed_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient?.file_number?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesWard && matchesSearch;
  });

  const stats = {
    total: beds.length,
    occupied: beds.filter(b => b.status === 'OCCUPIED').length,
    vacant: beds.filter(b => b.status === 'VACANT').length,
    maintenance: beds.filter(b => b.status === 'MAINTENANCE' || b.status === 'CLEANING').length,
  };

  // Get active admissions for activity log
  const activeAdmissionsList = beds
    .flatMap(b => (b.admissions || []).map(a => ({ ...a, bed_number: b.bed_number, ward_name: b.wards?.name })))
    .sort((a, b) => new Date(b.admission_date).getTime() - new Date(a.admission_date).getTime());

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Inpatient Department (IPD)</h1>
          <p className="text-slate-500 mt-1 font-medium">Real-time ward bed tracking, patient admissions, and discharge desk.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchBedsAndWards}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button 
            onClick={() => setIsAdmissionModalOpen(true)}
            className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-md flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus size={16} />
            New Admission
          </button>
        </div>
      </div>

      {/* Ward Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Ward Capacity</p>
            <BedDouble size={18} className="text-slate-400" />
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Occupied Beds</p>
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.occupied}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Vacant & Ready</p>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.vacant}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Cleaning / Sanitization</p>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.maintenance}</p>
        </div>
      </div>

      {/* Bed Tracking Grid */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-black text-slate-900">Ward Bed Occupancy Grid</h2>
          
          <div className="flex items-center gap-3">
            {/* Ward Filter */}
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Hospital Wards</option>
              {wards.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search bed or patient..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading && beds.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <Loader2 className="animate-spin mx-auto text-brand-600 mb-4" size={32} />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Syncing Ward Beds...</p>
            </div>
          ) : filteredBeds.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 font-bold text-sm">
              No beds found matching your search query.
            </div>
          ) : filteredBeds.map((bed) => {
            const patient = getBedPatient(bed);
            const activeAdmission = getActiveAdmission(bed);
            
            return (
              <div 
                key={bed.id} 
                className={clsx(
                  "rounded-2xl border-2 p-6 transition-all duration-200 hover:shadow-lg relative overflow-hidden group",
                  bedStatusStyles[bed.status as keyof typeof bedStatusStyles]
                )}
              >
                {/* Bed Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-2xl font-black tracking-tight text-slate-900">Bed {bed.bed_number}</span>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{bed.wards?.name || 'General Ward'}</p>
                  </div>
                  <span className={clsx(
                    "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm",
                    bed.status === 'OCCUPIED' ? "bg-blue-600 text-white border-blue-600" : 
                    bed.status === 'VACANT' ? "bg-emerald-600 text-white border-emerald-600" :
                    bed.status === 'CLEANING' ? "bg-amber-600 text-white border-amber-600" :
                    "bg-slate-500 text-white border-slate-500"
                  )}>
                    {bed.status}
                  </span>
                </div>

                {/* Patient Information & Actions */}
                {bed.status === 'OCCUPIED' ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-black text-slate-900 truncate">
                        {patient ? `${patient.first_name} ${patient.last_name}` : 'Admitted Inpatient'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                        File: {patient?.file_number || 'N/A'}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500 mt-1">
                        Admitted: {activeAdmission?.admission_date ? new Date(activeAdmission.admission_date).toLocaleDateString() : 'Active'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => activeAdmission && handleDischargePatient(activeAdmission.id, bed.id, `${patient?.first_name} ${patient?.last_name}`)}
                        className="flex-1 bg-rose-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <LogOut size={14} />
                        Discharge
                      </button>
                    </div>
                  </div>
                ) : bed.status === 'VACANT' ? (
                  <div className="pt-2">
                    <p className="text-xs text-emerald-600 font-bold mb-4">Bed sanitization complete. Ready for patient admission.</p>
                    <button 
                      onClick={() => setIsAdmissionModalOpen(true)}
                      className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-500/20"
                    >
                      Admit Patient Here
                    </button>
                  </div>
                ) : bed.status === 'CLEANING' ? (
                  <div className="pt-2">
                    <p className="text-xs text-amber-700 font-bold mb-4">Ward sanitization in progress.</p>
                    <button 
                      onClick={() => handleUpdateBedStatus(bed.id, 'VACANT')}
                      className="w-full bg-amber-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 size={14} />
                      Mark Vacant & Ready
                    </button>
                  </div>
                ) : (
                  <div className="pt-2">
                    <p className="text-xs text-slate-500 font-bold mb-4">Bed undergoing facility maintenance.</p>
                    <button 
                      onClick={() => handleUpdateBedStatus(bed.id, 'VACANT')}
                      className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm"
                    >
                      Mark Available
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Ward Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-black text-slate-900">Recent Inpatient Admission Log</h2>
          <div className="space-y-4">
            {activeAdmissionsList.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold text-center py-6">No inpatient admission records logged.</p>
            ) : activeAdmissionsList.slice(0, 5).map((adm) => {
              const pName = adm.patients ? `${adm.patients.first_name} ${adm.patients.last_name}` : 'Inpatient';
              return (
                <div key={adm.id} className="flex gap-4 items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                    <BedDouble size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{pName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Assigned to Bed {adm.bed_number} ({adm.ward_name || 'Ward'}). Primary Diagnosis: {adm.primary_diagnosis || 'Under Observation'}
                    </p>
                  </div>
                  <span className={clsx(
                    "text-[10px] font-black uppercase px-2.5 py-1 rounded-full",
                    adm.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                  )}>
                    {adm.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* IPD Ward Occupancy Stats */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-slate-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full pointer-events-none" />
          <div>
            <h2 className="text-lg font-black mb-6">Ward Capacity Summary</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                <span className="text-xs text-slate-300 font-bold">Occupancy Rate</span>
                <span className="text-lg font-black text-blue-400">
                  {stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                <span className="text-xs text-slate-300 font-bold">Available Beds</span>
                <span className="text-lg font-black text-emerald-400">{stats.vacant}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setIsAdmissionModalOpen(true)}
            className="w-full mt-8 bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-brand-500/20"
          >
            Admit New Inpatient
          </button>
        </div>
      </div>

      <NewAdmissionModal 
        isOpen={isAdmissionModalOpen}
        onClose={() => setIsAdmissionModalOpen(false)}
        onSuccess={fetchBedsAndWards}
      />

      <StatusModal 
        isOpen={!!statusModal}
        type={statusModal?.type || 'success'}
        title={statusModal?.title || ''}
        message={statusModal?.message || ''}
        onClose={() => setStatusModal(null)}
      />
    </div>
  );
}
