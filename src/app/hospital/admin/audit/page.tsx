'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Loader2,
  Eye,
  X,
  Lock,
} from 'lucide-react';
import clsx from 'clsx';
import { createClient } from '@/utils/supabase/client';
import { canAccessAuditLogs } from '@/utils/rbac';
import { AuditLogEntry } from '@/types/audit';
import {
  listAuditLogsAction,
  getAuditLogDetailsAction,
  AuditSummaryMetrics,
} from './actions';
import { Pagination } from '@/components/ui/Pagination';

const MODULE_OPTIONS = [
  { value: 'ALL', label: 'All Modules' },
  { value: 'AUTH', label: 'Authentication & Access' },
  { value: 'INVENTORY', label: 'Medical Stock & Pharmacy' },
  { value: 'CAPITAL_ASSETS', label: 'Capital Assets & Registry' },
  { value: 'FINANCE', label: 'Billing & Finance' },
  { value: 'CLINICAL_TESTS', label: 'Clinical Common Tests' },
  { value: 'SYSTEM_SETTINGS', label: 'System Settings' },
  { value: 'PATIENTS', label: 'Patient Directory' },
  { value: 'ADMIN', label: 'Administrative & Purge' },
];

const ACTION_OPTIONS = [
  { value: 'ALL', label: 'All Actions' },
  { value: 'LOGIN', label: 'Logins (Sign In)' },
  { value: 'LOGOUT', label: 'Logouts (Sign Out)' },
  { value: 'RECORD_CREATE', label: 'Record Creations' },
  { value: 'RECORD_UPDATE', label: 'Record Updates' },
  { value: 'RECORD_DELETE', label: 'Record Deletions' },
  { value: 'SETTINGS_UPDATE', label: 'Settings Updates' },
  { value: 'STATUS_CHANGE', label: 'Status Changes' },
  { value: 'DATA_PURGE', label: 'Data Purges / Resets' },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<'TODAY' | '7_DAYS' | '30_DAYS' | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Summary Metrics
  const [metrics, setMetrics] = useState<AuditSummaryMetrics>({
    totalLogs: 0,
    todayLogs: 0,
    deletionLogs: 0,
    adminActionLogs: 0,
  });

  // Inspector Modal State
  const [inspectingEntry, setInspectingEntry] = useState<AuditLogEntry | null>(null);

  const supabase = createClient();

  const fetchLogs = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await listAuditLogsAction({
          module: selectedModule,
          action: selectedAction,
          search,
          period: selectedPeriod,
          page,
          pageSize,
        });

        if (res.success) {
          setLogs(res.data);
          setTotalCount(res.total || 0);
          setTotalPages(res.totalPages || 1);
          if (res.metrics) {
            setMetrics(res.metrics);
          }
        }
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedModule, selectedAction, search, selectedPeriod, page, pageSize],
  );

  useEffect(() => {
    async function initAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          const role = profile?.role || 'STAFF';
          setUserRole(role);
        }
      } catch (err) {
        console.error('Error verifying auth in audit page:', err);
      } finally {
        setCheckingAuth(false);
      }
    }

    void initAuth();
  }, [supabase]);

  useEffect(() => {
    if (!checkingAuth && canAccessAuditLogs(userRole)) {
      void fetchLogs();
    }
  }, [checkingAuth, userRole, fetchLogs]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void fetchLogs();
  };

  if (checkingAuth) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="animate-spin mx-auto text-brand-600 mb-2" size={32} />
        <p className="text-xs font-bold text-slate-500">Verifying security authorizations...</p>
      </div>
    );
  }

  if (!canAccessAuditLogs(userRole)) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-sm">
          <ShieldCheck size={32} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Access Restricted</h1>
        <p className="text-xs sm:text-sm text-slate-600 mb-6 font-medium leading-relaxed">
          The Hospital System Audit Trail contains sensitive governance history and is accessible exclusively to <strong>Administrators</strong> and <strong>Super Users</strong>.
        </p>
        <Link
          href="/hospital/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-800 border border-brand-200">
              <ShieldCheck size={13} />
              Tamper-Proof Audit System
            </span>
            <span className="text-xs text-slate-400 font-bold">•</span>
            <span className="text-xs text-slate-500 font-bold">Immutable Event Journal</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            System-Wide Audit Trail
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Traceability log capturing user authentication, inventory movements, record deletions, and administrative configurations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchLogs(true)}
            disabled={loading || refreshing}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Refresh Audit Records"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-brand-600' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Audit KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Logged Events</p>
          <p className="text-2xl font-black text-slate-900">{metrics.totalLogs.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-bold mt-1">Complete system event history</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Events Logged Today</p>
          <p className="text-2xl font-black text-emerald-600">{metrics.todayLogs.toLocaleString()}</p>
          <p className="text-xs text-emerald-700 font-bold mt-1">Current daily operations</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-2">Sensitive Deletions</p>
          <p className="text-2xl font-black text-rose-600">{metrics.deletionLogs.toLocaleString()}</p>
          <p className="text-xs text-rose-700 font-bold mt-1">Record removals & purges</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-2">Administrative Actions</p>
          <p className="text-2xl font-black text-purple-600">{metrics.adminActionLogs.toLocaleString()}</p>
          <p className="text-xs text-purple-700 font-bold mt-1">Settings, roles & catalog updates</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search actor name, record ID, module, or action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {MODULE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {ACTION_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>

            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today Only</option>
              <option value="7_DAYS">Last 7 Days</option>
              <option value="30_DAYS">Last 30 Days</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="animate-spin mx-auto text-brand-600 mb-3" size={32} />
            <p className="text-xs font-bold text-slate-700">Loading audit log entries...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-50 text-slate-300 flex items-center justify-center mx-auto border border-slate-200">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No audit events match your criteria</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
              Try adjusting your search terms or expanding the module and date range filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-4">Timestamp</th>
                  <th className="px-5 py-4">Actor</th>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Module</th>
                  <th className="px-5 py-4">Target Entity</th>
                  <th className="px-5 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((entry) => {
                  const isDelete = entry.action === 'RECORD_DELETE' || entry.action === 'DATA_PURGE';
                  const isCreate = entry.action === 'RECORD_CREATE' || entry.action === 'LOGIN';
                  const isSuperUserActor = entry.actor_role === 'SUPER_USER';

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-slate-500 font-medium">
                        <div className="font-bold text-slate-800">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(entry.created_at).toLocaleTimeString()}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="font-bold text-slate-900 block">{entry.actor_name || 'System Service'}</span>
                            <span
                              className={clsx(
                                'inline-block text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mt-0.5',
                                isSuperUserActor
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : entry.actor_role === 'ADMIN'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200',
                              )}
                            >
                              {entry.actor_role || 'SYSTEM'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                            isDelete
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isCreate
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200',
                          )}
                        >
                          {entry.action}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {entry.module}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">
                            {entry.record_type || 'Entity'}
                          </span>
                          {entry.record_id && (
                            <span className="font-mono text-[11px] text-slate-400 truncate max-w-xs block">
                              ID: {entry.record_id.length > 16 ? entry.record_id.slice(0, 16) + '...' : entry.record_id}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectingEntry(entry)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemName="audit entries"
          />
        </div>
      </div>

      {/* Audit Entry Inspector Modal */}
      {inspectingEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 shadow-2xs">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Audit Entry Inspector
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Log Record ID: {inspectingEntry.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingEntry(null)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Event Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Actor</p>
                  <p className="font-bold text-slate-900">{inspectingEntry.actor_name || 'System'}</p>
                  <span className="text-[10px] font-bold text-brand-600 uppercase">{inspectingEntry.actor_role}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Action</p>
                  <span className="font-black text-slate-900">{inspectingEntry.action}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Module</p>
                  <span className="font-bold text-slate-700">{inspectingEntry.module}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target</p>
                  <span className="font-bold text-slate-900">{inspectingEntry.record_type || '—'}</span>
                </div>
              </div>

              {/* Timestamp & Network Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50/50 rounded-xl border border-slate-200/60 text-slate-600">
                <div>
                  <span className="font-bold text-slate-400 mr-1">Timestamp:</span>
                  <span className="font-mono">{new Date(inspectingEntry.created_at).toISOString()}</span>
                </div>
                {inspectingEntry.ip_address && (
                  <div>
                    <span className="font-bold text-slate-400 mr-1">Client IP:</span>
                    <span className="font-mono">{inspectingEntry.ip_address}</span>
                  </div>
                )}
              </div>

              {/* Values Comparison / Diffs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Previous Values (old_values)
                  </p>
                  <pre className="p-3.5 bg-slate-900 text-slate-200 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-60 border border-slate-800">
                    {inspectingEntry.old_values
                      ? JSON.stringify(inspectingEntry.old_values, null, 2)
                      : '// No previous state (Record Creation)'}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Updated Values (new_values)
                  </p>
                  <pre className="p-3.5 bg-slate-900 text-emerald-400 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-60 border border-slate-800">
                    {inspectingEntry.new_values
                      ? JSON.stringify(inspectingEntry.new_values, null, 2)
                      : '// No updated state (Record Deletion)'}
                  </pre>
                </div>
              </div>

              {/* Context Metadata */}
              {inspectingEntry.metadata && Object.keys(inspectingEntry.metadata).length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Context & Operation Metadata
                  </p>
                  <pre className="p-3.5 bg-slate-50 text-slate-800 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-40 border border-slate-200">
                    {JSON.stringify(inspectingEntry.metadata, null, 2)}
                  </pre>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <Lock size={12} className="text-slate-400" />
                Immutable ledger entry - Cannot be altered or purged
              </span>
              <button
                type="button"
                onClick={() => setInspectingEntry(null)}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
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
