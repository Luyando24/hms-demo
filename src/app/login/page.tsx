import { headers } from "next/headers";
import Link from "next/link";
import {
  ArrowRight,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { getSubdomain, getSubdomainUrl } from "@/utils/subdomain";
import { LoginForm } from "@/components/auth/login-form";
import { signInStaff, signInAdmin } from "@/app/login/actions";
import { signInPatient } from "@/app/patient/login/actions";

export default async function LoginPage() {
  const headerList = await headers();
  const host = headerList.get("host");
  const subdomain = getSubdomain(host);

  if (subdomain === "admin") {
    return <LoginForm audience="admin" action={signInAdmin} />;
  }

  if (subdomain === "staff") {
    return <LoginForm audience="staff" action={signInStaff} />;
  }

  if (subdomain === "patient") {
    return <LoginForm audience="patient" action={signInPatient} />;
  }

  const signInOptions = [
    {
      href: getSubdomainUrl("staff", "/login"),
      eyebrow: "Clinical & operations",
      title: "Staff Login",
      description:
        "For doctors, nurses, reception, laboratory, pharmacy, finance, and other hospital staff.",
      Icon: Stethoscope,
      accent: "bg-brand-50 text-brand-700 group-hover:bg-brand-600 group-hover:text-white",
    },
    {
      href: getSubdomainUrl("admin", "/login"),
      eyebrow: "Hospital administration",
      title: "Admin Login",
      description:
        "For authorized administrators managing configuration, staff, reporting, and oversight.",
      Icon: ShieldCheck,
      accent: "bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white",
    },
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fa] p-4 font-sans">
      <div className="w-full max-w-4xl py-10">
        <header className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/20">
            <HeartPulse size={34} strokeWidth={2.5} />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-600">
            Secure workforce access
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Choose your sign-in portal
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
            Select the portal that matches your hospital account. Your role is verified securely after sign-in.
          </p>
        </header>

        <section
          aria-label="Workforce sign-in options"
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          {signInOptions.map(({ href, eyebrow, title, description, Icon, accent }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_12px_40px_rgb(0,0,0,0.05)] transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_18px_50px_rgb(15,23,42,0.10)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 sm:p-8"
            >
              <div className={`mb-8 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${accent}`}>
                <Icon size={27} strokeWidth={2.2} />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {eyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                {title}
              </h2>
              <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-slate-500">
                {description}
              </p>
              <span className="mt-7 flex items-center gap-2 text-sm font-black text-brand-600">
                Continue to sign in
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </span>
            </Link>
          ))}
        </section>

        <p className="mt-8 text-center text-xs font-medium text-slate-400">
          Access is restricted to authorized hospital personnel.
        </p>
      </div>
    </main>
  );
}
