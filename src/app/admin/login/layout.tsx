import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administrator Sign In",
  description: "Secure sign in for authorized hospital administrators.",
};

export default function AdminLoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
