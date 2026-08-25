"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
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
  Loader2,
  RefreshCw,
  CheckCircle2,
  Compass,
  ShieldCheck,
  Shield,
  Info,
  KeyRound,
  Calendar,
  Sparkles,
} from "lucide-react";
import { setupPatientFirstTimePasswordAction } from "@/app/patient/login/actions";

type LoginAction = (formData: FormData) => void | Promise<void>;

interface LoginFormProps {
  audience: "patient" | "staff" | "admin";
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
  staff: {
    eyebrow: "Hospital staff",
    title: "Staff Sign In",
    description: "Access the clinical and operational workspace assigned to your role.",
    identifierLabel: "Email or Staff ID",
    identifierPlaceholder: "Email or HMS-S-...",
    switchPrompt: "Need a different workforce sign-in?",
    switchLabel: "Return to sign-in options",
    switchHref: "/login",
    Icon: Stethoscope,
  },
  admin: {
    eyebrow: "Administration",
    title: "Administrator Sign In",
    description: "Access hospital configuration, oversight, reporting, and administration.",
    identifierLabel: "Administrator Email or Staff ID",
    identifierPlaceholder: "Email or HMS-S-...",
    switchPrompt: "Need a different workforce sign-in?",
    switchLabel: "Return to sign-in options",
    switchHref: "/login",
    Icon: Shield,
  },
} as const;

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-[15px] font-bold text-white transition-all hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/20 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" size={18} />
          <span>Signing in...</span>
        </>
      ) : (
        <>
          <span>Sign In to Console</span>
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </>
      )}
    </button>
  );
}

