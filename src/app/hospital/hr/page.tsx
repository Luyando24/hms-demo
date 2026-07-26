'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  Search, 
  Plus, 
  Calendar, 
  Clock, 
  UserCheck, 
  Briefcase, 
  Award, 
  TrendingUp, 
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Building
} from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";
import AddStaffModal from "@/components/hospital/AddStaffModal";
import StatusModal from "@/components/hospital/StatusModal";

interface StaffProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  created_at: string;
}

interface LeaveRequest {
  id: string;
  staff_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason?: string;
  profiles?: StaffProfile;
}

export default function HRDashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  // Real Database Metrics
  const [metrics, setMetrics] = useState({
    totalStaff: 0,
    doctorsCount: 0,
    nursesCount: 0,
    pharmacistsCount: 0,
    accountantsCount: 0,
    adminsCount: 0,
    pendingLeaveCount: 0,
    newHiresMonth: 0,
    spotlightStaff: null as StaffProfile | null
  });

  const supabase = createClient();

  useEffect(() => {
    fetchHRData();
  }, []);

  const fetchHRData = async () => {
    setLoading(true);

    try {
      // 1. Fetch All Staff Profiles from DB
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const profilesList: StaffProfile[] = allProfiles || [];
      setStaff(profilesList.slice(0, 8)); // Top 8 recent

      // Calculate Metrics from DB
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const total = profilesList.length;
      const docs = profilesList.filter(p => p.role === 'DOCTOR').length;
      const nurses = profilesList.filter(p => p.role === 'NURSE').length;
      const pharm = profilesList.filter(p => p.role === 'PHARMACIST').length;
      const acct = profilesList.filter(p => p.role === 'ACCOUNTANT').length;
      const admins = profilesList.filter(p => p.role === 'ADMIN').length;
      const newHires = profilesList.filter(p => p.created_at >= firstDayOfMonth).length;

      // 2. Fetch Leave Requests from DB
      const { data: rawLeave } = await supabase
        .from('leave_requests')
        .select('*, profiles(*)')
        .order('start_date', { ascending: false });

      const leaveList: LeaveRequest[] = rawLeave || [];
      setLeaveRequests(leaveList);
      const pendingLeave = leaveList.filter(l => l.status === 'PENDING').length;

      setMetrics({
        totalStaff: total,
        doctorsCount: docs,
        nursesCount: nurses,
        pharmacistsCount: pharm,
        accountantsCount: acct,
        adminsCount: admins,
        pendingLeaveCount: pendingLeave,
        newHiresMonth: newHires,
        spotlightStaff: profilesList[0] || null
      });

    } catch (err) {
      console.error('Error fetching HR data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeaveStatus = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      setStatusModal({ type: 'error', title: 'Update Failed', message: error.message });
    } else {
      setStatusModal({ 
        type: 'success', 
        title: 'Leave Request Updated', 
        message: `Leave request status changed to ${newStatus}.` 
      });
      fetchHRData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">HR & Workforce Management</h1>
          <p className="text-slate-500 mt-1 font-medium">Real database metrics for hospital personnel, leave requests, and staffing analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchHRData}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-3 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Sync HR
          </button>
          <Link 
            href="/hospital/staff"
            className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <Users size={18} />
            Staff Directory
          </Link>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-brand-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Register New Staff
          </button>
        </div>
      </div>

      {/* HR Database Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Staff Registered</p>
            <Users size={18} className="text-slate-400" />
          </div>
          <p className="text-3xl font-black text-slate-900">{metrics.totalStaff}</p>
          <p className="text-xs text-slate-500 font-bold mt-2">
            {metrics.doctorsCount} Doctors &bull; {metrics.nursesCount} Nurses
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active Clinical Staff</p>
            <UserCheck size={18} className="text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">{metrics.doctorsCount + metrics.nursesCount}</p>
          <p className="text-xs text-emerald-600 font-bold mt-2">Core Healthcare Workforce</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Leave Requests</p>
            <Calendar size={18} className="text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">{metrics.pendingLeaveCount}</p>
          <p className="text-xs text-amber-600 font-bold mt-2">Awaiting HR Review</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-wider">New Hires (This Month)</p>
            <Briefcase size={18} className="text-brand-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">{metrics.newHiresMonth}</p>
          <p className="text-xs text-brand-600 font-bold mt-2">Onboarded Recently</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Personnel Table & Leave Management */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recently Registered Staff */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">Recently Registered Personnel</h2>
                <p className="text-xs text-slate-400 font-medium">Live records from Supabase profiles table</p>
              </div>
              <Link href="/hospital/staff" className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1">
                View All Personnel <ExternalLink size={12} />
              </Link>
            </div>
            
            <div className="overflow-hidden border border-slate-200 rounded-2xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Member</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3 text-right">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                        Loading personnel records...
                      </td>
                    </tr>
                  ) : staff.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                        No personnel records found.
                      </td>
                    </tr>
                  ) : staff.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{row.first_name} {row.last_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {row.id.substring(0, 8)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                          row.role === 'DOCTOR' ? "bg-blue-50 text-blue-600" :
                          row.role === 'NURSE' ? "bg-emerald-50 text-emerald-600" :
                          row.role === 'ADMIN' ? "bg-purple-50 text-purple-600" : "bg-slate-100 text-slate-700"
                        )}>
                          {row.role || 'STAFF'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-xs text-slate-500 font-bold">
                          {new Date(row.created_at).toLocaleDateString()}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leave Requests Management */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">Staff Leave Requests</h2>
                <p className="text-xs text-slate-400 font-medium">Approve or reject time-off requests submitted by personnel</p>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-700 px-3 py-1 rounded-full">
                {metrics.pendingLeaveCount} Pending
              </span>
            </div>

            <div className="space-y-4">
              {leaveRequests.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 font-bold text-xs uppercase tracking-wider">
                  No active leave requests recorded.
                </div>
              ) : leaveRequests.map((req) => (
                <div key={req.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm">
                        {req.profiles ? `${req.profiles.first_name} ${req.profiles.last_name}` : 'Staff Member'}
                      </p>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                        {req.leave_type || 'Annual Leave'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Dates: <span className="font-bold text-slate-700">{req.start_date}</span> to <span className="font-bold text-slate-700">{req.end_date}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === 'PENDING' ? (
                      <>
                        <button 
                          onClick={() => handleUpdateLeaveStatus(req.id, 'APPROVED')}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button 
                          onClick={() => handleUpdateLeaveStatus(req.id, 'REJECTED')}
                          className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors flex items-center gap-1"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    ) : (
                      <span className={clsx(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase",
                        req.status === 'APPROVED' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {req.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar Spotlight & Role Breakdown */}
        <div className="space-y-8">
          
          {/* Staff Spotlight Card */}
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full" />
            <h2 className="text-lg font-black tracking-tight mb-6">Staff Spotlight</h2>
            
            {metrics.spotlightStaff ? (
              <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-black text-lg">
                  {metrics.spotlightStaff.first_name[0]}{metrics.spotlightStaff.last_name[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-100">{metrics.spotlightStaff.first_name} {metrics.spotlightStaff.last_name}</p>
                  <p className="text-xs text-brand-400 font-bold uppercase">{metrics.spotlightStaff.role}</p>
                </div>
                <Award className="text-amber-400 ml-auto" size={24} />
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">No personnel registered yet.</p>
            )}

            <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Active Doctors</span>
                <span className="font-bold text-slate-100">{metrics.doctorsCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Active Nurses</span>
                <span className="font-bold text-slate-100">{metrics.nursesCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Pharmacists</span>
                <span className="font-bold text-slate-100">{metrics.pharmacistsCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Accountants & Admins</span>
                <span className="font-bold text-slate-100">{metrics.accountantsCount + metrics.adminsCount}</span>
              </div>
            </div>
          </div>

          {/* Department Staff Distribution */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900">Workforce Analytics</h2>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Clinical Personnel Ratio</span>
                  <span>{metrics.totalStaff > 0 ? Math.round(((metrics.doctorsCount + metrics.nursesCount) / metrics.totalStaff) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-brand-600 h-2 rounded-full" 
                    style={{ width: `${metrics.totalStaff > 0 ? ((metrics.doctorsCount + metrics.nursesCount) / metrics.totalStaff) * 100 : 0}%` }} 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Administrative Ratio</span>
                  <span>{metrics.totalStaff > 0 ? Math.round(((metrics.accountantsCount + metrics.adminsCount) / metrics.totalStaff) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${metrics.totalStaff > 0 ? ((metrics.accountantsCount + metrics.adminsCount) / metrics.totalStaff) * 100 : 0}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddStaffModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchHRData} 
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
