import Link from "next/link";
import { getSubdomainUrl } from "@/utils/subdomain";
import { HeartPulse, MapPin, Phone, Mail, Clock, ExternalLink } from "lucide-react";

interface FooterProps {
  settings?: {
    hospital_name?: string | null;
    brand_title?: string | null;
    logo_url?: string | null;
    tagline?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
}

export function Footer({ settings }: FooterProps = {}) {
  const hospitalName = settings?.hospital_name || "";
  const brandTitle = settings?.brand_title?.trim() || hospitalName || "Kunda Health Care";
  const logoUrl = settings?.logo_url || "";
  const address = settings?.address || "";
  const phone = settings?.phone || "";
  const email = settings?.email || "";
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-[#060f1e] text-slate-400 relative overflow-hidden">
      {/* Ambient top glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* CTA Band */}
      <div className="relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
              Ready to book your appointment?
            </h3>
            <p className="text-slate-400 text-sm font-medium">
              Our team is available 24/7 for emergencies. Schedule routine visits online.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/book-appointment"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold px-7 py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-cyan-500/25 hover:-translate-y-0.5 text-center"
            >
              Book Appointment
            </Link>
            {phone && (
              <a
                href={`tel:${phone}`}
                className="border border-white/15 hover:border-white/30 text-white font-bold px-7 py-3.5 rounded-2xl text-sm transition-all text-center"
              >
                Call Us: {phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Brand column */}
        <div className="lg:col-span-1">
          <Link href="/" className="flex items-center gap-2.5 mb-5">
            {logoUrl ? (
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 p-1 flex items-center justify-center overflow-hidden shrink-0">
                <img src={logoUrl} alt={hospitalName} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="bg-cyan-500 p-2 rounded-xl text-white shadow-lg shadow-cyan-500/20">
                <HeartPulse size={20} strokeWidth={2.5} />
              </div>
            )}
            <span className="font-black text-lg tracking-tight text-white">
              {brandTitle}
            </span>
          </Link>
          <p className="text-sm leading-relaxed text-slate-500 mb-5">
            Delivering compassionate, evidence-based healthcare to our community with
            modern facilities and a team of dedicated professionals.
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Emergency services open 24/7
          </div>
        </div>

        {/* Patient services */}
        <div>
          <h4 className="text-white font-extrabold mb-5 text-sm uppercase tracking-widest">
            Patient Services
          </h4>
          <ul className="space-y-3.5 text-sm">
            {[
              { label: "Book an Appointment", href: "/book-appointment" },
              { label: "Patient Portal", href: getSubdomainUrl("patient", "/login") ?? "/patient/login" },
              { label: "Our Departments", href: "#services" },
              { label: "Lab Tests & Diagnostics", href: "#lab-tests" },
              { label: "Emergency Care", href: "#services" },
            ].map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="hover:text-cyan-400 transition-colors font-medium">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* About */}
        <div>
          <h4 className="text-white font-extrabold mb-5 text-sm uppercase tracking-widest">
            About Us
          </h4>
          <ul className="space-y-3.5 text-sm">
            {[
              { label: "Our Story", href: "#" },
              { label: "Why Choose Us", href: "#why-us" },
              { label: "News & Updates", href: "#" },
              { label: "Careers", href: "#" },
              {
                label: "Staff & Admin Login",
                href: getSubdomainUrl(null, "/login") ?? "/login",
                external: true,
              },
            ].map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="hover:text-cyan-400 transition-colors font-medium flex items-center gap-1">
                  {item.label}
                  {"external" in item && item.external && <ExternalLink size={11} className="opacity-50" />}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white font-extrabold mb-5 text-sm uppercase tracking-widest">
            Contact Us
          </h4>
          <ul className="space-y-4 text-sm">
            {address && (
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-cyan-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{address}</span>
              </li>
            )}
            {phone && (
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-cyan-500 shrink-0" />
                <a href={`tel:${phone}`} className="hover:text-cyan-400 transition-colors font-medium">
                  {phone}
                </a>
              </li>
            )}
            {email && (
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-cyan-500 shrink-0" />
                <a href={`mailto:${email}`} className="hover:text-cyan-400 transition-colors font-medium">
                  {email}
                </a>
              </li>
            )}
            <li className="flex items-center gap-3">
              <Clock size={16} className="text-cyan-500 shrink-0" />
              <div>
                <div className="text-white font-bold">Mon – Fri: 07:30 – 17:30</div>
                <div className="text-xs text-slate-500">Emergency: 24/7</div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <p>
            &copy; {year} {hospitalName || brandTitle}. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {["Privacy Policy", "Patient Rights", "Terms of Use"].map((label) => (
              <Link key={label} href="#" className="hover:text-slate-400 transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
