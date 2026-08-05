import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patient Record",
  description: "Secure clinical record and treatment history.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
