'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatCurrencyAmount } from '@/utils/currency';
import StatusModal from './StatusModal';

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
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [currencyConfig, setCurrencyConfig] = useState<{
    symbol: string;
    position: 'prefix' | 'suffix';
  }>({ symbol: '$', position: 'prefix' });

  const [items, setItems] = useState<
    Array<{ description: string; quantity: number; unit_price: number }>
  >([{ description: 'General OPD Consultation', quantity: 1, unit_price: 150 }]);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      void supabase
        .from('patients')
        .select('id, first_name, last_name, file_number')
        .order('first_name')
        .then(({ data }) => {
          if (data) setPatients(data);
        });

      void supabase
        .from('system_settings')
        .select('currency_symbol, currency_position, consultation_fee')
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
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

  if (!isOpen) return null;

  const addItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0 }]);
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
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      alert('Please select a patient.');
      return;
    }
    if (items.length === 0 || items.some((i) => !i.description)) {
      alert('Please complete all line items.');
      return;
    }

    setLoading(true);

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

    if (invoiceError) {
      setStatus({
        type: 'error',
        title: 'Invoice Failed',
        message: invoiceError.message,
      });
      setLoading(false);
      return;
    }

    // 2. Insert line items
    const lineItems = items.map((i) => ({
      invoice_id: invoice.id,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.quantity * i.unit_price,
    }));

    await supabase.from('invoice_items').insert(lineItems);

    setStatus({
      type: 'success',
      title: 'Invoice Generated',
      message: `Invoice for ${formatCurrencyAmount(
        totalAmount,
        currencyConfig.symbol,
        currencyConfig.position,
      )} has been created.`,
    });
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xl font-black text-slate-900">Generate New Invoice</h2>
              <p className="text-sm text-slate-500 font-medium">Create itemized patient bill.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200"
            >
              <X size={20} />
            </button>
          </div>

          <form
            id="generate-invoice-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-8 space-y-6"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                Select Patient *
              </label>
              <select
                required
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">Choose Patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.file_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Line Items
                </h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-brand-600 text-xs font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    required
                    placeholder="Description (e.g. Consultation, Lab Test)"
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    className="flex-[3] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(idx, 'quantity', parseInt(e.target.value) || 1)
                    }
                    className="w-16 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)
                    }
                    className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-right"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm font-black text-slate-900">Total Invoice Amount</span>
                <span className="text-xl font-black text-brand-600">
                  {formatCurrencyAmount(
                    totalAmount,
                    currencyConfig.symbol,
                    currencyConfig.position,
                  )}
                </span>
              </div>
            </div>
          </form>

          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              type="submit"
              form="generate-invoice-form"
              className="flex-[2] bg-brand-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <FileText size={18} /> Generate Invoice
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
    </>
  );
}
