import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { PatientBottomNav } from "@/components/layout/patient-bottom-nav";

export const metadata: Metadata = {
  title: "Patient Portal",
  description: "Secure access to appointments, records, prescriptions, and billing.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PatientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileNavProvider>
      <div className="min-h-screen bg-slate-100 pb-20 lg:pb-0">
        <Header />
        <Sidebar />
        <PatientBottomNav />
        <div className="lg:ml-72 pt-20 flex flex-col min-h-screen">
          <main className="flex-1 p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
