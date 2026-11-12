import { test } from "node:test";
import assert from "node:assert/strict";
import { expectedScore, initialRating, kFactor, nextRating, START_RATING } from "../lib/puzzles/rating";

test("expected score follows the Elo curve", () => {
  assert.equal(expectedScore(1500, 1500), 0.5);
  assert.ok(Math.abs(expectedScore(1500, 1900) - 1 / 11) < 1e-9);
});

test("K is 32 for the first 20 rated puzzles, then 16", () => {
  assert.equal(kFactor(0), 32);
  assert.equal(kFactor(19), 32);
  assert.equal(kFactor(20), 16);
});

test("solving an equal puzzle gains half of K; failing loses it", () => {
  assert.equal(nextRating(1000, 1000, true, 0), 1016);
  assert.equal(nextRating(1000, 1000, false, 0), 984);
  assert.equal(nextRating(1000, 1000, true, 25), 1008);
  // Harder puzzles reward more.
  assert.ok(nextRating(1000, 1200, true, 0) - 1000 > nextRating(1000, 800, true, 0) - 1000);
});

test("initial rating averages the player's own side, ignoring missing ratings", () => {
  assert.equal(initialRating([]), START_RATING);
  const g = (userColor: "white" | "black", w: number | null, b: number | null) => ({ userColor, white: { rating: w }, black: { rating: b } });
  assert.equal(initialRating([g("white", 1200, 2000), g("black", 2000, 1300), g("white", null, 900)]), 1250);
  assert.equal(initialRating([g("white", null, 1500)]), START_RATING);
});
