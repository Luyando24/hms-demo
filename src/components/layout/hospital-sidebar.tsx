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
  Building,
  DoorOpen,
  Tv,
  Calendar,
  Trash2,
  Layers
} from "lucide-react";
import clsx from "clsx";
import { useMobileNav } from "./mobile-nav-context";
import { signOut } from "@/app/login/actions";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { isRouteAllowedForRole } from "@/utils/rbac";
import { playVoiceNotification } from "@/utils/voiceNotification";
import { toast } from "sonner";

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
      { name: "Appointments", href: "/hospital/appointments", icon: Calendar },
      { name: "Reception", href: "/hospital/reception", icon: Users },
      { name: "Waiting Room Display", href: "/hospital/queue-display", icon: Tv },
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
      { name: "Assets & Documents", href: "/hospital/assets", icon: Building },
    ]
  },
  {
    title: "Administration",
    items: [
      { name: "Billing & Claims", href: "/hospital/billing", icon: CreditCard },
      { name: "Finance & Expenses", href: "/hospital/finance", icon: CreditCard },
      { name: "Management", href: "/hospital/management", icon: LayoutDashboard },
      { name: "Staff Directory", href: "/hospital/staff", icon: Users },
      { name: "Departments", href: "/hospital/admin/departments", icon: Building },
      { name: "Rooms & Facilities", href: "/hospital/admin/rooms", icon: DoorOpen },
      { name: "HR & Staffing", href: "/hospital/hr", icon: Users },
      { name: "Reports & Analytics", href: "/hospital/reports", icon: LayoutDashboard },
      { name: "Data Purge & Wipe", href: "/hospital/admin/data-management", icon: Trash2 },
    ]
  }
];

export function HospitalSidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useMobileNav();
  const [opdCount, setOpdCount] = useState(0);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hms_user_role") || "STAFF";
    }
    return "STAFF";
  });
  const supabase = createClient();

  useEffect(() => {
    fetchUserRole();
    fetchOpdCount();
    fetchAppointmentsCount();

    const opdChannel = supabase
      .channel('opd-queue-sidebar')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'walkin_queue',
        filter: 'status=eq.WAITING'
      }, () => {
        setOpdCount(prev => prev + 1);
        announceArrival();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'walkin_queue'
      }, () => {
        fetchOpdCount();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'walkin_queue'
      }, () => {
        fetchOpdCount();
      })
      .subscribe();

    const apptChannel = supabase
      .channel('appointments-sidebar-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'appointments',
      }, (payload) => {
        fetchAppointmentsCount();
        const reason = payload.new && typeof payload.new === 'object' && 'reason' in payload.new
          ? String((payload.new as { reason?: string }).reason || '')
          : '';
        playVoiceNotification(
          "New Appointment",
          reason ? `New appointment booked for: ${reason}` : "A new patient appointment has been scheduled.",
          "appointment"
        );
        toast.info("New Appointment Scheduled", {
          description: reason ? `Reason: ${reason}` : "A new patient appointment has been received.",
          action: {
            label: "View",
            onClick: () => {
              window.location.href = "/hospital/appointments";
            }
          }
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointments',
      }, () => {
        fetchAppointmentsCount();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'appointments',
      }, () => {
        fetchAppointmentsCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(opdChannel);
      supabase.removeChannel(apptChannel);
    };
  }, []);

  const fetchUserRole = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role || user.user_metadata?.role || 'STAFF';
      setUserRole(role);
      if (typeof window !== "undefined") {
        localStorage.setItem("hms_user_role", role);
      }
    }
  };

  const fetchOpdCount = async () => {
    const { count } = await supabase
      .from('walkin_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'WAITING');
    
    setOpdCount(count || 0);
  };

  const fetchAppointmentsCount = async () => {
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'SCHEDULED');
    
    setAppointmentsCount(count || 0);
  };

  const announceArrival = () => {
    playVoiceNotification("New patient arrival for Outpatient Department", undefined, "info");
  };

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
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(item => isRouteAllowedForRole(userRole, item.href));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              <h4 className="px-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {group.title}
              </h4>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const subPath = item.href.replace('/hospital', '');
                  const isActive = 
                    pathname === item.href || 
                    pathname.startsWith(item.href + '/') ||
                    pathname === subPath ||
                    (subPath !== '' && subPath !== '/' && pathname.startsWith(subPath + '/'));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                      isActive 
                        ? "bg-slate-900 text-white shadow-xs font-semibold" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    )}
                  >
                    <item.icon size={17} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? "text-white" : "text-slate-400"} />
                    <span className="flex-1">{item.name}</span>
                    {item.name === "Appointments" && appointmentsCount > 0 && (
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-black transition-all shadow-xs shrink-0 tracking-tight",
                        isActive 
                          ? "bg-amber-400 text-slate-950 ring-1 ring-white/30" 
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      )}>
                        {appointmentsCount}
                      </span>
                    )}
                    {item.name === "Outpatient (OPD)" && opdCount > 0 && (
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0",
                        isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      )}>
                        {opdCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
      </nav>

      {/* Bottom Actions */}
      <div className="px-4 mt-6 pt-4 border-t border-slate-100 shrink-0 space-y-1">
        <Link
          href="/hospital/settings"
          className={clsx(
            "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
            pathname === "/hospital/settings"
              ? "bg-slate-900 text-white shadow-xs font-semibold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
          )}
        >
          <Settings size={17} strokeWidth={pathname === "/hospital/settings" ? 2.2 : 1.8} className={pathname === "/hospital/settings" ? "text-white" : "text-slate-400"} />
          Settings
        </Link>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50/70 transition-all duration-150 group"
        >
          <LogOut size={17} strokeWidth={1.8} className="text-slate-400 group-hover:text-rose-500" />
          Sign Out
        </button>
      </div>
    </aside>
    </>
  );
}
