"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const identifier = formData.get("email") as string; // This could be email OR staff number
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  const supabase = await createClient();
  let effectiveEmail = identifier;

  // 1. If identifier doesn't look like an email, assume it's a Staff Number
  if (!identifier.includes('@')) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("staff_number", identifier)
      .single();
    
    if (profile?.email) {
      effectiveEmail = profile.email;
    } else {
      return redirect(`/login?error=${encodeURIComponent("Invalid Staff ID or Email")}`);
    }
  }

  // 2. Perform the actual sign in
  const { error } = await supabase.auth.signInWithPassword({
    email: effectiveEmail,
    password,
  });

  if (error) {
    return redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Get current user to fetch their specific profile
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login?error=Authentication failed");
  }

  // Get user profile to determine where to redirect
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "PATIENT") {
    return redirect("/patient/portal");
  }

  return redirect("/hospital/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}
