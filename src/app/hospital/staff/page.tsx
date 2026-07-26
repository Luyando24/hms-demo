'use client'

import { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Search, 
  Mail, 
  Phone, 
  Shield, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  RefreshCw
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";

import AddStaffModal from "@/components/hospital/AddStaffModal";
import EditStaffModal from "@/components/hospital/EditStaffModal";
import StatusModal from "@/components/hospital/StatusModal";
import { deleteStaffAction } from "@/app/hospital/actions";

const PAGE_SIZE = 10;

export default function StaffDirectory() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchStaff();

    const channel = supabase
      .channel('staff_directory_live_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchStaff())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPage, searchQuery, roleFilter]);

  const fetchStaff = async () => {
    setLoading(true);
    
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // CRITICAL: Filter out PATIENT profiles so ONLY staff are listed
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .neq('role', 'PATIENT');

    if (roleFilter !== 'ALL') {
      query = query.eq('role', roleFilter);
    }

    if (searchQuery) {
      query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,staff_number.ilike.%${searchQuery}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data) {
      setStaff(data);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const handleDeleteStaff = async (member: any) => {
    if (!confirm(`Are you sure you want to remove staff member ${member.first_name} ${member.last_name}?`)) return;

    const res = await deleteStaffAction(member.id);
    if (res.error) {
      setStatusModal({ type: 'error', title: 'Delete Failed', message: res.error });
    } else {
      setStatusModal({ type: 'success', title: 'Staff Member Removed', message: `${member.first_name} ${member.last_name} has been removed from staff directory.` });
      fetchStaff();
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Medical & Operational Staff</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage hospital doctors, nurses, administrative personnel, and system privileges.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchStaff}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-brand-600 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 flex items-center gap-2"
          >
            <UserPlus size={18} />
            Register New Staff
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search by staff name, ID (e.g. MED-DOC-7X9K), or email..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        
        <div className="w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-auto px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Staff Roles</option>
            <option value="DOCTOR">Medical Doctors</option>
            <option value="NURSE">Nurses & Clinical Staff</option>
            <option value="PHARMACIST">Pharmacists</option>
            <option value="ACCOUNTANT">Accountants & Billing</option>
            <option value="ADMIN">System Administrators</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role & Secure Staff ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Join Date</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8">
                      <div className="h-4 bg-slate-100 rounded w-3/4 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <Users className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No medical or operational staff found</p>
                  </td>
                </tr>
              ) : staff.map((member) => {
                const staffIdDisplay = member.staff_number || `HMS-${member.role?.slice(0, 3)}-${member.id.slice(0, 6).toUpperCase()}`;

                return (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-black text-xs border border-brand-100">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{member.first_name} {member.last_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">UUID: {member.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className={clsx(
                          "px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                          member.role === 'DOCTOR' ? "bg-purple-100 text-purple-700" :
                          member.role === 'NURSE' ? "bg-blue-100 text-blue-700" :
                          member.role === 'ADMIN' ? "bg-rose-100 text-rose-700" :
                          "bg-slate-100 text-slate-700"
                        )}>
                          {member.role || 'STAFF'}
                        </span>
                        <p className="text-xs font-mono font-bold text-slate-900 tracking-tight">
                          {staffIdDisplay}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Mail size={12} className="text-slate-400" />
                          <span>{member.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={12} className="text-slate-400" />
                          <span>{member.phone || 'No phone'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-500 uppercase">
                        {new Date(member.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingStaff(member)}
                          className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Edit Staff Member"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteStaff(member)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Staff Member"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Showing <span className="text-slate-900">{staff.length}</span> of <span className="text-slate-900">{totalCount}</span> medical staff
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1 || loading}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button 
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={clsx(
                      "w-8 h-8 rounded-xl text-xs font-black transition-all",
                      currentPage === pageNum 
                        ? "bg-brand-600 text-white shadow-md shadow-brand-500/20" 
                        : "text-slate-500 hover:bg-white hover:text-slate-900"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="text-slate-300 px-1">...</span>}
            </div>
            <button 
              disabled={currentPage === totalPages || loading}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <AddStaffModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchStaff} 
      />

      {editingStaff && (
        <EditStaffModal
          isOpen={!!editingStaff}
          staffMember={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSuccess={fetchStaff}
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
