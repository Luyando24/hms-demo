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
  Filter,
  RefreshCw,
  KeyRound,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";

import AddStaffModal from "@/components/hospital/AddStaffModal";
import EditStaffModal from "@/components/hospital/EditStaffModal";
import ChangeStaffPasswordModal from "@/components/hospital/ChangeStaffPasswordModal";
import StatusModal from "@/components/hospital/StatusModal";
import { Pagination } from "@/components/ui/Pagination";
import { deleteStaffAction } from "@/app/hospital/actions";

const PAGE_SIZE = 10;

export default function StaffDirectory() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [passwordTargetStaff, setPasswordTargetStaff] = useState<any>(null);
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Medical & Operational Staff</h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">Manage hospital doctors, nurses, administrative personnel, and system privileges.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchStaff}
            className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
          >
            <UserPlus size={14} />
            Register New Staff
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input 
            type="text" 
            placeholder="Search by staff name, ID (e.g. MED-DOC-7X9K), or email..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
          />
        </div>
        
        <div className="w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-auto px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Staff Roles</option>
            <option value="DOCTOR">Medical Doctors</option>
            <option value="NURSE">Nurses & Clinical Staff</option>
            <option value="RECEPTIONIST">Receptionists</option>
            <option value="PHARMACIST">Pharmacists</option>
            <option value="ACCOUNTANT">Accountants & Billing</option>
            <option value="WAITING_ROOM">Waiting Room Displays</option>
            <option value="ADMIN">System Administrators</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-4 py-2.5">Employee</th>
                <th className="px-4 py-2.5">Role & Staff ID</th>
                <th className="px-4 py-2.5">Contact Info</th>
                <th className="px-4 py-2.5">Join Date</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="h-4 bg-slate-100 rounded w-3/4 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Users className="mx-auto text-slate-300 mb-2" size={32} />
                    <p className="text-xs font-medium text-slate-400">No medical or operational staff found</p>
                  </td>
                </tr>
              ) : staff.map((member) => {
                const staffIdDisplay = member.staff_number || `HMS-${member.role?.slice(0, 3)}-${member.id.slice(0, 6).toUpperCase()}`;

                return (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{member.first_name} {member.last_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">UUID: {member.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <span className={clsx(
                          "px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider inline-flex items-center gap-1",
                          member.role === 'DOCTOR' ? "bg-purple-50 text-purple-700 border border-purple-200/60" :
                          member.role === 'NURSE' ? "bg-blue-50 text-blue-700 border border-blue-200/60" :
                          member.role === 'ADMIN' ? "bg-rose-50 text-rose-700 border border-rose-200/60" :
                          member.role === 'WAITING_ROOM' ? "bg-amber-50 text-amber-700 border border-amber-200/60" :
                          "bg-slate-100 text-slate-700 border border-slate-200"
                        )}>
                          <span className={clsx(
                            "w-1 h-1 rounded-full",
                            member.role === 'DOCTOR' ? "bg-purple-500" :
                            member.role === 'NURSE' ? "bg-blue-500" :
                            member.role === 'ADMIN' ? "bg-rose-500" :
                            member.role === 'WAITING_ROOM' ? "bg-amber-500" :
                            "bg-slate-400"
                          )} />
                          {member.role || 'STAFF'}
                        </span>
                        <p className="text-xs font-mono font-semibold text-slate-800 tracking-tight">
                          {staffIdDisplay}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Mail size={11} className="text-slate-400" />
                          <span className="text-[11px]">{member.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} className="text-slate-400" />
                          <span className="text-[11px]">{member.phone || 'No phone'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-500 font-normal">
                        {new Date(member.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setPasswordTargetStaff(member)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Change Staff Password"
                        >
                          <KeyRound size={13} />
                        </button>
                        <button 
                          onClick={() => setEditingStaff(member)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Staff Member"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteStaff(member)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Staff Member"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemName="staff"
        />
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

      {passwordTargetStaff && (
        <ChangeStaffPasswordModal
          isOpen={!!passwordTargetStaff}
          staffMember={passwordTargetStaff}
          onClose={() => setPasswordTargetStaff(null)}
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
