import { test } from "node:test";
import assert from "node:assert/strict";
import { studyProgress, STUDY_UNITS, CONCEPTS } from "../lib/learning/study";
import { LESSONS } from "../lib/learning/curriculum";
import type { Attempt } from "../lib/learning/progress";
const now = Date.parse("2026-10-26T12:00:00Z");
const attempt = (lessonId: string, outcome: Attempt["outcome"], offset: number): Attempt => ({ id: String(offset), lessonId, outcome, at: new Date(now + offset).toISOString(), hints: outcome === "supported" ? 1 : 0, misses: 0 });
test("Study path covers every real lesson once and gives each a principle", () => {
  assert.deepEqual(STUDY_UNITS.flatMap((unit) => [...unit.lessons]).sort(), LESSONS.map((l) => l.id).sort());
  for (const lesson of LESSONS) assert.ok(CONCEPTS[lesson.id].principle);
});
test("Study progress counts distinct ideas using latest evidence, never repeated solves", () => {
  const progress = studyProgress([attempt("claim-center", "independent", -300), attempt("claim-center", "independent", -200), attempt("claim-center", "supported", -100)], now);
  assert.equal(progress.practiced, 1); assert.equal(progress.independent, 0); assert.equal(progress.supported, 1);
  assert.equal(progress.next.id, "develop-knight");
});
test("Study ignores unknown and future attempts, and revisits oldest idea after all tried", () => {
  assert.equal(studyProgress([attempt("unknown", "independent", -100), attempt("claim-center", "independent", 100)], now).practiced, 0);
  const history = LESSONS.map((lesson, i) => attempt(lesson.id, i ? "independent" : "not-yet", -1000 + i));
  const progress = studyProgress(history, now);
  assert.equal(progress.practiced, LESSONS.length); assert.equal(progress.notYet, 1); assert.equal(progress.next.id, LESSONS[0].id);
});
