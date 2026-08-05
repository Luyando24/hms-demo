import { Save, ShieldCheck, User } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { updatePatientProfileAction } from '@/app/patient/portal/actions';

export default async function PatientSettings({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { user, supabase } = await requireRole(['PATIENT']);
  const [{ data: profile }, { data: patient }] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, email, phone, file_number')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('patients')
      .select('address, phone, email, file_number')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ]);
  const success = typeof params.success === 'string' ? params.success : null;
  const error = typeof params.error === 'string' ? params.error : null;
  const firstName = profile?.first_name || '';
  const lastName = profile?.last_name || '';

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Profile settings</h1>
        <p className="mt-1 text-slate-500">
          Update the contact information shared with your care team.
        </p>
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

      <div className="grid gap-8 md:grid-cols-3">
        <aside className="rounded-2xl bg-slate-900 p-6 text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-black">
            {(firstName[0] || 'P') + (lastName[0] || '')}
          </div>
          <h2 className="mt-5 text-xl font-black">
            {firstName} {lastName}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {patient?.file_number || profile?.file_number || 'Patient'}
          </p>
          <div className="mt-6 flex items-start gap-2 rounded-xl bg-white/10 p-4 text-xs text-slate-300">
            <ShieldCheck size={18} className="shrink-0 text-emerald-400" />
            Clinical facts and identifiers can only be changed by authorized hospital staff.
          </div>
        </aside>

        <form
          action={updatePatientProfileAction}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 md:col-span-2"
        >
          <h2 className="flex items-center gap-2 font-black text-slate-900">
            <User size={20} className="text-brand-600" /> Personal information
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase text-slate-500">
              First name
              <input
                required
                name="first_name"
                defaultValue={firstName}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm normal-case"
              />
            </label>
            <label className="text-xs font-bold uppercase text-slate-500">
              Last name
              <input
                required
                name="last_name"
                defaultValue={lastName}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm normal-case"
              />
            </label>
            <label className="text-xs font-bold uppercase text-slate-500">
              Email
              <input
                required
                type="email"
                name="email"
                defaultValue={patient?.email || profile?.email || user.email || ''}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm normal-case"
              />
            </label>
            <label className="text-xs font-bold uppercase text-slate-500">
              Phone
              <input
                name="phone"
                defaultValue={patient?.phone || profile?.phone || ''}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm normal-case"
              />
            </label>
          </div>
          <label className="block text-xs font-bold uppercase text-slate-500">
            Home address
            <textarea
              name="address"
              rows={4}
              defaultValue={patient?.address || ''}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm normal-case"
            />
          </label>
          <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white">
            <Save size={18} /> Save profile
          </button>
        </form>
      </div>
    </div>
  );
}
