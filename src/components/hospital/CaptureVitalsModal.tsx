'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  ShieldCheck,
} from 'lucide-react';
import StatusModal from './StatusModal';
import { useFormDraft } from '@/hooks/useFormDraft';
import { FormDraftAlert } from '@/components/common/FormDraftAlert';
import clsx from 'clsx';

type TriageDestination = 'DOCTOR' | 'ER' | 'LAB';

export default function CaptureVitalsModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  queueId,
}: {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  queueId?: string;
}) {
  const [mounted, setMounted] = useState(false);
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

  const [formData, setFormData] = useState({
    bp_systolic: '',
    bp_diastolic: '',
    heart_rate: '',
    temperature: '',
    sp_o2: '',
    weight: '',
    height: '',
    room_id: '',
  });

  const {
    hasDraft,
    draftTimestamp,
    restoreDraft,
    clearDraft,
    lastSavedAt,
  } = useFormDraft(`vitals_${patientId}`, formData, setFormData, {
    debounceMs: 300,
    isEnabled: isOpen,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus({
        type: 'error',
        title: 'Offline Mode Active',
        message: 'Your vitals measurements are securely saved in your local draft. Please wait until your connection returns to finalize and submit to triage.',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setStatus({
          type: 'error',
          title: 'Authentication Required',
          message: 'Please sign in before capturing vitals.',
        });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', authData.user.id)
        .maybeSingle();

      const userRole = (
        profile?.role ||
        authData.user.user_metadata?.role ||
        (authData.user.app_metadata as any)?.role ||
        ''
      )
        .toString()
        .trim()
        .toUpperCase();

      const allowedRoles = ['NURSE', 'ADMIN', 'SUPERADMIN', 'DOCTOR', 'PHYSICIAN', 'STAFF'];
      if (userRole && !allowedRoles.includes(userRole)) {
        setStatus({
          type: 'error',
          title: 'Access Restricted to Clinical Staff',
          message: `You are currently signed in as ${authData.user.email} with role '${userRole}'. Only registered clinical staff are authorized to record vitals and conduct triage.`,
        });
        return;
      }

      const roomId = formData.room_id || null;
      const bpSystolic = formData.bp_systolic ? parseInt(formData.bp_systolic, 10) : null;
      const bpDiastolic = formData.bp_diastolic ? parseInt(formData.bp_diastolic, 10) : null;
      const heartRate = formData.heart_rate ? parseInt(formData.heart_rate, 10) : null;
      const temperature = formData.temperature ? parseFloat(formData.temperature) : null;
      const spO2 = formData.sp_o2 ? parseInt(formData.sp_o2, 10) : null;
      const weight = formData.weight ? parseFloat(formData.weight) : null;
      const height = formData.height ? parseFloat(formData.height) : null;

      const bmiValue = (weight && height && height > 0)
        ? parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1))
        : null;

      // 1. Insert vitals
      const vitalsData = {
        patient_id: patientId,
        recorded_by: profile?.id || authData.user.id,
        bp_systolic: isNaN(bpSystolic as number) ? null : bpSystolic,
        bp_diastolic: isNaN(bpDiastolic as number) ? null : bpDiastolic,
        heart_rate: isNaN(heartRate as number) ? null : heartRate,
        temperature: isNaN(temperature as number) ? null : temperature,
        sp_o2: isNaN(spO2 as number) ? null : spO2,
        weight: isNaN(weight as number) ? null : weight,
        height: isNaN(height as number) ? null : height,
        bmi: bmiValue,
      };

      const { error: vitalsError } = await supabase.from('vitals').insert(vitalsData);

      if (vitalsError) {
        console.error('Vitals insertion error:', vitalsError);
        setStatus({
          type: 'error',
          title: 'Save Failed',
          message: vitalsError.message || 'Could not record vitals.',
        });
        return;
      }

      // 2. Clear saved draft on success
      clearDraft();

      // 3. Forward patient based on destination
      let queueQuery = supabase
        .from('walkin_queue')
        .select('id, token_number');

      if (queueId) {
        queueQuery = queueQuery.eq('id', queueId);
      } else {
        queueQuery = queueQuery
          .eq('patient_id', patientId)
          .in('status', ['WAITING', 'CALLING'])
          .order('created_at', { ascending: false })
          .limit(1);
      }

      const { data: queueRow } = await queueQuery.maybeSingle();
      const token = queueRow?.token_number || null;
      const targetQueueId = queueRow?.id || queueId;

      if (destination === 'ER') {
        const erDeptId = getDeptId('er');
        if (targetQueueId) {
          await supabase.from('walkin_queue').update({ status: 'COMPLETED' }).eq('id', targetQueueId);
        }
        await supabase.from('walkin_queue').insert({
          patient_id: patientId,
          department_id: erDeptId,
          status: 'WAITING',
          priority: 'EMERGENCY',
          reason: `Emergency Escalation from Triage (BP: ${bpSystolic || '—'}/${bpDiastolic || '—'}, SpO2: ${spO2 || '—'}%)`,
          token_number: token,
        });

        setStatus({
          type: 'success',
          title: 'Vitals Saved & Escalated to ER',
          message: `Vitals recorded. Patient ${patientName} was immediately escalated to the Emergency Room (ER) queue with critical priority.`,
        });
      } else if (destination === 'LAB') {
        const labDeptId = getDeptId('laboratory');
        if (targetQueueId) {
          await supabase.from('walkin_queue').update({ status: 'COMPLETED' }).eq('id', targetQueueId);
        }
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
        const targetStatus = selectedRoom ? 'CONSULTATION' : 'TRIAGED';

        if (targetQueueId) {
          await supabase
            .from('walkin_queue')
            .update({
              status: targetStatus,
              room_id: roomId || null,
            })
            .eq('id', targetQueueId);
        } else {
          await supabase
            .from('walkin_queue')
            .update({
              status: targetStatus,
              room_id: roomId || null,
            })
            .eq('patient_id', patientId)
            .in('status', ['WAITING', 'CALLING']);
        }

        setStatus({
          type: 'success',
          title: 'Triage Complete & Patient Queued',
          message: `Vitals for ${patientName} recorded. Patient moved to consultation queue${selectedRoom ? ` for ${selectedRoom.name}` : ''}.`,
        });
      }
    } catch (err: any) {
      console.error('Error submitting triage vitals:', err);
      setStatus({
        type: 'error',
        title: 'Triage Submission Failed',
        message: err?.message || 'An unexpected error occurred while saving vitals. Please check your connection and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelModal = async () => {
    if (queueId) {
      // Revert status to WAITING if still CALLING
      await supabase
        .from('walkin_queue')
        .update({ status: 'WAITING' })
        .eq('id', queueId)
        .eq('status', 'CALLING');
    }
    onClose();
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

  return createPortal(
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 border border-slate-200/80">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <Activity size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Capture Vitals & Triage</h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Recording vitals for <span className="text-slate-900 font-semibold">{patientName}</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleCancelModal}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Offline & Auto-save Draft Alert */}
            <FormDraftAlert
              hasDraft={hasDraft}
              draftTimestamp={draftTimestamp}
              onRestore={restoreDraft}
              onDiscard={clearDraft}
              lastSavedAt={lastSavedAt}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <Activity size={12} className="text-rose-500" /> BP Systolic (mmHg) *
                </label>
                <input
                  required
                  name="bp_systolic"
                  type="number"
                  placeholder="120"
                  value={formData.bp_systolic}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bp_systolic: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <Activity size={12} className="text-rose-500" /> BP Diastolic (mmHg) *
                </label>
                <input
                  required
                  name="bp_diastolic"
                  type="number"
                  placeholder="80"
                  value={formData.bp_diastolic}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bp_diastolic: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <Activity size={12} className="text-rose-500" /> Heart Rate (bpm) *
                </label>
                <input
                  required
                  name="heart_rate"
                  type="number"
                  placeholder="72"
                  value={formData.heart_rate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, heart_rate: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <Thermometer size={12} className="text-amber-500" /> Temp (°C) *
                </label>
                <input
                  required
                  name="temperature"
                  type="number"
                  step="0.1"
                  placeholder="36.5"
                  value={formData.temperature}
                  onChange={(e) => setFormData((prev) => ({ ...prev, temperature: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <Activity size={12} className="text-blue-500" /> SpO2 (%) *
                </label>
                <input
                  required
                  name="sp_o2"
                  type="number"
                  placeholder="98"
                  value={formData.sp_o2}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sp_o2: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <Weight size={12} className="text-slate-500" /> Weight (kg) *
                </label>
                <input
                  required
                  name="weight"
                  type="number"
                  step="0.1"
                  placeholder="70"
                  value={formData.weight}
                  onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <Ruler size={12} className="text-slate-500" /> Height (cm)
                </label>
                <input
                  name="height"
                  type="number"
                  step="0.1"
                  placeholder="175"
                  value={formData.height}
                  onChange={(e) => setFormData((prev) => ({ ...prev, height: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                />
              </div>
            </div>

            {/* Next Step / Destination Selector */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Send size={13} className="text-slate-600" />
                Route Patient Next *
              </label>

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
                        'p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 shadow-xs',
                        isSelected
                          ? opt.id === 'ER'
                            ? 'border-rose-600 bg-rose-50 text-rose-900'
                            : 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-900',
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={clsx(
                            'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
                            isSelected
                              ? opt.id === 'ER'
                                ? 'bg-rose-600 text-white'
                                : 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-600',
                          )}
                        >
                          <Icon size={13} />
                        </div>
                        {isSelected && (
                          <div
                            className={clsx(
                              'w-3.5 h-3.5 rounded-full text-white flex items-center justify-center',
                              opt.id === 'ER' ? 'bg-rose-600' : 'bg-white/20',
                            )}
                          >
                            <Check size={8} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className={clsx('text-[11px] font-bold leading-tight', isSelected && opt.id !== 'ER' ? 'text-white' : 'text-slate-900')}>
                          {opt.label}
                        </div>
                        <div className={clsx('text-[9px] mt-0.5', isSelected && opt.id !== 'ER' ? 'text-slate-300' : 'text-slate-400')}>
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
              <div className="space-y-1 pt-1 animate-in fade-in">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <DoorOpen size={13} className="text-slate-500" /> Assign Consultation Room (Optional)
                </label>
                <select
                  name="room_id"
                  value={formData.room_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, room_id: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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
            <div className="flex gap-2.5 pt-3 border-t border-slate-100 justify-end">
              <button
                onClick={handleCancelModal}
                type="button"
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                type="submit"
                className={clsx(
                  'text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-98',
                  destination === 'ER'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-slate-900 hover:bg-slate-800',
                )}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <>
                    <Save size={14} /> Forward Triage
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
    </>,
    document.body
  );
}
