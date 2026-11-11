import { practiceLines } from "./follow-through";
import { SEQUENCES, practicePositions, type PracticeStage } from "./sequences";
import { isPlayerPly } from "@/lib/chess/player";
import type { SavedGame } from "@/types/game";
import { getPhaseForPly, type GamePhase } from "@/lib/utils/phase";
import { LESSONS, PHASES } from "./curriculum";

export const PRACTICE_KEY = "buddymine_practice_v1";
export type Outcome = "independent" | "supported" | "not-yet";
export interface Attempt {
  id: string;
  lessonId: string;
  stage?: PracticeStage;
  positionId?: string;
  lineId?: string;
  movesCompleted?: number;
  movesRequired?: number;
  sourceGameId?: string;
  playerColor?: "white" | "black";
  at: string;
  hints: number;
  misses: number;
  outcome: Outcome;
}
export function parseAttempts(raw: string | null): Attempt[] {
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !Array.isArray(data.attempts) || data.attempts.length > 500)
    throw new Error("Practice history could not be read. It has not been overwritten.");
  for (const a of data.attempts) {
    if (!a || typeof a.id !== "string" || !LESSONS.some((l) => l.id === a.lessonId) ||
      (a.sourceGameId !== undefined && (typeof a.sourceGameId !== "string" || a.sourceGameId.length > 200)) ||
      (a.positionId !== undefined && (typeof a.positionId !== "string" ||
        (a.stage === "transfer" ? !practicePositions(SEQUENCES.find(l => l.id === a.lessonId)!).some(p => p.positionId === a.positionId) : a.positionId !== "guided"))) ||
      (a.stage !== undefined && !["guided", "transfer"].includes(a.stage)) ||
      (a.stage === "transfer" && !SEQUENCES.some((lesson) => lesson.id === a.lessonId)) ||
      (a.playerColor !== undefined && !["white", "black"].includes(a.playerColor)) ||
      (a.lineId !== undefined && (!["guided", "transfer"].includes(a.stage) || a.movesRequired === undefined ||
        !practiceLines({ ...LESSONS.find(l => l.id === a.lessonId)!,
          ...(a.stage === "transfer" ? practicePositions(SEQUENCES.find(l => l.id === a.lessonId)!).find(p => p.positionId === (a.positionId ?? "transfer-1")) : {}),
        }).some(line => line.id === a.lineId && line.followThrough.length + 1 === a.movesRequired))) ||
      ((a.movesRequired !== undefined || a.movesCompleted !== undefined) &&
        (!Number.isInteger(a.movesRequired) || a.movesRequired < 2 || a.movesRequired > 32 ||
         !Number.isInteger(a.movesCompleted) || a.movesCompleted < 0 || a.movesCompleted > a.movesRequired ||
         (a.outcome !== "not-yet" && a.movesCompleted !== a.movesRequired))) ||
      typeof a.at !== "string" || !Number.isFinite(Date.parse(a.at)) ||
      !Number.isInteger(a.hints) || a.hints < 0 || a.hints > 3 ||
      !Number.isInteger(a.misses) || a.misses < 0 ||
      !["independent", "supported", "not-yet"].includes(a.outcome) ||
      (a.outcome === "independent" && (a.hints || a.misses)))
      throw new Error("Practice history could not be read. It has not been overwritten.");
  }
  return data.attempts;
}
export function readAttempts() { return parseAttempts(localStorage.getItem(PRACTICE_KEY)); }
export function saveAttempt(attempt: Attempt) {
  // Read before writing so another tab's completed practice is retained.
  const prior = readAttempts();
  const attempts = [...prior.filter((a) => a.id !== attempt.id), attempt].slice(-500);
  localStorage.setItem(PRACTICE_KEY, JSON.stringify({ version: 1, attempts }));
  return attempts;
}
export function phaseAttempts(attempts: Attempt[], phase: GamePhase) {
  const ids = new Set(LESSONS.filter((l) => l.phase === phase).map((l) => l.id));
  return attempts.filter((a) => ids.has(a.lessonId));
}
export function nextLesson(attempts: Attempt[], phase: GamePhase, avoidId?: string, now = Date.now()) {
  const recent = phaseAttempts(attempts, phase).filter((a) => now - Date.parse(a.at) < 14 * 86400000).slice(-5);
  // A deliberately modest curriculum heuristic, not an ability or Elo estimate.
  const independent = new Set(recent.filter((a) => a.outcome === "independent").map((a) => a.lessonId));
  const level = independent.size >= 2 && recent.at(-1)?.outcome === "independent" ? 2 : 1;
  const pool = LESSONS.filter((l) => l.phase === phase && l.level <= level && l.id !== avoidId);
  const lastSeen = (id: string) => attempts.findLastIndex((a) => a.lessonId === id);
  const lesson = [...pool].sort((a, b) => lastSeen(a.id) - lastSeen(b.id) || b.level - a.level)[0];
  const reason = !recent.length
    ? "Start with a foundation position so we can observe how much help you need."
    : level === 2
      ? "You solved two different recent positions independently. Try a further step, or revisit the least recent idea."
      : recent.at(-1)?.outcome === "not-yet"
        ? "The last idea needed a walkthrough or was set aside. Let’s reinforce a foundation with a different position."
        : "Build confidence on a different foundation. Two distinct independent solves within 14 days suggest the next step.";
  return { lesson, reason, level };
}
export function gameFocus(games: SavedGame[]) {
  const counts: Record<GamePhase, { analyzed: number; drops: number }> = {
    opening: { analyzed: 0, drops: 0 }, middlegame: { analyzed: 0, drops: 0 }, endgame: { analyzed: 0, drops: 0 },
  };
  for (const game of [...games].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)).slice(0, 10)) {
    for (const move of game.moves) {
      if (!isPlayerPly(move.ply, game.playerColor) || !Number.isFinite(move.cpLoss) || !move.classification) continue;
      const pieces = (move.fenAfter.split(" ")[0].match(/[prnbqk]/gi) ?? []).length;
      const phase = getPhaseForPly(move.ply, pieces);
      counts[phase].analyzed++;
      if (move.cpLoss! > 75) counts[phase].drops++;
    }
  }
  const observed = PHASES.filter((phase) => counts[phase].analyzed >= 3);
  const phase = observed.sort((a, b) => counts[b].drops / counts[b].analyzed - counts[a].drops / counts[a].analyzed)[0] ?? "opening";
  const evidence = counts[phase];
  return {
    phase, counts,
    reason: evidence.analyzed >= 3
      ? `${evidence.drops} of ${evidence.analyzed} analyzed player moves in the ${phase} lost more than 0.75 pawns of engine evaluation across your last 10 saved games. This suggests a practice area, not a diagnosis of the underlying mistake.`
      : "There are fewer than three analyzed player moves per phase. Start with openings, or choose any phase below.",
  };
}
export const PHASE_PROMPTS: Record<GamePhase, string> = {
  opening: "Which move develops a piece, helps control the center or gets your king safe?",
  middlegame: "What checks, captures and threats are available to both sides?",
  endgame: "Can your king help a pawn advance, or cut off the opposing king’s escape?",
};
