"use client";
import type { ReactNode } from "react";
import { IconExternalLink } from "@tabler/icons-react";
import type { RetryAttempt } from "@/lib/learning/coach/model";
import { rankPuzzles } from "@/lib/insights/puzzles";
import type { ImportedGame, Leak, TimeClass } from "@/lib/insights/types";

export const TIME_CLASS_LABEL: Record<TimeClass, string> = {
  rapid: "Rapid",
  blitz: "Blitz",
  bullet: "Bullet",
  daily: "Daily",
};
export const TIME_CLASS_ORDER: TimeClass[] = ["rapid", "blitz", "bullet", "daily"];

/** A set of puzzles to practise, e.g. the mistakes behind one headline. */
export interface PracticeFilter {
  label: string;
  ids: string[];
}

/** Puzzles the puzzle engine's fresh check found nothing clear to practise in; kept per browser. */
const SET_ASIDE_KEY = "knightly_insights_set_aside_v1";
const SET_ASIDE_LIMIT = 500;

export function readSetAside(): Set<string> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SET_ASIDE_KEY) ?? "[]");
    return new Set(Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function writeSetAside(ids: Set<string>) {
  try {
    localStorage.setItem(SET_ASIDE_KEY, JSON.stringify([...ids].slice(-SET_ASIDE_LIMIT)));
  } catch {
    // Without storage the position is still skipped for the rest of this visit.
  }
}

/**
 * The positions Practice offers now, in its order. Set-aside positions never get an attempt,
 * so rankPuzzles alone would count them as never tried for good.
 */
export function practiceQueue(leaks: Leak[], attempts: RetryAttempt[], setAside: ReadonlySet<string>, now: number) {
  return rankPuzzles(leaks.filter((leak) => !setAside.has(leak.id)), attempts, now);
}

/** Games an opening needs, played and with a winning chance after the opening, before the table judges it. */
export const MIN_OPENING_GAMES = 4;

/**
 * Plain-words reading of an opening's average winning chances around move 12 (see report.ts winAfterOpening).
 * `measured` is the number of analysed games in the group that gave a reading; the average comes from those only.
 */
export function openingVerdict(games: number, measured: number, win: number) {
  if (games < MIN_OPENING_GAMES) return "Too few games to judge";
  if (measured === 0) return "Not analysed yet";
  if (measured < MIN_OPENING_GAMES) return `Too few analysed yet (${measured} of ${games})`;
  if (win >= 60) return "On average ahead around move 12";
  if (win >= 45) return "On average about level around move 12";
  if (win >= 35) return "On average a little worse around move 12";
  return "On average clearly worse around move 12";
}

export const percent = (value: number) => `${Math.round(value)}%`;

/** Share of `part` in `whole` as a whole-number percentage; 0 when there is nothing to share. */
export const shareOf = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

export const plural = (count: number, word: string, many = `${word}s`) =>
  `${count.toLocaleString()} ${count === 1 ? word : many}`;

export function gameDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function opponentOf(game: ImportedGame) {
  return game.userColor === "white" ? game.black : game.white;
}

/** "rapid and blitz", "rapid, blitz and daily". */
export function listTimeClasses(classes: TimeClass[]) {
  const names = TIME_CLASS_ORDER.filter((value) => classes.includes(value)).map(
    (value) => TIME_CLASS_LABEL[value].toLowerCase(),
  );
  return names.length > 1
    ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
    : (names[0] ?? "");
}

/** "2026-10" becomes "October 2026". */
export function monthName(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );
}

export function clockText(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  if (whole >= 3600) {
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  }
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** Deliberately vague: the estimate is only as good as the last few positions. */
export function timeLeftText(seconds: number | null) {
  if (seconds === null) return "Working out how long this will take…";
  if (seconds < 60) return "Less than a minute left";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `About ${plural(minutes, "minute")} left`;
  // Round to 5 minutes before splitting, so 1 h 58 min reads as 2 hours, never "1 hour 60 minutes".
  const rounded = Math.round(minutes / 5) * 5;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return `About ${plural(hours, "hour")}${rest ? ` ${rest} minutes` : ""} left`;
}

/**
 * Whole-number percentages of `parts` that add up to exactly 100 when anything is shared: each part
 * is rounded down, then the points left over go to the largest remainders (earlier parts win ties).
 */
export function sharesOf(parts: number[]): number[] {
  const whole = parts.reduce((sum, part) => sum + part, 0);
  if (!(whole > 0)) return parts.map(() => 0);
  const exact = parts.map((part) => (part / whole) * 100);
  const shares = exact.map(Math.floor);
  let spare = 100 - shares.reduce((sum, share) => sum + share, 0);
  const order = exact
    .map((value, index) => ({ index, remainder: value - shares[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of order) {
    if (spare <= 0) break;
    shares[index]++;
    spare--;
  }
  return shares;
}

/**
 * Analysis progress over the whole import. A run covers only the games waiting when it started
 * (`total`, which stays 0 until its first report); before that report the stored games still
 * waiting (`pending`) are what is left, so the bar never starts out full.
 */
export function analysisProgress(
  gamesTotal: number,
  pending: number,
  run: { total: number; done: number; failed: number },
) {
  const overall = Math.max(gamesTotal, run.total);
  const analysed = run.total ? overall - run.total + run.done : Math.max(0, overall - pending);
  const finished = Math.min(overall, analysed + run.failed);
  const value = overall ? Math.round((finished / overall) * 100) : 0;
  return { overall, analysed, finished, value };
}

export function ExternalGameLink({
  url,
  children,
  className = "insights-external",
}: {
  url: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a className={className} href={url} target="_blank" rel="noopener noreferrer">
      {children}
      <IconExternalLink size={13} aria-hidden="true" />
      <span className="sr-only"> (opens chess.com in a new tab)</span>
    </a>
  );
}

/** A plain horizontal bar; `value` is 0-100. Decorative: the number beside it carries the meaning. */
export function Bar({ value, tone = "accent" }: { value: number; tone?: "accent" | "warning" | "quiet" }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <span className={`insights-bar insights-bar-${tone}`} aria-hidden="true">
      <span style={{ width: `${width}%` }} />
    </span>
  );
}
