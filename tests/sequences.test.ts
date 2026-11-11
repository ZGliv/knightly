import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { SEQUENCES, sequencePosition } from "../lib/learning/sequences";
import { solvesLesson } from "../lib/learning/curriculum";
import { revisitSchedule } from "../lib/learning/schedule";
import { parseAttempts, type Attempt } from "../lib/learning/progress";
import { studyProgress } from "../lib/learning/study";

test("every sequence has two distinct legal boards and working answers as both colors", () => {
  for (const lesson of SEQUENCES) {
    assert.notEqual(lesson.fen.split(" ")[0], lesson.independent.fen.split(" ")[0]);
    for (const side of ["white", "black"] as const) for (const stage of ["guided", "transfer"] as const) {
      const exercise = sequencePosition(lesson, stage, side);
      const board = new Chess(exercise.fen);
      assert.equal(board.turn(), side[0], `${lesson.id} ${stage} ${side}`);
      assert.equal(board.isGameOver(), false);
      const opponent = new Chess(exercise.fen.split(" ").map((part, i) => i === 1 ? (side === "white" ? "b" : "w") : i === 3 ? "-" : part).join(" "));
      assert.equal(opponent.isCheck(), false, `${lesson.id} illegal opponent check`);
      for (const answer of exercise.answers) {
        const move = new Chess(exercise.fen).move(answer);
        assert.equal(solvesLesson(exercise, move.from, move.to, move.promotion).correct, true);
      }
    }
  }
});
const day = 86400000;
const start = Date.parse("2026-10-01T12:00:00Z");
test("revisits fade support on spaced successes, never same-day answer repetitions", () => {
  const entry = (offset: number, outcome = "independent") => ({ at: new Date(start + offset).toISOString(), outcome });
  assert.equal(revisitSchedule([], start).due, true);
  assert.equal(revisitSchedule([entry(0, "supported")], start).dueAt, start + 900000);
  assert.equal(revisitSchedule([entry(0), entry(1000), entry(2000)], start + 2000).intervalDays, 1);
  const history = [entry(0), entry(day), entry(4 * day)];
  assert.equal(revisitSchedule(history, start + 4 * day).intervalDays, 7);
  assert.equal(revisitSchedule(history, start + 11 * day).due, true);
  assert.equal(revisitSchedule([...history, entry(5 * day, "not-yet")], start + 5 * day).intervalDays, 1 / 96);
  assert.equal(revisitSchedule([entry(day)], start).due, true);
});
test("legacy attempts stay readable; separate-position evidence survives reload and drives overdue review", () => {
  const guided: Attempt = { id: "a", lessonId: "capture-checker", at: new Date(start).toISOString(), outcome: "supported", hints: 1, misses: 0 };
  const transfer: Attempt = { ...guided, id: "b", at: new Date(start + 1000).toISOString(), stage: "transfer", playerColor: "black", outcome: "independent", hints: 0 };
  const parsed = parseAttempts(JSON.stringify({ version: 1, attempts: [guided, transfer] }));
  const progress = studyProgress(parsed, start + 2 * day);
  assert.equal(progress.transfer.get(guided.lessonId)?.playerColor, "black");
  assert.equal(progress.practiced, 1);
  assert.equal(progress.next.id, guided.lessonId);
  assert.throws(() => parseAttempts(JSON.stringify({ version: 1, attempts: [{ ...transfer, stage: "invented" }] })));
});
