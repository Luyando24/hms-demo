import type { Metadata } from "next";
import { Roboto_Condensed, Inter } from "next/font/google";
import "./globals.css";

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-roboto-condensed",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "HMS - Kunda Health Care",
  title: "HMS - Kunda Health Care",
  description: "Integrated hospital services, clinical operations, and patient care.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "HMS - Kunda",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${robotoCondensed.variable} ${inter.variable}`}>
      <body className="font-sans antialiased text-slate-900 bg-[#F8FAFC] selection:bg-slate-900 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
