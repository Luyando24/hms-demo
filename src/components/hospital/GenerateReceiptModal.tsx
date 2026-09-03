'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Receipt, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Printer, 
  CheckCircle2, 
  CreditCard, 
  DollarSign, 
  FileCheck,
  AlertCircle,
  FileText
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatCurrencyAmount } from '@/utils/currency';
import { printReceiptDocument, PrintableReceiptData } from '@/utils/invoicePrintGenerator';
import StatusModal from './StatusModal';

interface GenerateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialInvoice?: any;
}

export default function GenerateReceiptModal({
  isOpen,
  onClose,
  onSuccess,
  initialInvoice,
}: GenerateReceiptModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  
  // Paid Invoices & Eligible Patients
  const [paidInvoices, setPaidInvoices] = useState<any[]>([]);
  const [eligiblePatients, setEligiblePatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  
  const [currencyConfig, setCurrencyConfig] = useState<{
    symbol: string;
    position: 'prefix' | 'suffix';
  }>({ symbol: '$', position: 'prefix' });
  const [hospitalDetails, setHospitalDetails] = useState<any>(null);

  // Line items
  const [items, setItems] = useState<
    Array<{ description: string; quantity: number | string; unit_price: number | string }>
  >([]);

  // Payment Breakdown
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paidAmount, setPaidAmount] = useState<number | string>('');
  const [tenderedCash, setTenderedCash] = useState<number | string>('');
  const [notes, setNotes] = useState('');

  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch hospital settings & paid invoices on modal open
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setFetchingData(true);
    try {
      // 1. Fetch system settings
      const { data: settings } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (settings) {
        setHospitalDetails(settings);
        setCurrencyConfig({
          symbol: settings.currency_symbol || '$',
          position: (settings.currency_position as 'prefix' | 'suffix') || 'prefix',
        });
      }

      // 2. Query only invoices with PAID status or paid_amount > 0
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          id,
          created_at,
          total_amount,
          paid_amount,
          status,
          patient_id,
          patients (
            id,
            first_name,
            last_name,
            file_number,
            phone,
            email,
            gender,
            dob
          )
        `)
        .or('status.eq.PAID,paid_amount.gt.0')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching paid invoices:', error);
      }

      const validInvoices = invoices || [];
      setPaidInvoices(validInvoices);

      // 3. Extract unique list of patients who have at least one paid invoice
      const patientMap = new Map();
      validInvoices.forEach((inv) => {
        if (inv.patients && !patientMap.has(inv.patient_id)) {
          patientMap.set(inv.patient_id, {
            ...inv.patients,
            paidInvoicesCount: 1,
          });
        } else if (inv.patients && patientMap.has(inv.patient_id)) {
          patientMap.get(inv.patient_id).paidInvoicesCount++;
        }
      });

      const patientsList = Array.from(patientMap.values());
      setEligiblePatients(patientsList);

      // If initialInvoice was passed, pre-select it
      if (initialInvoice && initialInvoice.patient_id) {
        setSelectedPatientId(initialInvoice.patient_id);
        setSelectedInvoiceId(initialInvoice.id);
        await loadInvoiceDetails(initialInvoice.id, initialInvoice);
      } else if (patientsList.length > 0) {
        const firstPatient = patientsList[0];
        setSelectedPatientId(firstPatient.id);
        const patientFirstInv = validInvoices.find((i) => i.patient_id === firstPatient.id);
        if (patientFirstInv) {
          setSelectedInvoiceId(patientFirstInv.id);
          await loadInvoiceDetails(patientFirstInv.id, patientFirstInv);
        }
      }
    } catch (err) {
      console.error('Error loading receipt data:', err);
    } finally {
      setFetchingData(false);
    }
  };

  // When patient selection changes, update available paid invoices
  const handlePatientChange = async (patientId: string) => {
    setSelectedPatientId(patientId);
    const patientInvs = paidInvoices.filter((i) => i.patient_id === patientId);
    if (patientInvs.length > 0) {
      const firstInv = patientInvs[0];
      setSelectedInvoiceId(firstInv.id);
      await loadInvoiceDetails(firstInv.id, firstInv);
    } else {
      setSelectedInvoiceId('');
      setItems([]);
      setPaidAmount('');
    }
  };

  // When selected invoice changes, load its items and payment transaction
  const handleInvoiceChange = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    const inv = paidInvoices.find((i) => i.id === invoiceId);
    if (inv) {
      await loadInvoiceDetails(invoiceId, inv);
    }
  };

  const loadInvoiceDetails = async (invoiceId: string, invoiceObj: any) => {
    try {
      const [{ data: lineItems }, { data: payments }] = await Promise.all([
        supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId),
        supabase.from('payments').select('*').eq('invoice_id', invoiceId).order('created_at', { ascending: false }).limit(1),
      ]);

      if (lineItems && lineItems.length > 0) {
        setItems(
          lineItems.map((i) => ({
            description: i.description,
            quantity: i.quantity || 1,
            unit_price: i.unit_price || 0,
          }))
        );
      } else {
        setItems([
          {
            description: 'Medical Services / Consultation Bill',
            quantity: 1,
            unit_price: invoiceObj.total_amount || 0,
          },
        ]);
      }

      const latestPayment = payments?.[0];
      setPaidAmount(invoiceObj.paid_amount || invoiceObj.total_amount || 0);
      setPaymentMethod(latestPayment?.payment_method || 'CASH');
      setPaymentReference(latestPayment?.reference_number || `REC-${invoiceId.slice(-6).toUpperCase()}`);
    } catch (err) {
      console.error('Error loading invoice details:', err);
    }
  };

  const addItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, unit_price: '' }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0
  );

  const effectivePaid = paidAmount === '' ? totalAmount : Number(paidAmount);
  const tenderNum = Number(tenderedCash) || 0;
  const changeDue = paymentMethod === 'CASH' && tenderNum > effectivePaid ? tenderNum - effectivePaid : 0;

  if (!isOpen || !mounted) return null;

  const patientInvoicesList = paidInvoices.filter((i) => i.patient_id === selectedPatientId);
  const selectedPatientObj = eligiblePatients.find((p) => p.id === selectedPatientId);

  const handlePrintReceipt = async () => {
    if (!selectedPatientId || !selectedPatientObj) {
      alert('Please select an eligible patient.');
      return;
    }
    if (items.length === 0) {
      alert('Please have at least one line item on the receipt.');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const recNumber = paymentReference || `REC-${Date.now().toString().slice(-6)}`;

      const printableReceipt: PrintableReceiptData = {
        receiptNumber: recNumber,
        invoiceId: selectedInvoiceId || undefined,
        createdAt: new Date().toISOString(),
        totalAmount,
        paidAmount: effectivePaid,
        paymentMethod,
        paymentReference: paymentReference || undefined,
        tenderedAmount: tenderNum > 0 ? tenderNum : undefined,
        changeAmount: changeDue > 0 ? changeDue : undefined,
        cashierName: user?.email ? user.email.split('@')[0].toUpperCase() : undefined,
        hospital: {
          name: hospitalDetails?.hospital_name || 'Hospital Medical Center',
          brandTitle: hospitalDetails?.brand_title,
          tagline: hospitalDetails?.tagline,
          logoUrl: hospitalDetails?.logo_url,
          address: hospitalDetails?.address,
          phone: hospitalDetails?.phone,
          email: hospitalDetails?.email,
          currencySymbol: currencyConfig.symbol,
          currencyPosition: currencyConfig.position,
        },
        patient: {
          firstName: selectedPatientObj.first_name || 'Patient',
          lastName: selectedPatientObj.last_name || '',
          fileNumber: selectedPatientObj.file_number,
          phone: selectedPatientObj.phone,
          email: selectedPatientObj.email,
          gender: selectedPatientObj.gender,
          dob: selectedPatientObj.dob,
        },
        items: items.map((i) => ({
          description: i.description || 'Medical Service',
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unit_price) || 0,
          totalPrice: (Number(i.quantity) || 1) * (Number(i.unit_price) || 0),
        })),
        notes: notes || undefined,
      };

      printReceiptDocument(printableReceipt);

      setStatus({
        type: 'success',
        title: 'Official Receipt Generated',
        message: `Official Receipt #${recNumber} for ${selectedPatientObj.first_name} ${selectedPatientObj.last_name} has been issued and printed.`,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error generating receipt:', err);
      setStatus({
        type: 'error',
        title: 'Receipt Generation Error',
        message: err.message || 'An unexpected error occurred while generating the receipt.',
      });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-8 border border-slate-200 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Issue Payment Receipt</h2>
              <p className="text-xs text-slate-500 font-medium">
                Generate official receipts for patients with verified settled / paid billing records.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {fetchingData ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 size={30} className="animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs font-bold text-slate-600">Verifying paid patient accounts & invoices...</p>
          </div>
        ) : eligiblePatients.length === 0 ? (
          <div className="p-8 bg-amber-50/70 border border-amber-200 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-extrabold text-amber-900">No Settled Invoices Found</h3>
            <p className="text-xs text-amber-700 max-w-md mx-auto">
              Generating receipts only applies to patients who have settled invoices with a <strong>PAID</strong> status. Please record a payment on an outstanding invoice first before issuing a receipt.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Patient Selection (Filtered by Paid Status) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Paid Patient / Payer *
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => handlePatientChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {eligiblePatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.file_number || 'No MRN'} • {p.paidInvoicesCount} Paid Bill{p.paidInvoicesCount > 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Specific Paid Invoice */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Settled Invoice / Bill *
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {patientInvoicesList.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      #{inv.id.slice(0, 8).toUpperCase()} • {formatCurrencyAmount(Number(inv.paid_amount || inv.total_amount), currencyConfig.symbol, currencyConfig.position)} ({inv.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Line Items Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Receipt Line Items & Services
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Plus size={13} /> Add Line
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Service / item name..."
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />

                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      className="w-16 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none text-center"
                    />

                    <div className="relative w-28">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => updateItem(idx, 'unit_price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none text-right"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Settlement Information */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                <CreditCard size={14} className="text-emerald-600" />
                <span>Settled Payment Receipt Information</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none mt-1"
                  >
                    <option value="CASH">Cash Settlement</option>
                    <option value="CARD">Credit / Debit Card (POS)</option>
                    <option value="MOBILE_MONEY">Mobile Money (M-Pesa, Airtel, MTN)</option>
                    <option value="BANK_TRANSFER">Direct Bank Wire / Transfer</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="INSURANCE_COPAY">Insurance Copay</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Receipt / TXN Ref #</label>
                  <input
                    type="text"
                    placeholder="e.g. REC-88912, POS-091"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Verified Amount Paid ({currencyConfig.symbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={totalAmount.toFixed(2)}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-emerald-600 focus:outline-none mt-1"
                  />
                </div>

                {paymentMethod === 'CASH' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Tendered Cash ({currencyConfig.symbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 200.00"
                      value={tenderedCash}
                      onChange={(e) => setTenderedCash(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none mt-1"
                    />
                    {changeDue > 0 && (
                      <span className="text-[10px] font-extrabold text-indigo-600 block mt-0.5">
                        Change Due: {formatCurrencyAmount(changeDue, currencyConfig.symbol, currencyConfig.position)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Total Calculation Bar */}
            <div className="flex justify-between items-center bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">Total Receipt Valuation</span>
                <span className="text-[10px] text-emerald-700 font-medium">Settled for {selectedPatientObj?.first_name} {selectedPatientObj?.last_name}</span>
              </div>
              <span className="text-2xl font-black text-emerald-700 tracking-tight">
                {formatCurrencyAmount(totalAmount, currencyConfig.symbol, currencyConfig.position)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handlePrintReceipt}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Preparing Receipt...</span>
                  </>
                ) : (
                  <>
                    <Printer size={15} />
                    <span>Generate & Print Receipt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Modal */}
      {status && (
        <StatusModal
          isOpen={true}
          type={status.type}
          title={status.title}
          message={status.message}
          actionLabel={status.type === 'success' ? 'Done' : 'Dismiss'}
          onClose={() => {
            const isSuccess = status.type === 'success';
            setStatus(null);
            if (isSuccess) {
              onClose();
            }
          }}
        />
      )}
    </div>,
    document.body
  );
}
