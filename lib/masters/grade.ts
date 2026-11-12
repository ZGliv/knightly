import { Chess } from "chess.js";

/** How a guess compared with the pro's move. "shown" means the user asked to see the move. */
export type Verdict = "matched" | "as-good" | "playable" | "worse" | "shown";

/** Win-chance points (0-100 scale) a guess may lose against the game move and still count. */
export const AS_GOOD_WITHIN = 3;
export const PLAYABLE_WITHIN = 8;
/** Fixed engine budget for both sides of a comparison, so a result is the same on every device. */
export const COMPARE_NODES = 150_000;

export const POINTS: Record<Verdict, number> = {
  matched: 3,
  "as-good": 2,
  playable: 1,
  worse: 0,
  shown: 0,
};
export const MAX_POINTS_PER_MOVE = POINTS.matched;

export const VERDICT_TEXT: Record<Verdict, string> = {
  matched: "You found the pro's move",
  "as-good": "As good as the game move",
  playable: "Playable",
  worse: "The game move was clearly better",
  shown: "Move shown",
};

/**
 * Grades a different move by the pro's winning chances after each move (both from the pro's side).
 * A guess the engine likes more than the game move counts as "as good".
 */
export function verdictForGap(proWin: number, guessWin: number): "as-good" | "playable" | "worse" {
  const gap = proWin - guessWin;
  if (gap <= AS_GOOD_WITHIN) return "as-good";
  if (gap <= PLAYABLE_WITHIN) return "playable";
  return "worse";
}

export interface Tally {
  matched: number;
  asGood: number;
  playable: number;
  worse: number;
  shown: number;
}

export const emptyTally = (): Tally => ({ matched: 0, asGood: 0, playable: 0, worse: 0, shown: 0 });

export function tally(verdicts: Verdict[]): Tally {
  const out = emptyTally();
  for (const v of verdicts) {
    if (v === "matched") out.matched++;
    else if (v === "as-good") out.asGood++;
    else if (v === "playable") out.playable++;
    else if (v === "worse") out.worse++;
    else out.shown++;
  }
  return out;
}

export const scoreOf = (verdicts: Verdict[]) => verdicts.reduce((sum, v) => sum + POINTS[v], 0);

/** "e2e4" style for a move made on `chess`. */
export const toUci = (move: { from: string; to: string; promotion?: string }) =>
  move.from + move.to + (move.promotion ?? "");

/** Converts an engine line (UCI) to SAN from `fen`, stopping at the first move that does not fit. */
export function uciLineToSan(fen: string, uci: string[], limit = 8): string[] {
  const chess = new Chess(fen);
  const out: string[] = [];
  for (const move of uci.slice(0, limit)) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) break;
    try {
      const made = chess.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
      out.push(made.san);
    } catch {
      break;
    }
  }
  return out;
}

/** "23. Nf5 Qd7 24. Rae1" style text for a SAN line starting at `fen`. */
export function formatLine(fen: string, san: string[]): string {
  const chess = new Chess(fen);
  let moveNumber = chess.moveNumber();
  let white = chess.turn() === "w";
  const parts: string[] = [];
  san.forEach((move, i) => {
    if (white) parts.push(`${moveNumber}. ${move}`);
    else parts.push(i === 0 ? `${moveNumber}... ${move}` : move);
    if (!white) moveNumber++;
    white = !white;
  });
  return parts.join(" ");
}
