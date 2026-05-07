"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  HeartPulse, 
  LayoutDashboard, 
  Activity, 
  BedDouble, 
  Stethoscope, 
  Microscope, 
  TestTube2, 
  Box, 
  Droplet, 
  CreditCard, 
  Users,
  Settings,
  LogOut,
  X,
  Building,
  DoorOpen
} from "lucide-react";
import clsx from "clsx";
import { useMobileNav } from "./mobile-nav-context";
import { signOut } from "@/app/login/actions";

const navGroups = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/hospital/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "Front Office",
    items: [
      { name: "Reception", href: "/hospital/reception", icon: Users },
      { name: "Patient Directory", href: "/hospital/patients", icon: Users },
    ]
  },
  {
    title: "Clinical",
    items: [
      { name: "Emergency (ER)", href: "/hospital/er", icon: Activity },
      { name: "Inpatient (IPD)", href: "/hospital/ipd", icon: BedDouble },
      { name: "Outpatient (OPD)", href: "/hospital/opd", icon: Stethoscope },
      { name: "Intensive Care (ICU)", href: "/hospital/icu", icon: HeartPulse },
      { name: "Radiology", href: "/hospital/radiology", icon: Microscope },
      { name: "Laboratory", href: "/hospital/laboratory", icon: TestTube2 },
    ]
  },
  {
    title: "Operations",
    items: [
      { name: "Pharmacy & Inventory", href: "/hospital/inventory", icon: Box },
      { name: "Blood Bank", href: "/hospital/bloodbank", icon: Droplet },
    ]
  },
  {
    title: "Administration",
    items: [
      { name: "Billing & Claims", href: "/hospital/billing", icon: CreditCard },
      { name: "Staff Directory", href: "/hospital/staff", icon: Users },
      { name: "Departments", href: "/hospital/admin/departments", icon: Building },
      { name: "Rooms & Facilities", href: "/hospital/admin/rooms", icon: DoorOpen },
      { name: "HR & Staffing", href: "/hospital/hr", icon: Users },
      { name: "Reports & Analytics", href: "/hospital/reports", icon: LayoutDashboard },
    ]
  }
];

export function HospitalSidebar() {
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
      <nav className="flex-1 px-4 space-y-8">
        {navGroups.map((group) => (
          <div key={group.title}>
            <h4 className="px-4 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              {group.title}
            </h4>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive 
                        ? "bg-brand-600 text-white shadow-md shadow-brand-500/20" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-white" : "text-slate-400"} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="px-4 mt-8 pt-4 border-t border-slate-200/60 shrink-0 space-y-1">
        <Link
          href="/hospital/settings"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200"
        >
          <Settings size={18} strokeWidth={2} className="text-slate-400" />
          Settings
        </Link>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 group"
        >
          <LogOut size={18} strokeWidth={2} className="text-slate-400 group-hover:text-rose-500" />
          Sign Out
        </button>
      </div>
    </aside>
    </>
  );
}
