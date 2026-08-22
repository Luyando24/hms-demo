'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  X,
  Activity,
  Thermometer,
  Weight,
  Ruler,
  Save,
  DoorOpen,
  Stethoscope,
  AlertTriangle,
  FlaskConical,
  Check,
  Send,
  CornerDownRight,
  Loader2,
} from 'lucide-react';
import StatusModal from './StatusModal';
import clsx from 'clsx';

type TriageDestination = 'DOCTOR' | 'ER' | 'LAB';

export default function CaptureVitalsModal({
  isOpen,
  onClose,
  patientId,
  patientName,
}: {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState<TriageDestination>('DOCTOR');
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      void fetchRooms();
      void fetchDepartments();
    }
  }, [isOpen]);

  const fetchRooms = async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (data) setRooms(data);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name').order('name');
    if (data) setDepartments(data);
  };

  const getDeptId = (key: string): string | null => {
    const norm = key.toLowerCase();
    const found = departments.find((d) => {
      const name = d.name.toLowerCase();
      if (norm === 'opd') return name.includes('opd') || name.includes('outpatient');
      if (norm === 'er') return name.includes('er') || name.includes('emergency');
      if (norm === 'laboratory') return name.includes('lab') || name.includes('pathology');
      return name.includes(norm);
    });
    return found?.id || null;
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const roomId = formData.get('room_id') as string;
    const bpSystolic = parseInt(formData.get('bp_systolic') as string);
    const bpDiastolic = parseInt(formData.get('bp_diastolic') as string);
    const heartRate = parseInt(formData.get('heart_rate') as string);
    const temperature = parseFloat(formData.get('temperature') as string);
    const spO2 = parseInt(formData.get('sp_o2') as string);
    const weight = parseFloat(formData.get('weight') as string);
    const height = parseFloat(formData.get('height') as string);

    // 1. Insert vitals
    const vitalsData = {
      patient_id: patientId,
      bp_systolic: bpSystolic || null,
      bp_diastolic: bpDiastolic || null,
      heart_rate: heartRate || null,
      temperature: temperature || null,
      sp_o2: spO2 || null,
      weight: weight || null,
      height: height || null,
      recorded_at: new Date().toISOString(),
    };

    const { error: vitalsError } = await supabase.from('vitals').insert(vitalsData);

    if (vitalsError) {
      setStatus({
        type: 'error',
        title: 'Save Failed',
        message: vitalsError.message,
      });
      setLoading(false);
      return;
    }

    // 2. Queue & Department Routing
    const { data: queueRow } = await supabase
      .from('walkin_queue')
      .select('token_number')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const token = queueRow?.token_number || null;

    if (destination === 'ER') {
      const erDeptId = getDeptId('er');
      await supabase.from('walkin_queue').insert({
        patient_id: patientId,
        department_id: erDeptId,
        status: 'WAITING',
        priority: 'EMERGENCY',
        reason: `Emergency Escalation from Triage (BP: ${bpSystolic}/${bpDiastolic}, SpO2: ${spO2}%)`,
        token_number: token,
      });

      setStatus({
        type: 'success',
        title: 'Vitals Saved & Escalated to ER',
        message: `Vitals recorded. Patient ${patientName} was immediately escalated to the Emergency Room (ER) queue with critical priority.`,
      });
    } else if (destination === 'LAB') {
      const labDeptId = getDeptId('laboratory');
      await supabase.from('walkin_queue').insert({
        patient_id: patientId,
        department_id: labDeptId,
        status: 'WAITING',
        priority: 'NORMAL',
        reason: 'Routine Pre-Consultation Lab Work',
        token_number: token,
      });

      setStatus({
        type: 'success',
        title: 'Vitals Saved & Routed to Lab',
        message: `Vitals recorded. Patient ${patientName} was forwarded to the Diagnostic Laboratory.`,
      });
    } else {
      // DOCTOR OPD
      const selectedRoom = rooms.find((r) => r.id === roomId);
      await supabase
        .from('walkin_queue')
        .update({
          status: 'CONSULTATION',
          room_id: roomId || null,
        })
        .eq('patient_id', patientId)
        .eq('status', 'WAITING');

      setStatus({
        type: 'success',
        title: 'Triage Complete & Patient Queued',
        message: `Vitals for ${patientName} recorded. Patient moved to consultation queue${selectedRoom ? ` for ${selectedRoom.name}` : ''}.`,
      });
    }

    setLoading(false);
  };

  const destinationOptions = [
    {
      id: 'DOCTOR' as TriageDestination,
      label: 'Doctor OPD Room',
      tag: 'Consultation Queue',
      icon: Stethoscope,
    },
    {
      id: 'ER' as TriageDestination,
      label: 'Emergency (ER)',
      tag: 'Critical Escalation',
      icon: AlertTriangle,
    },
    {
      id: 'LAB' as TriageDestination,
      label: 'Diagnostic Lab',
      tag: 'Pre-Exam Tests',
      icon: FlaskConical,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
                <Activity size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Capture Vitals & Triage</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Recording vitals for <span className="text-brand-600 font-bold">{patientName}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <Activity size={12} className="text-rose-500" /> BP Systolic (mmHg) *
                </label>
                <input
                  required
                  name="bp_systolic"
                  type="number"
                  placeholder="120"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <Activity size={12} className="text-rose-500" /> BP Diastolic (mmHg) *
                </label>
                <input
                  required
                  name="bp_diastolic"
                  type="number"
                  placeholder="80"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <Activity size={12} className="text-rose-500" /> Heart Rate (bpm) *
                </label>
                <input
                  required
                  name="heart_rate"
                  type="number"
                  placeholder="72"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <Thermometer size={12} className="text-amber-500" /> Temp (°C) *
                </label>
                <input
                  required
                  name="temperature"
                  type="number"
                  step="0.1"
                  placeholder="36.5"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <Activity size={12} className="text-blue-500" /> SpO2 (%) *
                </label>
                <input
                  required
                  name="sp_o2"
                  type="number"
                  placeholder="98"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <Weight size={12} className="text-slate-500" /> Weight (kg) *
                </label>
                <input
                  required
                  name="weight"
                  type="number"
                  step="0.1"
                  placeholder="70"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            {/* Next Step / Destination Selector */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div>
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Send size={14} className="text-brand-600" />
                  Route Patient Next *
                </label>
                <p className="text-[11px] text-slate-500 font-medium">
                  Direct patient to appropriate consultation or critical care area:
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {destinationOptions.map((opt) => {
                  const isSelected = destination === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDestination(opt.id)}
                      className={clsx(
                        'p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 shadow-xs',
                        isSelected
                          ? opt.id === 'ER'
                            ? 'border-rose-600 bg-rose-50/70 ring-2 ring-rose-500/20'
                            : 'border-brand-600 bg-brand-50/70 ring-2 ring-brand-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50',
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={clsx(
                            'w-7 h-7 rounded-xl flex items-center justify-center transition-colors',
                            isSelected
                              ? opt.id === 'ER'
                                ? 'bg-rose-600 text-white'
                                : 'bg-brand-600 text-white'
                              : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          <Icon size={14} />
                        </div>
                        {isSelected && (
                          <div
                            className={clsx(
                              'w-3.5 h-3.5 rounded-full text-white flex items-center justify-center',
                              opt.id === 'ER' ? 'bg-rose-600' : 'bg-brand-600',
                            )}
                          >
                            <Check size={8} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] font-black text-slate-900 leading-tight">
                          {opt.label}
                        </div>
                        <div className="text-[9px] font-semibold text-slate-400 mt-0.5">
                          {opt.tag}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Room Assignment (Shown when DOCTOR is selected) */}
            {destination === 'DOCTOR' && (
              <div className="space-y-1.5 pt-2 animate-in fade-in">
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                  <DoorOpen size={13} className="text-brand-600" /> Assign Consultation Room
                </label>
                <select
                  name="room_id"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Select a doctor room (Optional)...</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={onClose}
                type="button"
                className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                type="submit"
                className={clsx(
                  'flex-[2] text-white px-5 py-3 rounded-xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50',
                  destination === 'ER'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                    : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20',
                )}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    <Save size={16} /> Complete Triage & Forward <CornerDownRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
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
          if (isSuccess) onClose();
        }}
      />
    </>
  );
}
