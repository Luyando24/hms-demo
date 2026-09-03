'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Plus, Trash2, Save, Loader2, Printer, CheckCircle2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatCurrencyAmount } from '@/utils/currency';
import { printInvoiceDocument, PrintableInvoiceData } from '@/utils/invoicePrintGenerator';
import StatusModal from './StatusModal';
import { useFormDraft } from '@/hooks/useFormDraft';
import { FormDraftAlert } from '@/components/common/FormDraftAlert';

interface GenerateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GenerateInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
}: GenerateInvoiceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [currencyConfig, setCurrencyConfig] = useState<{
    symbol: string;
    position: 'prefix' | 'suffix';
  }>({ symbol: '$', position: 'prefix' });
  const [hospitalDetails, setHospitalDetails] = useState<any>(null);

  const [items, setItems] = useState<
    Array<{ description: string; quantity: number | string; unit_price: number | string; stockInfo?: string }>
  >([{ description: 'General OPD Consultation', quantity: 1, unit_price: 150 }]);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    invoiceData?: PrintableInvoiceData;
  } | null>(null);

  const invoiceDraftData = {
    selectedPatientId,
    items,
  };

  const handleRestoreInvoice = (saved: any) => {
    if (saved.selectedPatientId !== undefined) setSelectedPatientId(saved.selectedPatientId);
    if (saved.items !== undefined && Array.isArray(saved.items)) setItems(saved.items);
  };

  const {
    hasDraft,
    draftTimestamp,
    restoreDraft,
    clearDraft,
    lastSavedAt,
  } = useFormDraft('generate_invoice', invoiceDraftData, handleRestoreInvoice as any, {
    debounceMs: 300,
    isEnabled: isOpen,
  });

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      void supabase
        .from('patients')
        .select('*')
        .order('first_name')
        .then(({ data }) => {
          if (data) setPatients(data);
        });

      void supabase
        .from('inventory_items')
        .select('id, name, category, unit, unit_price, stock_level')
        .order('name')
        .then(({ data }) => {
          if (data) setInventoryItems(data);
        });

      void supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setHospitalDetails(data);
            setCurrencyConfig({
              symbol: data.currency_symbol || '$',
              position: (data.currency_position as 'prefix' | 'suffix') || 'prefix',
            });
            const fee = Number(data.consultation_fee) || 150;
            setItems([{ description: 'General OPD Consultation', quantity: 1, unit_price: fee }]);
          }
        });
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

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

  const handleDescriptionChange = (index: number, val: string) => {
    const matched = inventoryItems.find(
      (inv) =>
        inv.name?.toLowerCase() === val.trim().toLowerCase() ||
        `${inv.name} (${inv.unit || 'unit'})`.toLowerCase() === val.trim().toLowerCase()
    );

    setItems((prev) => {
      const next = [...prev];
      if (matched) {
        next[index] = {
          ...next[index],
          description: matched.name,
          unit_price: matched.unit_price !== undefined && matched.unit_price !== null ? matched.unit_price : 0,
          stockInfo: `In Stock: ${matched.stock_level || 0} ${matched.unit || 'units'}`,
        };
      } else {
        next[index] = {
          ...next[index],
          description: val,
        };
      }
      return next;
    });
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0,
  );

  const handleGenerate = async (shouldPrint = true) => {
    if (!selectedPatientId) {
      alert('Please select a patient.');
      return;
    }
    if (items.length === 0 || items.some((i) => !i.description)) {
      alert('Please complete all line items.');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus({
        type: 'error',
        title: 'Offline Mode Active',
        message: 'Your billing invoice draft is securely preserved locally. Please wait until your connection returns to register and print the invoice.',
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Create invoice record
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          patient_id: selectedPatientId,
          total_amount: totalAmount,
          paid_amount: 0,
          status: 'UNPAID',
        })
        .select()
        .single();

      if (invoiceError || !invoice) {
        setStatus({
          type: 'error',
          title: 'Invoice Failed',
          message: invoiceError?.message || 'Failed to create invoice record.',
        });
        setLoading(false);
        return;
      }

      // 2. Insert line items
      const lineItems = items.map((i) => ({
        invoice_id: invoice.id,
        description: i.description,
        quantity: Number(i.quantity) || 1,
        unit_price: Number(i.unit_price) || 0,
        total_price: (Number(i.quantity) || 1) * (Number(i.unit_price) || 0),
      }));

      await supabase.from('invoice_items').insert(lineItems);

      // Clear draft on successful creation
      clearDraft();

      const patientObj = patients.find((p) => p.id === selectedPatientId) || {
        first_name: 'Patient',
        last_name: '',
      };

      const printableData: PrintableInvoiceData = {
        invoiceId: invoice.id,
        createdAt: invoice.created_at || new Date().toISOString(),
        status: invoice.status || 'UNPAID',
        totalAmount: totalAmount,
        paidAmount: 0,
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
          firstName: patientObj.first_name || '',
          lastName: patientObj.last_name || '',
          fileNumber: patientObj.file_number,
          phone: patientObj.phone,
          email: patientObj.email,
          gender: patientObj.gender,
          dob: patientObj.dob,
        },
        items: items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unit_price) || 0,
          totalPrice: (Number(i.quantity) || 1) * (Number(i.unit_price) || 0),
        })),
      };

      // 3. Trigger Print Screen if requested
      if (shouldPrint) {
        printInvoiceDocument(printableData);
      }

      setStatus({
        type: 'success',
        title: 'Invoice Generated Successfully',
        message: shouldPrint
          ? `Invoice #${invoice.id.slice(0, 8).toUpperCase()} for ${formatCurrencyAmount(totalAmount, currencyConfig.symbol, currencyConfig.position)} was created and sent to print.`
          : `Invoice #${invoice.id.slice(0, 8).toUpperCase()} for ${formatCurrencyAmount(totalAmount, currencyConfig.symbol, currencyConfig.position)} was saved as UNPAID.`,
        invoiceData: printableData,
      });
    } catch (err: any) {
      setStatus({
        type: 'error',
        title: 'Unexpected Error',
        message: err?.message || 'An unexpected error occurred while generating invoice.',
      });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xl font-black text-slate-900">Generate New Invoice</h2>
              <p className="text-sm text-slate-500 font-medium">Create itemized patient bill & print.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {/* Offline & Auto-save Draft Alert */}
            <FormDraftAlert
              hasDraft={hasDraft}
              draftTimestamp={draftTimestamp}
              onRestore={restoreDraft}
              onDiscard={clearDraft}
              lastSavedAt={lastSavedAt}
            />
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                Select Patient *
              </label>
              <select
                required
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
              >
                <option value="">Choose Patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.file_number})
                  </option>
                ))}
              </select>
            </div>

            {/* Datalist for active Inventory items */}
            <datalist id="inventory-medical-items">
              {inventoryItems.map((inv) => (
                <option
                  key={inv.id}
                  value={inv.name}
                  label={`${inv.category || 'Pharmacy'} • ${formatCurrencyAmount(inv.unit_price || 0, currencyConfig.symbol, currencyConfig.position)} (Stock: ${inv.stock_level || 0} ${inv.unit || 'units'})`}
                />
              ))}
            </datalist>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Line Items
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">Type or pick from active medical inventory for auto-pricing</p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-slate-900 text-xs font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center gap-3">
                    <input
                      required
                      list="inventory-medical-items"
                      placeholder="Description / Medical Item (e.g. Paracetamol, Saline)"
                      value={item.description}
                      onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                      className="flex-[3] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(idx, 'quantity', e.target.value)
                      }
                      className="w-16 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(idx, 'unit_price', e.target.value)
                        }
                        className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-right focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  {item.stockInfo && (
                    <p className="text-[10px] text-emerald-600 font-bold ml-1">
                      ✓ Linked to Inventory: {item.stockInfo}
                    </p>
                  )}
                </div>
              ))}

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm font-black text-slate-900">Total Invoice Amount</span>
                <span className="text-xl font-black text-slate-900">
                  {formatCurrencyAmount(
                    totalAmount,
                    currencyConfig.symbol,
                    currencyConfig.position,
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              onClick={() => handleGenerate(false)}
              type="button"
              className="flex-1 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Save size={14} /> Save Only
            </button>
            <button
              disabled={loading}
              onClick={() => handleGenerate(true)}
              type="button"
              className="flex-[1.5] bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <>
                  <Printer size={15} /> Generate & Print
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <StatusModal
        isOpen={!!status}
        type={status?.type || 'success'}
        title={status?.title || ''}
        message={status?.message || ''}
        onClose={() => {
          const isSuccess = status?.type === 'success';
          setStatus(null);
          if (isSuccess) {
            onSuccess();
            onClose();
          }
        }}
      />
    </>,
    document.body
  );
}
