/*
 * File: lib/chess/classification.ts
 * Description: Classifies a move based on the centipawn loss versus the best available move.
 * Functions:
 * - classifyMove: Converts a centipawn loss value into a user-facing move quality label.
 */

import type { MoveClassification } from "@/types/game";

export function classifyMove(cpLoss: number): MoveClassification {
  // This clamps impossible negative loss values to zero so thresholds stay consistent.
  const normalizedLoss = Math.max(0, Math.round(cpLoss));

  // This maps centipawn loss into simple coaching buckets for MVP clarity.
  if (normalizedLoss <= 25) return "best";
  if (normalizedLoss <= 75) return "good";
  if (normalizedLoss <= 150) return "inaccuracy";
  if (normalizedLoss <= 300) return "mistake";
  return "blunder";
}
