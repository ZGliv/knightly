"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  IconBook,
  IconCalendarCheck,
  IconChess,
  IconMoon,
  IconPuzzle,
  IconSun,
  IconArchive,
  IconTrophy,
  type Icon,
} from "@tabler/icons-react";

/** True on `prefix` itself and on any page below it. */
const within = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/** The five daily tools. Each page matches at most one item across both navs. */
const PRIMARY: { href: string; label: string; icon: Icon; match: (path: string) => boolean }[] = [
  { href: "/today", label: "Today", icon: IconCalendarCheck, match: (p) => p === "/" || within(p, "/today") },
  { href: "/puzzles", label: "Puzzles", icon: IconPuzzle, match: (p) => within(p, "/puzzles") },
  { href: "/openings", label: "Openings", icon: IconBook, match: (p) => within(p, "/openings") },
  { href: "/masters", label: "Pros", icon: IconTrophy, match: (p) => within(p, "/masters") },
  { href: "/play", label: "Play", icon: IconChess, match: (p) => within(p, "/play") },
];

/** Everything else, in the "More" row. /learn/games practises your own Knightly games, so it sits with them. */
const SECONDARY: { href: string; label: string; match: (path: string) => boolean }[] = [
  { href: "/games/insights", label: "Your leaks", match: (p) => within(p, "/games/insights") },
  {
    href: "/games",
    label: "Your games",
    match: (p) => (within(p, "/games") && !within(p, "/games/insights")) || within(p, "/review") || within(p, "/learn/games"),
  },
  { href: "/study", label: "Library", match: (p) => within(p, "/study") },
  { href: "/learn", label: "Rules refresher", match: (p) => within(p, "/learn") && !within(p, "/learn/games") },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const playing = path === "/play";
  const roadmap = path === "/learn";
  const lesson = path === "/learn/foundations";
  const [dark, setDark] = useState(true);
  const primaryNav = useRef<HTMLElement>(null);
  const studyNav = useRef<HTMLElement>(null);
  // On narrow screens both navs can scroll sideways; keep the current item in view.
  useEffect(() => {
    for (const nav of [primaryNav.current, studyNav.current])
      nav?.querySelector("[aria-current]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [path]);
  useEffect(() => {
    let next = true;
    try {
      next = localStorage.getItem("knightly_theme_v1") !== "light";
    } catch {}
    document.documentElement.dataset.theme = next ? "dark" : "light";
    queueMicrotask(() => {
      setDark(next);
    });
  }, []);
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("knightly_theme_v1", next ? "dark" : "light");
    } catch {}
  }
  return (
    <div className={`app-shell ${playing ? "play-shell" : ""} ${roadmap || lesson ? "roadmap-shell" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Link href="/today" className="brand">
            <Image
              src="/brand/knightly.svg"
              alt=""
              width={32}
              height={32}
              unoptimized
            />
            <span>Knightly</span>
          </Link>
          <nav aria-label="Primary" className="primary-nav" ref={primaryNav}>
            {PRIMARY.map(({ href, label, icon: ItemIcon, match }) => (
              <Link key={href} href={href} aria-current={match(path) ? "page" : undefined}>
                <ItemIcon size={19} stroke={1.7} aria-hidden />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="header-tools">
            <Link
              href="/games"
              className="icon-button"
              aria-label="Your saved games"
            >
              <IconArchive size={20} stroke={1.7} />
            </Link>
            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label={dark ? "Use light theme" : "Use dark theme"}
            >
              {dark ? (
                <IconSun size={20} stroke={1.7} />
              ) : (
                <IconMoon size={20} stroke={1.7} />
              )}
            </button>
          </div>
        </div>
      </header>
      {!playing && (
        <div className="study-nav-wrap">
          <nav className="study-nav" aria-label="More" ref={studyNav}>
            {SECONDARY.map(({ href, label, match }) => (
              <Link key={href} href={href} aria-current={match(path) ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
      <main
        id="main-content"
        className={`workspace ${path === "/play" ? "play-workspace" : roadmap ? "roadmap-workspace" : lesson ? "lesson-workspace" : ""}`}
      >
        {children}
      </main>

    </div>
  );
}
