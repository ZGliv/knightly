import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { importPgn, recordGame, validateGame } from "../lib/chess/game-record";
import { analyzeMove } from "../lib/chess/analyze-move";
import { generateReview } from "../lib/chess/review-generator";
import { isPlayerPly } from "../lib/chess/player";
import { gameFocus } from "../lib/learning/progress";
import { applyUci, decisionBoard, decisionsFromGames, emptyCoach, evaluateChoice, evaluationLabel, inspectDecision, inspectRetry, moveConsequence, sameDecision, whiteEvaluation, type RetryAttempt } from "../lib/learning/coach/model";
import { parseCoach } from "../lib/learning/coach/storage";
import { exportGames, importGames, listGamesLocal, saveGameLocal } from "../lib/storage/local-games";
import type { EngineAnalysis } from "../lib/engine/stockfish-client";
const cp = (scoreCp: number, bestMove = "e7e5"): EngineAnalysis => ({ scoreCp, bestMove, mateIn: null, depth: 14, pv: [bestMove] });
const blackGame = () => importPgn('[White "Human A"]\n[Black "Human B"]\n\n1. f3 e5 2. g4 Nf6 3. e4 *', "black");
const blackSource = () => decisionsFromGames([blackGame()]).find((s) => s.ply === 4)!;

test("color survives records, legacy normalization and JSON backups without inventing PGN players", () => {
  const white = recordGame(new Chess()); const black = recordGame(new Chess(), undefined, [], undefined, "black");
  assert.match(white.pgn, /\[White "Player"\]/); assert.match(black.pgn, /\[Black "Player"\]/); assert.match(black.pgn, /\[White "Stockfish 18"\]/);
  const imported = blackGame(); assert.equal(validateGame(imported).playerColor, "black");
  assert.match(imported.pgn, /\[White "Human A"\]/); assert.match(imported.pgn, /\[Black "Human B"\]/);
  assert.doesNotMatch(importPgn("1. e4 e5 *", "black").pgn, /Stockfish/);
  assert.equal(validateGame({ ...imported, playerColor: undefined }).playerColor, "white");
  assert.throws(() => validateGame({ ...imported, playerColor: "blue" }));
  const map = new Map<string, string>(); Object.assign(globalThis, { window: {}, localStorage: { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v) } });
  saveGameLocal(imported); const backup = exportGames(); map.clear(); assert.equal(importGames(backup), 1); assert.equal(listGamesLocal()[0].playerColor, "black"); assert.equal(listGamesLocal()[0].pgn, imported.pgn);
});

test("only owned legal plies enter coaching; explicit color correction invalidates prior source ownership", () => {
  const game = blackGame(); const sources = decisionsFromGames([game]);
  assert.deepEqual(sources.map((s) => s.ply), [4, 2]);
  sources.forEach((s) => { assert.equal(s.playerColor, "black"); assert.equal(decisionBoard(s).turn(), "b"); const board = decisionBoard(s); applyUci(board, s.playedUci); assert.equal(board.fen(), s.fenAfter); });
  assert.equal(sameDecision(sources[0], { ...sources[0], playerColor: "white" }), false);
  assert.throws(() => decisionBoard({ ...sources[0], playerColor: "white" }), /history/);
  const changed = recordGame((() => { const c = new Chess(); c.loadPgn(game.pgn); return c; })(), game, game.moves, game.result, "white");
  assert.equal(changed.pgn, game.pgn); assert.equal(changed.id, game.id); assert.deepEqual(decisionsFromGames([changed]).map((s) => s.ply), [5, 3, 1]);
});

