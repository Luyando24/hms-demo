"use client";

import Link from "next/link";
import { getSubdomainUrl } from "@/utils/subdomain";
import { HeartPulse } from "lucide-react";

interface NavbarProps {
  settings?: {
    hospital_name?: string | null;
    brand_title?: string | null;
    logo_url?: string | null;
    tagline?: string | null;
  } | null;
}

export function Navbar({ settings }: NavbarProps = {}) {
  const hospitalName = settings?.hospital_name || "";
  const brandTitle = settings?.brand_title?.trim() || hospitalName;
  const logoUrl = settings?.logo_url || "";
  const tagline = settings?.tagline || "";

  return (
    <header className="fixed top-0 w-full z-50 px-6 py-4">
      <nav className="glass max-w-7xl mx-auto rounded-full px-6 py-3 flex items-center justify-between shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          {logoUrl ? (
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
              <img src={logoUrl} alt={hospitalName} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="bg-brand-500 p-2 rounded-xl text-white">
              <HeartPulse size={24} strokeWidth={2.5} />
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-slate-900 leading-tight">
              {brandTitle}
            </span>
            {tagline && (
              <span className="text-[11px] font-semibold text-slate-500 leading-tight">
                {tagline}
              </span>
            )}
          </div>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link href="#services" className="text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-brand-600 transition-colors">
            Services
          </Link>
          <Link href="#doctors" className="text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-brand-600 transition-colors">
            Our Doctors
          </Link>
          <Link href="#contact" className="text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-brand-600 transition-colors">
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href={getSubdomainUrl('patient', '/login')} className="text-sm font-bold uppercase tracking-widest text-slate-700 hover:text-brand-600 transition-colors">
            Patient Portal
          </Link>
          <Link href="/book-appointment" className="bg-brand-600 text-white text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-0.5">
            Book Appointment
          </Link>
        </div>
      </nav>
    </header>
  );
}
