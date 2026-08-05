import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CreditCard,
  Heart,
  Pill,
  Thermometer,
} from 'lucide-react';
import { requireRole } from '@/lib/auth';

function displayDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : 'Not available';
}

export default async function PatientPortalOverview() {
  const { user, supabase } = await requireRole(['PATIENT']);
  const { data: patient } = await supabase
    .from('patients')
    .select('id, first_name, last_name, file_number')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!patient) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-8">
        <h1 className="text-2xl font-black text-amber-900">Patient record not linked</h1>
        <p className="mt-2 text-amber-800">
          Ask hospital reception to link your portal login to your clinical record.
        </p>
      </div>
    );
  }

  const now = new Date().toISOString();
  const [vitalsResult, appointmentsResult, labsResult, prescriptionsResult, invoicesResult] =
    await Promise.all([
      supabase
        .from('vitals')
        .select('heart_rate, bp_systolic, bp_diastolic, temperature, sp_o2, recorded_at')
        .eq('patient_id', patient.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('appointments')
        .select('id, appointment_date, status, reason, profiles(first_name, last_name)')
        .eq('patient_id', patient.id)
        .gte('appointment_date', now)
        .neq('status', 'CANCELLED')
        .order('appointment_date')
        .limit(3),
      supabase
        .from('lab_results')
        .select('id, test_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('prescriptions')
        .select('id, status, prescription_items(dosage, frequency, inventory_items(name))')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('invoices')
        .select('total_amount, paid_amount, status')
        .eq('patient_id', patient.id)
        .neq('status', 'CANCELLED'),
    ]);

  const vitals = vitalsResult.data;
  const appointments = appointmentsResult.data || [];
  const labs = labsResult.data || [];
  const prescriptions = prescriptionsResult.data || [];
  const balance = (invoicesResult.data || []).reduce(
    (total, invoice) =>
      total + Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0),
    0,
  );
  const vitalCards = [
    {
      label: 'Heart Rate',
      value: vitals?.heart_rate ?? '—',
      unit: 'bpm',
      icon: Heart,
    },
    {
      label: 'Blood Pressure',
      value:
        vitals?.bp_systolic && vitals?.bp_diastolic
          ? vitals.bp_systolic + '/' + vitals.bp_diastolic
          : '—',
      unit: 'mmHg',
      icon: Activity,
    },
    {
      label: 'Temperature',
      value: vitals?.temperature ?? '—',
      unit: '°C',
      icon: Thermometer,
    },
    { label: 'SpO₂', value: vitals?.sp_o2 ?? '—', unit: '%', icon: Activity },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl md:p-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-300">
          Patient health portal · {patient.file_number}
        </p>
        <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-black">
              Hello, {patient.first_name} {patient.last_name}
            </h1>
            <p className="mt-2 text-slate-300">
              {appointments.length} upcoming visit{appointments.length === 1 ? '' : 's'} and{' '}
              {labs.length} recent lab result{labs.length === 1 ? '' : 's'}.
            </p>
          </div>
          <Link
            href="/patient/portal/appointments"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-bold"
          >
            Book a visit <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section>
        <p className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
          Latest vitals · {displayDate(vitals?.recorded_at)}
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {vitalCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5">
              <card.icon className="mb-4 text-brand-600" size={22} />
              <p className="text-xs font-bold uppercase text-slate-400">{card.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {card.value} <span className="text-xs text-slate-400">{card.unit}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-black text-slate-900">Upcoming appointments</h2>
            <CalendarDays className="text-brand-600" size={20} />
          </div>
          <div className="space-y-3">
            {appointments.length ? (
              appointments.map((appointment) => (
                <div key={appointment.id} className="rounded-xl bg-slate-50 p-4">
                  <p className="font-bold text-slate-900">
                    {appointment.reason || 'Consultation'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {displayDate(appointment.appointment_date)} · {appointment.status}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No upcoming appointments.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-emerald-600 p-6 text-white">
          <CreditCard size={24} />
          <p className="mt-6 text-sm font-bold text-emerald-100">Outstanding balance</p>
          <p className="mt-1 text-4xl font-black">K {balance.toFixed(2)}</p>
          <Link
            href="/patient/portal/billing"
            className="mt-6 block rounded-xl bg-white px-4 py-3 text-center font-bold text-emerald-700"
          >
            View billing
          </Link>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 font-black text-slate-900">
            <Pill size={20} className="text-brand-600" /> Prescriptions
          </h2>
          {prescriptions.length ? (
            prescriptions.map((prescription) => (
              <p key={prescription.id} className="border-t border-slate-100 py-3 text-sm">
                {(prescription.prescription_items || [])
                  .map((item) => item.inventory_items?.name || 'Medication')
                  .join(', ')}{' '}
                <span className="font-bold text-slate-400">· {prescription.status}</span>
              </p>
            ))
          ) : (
            <p className="text-sm text-slate-500">No prescriptions found.</p>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-black text-slate-900">Recent lab results</h2>
          {labs.length ? (
            labs.map((lab) => (
              <p key={lab.id} className="border-t border-slate-100 py-3 text-sm">
                {lab.test_name}{' '}
                <span className="font-bold text-slate-400">· {lab.status}</span>
              </p>
            ))
          ) : (
            <p className="text-sm text-slate-500">No lab results found.</p>
          )}
        </section>
      </div>
    </div>
  );
}
