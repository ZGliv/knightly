import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { importPgn } from "../lib/chess/game-record";
import { teachingForAnalysis, recurringEvidence, decisionBoard, decisionsFromGames, emptyCoach, evaluateChoice, inspectDecision, inspectRetry, moveConsequence, recommendDecisions, whiteEvaluation, type DecisionAnalysis, type RetryAttempt } from "../lib/learning/coach/model";
import { COACH_KEY, parseCoach, saveAnalysis, saveRetry } from "../lib/learning/coach/storage";
import type { EngineAnalysis } from "../lib/engine/stockfish-client";
const sample = () => importPgn("1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxe5+ Be7 *");
const cp = (value: number, bestMove = "g1f3"): EngineAnalysis => ({ scoreCp: value, mateIn: null, bestMove, depth: 14, pv: [bestMove] });
const source = () => decisionsFromGames([sample()]).find((s) => s.ply === 3)!;
async function analysis() {
  let call = 0; return inspectDecision(source(), async () => ++call === 1 ? cp(200) : cp(100, "g8f6"));
}
const trial = (a: DecisionAnalysis, outcome: RetryAttempt["outcome"], at = new Date().toISOString()): RetryAttempt => ({ id: crypto.randomUUID(), decisionId: a.source.id, gameId: a.source.gameId, playerColor: a.source.playerColor, ply: a.source.ply, fenBefore: a.source.fenBefore, playedUci: a.source.playedUci, at, hints: outcome === "independent" ? 0 : 1, misses: 0, triedSan: "Nf3", triedUci: "g1f3", outcome, loss: 0, evaluation: { kind: "cp", value: 200 } });

