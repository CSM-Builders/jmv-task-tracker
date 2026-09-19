import type { Metadata, Viewport } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "JMV Task Tracker", template: "%s | JMV Task Tracker" },
  description: "A focused, secure task dashboard for measurable progress.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <Script src="/theme.js" strategy="beforeInteractive" />
      </head>
      <body className={`${dmSans.variable} ${outfit.variable}`}>
        {children}
      </body>
    </html>
  );
}
