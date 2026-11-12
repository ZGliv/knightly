import type { GamePhase } from "@/lib/utils/phase";

/**
 * Game phase for "Your leaks", from the pieces on the board rather than kings and pawns.
 * mm = knights, bishops, rooks and queens of both sides.
 * mm <= 6 is an endgame; otherwise the first 20 plies with mm > 10 are the opening; the rest is middlegame.
 */
export function phaseForPosition(ply: number, fen: string): GamePhase {
  const placement = fen.trim().split(/\s+/)[0] ?? "";
  let majorsAndMinors = 0;
  for (const char of placement) if ("nbrqNBRQ".includes(char)) majorsAndMinors++;
  if (majorsAndMinors <= 6) return "endgame";
  if (ply <= 20 && majorsAndMinors > 10) return "opening";
  return "middlegame";
}
