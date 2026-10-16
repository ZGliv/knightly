/*
 * File: lib/chess/review-generator.ts
 * Description: Builds post-game summaries from classified moves, opening detection, and phase-level performance.
 * Functions:
 * - buildGameSummary: Produces a complete review payload for the review screen and persistence.
 */

import { recommendationFromWeakness } from "@/lib/coach/explainer";
import { getPhaseForPly } from "@/lib/utils/phase";
import type {
  ClassifiedMove,
  GameResult,
  GameSummary,
  MoveClassification,
} from "@/types/game";

function scoreClassification(classification: MoveClassification | undefined): number {
  if (!classification) return 0;
  if (classification === "best") return 3;
  if (classification === "good") return 2;
  if (classification === "inaccuracy") return 1;
  if (classification === "mistake") return -1;
  return -2;
}

export function buildGameSummary(params: {
  result: GameResult;
  openingName: string;
  moves: ClassifiedMove[];
}): GameSummary {
  const weaknessCount: Record<string, number> = {
    "tactical-oversight": 0,
    "opening-drift": 0,
    "endgame-technique": 0,
    "time-pressure": 0,
  };

  const phaseScores = {
    opening: 0,
    middlegame: 0,
    endgame: 0,
  };
  const phaseMoveCounts = {
    opening: 0,
    middlegame: 0,
    endgame: 0,
  };

  // This captures only materially important mistakes for a focused review list.
  const keyMistakes = params.moves
    .filter(
      (move) =>
        move.classification === "mistake" || move.classification === "blunder",
    )
    .slice(-5)
    .reverse()
    .slice(0, 3)
    .map((move) => ({
      ply: move.ply,
      san: move.san,
      classification: move.classification ?? "mistake",
      coachText: move.coachText ?? "Review this position to find a safer plan.",
    }));

  for (const move of params.moves) {
    // This derives game phase from ply and rough board complexity signal.
    const pieceCount = move.fenAfter
      .split("")
      .filter((char) => /[prnbqkPRNBQK]/.test(char)).length;
    const phase = getPhaseForPly(move.ply, pieceCount);

    phaseScores[phase] += scoreClassification(move.classification);
    phaseMoveCounts[phase] += 1;

    // This tags recurring weaknesses using simple, explainable heuristics.
    if (phase === "opening" && move.classification === "inaccuracy") {
      weaknessCount["opening-drift"] += 1;
    }
    if (phase === "endgame" && move.classification === "mistake") {
      weaknessCount["endgame-technique"] += 1;
    }
    if (move.classification === "blunder") {
      weaknessCount["tactical-oversight"] += 1;
    }
  }

  const recurringWeaknesses = Object.entries(weaknessCount)
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, 3);

  // This converts phase totals into compact 0-100 strength values.
  const phaseStrength = {
    opening: Math.max(
      20,
      Math.min(
        95,
        Math.round(
          ((phaseScores.opening / Math.max(1, phaseMoveCounts.opening)) * 15) +
            55,
        ),
      ),
    ),
    middlegame: Math.max(
      20,
      Math.min(
        95,
        Math.round(
          ((phaseScores.middlegame / Math.max(1, phaseMoveCounts.middlegame)) *
            15) +
            55,
        ),
      ),
    ),
    endgame: Math.max(
      20,
      Math.min(
        95,
        Math.round(
          ((phaseScores.endgame / Math.max(1, phaseMoveCounts.endgame)) * 15) +
            55,
        ),
      ),
    ),
  };

  const recommendations =
    recurringWeaknesses.length > 0
      ? recurringWeaknesses.map((tag) => recommendationFromWeakness(tag))
      : [
          "Keep playing slow games and review one critical moment after each game.",
        ];

  return {
    result: params.result,
    openingName: params.openingName,
    keyMistakes,
    recurringWeaknesses,
    phaseStrength,
    recommendations,
  };
}
