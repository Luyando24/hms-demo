import type { Metadata } from 'next';
import Link from 'next/link';
import { HeartPulse, ArrowLeft } from 'lucide-react';
import { createAdminClient } from '@/utils/supabase/admin';
import { PublicAppointmentBookingForm } from '@/components/public/PublicAppointmentBookingForm';

export const metadata: Metadata = {
  title: 'Book an Appointment | Online Medical Scheduling',
  description: 'Schedule a consultation with our specialist doctors and medical staff quickly without logging in.',
};

export default async function PublicBookAppointmentPage() {
  const adminSupabase = createAdminClient();

  const [{ data: settings }, { data: departmentsData }, { data: doctorsData }] = await Promise.all([
    adminSupabase.from('system_settings').select('*').limit(1).maybeSingle(),
    adminSupabase.from('departments').select('id, name, description').order('name'),
    adminSupabase
      .from('profiles')
      .select('id, first_name, last_name, role, department_id, departments(name)')
      .neq('role', 'PATIENT')
      .order('first_name'),
  ]);

  const hospitalTitle = settings?.brand_title?.trim() || settings?.hospital_name || 'HMS - Kunda Health Care';
  const logoUrl = settings?.logo_url || '';
  const tagline = settings?.tagline || 'Integrated Healthcare & Clinical Operations';

  const departments = (departmentsData || []).map(d => ({
    id: d.id,
    name: d.name,
    description: d.description,
  }));

  const doctors = (doctorsData || []).map((p: any) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    role: p.role,
    department_id: p.department_id,
    department_name: p.departments ? p.departments.name : null,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {logoUrl ? (
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                <img src={logoUrl} alt={hospitalTitle} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="bg-brand-500 p-2 rounded-xl text-white">
                <HeartPulse size={24} strokeWidth={2.5} />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-base leading-tight text-slate-900">
                {hospitalTitle}
              </span>
              {tagline && (
                <span className="text-[11px] font-semibold text-slate-500 leading-tight">
                  {tagline}
                </span>
              )}
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-600 hover:text-brand-600 transition-colors bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full"
          >
            <ArrowLeft size={16} /> Back to Website
          </Link>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto mb-8 text-center">
          <span className="text-xs font-black uppercase tracking-widest text-brand-600 bg-brand-50 border border-brand-200 px-4 py-1.5 rounded-full inline-block mb-3">
            Instant Online Registration
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Schedule a Medical Appointment
          </h1>
          <p className="text-slate-500 text-sm sm:text-base font-medium mt-2 max-w-xl mx-auto">
            Book a consultation with our specialist doctors and clinical departments in a few easy steps without logging in.
          </p>
        </div>

        <PublicAppointmentBookingForm
          departments={departments}
          doctors={doctors}
          settings={settings}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} {hospitalTitle}. All rights reserved.</p>
      </footer>
    </div>
  );
}
