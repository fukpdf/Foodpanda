import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | DeliveryOS",
    default: "DeliveryOS — Food Delivered Fast",
  },
  description:
    "Order from the best local restaurants. Fast delivery to your door.",
  keywords: ["food delivery", "restaurant", "order food", "fast delivery"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DeliveryOS",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "DeliveryOS",
    title: "DeliveryOS — Food Delivered Fast",
    description: "Order from the best local restaurants. Fast delivery.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DeliveryOS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f97316" },
    { media: "(prefers-color-scheme: dark)", color: "#ea580c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <head />
      <body className="bg-gray-50 font-sans antialiased">
        <div id="portal-root" />
        {children}
      </body>
    </html>
  );
}
