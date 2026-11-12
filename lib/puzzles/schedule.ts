import type { PuzzleAttempt, PuzzleProgress } from "./types";

const DAY = 86_400_000;
/** Days until a failed puzzle returns: 1 day after a miss, then 3 and 7 days after each clean solve. */
export const LADDER_DAYS = [1, 3, 7] as const;

/**
 * When a failed puzzle is due again, or null when it never failed or has cleared the ladder.
 * A miss always restarts the ladder at 1 day.
 *
 * (lib/learning/schedule.ts brings misses back after 15 minutes, which suits game decisions but
 * would just replay a puzzle whose answer you saw a minute ago, so puzzles use a plain ladder.)
 */
export function repeatDueAt(history: Pick<PuzzleAttempt, "at" | "solved">[]): number | null {
  const ordered = [...history].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const lastMiss = ordered.findLastIndex((a) => !a.solved);
  if (lastMiss < 0) return null;
  const solvesSince = ordered.length - 1 - lastMiss;
  if (solvesSince >= LADDER_DAYS.length) return null;
  return Date.parse(ordered.at(-1)!.at) + LADDER_DAYS[solvesSince] * DAY;
}

/** Ids of failed puzzles that are due now, the longest-overdue first. */
export function dueRepeats(progress: PuzzleProgress, now: number): string[] {
  const byPuzzle = new Map<string, PuzzleAttempt[]>();
  for (const a of progress.attempts) {
    if (!byPuzzle.has(a.puzzleId)) byPuzzle.set(a.puzzleId, []);
    byPuzzle.get(a.puzzleId)!.push(a);
  }
  return Object.keys(progress.repeats)
    .map((id) => ({ id, due: repeatDueAt(byPuzzle.get(id) ?? []) }))
    .filter((x): x is { id: string; due: number } => x.due !== null && x.due <= now)
    .sort((a, b) => a.due - b.due || a.id.localeCompare(b.id))
    .map((x) => x.id);
}
