"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  IconBook2,
  IconRoute,
  IconChess,
  IconMoon,
  IconSun,
  IconArchive,
} from "@tabler/icons-react";

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const playing = ["/", "/play"].includes(path);
  const learning = path.startsWith("/learn");
  const studying = path.startsWith("/study");
  const roadmap = path === "/learn";
  const lesson = path === "/learn/foundations";
  const [dark, setDark] = useState(true);
  const studyNav = useRef<HTMLElement>(null);
  // On narrow screens the study nav scrolls sideways; keep the current section in view.
  useEffect(() => {
    studyNav.current
      ?.querySelector("[aria-current]")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
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
          <Link href="/play" className="brand">
            <Image
              src="/brand/knightly.svg"
              alt=""
              width={32}
              height={32}
              unoptimized
            />
            <span>Knightly</span>
          </Link>
          <nav aria-label="Primary" className="primary-nav">
            <Link href="/play" aria-current={playing ? "page" : undefined}>
              <IconChess size={19} stroke={1.7} />
              <span>Play</span>
            </Link>
            <Link href="/learn" aria-current={learning ? "page" : undefined}>
              <IconRoute size={19} stroke={1.7} /><span>Learn</span>
            </Link>
            <Link href="/study" aria-current={studying ? "page" : undefined}>
              <IconBook2 size={19} stroke={1.7} />
              <span>Study</span>
            </Link>
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
      {!playing && !roadmap && !lesson && !studying && (
        <div className="study-nav-wrap">
          <nav className="study-nav" aria-label="Study sections" ref={studyNav}>
            <Link
              href="/study"
              aria-current={path.startsWith("/study") ? "page" : undefined}
            >
              Library
            </Link>
            <Link
              href="/learn/games"
              aria-current={path === "/learn/games" ? "page" : undefined}
            >
              Game practice
            </Link>
            <Link
              href="/games"
              aria-current={
                (path.startsWith("/games") && !path.startsWith("/games/insights")) ||
                path.startsWith("/review")
                  ? "page"
                  : undefined
              }
            >
              Your games
            </Link>
            <Link
              href="/games/insights"
              aria-current={
                path.startsWith("/games/insights") ? "page" : undefined
              }
            >
              Your leaks
            </Link>
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
