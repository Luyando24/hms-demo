"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  MapPin,
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
  Monitor,
  Wifi,
} from "lucide-react";
import { setupPatientFirstTimePasswordAction } from "@/app/patient/login/actions";
import { getSubdomainUrl } from "@/utils/subdomain";

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
  const rootLoginUrl = getSubdomainUrl(null, "/login");

  // Screen step: 1 = Initial Location Check (workforce only), 2 = Credentials Screen
  const isWorkforce = audience !== 'patient';
  const [step, setStep] = useState<1 | 2>(isWorkforce ? 1 : 2);

  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'acquired' | 'out-of-range' | 'denied' | 'timeout' | 'error'
  >('idle');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isInsecureOrigin, setIsInsecureOrigin] = useState(false);
  // Geofence pre-check result details
  const [rangeInfo, setRangeInfo] = useState<{ distance: string; limit: string } | null>(null);
  const [workstationToken, setWorkstationToken] = useState<string | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<
    'hospital_network' | 'trusted_workstation' | 'gps' | 'disabled' | null
  >(null);
  const [workstationName, setWorkstationName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('hms_workstation_token');
      if (token) setWorkstationToken(token);
    }
  }, []);

  // Cache geofence config so we only fetch it once per page load
  const geofenceConfigRef = useRef<{
    enabled: boolean;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    enforceRoles: string[];
    allowAdminBypass: boolean;
    verified?: boolean;
    method?: string;
    workstationName?: string;
  } | null>(null);

  /** Fetch geofence config and perimeter authorization status from the server */
  const fetchGeofenceConfig = useCallback(async () => {
    if (geofenceConfigRef.current !== null) return geofenceConfigRef.current;
    try {
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('hms_workstation_token') : null;
      const url = localToken ? `/api/geofence-config?workstation_token=${encodeURIComponent(localToken)}` : '/api/geofence-config';
      const res = await fetch(url, {
        headers: localToken ? { 'x-workstation-token': localToken } : {},
      });
      if (!res.ok) return null;
      const data = await res.json();
      geofenceConfigRef.current = data;
      return data;
    } catch {
      return null;
    }
  }, []);

  /** Client-side Haversine distance check — mirrors server-side logic in login.ts exactly */
  const checkGeofence = useCallback(
    (
      lat: number,
      lng: number,
      cfg: NonNullable<typeof geofenceConfigRef.current>,
      loginAudience: 'staff' | 'admin'
    ) => {
      // 1. Geofence disabled globally
      if (!cfg.enabled) return { allowed: true, distance: '0 m', limit: '0 m' };

      // 2. Admin bypass: if admin login and bypass is allowed, skip entirely
      if (loginAudience === 'admin' && cfg.allowAdminBypass) {
        return { allowed: true, distance: '0 m', limit: '0 m' };
      }

      // 3. Role enforcement: only block if this audience's role is in enforceRoles
      //    For 'admin' audience the role is ADMIN; for 'staff' we conservatively enforce
      //    (server will validate the exact role after credentials are submitted)
      const audienceRole = loginAudience === 'admin' ? 'ADMIN' : null;
      if (audienceRole) {
        const isRoleTargeted = cfg.enforceRoles.some(
          (r: string) => r.toUpperCase() === audienceRole
        );
        if (!isRoleTargeted) return { allowed: true, distance: '0 m', limit: '0 m' };
      }

      // 4. Calculate Haversine distance
      const toRad = (d: number) => (d * Math.PI) / 180;
      const R = 6371000;
      const dLat = toRad(cfg.latitude - lat);
      const dLon = toRad(cfg.longitude - lng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLon / 2) ** 2 * Math.cos(toRad(lat)) * Math.cos(toRad(cfg.latitude));
      const distM = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const fmt = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);
      return {
        allowed: distM <= cfg.radiusMeters,
        distance: fmt(distM),
        limit: fmt(cfg.radiusMeters),
      };
    },
    []
  );

  const requestLocation = useCallback(() => {
    const isHttp = typeof window !== 'undefined' && window.location.protocol === 'http:';
    const isIpHost =
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';
    const isInsecure =
      typeof window !== 'undefined' &&
      (window.isSecureContext === false || (isHttp && isIpHost));

    if (isInsecure) {
      setIsInsecureOrigin(true);
    }

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationStatus('error');
      setLocationError(
        isInsecure
          ? 'Geolocation is disabled over unencrypted HTTP on network IP addresses. Browsers require HTTPS or localhost.'
          : 'Geolocation API is not supported on this browser.'
      );
      return;
    }

    setLocating(true);
    setLocationError(null);
    setRangeInfo(null);

    const attempt = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const latitude = Number(pos.coords.latitude.toFixed(6));
          const longitude = Number(pos.coords.longitude.toFixed(6));
          setCoords({ lat: latitude, lng: longitude });

          // Client-side geofence pre-check (mirrors server-side logic in login.ts)
          const cfg = await fetchGeofenceConfig();
          if (cfg && cfg.enabled && isWorkforce) {
            const result = checkGeofence(latitude, longitude, cfg, audience as 'staff' | 'admin');
            if (!result.allowed) {
              setLocating(false);
              setRangeInfo({ distance: result.distance, limit: result.limit });
              setLocationStatus('out-of-range');
              return;
            }
          }

          setLocationStatus('acquired');
          setLocating(false);

          // Auto-advance smoothly to Screen 2 after brief verification confirmation
          setTimeout(() => {
            setStep(2);
          }, 600);
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
                isInsecure
                  ? 'Location access was blocked because this page is served over HTTP on a network IP. Browsers restrict Geolocation to HTTPS or localhost.'
                  : 'Location access was blocked. Please enable location permissions in your browser and OS privacy settings, then tap Retry.'
              );
            } else if (err.code === 2) {
              setLocationStatus('error');
              setLocationError(
                'Unable to acquire device position. Please ensure Windows/OS Location Services are enabled and system Date & Time are synchronized.'
              );
            } else if (err.code === 3) {
              setLocationStatus('timeout');
              setLocationError('GPS detection timed out. Tap "Retry Location Check" below.');
            } else {
              setLocationStatus('error');
              setLocationError(
                'Unable to acquire GPS position. Please check device Location Services and system Date & Time.'
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
  }, [fetchGeofenceConfig, checkGeofence]);

  // Smart perimeter check on mount for Screen 1: checks Network & Workstations first
  useEffect(() => {
    if (!isWorkforce) return;
    let active = true;

    const runPerimeterPreCheck = async () => {
      setLocating(true);
      const cfg = await fetchGeofenceConfig();
      if (!active) return;

      if (!cfg || !cfg.enabled || cfg.verified) {
        if (cfg?.method === 'trusted_workstation') {
          setVerificationMethod('trusted_workstation');
          setWorkstationName(cfg.workstationName || null);
        } else if (cfg?.method === 'hospital_network') {
          setVerificationMethod('hospital_network');
        } else {
          setVerificationMethod('disabled');
        }
        setLocationStatus('acquired');
        setLocating(false);
        setTimeout(() => {
          if (active) setStep(2);
        }, 300);
        return;
      }

      // Not verified by Network or Workstation -> fallback to GPS geolocation
      setVerificationMethod('gps');
      requestLocation();
    };

    const timeoutId = window.setTimeout(runPerimeterPreCheck, 0);
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [isWorkforce, fetchGeofenceConfig, requestLocation]);

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
        <a
          href={rootLoginUrl}
          title="Return to sign-in options"
          className="mb-6 rounded-2xl bg-brand-600 p-3.5 text-white shadow-md shadow-brand-500/20 transition-transform hover:scale-105"
        >
          <HeartPulse size={36} strokeWidth={2.5} />
        </a>
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
          ) : isWorkforce && step === 1 ? (
            /* SCREEN 1: FIRST SCREEN LOCATION VERIFICATION ANIMATION */
            <div className="py-4 space-y-6 text-center animate-in fade-in duration-300">
              {locating ? (
                <div className="space-y-5">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-3xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                      <Compass className="text-brand-600 animate-spin" size={38} />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Verifying Geofence Perimeter
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Acquiring coordinates for workforce security...
                    </p>
                  </div>
                </div>
              ) : locationStatus === 'acquired' ? (
                <div className="space-y-5">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-inner">
                    <CheckCircle2 size={40} className="animate-bounce" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-emerald-950">Within Range</h2>
                    <p className="text-xs text-emerald-700 font-medium mt-1">
                      Proceeding to sign in...
                    </p>
                  </div>
                </div>
              ) : locationStatus === 'out-of-range' ? (
                /* OUT OF RANGE: blocked — do not show credentials form */
                <div className="space-y-5">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-inner">
                    <MapPin size={36} />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-lg font-black text-rose-900">
                      Out of Range
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Sign-in is only permitted within the hospital premises.
                    </p>
                    {rangeInfo && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium text-left leading-relaxed space-y-1">
                        <div className="flex justify-between">
                          <span>Your distance:</span>
                          <span className="font-black">{rangeInfo.distance}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Permitted radius:</span>
                          <span className="font-black">{rangeInfo.limit}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={requestLocation}
                      disabled={locating}
                      className="w-full py-3.5 px-4 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 disabled:opacity-70"
                    >
                      <RefreshCw className={locating ? 'animate-spin' : ''} size={18} />
                      <span>Re-check Location</span>
                    </button>

                    <a
                      href={rootLoginUrl}
                      className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      <ArrowRight size={14} className="rotate-180" />
                      <span>Return to Sign-In Options</span>
                    </a>
                  </div>
                </div>
              ) : (
                /* LOCATION ERROR / DENIED / TIMEOUT */
                <div className="space-y-5">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-inner">
                    <AlertCircle size={36} />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-lg font-black text-slate-900">
                      Location Access Needed
                    </h2>
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium text-left leading-relaxed">
                      {locationError || 'Location permissions are required to access workforce systems.'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={requestLocation}
                    disabled={locating}
                    className="w-full py-3.5 px-4 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 disabled:opacity-70"
                  >
                    <RefreshCw className={locating ? 'animate-spin' : ''} size={18} />
                    <span>Retry Location Check</span>
                  </button>
                </div>
              )}

              {isInsecureOrigin && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-medium leading-relaxed text-left flex items-start gap-2">
                  <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Network Origin Note:</strong> Geolocation requires HTTPS or <code>localhost</code>. When accessing via a network IP, browsers block location by default.
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* SCREEN 2: LOGIN CREDENTIALS FORM — only shown when in range or geofence disabled */
            (!isWorkforce || step === 2) && locationStatus !== 'out-of-range' && (
              <form action={action} className="space-y-5 animate-in fade-in duration-300">
                {isWorkforce && (
                  <>
                    <input
                      type="hidden"
                      name="workstation_token"
                      value={workstationToken || ''}
                    />
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

                    {verificationMethod === 'trusted_workstation' ? (
                      /* Status Badge: Authorized Workstation */
                      <div className="flex items-center justify-between rounded-2xl bg-emerald-50/90 border border-emerald-200/80 px-4 py-3 text-[13px]">
                        <div className="flex items-center gap-2.5">
                          <Monitor size={18} className="text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold text-emerald-950">Authorized Terminal</span>
                            {workstationName && (
                              <span className="text-xs text-emerald-700 ml-1.5 font-medium">({workstationName})</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                          Workstation
                        </span>
                      </div>
                    ) : verificationMethod === 'hospital_network' ? (
                      /* Status Badge: Hospital Network Verified */
                      <div className="flex items-center justify-between rounded-2xl bg-emerald-50/90 border border-emerald-200/80 px-4 py-3 text-[13px]">
                        <div className="flex items-center gap-2.5">
                          <Wifi size={18} className="text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold text-emerald-950">Hospital Network Verified</span>
                            <span className="text-[11px] text-emerald-700 block">On-Premises LAN / Wi-Fi</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                          Local Network
                        </span>
                      </div>
                    ) : coords.lat !== null && coords.lng !== null ? (
                      /* Clean Status Badge: Within Range (GPS) */
                      <div className="flex items-center justify-between rounded-2xl bg-emerald-50/90 border border-emerald-200/80 px-4 py-3 text-[13px]">
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                          <span className="font-bold text-emerald-950">Within Range (GPS)</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setStep(1);
                            requestLocation();
                          }}
                          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition-colors px-2.5 py-1 bg-emerald-100/80 hover:bg-emerald-200/80 rounded-xl"
                        >
                          <RefreshCw size={11} /> Re-verify
                        </button>
                      </div>
                    ) : (
                      /* Status Badge: GPS Not Acquired */
                      <div className="flex items-center justify-between rounded-2xl bg-amber-50/90 border border-amber-200/80 px-4 py-3 text-[13px]">
                        <div className="flex items-center gap-2.5">
                          <AlertCircle size={18} className="text-amber-600 shrink-0" />
                          <div>
                            <span className="font-bold text-amber-950 block text-xs">Perimeter Pending</span>
                            <span className="text-[11px] text-amber-800">Geofenced roles verified on sign-in</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setStep(1);
                            requestLocation();
                          }}
                          className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 transition-colors px-2.5 py-1 bg-amber-100/80 hover:bg-amber-200/80 rounded-xl"
                        >
                          <RefreshCw size={11} /> Check Location
                        </button>
                      </div>
                    )}
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
              <a
                href={rootLoginUrl}
                className="font-bold text-brand-600 transition-colors hover:text-brand-700"
              >
                {pageContent.switchLabel}
              </a>
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
