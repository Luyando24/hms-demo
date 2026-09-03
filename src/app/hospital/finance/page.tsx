'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Plus,
  Calendar,
  Filter,
  FileText,
  Download,
  AlertCircle,
  Mail,
  Send,
  Users,
  Package,
  CreditCard,
  Building,
  CheckCircle2,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatCurrencyAmount } from '@/utils/currency';
import clsx from 'clsx';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import RecordExpenseModal from '@/components/hospital/RecordExpenseModal';
import RecordIncomeModal from '@/components/hospital/RecordIncomeModal';
import ReportExportModal from '@/components/hospital/ReportExportModal';
import StatusModal from '@/components/hospital/StatusModal';
import { sendFinancialReportEmailAction } from './actions';

type TransactionType = 'ALL' | 'EXPENSE' | 'PAYROLL' | 'PROCUREMENT' | 'REVENUE';

export default function FinanceDashboard() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TransactionType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Actions
  const [isRecordIncomeOpen, setIsRecordIncomeOpen] = useState(false);
  const [isRecordExpenseOpen, setIsRecordExpenseOpen] = useState(false);
  const [isReportExportOpen, setIsReportExportOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [emailingReport, setEmailingReport] = useState(false);

  const [currencyConfig, setCurrencyConfig] = useState<{
    symbol: string;
    position: 'prefix' | 'suffix';
  }>({ symbol: '$', position: 'prefix' });

  const supabase = createClient();

  useEffect(() => {
    void fetchFinancialData();
    void fetchSettings();

    // Subscribe to live financial and inventory channels
    const channel = supabase
      .channel('finance_dashboard_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => void fetchFinancialData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => void fetchFinancialData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incomes' }, () => void fetchFinancialData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll_records' }, () => void fetchFinancialData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => void fetchFinancialData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => void fetchFinancialData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('currency_symbol, currency_position')
      .limit(1)
      .maybeSingle();

    if (data) {
      setCurrencyConfig({
        symbol: data.currency_symbol || '$',
        position: (data.currency_position as 'prefix' | 'suffix') || 'prefix',
      });
    }
  };

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const [invRes, expRes, payRes, poRes, invItemRes, incRes] = await Promise.all([
        supabase.from('invoices').select('*, patients(first_name, last_name, file_number)').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
        supabase.from('payroll_records').select('*, profiles(first_name, last_name, staff_number, role)').order('created_at', { ascending: false }),
        supabase.from('purchase_orders').select('*, suppliers(name)').order('created_at', { ascending: false }),
        supabase.from('inventory_items').select('*').order('name', { ascending: true }),
        supabase.from('incomes').select('*').order('income_date', { ascending: false }),
      ]);

      if (invRes.data) setInvoices(invRes.data);
      if (expRes.data) setExpenses(expRes.data);
      if (payRes.data) setPayrollRecords(payRes.data);
      if (poRes.data) setPurchaseOrders(poRes.data);
      if (invItemRes.data) setInventoryItems(invItemRes.data);
      if (incRes.data) setIncomes(incRes.data);
    } catch (err) {
      console.error('Error fetching synchronized financial data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregated Multi-Module Metrics
  const totals = useMemo(() => {
    const totalInvoiced = invoices.reduce((acc, inv) => acc + Number(inv.total_amount || 0), 0);
    const patientRevenue = invoices.reduce((acc, inv) => acc + Number(inv.paid_amount || 0), 0);
    const manualIncomes = incomes.reduce((acc, inc) => acc + parseFloat(inc.amount?.toString() || '0'), 0);
    const realizedRevenue = patientRevenue + manualIncomes;
    const receivables = Math.max(0, totalInvoiced - patientRevenue);

    const generalExpenses = expenses.reduce((acc, exp) => acc + parseFloat(exp.amount?.toString() || '0'), 0);
    const payrollOutflow = payrollRecords.reduce((acc, pay) => acc + Number(pay.net_salary || 0), 0);
    const procurementOutflow = purchaseOrders.reduce((acc, po) => acc + Number(po.total_amount || 0), 0);

    const totalOutflows = generalExpenses + payrollOutflow + procurementOutflow;
    const netEbitda = realizedRevenue - totalOutflows;

    // Inventory Medical Price & Status Metrics
    const inventoryValuation = inventoryItems.reduce(
      (acc, item) => acc + (Number(item.stock_level || 0) * Number(item.unit_price || 0)),
      0
    );
    const totalStockCount = inventoryItems.length;
    const outOfStockCount = inventoryItems.filter((i) => (Number(i.stock_level) || 0) === 0).length;
    const lowStockCount = inventoryItems.filter(
      (i) => (Number(i.stock_level) || 0) > 0 && (Number(i.stock_level) || 0) <= (Number(i.reorder_level) || 50)
    ).length;
    const inStockCount = inventoryItems.filter(
      (i) => (Number(i.stock_level) || 0) > (Number(i.reorder_level) || 50)
    ).length;

    return {
      totalInvoiced,
      realizedRevenue,
      receivables,
      generalExpenses,
      payrollOutflow,
      procurementOutflow,
      totalOutflows,
      netEbitda,
      inventoryValuation,
      totalStockCount,
      outOfStockCount,
      lowStockCount,
      inStockCount,
    };
  }, [invoices, expenses, incomes, payrollRecords, purchaseOrders, inventoryItems]);

  const pendingInvoicesCount = invoices.filter(
    (inv) => inv.status === 'UNPAID' || inv.status === 'PARTIAL',
  ).length;

  // Unified Transaction Journal items
  const unifiedTransactions = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'EXPENSE' | 'PAYROLL' | 'PROCUREMENT' | 'REVENUE';
      title: string;
      subtitle: string;
      date: string;
      amount: number;
      isOutflow: boolean;
      paymentMethod: string;
      statusBadge: string;
    }> = [];

    // General Expenses
    expenses.forEach((exp) => {
      list.push({
        id: `exp-${exp.id}`,
        type: 'EXPENSE',
        title: exp.title || 'Operational Expense',
        subtitle: `${exp.category || 'GENERAL'} • Ref: ${exp.reference_number || 'N/A'}`,
        date: exp.expense_date || exp.created_at,
        amount: Number(exp.amount || 0),
        isOutflow: true,
        paymentMethod: exp.payment_method || 'BANK_TRANSFER',
        statusBadge: 'EXPENSE',
      });
    });

    // Staff Payroll Disbursals
    payrollRecords.forEach((pay) => {
      const staffName = pay.profiles ? `${pay.profiles.first_name} ${pay.profiles.last_name}` : 'Staff Member';
      list.push({
        id: `pay-${pay.id}`,
        type: 'PAYROLL',
        title: `Staff Salary Disbursal: ${staffName}`,
        subtitle: `Pay Period: ${pay.pay_period} • ${pay.profiles?.role || 'STAFF'} (${pay.profiles?.staff_number || 'HMS'})`,
        date: pay.created_at || new Date().toISOString(),
        amount: Number(pay.net_salary || 0),
        isOutflow: true,
        paymentMethod: pay.payment_method || 'BANK_TRANSFER',
        statusBadge: pay.status || 'PROCESSED',
      });
    });

    // Procurement & Purchase Orders
    purchaseOrders.forEach((po) => {
      list.push({
        id: `po-${po.id}`,
        type: 'PROCUREMENT',
        title: `Pharmacy & Stock PO: ${po.po_number || 'PO-ORDER'}`,
        subtitle: `Supplier: ${po.suppliers?.name || 'Medical Vendor'} • Expected: ${po.expected_delivery_date || 'Standard'}`,
        date: po.created_at || new Date().toISOString(),
        amount: Number(po.total_amount || 0),
        isOutflow: true,
        paymentMethod: 'INVOICED_PO',
        statusBadge: po.status || 'ORDERED',
      });
    });

    // Realized Patient Inflows
    invoices.forEach((inv) => {
      const paid = Number(inv.paid_amount || 0);
      if (paid > 0) {
        const pt = inv.patients ? `${inv.patients.first_name} ${inv.patients.last_name}` : 'Patient Billing';
        list.push({
          id: `rev-${inv.id}`,
          type: 'REVENUE',
          title: `Patient Collection: ${pt}`,
          subtitle: `Invoice #${inv.id.substring(0, 8).toUpperCase()} • Status: ${inv.status}`,
          date: inv.created_at || new Date().toISOString(),
          amount: paid,
          isOutflow: false,
          paymentMethod: 'CASHIER_SETTLED',
          statusBadge: inv.status || 'PAID',
        });
      }
    });

    // Direct Manual Incomes
    incomes.forEach((inc) => {
      list.push({
        id: `inc-${inc.id}`,
        type: 'REVENUE',
        title: inc.title || 'Direct Inflow Receipt',
        subtitle: `${inc.category || 'DIRECT_PAYMENT'} • Ref: ${inc.reference_number || 'N/A'}`,
        date: inc.income_date || inc.created_at || new Date().toISOString(),
        amount: Number(inc.amount || 0),
        isOutflow: false,
        paymentMethod: inc.payment_method || 'CASH',
        statusBadge: 'INCOME',
      });
    });

    // Sort by date descending
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply Filter & Search
    return list.filter((item) => {
      const matchesTab = activeTab === 'ALL' || item.type === activeTab;
      const matchesSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [expenses, incomes, payrollRecords, purchaseOrders, invoices, activeTab, searchQuery]);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedTransactions,
  } = usePagination(unifiedTransactions, { initialPageSize: 8 });

  // One-click Email Financial Report to Admin
  const handleQuickEmailReport = async () => {
    setEmailingReport(true);
    try {
      const res = await sendFinancialReportEmailAction({
        reportTitle: 'Monthly Consolidated Financial Statement',
        periodLabel: 'Current Month (Real-Time Synced)',
      });

      if (res.success) {
        setStatusModal({
          type: 'success',
          title: 'Financial Report Emailed',
          message: `Consolidated financial statement covering Patient Billings, Staff Payroll, Pharmacy Procurement, and Operating Expenses has been delivered to ${res.recipientEmail}.`,
        });
      } else {
        setStatusModal({
          type: 'error',
          title: 'Email Delivery Notice',
          message: res.error || 'Failed to dispatch report to admin email.',
        });
      }
    } catch (err: any) {
      setStatusModal({
        type: 'error',
        title: 'Dispatch Failed',
        message: err.message || 'An error occurred while connecting to email service.',
      });
    } finally {
      setEmailingReport(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Hospital Financial Management
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchFinancialData}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5"
            title="Refresh financial data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-brand-600' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleQuickEmailReport}
            disabled={emailingReport}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            title="Send executive report to admin email"
          >
            {emailingReport ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
            <span>{emailingReport ? 'Sending Report...' : 'Email Report to Admin'}</span>
          </button>

          <button
            onClick={() => setIsReportExportOpen(true)}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <Download size={15} className="text-brand-600" />
            <span>Export (PDF / Excel)</span>
          </button>

          <button
            onClick={() => setIsRecordIncomeOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
          >
            <Plus size={16} />
            <span>Record Income</span>
          </button>

          <button
            onClick={() => setIsRecordExpenseOpen(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-500/20 flex items-center gap-1.5"
          >
            <Plus size={16} />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Synchronized Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Realized Revenue Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Realized Collections
          </p>
          <p className="text-2xl font-black text-emerald-600">
            {formatCurrencyAmount(totals.realizedRevenue, currencyConfig.symbol, currencyConfig.position)}
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Invoiced: {formatCurrencyAmount(totals.totalInvoiced, currencyConfig.symbol, currencyConfig.position)}</span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Cash Inflow</span>
          </div>
        </div>

        {/* Total Operational Outflows Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Total Facility Outflows
          </p>
          <p className="text-2xl font-black text-rose-600">
            {formatCurrencyAmount(totals.totalOutflows, currencyConfig.symbol, currencyConfig.position)}
          </p>
          <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>Payroll + POs + OpEx</span>
            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md uppercase">Outflow</span>
          </div>
        </div>

        {/* Net EBITDA Card */}
        <div className="bg-slate-900 rounded-3xl p-6 shadow-xl text-white">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Net Margin / EBITDA
          </p>
          <p
            className={clsx(
              'text-2xl font-black',
              totals.netEbitda >= 0 ? 'text-emerald-400' : 'text-rose-400',
            )}
          >
            {formatCurrencyAmount(totals.netEbitda, currencyConfig.symbol, currencyConfig.position)}
          </p>
          <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>Audited Operating Margin</span>
            <span className={clsx("px-2 py-0.5 rounded-md", totals.netEbitda >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>
              {totals.realizedRevenue > 0 ? `${((totals.netEbitda / totals.realizedRevenue) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Accounts Receivable Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Accounts Receivable
          </p>
          <p className="text-2xl font-black text-amber-600">
            {formatCurrencyAmount(totals.receivables, currencyConfig.symbol, currencyConfig.position)}
          </p>
          <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
            <span>{pendingInvoicesCount} Pending Invoices</span>
            <span>Aging Ledger</span>
          </div>
        </div>
      </div>

      {/* Outflow & Asset Valuation Breakdown Sub-Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Staff Payroll Disbursals</p>
              <p className="text-sm font-black text-slate-900">
                {formatCurrencyAmount(totals.payrollOutflow, currencyConfig.symbol, currencyConfig.position)}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
            {payrollRecords.length} Records
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Package size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Pharmacy & Stock Orders</p>
              <p className="text-sm font-black text-slate-900">
                {formatCurrencyAmount(totals.procurementOutflow, currencyConfig.symbol, currencyConfig.position)}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
            {purchaseOrders.length} POs
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Building size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">General Facility Expenses</p>
              <p className="text-sm font-black text-slate-900">
                {formatCurrencyAmount(totals.generalExpenses, currencyConfig.symbol, currencyConfig.position)}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg">
            {expenses.length} Vouchers
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Package size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Medical Stock Valuation</p>
              <p className="text-sm font-black text-emerald-600">
                {formatCurrencyAmount(totals.inventoryValuation, currencyConfig.symbol, currencyConfig.position)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg inline-block">
              {totals.totalStockCount} SKUs
            </span>
            {totals.outOfStockCount > 0 && (
              <p className="text-[9px] text-rose-500 font-bold mt-1">
                {totals.outOfStockCount} Out of Stock
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Synchronized Financial Transaction Journal */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-2xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Consolidated Transaction Journal</h2>
            <p className="text-xs text-slate-400 font-medium">
              Synchronized ledger of all inflows, payroll runs, procurements, and operational vouchers.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search description, voucher #, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        {/* Transaction Stream Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl">
          {[
            { id: 'ALL', label: `All Transactions (${unifiedTransactions.length})` },
            { id: 'REVENUE', label: `Patient Inflows (${invoices.filter(i => Number(i.paid_amount || 0) > 0).length})` },
            { id: 'PAYROLL', label: `Staff Payroll (${payrollRecords.length})` },
            { id: 'PROCUREMENT', label: `Pharmacy & POs (${purchaseOrders.length})` },
            { id: 'EXPENSE', label: `Operating Vouchers (${expenses.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as TransactionType);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Transactions Table */}
        <div className="overflow-hidden border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Transaction & Origin</th>
                <th className="px-5 py-3.5">Source Module</th>
                <th className="px-5 py-3.5">Channel / Method</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right">Amount Flow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                    <Loader2 className="animate-spin mx-auto text-brand-600 mb-2" size={24} />
                    Syncing financial ledger...
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold text-xs">
                    No transactions found matching the filter.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={clsx(
                            'w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0',
                            tx.type === 'REVENUE'
                              ? 'bg-emerald-100 text-emerald-700'
                              : tx.type === 'PAYROLL'
                              ? 'bg-blue-100 text-blue-700'
                              : tx.type === 'PROCUREMENT'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700',
                          )}
                        >
                          {tx.type === 'REVENUE' ? (
                            <ArrowUpRight size={16} />
                          ) : tx.type === 'PAYROLL' ? (
                            <Users size={16} />
                          ) : tx.type === 'PROCUREMENT' ? (
                            <Package size={16} />
                          ) : (
                            <ArrowDownRight size={16} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{tx.title}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{tx.subtitle}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={clsx(
                          'px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider',
                          tx.type === 'REVENUE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : tx.type === 'PAYROLL'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : tx.type === 'PROCUREMENT'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200',
                        )}
                      >
                        {tx.type}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-xs font-bold text-slate-600">
                      {tx.paymentMethod.replace(/_/g, ' ')}
                    </td>

                    <td className="px-5 py-3.5 text-xs font-medium text-slate-500">
                      {new Date(tx.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>

                    <td className="px-5 py-3.5 text-right font-black text-sm">
                      <span className={tx.isOutflow ? 'text-rose-600' : 'text-emerald-600'}>
                        {tx.isOutflow ? '-' : '+'}
                        {formatCurrencyAmount(tx.amount, currencyConfig.symbol, currencyConfig.position)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemName="transactions"
          />
        </div>
      </div>

      {/* Record Income Modal */}
      <RecordIncomeModal
        isOpen={isRecordIncomeOpen}
        onClose={() => setIsRecordIncomeOpen(false)}
        onSuccess={() => {
          void fetchFinancialData();
          setStatusModal({
            type: 'success',
            title: 'Income Recorded',
            message: 'The direct revenue receipt has been recorded in the hospital finance ledger.',
          });
        }}
        currencySymbol={currencyConfig.symbol}
        currencyPosition={currencyConfig.position}
      />

      {/* Record Expense Modal */}
      <RecordExpenseModal
        isOpen={isRecordExpenseOpen}
        onClose={() => setIsRecordExpenseOpen(false)}
        onSuccess={() => {
          void fetchFinancialData();
          setStatusModal({
            type: 'success',
            title: 'Expense Recorded',
            message: 'The operational expenditure voucher has been recorded in the finance ledger.',
          });
        }}
        currencySymbol={currencyConfig.symbol}
        currencyPosition={currencyConfig.position}
      />

      {/* Report Export Modal (PDF / Excel / CSV / Email) */}
      <ReportExportModal
        isOpen={isReportExportOpen}
        onClose={() => setIsReportExportOpen(false)}
        reportName="Monthly Consolidated Financial Audit & P&L"
        reportKey="financial"
        currencyConfig={currencyConfig}
      />

      {/* Status Modal for Toasts / Alerts */}
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
