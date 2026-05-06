"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  HeartPulse, 
  LayoutDashboard, 
  CalendarDays, 
  FileText, 
  Pill, 
  CreditCard,
  Settings,
  LogOut,
  X
} from "lucide-react";
import clsx from "clsx";
import { useMobileNav } from "./mobile-nav-context";
import { signOut } from "@/app/login/actions";

const navItems = [
  { name: "Overview", href: "/patient/portal", icon: LayoutDashboard },
  { name: "Appointments", href: "/patient/portal/appointments", icon: CalendarDays },
  { name: "Medical Records", href: "/patient/portal/records", icon: FileText },
  { name: "Prescriptions", href: "/patient/portal/prescriptions", icon: Pill },
  { name: "Billing", href: "/patient/portal/billing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useMobileNav();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={close}
        />
      )}

      <aside className={clsx(
        "w-72 bg-white fixed top-20 left-0 bottom-0 border-r border-slate-200 flex flex-col py-6 z-40 overflow-y-auto transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                isActive 
                  ? "bg-brand-600 text-white shadow-md shadow-brand-500/20" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              )}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-white" : "text-slate-400"} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Health Profile Status Card */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Profile Status</p>
              <p className="text-sm font-semibold text-slate-700">80% Complete</p>
            </div>
            <span className="text-brand-600 font-bold text-sm">Good</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full w-[80%]" />
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="px-4 space-y-2">
        <Link
          href="/patient/portal/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-all duration-200"
        >
          <Settings size={20} strokeWidth={2} className="text-slate-400" />
          Settings
        </Link>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 group"
        >
          <LogOut size={20} strokeWidth={2} className="text-slate-400 group-hover:text-rose-500" />
          Sign Out
        </button>
      </div>
    </aside>
    </>
  );
}
