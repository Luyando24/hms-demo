import Link from "next/link";
import { HeartPulse, MapPin, Phone, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-20 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-slate-800 pb-12 mb-12">
        <div className="md:col-span-1">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <div className="bg-brand-500 p-2 rounded-xl text-white">
              <HeartPulse size={20} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              HMSdemo<span className="text-brand-500">Hospital</span>
            </span>
          </Link>
          <p className="text-sm leading-relaxed max-w-xs mb-6">
            Providing compassionate, world-class healthcare to our community with state-of-the-art facilities and expert medical professionals.
          </p>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-6 tracking-wide uppercase text-sm">Patient Services</h4>
          <ul className="space-y-4 text-sm">
            <li><Link href="/book" className="hover:text-brand-400 transition-colors">Book an Appointment</Link></li>
            <li><Link href="/login" className="hover:text-brand-400 transition-colors">Patient Portal</Link></li>
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
          </ul>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-6 tracking-wide uppercase text-sm">Contact</h4>
          <ul className="space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <MapPin size={18} className="text-brand-500 shrink-0 mt-0.5" />
              <span>123 Health Avenue, Medical District</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={18} className="text-brand-500 shrink-0" />
              <span>+1 (800) 123-4567</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail size={18} className="text-brand-500 shrink-0" />
              <span>contact@hmsdemohospital.com</span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <p>&copy; {new Date().getFullYear()} HMSdemo Hospital. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-white transition-colors">Patient Rights</Link>
          <Link href="#" className="hover:text-white transition-colors">Terms of Use</Link>
        </div>
      </div>
    </footer>
  );
}
