'use client'

import { useState, useEffect } from "react";
import { 
  Users, 
  Activity, 
  BedDouble, 
  TrendingUp, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Box, 
  Droplet, 
  FileText, 
  RefreshCw,
  X,
  ShieldAlert,
  CheckCircle2,
  Filter
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { formatCurrencyAmount } from "@/utils/currency";
import clsx from "clsx";

interface AlertLog {
  id: string;
  title: string;
  category: 'ER' | 'INVENTORY' | 'BLOOD' | 'ADMISSION' | 'LAB' | 'BILLING';
  time: string;
  timestamp: string;
  level: 'critical' | 'warning' | 'info';
  details: string;
}

interface WeeklyDayMetric {
  day: string;
  er: number;
  ipd: number;
}

export default function HospitalDashboard() {
  const [loading, setLoading] = useState(true);
  const [currencyConfig, setCurrencyConfig] = useState<{ symbol: string, position: 'prefix' | 'suffix' }>({ symbol: '$', position: 'prefix' });

  // Live Metrics State
  const [metrics, setMetrics] = useState({
    activeErCases: 0,
    criticalErCases: 0,
    ipdOccupancyPct: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    todaysRevenue: 0,
    staffOnDuty: 0,
    doctorCount: 0,
    nurseCount: 0,
  });

  // Weekly Admissions Chart State
  const [weeklyChartData, setWeeklyChartData] = useState<WeeklyDayMetric[]>([]);
  const [maxChartVal, setMaxChartVal] = useState(10);
  const [peakDay, setPeakDay] = useState<string>('Today');

  // Critical Alerts State
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'critical' | 'warning' | 'info'>('ALL');
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();

    // Setup realtime channels for live metric & alert updates
    const channel = supabase
      .channel('dashboard-live-metrics-clean')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walkin_queue' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admissions' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_inventory' }, () => fetchDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      // 1. Fetch Currency Settings
      const { data: sysSettings } = await supabase
        .from('system_settings')
        .select('currency_symbol, currency_position')
        .single();
      
      if (sysSettings) {
        setCurrencyConfig({
          symbol: sysSettings.currency_symbol || '$',
          position: (sysSettings.currency_position as 'prefix' | 'suffix') || 'prefix'
        });
      }

      // 2. Fetch ER Cases & Emergency Queue
      const { count: erCount } = await supabase
        .from('walkin_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'WAITING');

      const { count: criticalErCount } = await supabase
        .from('walkin_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'WAITING')
        .eq('priority', 'EMERGENCY');

      // 3. Fetch Bed Occupancy (Admissions vs Total Beds)
      const { count: totalBedsCount } = await supabase
        .from('beds')
        .select('*', { count: 'exact', head: true });

      const { count: occupiedBedsCount } = await supabase
        .from('admissions')
        .select('*', { count: 'exact', head: true })
        .is('discharge_date', null);

      const totalBeds = totalBedsCount && totalBedsCount > 0 ? totalBedsCount : 30;
      const occupiedBeds = occupiedBedsCount || 0;
      const occupancyPct = Math.round((occupiedBeds / totalBeds) * 100);

      // 4. Fetch Today's Revenue from Payments
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', todayStart.toISOString());

      const revenueSum = (todayPayments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // 5. Fetch Staff Counts
      const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('role');

      const docs = (staffProfiles || []).filter(s => s.role === 'DOCTOR').length;
      const nurses = (staffProfiles || []).filter(s => s.role === 'NURSE').length;
      const totalStaff = (staffProfiles || []).length;

      setMetrics({
        activeErCases: erCount || 0,
        criticalErCases: criticalErCount || 0,
        ipdOccupancyPct: occupancyPct,
        totalBeds: totalBeds,
        occupiedBeds: occupiedBeds,
        todaysRevenue: revenueSum,
        staffOnDuty: totalStaff,
        doctorCount: docs,
        nurseCount: nurses
      });

      // 6. Calculate Weekly Admissions & Queue Chart Data
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const past7Days: WeeklyDayMetric[] = [];
      const now = new Date();

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data: rawWalkins } = await supabase
        .from('walkin_queue')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      const { data: rawAdmissions } = await supabase
        .from('admissions')
        .select('admission_date')
        .gte('admission_date', sevenDaysAgo.toISOString());

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dayLabel = days[d.getDay()];
        const dateStr = d.toISOString().split('T')[0];

        const erForDay = (rawWalkins || []).filter(w => w.created_at?.startsWith(dateStr)).length;
        const ipdForDay = (rawAdmissions || []).filter(a => a.admission_date?.startsWith(dateStr)).length;

        past7Days.push({
          day: dayLabel,
          er: erForDay,
          ipd: ipdForDay
        });
      }

      setWeeklyChartData(past7Days);

      let highestVal = 10;
      let highestDay = 'Today';
      past7Days.forEach(item => {
        const total = item.er + item.ipd;
        if (total > highestVal) {
          highestVal = total;
          highestDay = item.day;
        }
      });
      setMaxChartVal(Math.max(highestVal, 10));
      setPeakDay(highestDay);

      // 7. Build Operational Alerts Stream
      const liveAlerts: AlertLog[] = [];

      // Emergency Triage Queue Alerts
      const { data: emergencyQueue } = await supabase
        .from('walkin_queue')
        .select('*, patients(*)')
        .order('created_at', { ascending: false })
        .limit(5);

      (emergencyQueue || []).forEach(item => {
        const patientName = item.patients ? `${item.patients.first_name} ${item.patients.last_name}` : 'Walk-in Patient';
        const isEmergency = item.priority === 'EMERGENCY';
        liveAlerts.push({
          id: `er-${item.id}`,
          title: `${isEmergency ? 'Emergency Triage' : 'Walk-in Registration'}: ${patientName}`,
          category: 'ER',
          time: formatTimeAgo(item.created_at),
          timestamp: item.created_at,
          level: isEmergency ? 'critical' : 'info',
          details: `Patient registered for ${item.department || 'General OPD'}. Priority: ${item.priority || 'NORMAL'}. Chief Complaint: ${item.reason || 'Routine Consultation'}`
        });
      });

      // Low Inventory Stock Alerts
      const { data: inventoryData } = await supabase
        .from('inventory_items')
        .select('*')
        .order('quantity', { ascending: true })
        .limit(5);

      (inventoryData || []).forEach(item => {
        const isCritical = item.quantity <= (item.min_reorder_level || 10);
        liveAlerts.push({
          id: `inv-${item.id}`,
          title: `Low Stock: ${item.item_name} (${item.category || 'Pharmacy'})`,
          category: 'INVENTORY',
          time: formatTimeAgo(item.updated_at),
          timestamp: item.updated_at || new Date().toISOString(),
          level: isCritical ? 'critical' : 'warning',
          details: `Current stock: ${item.quantity} ${item.unit || 'units'} (Reorder Level: ${item.min_reorder_level || 10}). Location: ${item.location || 'Central Pharmacy'}`
        });
      });

      // Blood Bank Supply Alerts
      const { data: bloodData } = await supabase
        .from('blood_inventory')
        .select('*')
        .order('units_in_stock', { ascending: true })
        .limit(3);

      (bloodData || []).forEach(item => {
        const isLow = item.units_in_stock <= 5;
        liveAlerts.push({
          id: `blood-${item.id}`,
          title: `Blood Bank Supply: Group ${item.blood_group}`,
          category: 'BLOOD',
          time: 'Active Notice',
          timestamp: new Date().toISOString(),
          level: isLow ? 'critical' : 'info',
          details: `${item.units_in_stock} unit(s) available in blood bank storage.`
        });
      });

      // Inpatient Admissions
      const { data: recentAdmissions } = await supabase
        .from('admissions')
        .select('*, patients(*), beds(*)')
        .order('admission_date', { ascending: false })
        .limit(4);

      (recentAdmissions || []).forEach(item => {
        const pName = item.patients ? `${item.patients.first_name} ${item.patients.last_name}` : 'Patient';
        const bedInfo = item.beds ? `Bed ${item.beds.bed_number}` : 'IPD Ward';
        liveAlerts.push({
          id: `adm-${item.id}`,
          title: `Inpatient Admission: ${pName}`,
          category: 'ADMISSION',
          time: formatTimeAgo(item.admission_date),
          timestamp: item.admission_date,
          level: 'info',
          details: `Assigned to ${bedInfo}. Primary Diagnosis: ${item.primary_diagnosis || 'Under Observation'}`
        });
      });

      liveAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAlerts(liveAlerts);
    } catch (err) {
      console.error('Error loading dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  function formatTimeAgo(dateStr: string | null) {
    if (!dateStr) return 'Just now';
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diff / 86400)} day(s) ago`;
  }

  const criticalCount = alerts.filter(a => a.level === 'critical').length;
  const filteredAlerts = alerts.filter(a => logFilter === 'ALL' || a.level === logFilter);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Hospital Overview</h1>
          <p className="text-slate-500 mt-1 font-medium">Real-time operational status and clinical metrics for HMSdemo Hospital.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDashboardData}
            className="flex items-center gap-2 text-sm font-bold px-3.5 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <span className="flex items-center gap-2 text-sm font-bold px-3.5 py-2 bg-emerald-100 text-emerald-800 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            System Operational
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* ER Cases Metric */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Activity size={24} strokeWidth={2.5} />
            </div>
            <span className="flex items-center text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Active Triage
            </span>
          </div>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Active Triage Cases</h3>
          <p className="text-3xl font-black text-slate-900">{metrics.activeErCases}</p>
          <p className="text-xs text-rose-600 font-bold mt-2 flex items-center gap-1">
            <AlertCircle size={14} /> {metrics.criticalErCases} Emergency Priority
          </p>
        </div>

        {/* IPD Occupancy Metric */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <BedDouble size={24} strokeWidth={2.5} />
            </div>
            <span className="flex items-center text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {metrics.occupiedBeds} / {metrics.totalBeds} Beds
            </span>
          </div>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">IPD Bed Occupancy</h3>
          <p className="text-3xl font-black text-slate-900">{metrics.ipdOccupancyPct}%</p>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 mb-1 overflow-hidden">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(metrics.ipdOccupancyPct, 100)}%` }} 
            />
          </div>
          <p className="text-xs text-slate-400 font-bold">{Math.max(0, metrics.totalBeds - metrics.occupiedBeds)} beds available</p>
        </div>

        {/* Today's Revenue Metric */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp size={24} strokeWidth={2.5} />
            </div>
            <span className="flex items-center text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Settled Today
            </span>
          </div>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Today's Revenue</h3>
          <p className="text-3xl font-black text-slate-900">
            {formatCurrencyAmount(metrics.todaysRevenue, currencyConfig.symbol, currencyConfig.position)}
          </p>
          <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
            <CheckCircle2 size={14} /> Payments Verified
          </p>
        </div>

        {/* Staff on Duty Metric */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Staffing
            </span>
          </div>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Active Personnel</h3>
          <p className="text-3xl font-black text-slate-900">{metrics.staffOnDuty}</p>
          <p className="text-xs text-slate-400 font-bold mt-2">
            {metrics.doctorCount} Doctors &bull; {metrics.nurseCount} Nurses
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Visual Analytics Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900">Weekly Patient Volume</h2>
              <p className="text-xs text-slate-400 font-medium">Patient throughput across ER, OPD, and Inpatient admissions</p>
            </div>
            <select className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-700">
              <option>Last 7 Days</option>
            </select>
          </div>
          
          {/* SVG Visual Chart */}
          <div className="flex-1 bg-slate-900/95 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between min-h-[300px]">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold border-b border-slate-800 pb-3">
              <span>Patient Volume</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-brand-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Walk-in Queue
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Admissions
                </span>
              </div>
            </div>

            <div className="h-44 w-full flex items-end justify-between gap-3 pt-6 px-2">
              {weeklyChartData.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-full">
                    <div 
                      className="w-4 bg-brand-500 rounded-t-md transition-all duration-300 group-hover:bg-brand-400 min-h-[4px]"
                      style={{ height: `${Math.max(4, (item.er / maxChartVal) * 100)}%` }}
                    />
                    <div 
                      className="w-4 bg-emerald-500 rounded-t-md transition-all duration-300 group-hover:bg-emerald-400 min-h-[4px]"
                      style={{ height: `${Math.max(4, (item.ipd / maxChartVal) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{item.day}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Peak activity day: <strong className="text-white">{peakDay}</strong></span>
              <span className="text-emerald-400 font-bold">7-Day Activity Trend</span>
            </div>
          </div>
        </div>

        {/* Operational Alerts Module */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-slate-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <ShieldAlert size={20} className="text-rose-500" />
                  Operational Alerts
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Clinical & Resource Notifications</p>
              </div>
              {criticalCount > 0 ? (
                <span className="bg-rose-500/90 text-white text-xs font-black px-2.5 py-1 rounded-full animate-pulse shadow-md shadow-rose-500/20">
                  {criticalCount} Critical
                </span>
              ) : (
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-black px-2.5 py-1 rounded-full border border-emerald-500/30">
                  Optimal
                </span>
              )}
            </div>

            <div className="space-y-3.5 max-h-[340px] overflow-y-auto relative z-10 pr-1">
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10 font-bold">No critical alerts recorded.</p>
              ) : alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={clsx(
                    "p-3.5 rounded-2xl flex items-start gap-3 border transition-all duration-200 hover:bg-slate-800/80",
                    alert.level === 'critical' 
                      ? "bg-rose-950/30 border-rose-500/30 text-rose-100" 
                      : alert.level === 'warning'
                      ? "bg-amber-950/30 border-amber-500/30 text-amber-100"
                      : "bg-slate-800/50 border-slate-700/50 text-slate-200"
                  )}
                >
                  <div className={clsx(
                    "w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 shadow-sm",
                    alert.level === 'critical' ? 'bg-rose-500 shadow-rose-500/50 animate-ping' : 
                    alert.level === 'warning' ? 'bg-amber-500 shadow-amber-500/50' : 'bg-blue-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm leading-snug truncate text-slate-100">{alert.title}</p>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                        {alert.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                      <Clock size={12} /> {alert.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setIsLogsModalOpen(true)}
            className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-3 rounded-2xl transition-all border border-slate-700/60 relative z-10 flex items-center justify-center gap-2"
          >
            <FileText size={16} />
            View System Log History ({alerts.length})
          </button>
        </div>
      </div>

      {/* System Log History Modal */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-8 border border-slate-200 shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="text-brand-600" size={24} />
                  System Operational Logs
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time event logs for emergency triage, inventory, blood bank, and admissions.</p>
              </div>
              <button 
                onClick={() => setIsLogsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center justify-between gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 ml-2">
                <Filter size={14} /> Filter Severity:
              </span>
              <div className="flex items-center gap-1">
                {(['ALL', 'critical', 'warning', 'info'] as const).map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setLogFilter(lvl)}
                    className={clsx(
                      "px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all",
                      logFilter === lvl 
                        ? "bg-slate-900 text-white shadow-md" 
                        : "text-slate-600 hover:bg-slate-200/60"
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Log List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {filteredAlerts.length === 0 ? (
                <p className="text-center py-10 text-slate-400 text-sm font-bold">No logs matching selected severity filter.</p>
              ) : filteredAlerts.map((log) => (
                <div key={log.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        "w-2.5 h-2.5 rounded-full",
                        log.level === 'critical' ? 'bg-rose-500' : log.level === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                      )} />
                      <span className="font-bold text-slate-900 text-sm">{log.title}</span>
                      <span className="text-[10px] font-black bg-slate-200 text-slate-700 px-2 py-0.5 rounded uppercase ml-2">
                        {log.category}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{log.time}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium pl-4">{log.details}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsLogsModalOpen(false)}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
