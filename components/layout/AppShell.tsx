/*
 * File: components/layout/AppShell.tsx
 * Description: Wraps pages in a consistent dark UI shell with a lightweight app header.
 * Functions:
 * - AppShell: Provides shared page container and title bar.
 */

"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-base font-semibold text-indigo-300">
            BuddyMine Chess Coach
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-300">
            <Link className="hover:text-zinc-100" href="/play">
              Play
            </Link>
            <Link className="hover:text-zinc-100" href="/games">
              Games
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
