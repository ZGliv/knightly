/*
 * File: lib/coach/explainer.ts
 * Description: Generates concise plain-English coaching messages from move quality and evaluation deltas.
 * Functions:
 * - explainPlayerMove: Builds a short coaching tip for the latest move.
 * - explainEnginePlan: Describes the opponent engine's likely strategic intention in plain English.
 * - openingCoachTip: Returns a concise opening-specific coaching principle.
 * - recommendationFromWeakness: Maps weakness tags to drill recommendations.
 */

import type { MoveClassification } from "@/types/game";

interface ExplainInput {
  classification: MoveClassification;
  cpLoss: number;
  bestMoveUci?: string;
  phase: "opening" | "middlegame" | "endgame";
}

interface ExplainEnginePlanInput {
  openingName: string;
  engineMoveSan: string;
  phase: "opening" | "middlegame" | "endgame";
}

export function explainPlayerMove(input: ExplainInput): string {
  // This rounds the loss for clean user-facing text.
  const loss = Math.max(0, Math.round(input.cpLoss));
  const bestMoveHint = input.bestMoveUci
    ? ` A stronger idea was ${input.bestMoveUci}.`
    : "";

  // This provides positive reinforcement for high-quality moves.
  if (input.classification === "best") {
    return `Excellent choice. You matched the strongest plan in this position and kept full control.${bestMoveHint}`;
  }

  // This gives lightweight correction for near-best choices.
  if (input.classification === "good") {
    return `Good practical move. You only gave up a small edge (${loss} centipawns), and your position remains healthy.${bestMoveHint}`;
  }

  // This explains inaccuracies without sounding punishing.
  if (input.classification === "inaccuracy") {
    return `Inaccuracy. The move is playable, but it drifts from the best continuation by about ${loss} centipawns. In the ${input.phase}, improve your least active piece before starting new tactics.${bestMoveHint}`;
  }

  // This highlights strategic impact for mistakes.
  if (input.classification === "mistake") {
    return `Mistake. This costs real equity (${loss} centipawns). Before committing, scan forcing replies in order: checks, captures, then threats.${bestMoveHint}`;
  }

  // This clearly flags blunders and gives a corrective habit.
  return `Blunder. This creates a major swing (${loss} centipawns). Run a 5-second blunder check before moving: "What is my opponent's best tactical shot next?"${bestMoveHint}`;
}

export function explainEnginePlan(input: ExplainEnginePlanInput): string {
  // This gives opening-aware context for the opponent's move intent.
  const openingContext =
    input.openingName === "Unknown Opening"
      ? "The engine is following core opening principles."
      : `In the ${input.openingName}, this fits the standard plan.`;

  // This maps SAN symbols to tactical/strategic intent when possible.
  const isCapture = input.engineMoveSan.includes("x");
  const isCheck = input.engineMoveSan.includes("+") || input.engineMoveSan.includes("#");
  const isCastle = input.engineMoveSan === "O-O" || input.engineMoveSan === "O-O-O";

  // This explains castling as king safety and rook activation.
  if (isCastle) {
    return `${openingContext} ${input.engineMoveSan} prioritizes king safety and activates the rook structure for the next phase.`;
  }

  // This explains checking moves as forcing play.
  if (isCheck) {
    return `${openingContext} ${input.engineMoveSan} is a forcing check that gains tempo and limits your defensive choices.`;
  }

  // This explains captures as tactical simplification or material gain.
  if (isCapture) {
    return `${openingContext} ${input.engineMoveSan} aims to improve the trade structure or remove one of your active defenders.`;
  }

  // This gives phase-specific strategic reads for quieter moves.
  if (input.phase === "opening") {
    return `${openingContext} ${input.engineMoveSan} improves development and central influence before tactical operations begin.`;
  }
  if (input.phase === "middlegame") {
    return `${openingContext} ${input.engineMoveSan} improves piece activity and prepares a concrete follow-up threat next move.`;
  }
  return `${openingContext} ${input.engineMoveSan} is an endgame technique move: better king activity, cleaner pawn structure, or both.`;
}

export function openingCoachTip(openingName: string): string {
  // This maps known openings to plain-English strategic reminders.
  const openingTips: Record<string, string> = {
    "Ruy Lopez":
      "Typical plan: pressure the e5 pawn, develop quickly, and prepare c3-d4 for central space.",
    "Italian Game":
      "Focus on rapid development and king safety, then look for c3-d4 pawn breaks in the center.",
    "Sicilian Defense":
      "Watch for asymmetrical play: prioritize king safety and coordinate pieces before pawn storms.",
    "French Defense":
      "Look for center tension around d4-e5 and avoid locking pieces behind your own pawn chain.",
    "Caro-Kann Defense":
      "Use flexible development and challenge the center without creating long-term pawn weaknesses.",
    "Queen's Gambit":
      "Compete for central control and develop queenside pieces quickly to support c- and d-file play.",
  };

  if (openingName === "Unknown Opening") {
    return "No named opening yet. Follow opening principles: develop pieces, control the center, and castle early.";
  }

  return (
    openingTips[openingName] ??
    "Stay principle-driven: complete development, improve your least active piece, and keep your king safe."
  );
}

export function recommendationFromWeakness(tag: string): string {
  // This maps weakness tags into simple next actions for the review page.
  const recommendations: Record<string, string> = {
    "tactical-oversight":
      "Do 10 daily puzzle reps focused on two-move tactics and hanging-piece detection.",
    "opening-drift":
      "Review one opening line and memorize the first 6-8 move ideas, not just the moves.",
    "endgame-technique":
      "Practice king and pawn endgames: opposition, key squares, and conversion basics.",
    "time-pressure":
      "Use a 10-second blunder check routine before each move in critical positions.",
  };

  return (
    recommendations[tag] ??
    "Play one focused training game and annotate three moments where your plan changed."
  );
}
