"use client";

import { usePathname } from "next/navigation";
import { HospitalSidebar } from "@/components/layout/hospital-sidebar";
import { HospitalHeader } from "@/components/layout/hospital-header";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { HospitalBottomNav } from "@/components/layout/hospital-bottom-nav";
import QueueFloatingIndicator from "@/components/hospital/QueueFloatingIndicator";
import StaffPendingActionPopup from "@/components/hospital/StaffPendingActionPopup";
import { GeofenceGuard } from "@/components/hospital/GeofenceGuard";
import { OfflineProtectionBanner } from "@/components/common/OfflineProtectionBanner";

export function HospitalLayoutClient({
  children,
  initialUserRole,
  initialUserProfile,
}: {
  children: React.ReactNode;
  initialUserRole?: string | null;
  initialUserProfile?: any;
}) {
  const pathname = usePathname();
  const isQueueDisplay = pathname?.startsWith("/hospital/queue-display");

  if (isQueueDisplay) {
    return <main className="w-full min-h-screen bg-slate-50">{children}</main>;
  }

  return (
    <MobileNavProvider>
      <div className="min-h-screen bg-[#F8FAFC] pb-20 lg:pb-0">
        <OfflineProtectionBanner />
        <HospitalHeader initialUserProfile={initialUserProfile} />
        <HospitalSidebar initialUserRole={initialUserRole} />
        <HospitalBottomNav />
        <QueueFloatingIndicator />
        <StaffPendingActionPopup />
        <GeofenceGuard />
        <div className="lg:ml-72 pt-16 flex flex-col min-h-screen">
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