test("Black loss and safe alternatives use Black perspective while storage remains absolute White", async () => {
  assert.equal(evaluationLabel({ kind: "cp", value: -125 }, "black"), "+1.25 for you (Black)");
  assert.equal(evaluateChoice({ kind: "cp", value: -200 }, { kind: "cp", value: -170 }, "black").loss, 30);
  assert.equal(evaluateChoice({ kind: "cp", value: -200 }, { kind: "cp", value: -170 }, "black").accepted, true);
  assert.equal(evaluateChoice({ kind: "cp", value: -200 }, { kind: "cp", value: -20 }, "black").teachable, true);
  const s = decisionsFromGames([importPgn("1. e4 a6 *", "black")])[0]; let calls = 0;
  const a = await inspectDecision(s, async () => ++calls === 1 ? cp(200, "e7e5") : cp(100, "g1f3"));
  assert.deepEqual(a.before, { kind: "cp", value: -200 }); assert.equal(a.drop, 300); assert.equal(a.teachable, true);
  const alternate = await inspectRetry(a, "c7c5", async () => cp(-170, "g1f3"));
  assert.equal(alternate.referenceMatch, false); assert.equal(alternate.accepted, true); assert.equal(alternate.loss, 30);
  const bad = await inspectRetry(a, "c7c5", async () => cp(100, "g1f3")); assert.equal(bad.accepted, false);
  const same = await inspectRetry(a, a.bestUci, async () => cp(100)); assert.equal(same.accepted, true);
});

test("Black mate detection, missed mate, opponent mate and concrete feedback preserve ownership", async () => {
  const source = blackSource(); let calls = 0;
  const a = await inspectDecision(source, async () => ++calls === 1 ? { ...cp(0, "d8h4"), scoreCp: null, mateIn: 1 } : cp(0, "e2e4"));
  assert.equal(a.teachable, true); assert.deepEqual(a.before, { kind: "mate", winner: "black", moves: 1 });
  assert.equal(evaluateChoice(a.before, { kind: "cp", value: -600 }, "black").accepted, false);
  assert.equal(evaluateChoice({ kind: "mate", winner: "white", moves: 2 }, a.before, "black").uncertain, true);
  const mate = await inspectRetry(a, "d8h4", async () => { throw new Error("Terminal checkmate must not search"); });
  assert.equal(mate.accepted, true); assert.deepEqual(mate.evaluation, { kind: "mate", winner: "black", moves: 0 });
  assert.equal(moveConsequence(source.fenBefore, "d8h4", "black"), "Your queen can deliver checkmate on h4.");
  const capture = new Chess(); ["e4", "e5", "Nf3", "Nc6", "Nxe5"].forEach((m) => capture.move(m));
  assert.equal(moveConsequence(capture.fen(), "Nxe5", "black"), "Your knight can capture White’s knight on e5.");
  assert.equal(moveConsequence(source.fenAfter, "e4", "black"), "White’s pawn can move to e4.");
});

test("new Black coach records round-trip and legacy White evidence migrates without sign reinterpretation", async () => {
  const s = blackSource(); let calls = 0;
  const analysis = await inspectDecision(s, async () => ++calls === 1 ? { ...cp(0, "d8h4"), scoreCp: null, mateIn: 1 } : cp(0, "e2e4"));
  const attempt: RetryAttempt = { id: "black-attempt", decisionId: s.id, gameId: s.gameId, playerColor: "black", ply: s.ply, fenBefore: s.fenBefore, playedUci: s.playedUci, at: new Date().toISOString(), triedSan: "Qh4#", triedUci: "d8h4", hints: 0, misses: 0, outcome: "independent", loss: null, evaluation: { kind: "mate", winner: "black", moves: 0 } };
  const data = { ...emptyCoach(), analyses: [analysis], attempts: [attempt] }; assert.deepEqual(parseCoach(JSON.stringify(data)), data);
  assert.throws(() => parseCoach(JSON.stringify({ ...data, attempts: [{ ...attempt, playerColor: "white" }] })));
  const white = decisionsFromGames([importPgn("1. e4 e5 *")])[0]; calls = 0;
  const legacy = await inspectDecision(white, async () => ++calls === 1 ? cp(60, "d2d4") : cp(-30, "e7e5"));
  const raw = JSON.parse(JSON.stringify({ ...emptyCoach(), analyses: [legacy] })); delete raw.analyses[0].source.playerColor;
  raw.attempts = [{ ...attempt, playerColor: undefined, gameId: white.gameId, decisionId: white.id, ply: white.ply, fenBefore: white.fenBefore, playedUci: white.playedUci, triedSan: "e4", triedUci: "e2e4", evaluation: { kind: "cp", value: 30 } }];
  const migrated = parseCoach(JSON.stringify(raw)); assert.equal(migrated.analyses[0].source.playerColor, "white"); assert.deepEqual(migrated.analyses[0].before, legacy.before);
  assert.equal(migrated.attempts[0].playerColor, "white"); assert.deepEqual(migrated.attempts[0].evaluation, { kind: "cp", value: 30 });
});

