import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features, DepartmentItem } from "@/components/landing/features";
import { Doctors, DoctorProfile } from "@/components/landing/doctors";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Healthcare Services & Patient Care Portal",
  description:
    "Explore hospital departments, specialist physicians, emergency services, and secure patient portal access.",
};

export default async function LandingPage() {
  const supabase = await createClient();

  const [{ data: settings }, { data: departmentsData }, { data: profilesData }] =
    await Promise.all([
      supabase.from("system_settings").select("*").limit(1).maybeSingle(),
      supabase.from("departments").select("id, name, description").order("name"),
      supabase
        .from("profiles")
        .select("id, first_name, last_name, role, department_id, departments(name)")
        .neq("role", "PATIENT")
        .limit(8),
    ]);

  const departments: DepartmentItem[] = (departmentsData || []).map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
  }));

  const doctors: DoctorProfile[] = (profilesData || []).map((p: any) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    role: p.role,
    department_name: p.departments ? p.departments.name : null,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar settings={settings} />
      <main className="flex-1">
        <Hero settings={settings} />
        <Features departments={departments} />
        <Doctors doctors={doctors} />
      </main>
      <Footer settings={settings} />
    </div>
  );
}
