import type { Metadata } from "next";

export const metadata: Metadata = { title: "Intensive Care Unit" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
