import type { Metadata } from "next";

export const metadata: Metadata = { title: "Outpatient Department" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
