'use client'

import { useState, useEffect } from 'react';
import { X, FlaskConical, Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { CommonTestType } from '@/types/clinical';
import { listCommonTestTypesAction } from '@/app/hospital/settings/clinical-tests-actions';
import StatusModal from './StatusModal';

interface CreateLabOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateLabOrderModal({ isOpen, onClose, onSuccess }: CreateLabOrderModalProps) {
  const [patients, setPatients] = useState<any[]>([]);
  const [commonTests, setCommonTests] = useState<CommonTestType[]>([]);
  const [selectedCommonTestId, setSelectedCommonTestId] = useState<string>('');
  const [testName, setTestName] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [referenceRange, setReferenceRange] = useState<string>('');
  const [priority, setPriority] = useState<string>('NORMAL');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      // 1. Fetch patients
      supabase.from('patients').select('id, first_name, last_name, file_number').order('first_name').then(({ data }) => {
        if (data) setPatients(data);
      });

      // 2. Fetch configured common medical tests
      listCommonTestTypesAction({ activeOnly: true }).then((res) => {
        if (res.success && res.data) {
          setCommonTests(res.data);
        }
      });
    }
  }, [isOpen, supabase]);

  const handleClose = () => {
    setSelectedCommonTestId('');
    setTestName('');
    setUnit('');
    setReferenceRange('');
    setPriority('NORMAL');
    onClose();
  };

  if (!isOpen) return null;

  const handleSelectCommonTest = (testId: string) => {
    setSelectedCommonTestId(testId);
    if (!testId || testId === 'CUSTOM') {
      return;
    }

    const test = commonTests.find((t) => t.id === testId);
    if (test) {
      setTestName(test.name);
      setUnit(test.default_unit || '');
      setReferenceRange(test.default_reference_range || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const patientId = formData.get('patient_id') as string;
    const finalTestName = testName.trim();

    if (!finalTestName) {
      setStatus({ type: 'error', title: 'Test Name Required', message: 'Please specify a test name or select a common test.' });
      setLoading(false);
      return;
    }

    // 1. Insert lab order
    const { data: order, error: orderError } = await supabase
      .from('lab_orders')
      .insert({
        patient_id: patientId,
        priority: priority || 'NORMAL',
        status: 'ORDERED'
      })
      .select()
      .single();

    if (orderError) {
      setStatus({ type: 'error', title: 'Order Failed', message: orderError.message });
      setLoading(false);
      return;
    }

    // 2. Insert lab result record
    const { error: resultError } = await supabase
      .from('lab_results')
      .insert({
        order_id: order.id,
        test_name: finalTestName,
        unit: unit.trim() || null,
        reference_range: referenceRange.trim() || null,
        status: 'PENDING'
      });

    if (resultError) {
      setStatus({ type: 'error', title: 'Result Init Failed', message: resultError.message });
    } else {
      setStatus({ type: 'success', title: 'Sample Received', message: `Lab order for ${finalTestName} created successfully.` });
    }
    setLoading(false);
  };

  // Group common tests by category
  const categories = Array.from(new Set(commonTests.map((t) => t.category || 'General'))).sort();

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xl font-black text-slate-900">Receive New Lab Sample</h2>
              <p className="text-sm text-slate-500">Order lab test and initialize sample tracking.</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200">
              <X size={20} />
            </button>
          </div>

          <form id="create-lab-form" onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Select Patient *</label>
              <select required name="patient_id" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20">
                <option value="">Choose Patient...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.file_number})</option>
                ))}
              </select>
            </div>

            {/* Configurable Common Medical Tests Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} className="text-brand-600" />
                  Select Common Medical Test
                </label>
                <span className="text-[10px] text-brand-600 font-bold uppercase tracking-wider">
                  Configured Catalog
                </span>
              </div>
              <select
                value={selectedCommonTestId}
                onChange={(e) => handleSelectCommonTest(e.target.value)}
                className="w-full px-4 py-3 bg-brand-50/40 border border-brand-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">-- Choose from Configured Common Tests --</option>
                {categories.map((cat) => (
                  <optgroup key={cat} label={`📂 ${cat}`}>
                    {commonTests
                      .filter((t) => (t.category || 'General') === cat)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.default_unit ? `(${t.default_unit})` : ''}
                        </option>
                      ))}
                  </optgroup>
                ))}
                <option value="CUSTOM">✍️ Enter Custom / Unlisted Test Name...</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Test Description / Name *</label>
              <input
                required
                name="test_name"
                value={testName}
                onChange={(e) => {
                  setTestName(e.target.value);
                  setSelectedCommonTestId('CUSTOM');
                }}
                placeholder="e.g. Full Blood Count (FBC), Lipid Profile"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Priority</label>
                <select
                  name="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="URGENT">Urgent</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Unit</label>
                <input
                  name="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="g/dL, mmol/L"
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Ref Range</label>
                <input
                  name="reference_range"
                  value={referenceRange}
                  onChange={(e) => setReferenceRange(e.target.value)}
                  placeholder="12.0 - 15.5"
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
          </form>

          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
            <button onClick={handleClose} type="button" className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-white transition-colors">
              Cancel
            </button>
            <button disabled={loading} type="submit" form="create-lab-form" className="flex-[2] bg-brand-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><FlaskConical size={18} /> Create Lab Order</>}
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
            handleClose();
          }
        }}
      />
    </>
  );
}
