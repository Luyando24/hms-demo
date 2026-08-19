import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Sign In",
  description: "Secure sign in for authorized hospital staff.",
};

export default function StaffLoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
