import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features, DepartmentItem } from "@/components/landing/features";
import { WhyUs } from "@/components/landing/why-us";
import { LabTests } from "@/components/landing/lab-tests";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "HMS - Kunda Health Care",
  description:
    "Explore hospital clinical departments, diagnostic laboratory tests, emergency services, and secure patient portal access.",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const [{ data: settings }, { data: departmentsData }] = await Promise.all([
    adminSupabase.from("system_settings").select("*").limit(1).maybeSingle(),
    supabase
      .from("departments")
      .select("id, name, description")
      .eq("is_bookable", true)
      .order("name"),
  ]);

  const departments: DepartmentItem[] = (departmentsData || []).map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar settings={settings} />
      <main className="flex-1">
        <Hero settings={settings} />
        <Features departments={departments} />
        <WhyUs />
        <LabTests />
      </main>
      <Footer settings={settings} />
    </div>
  );
}
