import type { PlayerColor } from "@/types/game";
import type { Evaluation } from "@/lib/learning/coach/model";
import { severityForDrop, winPercent } from "@/lib/insights/winprob";

/** Fixed search budget, so the verdict is the same on every device. */
export const CHECK_NODES = 150_000;

export type CheckVerdict = "fine" | "inaccuracy" | "mistake" | "blunder";

export interface MoveCheck {
  /** The player's winning chances (0-100) before the move, with the engine's best play. */
  before: number;
  /** The player's winning chances after their move. */
  after: number;
  /** Points of winning chances the move gives away (never negative). */
  drop: number;
  verdict: CheckVerdict;
}

/** Compares the positions before and after the player's move, both scored from White's side. */
export function checkMove(before: Evaluation, after: Evaluation, color: PlayerColor): MoveCheck {
  const b = winPercent(before, color);
  const a = winPercent(after, color);
  const drop = Math.max(0, b - a);
  return { before: b, after: a, drop, verdict: severityForDrop(drop) ?? "fine" };
}

/** One plain sentence for the verdict. */
export function verdictText(check: MoveCheck, san: string, bestSan: string | null, habitual: boolean): string {
  const lost = Math.round(check.drop);
  const who = habitual ? `${san}, the move you usually play here,` : san;
  const better = bestSan && bestSan !== san ? ` The engine prefers ${bestSan}.` : "";
  switch (check.verdict) {
    case "blunder":
      return `${who} is a serious mistake: it gives away ${lost} points of winning chances.${better}`;
    case "mistake":
      return `${who} is a mistake: it gives away ${lost} points of winning chances.${better}`;
    case "inaccuracy":
      return `${who} is playable but slightly inaccurate (${lost} points of winning chances).${better}`;
    default:
      return bestSan === san
        ? `${san} is the engine's own choice here.`
        : `${san} is fine: it keeps your winning chances within ${Math.max(lost, 1)} point${lost > 1 ? "s" : ""} of the engine's best.${better}`;
  }
}
