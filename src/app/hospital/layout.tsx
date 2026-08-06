import type { Metadata } from "next";
import { HospitalLayoutClient } from "@/components/layout/hospital-layout-client";

export const metadata: Metadata = {
  title: "Hospital Console",
  description: "Secure clinical and hospital operations workspace.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HospitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HospitalLayoutClient>{children}</HospitalLayoutClient>;
}
