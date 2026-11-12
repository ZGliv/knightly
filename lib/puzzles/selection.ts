import { dueRepeats } from "./schedule";
import type { Puzzle, PuzzleIndex, PuzzleProgress } from "./types";

/** New puzzles are served within this many points of the player's rating when possible. */
export const RATING_WINDOW = 100;

export type Filter = { kind: "all" } | { kind: "theme"; theme: string } | { kind: "weak"; themes: string[] };

const matches = (puzzle: Puzzle, filter: Filter) =>
  filter.kind === "all" ? true
  : filter.kind === "theme" ? puzzle.themes.includes(filter.theme)
  : puzzle.themes.some((t) => filter.themes.includes(t));

/** Band files covering rating ± window, so the browser only downloads what it needs. */
export function bandsFor(index: PuzzleIndex, rating: number, window = RATING_WINDOW) {
  return index.bands.filter((b) => b.min + index.bandSize > rating - window && b.min <= rating + window).map((b) => b.file);
}

export type Pick = { puzzle: Puzzle; repeat: boolean } | null;

/**
 * Due repeats first (if they fit the filter), then an unseen puzzle within RATING_WINDOW of the
 * rating, chosen at random. If none is that close, the nearest unseen one in the pool.
 */
export function choosePuzzle(opts: { pool: Puzzle[]; progress: PuzzleProgress; rating: number; filter: Filter; now: number; random?: () => number; skip?: string }): Pick {
  const { pool, progress, rating, filter, now, random = Math.random, skip } = opts;
  for (const id of dueRepeats(progress, now)) {
    const puzzle = progress.repeats[id];
    if (puzzle && id !== skip && matches(puzzle, filter)) return { puzzle, repeat: true };
  }
  const seen = new Set(progress.attempts.map((a) => a.puzzleId));
  const fresh = pool.filter((p) => !seen.has(p.id) && p.id !== skip && matches(p, filter));
  if (!fresh.length) return null;
  const close = fresh.filter((p) => Math.abs(p.rating - rating) <= RATING_WINDOW);
  if (close.length) return { puzzle: close[Math.floor(random() * close.length) % close.length], repeat: false };
  const nearest = fresh.reduce((best, p) => (Math.abs(p.rating - rating) < Math.abs(best.rating - rating) ? p : best));
  return { puzzle: nearest, repeat: false };
}
