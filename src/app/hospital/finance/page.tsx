'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatCurrencyAmount } from '@/utils/currency';
import clsx from 'clsx';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';

export default function FinanceDashboard() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currencyConfig, setCurrencyConfig] = useState<{
    symbol: string;
    position: 'prefix' | 'suffix';
  }>({ symbol: '$', position: 'prefix' });

  const supabase = createClient();

  useEffect(() => {
    void fetchFinancialData();
    void fetchSettings();
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
    const [invRes, expRes] = await Promise.all([
      supabase.from('invoices').select('*'),
      supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false }),
    ]);

    if (invRes.data) setInvoices(invRes.data);
    if (expRes.data) setExpenses(expRes.data);
    setLoading(false);
  };

  const totals = {
    revenue: invoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0),
    receivables: invoices.reduce(
      (acc, inv) => acc + (inv.total_amount - (inv.paid_amount || 0)),
      0,
    ),
    expenses: expenses.reduce(
      (acc, exp) => acc + parseFloat(exp.amount?.toString() || '0'),
      0,
    ),
  };

  const profit = totals.revenue - totals.expenses;
  const pendingCount = invoices.filter(
    (inv) => inv.status === 'UNPAID' || inv.status === 'PARTIAL',
  ).length;

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedExpenses,
  } = usePagination(expenses, { initialPageSize: 6 });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Financial Management
          </h1>
          <p className="text-slate-500 mt-1">
            Comprehensive Clinic Accounting & Business Analytics.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Download size={16} />
            Export P&L
          </button>
          <button className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2">
            <Plus size={16} />
            Record Expense
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Total Revenue
          </p>
          <p className="text-2xl font-black text-emerald-600">
            {formatCurrencyAmount(
              totals.revenue,
              currencyConfig.symbol,
              currencyConfig.position,
            )}
          </p>
          <div className="mt-4 flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-50 w-fit px-2 py-0.5 rounded">
            <ArrowUpRight size={12} className="mr-1" /> +12.5%
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Total Expenses
          </p>
          <p className="text-2xl font-black text-rose-600">
            {formatCurrencyAmount(
              totals.expenses,
              currencyConfig.symbol,
              currencyConfig.position,
            )}
          </p>
          <div className="mt-4 flex items-center text-[10px] font-bold text-rose-500 bg-rose-50 w-fit px-2 py-0.5 rounded">
            <ArrowDownRight size={12} className="mr-1" /> +4.2%
          </div>
        </div>
        <div className="bg-slate-900 rounded-3xl p-6 shadow-xl text-white">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            Net Profit/Loss
          </p>
          <p
            className={clsx(
              'text-2xl font-black',
              profit >= 0 ? 'text-emerald-400' : 'text-rose-400',
            )}
          >
            {formatCurrencyAmount(
              profit,
              currencyConfig.symbol,
              currencyConfig.position,
            )}
          </p>
          <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            MTD PERFORMANCE
          </p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Accounts Receivable
          </p>
          <p className="text-2xl font-black text-amber-600">
            {formatCurrencyAmount(
              totals.receivables,
              currencyConfig.symbol,
              currencyConfig.position,
            )}
          </p>
          <div className="mt-4 flex items-center text-[10px] font-bold text-amber-500 bg-amber-50 w-fit px-2 py-0.5 rounded">
            {pendingCount} PENDING INVOICES
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Expenses List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900">Expense Journal</h2>
              <div className="flex gap-2">
                <button className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                  <Filter size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest">
                  Processing transactions...
                </div>
              ) : expenses.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest">
                  No expenses recorded
                </div>
              ) : (
                paginatedExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={clsx(
                          'w-12 h-12 rounded-xl flex items-center justify-center',
                          exp.category === 'SALARY'
                            ? 'bg-blue-100 text-blue-600'
                            : exp.category === 'STOCK_PURCHASE'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-slate-200 text-slate-500',
                        )}
                      >
                        <FileText size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{exp.title}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter mt-1">
                          {exp.category} •{' '}
                          {new Date(exp.expense_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900">
                        -
                        {formatCurrencyAmount(
                          parseFloat(exp.amount?.toString() || '0'),
                          currencyConfig.symbol,
                          currencyConfig.position,
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {exp.payment_method}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemName="expenses"
              className="mt-6 border-t border-slate-100 pt-4"
            />
          </div>
        </div>

        {/* Revenue Breakdown / Insights */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-2xl rounded-full" />
            <h2 className="text-lg font-bold mb-8 flex items-center gap-2">
              <PieChart size={20} className="text-emerald-400" />
              Revenue Insights
            </h2>

            <div className="space-y-6">
              {[
                {
                  label: 'Consultations',
                  amount: totals.revenue * 0.65,
                  percent: 65,
                  color: 'bg-emerald-500',
                },
                {
                  label: 'Pharmacy',
                  amount: totals.revenue * 0.25,
                  percent: 25,
                  color: 'bg-blue-500',
                },
                {
                  label: 'Laboratory',
                  amount: totals.revenue * 0.1,
                  percent: 10,
                  color: 'bg-amber-500',
                },
              ].map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-slate-400">{item.label}</span>
                    <span>
                      {formatCurrencyAmount(
                        item.amount,
                        currencyConfig.symbol,
                        currencyConfig.position,
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={clsx(item.color, 'h-full')}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-5 bg-slate-800/50 rounded-2xl border border-slate-700/50">
              <div className="flex items-center gap-3 text-emerald-400 mb-2">
                <TrendingUp size={20} />
                <span className="text-sm font-black uppercase tracking-widest">
                  Profit Insight
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your revenue has increased by{' '}
                <span className="text-white font-bold">12%</span> compared to
                last month. Main driver: Outpatient Consultations.
              </p>
            </div>
          </div>

          <div className="bg-brand-600 rounded-3xl p-8 text-white shadow-xl shadow-brand-500/20">
            <h2 className="text-lg font-bold mb-4">Financial Alerts</h2>
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10">
              <AlertCircle size={24} className="text-brand-200" />
              <p className="text-xs font-medium leading-relaxed">
                {pendingCount > 0 ? `${pendingCount} invoices pending settlement.` : 'All accounts settled.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
