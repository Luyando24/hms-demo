import type { Metadata } from "next";

export const metadata: Metadata = { title: "Medical Records" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
