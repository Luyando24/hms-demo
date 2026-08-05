import Link from "next/link";
import { HeartPulse, MapPin, Phone, Mail } from "lucide-react";

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
  const brandTitle = settings?.brand_title?.trim() || hospitalName;
  const logoUrl = settings?.logo_url || "";
  const tagline = settings?.tagline || "Providing compassionate, world-class healthcare to our community with state-of-the-art facilities and expert medical professionals.";
  const address = settings?.address || "";
  const phone = settings?.phone || "";
  const email = settings?.email || "";

  return (
    <footer className="bg-slate-950 text-slate-400 py-20 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-slate-800 pb-12 mb-12">
        <div className="md:col-span-1">
          <Link href="/" className="flex items-center gap-2 mb-6">
            {logoUrl ? (
              <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center overflow-hidden shrink-0">
                <img src={logoUrl} alt={hospitalName} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="bg-brand-500 p-2 rounded-xl text-white">
                <HeartPulse size={20} strokeWidth={2.5} />
              </div>
            )}
            <span className="font-bold text-xl tracking-tight text-white">
              {brandTitle}
            </span>
          </Link>
          <p className="text-sm leading-relaxed max-w-xs mb-6">
            {tagline}
          </p>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-6 tracking-wide uppercase text-sm">Patient Services</h4>
          <ul className="space-y-4 text-sm">
            <li><Link href="/book-appointment" className="hover:text-brand-400 transition-colors">Book an Appointment</Link></li>
            <li><Link href="/patient/login" className="hover:text-brand-400 transition-colors">Patient Portal</Link></li>
            <li><Link href="#services" className="hover:text-brand-400 transition-colors">Our Departments</Link></li>
            <li><Link href="#" className="hover:text-brand-400 transition-colors">Billing & Insurance</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-6 tracking-wide uppercase text-sm">About Us</h4>
          <ul className="space-y-4 text-sm">
            <li><Link href="#" className="hover:text-brand-400 transition-colors">Our History</Link></li>
            <li><Link href="#doctors" className="hover:text-brand-400 transition-colors">Find a Doctor</Link></li>
            <li><Link href="#" className="hover:text-brand-400 transition-colors">Careers</Link></li>
            <li><Link href="#" className="hover:text-brand-400 transition-colors">News & Updates</Link></li>
            <li><Link href="/login" className="hover:text-brand-400 transition-colors">Staff & Admin Sign In</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-6 tracking-wide uppercase text-sm">Contact Us</h4>
          <ul className="space-y-4 text-sm">
            {address && (
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-brand-500 shrink-0 mt-0.5" />
                <span>{address}</span>
              </li>
            )}
            {phone && (
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-brand-500 shrink-0" />
                <span>{phone}</span>
              </li>
            )}
            {email && (
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-brand-500 shrink-0" />
                <span>{email}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <p>&copy; {new Date().getFullYear()} {hospitalName}. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-white transition-colors">Patient Rights</Link>
          <Link href="#" className="hover:text-white transition-colors">Terms of Use</Link>
        </div>
      </div>
    </footer>
  );
}
