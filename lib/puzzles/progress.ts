import { nextRating } from "./rating";
import { repeatDueAt } from "./schedule";
import { FILTER_THEMES } from "./themes";
import type { Puzzle, PuzzleAttempt, PuzzleProgress } from "./types";

/** Themes need this many attempts before their success rate is shown or used. */
export const THEME_MIN_ATTEMPTS = 5;

/**
 * Records a finished puzzle. Only the first try at a puzzle is rated (repeats are practice,
 * otherwise you could farm rating by replaying puzzles you have already seen the answer to).
 */
export function recordResult(progress: PuzzleProgress, puzzle: Puzzle, solved: boolean, startRating: number, now: number): { progress: PuzzleProgress; attempt: PuzzleAttempt } {
  const before = progress.rating ?? startRating;
  const rated = !progress.attempts.some((a) => a.puzzleId === puzzle.id);
  const ratedSoFar = progress.attempts.filter((a) => a.rated).length;
  const after = rated ? nextRating(before, puzzle.rating, solved, ratedSoFar) : before;
  const attempt: PuzzleAttempt = {
    puzzleId: puzzle.id,
    at: new Date(now).toISOString(),
    solved,
    rated,
    puzzleRating: puzzle.rating,
    themes: puzzle.themes,
    ratingBefore: before,
    ratingAfter: after,
  };
  const attempts = [...progress.attempts, attempt];
  const repeats = { ...progress.repeats };
  if (!solved) repeats[puzzle.id] = puzzle;
  // Drop puzzles that have cleared the ladder so storage does not grow forever.
  else if (repeats[puzzle.id] && repeatDueAt(attempts.filter((a) => a.puzzleId === puzzle.id)) === null) delete repeats[puzzle.id];
  return { progress: { ...progress, rating: after, attempts, repeats }, attempt };
}

export interface ThemeStat {
  theme: string;
  attempts: number;
  solved: number;
  rate: number;
}

/** Success rate per theme, for themes with at least THEME_MIN_ATTEMPTS attempts, weakest first. */
export function themeStats(attempts: PuzzleAttempt[]): ThemeStat[] {
  const tally = new Map<string, { attempts: number; solved: number }>();
  for (const a of attempts)
    for (const theme of a.themes) {
      const t = tally.get(theme) ?? { attempts: 0, solved: 0 };
      t.attempts++;
      if (a.solved) t.solved++;
      tally.set(theme, t);
    }
  return [...tally]
    .filter(([, t]) => t.attempts >= THEME_MIN_ATTEMPTS)
    .map(([theme, t]) => ({ theme, ...t, rate: t.solved / t.attempts }))
    .sort((a, b) => a.rate - b.rate || b.attempts - a.attempts || a.theme.localeCompare(b.theme));
}

/** The (up to `count`) filterable themes with the lowest success rate. */
export function weakThemes(attempts: PuzzleAttempt[], count = 3): string[] {
  const filterable = new Set<string>(FILTER_THEMES);
  return themeStats(attempts).filter((s) => filterable.has(s.theme)).slice(0, count).map((s) => s.theme);
}

const localDay = (ms: number) => new Date(ms).toDateString();

export function solvedToday(attempts: PuzzleAttempt[], now: number) {
  const today = localDay(now);
  return attempts.filter((a) => a.solved && localDay(Date.parse(a.at)) === today).length;
}

/** Puzzles solved in a row, counting back from the most recent. */
export function currentStreak(attempts: PuzzleAttempt[]) {
  let streak = 0;
  for (let i = attempts.length - 1; i >= 0 && attempts[i].solved; i--) streak++;
  return streak;
}
