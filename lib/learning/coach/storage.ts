import { playerTurn } from "@/lib/chess/player";
import { Chess } from "chess.js";
import { applyUci, CONTEXT_LABELS, decisionBoard, emptyCoach, type CoachData, type DecisionAnalysis, type Evaluation, type RetryAttempt } from "./model";
export const COACH_KEY = "buddymine_game_coach_v1";
const validEval = (e: Evaluation | null) => !!e && (e.kind === "cp" ? Number.isFinite(e.value) : e.kind === "mate" && ["white", "black"].includes(e.winner) && Number.isInteger(e.moves) && e.moves >= 0);
const validDate = (v: string) => typeof v === "string" && Number.isFinite(Date.parse(v));
function invalid(): never { throw new Error("Your game-coach history could not be read. It has not been overwritten. New practice can continue in this session."); }
export function parseCoach(raw: string | null): CoachData {
  if (!raw) return emptyCoach();
  try {
    const data = JSON.parse(raw) as CoachData;
    if (data.version !== 1 || !Array.isArray(data.analyses) || data.analyses.length > 200 || !Array.isArray(data.attempts) || data.attempts.length > 500) return invalid();
    for (const a of data.analyses) {
      if (a?.source) { a.source.playerColor ??= "white"; if (!["white", "black"].includes(a.source.playerColor)) return invalid(); }
      if (!a || !a.source || !validDate(a.at) || !validDate(a.source.date) || !Array.isArray(a.source.prefix) || a.source.prefix.length > 4000 || !Number.isInteger(a.source.ply) || a.source.ply !== a.source.prefix.length + 1 || a.source.id !== `${a.source.gameId}:${a.source.ply}` || !validEval(a.before) || !validEval(a.after) || !(a.context in CONTEXT_LABELS) || typeof a.teachable !== "boolean" || !Number.isFinite(a.depth) || (a.drop !== null && (!Number.isFinite(a.drop) || a.drop < 0))) return invalid();
      const chess = decisionBoard(a.source); const played = applyUci(chess, a.source.playedUci);
      if (played.san !== a.source.playedSan || chess.fen() !== a.source.fenAfter) return invalid();
      if (applyUci(decisionBoard(a.source), a.bestUci).san !== a.bestSan) return invalid();
      for (const line of [a.bestLine, a.playedLine]) if (!Array.isArray(line) || line.length > 6 || line.some((s) => typeof s !== "string" || s.length > 12)) return invalid();
    }
    for (const a of data.attempts) {
      if (a) { a.playerColor ??= "white"; if (!["white", "black"].includes(a.playerColor)) return invalid(); }
      if (!a || typeof a.id !== "string" || typeof a.decisionId !== "string" || a.decisionId !== `${a.gameId}:${a.ply}` || !validDate(a.at) || !["independent", "supported", "not-yet"].includes(a.outcome) || !Number.isInteger(a.hints) || a.hints < 0 || a.hints > 3 || !Number.isInteger(a.misses) || a.misses < 0 || (a.outcome === "independent" && (a.hints || a.misses)) || (a.loss !== null && (!Number.isFinite(a.loss) || a.loss < 0)) || (a.evaluation !== null && !validEval(a.evaluation))) return invalid();
      const chess = new Chess(a.fenBefore); if (chess.turn() !== playerTurn(a.playerColor)) return invalid(); applyUci(chess, a.playedUci);
      if (a.triedUci && applyUci(new Chess(a.fenBefore), a.triedUci).san !== a.triedSan) return invalid();
    }
    return data;
  } catch { return invalid(); }
}
export function readCoach() { return parseCoach(localStorage.getItem(COACH_KEY)); }
export function saveAnalysis(analysis: DecisionAnalysis) {
  const data = readCoach();
  data.analyses = [...data.analyses.filter((a) => a.source.id !== analysis.source.id), analysis].slice(-200);
  localStorage.setItem(COACH_KEY, JSON.stringify(data)); return data;
}
export function saveRetry(attempt: RetryAttempt) {
  const data = readCoach();
  data.attempts = [...data.attempts.filter((a) => a.id !== attempt.id), attempt].slice(-500);
  localStorage.setItem(COACH_KEY, JSON.stringify(data)); return data;
}
