import { test } from "node:test";
import assert from "node:assert/strict";
import { currentStreak, recordResult, solvedToday, themeStats, weakThemes } from "../lib/puzzles/progress";
import { bandsFor, choosePuzzle } from "../lib/puzzles/selection";
import { parseProgress } from "../lib/puzzles/storage";
import { emptyProgress, type Puzzle, type PuzzleIndex, type PuzzleProgress } from "../lib/puzzles/types";

const DAY = 86_400_000;
const now = Date.parse("2026-03-10T12:00:00Z");
const puzzle = (id: string, rating: number, themes: string[] = ["fork"]): Puzzle => ({ id, fen: "8/8/8/8/8/8/8/8 w - - 0 1", moves: ["a1a2", "a2a3"], rating, themes });

test("first attempts are rated, repeats are not, and failures join the repeat list", () => {
  let p = emptyProgress();
  p = recordResult(p, puzzle("a", 1000), false, 1000, now).progress;
  assert.equal(p.rating, 984);
  assert.ok(p.repeats.a);
  const again = recordResult(p, puzzle("a", 1000), true, 1000, now + DAY);
  assert.equal(again.attempt.rated, false);
  assert.equal(again.progress.rating, 984);
  assert.ok(again.progress.repeats.a, "stays until the ladder is cleared");
});

test("a repeat leaves the list once the ladder is cleared", () => {
  let p = recordResult(emptyProgress(), puzzle("a", 1000), false, 1000, now).progress;
  for (const d of [1, 4, 11]) p = recordResult(p, puzzle("a", 1000), true, 1000, now + d * DAY).progress;
  assert.deepEqual(p.repeats, {});
});

test("the start rating is used only until a rating exists", () => {
  const { progress } = recordResult(emptyProgress(), puzzle("a", 1400), true, 1400, now);
  assert.equal(progress.rating, 1416);
  assert.equal(recordResult(progress, puzzle("b", 1416), true, 900, now).attempt.ratingBefore, 1416);
});

test("theme stats need 5 attempts; weak spots are the lowest rates", () => {
  let p = emptyProgress();
  for (let i = 0; i < 5; i++) p = recordResult(p, puzzle(`f${i}`, 1000, ["fork"]), i < 4, 1000, now).progress;
  for (let i = 0; i < 5; i++) p = recordResult(p, puzzle(`p${i}`, 1000, ["pin"]), i < 1, 1000, now).progress;
  for (let i = 0; i < 4; i++) p = recordResult(p, puzzle(`s${i}`, 1000, ["skewer"]), false, 1000, now).progress;
  assert.deepEqual(themeStats(p.attempts).map((s) => [s.theme, s.rate]), [["pin", 0.2], ["fork", 0.8]]);
  assert.deepEqual(weakThemes(p.attempts, 1), ["pin"]);
});

test("solved today and streak", () => {
  let p = emptyProgress();
  p = recordResult(p, puzzle("a", 1000), true, 1000, now - 2 * DAY).progress;
  p = recordResult(p, puzzle("b", 1000), false, 1000, now - 60_000).progress;
  p = recordResult(p, puzzle("c", 1000), true, 1000, now - 30_000).progress;
  p = recordResult(p, puzzle("d", 1000), true, 1000, now).progress;
  assert.equal(solvedToday(p.attempts, now), 2);
  assert.equal(currentStreak(p.attempts), 2);
});

test("selection serves due repeats first, then unseen puzzles near the rating", () => {
  const pool = [puzzle("near", 1050), puzzle("far", 1400), puzzle("seen", 1000)];
  let p: PuzzleProgress = recordResult(emptyProgress(), puzzle("seen", 1000), true, 1000, now - 3 * DAY).progress;
  p = recordResult(p, puzzle("missed", 1600, ["pin"]), false, 1000, now - 2 * DAY).progress;
  const all = { kind: "all" } as const;
  assert.deepEqual(choosePuzzle({ pool, progress: p, rating: 1000, filter: all, now }), { puzzle: p.repeats.missed, repeat: true });
  // A theme filter skips repeats that do not match it.
  assert.equal(choosePuzzle({ pool, progress: p, rating: 1000, filter: { kind: "theme", theme: "fork" }, now })?.puzzle.id, "near");
  // Not due yet: serve the unseen puzzle within 100 points.
  assert.equal(choosePuzzle({ pool, progress: p, rating: 1000, filter: all, now: now - 1.5 * DAY })?.puzzle.id, "near");
  // Nothing within 100 points: fall back to the nearest unseen.
  assert.equal(choosePuzzle({ pool: [puzzle("far", 1400), puzzle("farther", 1700)], progress: p, rating: 1000, filter: all, now: now - 1.5 * DAY })?.puzzle.id, "far");
  assert.equal(choosePuzzle({ pool: [], progress: emptyProgress(), rating: 1000, filter: all, now }), null);
  assert.equal(choosePuzzle({ pool, progress: p, rating: 1000, filter: { kind: "weak", themes: ["skewer"] }, now }), null);
});

test("bandsFor picks only the bands within reach", () => {
  const index: PuzzleIndex = { source: "", bandSize: 200, bands: [400, 600, 800, 1000, 1200].map((min) => ({ min, file: `${min}.json`, count: 1 })) };
  assert.deepEqual(bandsFor(index, 1000), ["800.json", "1000.json"]);
  assert.deepEqual(bandsFor(index, 1150), ["1000.json", "1200.json"]);
  assert.deepEqual(bandsFor(index, 300), ["400.json"]);
});

test("stored progress is parsed defensively", () => {
  assert.deepEqual(parseProgress(null), emptyProgress());
  assert.deepEqual(parseProgress("not json"), emptyProgress());
  assert.deepEqual(parseProgress(JSON.stringify({ version: 2 })), emptyProgress());
  const good = recordResult(emptyProgress(), puzzle("a", 1000), false, 1000, now).progress;
  const raw = JSON.parse(JSON.stringify(good));
  raw.attempts.push({ puzzleId: 5 });
  raw.repeats.bogus = { id: "other" };
  assert.deepEqual(parseProgress(JSON.stringify(raw)), good);
});
