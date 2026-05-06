"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, FileText, Pill, CreditCard } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { name: "Home", href: "/patient/portal", icon: LayoutDashboard },
  { name: "Appts", href: "/patient/portal/appointments", icon: CalendarDays },
  { name: "Records", href: "/patient/portal/records", icon: FileText },
  { name: "Rx", href: "/patient/portal/prescriptions", icon: Pill },
  { name: "Billing", href: "/patient/portal/billing", icon: CreditCard },
];

export function PatientBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 lg:hidden pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-brand-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={clsx("text-[10px] font-medium", isActive && "font-bold")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