test("Black review coverage counts only owned analysis and full history detects repetition", async () => {
  const game = importPgn("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *", "black");
  game.moves = game.moves.map((m) => ({ ...m, cpLoss: isPlayerPly(m.ply, "black") ? 150 : 1000, classification: "blunder" }));
  assert.equal(generateReview(game.moves, "*", "black").phaseStrength.opening, 3);
  assert.ok(generateReview(game.moves, "*", "black").keyMistakes.every((m) => m.ply % 2 === 0));
  assert.match(gameFocus([game]).reason, /3 of 3/);
  const repeated = importPgn("1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 1/2-1/2", "black");
  const last = repeated.moves.at(-1)!; const history = repeated.moves.slice(0, -1).map((m) => m.uci); let calls = 0;
  const reviewed = await analyzeMove(repeated.moves.at(-2)!.fenAfter, last, async (_fen, _skill, prefix) => { calls++; assert.deepEqual(prefix, history); return cp(0, last.uci); }, history);
  assert.equal(calls, 1); assert.equal(reviewed.cpLoss, 0);
  const draw = new Chess(); repeated.moves.forEach((m) => applyUci(draw, m.uci)); assert.deepEqual(whiteEvaluation(draw), { kind: "cp", value: 0 });
});

test("Black promotion, underpromotion, en passant and castling remain legal from the player perspective", () => {
  const promotion = new Chess("7k/8/8/8/8/8/p7/7K b - - 0 1"); const before = promotion.fen();
  assert.equal(applyUci(promotion, "a2a1n").promotion, "n"); assert.match(moveConsequence(before, "a2a1q", "black"), /Your pawn.*promote to a queen/);
  const ep = new Chess(); ["a3", "e5", "a4", "e4", "d4"].forEach((m) => ep.move(m)); assert.equal(ep.move("exd3").flags.includes("e"), true); assert.equal(ep.get("d4"), undefined);
  const castle = importPgn("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. O-O O-O *", "black"); assert.equal(new Chess(castle.fenFinal).get("g8")?.type, "k");
});


test("Black terminal mate review clears stale cp grades and survives validated reload", async () => {
  const game = importPgn("1. f3 e5 2. g4 Qh4# 0-1", "black"); const last = { ...game.moves.at(-1)!, cpLoss: 999, classification: "blunder" as const };
  const analyzed = await analyzeMove(game.moves.at(-2)!.fenAfter, last, async () => ({ ...cp(0, "d8h4"), scoreCp: null, mateIn: 1 }), game.moves.slice(0, -1).map((m) => m.uci));
  assert.equal(analyzed.cpLoss, undefined); assert.equal(analyzed.classification, undefined); assert.match(analyzed.coachText!, /delivers checkmate/);
  const restored = validateGame({ ...game, moves: [...game.moves.slice(0, -1), analyzed] });
  assert.equal(restored.playerColor, "black"); assert.equal(restored.result, "0-1"); assert.equal(restored.moves.at(-1)!.coachText, analyzed.coachText);
});
