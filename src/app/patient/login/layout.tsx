import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patient Sign In",
  description: "Secure sign in to the HMS patient portal.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PatientLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
