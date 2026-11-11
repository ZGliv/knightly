import { Chess } from "chess.js";
import { SEQUENCES } from "./sequences";
import type { GamePhase } from "@/lib/utils/phase";

export const PHASES: GamePhase[] = ["opening", "middlegame", "endgame"];
export const PHASE_LABELS = {
  opening: "Openings",
  middlegame: "Middlegames",
  endgame: "Endgames",
};
export interface FollowThroughStep {
  reply: string;
  answers: string[];
  goal: string;
  hints: [string, string];
}
export interface PracticeLine {
  id: string;
  followThrough: FollowThroughStep[];
  explanation: string;
}
export interface Lesson {
  id: string;
  phase: GamePhase;
  level: 1 | 2;
  title: string;
  goal: string;
  fen: string;
  answers: string[];
  hints: [string, string];
  explanation: string;
  transfer: string;
  checkmate?: boolean;
  followThrough?: FollowThroughStep[];
  replyVariants?: PracticeLine[];
}
export const LESSONS: Lesson[] = SEQUENCES;

export function solvesLesson(
  lesson: Lesson,
  from: string,
  to: string,
  promotion = "q",
) {
  const chess = new Chess(lesson.fen);
  try {
    const move = chess.move({ from, to, promotion });
    return {
      legal: true,
      correct: lesson.checkmate
        ? chess.isCheckmate()
        : lesson.answers.includes(move.san),
      fen: chess.fen(),
      san: move.san,
    };
  } catch {
    return { legal: false, correct: false, fen: lesson.fen, san: "" };
  }
}
