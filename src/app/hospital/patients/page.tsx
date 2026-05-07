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
  Loader2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import RegisterPatientModal from '@/components/hospital/RegisterPatientModal';

export default function PatientsPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const pageSize = 10;
  
  const supabase = createClient();

  useEffect(() => {
    fetchPatients();
  }, [page, search]);

  const fetchPatients = async () => {
    setLoading(true);
    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,file_number.ilike.%${search}%`);
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

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Users size={24} />
            </div>
            Patient Directory
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Manage and view all registered patient records.</p>
        </div>
        <button 
          onClick={() => setIsRegisterModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98]"
        >
          <UserPlus size={20} />
          Register New Patient
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Patients</p>
              <h3 className="text-2xl font-black text-slate-900">{totalCount}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Added Today</p>
              <h3 className="text-2xl font-black text-slate-900">0</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Insured Patients</p>
              <h3 className="text-2xl font-black text-slate-900">
                {patients.filter(p => p.insurance_provider).length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Search by name or file number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all">
          <Filter size={18} />
          Filters
        </button>
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
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Insurance</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-brand-600" size={32} />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading records...</p>
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
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold">
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
                          <p className="text-xs font-bold text-slate-700 capitalize">{patient.gender}</p>
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
                            <p className="text-[10px] text-slate-400 font-medium">Policy: {patient.insurance_policy_number}</p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Cash Basis</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200">
                          <MoreVertical size={18} />
                        </button>
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
                        <p className="text-sm text-slate-400 mt-1">We couldn't find any patient records matching your search criteria.</p>
                      </div>
                      <button 
                        onClick={() => {
                          setSearch('');
                          setPage(1);
                        }}
                        className="text-brand-600 text-sm font-black uppercase tracking-widest"
                      >
                        Clear Search
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-slate-50 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-900">{(page - 1) * pageSize + 1}</span> to <span className="text-slate-900">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-slate-900">{totalCount}</span> records
            </p>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(prev => prev - 1)}
                className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                      page === i + 1 
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(prev => prev + 1)}
                className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      <RegisterPatientModal 
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => {
          setIsRegisterModalOpen(false);
          fetchPatients();
        }}
      />
    </div>
  );
}
