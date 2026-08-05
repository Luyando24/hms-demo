import { Calendar, Clock, Stethoscope, XCircle } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import {
  bookAppointmentAction,
  cancelAppointmentAction,
} from '@/app/patient/portal/actions';

function displayDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function PatientAppointments({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { user, supabase } = await requireRole(['PATIENT']);
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const [{ data: appointments }, { data: doctors }] = await Promise.all([
    patient
      ? supabase
          .from('appointments')
          .select('id, appointment_date, status, reason, profiles(first_name, last_name)')
          .eq('patient_id', patient.id)
          .order('appointment_date', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'DOCTOR')
      .order('first_name'),
  ]);

  const currentTimestamp = new Date().toISOString();
  const upcoming = (appointments || []).filter(
    (appointment) =>
      appointment.appointment_date >= currentTimestamp &&
      appointment.status !== 'CANCELLED',
  );
  const history = (appointments || []).filter(
    (appointment) =>
      appointment.appointment_date < currentTimestamp ||
      appointment.status === 'CANCELLED',
  );
  const success = typeof params.success === 'string' ? params.success : null;
  const error = typeof params.error === 'string' ? params.error : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Appointments</h1>
        <p className="mt-1 text-slate-500">Book and manage your hospital visits.</p>
      </div>

      {(success || error) && (
        <div
          className={
            'rounded-xl border p-4 text-sm font-bold ' +
            (error
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700')
          }
        >
          {error || success}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <form
          action={bookAppointmentAction}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
        >
          <h2 className="flex items-center gap-2 font-black text-slate-900">
            <Calendar size={20} className="text-brand-600" /> Book a visit
          </h2>
          <label className="block text-xs font-bold uppercase text-slate-500">
            Preferred clinician
            <select
              name="provider_id"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            >
              <option value="">Any available doctor</option>
              {(doctors || []).map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.first_name} {doctor.last_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold uppercase text-slate-500">
            Date and time
            <input
              required
              name="appointment_date"
              type="datetime-local"
              min={currentTimestamp.slice(0, 16)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
          </label>
          <label className="block text-xs font-bold uppercase text-slate-500">
            Reason
            <textarea
              required
              name="reason"
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
          </label>
          <button className="w-full rounded-xl bg-brand-600 px-5 py-3 font-bold text-white">
            Request appointment
          </button>
        </form>

        <section className="space-y-4 lg:col-span-2">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
            Upcoming visits
          </h2>
          {upcoming.length ? (
            upcoming.map((appointment) => (
              <article
                key={appointment.id}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <h3 className="font-black text-slate-900">
                      {appointment.reason || 'Consultation'}
                    </h3>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <Clock size={16} /> {displayDate(appointment.appointment_date)}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <Stethoscope size={16} /> {appointment.status}
                    </p>
                  </div>
                  <form action={cancelAppointmentAction}>
                    <input type="hidden" name="appointment_id" value={appointment.id} />
                    <button className="flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600">
                      <XCircle size={16} /> Cancel
                    </button>
                  </form>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-slate-500">
              No upcoming appointments.
            </div>
          )}

          <h2 className="pt-4 text-sm font-black uppercase tracking-widest text-slate-400">
            Visit history
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {history.length ? (
              history.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex justify-between border-b border-slate-100 p-4 text-sm"
                >
                  <span>{appointment.reason || 'Consultation'}</span>
                  <span className="font-bold text-slate-500">
                    {displayDate(appointment.appointment_date)} · {appointment.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="p-6 text-sm text-slate-500">No previous visits.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
