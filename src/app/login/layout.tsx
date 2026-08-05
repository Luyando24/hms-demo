import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Sign In",
  description: "Secure sign in for HMS hospital staff and administrators.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}
