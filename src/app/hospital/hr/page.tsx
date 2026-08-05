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
  Building,
  Calculator,
  DollarSign,
  FileText
} from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";
import AddStaffModal from "@/components/hospital/AddStaffModal";
import ProcessPayrollModal from "@/components/hospital/ProcessPayrollModal";
import StatusModal from "@/components/hospital/StatusModal";
import { formatCurrencyAmount } from "@/utils/currency";

interface StaffProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  staff_number?: string;
  created_at: string;
}

function normalizeStaffProfile(profile: {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  phone: string | null;
  staff_number: string | null;
  created_at: string | null;
}): StaffProfile {
  return {
    id: profile.id,
    first_name: profile.first_name || 'Unknown',
    last_name: profile.last_name || 'Staff',
    role: profile.role,
    phone: profile.phone || undefined,
    staff_number: profile.staff_number || undefined,
    created_at: profile.created_at || new Date(0).toISOString(),
  };
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

interface PayrollRecord {
  id: string;
  staff_id: string;
  pay_period: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: string;
  created_at: string;
  profiles?: StaffProfile;
}

export default function HRDashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  const [currencyConfig, setCurrencyConfig] = useState<{ symbol: string, position: 'prefix' | 'suffix' }>({ symbol: '$', position: 'prefix' });

  // Real Database Metrics
  const [metrics, setMetrics] = useState({
    totalStaff: 0,
    doctorsCount: 0,
    nursesCount: 0,
    pharmacistsCount: 0,
    pendingLeaveCount: 0,
    totalPayrollMonth: 0,
    spotlightStaff: null as StaffProfile | null
  });

  const supabase = createClient();

  useEffect(() => {
    fetchHRData();
    fetchCurrencyConfig();

    // Subscribe to realtime HR & Payroll channels
    const channel = supabase
      .channel('hr_payroll_live_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchHRData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => fetchHRData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll_records' }, () => fetchHRData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCurrencyConfig = async () => {
    const { data } = await supabase.from('system_settings').select('currency_symbol, currency_position').limit(1).maybeSingle();
    if (data) {
      setCurrencyConfig({
        symbol: data.currency_symbol || '$',
        position: (data.currency_position as 'prefix' | 'suffix') || 'prefix'
      });
    }
  };

  const fetchHRData = async () => {
    setLoading(true);

    try {
      // 1. Fetch All Staff Profiles (Excluding Patients)
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'PATIENT')
        .order('created_at', { ascending: false });

      const profilesList = (allProfiles || []).map(normalizeStaffProfile);
      setStaff(profilesList.slice(0, 8));

      const total = profilesList.length;
      const docs = profilesList.filter(p => p.role === 'DOCTOR').length;
      const nurses = profilesList.filter(p => p.role === 'NURSE').length;
      const pharm = profilesList.filter(p => p.role === 'PHARMACIST').length;

      // 2. Fetch Leave Requests from DB
      const { data: rawLeave } = await supabase
        .from('leave_requests')
        .select('*, profiles(*)')
        .order('start_date', { ascending: false });

      const leaveList: LeaveRequest[] = (rawLeave || []).map((request) => ({
        ...request,
        staff_id: request.staff_id || '',
        reason: request.reason || undefined,
        profiles: request.profiles ? normalizeStaffProfile(request.profiles) : undefined,
      }));
      setLeaveRequests(leaveList);
      const pendingLeave = leaveList.filter(l => l.status === 'PENDING').length;

      // 3. Fetch Payroll Records from DB
      const { data: rawPayroll } = await supabase
        .from('payroll_records')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false });

      const payList: PayrollRecord[] = (rawPayroll || []).map((record) => ({
        ...record,
        staff_id: record.staff_id || '',
        base_salary: record.base_salary || 0,
        allowances: record.allowances || 0,
        deductions: record.deductions || 0,
        net_salary: record.net_salary || 0,
        status: record.status || 'PENDING',
        created_at: record.created_at || new Date(0).toISOString(),
        profiles: record.profiles ? normalizeStaffProfile(record.profiles) : undefined,
      }));
      setPayrollRecords(payList);

      const totalPay = payList.reduce((sum, r) => sum + (r.net_salary || 0), 0);

      setMetrics({
        totalStaff: total,
        doctorsCount: docs,
        nursesCount: nurses,
        pharmacistsCount: pharm,
        pendingLeaveCount: pendingLeave,
        totalPayrollMonth: totalPay,
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
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">HR & Payroll Management</h1>
          <p className="text-slate-500 mt-1 font-medium">Workforce management, staff directory, leave requests, and monthly payroll disburser.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchHRData}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-3 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button 
            onClick={() => setIsPayrollModalOpen(true)}
            className="bg-emerald-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <Calculator size={18} />
            Process Payroll
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-brand-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Register Staff
          </button>
        </div>
      </div>

      {/* HR Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Personnel</p>
            <Users size={18} className="text-slate-400" />
          </div>
          <p className="text-3xl font-black text-slate-900">{metrics.totalStaff}</p>
          <p className="text-xs text-slate-500 font-bold mt-2">
            {metrics.doctorsCount} Doctors &bull; {metrics.nursesCount} Nurses
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Monthly Payroll</p>
            <DollarSign size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {formatCurrencyAmount(metrics.totalPayrollMonth, currencyConfig.symbol, currencyConfig.position)}
          </p>
          <p className="text-xs text-emerald-600 font-bold mt-2">{payrollRecords.length} Payslips Disbursed</p>
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
            <p className="text-xs font-bold text-brand-600 uppercase tracking-wider">Clinical Personnel Ratio</p>
            <UserCheck size={18} className="text-brand-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {metrics.totalStaff > 0 ? Math.round(((metrics.doctorsCount + metrics.nursesCount) / metrics.totalStaff) * 100) : 0}%
          </p>
          <p className="text-xs text-brand-600 font-bold mt-2">Core Medical Workforce</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Payroll Disbursed History & Staff Directory */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Payroll Disbursement Records */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Disbursed Staff Payroll Slips</h2>
                <p className="text-xs text-slate-400 font-medium">Calculated net salary disburser log</p>
              </div>
              <button 
                onClick={() => setIsPayrollModalOpen(true)}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Process New Payroll
              </button>
            </div>
            
            <div className="overflow-hidden border border-slate-200 rounded-2xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Staff Member</th>
                    <th className="px-6 py-3">Pay Period</th>
                    <th className="px-6 py-3">Net Salary</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                        Loading payroll records...
                      </td>
                    </tr>
                  ) : payrollRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                        No payroll records processed yet. Click &quot;Process Payroll&quot; to disburse.
                      </td>
                    </tr>
                  ) : payrollRecords.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">
                          {row.profiles ? `${row.profiles.first_name} ${row.profiles.last_name}` : 'Staff Member'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                          {row.profiles?.staff_number || `ID: ${row.id.substring(0, 8)}`}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-700">
                        {row.pay_period}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900">
                        {formatCurrencyAmount(row.net_salary, currencyConfig.symbol, currencyConfig.position)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                          {row.status || 'PROCESSED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leave Requests Management */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Staff Leave Requests</h2>
                <p className="text-xs text-slate-400 font-medium font-sans">Approve or reject time-off requests submitted by personnel</p>
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

        {/* Right Sidebar Personnel Directory & Role Ratios */}
        <div className="space-y-8">
          
          {/* Recent Personnel Summary */}
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full pointer-events-none" />
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black tracking-tight">Personnel Roster</h2>
              <Link href="/hospital/staff" className="text-xs text-brand-400 hover:underline font-bold flex items-center gap-1">
                Full Directory <ExternalLink size={12} />
              </Link>
            </div>
            
            <div className="space-y-3">
              {staff.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-xs">
                    {s.first_name?.[0]}{s.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-100">{s.first_name} {s.last_name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{s.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Calculator size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Monthly Payroll Desk</h3>
            <p className="text-sm text-slate-500 font-medium">Disburse staff salaries, track tax deductions, and export payslips.</p>
            <button 
              onClick={() => setIsPayrollModalOpen(true)}
              className="w-full mt-4 bg-emerald-600 text-white py-3 rounded-2xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Calculator size={16} /> Process Payroll Disbursal
            </button>
          </div>
        </div>
      </div>

      <AddStaffModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchHRData} 
      />

      <ProcessPayrollModal 
        isOpen={isPayrollModalOpen}
        onClose={() => setIsPayrollModalOpen(false)}
        onSuccess={fetchHRData}
        currencySymbol={currencyConfig.symbol}
        currencyPosition={currencyConfig.position}
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
