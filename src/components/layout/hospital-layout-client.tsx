"use client";

import { usePathname } from "next/navigation";
import { HospitalSidebar } from "@/components/layout/hospital-sidebar";
import { HospitalHeader } from "@/components/layout/hospital-header";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { HospitalBottomNav } from "@/components/layout/hospital-bottom-nav";
import QueueFloatingIndicator from "@/components/hospital/QueueFloatingIndicator";
import StaffPendingActionPopup from "@/components/hospital/StaffPendingActionPopup";

export function HospitalLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isQueueDisplay = pathname?.startsWith("/hospital/queue-display");

  if (isQueueDisplay) {
    return <main className="w-full min-h-screen bg-slate-50">{children}</main>;
  }

  return (
    <MobileNavProvider>
      <div className="min-h-screen bg-slate-100 pb-20 lg:pb-0">
        <HospitalHeader />
        <HospitalSidebar />
        <HospitalBottomNav />
        <QueueFloatingIndicator />
        <StaffPendingActionPopup />
        <div className="lg:ml-72 pt-20 flex flex-col min-h-screen">
          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
