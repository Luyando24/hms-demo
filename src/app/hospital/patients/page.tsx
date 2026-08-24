'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  UserPlus, 
  Filter, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight,
  User,
  Phone,
  FileText,
  Calendar,
  ShieldCheck,
  Loader2,
  Edit2,
  Trash2,
  RefreshCw,
  X
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import RegisterPatientModal from '@/components/hospital/RegisterPatientModal';
import EditPatientModal from '@/components/hospital/EditPatientModal';
import StatusModal from '@/components/hospital/StatusModal';
import { deletePatientAction } from '@/app/hospital/actions';
import { Pagination } from '@/components/ui/Pagination';
import clsx from 'clsx';

export default function PatientsPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [addedTodayCount, setAddedTodayCount] = useState(0);
  const [insuredCount, setInsuredCount] = useState(0);

  // Filters State
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'male' | 'female'>('ALL');
  const [insuranceFilter, setInsuranceFilter] = useState<'ALL' | 'INSURED' | 'CASH'>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  const pageSize = 10;
  const supabase = createClient();

  useEffect(() => {
    fetchPatientMetrics();
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [page, search, genderFilter, insuranceFilter]);

  const fetchPatientMetrics = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Added Today
      const { count: todayCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());

      // Insured Patients Count
      const { count: insCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .not('insurance_provider', 'is', null)
        .neq('insurance_provider', '');

      setAddedTodayCount(todayCount || 0);
      setInsuredCount(insCount || 0);
    } catch (err) {
      console.error('Error fetching patient metrics:', err);
    }
  };

  const fetchPatients = async () => {
    setLoading(true);
    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,file_number.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (genderFilter !== 'ALL') {
      query = query.ilike('gender', genderFilter);
    }

    if (insuranceFilter === 'INSURED') {
      query = query.not('insurance_provider', 'is', null).neq('insurance_provider', '');
    } else if (insuranceFilter === 'CASH') {
      query = query.or('insurance_provider.is.null,insurance_provider.eq.');
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (!error) {
      setPatients(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const handleDeletePatient = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete patient ${name}?`)) {
      const res = await deletePatientAction(id);
      if (res.error) {
        setStatus({ type: 'error', title: 'Delete Failed', message: res.error });
      } else {
        setStatus({ type: 'success', title: 'Patient Removed', message: `${name} has been removed from the registry.` });
        fetchPatients();
        fetchPatientMetrics();
      }
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Users size={24} />
            </div>
            Patient Directory
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Comprehensive electronic medical records (EHR) registry.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { fetchPatients(); fetchPatientMetrics(); }}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button 
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98]"
          >
            <UserPlus size={20} />
            Register New Patient
          </button>
        </div>
      </div>

      {/* Real Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Registered</p>
              <h3 className="text-2xl font-black text-slate-900">{totalCount}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Registered Today</p>
              <h3 className="text-2xl font-black text-slate-900">{addedTodayCount}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Insured Patients</p>
              <h3 className="text-2xl font-black text-slate-900">{insuredCount}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Dynamic Filters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Search by name, file number, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Gender Filter */}
          <select 
            value={genderFilter}
            onChange={(e) => { setGenderFilter(e.target.value as any); setPage(1); }}
            className="px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="ALL">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>

          {/* Insurance Filter */}
          <select 
            value={insuranceFilter}
            onChange={(e) => { setInsuranceFilter(e.target.value as any); setPage(1); }}
            className="px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="ALL">All Payment Types</option>
            <option value="INSURED">Insured Only</option>
            <option value="CASH">Cash / Self-Pay</option>
          </select>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">File Number</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender / Age</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Insurance / Billing</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-brand-600" size={32} />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading patient records...</p>
                    </div>
                  </td>
                </tr>
              ) : patients.length > 0 ? (
                patients.map((patient) => {
                  const age = patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'N/A';
                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <Link href={`/hospital/patients/${patient.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
                            {patient.first_name?.[0]}{patient.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 capitalize">{patient.first_name} {patient.last_name}</p>
                            <p className="text-xs text-slate-400 font-medium">Added on {new Date(patient.created_at).toLocaleDateString()}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                          {patient.file_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-700 capitalize">{patient.gender || 'N/A'}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{age} years old</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                            <Phone size={12} className="text-slate-400" />
                            {patient.phone || 'N/A'}
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium pl-5">{patient.email || 'No email provided'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {patient.insurance_provider ? (
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-brand-600">{patient.insurance_provider}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Policy: {patient.insurance_policy_number || 'N/A'}</p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Self-Pay / Cash</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/hospital/patients/${patient.id}`}
                            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                            title="View Patient Record"
                          >
                            <FileText size={16} />
                          </Link>
                          <button 
                            onClick={() => setEditingPatient(patient)}
                            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                            title="Edit Patient"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeletePatient(patient.id, `${patient.first_name} ${patient.last_name}`)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Patient"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="max-w-xs mx-auto space-y-4">
                      <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto">
                        <Users size={32} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900">No Patients Found</h3>
                        <p className="text-sm text-slate-400 mt-1">We couldn&apos;t find any patient records matching your search criteria.</p>
                      </div>
                      <button 
                        onClick={() => {
                          setSearch('');
                          setGenderFilter('ALL');
                          setInsuranceFilter('ALL');
                          setPage(1);
                        }}
                        className="text-brand-600 text-sm font-black uppercase tracking-widest"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          itemName="patients"
        />
      </div>

      <RegisterPatientModal 
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => {
          setIsRegisterModalOpen(false);
          fetchPatients();
          fetchPatientMetrics();
        }}
      />

      {editingPatient && (
        <EditPatientModal
          isOpen={!!editingPatient}
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSuccess={() => {
            setEditingPatient(null);
            fetchPatients();
            fetchPatientMetrics();
          }}
        />
      )}

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
