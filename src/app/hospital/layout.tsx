import { HospitalSidebar } from "@/components/layout/hospital-sidebar";
import { HospitalHeader } from "@/components/layout/hospital-header";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { HospitalBottomNav } from "@/components/layout/hospital-bottom-nav";
import QueueFloatingIndicator from "@/components/hospital/QueueFloatingIndicator";

export default function HospitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileNavProvider>
      <div className="min-h-screen bg-slate-100 pb-20 lg:pb-0">
        <HospitalHeader />
        <HospitalSidebar />
        <HospitalBottomNav />
        <QueueFloatingIndicator />
        <div className="lg:ml-72 pt-20 flex flex-col min-h-screen">
          <main className="flex-1 p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
