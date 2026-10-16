/*
 * File: lib/utils/phase.ts
 * Description: Determines the game phase (opening, middlegame, endgame) from simple move-count and material heuristics.
 * Functions:
 * - getPhaseForPly: Returns a phase label for a given ply and board state details.
 */

export type GamePhase = "opening" | "middlegame" | "endgame";

export function getPhaseForPly(ply: number, pieceCount: number): GamePhase {
  // This marks the earliest moves as opening for straightforward phase segmentation.
  if (ply <= 16) return "opening";

  // This marks low-material positions as endgames to drive phase-specific feedback.
  if (pieceCount <= 10) return "endgame";

  // This treats all other positions as middlegame.
  return "middlegame";
}
