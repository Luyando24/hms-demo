import Link from "next/link";
import { getSubdomainUrl } from "@/utils/subdomain";
import {
  Calendar,
  Phone,
  ShieldCheck,
  Clock,
  Users,
  Award,
  ArrowRight,
  Stethoscope,
} from "lucide-react";

interface HeroProps {
  settings?: {
    hospital_name?: string | null;
    brand_title?: string | null;
    tagline?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
}

const TRUST_STATS = [
  { value: "10,000+", label: "Patients Served" },
  { value: "25+", label: "Specialists" },
  { value: "24/7", label: "Emergency Care" },
  { value: "15+", label: "Departments" },
];

const QUICK_LINKS = [
  { icon: Stethoscope, label: "OPD Consultation", href: "/book-appointment" },
  { icon: Clock, label: "Emergency Room", href: "#services" },
  { icon: Award, label: "Diagnostics & Lab", href: "#lab-tests" },
  { icon: Users, label: "Patient Portal", href: getSubdomainUrl("patient", "/login") ?? "/patient/login" },
];

export function Hero({ settings }: HeroProps = {}) {
  const hospitalName =
    settings?.hospital_name || settings?.brand_title?.trim() || "Kunda Health Care";
  const tagline = settings?.tagline || "Compassionate Care. World-Class Medicine.";
  const phone = settings?.phone || "";
  const address = settings?.address || "";

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#060f1e] pt-24 pb-12">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-bg.jpg"
          alt=""
          className="w-full h-full object-cover opacity-40"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060f1e] via-[#060f1e]/80 to-[#060f1e]/60" />
      </div>

      {/* Ambient glow blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-700/15 rounded-full blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

          {/* LEFT: Content */}
          <div className="lg:col-span-7 space-y-7 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest animate-in fade-in duration-700">
              <ShieldCheck size={13} />
              ISO Accredited · 24/7 Emergency Services
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] text-white animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Your Health,{" "}
              <span className="text-cyan-400">Our</span>
              <br />
              <span className="text-cyan-400">Commitment.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              {hospitalName} delivers comprehensive medical care — from routine outpatient consultations to advanced diagnostics, emergency services, and specialist treatment.
            </p>

            {/* Contact info chips */}
            <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start animate-in fade-in duration-700 delay-300">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all text-sm font-semibold"
                >
                  <Phone size={14} className="text-cyan-400" />
                  {phone}
                </a>
              )}
              {address && (
                <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm font-medium">
                  📍 {address}
                </span>
              )}
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1 justify-center lg:justify-start animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
              <Link
                href="/book-appointment"
                className="group flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-8 py-4 rounded-2xl font-extrabold text-[15px] transition-all shadow-xl shadow-cyan-500/30 hover:shadow-cyan-400/40 hover:-translate-y-0.5"
              >
                <Calendar size={18} />
                Book an Appointment
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href={getSubdomainUrl("patient", "/login") ?? "/patient/login"}
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 text-white px-8 py-4 rounded-2xl font-bold text-[15px] transition-all"
              >
                Patient Portal
              </Link>
            </div>

            {/* Trust stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 animate-in fade-in duration-700 delay-500">
              {TRUST_STATS.map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <div className="text-2xl font-black text-white">{stat.value}</div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Quick Access Card */}
          <div className="lg:col-span-5 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
            <div className="bg-white rounded-3xl p-7 shadow-2xl border border-slate-100 relative">
              {/* Card header */}
              <div className="mb-5 pb-4 border-b border-slate-100">
                <span className="text-[11px] font-extrabold text-cyan-600 uppercase tracking-widest">
                  Quick Access
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-0.5">
                  Where would you like to go?
                </h2>
              </div>

              {/* Quick link buttons */}
              <div className="space-y-3 mb-6">
                {QUICK_LINKS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/50 transition-all duration-200"
                    >
                      <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:border-cyan-500 transition-all">
                        <Icon size={18} className="text-cyan-600 group-hover:text-white transition-colors" />
                      </div>
                      <span className="font-bold text-slate-800 text-sm group-hover:text-cyan-700 transition-colors">
                        {item.label}
                      </span>
                      <ArrowRight
                        size={14}
                        className="ml-auto text-slate-300 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all"
                      />
                    </Link>
                  );
                })}
              </div>

              {/* Emergency callout */}
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 font-black text-lg">
                  !
                </div>
                <div className="flex-1">
                  <div className="text-xs font-extrabold text-red-700 uppercase tracking-wider">
                    Emergency Services
                  </div>
                  <div className="text-sm text-red-900 font-bold mt-0.5">
                    Available 24/7 · Walk-in Welcome
                  </div>
                </div>
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors shrink-0"
                  >
                    Call Now
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave divider */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
        <svg viewBox="0 0 1440 70" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 70L1440 70L1440 30C1200 70 900 10 720 30C540 50 240 10 0 30L0 70Z" fill="#f8fafc" />
        </svg>
      </div>
    </section>
  );
}
