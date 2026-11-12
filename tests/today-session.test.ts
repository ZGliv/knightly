import { test } from "node:test";
import assert from "node:assert/strict";
import { isSameDay, localDay, previousDay } from "../lib/today/day";
import { buildSession, stepsDone, type SessionInput } from "../lib/today/session";

const NOW = new Date(2026, 10, 12, 15, 0).getTime();
const today = (h: number) => new Date(2026, 10, 12, h, 30).toISOString();
const yesterday = new Date(2026, 10, 11, 23, 30).toISOString();

const empty: SessionInput = {
  puzzleAttempts: [],
  leaks: null,
  repertoire: { prepared: 0, reviews: [] },
  masterGuessesToday: 0,
  playedGames: [],
};

test("local days use the user's own midnight", () => {
  assert.equal(localDay(new Date(2026, 0, 5, 0, 1).getTime()), "2026-01-05");
  assert.equal(previousDay("2026-03-01"), "2026-02-28");
  assert.equal(previousDay("2026-01-01"), "2025-12-31");
  assert.ok(isSameDay(today(0), NOW));
  assert.ok(!isSameDay(yesterday, NOW));
  assert.ok(!isSameDay("not a date", NOW));
  assert.ok(!isSameDay(undefined, NOW));
});

test("a brand-new visitor gets five steps, none done, with setup steps where tools are empty", () => {
  const steps = buildSession(empty, NOW);
  assert.deepEqual(steps.map((s) => s.id), ["puzzles", "leaks", "openings", "masters", "play"]);
  assert.equal(stepsDone(steps), 0);
  assert.equal(steps[1].title, "Link your chess.com account");
  assert.equal(steps[2].title, "Choose your opening moves");
  assert.ok(steps.every((s) => s.done === 0 && s.goal > 0 && s.href.startsWith("/")));
});

test("progress counts only today's records", () => {
  const steps = buildSession(
    {
      puzzleAttempts: [{ at: today(9) }, { at: today(10) }, { at: yesterday }, { at: today(11) }, { at: today(12) }, { at: today(13) }],
      leaks: {
        ready: 4,
        pending: 0,
        attempts: [
          { decisionId: "g1:10", at: today(9) },
          { decisionId: "g1:10", at: today(9) },
          { decisionId: "g2:20", at: today(10) },
          { decisionId: "g3:30", at: yesterday },
        ],
      },
      repertoire: { prepared: 12, reviews: [{ at: today(8) }, { at: yesterday }] },
      masterGuessesToday: 10,
      playedGames: [
        { result: "*", createdAt: today(8) },
        { result: "1-0", createdAt: yesterday, updatedAt: today(14) },
      ],
    },
    NOW,
  );
  const by = Object.fromEntries(steps.map((s) => [s.id, s]));
  assert.deepEqual([by.puzzles.done, by.puzzles.complete], [5, true]);
  assert.equal(by.leaks.title, "Fix 3 mistakes from your own games");
  assert.deepEqual([by.leaks.done, by.leaks.goal], [2, 3], "two distinct positions today");
  assert.deepEqual([by.openings.done, by.openings.goal], [1, 5]);
  assert.equal(by.masters.complete, true);
  assert.deepEqual([by.play.done, by.play.complete], [1, true], "only finished games count");
  assert.equal(stepsDone(steps), 3);
});

test("goals never ask for more than exists", () => {
  const steps = buildSession(
    { ...empty, leaks: { ready: 1, pending: 0, attempts: [] }, repertoire: { prepared: 2, reviews: [] } },
    NOW,
  );
  assert.equal(steps[1].goal, 1);
  assert.equal(steps[2].goal, 2);
  assert.equal(steps[2].title, "Drill your openings: 2 positions");
});

test("the leaks step says what to do when nothing is ready to practise", () => {
  const pending = buildSession({ ...empty, leaks: { ready: 0, pending: 3, attempts: [] } }, NOW)[1];
  assert.equal(pending.title, "Analyse your games");
  assert.match(pending.reason, /3 of your games are waiting/);
  const caughtUp = buildSession({ ...empty, leaks: { ready: 0, pending: 0, attempts: [] } }, NOW)[1];
  assert.equal(caughtUp.title, "Play some games");
  // Clearing the whole queue today still shows as practice done.
  const cleared = buildSession({ ...empty, leaks: { ready: 0, pending: 0, attempts: [{ decisionId: "a", at: today(9) }] } }, NOW)[1];
  assert.deepEqual([cleared.title, cleared.done, cleared.goal, cleared.complete], ["Fix 3 mistakes from your own games", 1, 1, true]);
});
