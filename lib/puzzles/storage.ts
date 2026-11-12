import { emptyProgress, type Puzzle, type PuzzleAttempt, type PuzzleProgress } from "./types";

export const PUZZLES_KEY = "knightly_puzzles_v1";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

function isPuzzle(v: unknown): v is Puzzle {
  return isObj(v) && typeof v.id === "string" && typeof v.fen === "string" && isStrings(v.moves) && v.moves.length >= 2 && isNum(v.rating) && isStrings(v.themes);
}

function isAttempt(v: unknown): v is PuzzleAttempt {
  return isObj(v) && typeof v.puzzleId === "string" && typeof v.at === "string" && Number.isFinite(Date.parse(v.at)) &&
    typeof v.solved === "boolean" && typeof v.rated === "boolean" && isNum(v.puzzleRating) && isStrings(v.themes) &&
    isNum(v.ratingBefore) && isNum(v.ratingAfter);
}

/** Parses stored progress, dropping anything malformed instead of failing. */
export function parseProgress(raw: string | null): PuzzleProgress {
  if (!raw) return emptyProgress();
  try {
    const data: unknown = JSON.parse(raw);
    if (!isObj(data) || data.version !== 1) return emptyProgress();
    const repeats: Record<string, Puzzle> = {};
    if (isObj(data.repeats)) for (const [id, p] of Object.entries(data.repeats)) if (isPuzzle(p) && p.id === id) repeats[id] = p;
    return {
      version: 1,
      rating: isNum(data.rating) ? data.rating : null,
      attempts: Array.isArray(data.attempts) ? data.attempts.filter(isAttempt) : [],
      repeats,
    };
  } catch {
    return emptyProgress();
  }
}

/** Reads progress; returns `available: false` when this browser blocks storage. */
export function loadProgress(): { progress: PuzzleProgress; available: boolean } {
  try {
    return { progress: parseProgress(localStorage.getItem(PUZZLES_KEY)), available: true };
  } catch {
    return { progress: emptyProgress(), available: false };
  }
}

export function saveProgress(progress: PuzzleProgress): boolean {
  try {
    localStorage.setItem(PUZZLES_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
