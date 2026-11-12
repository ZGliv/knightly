import { Chess, type Square } from "chess.js";
import { START_FEN } from "@/lib/openings/tree";

/** One move along the path from the start position. */
export interface PathStep {
  uci: string;
  san: string;
  /** Position after the move. */
  fen: string;
}

export const fenOf = (path: PathStep[]) => path.at(-1)?.fen ?? START_FEN;

/** "1. e4 e5 2. Nf3" style move numbers for a path. */
export function moveNumber(index: number): string {
  return index % 2 === 0 ? `${index / 2 + 1}.` : "";
}

/** Board helpers for ChessBoard's legality callbacks. */
export function legalTargets(fen: string, from: string): string[] {
  try {
    return new Chess(fen).moves({ square: from as Square, verbose: true }).map((m) => m.to);
  } catch {
    return [];
  }
}

/** The UCI of a board move, or null when it is illegal. */
export function boardMoveUci(fen: string, from: string, to: string, promotion = "q"): string | null {
  try {
    const move = new Chess(fen).move({ from, to, promotion });
    return move.from + move.to + (move.promotion ?? "");
  } catch {
    return null;
  }
}

export const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
