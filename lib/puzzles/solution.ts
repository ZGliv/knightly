import { Chess, type Move } from "chess.js";
import type { Puzzle } from "./types";

export type Side = "white" | "black";

const toUci = (m: Move) => m.from + m.to + (m.promotion ?? "");

/** Plays one UCI move on a copy of `fen`; returns null when it is illegal. */
export function playUci(fen: string, uci: string): { fen: string; move: Move } | null {
  const chess = new Chess(fen);
  try {
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return { fen: chess.fen(), move };
  } catch {
    return null;
  }
}

/** The side the solver plays: the opposite of whoever makes the setup move. */
export function solverSide(puzzle: Puzzle): Side {
  return new Chess(puzzle.fen).turn() === "w" ? "black" : "white";
}

/** Every position along the full line, from the puzzle FEN to the end. fens[i] is before moves[i]. */
export function linePositions(puzzle: Puzzle): string[] {
  const fens = [puzzle.fen];
  for (const uci of puzzle.moves) {
    const next = playUci(fens.at(-1)!, uci);
    if (!next) throw new Error(`Puzzle ${puzzle.id} has an illegal move ${uci}.`);
    fens.push(next.fen);
  }
  return fens;
}

export type MoveVerdict =
  | { kind: "illegal" }
  | { kind: "wrong"; uci: string }
  /** Right move; `done` means the puzzle is solved, otherwise `reply` is the opponent's answer. */
  | { kind: "correct"; uci: string; fen: string; done: boolean; reply?: string };

/**
 * Checks the solver's move at `ply` (an odd index into puzzle.moves).
 * As on Lichess, any move that gives checkmate is accepted and ends the puzzle.
 */
export function checkMove(puzzle: Puzzle, fen: string, ply: number, attempt: { from: string; to: string; promotion?: string }): MoveVerdict {
  const chess = new Chess(fen);
  let move: Move;
  try {
    move = chess.move({ from: attempt.from, to: attempt.to, promotion: attempt.promotion ?? "q" });
  } catch {
    return { kind: "illegal" };
  }
  const uci = toUci(move);
  const last = ply >= puzzle.moves.length - 1;
  if (chess.isCheckmate()) return { kind: "correct", uci, fen: chess.fen(), done: true };
  if (uci !== puzzle.moves[ply]) return { kind: "wrong", uci };
  return { kind: "correct", uci, fen: chess.fen(), done: last, reply: last ? undefined : puzzle.moves[ply + 1] };
}

/** SAN for each move of the line, for the solution viewer. */
export function lineSan(puzzle: Puzzle): string[] {
  const fens = linePositions(puzzle);
  return puzzle.moves.map((uci, i) => playUci(fens[i], uci)!.move.san);
}
