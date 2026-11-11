import { revisitSchedule } from "../schedule";
import { Chess, type Move } from "chess.js";
import type { SavedGame, PlayerColor } from "@/types/game";
import { colorName, opponentColor, playerTurn } from "@/lib/chess/player";
import type { Analyze } from "@/lib/chess/analyze-move";
import type { EngineAnalysis } from "@/lib/engine/stockfish-client";

export interface Decision {
  id: string; gameId: string; playerColor: PlayerColor; ply: number; date: string; opening: string;
  fenBefore: string; fenAfter: string; playedSan: string; playedUci: string; prefix: string[];
}
export type Evaluation = { kind: "cp"; value: number } | { kind: "mate"; winner: "white" | "black"; moves: number };
export type Context = "defending-check" | "capture" | "forcing-check" | "quiet-choice";
export const CONTEXT_LABELS: Record<Context, string> = {
  "defending-check": "Responding to check", capture: "Capture opportunities", "forcing-check": "Forcing checks", "quiet-choice": "Other move choices",
};
export interface DecisionAnalysis {
  source: Decision; at: string; before: Evaluation; after: Evaluation;
  bestUci: string; bestSan: string; bestLine: string[]; playedLine: string[];
  depth: number; drop: number | null; teachable: boolean; context: Context;
}
export interface RetryAttempt {
  id: string; decisionId: string; gameId: string; playerColor: PlayerColor; ply: number; fenBefore: string; playedUci: string;
  at: string; triedSan: string; triedUci: string; hints: number; misses: number;
  outcome: "independent" | "supported" | "not-yet";
  loss: number | null; evaluation: Evaluation | null;
}
export interface CoachData { version: 1; analyses: DecisionAnalysis[]; attempts: RetryAttempt[]; }
export const emptyCoach = (): CoachData => ({ version: 1, analyses: [], attempts: [] });
export const uci = (m: Move) => m.from + m.to + (m.promotion ?? "");
export function applyUci(chess: Chess, value: string) {
  return chess.move({ from: value.slice(0, 2), to: value.slice(2, 4), promotion: value[4] });
}
export function decisionBoard(source: Decision) {
  const chess = new Chess(); source.prefix.forEach((move) => applyUci(chess, move));
  if (chess.fen() !== source.fenBefore || chess.turn() !== playerTurn(source.playerColor)) throw new Error("The source position no longer matches its legal history.");
  return chess;
}
export function decisionsFromGames(games: SavedGame[]): Decision[] {
  const result: Decision[] = [];
  const recent = [...games].sort((a,b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)).slice(0, 10);
  for (const game of recent) {
    if (result.length >= 200) break;
    const chess = new Chess(); chess.loadPgn(game.pgn);
    const history = chess.history({ verbose: true });
    for (let index = history.length - 1; index >= 0 && result.length < 200; index--) {
      const move = history[index];
      if (move.color !== playerTurn(game.playerColor)) continue;
      result.push({ id: `${game.id}:${index + 1}`, gameId: game.id, playerColor: game.playerColor, ply: index + 1, date: game.createdAt, opening: game.openingName,
        fenBefore: move.before, fenAfter: move.after, playedSan: move.san, playedUci: uci(move), prefix: history.slice(0, index).map(uci) });
    }
  }
  return result;
}
export function sameDecision(a: Decision, b: Decision) {
  return a.id === b.id && a.playerColor === b.playerColor && a.fenBefore === b.fenBefore && a.playedUci === b.playedUci && a.prefix.join(" ") === b.prefix.join(" ");
}
export function whiteEvaluation(chess: Chess, analysis?: EngineAnalysis): Evaluation {
  if (chess.isCheckmate()) return { kind: "mate", winner: chess.turn() === "b" ? "white" : "black", moves: 0 };
  if (chess.isDraw()) return { kind: "cp", value: 0 };
  if (!analysis) throw new Error("No engine evidence was returned for this position.");
  const sign = chess.turn() === "w" ? 1 : -1;
  if (analysis.mateIn !== null) return { kind: "mate", winner: analysis.mateIn * sign > 0 ? "white" : "black", moves: Math.abs(analysis.mateIn) };
  if (!Number.isFinite(analysis.scoreCp)) throw new Error("The engine returned no usable evaluation. Please retry.");
  return { kind: "cp", value: analysis.scoreCp! * sign };
}
export function evaluateChoice(before: Evaluation, after: Evaluation, playerColor: PlayerColor = "white") {
  if (before.kind === "mate" && before.winner !== playerColor) return { accepted: false, uncertain: true, loss: null, teachable: false };
  if (after.kind === "mate" && after.winner === playerColor) return { accepted: true, uncertain: false, loss: null, teachable: false };
  if (before.kind === "mate" || after.kind === "mate") return { accepted: false, uncertain: false, loss: null, teachable: true };
  const loss = Math.max(0, (before.value - after.value) * (playerColor === "white" ? 1 : -1));
  return { accepted: loss <= 50, uncertain: false, loss, teachable: loss >= 100 };
}
export function evaluationLabel(value: Evaluation, playerColor: PlayerColor = "white") {
  if (value.kind === "mate") return value.moves === 0 ? `${value.winner === "white" ? "White" : "Black"} checkmates` : `mate in ${value.moves} for ${value.winner === "white" ? "White" : "Black"}`;
  const relative = value.value * (playerColor === "white" ? 1 : -1);
  return `${relative >= 0 ? "+" : ""}${(relative / 100).toFixed(2)} for you (${colorName(playerColor)})`;
}
export function legalLine(fen: string, moves: string[], limit = 6) {
  const chess = new Chess(fen); const line: string[] = [];
  for (const value of moves.slice(0, limit)) { try { line.push(applyUci(chess, value).san); } catch { break; } }
  return line;
}
function moveContext(chess: Chess, best: Move): Context {
  if (chess.isCheck()) return "defending-check";
  if (best.captured) return "capture";
  if (/[+#]/.test(best.san)) return "forcing-check";
  return "quiet-choice";
}
export async function inspectDecision(source: Decision, analyze: Analyze, stillActive: () => boolean = () => true): Promise<DecisionAnalysis> {
  const beforeBoard = decisionBoard(source);
  const beforeSearch = await analyze(beforeBoard.fen(), 20, source.prefix);
  if (!stillActive()) throw new Error("Analysis cancelled.");
  const bestBoard = decisionBoard(source); const best = applyUci(bestBoard, beforeSearch.bestMove);
  const afterBoard = decisionBoard(source); applyUci(afterBoard, source.playedUci);
  const afterSearch = afterBoard.isGameOver() ? undefined : await analyze(afterBoard.fen(), 20, [...source.prefix, source.playedUci]);
  if (!stillActive()) throw new Error("Analysis cancelled.");
  const before = whiteEvaluation(beforeBoard, beforeSearch); const after = whiteEvaluation(afterBoard, afterSearch);
  const choice = evaluateChoice(before, after, source.playerColor);
  return { source, at: new Date().toISOString(), before, after, bestUci: beforeSearch.bestMove, bestSan: best.san,
    bestLine: legalLine(source.fenBefore, beforeSearch.pv.length ? beforeSearch.pv : [beforeSearch.bestMove]),
    playedLine: legalLine(source.fenAfter, afterSearch?.pv ?? []),
    depth: Math.min(beforeSearch.depth, afterSearch?.depth ?? beforeSearch.depth), drop: choice.loss, teachable: choice.teachable && source.playedUci !== beforeSearch.bestMove, context: moveContext(beforeBoard, best),
  };
}
export async function inspectRetry(analysis: DecisionAnalysis, moveUci: string, analyze: Analyze) {
  const chess = decisionBoard(analysis.source); const move = applyUci(chess, moveUci);
  const search = chess.isGameOver() ? undefined : await analyze(chess.fen(), 20, [...analysis.source.prefix, moveUci]);
  const evaluation = whiteEvaluation(chess, search);
  const choice = evaluateChoice(analysis.before, evaluation, analysis.source.playerColor);
  const referenceMatch = moveUci === analysis.bestUci;
  const ordinaryScores = analysis.before.kind === "cp" && evaluation.kind === "cp";
  // A fresh child search can disagree with the parent's PV. Do not penalize the
  // engine's own preferred move for finite-score horizon noise. Mate conflicts
  // remain uncertain and cannot create a fabricated success.
  if (referenceMatch && !choice.accepted) {
    if (ordinaryScores) choice.accepted = true;
    else choice.uncertain = true;
  }
  return { ...choice, referenceMatch, evaluation, fen: chess.fen(), san: move.san, line: legalLine(chess.fen(), search?.pv ?? []), depth: search?.depth ?? 0 };
}
export function retryHint(analysis: DecisionAnalysis, strength: number) {
  const chess = decisionBoard(analysis.source); const best = applyUci(chess, analysis.bestUci);
  const names = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  if (strength >= 2) return `Consider your ${names[best.piece]} on ${best.from}. Check what it can do on ${best.to}${best.promotion ? `, promoting to ${names[best.promotion]}` : ""}.`;
  if (analysis.context === "defending-check") return "Your king is in check. Compare captures, blocks and king moves before deciding.";
  if (best.captured) return `There is a capture to investigate. Which of your pieces can take ${colorName(opponentColor(analysis.source.playerColor))}’s ${names[best.captured]}?`;
  if (/[+#]/.test(best.san)) return "A forcing check is worth examining. After each candidate check, look for the opponent’s best reply.";
  return `Try improving the position of a ${names[best.piece]}. Check the opponent’s forcing replies before moving it.`;
}

export const positionKey = (fen: string) => fen.split(" ").slice(0, 4).join(" ");

export function recommendDecisions(analyses: DecisionAnalysis[], attempts: RetryAttempt[], now = Date.now(), avoid?: string) {
  const seen = new Set<string>();
  const candidates = analyses.filter((a) => a.teachable).sort((a, b) => b.source.date.localeCompare(a.source.date)).filter((a) => {
    const key = positionKey(a.source.fenBefore);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  const recent = attempts.filter((a) => now - Date.parse(a.at) >= 0).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const latest = (source: Decision) => recent.findLast((a) => positionKey(a.fenBefore) === positionKey(source.fenBefore));
  const contexts = new Map<string, Set<string>>();
  candidates.forEach((a) => { const key = teachingForAnalysis(a).lesson; const set = contexts.get(key) ?? new Set<string>(); set.add(positionKey(a.source.fenBefore)); contexts.set(key, set); });
  const latestOutcomes = new Map<string, RetryAttempt>();
  recent.forEach((attempt) => { latestOutcomes.delete(positionKey(attempt.fenBefore)); latestOutcomes.set(positionKey(attempt.fenBefore), attempt); });
  const supportContext = [...latestOutcomes.values()].reverse().find((a) => a.outcome !== "independent");
  const supportAnalysis = candidates.find((a) => supportContext && positionKey(a.source.fenBefore) === positionKey(supportContext.fenBefore));
  const supported = supportAnalysis ? teachingForAnalysis(supportAnalysis).lesson : undefined;
  return candidates.map((analysis) => {
    const teaching = teachingForAnalysis(analysis);
    const prior = latest(analysis.source);
    const schedule = revisitSchedule(attempts.filter((a) => positionKey(a.fenBefore) === positionKey(analysis.source.fenBefore) && a.playerColor === analysis.source.playerColor), now);
    const { due } = schedule;
    const recurring = contexts.get(teaching.lesson)!.size;
    const score = (due ? 1000 : 0) + (!prior ? 100 : 0) + (supported === teaching.lesson && !prior ? 80 : 0) + Math.min(recurring, 5) * 10 + Math.min(analysis.drop ?? 500, 500) / 10 - (analysis.source.id === avoid ? 500 : 0);
    const reason = !prior
      ? supported === teaching.lesson
        ? `A different position involving ${teaching.title.toLowerCase()}: you needed support on another decision in this group. Try this one without a hint first.`
        : `${recurring > 1 ? `${recurring} distinct positions in your games involved ${teaching.title.toLowerCase()}. ` : ""}You haven’t retried this decision yet.`
      : due ? `Time to revisit this decision. Last time: ${prior.outcome === "independent" ? "solved independently" : prior.outcome === "supported" ? "solved with support" : "not yet"}.` : `Recently practiced ${prior.outcome === "independent" ? "independently" : "with help or left unresolved"}. You can repeat it now, but remembering one position is not new evidence of transfer.`;
    return { analysis, reason, due, dueAt: schedule.dueAt, score, recurring };
  }).sort((a,b) => b.score - a.score || b.analysis.source.date.localeCompare(a.analysis.source.date));
}

/** Describe only the directly observed legal move, never an inferred strategic cause. */
export function moveConsequence(fen: string, value: string, playerColor: PlayerColor = "white") {
  const board = new Chess(fen);
  const move = /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value) ? applyUci(board, value) : board.move(value);
  const names = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  const owner = move.color === playerTurn(playerColor) ? "Your" : `${colorName(opponentColor(playerColor))}’s`;
  const other = move.color === playerTurn(playerColor) ? `${colorName(opponentColor(playerColor))}’s` : "your";
  if (board.isCheckmate()) return `${owner} ${names[move.piece]} can deliver checkmate on ${move.to}.`;
  let action = move.flags.includes("k") ? `${owner} king can castle kingside` : move.flags.includes("q") ? `${owner} king can castle queenside` : move.captured ? `${owner} ${names[move.piece]} can capture ${other} ${names[move.captured]} on ${move.to}` : `${owner} ${names[move.piece]} can move to ${move.to}`;
  if (move.promotion) action += ` and promote to a ${names[move.promotion]}`;
  if (board.isCheck()) action += ", giving check";
  return action + ".";
}

export const CONTEXT_TEACHING: Record<Context, { lesson: string; principle: string }> = {
  "defending-check": { lesson: "capture-checker", principle: "When checked, compare taking the checker, blocking its line and moving your king. Check that your king’s destination is safe." },
  capture: { lesson: "exchange-value", principle: "For each capture, calculate the opponent’s recapture. Compare the material gained and lost before deciding whether the exchange helps." },
  "forcing-check": { lesson: "block-check", principle: "A check limits the opponent’s replies. Test every capture, block and king escape before assuming the attack works." },
  "quiet-choice": { lesson: "central-break", principle: "When there is no immediate check or capture, compare candidate plans and the opponent’s strongest response. This group contains many different ideas." },
};
export function teachingForAnalysis(analysis: DecisionAnalysis) {
  const board = new Chess(analysis.source.fenBefore); applyUci(board, analysis.bestUci);
  if (board.isCheckmate()) return { lesson: "mating-net", title: "Mating nets", principle: "The engine found an immediate mate. Check every king escape, capture and block before choosing a checking move." };
  return { ...CONTEXT_TEACHING[analysis.context], title: CONTEXT_LABELS[analysis.context] };
}
export function recurringEvidence(analyses: DecisionAnalysis[]) {
  const groups = new Map<string, { lesson: string; title: string; principle: string; boards: Map<string, DecisionAnalysis>; gameIds: Set<string> }>();
  for (const analysis of analyses) if (analysis.teachable) {
    const teaching = teachingForAnalysis(analysis);
    const group = groups.get(teaching.lesson) ?? { ...teaching, boards: new Map(), gameIds: new Set() };
    group.boards.set(positionKey(analysis.source.fenBefore), analysis); group.gameIds.add(analysis.source.gameId);
    groups.set(teaching.lesson, group);
  }
  return [...groups.values()].map((group) => ({ lesson: group.lesson, title: group.title, principle: group.principle, positions: group.boards.size, games: group.gameIds.size, examples: [...group.boards.values()] })).sort((a, b) => b.positions - a.positions);
}