function LoginContent({ audience, action }: LoginFormProps) {
  const searchParams = useSearchParams();
  const serverError = searchParams.get("error");
  const pageContent = content[audience];
  const IdentifierIcon = pageContent.Icon;

  // Screen step: 1 = Initial Location Check (workforce only), 2 = Credentials Screen
  const isWorkforce = audience !== 'patient';
  const [step, setStep] = useState<1 | 2>(isWorkforce ? 1 : 2);

  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'acquired' | 'denied' | 'timeout' | 'error'
  >('idle');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isInsecureMobile, setIsInsecureMobile] = useState(false);

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationStatus('error');
      setLocationError('Geolocation API is not supported on this browser.');
      return;
    }

    const isHttp = window.location.protocol === 'http:';
    const isIpHost =
      window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isHttp && isIpHost) {
      setIsInsecureMobile(true);
    }

    setLocating(true);
    setLocationError(null);

    const attempt = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latitude = Number(pos.coords.latitude.toFixed(6));
          const longitude = Number(pos.coords.longitude.toFixed(6));
          setCoords({ lat: latitude, lng: longitude });
          setLocationStatus('acquired');
          setLocating(false);

          // Auto-advance smoothly to Screen 2 after brief verification confirmation
          setTimeout(() => {
            setStep(2);
          }, 400);
        },
        (err) => {
          console.warn('Geolocation attempt error (highAccuracy=' + highAccuracy + '):', err.code, err.message);
          if (highAccuracy) {
            // High accuracy (satellite GPS fix) failed or timed out indoors. Fallback to Wi-Fi/Cellular positioning!
            attempt(false);
          } else {
            setLocating(false);
            if (err.code === 1) {
              setLocationStatus('denied');
              setLocationError(
                'Location access was blocked. On Safari iOS, please tap "Retry Location Check" below.'
              );
            } else if (err.code === 3) {
              setLocationStatus('timeout');
              setLocationError('GPS detection timed out. Tap "Retry Location Check" below.');
            } else {
              setLocationStatus('error');
              setLocationError(
                'Unable to acquire GPS position. Please check device Location Services.'
              );
            }
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 4000 : 10000,
          maximumAge: 300000,
        }
      );
    };

    attempt(true);
  }, []);

  // Automatic GPS acquisition on mount for Screen 1
  useEffect(() => {
    if (!isWorkforce) return;
    const timeoutId = window.setTimeout(requestLocation, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isWorkforce, requestLocation]);

  const [patientMode, setPatientMode] = useState<'signin' | 'first_time'>('signin');
  const [firstTimeLoading, setFirstTimeLoading] = useState(false);
  const [firstTimeError, setFirstTimeError] = useState<string | null>(null);
  const [firstTimeSuccess, setFirstTimeSuccess] = useState<string | null>(null);

  const handleFirstTimeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFirstTimeLoading(true);
    setFirstTimeError(null);
    setFirstTimeSuccess(null);

    const formData = new FormData(e.currentTarget);
    const res = await setupPatientFirstTimePasswordAction(formData);

    if (!res.success) {
      setFirstTimeError(res.error || 'Failed to set password.');
      setFirstTimeLoading(false);
    } else if (res.redirectTo) {
      setFirstTimeSuccess('Password set successfully! Redirecting to your patient portal...');
      window.location.href = res.redirectTo;
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] p-4 font-sans">
      {/* Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-6 rounded-2xl bg-brand-600 p-3.5 text-white shadow-md shadow-brand-500/20">
          <HeartPulse size={36} strokeWidth={2.5} />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
          {pageContent.eyebrow}
        </p>
        <h1 className="mb-2 text-[28px] font-black tracking-tight text-slate-900">
          {pageContent.title}
        </h1>
        <p className="max-w-md text-[15px] text-slate-500 font-medium">{pageContent.description}</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-[480px] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
        {/* Patient Tab Switcher */}
        {audience === 'patient' && (
          <div className="grid grid-cols-2 p-2 bg-slate-100/80 border-b border-slate-200/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setPatientMode('signin');
                setFirstTimeError(null);
              }}
              className={`py-2.5 rounded-2xl transition-all ${
                patientMode === 'signin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setPatientMode('first_time');
                setFirstTimeError(null);
              }}
              className={`py-2.5 rounded-2xl transition-all flex items-center justify-center gap-1.5 ${
                patientMode === 'first_time'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-500 hover:text-brand-600'
              }`}
            >
              <Sparkles size={13} className="text-brand-500" />
              First Time / Set Password
            </button>
          </div>
        )}

        <div className="p-8 sm:p-10">
          {/* Server Error Alert */}
          {serverError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-700 animate-in fade-in"
            >
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="text-[13px] font-medium leading-relaxed">
                <p className="font-bold">Access Error</p>
                <p>{serverError}</p>
              </div>
            </div>
          )}

          {/* First Time Setup Error / Success */}
          {firstTimeError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-700 animate-in fade-in"
            >
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="text-[13px] font-medium leading-relaxed">
                <p className="font-bold">Setup Notice</p>
                <p>{firstTimeError}</p>
              </div>
            </div>
          )}

          {firstTimeSuccess && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 animate-in fade-in"
            >
              <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-600" />
              <div className="text-[13px] font-medium leading-relaxed">
                <p className="font-bold">Success</p>
                <p>{firstTimeSuccess}</p>
              </div>
            </div>
          )}

          {/* PATIENT FIRST TIME PASSWORD SETUP FORM */}
          {audience === 'patient' && patientMode === 'first_time' ? (
            <form onSubmit={handleFirstTimeSubmit} className="space-y-4 animate-in fade-in duration-300">
              <div className="p-3 bg-brand-50/70 border border-brand-200/60 rounded-2xl text-xs text-brand-900 font-medium leading-relaxed">
                Enter your registered <strong>File Number</strong> (e.g. <code>HMS-P-12345</code>) or <strong>Email</strong> and your <strong>Date of Birth</strong> to create your password.
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-900">
                  Email or File Number *
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    name="identifier"
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. HMS-P-12345 or email@domain.com"
                    className="w-full rounded-2xl border border-transparent bg-[#f0f4f8] py-3 pl-10 pr-4 text-xs font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-900">
                  Date of Birth (Security Verification) *
                </label>
                <div className="relative">
                  <Calendar
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    name="dob"
                    type="date"
                    required
                    className="w-full rounded-2xl border border-transparent bg-[#f0f4f8] py-3 pl-10 pr-4 text-xs font-bold text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-900">
                  Create New Password (min. 8 characters) *
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-transparent bg-[#f0f4f8] py-3 pl-10 pr-4 text-xs font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-900">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    name="confirm_password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-transparent bg-[#f0f4f8] py-3 pl-10 pr-4 text-xs font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={firstTimeLoading}
                className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-black shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {firstTimeLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying & Setting Password...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Set Password & Access Portal</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STANDARD LOGIN FORM */
            (!isWorkforce || step === 2) && (
              <form action={action} className="space-y-5 animate-in fade-in duration-300">
                {isWorkforce && (
                  <>
                    <input
                      type="hidden"
                      name="latitude"
                      value={coords.lat !== null ? String(coords.lat) : ''}
                    />
                    <input
                      type="hidden"
                      name="longitude"
                      value={coords.lng !== null ? String(coords.lng) : ''}
                    />

                    {/* Clean Status Badge: Within Range */}
                    <div className="flex items-center justify-between rounded-2xl bg-emerald-50/90 border border-emerald-200/80 px-4 py-3 text-[13px]">
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                        <span className="font-bold text-emerald-950">Within Range</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition-colors px-2.5 py-1 bg-emerald-100/80 hover:bg-emerald-200/80 rounded-xl"
                      >
                        <RefreshCw size={11} /> Re-verify
                      </button>
                    </div>
                  </>
                )}

                <div>
                  <label
                    htmlFor={`${audience}-identifier`}
                    className="mb-2 block text-[13px] font-bold text-slate-900"
                  >
                    {pageContent.identifierLabel}
                  </label>
                  <div className="relative">
                    <IdentifierIcon
                      size={18}
                      aria-hidden="true"
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
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
                      className="w-full rounded-2xl border border-transparent bg-[#f0f4f8] py-3.5 pl-10 pr-4 text-[14px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 font-bold"
                      placeholder={pageContent.identifierPlaceholder}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`${audience}-password`}
                    className="mb-2 block text-[13px] font-bold text-slate-900"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      aria-hidden="true"
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id={`${audience}-password`}
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      maxLength={256}
                      autoComplete="current-password"
                      className="w-full rounded-2xl border border-transparent bg-[#f0f4f8] py-3.5 pl-10 pr-4 text-[14px] tracking-widest text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 font-bold"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <SubmitButton />
              </form>
            )
          )}

          {/* Switch audience link */}
          <div className="mt-8 border-t border-slate-100 pt-6 text-center">
            <p className="text-[13px] text-slate-500 font-medium">
              {pageContent.switchPrompt}{" "}
              <Link
                href={pageContent.switchHref}
                className="font-bold text-brand-600 transition-colors hover:text-brand-700"
              >
                {pageContent.switchLabel}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400 font-medium">
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
