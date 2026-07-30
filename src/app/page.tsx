import { createClient } from "@/utils/supabase/server";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("system_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar settings={settings} />
      <main className="flex-1">
        <Hero />
        <Features />
      </main>
      <Footer settings={settings} />
    </div>
  );
}
