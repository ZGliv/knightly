import { Chess } from "chess.js";
import type { ClassifiedMove } from "@/types/game";
import type { EngineAnalysis } from "@/lib/engine/stockfish-client";
import { classifyMove } from "./classification";
export type Analyze = (fen: string, skill?: number) => Promise<EngineAnalysis>;
export async function analyzeMove(
  beforeFen: string,
  move: ClassifiedMove,
  analyze: Analyze,
): Promise<ClassifiedMove> {
  const before = await analyze(beforeFen, 20);
  const afterChess = new Chess(move.fenAfter);
  const after = afterChess.isGameOver()
    ? {
        scoreCp: afterChess.isDraw() ? 0 : null,
        mateIn: afterChess.isCheckmate() ? 0 : null,
        depth: 0,
        bestMove: "",
        pv: [],
      }
    : await analyze(move.fenAfter, 20);
  const best = new Chess(beforeFen);
  let bestSan = "";
  try {
    bestSan =
      best.move({
        from: before.bestMove.slice(0, 2),
        to: before.bestMove.slice(2, 4),
        promotion: before.bestMove[4],
      })?.san ?? "";
  } catch {
    /* A terminal search has no move. */
  }
  if (before.scoreCp === null || after.scoreCp === null) {
    const text = afterChess.isCheckmate()
      ? `${move.san} delivers checkmate.`
      : after.mateIn !== null
        ? `${move.san}: Stockfish found a forced mate ${after.mateIn > 0 ? "for your opponent" : "in your favor"} in ${Math.abs(after.mateIn)} moves at its search horizon. Replay the position and check forcing replies.`
        : `${move.san}: a mating line was found before this move. Compare the suggested ${bestSan || "continuation"} in the replay. No centipawn grade is assigned to mate scores.`;
    return {
      ...move,
      bestSan,
      mateIn: after.mateIn,
      searchDepth: Math.min(before.depth, after.depth),
      coachText: text,
    };
  }
  // Both UCI scores are relative to the side to move. After the move, that side is the opponent.
  const cpLoss = Math.max(0, before.scoreCp + after.scoreCp);
  const classification = classifyMove(cpLoss);
  const label = classification === "best" ? "Near best" : classification;
  return {
    ...move,
    evalCp: -after.scoreCp,
    cpLoss,
    classification,
    bestSan,
    searchDepth: Math.min(before.depth, after.depth),
    coachText: `${move.san}: ${label}. The short search estimates a ${(cpLoss / 100).toFixed(2)} pawn evaluation drop. ${bestSan === move.san ? "Stockfish also preferred this move." : `Stockfish preferred ${bestSan || "a different move"}.`} Compare checks, captures and threats in the replay. This is a limited-search estimate, not an accuracy rating.`,
  };
}