test("PGN decisions are exact legally replayed White positions even without annotations", () => {
  const game = sample(); const decisions = decisionsFromGames([game]);
  assert.equal(decisions.length, 4); assert.equal(decisions[0].ply, 7);
  decisions.forEach((s) => { assert.equal(s.ply % 2, 1); assert.equal(decisionBoard(s).fen(), s.fenBefore); });
  assert.equal(game.moves.some((m) => m.cpLoss !== undefined), false);
  assert.throws(() => decisionBoard({ ...decisions[0], prefix: [] }), /no longer matches/);
});
test("score comparisons normalize side-to-move and keep mate separate", () => {
  const chess = new Chess(); chess.move("e4");
  assert.deepEqual(whiteEvaluation(chess, cp(150)), { kind: "cp", value: -150 });
  assert.deepEqual(whiteEvaluation(chess, { ...cp(0), scoreCp: null, mateIn: 2 }), { kind: "mate", winner: "black", moves: 2 });
  assert.equal(evaluateChoice({ kind: "cp", value: 100 }, { kind: "cp", value: 60 }).accepted, true);
  assert.equal(evaluateChoice({ kind: "cp", value: 100 }, { kind: "cp", value: 49 }).accepted, false);
  assert.equal(evaluateChoice({ kind: "mate", winner: "white", moves: 3 }, { kind: "cp", value: 600 }).accepted, false);
  assert.equal(evaluateChoice({ kind: "mate", winner: "white", moves: 3 }, { kind: "mate", winner: "white", moves: 7 }).accepted, true);
  assert.equal(evaluateChoice({ kind: "mate", winner: "black", moves: 3 }, { kind: "mate", winner: "black", moves: 1 }).uncertain, true);
  const mate = new Chess("7k/6Q1/5K2/8/8/8/8/8 b - - 0 1");
  assert.deepEqual(whiteEvaluation(mate), { kind: "mate", winner: "white", moves: 0 });
  assert.deepEqual(whiteEvaluation(new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")), { kind: "cp", value: 0 });
});
test("decision analysis sends move history and never marks its own top move as a mistake", async () => {
  const s = source(); const requests: string[][] = []; let count = 0;
  const result = await inspectDecision(s, async (_fen, _skill, history) => { requests.push(history!); return ++count === 1 ? cp(200, s.playedUci) : cp(300, "g8f6"); });
  assert.equal(result.teachable, false); assert.equal(result.drop, 500);
  assert.deepEqual(requests, [s.prefix, [...s.prefix, s.playedUci]]);
});
test("cancelled scan stops after the current search and does not start the second", async () => {
  let calls = 0;
  await assert.rejects(inspectDecision(source(), async () => { calls++; return cp(100); }, () => false), /cancelled/);
  assert.equal(calls, 1);
});
test("a non-best legal alternative inside tolerance passes, a weaker one fails", async () => {
  const a = await analysis();
  const good = await inspectRetry(a, "b1c3", async () => cp(-170, "g8f6"));
  assert.equal(good.referenceMatch, false); assert.equal(good.accepted, true); assert.equal(good.loss, 30);
  const bad = await inspectRetry(a, "b1c3", async () => cp(100, "g8f6"));
  assert.equal(bad.accepted, false); assert.equal(bad.loss, 300);
  await assert.rejects(inspectRetry(a, "e2e5", async () => cp(0)));
});
test("matching the suggested move survives numerical noise but not conflicting mate evidence", async () => {
  const a = await analysis();
  const noisy = await inspectRetry(a, a.bestUci, async () => cp(50, "g8f6"));
  assert.equal(noisy.accepted, true); assert.equal(noisy.loss, 250);
  const contradiction = await inspectRetry(a, a.bestUci, async () => ({ ...cp(0), scoreCp: null, mateIn: 2 }));
  assert.equal(contradiction.uncertain, true); assert.equal(contradiction.accepted, false);
});
test("threefold draw is checked using full source history without another engine search", async () => {
  const game = importPgn("1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 5. Nf3 Nf6 6. Ng1 *");
  const s = decisionsFromGames([game])[0];
  const a = { ...(await analysis()), source: s, before: { kind: "cp" as const, value: 0 } };
  let calls = 0;
  const result = await inspectRetry(a, s.playedUci, async () => { calls++; return cp(300); });
  assert.equal(calls, 0); assert.deepEqual(result.evaluation, { kind: "cp", value: 0 });
});
test("support prioritizes a new decision in the same context; successful replay cools down", async () => {
  const a = await analysis();
  const b = { ...a, source: decisionsFromGames([importPgn("1. d4 d5 2. Bf4 Nf6 *")])[0] };
  const c = { ...a, context: "capture" as const, source: { ...a.source, id: "third:3", gameId: "third" } };
  const support = trial(a, "supported");
  const ranked = recommendDecisions([a, b, c], [support]);
  assert.equal(ranked[0].analysis.source.id, b.source.id);
  assert.match(ranked[0].reason, /needed support/);
  assert.equal(ranked.find((r) => r.analysis.source.id === a.source.id)!.due, false);
  const success = trial(a, "independent");
  assert.equal(recommendDecisions([a], [success], Date.now() + 25 * 3600000)[0].due, true);
  assert.equal(recommendDecisions([a], [support], Date.now() + 16 * 60000)[0].due, true);
});
test("coach evidence round-trips; malformed data is preserved and independent hints rejected", async () => {
  const map = new Map<string, string>();
  Object.assign(globalThis, { localStorage: { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v) } });
  const a = await analysis(); const saved = saveAnalysis(a); assert.equal(saved.analyses.length, 1);
  const t = trial(a, "supported"); saveRetry(t);
  assert.deepEqual(parseCoach(map.get(COACH_KEY)!), { version: 1, analyses: [a], attempts: [t] });
  assert.throws(() => parseCoach(JSON.stringify({ ...emptyCoach(), attempts: [{ ...t, outcome: "independent" }] })));
  map.set(COACH_KEY, "broken-data"); assert.throws(() => saveRetry(t)); assert.equal(map.get(COACH_KEY), "broken-data");
});

test("scan source window fits analysis retention so completing it cannot recreate pending work", () => {
  const game = sample();
  const games = Array.from({ length: 80 }, (_, index) => ({ ...game, id: `window-${index}`, updatedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString() }));
  // Only the latest ten games are eligible. A long legal history exercises the independent decision cap.
  const repeated = new Chess();
  for (let i = 0; i < 110; i++) ["Nf3", "Nf6", "Ng1", "Ng8"].forEach((m) => repeated.move(m));
  const longGame = importPgn(repeated.pgn());
  const sources = decisionsFromGames([longGame, ...games]);
  assert.equal(sources.length, 200);
  assert.equal(sources[0].ply, 439);
  const stored = sources.slice(-200).map((s) => s.id);
  assert.equal(sources.filter((s) => !stored.includes(s.id)).length, 0);
  assert.equal(new Set(stored).size, 200);
});


test("plain-language consequences describe actual captures and mate without inventing a diagnosis", () => {
  const queen = new Chess(); ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxe5+"].forEach((m) => queen.move(m));
  assert.equal(moveConsequence(queen.fen(), "Nxe5"), "Black’s knight can capture your queen on e5.");
  const fool = new Chess(); ["f3", "e5", "g4"].forEach((m) => fool.move(m));
  assert.equal(moveConsequence(fool.fen(), "d8h4"), "Black’s queen can deliver checkmate on h4.");
  assert.throws(() => moveConsequence(fool.fen(), "e2e5"));
});


test("equivalent boards in different games share practice evidence and cannot masquerade as fresh transfer", async () => {
  const a = await analysis();
  const duplicate = { ...a, source: { ...a.source, id: "copy:3", gameId: "copy", fenBefore: a.source.fenBefore.replace(/ 0 2$/, " 4 6") } };
  const prior = trial(a, "supported");
  const results = recommendDecisions([duplicate], [prior]);
  assert.equal(results.length, 1);
  assert.equal(results[0].due, false);
  assert.match(results[0].reason, /Recently practiced/);
  assert.doesNotMatch(results[0].reason, /different position|haven’t retried/);
  assert.equal(recommendDecisions([a, duplicate], [prior]).length, 1);
});

test("recurring evidence counts distinct boards and games, excluding non-teachable moves", async () => {
  const first = await analysis();
  const duplicate = { ...first, source: { ...first.source, gameId: "another-game", id: "another-game:3" } };
  const nextSource = decisionsFromGames([importPgn("1. d4 d5 2. Bf4 *")]).find((s) => s.ply === 3)!;
  let call = 0;
  const different = await inspectDecision(nextSource, async () => ++call === 1 ? cp(200) : cp(100, "g8f6"));
  const groups = recurringEvidence([first, duplicate, different, { ...different, teachable: false, context: "capture" }]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].positions, 2);
  assert.equal(groups[0].games, 3);
});

test("a capturing mate selects mating-net teaching instead of material exchanges", async () => {
  const s = decisionsFromGames([sample()]).find((s) => s.ply === 7)!;
  const a = { ...(await analysis()), source: s, context: "capture" as const, bestUci: "h5f7" };
  assert.equal(teachingForAnalysis(a).lesson, "mating-net");
});
