import type { ClassifiedMove, GameResult, GameSummary } from "@/types/game";
import { getPhaseForPly, type GamePhase } from "@/lib/utils/phase";
import { detectOpening } from "./opening-detection";

export function generateReview(
  moves: ClassifiedMove[],
  result: GameResult,
): GameSummary {
  const analyzed = moves.filter(
    (m) => m.classification && typeof m.cpLoss === "number",
  );
  const phases: Record<GamePhase, ClassifiedMove[]> = {
    opening: [],
    middlegame: [],
    endgame: [],
  };
  for (const move of analyzed) {
    const pieces = (move.fenAfter.split(" ")[0].match(/[prnbqk]/gi) ?? [])
      .length;
    phases[getPhaseForPly(move.ply, pieces)].push(move);
  }
  const mistakes = analyzed
    .filter((m) => (m.cpLoss ?? 0) > 75)
    .sort((a, b) => b.cpLoss! - a.cpLoss!);
  return {
    result,
    openingName: detectOpening(moves.map((m) => m.san)),
    keyMistakes: mistakes
      .slice(0, 3)
      .map((m) => ({
        ply: m.ply,
        san: m.san,
        classification: m.classification!,
        coachText: m.coachText ?? "",
      })),
    recurringWeaknesses: (
      Object.entries(phases) as [GamePhase, ClassifiedMove[]][]
    )
      .filter(([, list]) => list.filter((m) => m.cpLoss! > 75).length >= 2)
      .map(
        ([phase, list]) =>
          `${list.filter((m) => m.cpLoss! > 75).length} evaluation drops in the ${phase}`,
      ),
    // Counts, not fabricated strength percentages. Null means no analyzed evidence.
    phaseStrength: {
      opening: phases.opening.length || null,
      middlegame: phases.middlegame.length || null,
      endgame: phases.endgame.length || null,
    },
    recommendations: mistakes.length
      ? mistakes
          .slice(0, 2)
          .map(
            (m) =>
              `Return to move ${Math.ceil(m.ply / 2)} (${m.san}). Compare ${m.bestSan || "the suggested move"} with your choice; look for checks, captures and threats for both sides.`,
          )
      : [
          analyzed.length
            ? "Replay a position from this game. Name your opponent’s strongest check, capture and threat before choosing your reply."
            : "Play a move or use “Analyze this move” in the replay to collect engine evidence.",
        ],
  };
}
