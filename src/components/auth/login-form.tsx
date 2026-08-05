"use client";

import { Suspense } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  HeartPulse,
  Lock,
  Stethoscope,
  User,
} from "lucide-react";

type LoginAction = (formData: FormData) => void | Promise<void>;

interface LoginFormProps {
  audience: "patient" | "workforce";
  action: LoginAction;
}

const content = {
  patient: {
    eyebrow: "Patient portal",
    title: "Patient Sign In",
    description: "Access your appointments, records, prescriptions, and billing.",
    identifierLabel: "Email or File Number",
    identifierPlaceholder: "Email or HMS-P-...",
    switchPrompt: "Hospital employee?",
    switchLabel: "Staff & administrator sign in",
    switchHref: "/login",
    Icon: User,
  },
  workforce: {
    eyebrow: "Hospital workforce",
    title: "Staff & Administrator Sign In",
    description: "Use your hospital account to access clinical and administrative tools.",
    identifierLabel: "Email or Staff ID",
    identifierPlaceholder: "Email or HMS-S-...",
    switchPrompt: "Looking for your health records?",
    switchLabel: "Patient portal sign in",
    switchHref: "/patient/login",
    Icon: Stethoscope,
  },
} as const;

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-[15px] font-medium text-white transition-all hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/20 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Signing in..." : "Sign In"}
      {!pending && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
    </button>
  );
}

function LoginContent({ audience, action }: LoginFormProps) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const pageContent = content[audience];
  const IdentifierIcon = pageContent.Icon;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] p-4 font-sans">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-6 rounded-2xl bg-brand-600 p-3 text-white shadow-md">
          <HeartPulse size={32} strokeWidth={2.5} />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
          {pageContent.eyebrow}
        </p>
        <h1 className="mb-2 text-[28px] font-bold tracking-tight text-slate-900">
          {pageContent.title}
        </h1>
        <p className="max-w-md text-[15px] text-slate-500">{pageContent.description}</p>
      </div>

      <div className="w-full max-w-[500px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="p-8 sm:p-10">
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-rose-600"
            >
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-[13px] font-medium">{error}</p>
            </div>
          )}

          <form action={action} className="space-y-5">
            <div>
              <label htmlFor={`${audience}-identifier`} className="mb-2 block text-[13px] font-bold text-slate-900">
                {pageContent.identifierLabel}
              </label>
              <div className="relative">
                <IdentifierIcon
                  size={18}
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id={`${audience}-identifier`}
                  name="identifier"
                  type="text"
                  required
                  minLength={3}
                  maxLength={254}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="w-full rounded-xl border border-transparent bg-[#f0f4f8] py-3 pl-10 pr-4 text-[14px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                  placeholder={pageContent.identifierPlaceholder}
                />
              </div>
            </div>

            <div>
              <label htmlFor={`${audience}-password`} className="mb-2 block text-[13px] font-bold text-slate-900">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id={`${audience}-password`}
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={256}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-transparent bg-[#f0f4f8] py-3 pl-10 pr-4 text-[14px] tracking-widest text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <SubmitButton />
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6 text-center">
            <p className="text-[13px] text-slate-500">
              {pageContent.switchPrompt}{" "}
              <Link href={pageContent.switchHref} className="font-semibold text-brand-600 transition-colors hover:text-brand-700">
                {pageContent.switchLabel}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Need access help? Contact your hospital administrator.
      </p>
    </main>
  );
}

export function LoginForm(props: LoginFormProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa]">
          <div className="flex animate-pulse flex-col items-center">
            <div className="mb-4 h-12 w-12 rounded-2xl bg-slate-200" />
            <div className="h-4 w-32 rounded bg-slate-200" />
          </div>
        </div>
      }
    >
      <LoginContent {...props} />
    </Suspense>
  );
}
