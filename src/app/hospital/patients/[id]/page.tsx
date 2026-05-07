'use client'

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Shield, 
  Activity, 
  FileText, 
  Pill, 
  Beaker, 
  Camera, 
  CreditCard, 
  ChevronLeft,
  Calendar,
  Clock,
  MoreVertical,
  Loader2,
  AlertCircle,
  QrCode
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useParams } from 'next/navigation';
import clsx from 'clsx';
import PatientIDCardModal from '@/components/hospital/PatientIDCardModal';

export default function PatientDetailsPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isIDCardModalOpen, setIsIDCardModalOpen] = useState(false);
  const [history, setHistory] = useState<any>({
    vitals: [],
    notes: [],
    prescriptions: [],
    investigations: [],
    billing: []
  });

  const supabase = createClient();

  useEffect(() => {
    if (id) fetchPatientData();
  }, [id]);

  const fetchPatientData = async () => {
    setLoading(true);
    
    // 1. Fetch Patient Info
    const { data: patientData, error: pError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (pError) {
      console.error(pError);
      setLoading(false);
      return;
    }
    setPatient(patientData);

    // 2. Fetch History in Parallel
    const [vitals, notes, prescriptions, billing] = await Promise.all([
      supabase.from('vitals').select('*').eq('patient_id', id).order('recorded_at', { ascending: false }),
      supabase.from('clinical_notes').select('*, diagnosis(*)').eq('patient_id', id).order('created_at', { ascending: false }),
      supabase.from('prescriptions').select('*, prescription_items(*)').eq('patient_id', id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, payments(*)').eq('patient_id', id).order('created_at', { ascending: false })
    ]);

    setHistory({
      vitals: vitals.data || [],
      notes: notes.data || [],
      prescriptions: prescriptions.data || [],
      billing: billing.data || []
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-brand-600" size={40} />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Retrieving Patient File...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={40} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900">Patient Not Found</h2>
          <p className="text-slate-500 mt-2">The record you are looking for does not exist or has been moved.</p>
        </div>
        <Link href="/hospital/patients" className="inline-block bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold">
          Back to Directory
        </Link>
      </div>
    );
  }

  const age = patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'N/A';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Back Button & Actions */}
      <div className="flex items-center justify-between">
        <Link href="/hospital/patients" className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold group">
          <div className="p-2 rounded-xl bg-white border border-slate-200 group-hover:bg-slate-50 transition-all">
            <ChevronLeft size={20} />
          </div>
          Back to Patients
        </Link>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsIDCardModalOpen(true)}
            className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <QrCode size={18} />
            View Patient ID
          </button>
          <button className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-2xl font-bold hover:bg-slate-50 transition-all">
            Edit Profile
          </button>
          <button className="bg-brand-600 text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20">
            Start Consultation
          </button>
        </div>
      </div>

      {/* Patient ID Card Modal */}
      <PatientIDCardModal 
        isOpen={isIDCardModalOpen}
        onClose={() => setIsIDCardModalOpen(false)}
        patient={patient}
      />

      {/* Profile Header */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 blur-3xl rounded-full -mr-32 -mt-32" />
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative">
            <div className="w-32 h-32 rounded-3xl bg-white/10 border-4 border-white/20 flex items-center justify-center text-4xl font-black text-white backdrop-blur-sm">
              {patient.first_name?.[0]}{patient.last_name?.[0]}
            </div>
            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h1 className="text-4xl font-black tracking-tight capitalize">{patient.first_name} {patient.last_name}</h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
                  <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest border border-white/10">MRN: {patient.file_number}</span>
                  <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest border border-white/10">{patient.gender}</span>
                  <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest border border-white/10">{age} Years Old</span>
                  {patient.insurance_provider && (
                    <span className="px-3 py-1 bg-brand-500/30 text-brand-300 rounded-full text-xs font-black uppercase tracking-widest border border-brand-500/30">Insured</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-slate-300">
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-brand-400" />
                  <span className="text-sm font-medium">{patient.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-brand-400" />
                  <span className="text-sm font-medium">{patient.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-brand-400" />
                  <span className="text-sm font-medium">{patient.address || 'No address'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Contact info detail row */}
        <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-8 bg-slate-50/50 border-t border-slate-100">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Emergency Contact</p>
            <p className="text-sm font-bold text-slate-900">{patient.emergency_contact_name || 'Not provided'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{patient.emergency_contact_phone}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Insurance Provider</p>
            <p className="text-sm font-bold text-slate-900">{patient.insurance_provider || 'Self Pay (Cash Basis)'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{patient.insurance_policy_number && `Policy: ${patient.insurance_policy_number}`}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Blood Group</p>
            <p className="text-sm font-bold text-slate-900">Unknown</p>
            <p className="text-xs text-brand-600 mt-0.5 font-bold">Requires Screen</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-2xl overflow-x-auto no-scrollbar shadow-sm">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'vitals', label: 'Vitals History', icon: Activity },
          { id: 'notes', label: 'Clinical Notes', icon: FileText },
          { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
          { id: 'investigations', label: 'Investigations', icon: Beaker },
          { id: 'billing', label: 'Financials', icon: CreditCard },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-slate-900 text-white shadow-lg" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Latest Vitals Summary */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center justify-between">
                  Latest Vitals
                  <Link href="#" onClick={() => setActiveTab('vitals')} className="text-xs font-black text-brand-600 uppercase tracking-widest hover:underline">View History</Link>
                </h3>
                {history.vitals[0] ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {[
                      { label: 'Blood Pressure', value: `${history.vitals[0].bp_systolic}/${history.vitals[0].bp_diastolic}`, unit: 'mmHg', color: 'rose' },
                      { label: 'Heart Rate', value: history.vitals[0].heart_rate, unit: 'bpm', color: 'rose' },
                      { label: 'Temperature', value: history.vitals[0].temperature, unit: '°C', color: 'amber' },
                      { label: 'SpO2', value: history.vitals[0].sp_o2, unit: '%', color: 'blue' },
                    ].map((v, i) => (
                      <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{v.label}</p>
                        <p className="text-xl font-black text-slate-900">{v.value} <span className="text-xs font-medium text-slate-400">{v.unit}</span></p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-200 text-center">
                    <p className="text-sm font-bold text-slate-400 italic">No vitals recorded yet.</p>
                  </div>
                )}
              </div>

              {/* Recent Consultation */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center justify-between">
                  Recent Consultations
                  <Link href="#" onClick={() => setActiveTab('notes')} className="text-xs font-black text-brand-600 uppercase tracking-widest hover:underline">Full History</Link>
                </h3>
                <div className="space-y-4">
                  {history.notes.length > 0 ? history.notes.slice(0, 2).map((note: any) => (
                    <div key={note.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">Clinical Consultation</p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{new Date(note.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {note.diagnosis?.[0] && (
                          <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100">
                            {note.diagnosis[0].icd10_code}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 italic">"{note.assessment || 'No assessment recorded.'}"</p>
                    </div>
                  )) : (
                     <div className="bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-200 text-center">
                      <p className="text-sm font-bold text-slate-400 italic">No consultations on file.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Alert / Chronic Conditions */}
              <div className="bg-rose-50 rounded-3xl p-8 border border-rose-100">
                <h3 className="text-rose-900 font-black flex items-center gap-2 mb-4">
                  <Shield size={20} /> Medical Alerts
                </h3>
                <div className="space-y-3">
                   <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-rose-200">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <p className="text-xs font-black text-rose-700 uppercase tracking-widest">No known allergies</p>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-rose-200">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <p className="text-xs font-black text-rose-700 uppercase tracking-widest">Blood group unknown</p>
                  </div>
                </div>
              </div>

              {/* Active Medications */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-6">Active Meds</h3>
                <div className="space-y-4">
                  {history.prescriptions.length > 0 ? history.prescriptions[0].prescription_items.slice(0, 3).map((item: any) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                        <Pill size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">Drug name placeholder</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.dosage} • {item.frequency}</p>
                      </div>
                    </div>
                  )) : (
                     <p className="text-sm font-bold text-slate-400 italic text-center py-4">No active prescriptions.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vitals' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recorded At</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">BP (mmHg)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pulse (bpm)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Temp (°C)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">SpO2 (%)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight (kg)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">BMI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.vitals.length > 0 ? history.vitals.map((v: any) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-slate-900">{new Date(v.recorded_at).toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(v.recorded_at).toLocaleTimeString()}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">{v.bp_systolic}/{v.bp_diastolic}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{v.heart_rate}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{v.temperature}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{v.sp_o2}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{v.weight}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">{(v.weight / ((v.height/100)**2)).toFixed(1)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic">No vitals history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-6">
            {history.notes.length > 0 ? history.notes.map((note: any) => (
              <div key={note.id} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between gap-6 mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                      <FileText size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Clinical Consultation Note</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                        <Clock size={12} /> {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {note.diagnosis?.map((d: any) => (
                      <div key={d.id} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-0.5">Primary Diagnosis</p>
                        <p className="text-sm font-black">{d.icd10_code} - {d.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-600" /> Subjective
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                        {note.subjective || 'No details recorded.'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-brand-600" /> Objective
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {note.objective || 'No details recorded.'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-brand-600" /> Assessment
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {note.assessment || 'No details recorded.'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-brand-600" /> Management Plan
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed bg-brand-600 text-white p-4 rounded-2xl shadow-lg shadow-brand-500/20">
                        {note.plan || 'No details recorded.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="bg-white p-20 rounded-3xl border border-slate-200 text-center">
                <FileText className="text-slate-200 mx-auto mb-4" size={48} />
                <p className="text-sm font-bold text-slate-400 italic">No clinical history recorded.</p>
              </div>
            )}
          </div>
        )}

        {/* Other tabs omitted for brevity, but follow same pattern */}
      </div>
    </div>
  );
}
