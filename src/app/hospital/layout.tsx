import type { Metadata } from "next";
import { HospitalLayoutClient } from "@/components/layout/hospital-layout-client";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Hospital Console",
  description: "Secure clinical and hospital operations workspace.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HospitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userRole: string | null = null;
  let userProfile: any = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      userRole = (
        profile?.role ||
        user.user_metadata?.role ||
        (user.app_metadata as any)?.role ||
        "ADMIN"
      ).toString().toUpperCase();

      userProfile = {
        ...profile,
        email: user.email,
        role: userRole,
      };
    }
  } catch (err) {
    console.warn("Could not load server session in HospitalLayout:", err);
  }

  return (
    <HospitalLayoutClient initialUserRole={userRole} initialUserProfile={userProfile}>
      {children}
    </HospitalLayoutClient>
  );
}
