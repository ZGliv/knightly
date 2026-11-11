import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { LESSONS, solvesLesson } from "../lib/learning/curriculum";
import { gameFocus, nextLesson, parseAttempts, PRACTICE_KEY, saveAttempt, type Attempt } from "../lib/learning/progress";
import { importPgn } from "../lib/chess/game-record";
const attempt = (lessonId: string, outcome: Attempt["outcome"] = "independent", at = new Date().toISOString()): Attempt => ({ id: crypto.randomUUID(), lessonId, at, outcome, hints: outcome === "independent" ? 0 : 1, misses: 0 });

test("all study positions are legal, unfinished, and have working solutions", () => {
  assert.equal(LESSONS.length, 92);
  for (const lesson of LESSONS) {
    const chess = new Chess(lesson.fen);
    assert.equal(chess.turn(), "w", lesson.id);
    assert.equal(chess.isGameOver(), false, lesson.id);
    // Black cannot already be in check in a legal White-to-move position.
    const black = new Chess(lesson.fen.split(" ").map((part, i) => i === 1 ? "b" : i === 3 ? "-" : part).join(" "));
    assert.equal(black.isCheck(), false, lesson.id);
    for (const answer of lesson.answers) {
      const demo = new Chess(lesson.fen);
      const move = demo.move(answer);
      const result = solvesLesson(lesson, move.from, move.to, move.promotion);
      assert.equal(result.correct, true, `${lesson.id}: ${answer}`);
      assert.equal(result.fen, demo.fen());
      if (lesson.checkmate) assert.equal(demo.isCheckmate(), true);
    }
  }
});
test("goal checking distinguishes a legal alternative from an illegal move", () => {
  const lesson = LESSONS[0];
  assert.deepEqual([solvesLesson(lesson, "g1", "f3").legal, solvesLesson(lesson, "g1", "f3").correct], [true, false]);
  assert.equal(solvesLesson(lesson, "e2", "e5").legal, false);
  assert.equal(solvesLesson(lesson, "d2", "d4").correct, true);
});
test("next step requires distinct recent independent solves and falls back after support", () => {
  assert.equal(nextLesson([], "opening").level, 1);
  assert.equal(nextLesson([attempt("claim-center"), attempt("claim-center")], "opening").level, 1);
  const two = [attempt("claim-center"), attempt("develop-knight")];
  assert.equal(nextLesson(two, "opening", "develop-knight").lesson.id, "castle-king");
  assert.equal(nextLesson([...two, attempt("castle-king", "supported")], "opening").level, 1);
  assert.equal(nextLesson([...two, attempt("castle-king", "not-yet")], "opening").level, 1);
  const stale = two.map((a) => ({ ...a, at: "2020-01-01T00:00:00.000Z" }));
  assert.equal(nextLesson(stale, "opening").level, 1);
  assert.equal(nextLesson(two, "endgame").level, 1);
});
test("not-yet and hints are retained; fabricated independent success is rejected", () => {
  const values = [attempt("claim-center", "not-yet"), attempt("develop-knight", "supported")];
  assert.deepEqual(parseAttempts(JSON.stringify({ version: 1, attempts: values })), values);
  assert.throws(() => parseAttempts(JSON.stringify({ version: 1, attempts: [{ ...attempt("claim-center"), hints: 1 }] })));
  assert.throws(() => parseAttempts("corrupt"));
  assert.throws(() => parseAttempts(JSON.stringify({ version: 9, attempts: [] })));
});
test("saving reads the latest history and never overwrites malformed storage", () => {
  const map = new Map<string, string>();
  Object.assign(globalThis, { localStorage: { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, value: string) => map.set(k, value) } });
  const first = attempt("claim-center");
  saveAttempt(first);
  assert.equal(saveAttempt(attempt("develop-knight")).length, 2);
  map.set(PRACTICE_KEY, "corrupt");
  assert.throws(() => saveAttempt(first));
  assert.equal(map.get(PRACTICE_KEY), "corrupt");
});
test("game guidance requires observations and ignores unanalysed and Black moves", () => {
  const game = importPgn("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *");
  assert.match(gameFocus([game]).reason, /fewer than three/);
  game.moves.forEach((move) => { move.cpLoss = 100; move.classification = "mistake"; });
  const focus = gameFocus([game]);
  assert.equal(focus.phase, "opening");
  assert.deepEqual(focus.counts.opening, { analyzed: 3, drops: 3 });
  assert.equal(focus.counts.endgame.analyzed, 0);
  assert.match(focus.reason, /3 of 3/);
});
