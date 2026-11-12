import { Chess } from "chess.js";

export interface Replay {
  sans: string[];
  ucis: string[];
  /** fens[i] is the position after i plies, so the length is plies + 1. */
  fens: string[];
}

/** Replays a single standard-chess PGN once. Throws when the PGN is illegal or has no moves. */
export function replayGame(pgn: string): Replay {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({ verbose: true });
  if (!history.length) throw new Error("This game has no moves.");
  return {
    sans: history.map((move) => move.san),
    ucis: history.map((move) => move.from + move.to + (move.promotion ?? "")),
    fens: [history[0].before, ...history.map((move) => move.after)],
  };
}

const CLOCK = /\[%clk\s+(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)\]/g;

/**
 * Seconds left on the mover's clock after each ply, read from `[%clk H:MM:SS]` comments in move order.
 * Returns nulls when the PGN does not carry exactly one clock per ply.
 */
export function parseClocks(pgn: string, plyCount: number): (number | null)[] {
  const movetext = pgn.slice(pgn.lastIndexOf("]\n\n") + 1);
  const clocks = [...movetext.matchAll(CLOCK)].map(
    (match) => Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]),
  );
  if (clocks.length !== plyCount) return Array.from({ length: plyCount }, () => null);
  return clocks;
}
