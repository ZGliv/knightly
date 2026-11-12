import type { PlayerColor } from "@/types/game";
import type { Evaluation } from "@/lib/learning/coach/model";
import { BLUNDER_DROP, INACCURACY_DROP, MISTAKE_DROP, type Severity } from "./types";

/** Centipawn scores beyond this are treated as equally decisive. */
const CP_CLAMP = 1000;
const SLOPE = 0.00368208;

/**
 * Chance of winning (0-100) for `color`, from a White-relative evaluation.
 * A forced mate (or a checkmate already on the board) is exactly 100 for the
 * side delivering it and exactly 0 for the other side.
 */
export function winPercent(evaluation: Evaluation, color: PlayerColor): number {
  if (evaluation.kind === "mate") return evaluation.winner === color ? 100 : 0;
  const cp = Math.max(-CP_CLAMP, Math.min(CP_CLAMP, evaluation.value));
  const white = 50 + 50 * (2 / (1 + Math.exp(-SLOPE * cp)) - 1);
  return color === "white" ? white : 100 - white;
}

/** Size of a single move's mistake, from the win-percentage points it gave away. */
export function severityForDrop(drop: number): Severity | null {
  if (drop >= BLUNDER_DROP) return "blunder";
  if (drop >= MISTAKE_DROP) return "mistake";
  if (drop >= INACCURACY_DROP) return "inaccuracy";
  return null;
}
