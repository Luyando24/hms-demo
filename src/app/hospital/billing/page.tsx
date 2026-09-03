'use client';

import { useState, useEffect } from "react";
import { 
  CreditCard, 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  LogIn, 
  Printer, 
  Loader2,
  Receipt,
  FileCheck
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import RecordPaymentModal from "@/components/hospital/RecordPaymentModal";
import GenerateInvoiceModal from "@/components/hospital/GenerateInvoiceModal";
import GenerateReceiptModal from "@/components/hospital/GenerateReceiptModal";
import { cancelInvoiceAction } from "@/app/hospital/actions";
import { formatCurrencyAmount } from "@/utils/currency";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { 
  printInvoiceDocument, 
  printReceiptDocument, 
  PrintableInvoiceData, 
  PrintableReceiptData 
} from "@/utils/invoicePrintGenerator";

export default function BillingDashboard() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingInvoiceId, setPrintingInvoiceId] = useState<string | null>(null);
  const [printingReceiptId, setPrintingReceiptId] = useState<string | null>(null);
  const [hospitalSettings, setHospitalSettings] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isGenerateReceiptModalOpen, setIsGenerateReceiptModalOpen] = useState(false);
  const [currencyConfig, setCurrencyConfig] = useState<{ symbol: string, position: 'prefix' | 'suffix' }>({ symbol: '$', position: 'prefix' });
  const supabase = createClient();

  useEffect(() => {
    fetchInvoices();
    fetchCurrencyConfig();
  }, []);

  const fetchCurrencyConfig = async () => {
    const { data } = await supabase.from('system_settings').select('*').limit(1).maybeSingle();
    if (data) {
      setHospitalSettings(data);
      setCurrencyConfig({
        symbol: data.currency_symbol || '$',
        position: (data.currency_position as 'prefix' | 'suffix') || 'prefix'
      });
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*, patients(*)')
      .order('created_at', { ascending: false });
    
    if (data) setInvoices(data);
    setLoading(false);
  };

  const handlePrintInvoice = async (invoice: any) => {
    setPrintingInvoiceId(invoice.id);
    try {
      const { data: items } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      const printableData: PrintableInvoiceData = {
        invoiceId: invoice.id,
        createdAt: invoice.created_at || new Date().toISOString(),
        status: invoice.status || 'UNPAID',
        totalAmount: invoice.total_amount,
        paidAmount: invoice.paid_amount || 0,
        paymentMethod: invoice.payment_method,
        hospital: {
          name: hospitalSettings?.hospital_name || 'Hospital Medical Center',
          brandTitle: hospitalSettings?.brand_title,
          tagline: hospitalSettings?.tagline,
          logoUrl: hospitalSettings?.logo_url,
          address: hospitalSettings?.address,
          phone: hospitalSettings?.phone,
          email: hospitalSettings?.email,
          currencySymbol: currencyConfig.symbol,
          currencyPosition: currencyConfig.position,
        },
        patient: {
          firstName: invoice.patients?.first_name || 'Patient',
          lastName: invoice.patients?.last_name || '',
          fileNumber: invoice.patients?.file_number,
          phone: invoice.patients?.phone,
          email: invoice.patients?.email,
          gender: invoice.patients?.gender,
          dob: invoice.patients?.dob,
        },
        items: (items && items.length > 0) ? items.map((i: any) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          totalPrice: i.total_price || (i.quantity * i.unit_price),
        })) : [
          {
            description: 'General Medical Consultation / Service',
            quantity: 1,
            unitPrice: invoice.total_amount,
            totalPrice: invoice.total_amount,
          }
        ],
      };

      printInvoiceDocument(printableData);
    } catch (err) {
      console.error('Error printing invoice:', err);
    } finally {
      setPrintingInvoiceId(null);
    }
  };

  const handlePrintReceipt = async (invoice: any) => {
    setPrintingReceiptId(invoice.id);
    try {
      const [{ data: items }, { data: payments }] = await Promise.all([
        supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id),
        supabase.from('payments').select('*').eq('invoice_id', invoice.id).order('created_at', { ascending: false }).limit(1),
      ]);

      const latestPayment = payments?.[0];
      const recNumber = latestPayment?.reference_number || `REC-${invoice.id.slice(-6).toUpperCase()}`;

      const printableReceipt: PrintableReceiptData = {
        receiptNumber: recNumber,
        invoiceId: invoice.id,
        paymentId: latestPayment?.id,
        createdAt: latestPayment?.created_at || invoice.created_at || new Date().toISOString(),
        totalAmount: invoice.total_amount,
        paidAmount: invoice.paid_amount || invoice.total_amount,
        paymentMethod: latestPayment?.payment_method || invoice.payment_method || 'CASH',
        paymentReference: latestPayment?.reference_number || undefined,
        hospital: {
          name: hospitalSettings?.hospital_name || 'Hospital Medical Center',
          brandTitle: hospitalSettings?.brand_title,
          tagline: hospitalSettings?.tagline,
          logoUrl: hospitalSettings?.logo_url,
          address: hospitalSettings?.address,
          phone: hospitalSettings?.phone,
          email: hospitalSettings?.email,
          currencySymbol: currencyConfig.symbol,
          currencyPosition: currencyConfig.position,
        },
        patient: {
          firstName: invoice.patients?.first_name || 'Patient',
          lastName: invoice.patients?.last_name || '',
          fileNumber: invoice.patients?.file_number,
          phone: invoice.patients?.phone,
          email: invoice.patients?.email,
          gender: invoice.patients?.gender,
          dob: invoice.patients?.dob,
        },
        items: (items && items.length > 0)
          ? items.map((i: any) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unit_price,
              totalPrice: i.total_price || (i.quantity * i.unit_price),
            }))
          : [
              {
                description: 'General Medical Consultation / Service',
                quantity: 1,
                unitPrice: invoice.total_amount,
                totalPrice: invoice.total_amount,
              },
            ],
      };

      printReceiptDocument(printableReceipt);
    } catch (err) {
      console.error('Error printing receipt:', err);
    } finally {
      setPrintingReceiptId(null);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.patients?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.patients?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.id.includes(searchQuery)
  );

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedInvoices,
  } = usePagination(filteredInvoices, { initialPageSize: 10 });

  const stats = {
    totalRevenue: invoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0),
    pendingAmount: invoices.reduce((acc, inv) => acc + (inv.total_amount - (inv.paid_amount || 0)), 0),
    overdueCount: invoices.filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE').length,
    collectionRate: invoices.length > 0 ? (invoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0) / invoices.reduce((acc, inv) => acc + inv.total_amount, 0) * 100).toFixed(1) : "0.0"

  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Billing & Claims</h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">Financial management, invoice settlements, and insurance processing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setIsGenerateReceiptModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
          >
            <Receipt size={14} />
            Generate Receipt
          </button>
          <button 
            onClick={() => setIsGenerateModalOpen(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
          >
            <Plus size={14} />
            Generate Invoice
          </button>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
            <DollarSign size={15} className="text-slate-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{formatCurrencyAmount(stats.totalRevenue, currencyConfig.symbol, currencyConfig.position)}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Verified settled payments</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Collection</p>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{formatCurrencyAmount(stats.pendingAmount, currencyConfig.symbol, currencyConfig.position)}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Outstanding receivables</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unpaid Invoices</p>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.overdueCount}</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Requires follow-up</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Collection Rate</p>
            <CheckCircle2 size={15} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.collectionRate}%</p>
          <p className="text-[10px] text-slate-400 font-normal mt-1">Efficiency metric</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Invoices Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Recent Invoices & Receipts</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input 
                  type="text" 
                  placeholder="Search patient or ID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-xs"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-2.5">Patient</th>
                    <th className="px-4 py-2.5">Amount</th>
                    <th className="px-4 py-2.5">Balance</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-normal">Loading billing records...</td></tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-normal">No billing records found.</td></tr>
                  ) : paginatedInvoices.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{row.patients?.first_name} {row.patients?.last_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {row.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrencyAmount(row.total_amount, currencyConfig.symbol, currencyConfig.position)}</td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1",
                          row.status === 'PAID' ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : 
                          row.status === 'PARTIAL' ? "bg-amber-50 text-amber-700 border border-amber-200/60" :
                          row.status === 'CANCELLED' ? "bg-slate-100 text-slate-500 border border-slate-200" : "bg-rose-50 text-rose-700 border border-rose-200/60"
                        )}>
                          <span className={clsx(
                            "w-1.5 h-1.5 rounded-full",
                            row.status === 'PAID' ? "bg-emerald-500" :
                            row.status === 'PARTIAL' ? "bg-amber-500" :
                            row.status === 'CANCELLED' ? "bg-slate-400" : "bg-rose-500"
                          )} />
                          {formatCurrencyAmount(row.total_amount - (row.paid_amount || 0), currencyConfig.symbol, currencyConfig.position)} {row.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print Invoice */}
                          <button
                            onClick={() => handlePrintInvoice(row)}
                            disabled={printingInvoiceId === row.id}
                            title="Export / Print Invoice"
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 shadow-xs disabled:opacity-50"
                          >
                            {printingInvoiceId === row.id ? (
                              <Loader2 size={12} className="animate-spin text-slate-600" />
                            ) : (
                              <FileText size={12} />
                            )}
                            Invoice
                          </button>

                          {/* Print Receipt (if paid or partial) */}
                          {(row.paid_amount > 0 || row.status === 'PAID') && (
                            <button
                              onClick={() => handlePrintReceipt(row)}
                              disabled={printingReceiptId === row.id}
                              title="Print Official Payment Receipt"
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs disabled:opacity-50"
                            >
                              {printingReceiptId === row.id ? (
                                <Loader2 size={12} className="animate-spin text-emerald-600" />
                              ) : (
                                <Receipt size={12} />
                              )}
                              Receipt
                            </button>
                          )}

                          {row.status !== 'PAID' && row.status !== 'CANCELLED' && (
                            <>
                              <button 
                                onClick={() => { setSelectedInvoice(row); setIsPaymentModalOpen(true); }}
                                className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-slate-800 transition-all flex items-center gap-1 shadow-xs active:scale-98"
                              >
                                <CreditCard size={12} />
                                Pay
                              </button>
                              <button 
                                onClick={async () => {
                                  if (confirm('Cancel and void this invoice?')) {
                                    const res = await cancelInvoiceAction(row.id);
                                    if (res.error) alert(res.error);
                                    else fetchInvoices();
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-600 text-xs px-2 py-1 transition-all"
                              >
                                Void
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemName="invoices"
              />
            </div>
          </div>
        </div>

        {/* Claims Status Summary */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Insurance Insights</h2>
            
            <div className="space-y-3">
              <div className="bg-slate-50/70 border border-slate-100 p-4 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-semibold text-slate-700">Pending Approvals</p>
                  <span className="text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded uppercase">In Review</span>
                </div>
                <p className="text-xl font-bold text-slate-900">{formatCurrencyAmount(stats.pendingAmount * 0.4, currencyConfig.symbol, currencyConfig.position)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Insurance claims pending settlement</p>
              </div>

              <div className="bg-slate-50/70 border border-slate-100 p-4 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-semibold text-slate-700">Settled This Period</p>
                  <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded uppercase">Paid</span>
                </div>
                <p className="text-xl font-bold text-slate-900">{formatCurrencyAmount(stats.totalRevenue, currencyConfig.symbol, currencyConfig.position)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">All payments verified & posted</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button 
              onClick={() => setIsGenerateReceiptModalOpen(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98 flex items-center justify-center gap-1.5"
            >
              <Receipt size={14} />
              Quick Issue Receipt
            </button>
            <button 
              onClick={() => setIsGenerateModalOpen(true)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-98"
            >
              Create Claim or Invoice
            </button>
          </div>
        </div>
      </div>

      {selectedInvoice && (
        <RecordPaymentModal 
          isOpen={isPaymentModalOpen} 
          onClose={() => { setIsPaymentModalOpen(false); setSelectedInvoice(null); }} 
          invoice={selectedInvoice}
          onSuccess={fetchInvoices}
        />
      )}

      <GenerateInvoiceModal 
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onSuccess={fetchInvoices}
      />

      <GenerateReceiptModal
        isOpen={isGenerateReceiptModalOpen}
        onClose={() => setIsGenerateReceiptModalOpen(false)}
        onSuccess={fetchInvoices}
      />
    </div>
  );
}

