/*
 * File: app/layout.tsx
 * Description: Defines global metadata, fonts, and root HTML layout for the entire BuddyMine app.
 * Functions:
 * - RootLayout: Wraps all pages with global styles and shared application shell.
 */

import type { Metadata } from "next";
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
  title: "BuddyMine Chess Coach",
  description: "Standalone chess coaching app with live move guidance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        {/* This wraps all pages in a consistent MVP shell. */}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
