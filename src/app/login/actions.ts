"use server";

import { createClient } from "@/utils/supabase/server";
import { getSubdomainUrl } from "@/utils/subdomain";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const identifier = formData.get("email") as string; // Email or staff/file number
  const password = formData.get("password") as string;

  const supabase = await createClient();
  let effectiveEmail = identifier;

  // 1. If identifier doesn't look like an email, lookup profile email
  if (!identifier.includes('@')) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .or(`staff_number.eq.${identifier},file_number.eq.${identifier}`)
      .single();
    
    if (profile?.email) {
      effectiveEmail = profile.email;
    } else {
      return redirect(`/login?error=${encodeURIComponent("Invalid ID or Email")}`);
    }
  }

  // 2. Perform sign in
  const { error } = await supabase.auth.signInWithPassword({
    email: effectiveEmail,
    password,
  });

  if (error) {
    return redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // 3. Get user profile for subdomain redirect
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login?error=Authentication failed");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = (profile?.role || user.user_metadata?.role || "STAFF").toUpperCase();

  if (userRole === "PATIENT") {
    return redirect(getSubdomainUrl("patient", "/patient/portal"));
  }

  if (userRole === "ADMIN") {
    return redirect(getSubdomainUrl("admin", "/hospital/dashboard"));
  }

  return redirect(getSubdomainUrl("staff", "/hospital/dashboard"));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect(getSubdomainUrl(null, "/login"));
}
