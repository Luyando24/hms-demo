import { Activity, FileText, FlaskConical } from 'lucide-react';
import { requireRole } from '@/lib/auth';

function displayDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value))
    : '—';
}

export default async function PatientRecords() {
  const { user, supabase } = await requireRole(['PATIENT']);
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const [notesResult, labsResult, radiologyResult] = await Promise.all([
    patient
      ? supabase
          .from('clinical_notes')
          .select('id, assessment, plan, created_at, diagnosis(icd10_code, description, is_primary), profiles(first_name, last_name)')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from('lab_results')
      .select('id, test_name, result_value, unit, reference_range, status, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('radiology_results')
      .select('id, findings, conclusion, is_finalized, signed_at, created_at, radiology_orders(modality, body_part)')
      .order('created_at', { ascending: false }),
  ]);

  const sections = [
    {
      title: 'Clinical notes',
      icon: FileText,
      rows: (notesResult.data || []).map((note) => ({
        id: note.id,
        title:
          note.diagnosis?.find((diagnosis) => diagnosis.is_primary)?.description ||
          note.assessment ||
          'Clinical consultation',
        detail: note.plan || 'No care plan recorded.',
        date: note.created_at,
        status: 'Clinical',
      })),
    },
    {
      title: 'Laboratory results',
      icon: FlaskConical,
      rows: (labsResult.data || []).map((result) => ({
        id: result.id,
        title: result.test_name,
        detail:
          result.result_value !== null
            ? result.result_value + (result.unit ? ' ' + result.unit : '')
            : 'Result pending',
        date: result.created_at,
        status: result.status,
      })),
    },
    {
      title: 'Radiology reports',
      icon: Activity,
      rows: (radiologyResult.data || []).map((result) => ({
        id: result.id,
        title:
          (result.radiology_orders?.modality || 'Imaging') +
          ' · ' +
          (result.radiology_orders?.body_part || 'Study'),
        detail: result.conclusion || result.findings || 'Report pending',
        date: result.signed_at || result.created_at,
        status: result.is_finalized ? 'FINAL' : 'DRAFT',
      })),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Medical records</h1>
        <p className="mt-1 text-slate-500">
          Clinical notes and finalized diagnostic records available to your account.
        </p>
      </div>

      {sections.map((section) => (
        <section key={section.title} className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
            <section.icon size={18} /> {section.title}
          </h2>
          {section.rows.length ? (
            section.rows.map((record) => (
              <article
                key={record.id}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div>
                    <h3 className="font-black text-slate-900">{record.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                      {record.detail}
                    </p>
                    <p className="mt-3 text-xs font-bold text-slate-400">
                      {displayDate(record.date)}
                    </p>
                  </div>
                  <span className="self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    {record.status}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              No records in this category.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
