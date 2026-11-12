import { Chess } from "chess.js";
import type { PlayerColor } from "@/types/game";
import { positionKey, START_FEN, turnOf } from "./tree";

/** The move the player has chosen to play in one position. */
export interface RepertoireMove {
  uci: string;
  san: string;
  /** The position the move is played from, so lines can be followed and pruned. */
  fen: string;
}

/** One drill answer for a position. "independent" is a right answer, "not-yet" a wrong one. */
export interface DrillReview {
  at: string;
  outcome: "independent" | "not-yet";
}

export interface RepertoireData {
  /** Position key (first four FEN fields) -> chosen move. */
  moves: Record<string, RepertoireMove>;
  /** Position key -> drill answers, oldest first. */
  reviews: Record<string, DrillReview[]>;
}

export const EMPTY_REPERTOIRE: RepertoireData = { moves: {}, reviews: {} };

/** Older answers than this do not change the schedule; they are dropped to keep storage small. */
const MAX_REVIEWS = 12;

/** Plays `uci` from `fen`; null when the move is not legal there. */
export function playUci(fen: string, uci: string): { san: string; fen: string } | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
    return { san: move.san, fen: chess.fen() };
  } catch {
    return null;
  }
}

/** Sets the player's move in a position, replacing any earlier choice there. Null when the move is illegal. */
export function chooseMove(data: RepertoireData, fen: string, uci: string): RepertoireData | null {
  const played = playUci(fen, uci);
  if (!played) return null;
  const key = positionKey(fen);
  const previous = data.moves[key];
  const moves = { ...data.moves, [key]: { uci, san: played.san, fen } };
  // A new choice is a new answer to learn: its old drill record no longer applies.
  const reviews = { ...data.reviews };
  if (previous && previous.uci !== uci) delete reviews[key];
  return { moves, reviews };
}

/**
 * Removes the move chosen in this position and every prepared position that can no longer be
 * reached from the start by following the repertoire (with any opponent reply).
 */
export function removeLine(data: RepertoireData, fen: string): RepertoireData {
  const key = positionKey(fen);
  const target = data.moves[key];
  if (!target) return data;
  const moves = { ...data.moves };
  delete moves[key];
  return prune({ moves, reviews: data.reviews }, turnOf(fen));
}

/** Keeps only the prepared positions for `color` reachable from the start; other colours are untouched. */
export function prune(data: RepertoireData, color: PlayerColor): RepertoireData {
  const reachable = reachableKeys(data.moves, color);
  const moves: Record<string, RepertoireMove> = {};
  const reviews: Record<string, DrillReview[]> = {};
  for (const [key, move] of Object.entries(data.moves)) {
    if (turnOf(move.fen) !== color || reachable.has(key)) {
      moves[key] = move;
      if (data.reviews[key]) reviews[key] = data.reviews[key];
    }
  }
  return { moves, reviews };
}

/** Prepared positions for `color` reachable from the start through the repertoire and any opponent move. */
export function reachableKeys(moves: Record<string, RepertoireMove>, color: PlayerColor): Set<string> {
  const reached = new Set<string>();
  const visited = new Set<string>();
  const queue = [START_FEN];
  while (queue.length) {
    const fen = queue.shift()!;
    const key = positionKey(fen);
    if (visited.has(key)) continue;
    visited.add(key);
    if (turnOf(fen) === color) {
      const chosen = moves[key];
      if (!chosen) continue;
      reached.add(key);
      const next = playUci(fen, chosen.uci);
      if (next) queue.push(next.fen);
    } else {
      const chess = new Chess(fen);
      for (const move of chess.moves({ verbose: true }))
        if (moves[positionKey(move.after)]) queue.push(move.after);
    }
  }
  return reached;
}

/** Number of prepared positions for one colour. */
export function preparedCount(data: RepertoireData, color: PlayerColor): number {
  return Object.values(data.moves).filter((move) => turnOf(move.fen) === color).length;
}

export function recordReview(data: RepertoireData, key: string, review: DrillReview): RepertoireData {
  const history = [...(data.reviews[key] ?? []), review].slice(-MAX_REVIEWS);
  return { moves: data.moves, reviews: { ...data.reviews, [key]: history } };
}

// ---------- validation for stored data ----------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

/** Reads stored data, skipping anything malformed instead of failing as a whole. */
export function parseRepertoire(raw: unknown): RepertoireData {
  if (!isRecord(raw) || raw.version !== 1) return EMPTY_REPERTOIRE;
  const moves: Record<string, RepertoireMove> = {};
  const reviews: Record<string, DrillReview[]> = {};
  if (isRecord(raw.moves))
    for (const [key, value] of Object.entries(raw.moves)) {
      if (!isRecord(value) || typeof value.uci !== "string" || !UCI.test(value.uci) || typeof value.fen !== "string") continue;
      if (positionKey(value.fen) !== key) continue;
      const played = playUci(value.fen, value.uci);
      if (played) moves[key] = { uci: value.uci, san: played.san, fen: value.fen };
    }
  if (isRecord(raw.reviews))
    for (const [key, value] of Object.entries(raw.reviews)) {
      if (!moves[key] || !Array.isArray(value)) continue;
      const list = value.filter(
        (r): r is DrillReview =>
          isRecord(r) &&
          typeof r.at === "string" &&
          Number.isFinite(Date.parse(r.at)) &&
          (r.outcome === "independent" || r.outcome === "not-yet"),
      );
      if (list.length) reviews[key] = list.slice(-MAX_REVIEWS);
    }
  return { moves, reviews };
}

export function serializeRepertoire(data: RepertoireData): string {
  return JSON.stringify({ version: 1, moves: data.moves, reviews: data.reviews });
}
