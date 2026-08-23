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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inpatient Department (IPD)</h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">Ward bed tracking, patient admissions, and census coordination.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchBedsAndWards}
            className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button 
            onClick={() => setIsAdmissionModalOpen(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
          >
            <Plus size={14} />
            New Admission
          </button>
        </div>
      </div>

      {/* Ward Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ward Capacity</p>
            <BedDouble size={15} className="text-slate-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.total}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Total configured beds</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Occupied</p>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.occupied}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Patients admitted</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vacant & Ready</p>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.vacant}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Available for intake</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Maintenance</p>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.maintenance}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Cleaning / turnover</p>
        </div>
      </div>

      {/* Bed Tracking Grid */}
      <section className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">Ward Bed Occupancy Grid</h2>
          
          <div className="flex items-center gap-2">
            {/* Ward Filter */}
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 text-slate-700 focus:outline-none shadow-xs"
            >
              <option value="ALL">All Hospital Wards</option>
              {wards.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input 
                type="text" 
                placeholder="Search bed or patient..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-xs"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading && beds.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <Loader2 className="animate-spin mx-auto text-slate-500 mb-2" size={24} />
              <p className="text-slate-400 font-medium text-xs">Syncing Ward Beds...</p>
            </div>
          ) : filteredBeds.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 font-normal text-xs">
              No beds found matching your search query.
            </div>
          ) : filteredBeds.map((bed) => {
            const patient = getBedPatient(bed);
            const activeAdmission = getActiveAdmission(bed);
            
            return (
              <div 
                key={bed.id} 
                className="rounded-2xl border border-slate-200/80 bg-white p-5 transition-all duration-150 hover:border-slate-300 hover:shadow-xs relative overflow-hidden flex flex-col justify-between"
              >
                {/* Bed Header */}
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-lg font-bold tracking-tight text-slate-900">Bed {bed.bed_number}</span>
                      <p className="text-[10px] font-medium text-slate-400">{bed.wards?.name || 'General Ward'}</p>
                    </div>
                    <span className={clsx(
                      "inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      bed.status === 'OCCUPIED' ? "bg-blue-50 text-blue-700 border-blue-200/60" : 
                      bed.status === 'VACANT' ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" :
                      bed.status === 'CLEANING' ? "bg-amber-50 text-amber-700 border-amber-200/60" :
                      "bg-slate-100 text-slate-700 border-slate-200/60"
                    )}>
                      <span className={clsx(
                        "w-1.5 h-1.5 rounded-full",
                        bed.status === 'OCCUPIED' ? "bg-blue-500 animate-pulse" :
                        bed.status === 'VACANT' ? "bg-emerald-500" :
                        bed.status === 'CLEANING' ? "bg-amber-500" :
                        "bg-slate-400"
                      )} />
                      {bed.status}
                    </span>
                  </div>

                  {/* Patient Information & Actions */}
                  {bed.status === 'OCCUPIED' ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {patient ? `${patient.first_name} ${patient.last_name}` : 'Admitted Inpatient'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          MRN: {patient?.file_number || 'N/A'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Admitted: {activeAdmission?.admission_date ? new Date(activeAdmission.admission_date).toLocaleDateString() : 'Active'}
                        </p>
                      </div>

                      <div className="pt-2">
                        <button 
                          onClick={() => activeAdmission && handleDischargePatient(activeAdmission.id, bed.id, `${patient?.first_name} ${patient?.last_name}`)}
                          className="w-full bg-white border border-rose-200 text-rose-700 py-1.5 rounded-xl text-xs font-medium hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <LogOut size={13} />
                          Discharge Patient
                        </button>
                      </div>
                    </div>
                  ) : bed.status === 'VACANT' ? (
                    <div className="pt-2">
                      <p className="text-[11px] text-slate-400 font-normal mb-3">Sanitized and ready for admission.</p>
                      <button 
                        onClick={() => setIsAdmissionModalOpen(true)}
                        className="w-full bg-slate-900 text-white py-1.5 rounded-xl text-xs font-medium hover:bg-slate-800 transition-all shadow-xs"
                      >
                        Admit Patient
                      </button>
                    </div>
                  ) : bed.status === 'CLEANING' ? (
                    <div className="pt-2">
                      <p className="text-[11px] text-amber-700 font-medium mb-3">Sanitization in progress.</p>
                      <button 
                        onClick={() => handleUpdateBedStatus(bed.id, 'VACANT')}
                        className="w-full bg-white border border-slate-200 text-slate-700 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        Mark Vacant
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2">
                      <p className="text-[11px] text-slate-400 font-normal mb-3">Bed undergoing maintenance.</p>
                      <button 
                        onClick={() => handleUpdateBedStatus(bed.id, 'VACANT')}
                        className="w-full bg-white border border-slate-200 text-slate-700 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors shadow-xs"
                      >
                        Mark Available
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ward Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Inpatient Admission Log</h2>
          <div className="space-y-2">
            {activeAdmissionsList.length === 0 ? (
              <p className="text-xs text-slate-400 font-normal text-center py-4">No inpatient admission records logged.</p>
            ) : activeAdmissionsList.slice(0, 5).map((adm) => {
              const pName = adm.patients ? `${adm.patients.first_name} ${adm.patients.last_name}` : 'Inpatient';
              return (
                <div key={adm.id} className="flex gap-3 items-center p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    <BedDouble size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{pName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{adm.ward_name} &bull; Bed {adm.bed_number}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {new Date(adm.admission_date).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* IPD Ward Occupancy Stats */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Ward Capacity Summary</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-600 font-medium">Occupancy Rate</span>
                <span className="text-sm font-bold text-slate-900">
                  {stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-600 font-medium">Available Beds</span>
                <span className="text-sm font-bold text-slate-900">{stats.vacant}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setIsAdmissionModalOpen(true)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-98"
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
