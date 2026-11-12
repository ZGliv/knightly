import { test } from "node:test";
import assert from "node:assert/strict";
import { dueRepeats, repeatDueAt } from "../lib/puzzles/schedule";
import { emptyProgress, type Puzzle, type PuzzleAttempt } from "../lib/puzzles/types";

const DAY = 86_400_000;
const t0 = Date.parse("2026-01-01T12:00:00Z");
const at = (days: number) => new Date(t0 + days * DAY).toISOString();

test("never-failed puzzles do not repeat", () => {
  assert.equal(repeatDueAt([]), null);
  assert.equal(repeatDueAt([{ at: at(0), solved: true }]), null);
});

test("a miss returns after 1 day, then 3 and 7 after clean solves, then retires", () => {
  const h = [{ at: at(0), solved: false }];
  assert.equal(repeatDueAt(h), t0 + DAY);
  h.push({ at: at(1), solved: true });
  assert.equal(repeatDueAt(h), t0 + 4 * DAY);
  h.push({ at: at(4), solved: true });
  assert.equal(repeatDueAt(h), t0 + 11 * DAY);
  h.push({ at: at(11), solved: true });
  assert.equal(repeatDueAt(h), null);
});

test("a later miss restarts the ladder", () => {
  assert.equal(repeatDueAt([{ at: at(0), solved: false }, { at: at(1), solved: true }, { at: at(4), solved: false }]), t0 + 5 * DAY);
});

test("dueRepeats lists only due failed puzzles, most overdue first", () => {
  const p = (id: string): Puzzle => ({ id, fen: "", moves: ["a", "b"], rating: 1000, themes: [] });
  const a = (puzzleId: string, days: number, solved: boolean): PuzzleAttempt => ({ puzzleId, at: at(days), solved, rated: true, puzzleRating: 1000, themes: [], ratingBefore: 1000, ratingAfter: 1000 });
  const progress = { ...emptyProgress(), attempts: [a("x", 0, false), a("y", 0.5, false), a("z", 2, false)], repeats: { x: p("x"), y: p("y"), z: p("z") } };
  assert.deepEqual(dueRepeats(progress, t0 + 2 * DAY), ["x", "y"]);
  assert.deepEqual(dueRepeats(progress, t0 + 0.5 * DAY), []);
});
