"use client";

import Link from "next/link";
import { HeartPulse } from "lucide-react";

export function Navbar() {
  return (
    <header className="fixed top-0 w-full z-50 px-6 py-4">
      <nav className="glass max-w-7xl mx-auto rounded-full px-6 py-3 flex items-center justify-between shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-brand-500 p-2 rounded-xl text-white">
            <HeartPulse size={24} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">
            Marybegg<span className="text-brand-600">Hospital</span>
          </span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link href="#services" className="text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-brand-600 transition-colors">
            Services
          </Link>
          <Link href="#doctors" className="text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-brand-600 transition-colors">
            Our Doctors
          </Link>
          <Link href="#locations" className="text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-brand-600 transition-colors">
            Locations
          </Link>
          <Link href="#contact" className="text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-brand-600 transition-colors">
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-bold uppercase tracking-widest text-slate-700 hover:text-brand-600 transition-colors">
            Patient Portal
          </Link>
          <Link href="/book" className="bg-brand-600 text-white text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-0.5">
            Book Appointment
          </Link>
        </div>
      </nav>
    </header>
  );
}
