"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSubdomainUrl } from "@/utils/subdomain";
import { HeartPulse, Menu, X, Phone } from "lucide-react";

interface NavbarProps {
  settings?: {
    hospital_name?: string | null;
    brand_title?: string | null;
    logo_url?: string | null;
    tagline?: string | null;
    phone?: string | null;
  } | null;
}

export function Navbar({ settings }: NavbarProps = {}) {
  const hospitalName = settings?.hospital_name || "";
  const brandTitle = settings?.brand_title?.trim() || hospitalName || "Kunda Health";
  const logoUrl = settings?.logo_url || "";
  const phone = settings?.phone || "";
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "#services", label: "Departments" },
    { href: "#why-us", label: "Why Us" },
    { href: "#lab-tests", label: "Lab Tests" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <header className="fixed top-0 w-full z-50">
      {/* Top info bar */}
      <div className="bg-[#0c1628] border-b border-white/5 hidden md:block">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between text-xs text-slate-400">
          <span>Providing compassionate care to our community</span>
          <div className="flex items-center gap-6">
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors font-medium">
                <Phone size={11} />
                {phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav
        className={`w-full transition-all duration-300 ${
          scrolled
            ? "bg-[#0c1628]/98 backdrop-blur-lg shadow-2xl shadow-black/30 border-b border-white/5"
            : "bg-[#0c1628]/80 backdrop-blur-md"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            {logoUrl ? (
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 p-1 flex items-center justify-center overflow-hidden">
                <img src={logoUrl} alt={hospitalName} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="bg-cyan-500 p-2 rounded-xl text-white shadow-lg shadow-cyan-500/30">
                <HeartPulse size={22} strokeWidth={2.5} />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-black text-base tracking-tight text-white leading-tight">
                {brandTitle}
              </span>
              <span className="text-[10px] font-semibold text-cyan-400/80 leading-tight tracking-wider uppercase">
                Healthcare
              </span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[13px] font-semibold text-slate-300 hover:text-cyan-400 transition-colors tracking-wide"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href={getSubdomainUrl("patient", "/login")}
              className="text-[13px] font-bold text-slate-300 hover:text-white border border-white/10 hover:border-white/20 px-4 py-2 rounded-xl transition-all"
            >
              Patient Portal
            </Link>
            <Link
              href="/book-appointment"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[13px] font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 hover:-translate-y-0.5"
            >
              Book Appointment
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0c1628] px-6 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block text-sm font-semibold text-slate-300 hover:text-cyan-400 py-2 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-3 flex flex-col gap-3 border-t border-white/5">
              <Link
                href={getSubdomainUrl("patient", "/login")}
                className="block text-center text-sm font-bold text-white border border-white/20 px-4 py-3 rounded-xl"
                onClick={() => setMobileOpen(false)}
              >
                Patient Portal
              </Link>
              <Link
                href="/book-appointment"
                className="block text-center bg-cyan-500 text-slate-950 text-sm font-extrabold px-4 py-3 rounded-xl"
                onClick={() => setMobileOpen(false)}
              >
                Book Appointment
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
