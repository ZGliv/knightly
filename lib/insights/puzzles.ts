import { Chess } from "chess.js";
import type { Decision, RetryAttempt } from "@/lib/learning/coach/model";
import { revisitSchedule } from "@/lib/learning/schedule";
import { replayGame } from "@/lib/insights/replay";
import type { ImportedGame, Leak } from "@/lib/insights/types";

/**
 * Turns a leak into a coach Decision so GameRetry can replay it as a "find the better move" puzzle.
 * The prefix and position come from replaying the game itself, so decisionBoard() always reproduces them.
 */
export function leakToDecision(leak: Leak, game: ImportedGame): Decision {
  if (leak.gameId !== game.id) throw new Error("This mistake belongs to a different game.");
  const replay = replayGame(game.pgn);
  // decisionBoard() replays the prefix from the normal start, so a game set up from another position cannot be a puzzle.
  if (replay.fens[0] !== START_FEN) throw new Error("This game does not start from the normal starting position.");
  if (!Number.isInteger(leak.ply) || leak.ply < 1 || leak.ply > replay.ucis.length) throw new Error("This mistake points at a move the game does not have.");
  const index = leak.ply - 1;
  if (replay.ucis[index] !== leak.playedUci) throw new Error("This mistake no longer matches the moves of its game.");
  const moverColor = index % 2 === 0 ? "white" : "black";
  if (moverColor !== leak.userColor) throw new Error("This mistake was recorded for the wrong side.");
  return {
    id: leak.id,
    gameId: game.id,
    playerColor: leak.userColor,
    ply: leak.ply,
    date: new Date(game.endTime).toISOString(),
    opening: game.openingName,
    fenBefore: replay.fens[index],
    fenAfter: replay.fens[leak.ply],
    playedSan: replay.sans[index],
    playedUci: replay.ucis[index],
    prefix: replay.ucis.slice(0, index),
  };
}

const START_FEN = new Chess().fen();
const byDrop = (a: Leak, b: Leak) => b.drop - a.drop || a.id.localeCompare(b.id);
/** Oldest first; attempts made in the same millisecond fall back to their id so storage order never matters. */
const byTime = (a: RetryAttempt, b: RetryAttempt) => Date.parse(a.at) - Date.parse(b.at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Practice order: never-tried mistakes (biggest drop first), then ones not yet solved unaided,
 * then solved ones once they are due again (1, 3, then 7 days after spaced independent solves).
 * Solved puzzles that are not due yet are left out. Attempts after `now` are ignored.
 */
export function rankPuzzles(leaks: Leak[], attempts: RetryAttempt[], now = Date.now()): Leak[] {
  const history = new Map<string, RetryAttempt[]>();
  for (const attempt of attempts) {
    const at = Date.parse(attempt.at);
    if (!Number.isFinite(at) || at > now) continue;
    const list = history.get(attempt.decisionId) ?? [];
    list.push(attempt);
    history.set(attempt.decisionId, list);
  }
  const fresh: Leak[] = [];
  const unsolved: Leak[] = [];
  const due: { leak: Leak; dueAt: number }[] = [];
  for (const leak of leaks) {
    const tries = history.get(leak.id);
    if (!tries?.length) { fresh.push(leak); continue; }
    tries.sort(byTime);
    if (tries[tries.length - 1].outcome !== "independent") { unsolved.push(leak); continue; }
    const schedule = revisitSchedule(tries, now);
    if (schedule.due) due.push({ leak, dueAt: schedule.dueAt });
  }
  return [
    ...fresh.sort(byDrop),
    ...unsolved.sort(byDrop),
    ...due.sort((a, b) => a.dueAt - b.dueAt || byDrop(a.leak, b.leak)).map((entry) => entry.leak),
  ];
}
