"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Settings, Menu } from "lucide-react";
import clsx from "clsx";
import { useMobileNav } from "./mobile-nav-context";

const navItems = [
  { name: "Home", href: "/hospital/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/hospital/reception", icon: Users },
  { name: "Settings", href: "/hospital/settings", icon: Settings },
];

export function HospitalBottomNav() {
  const pathname = usePathname();
  const { toggle } = useMobileNav();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 lg:hidden pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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
        
        <button
          onClick={toggle}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors text-slate-400 hover:text-slate-600"
        >
          <Menu size={20} strokeWidth={2} />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </div>
  );
}
