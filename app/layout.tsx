/*
 * File: app/layout.tsx
 * Description: Defines global metadata, fonts, and root HTML layout for the entire Knightly app.
 * Functions:
 * - RootLayout: Wraps all pages with global styles and shared application shell.
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Knightly | Play & Study Chess",
  applicationName: "Knightly",
  icons: {
    icon: "/icon.svg",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: { capable: true, title: "Knightly", statusBarStyle: "default" },
  description:
    "Play chess, revisit your own decisions, and build your understanding one idea at a time.",
};

export const viewport: Viewport = { themeColor: "#262522" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem("knightly_theme_v1")==="light"?"light":"dark"}catch{}`,
          }}
        />
      </head>
      <body className="min-h-full">
        {/* This wraps all pages in a consistent MVP shell. */}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
