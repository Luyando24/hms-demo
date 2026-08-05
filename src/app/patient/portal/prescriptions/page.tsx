import { Pill } from 'lucide-react';
import { requireRole } from '@/lib/auth';

function displayDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value))
    : '—';
}

export default async function PatientPrescriptions() {
  const { user, supabase } = await requireRole(['PATIENT']);
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  const { data: prescriptions } = patient
    ? await supabase
        .from('prescriptions')
        .select('id, status, created_at, profiles(first_name, last_name), prescription_items(id, dosage, frequency, duration, instructions, quantity_prescribed, quantity_dispensed, inventory_items(name, unit))')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
    : { data: [] };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Prescriptions</h1>
        <p className="mt-1 text-slate-500">Medication orders issued by your care team.</p>
      </div>

      <div className="space-y-5">
        {(prescriptions || []).length ? (
          (prescriptions || []).map((prescription) => (
            <article
              key={prescription.id}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="mb-5 flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row">
                <div>
                  <p className="text-xs font-black uppercase text-slate-400">
                    Prescription {prescription.id.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Issued {displayDate(prescription.created_at)}
                  </p>
                </div>
                <span className="self-start rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
                  {prescription.status}
                </span>
              </div>

              <div className="space-y-3">
                {(prescription.prescription_items || []).map((item) => (
                  <div key={item.id} className="flex gap-4 rounded-xl bg-slate-50 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600">
                      <Pill size={22} />
                    </div>
                    <div>
                      <h2 className="font-black text-slate-900">
                        {item.inventory_items?.name || 'Medication'}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.dosage} · {item.frequency} · {item.duration}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Quantity {item.quantity_dispensed || 0}/{item.quantity_prescribed}
                        {item.instructions ? ' · ' + item.instructions : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            <Pill className="mx-auto mb-3" size={36} />
            No prescriptions found.
          </div>
        )}
      </div>
    </div>
  );
}
