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
  MapPin,
  Loader2,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Navigation,
  Info,
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

  // Step state: 1 = Location Verification (for workforce), 2 = Enter Credentials
  const [step, setStep] = useState<1 | 2>(audience === 'workforce' ? 1 : 2);

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

  const requestLocation = useCallback((autoAdvance: boolean = false) => {
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

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = Number(pos.coords.latitude.toFixed(6));
        const longitude = Number(pos.coords.longitude.toFixed(6));
        setCoords({ lat: latitude, lng: longitude });
        setLocationStatus('acquired');
        setLocating(false);

        if (autoAdvance) {
          setTimeout(() => {
            setStep(2);
          }, 400);
        }
      },
      (err) => {
        console.warn('Geolocation acquisition error:', err.code, err.message);
        setLocating(false);
        if (err.code === 1) {
          setLocationStatus('denied');
          setLocationError(
            'Location access was denied. On Safari iOS, tap the website settings icon (aA) in the address bar to set Location to "Allow".'
          );
        } else if (err.code === 3) {
          setLocationStatus('timeout');
          setLocationError('GPS detection timed out. Please tap "Retry GPS Check".');
        } else {
          setLocationStatus('error');
          setLocationError(
            'Unable to acquire GPS coordinates. Please ensure Location Services are turned ON in device settings.'
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  // Auto-attempt location check on initial render for workforce users
  useEffect(() => {
    if (audience === 'workforce') {
      requestLocation(false);
    }
  }, [audience, requestLocation]);

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
        <div className="p-8 sm:p-10">
          {/* Server Error Alert */}
          {serverError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-700"
            >
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="text-[13px] font-medium leading-relaxed">
                <p className="font-bold">Access Check Failed</p>
                <p>{serverError}</p>
              </div>
            </div>
          )}

          {/* STEP 1: WORKFORCE LOCATION CHECK */}
          {audience === 'workforce' && step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center space-y-3">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-brand-50 animate-ping opacity-75" />
                  <div className="relative w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shadow-inner">
                    {locating ? (
                      <Loader2 className="animate-spin text-brand-600" size={28} />
                    ) : locationStatus === 'acquired' ? (
                      <CheckCircle2 size={30} className="text-emerald-600" />
                    ) : (
                      <Navigation size={28} />
                    )}
                  </div>
                </div>

                <h2 className="text-lg font-black text-slate-900">
                  Step 1: Facility Location Check
                </h2>
                <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                  Hospital policy requires physical location verification before accessing workforce credentials.
                </p>
              </div>

              {/* Status Box */}
              {locationStatus === 'acquired' ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-xs text-emerald-800 uppercase tracking-wider">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    Location GPS Verified
                  </div>
                  <p className="text-xs font-mono text-emerald-700">
                    {coords.lat?.toFixed(5)}, {coords.lng?.toFixed(5)}
                  </p>
                </div>
              ) : locationError ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 text-[12px] font-medium leading-relaxed">
                  <div className="flex items-center gap-2 font-bold text-amber-800 uppercase tracking-wider text-[11px]">
                    <AlertCircle size={15} className="text-amber-600 shrink-0" />
                    GPS Access Permission Needed
                  </div>
                  <p>{locationError}</p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs font-medium text-slate-600">
                  {locating ? "Communicating with device GPS..." : "Ready for location verification."}
                </div>
              )}

              {isInsecureMobile && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-medium leading-relaxed flex items-start gap-2">
                  <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Safari iOS Note:</strong> Geolocation requires HTTPS or <code>localhost</code>.
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {locationStatus === 'acquired' ? (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full py-3.5 px-4 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20"
                  >
                    <span>Continue to Sign In</span>
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={locating}
                    onClick={() => requestLocation(true)}
                    className="w-full py-3.5 px-4 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 disabled:opacity-70"
                  >
                    {locating ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Verifying GPS...</span>
                      </>
                    ) : (
                      <>
                        <MapPin size={18} />
                        <span>Verify My Location & Proceed</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Proceed to Login Credentials &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CREDENTIALS FORM */}
          {(audience === 'patient' || step === 2) && (
            <form action={action} className="space-y-5 animate-in fade-in duration-300">
              {audience === 'workforce' && (
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

                  {/* GPS Status Banner */}
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 border border-slate-200 text-[12px]">
                    <div className="flex items-center gap-2">
                      {locationStatus === 'acquired' ? (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <MapPin size={16} className="text-amber-500 shrink-0" />
                      )}
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">
                          {locationStatus === 'acquired' ? "GPS Verified" : "Location Standard"}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {coords.lat !== null ? `${coords.lat}, ${coords.lng}` : "Unacquired"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors px-2 py-1 bg-brand-50 rounded-lg"
                    >
                      <RefreshCw size={12} /> Re-check
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
                    className="w-full rounded-xl border border-transparent bg-[#f0f4f8] py-3 pl-10 pr-4 text-[14px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 font-bold"
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
                    className="w-full rounded-xl border border-transparent bg-[#f0f4f8] py-3 pl-10 pr-4 text-[14px] tracking-widest text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 font-bold"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <SubmitButton />
            </form>
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
