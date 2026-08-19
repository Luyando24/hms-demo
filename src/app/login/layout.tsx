import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workforce Sign In",
  description: "Choose secure staff or administrator access.",
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
