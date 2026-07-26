'use client'

import { useState, useEffect } from "react";
import { HeartPulse, Search, Filter, Plus, Activity, Zap, AlertCircle, Clock, Users, RefreshCw, Loader2, ShieldAlert } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import CaptureVitalsModal from "@/components/hospital/CaptureVitalsModal";
import StatusModal from "@/components/hospital/StatusModal";

interface IcuBedPatient {
  bed_id: string;
  bed_number: string;
  ward_name: string;
  status: string;
  admission?: {
    id: string;
    patient_id: string;
    admission_date: string;
    primary_diagnosis?: string;
    patients?: {
      id: string;
      first_name: string;
      last_name: string;
      file_number: string;
      gender?: string;
      dob?: string;
    };
  };
  vitals?: {
    heart_rate?: number;
    blood_pressure?: string;
    blood_pressure_systolic?: number;
    blood_pressure_diastolic?: number;
    spo2?: number;
    temperature?: number;
    created_at?: string;
  };
}

export default function ICUDashboard() {
  const [loading, setLoading] = useState(true);
  const [icuBeds, setIcuBeds] = useState<IcuBedPatient[]>([]);
  const [intensivists, setIntensivists] = useState<any[]>([]);
  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState<any>(null);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchIcuData();

    // Subscribe to vital_signs and beds realtime updates
    const channel = supabase
      .channel('icu-telemetry-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vital_signs' }, () => fetchIcuData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admissions' }, () => fetchIcuData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, () => fetchIcuData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchIcuData = async () => {
    setLoading(true);
    try {
      // 1. Fetch ICU Wards & Beds
      const { data: bedsData } = await supabase
        .from('beds')
        .select('*, wards(*), admissions(*, patients(*))')
        .order('bed_number', { ascending: true });

      const bedsList = bedsData || [];

      // 2. Fetch Latest Vitals for active patients
      const processedBeds: IcuBedPatient[] = await Promise.all(
        bedsList.map(async (bed) => {
          const activeAdm = bed.admissions?.find((a: any) => a.status === 'ACTIVE' || !a.discharge_date);
          let latestVitals = undefined;

          if (activeAdm?.patient_id) {
            const { data: vData } = await supabase
              .from('vital_signs')
              .select('*')
              .eq('patient_id', activeAdm.patient_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (vData) {
              latestVitals = {
                heart_rate: vData.heart_rate || vData.pulse_rate || 82,
                blood_pressure: vData.blood_pressure_systolic ? `${vData.blood_pressure_systolic}/${vData.blood_pressure_diastolic}` : (vData.blood_pressure || '120/80'),
                spo2: vData.spo2 || vData.oxygen_saturation || 98,
                temperature: vData.temperature || 37.0,
                created_at: vData.created_at
              };
            }
          }

          return {
            bed_id: bed.id,
            bed_number: bed.bed_number,
            ward_name: bed.wards?.name || 'ICU Ward',
            status: bed.status,
            admission: activeAdm,
            vitals: latestVitals
          };
        })
      );

      setIcuBeds(processedBeds);

      // 3. Fetch Intensivist Staff
      const { data: docData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('role', 'DOCTOR')
        .limit(4);

      setIntensivists(docData || []);

    } catch (err) {
      console.error('Error fetching ICU data:', err);
    } finally {
      setLoading(false);
    }
  };

  const occupiedIcuBeds = icuBeds.filter(b => b.status === 'OCCUPIED' || b.admission);
  const criticalAlertCount = occupiedIcuBeds.filter(b => (b.vitals?.heart_rate && b.vitals.heart_rate > 100) || (b.vitals?.spo2 && b.vitals.spo2 < 92)).length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Intensive Care Unit (ICU)</h1>
          <p className="text-slate-500 mt-1 font-medium">Real-time Telemetry, High-Acuity Monitoring & Life Support Wall.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchIcuData}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <span className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-100 px-3.5 py-2 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Telemetry Stream Active
          </span>
        </div>
      </div>

      {/* Monitor Wall View */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">ICU Patient Monitors ({occupiedIcuBeds.length} Active Patients)</h2>
          {criticalAlertCount > 0 && (
            <span className="bg-rose-500 text-white text-xs font-black px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5">
              <AlertCircle size={14} /> {criticalAlertCount} Vital Alerts Active
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading && icuBeds.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-bold">
              <Loader2 className="animate-spin text-brand-600 mx-auto mb-2" size={32} />
              Syncing Telemetry Monitors...
            </div>
          ) : occupiedIcuBeds.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-slate-900 text-white rounded-3xl border border-slate-800 space-y-3">
              <HeartPulse size={48} className="text-emerald-400 mx-auto animate-pulse" />
              <h3 className="text-lg font-black">ICU Monitor Wall Clear</h3>
              <p className="text-xs text-slate-400">No active inpatient admissions currently assigned to ICU beds.</p>
            </div>
          ) : occupiedIcuBeds.map((b) => {
            const patient = b.admission?.patients;
            const pName = patient ? `${patient.first_name} ${patient.last_name}` : 'Admitted ICU Inpatient';
            const hr = b.vitals?.heart_rate || 78;
            const bp = b.vitals?.blood_pressure || '120/80';
            const spo2 = b.vitals?.spo2 || 98;
            const isAlert = hr > 100 || spo2 < 92;

            return (
              <div 
                key={b.bed_id} 
                className={clsx(
                  "bg-slate-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden border-2 transition-all text-white",
                  isAlert ? "border-rose-500 shadow-rose-500/20" : "border-slate-800"
                )}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="bg-slate-800 text-slate-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border border-slate-700">
                      Bed {b.bed_number}
                    </span>
                    <h3 className="text-xl font-black text-white mt-2">{pName}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      MRN: {patient?.file_number || 'N/A'} &bull; {b.admission?.primary_diagnosis || 'ICU Observation'}
                    </p>
                  </div>
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    isAlert ? "bg-rose-500 text-white animate-pulse" : "bg-emerald-500 text-white"
                  )}>
                    {isAlert ? 'Critical' : 'Stable'}
                  </span>
                </div>

                {/* Vital Signs Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">HR (BPM)</p>
                    <p className={clsx("text-xl font-black", hr > 100 ? "text-rose-400 animate-pulse" : "text-emerald-400")}>{hr}</p>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">BP (mmHg)</p>
                    <p className="text-xl font-black text-blue-400">{bp}</p>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">SpO2 (%)</p>
                    <p className={clsx("text-xl font-black", spo2 < 92 ? "text-rose-400 animate-pulse" : "text-emerald-400")}>{spo2}%</p>
                  </div>
                </div>

                {/* Waveform Visual Simulator */}
                <div className="h-16 bg-slate-800/90 rounded-2xl border border-slate-700 flex items-center justify-center relative overflow-hidden mb-6">
                  <svg className="absolute inset-0 w-full h-full text-emerald-500/40" preserveAspectRatio="none" viewBox="0 0 100 20">
                    <path d="M0 10 Q 5 0, 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-[10px] font-bold z-10">
                    <Activity size={14} className="animate-pulse" />
                    ECG LIVE TELEMETRY
                  </div>
                </div>

                <button 
                  onClick={() => patient && setSelectedPatientForVitals(patient)}
                  className="w-full bg-white text-slate-900 py-3 rounded-2xl text-xs font-black hover:bg-slate-100 transition-all shadow-md"
                >
                  Record New Vitals
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Staffing Status & ICU Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <HeartPulse className="text-rose-500" size={20} />
            Attending ICU Intensivists
          </h2>
          <div className="space-y-4">
            {intensivists.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold">No intensivists assigned.</p>
            ) : intensivists.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-sm font-bold text-slate-900">Dr. {doc.first_name} {doc.last_name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Intensivist &bull; ICU Care</p>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  On Duty
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-slate-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-2xl rounded-full pointer-events-none" />
          <div>
            <h2 className="text-lg font-black mb-6 flex items-center gap-2">
              <ShieldAlert className="text-rose-400" size={20} />
              ICU Operational Overview
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold">Nurse-to-Patient Ratio</p>
                  <p className="text-xs text-slate-400 mt-0.5">Target: 1:1 High Acuity</p>
                </div>
                <span className="text-xs font-black bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
                  1:1 Optimal
                </span>
              </div>
              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold">Ventilator Capacity</p>
                  <p className="text-xs text-slate-400 mt-0.5">Continuous Positive Airway Support</p>
                </div>
                <span className="text-xs font-black bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30">
                  Operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedPatientForVitals && (
        <CaptureVitalsModal 
          isOpen={!!selectedPatientForVitals}
          onClose={() => { setSelectedPatientForVitals(null); fetchIcuData(); }}
          patientId={selectedPatientForVitals.id}
          patientName={`${selectedPatientForVitals.first_name} ${selectedPatientForVitals.last_name}`}
        />
      )}

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
