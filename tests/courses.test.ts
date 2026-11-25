import { test } from "node:test";
import assert from "node:assert/strict";
import { describeMove, moveNote, nameSentence } from "../lib/courses/describe";
import { fenAfter, isExpectedMove, learnerIndexes, numberedMoves, replayLine, shuffled } from "../lib/courses/line";
import { isCourseId, parseCourse, parseIndex } from "../lib/courses/load";
import {
  courseCounts,
  courseProgress,
  dueLines,
  emptyCourseProgress,
  emptyCoursesProgress,
  learnedKey,
  learnedPositions,
  lineSchedule,
  markLearned,
  nextDueAt,
  nextLineToLearn,
  recordReview,
  withBestDrill,
  withBestTime,
  withCourse,
} from "../lib/courses/progress";
import { parseCoursesProgress } from "../lib/courses/storage";
import { positionKey } from "../lib/openings/tree";
import type { Course } from "../lib/courses/types";

const DAY = 86_400_000;
const t0 = Date.parse("2026-03-01T09:00:00Z");
const at = (ms: number) => new Date(t0 + ms).toISOString();

const italian: Course = {
  id: "italian",
  name: "Italian Game",
  side: "white",
  blurb: "Quick development aimed at f7.",
  setup: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
  lineCount: 3,
  puzzleCount: 0,
  lines: [
    { id: "l01", name: "Giuoco Piano", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"] },
    { id: "l02", name: "Evans Gambit", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "b4"] },
    { id: "l03", name: "Two Knights", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5"] },
  ],
  ideas: { "e4 e5 Nf3 Nc6 Bc4 Bc5 b4": "White offers a pawn to gain time for c3 and d4." },
  names: {
    "e4": "King's Pawn Game",
    "e4 e5 Nf3 Nc6 Bc4": "Italian Game",
    "e4 e5 Nf3 Nc6 Bc4 Bc5": "Italian Game: Giuoco Piano",
    "e4 e5 Nf3 Nc6 Bc4 Bc5 b4": "Italian Game: Evans Gambit",
  },
};

test("replayLine gives fen before, san, uci, mover and prefix for each ply", () => {
  const steps = replayLine(italian.lines[0].moves);
  assert.equal(steps.length, 7);
  assert.deepEqual(
    steps.map((s) => [s.san, s.uci, s.mover]),
    [["e4", "e2e4", "white"], ["e5", "e7e5", "black"], ["Nf3", "g1f3", "white"], ["Nc6", "b8c6", "black"], ["Bc4", "f1c4", "white"], ["Bc5", "f8c5", "black"], ["c3", "c2c3", "white"]],
  );
  assert.equal(steps[0].fenBefore, "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  assert.equal(steps[1].fenBefore, steps[0].fenAfter);
  assert.equal(steps[4].prefix, "e4 e5 Nf3 Nc6 Bc4");
  assert.deepEqual(learnerIndexes(steps, "white"), [0, 2, 4, 6]);
  assert.deepEqual(learnerIndexes(steps, "black"), [1, 3, 5]);
});

test("replayLine names the illegal move", () => {
  assert.throws(() => replayLine(["e4", "e5", "Ke3"]), /Move 3 \(Ke3\)/);
});

test("promotion uci and expected-move matching", () => {
  const steps = replayLine(["a4", "h5", "a5", "h4", "a6", "h3", "axb7", "hxg2", "bxa8=N"]);
  assert.equal(steps.at(-1)!.uci, "b7a8n");
  assert.equal(isExpectedMove(steps.at(-1)!, "b7", "a8", "n"), true);
  assert.equal(isExpectedMove(steps.at(-1)!, "b7", "a8", "q"), false);
  assert.equal(isExpectedMove(steps[0], "a2", "a4"), true);
  assert.equal(isExpectedMove(steps[0], "a2", "a3"), false);
});

test("fenAfter and numberedMoves", () => {
  assert.equal(fenAfter([]), "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  assert.match(fenAfter(["e4"]), /^rnbqkbnr\/pppppppp\/8\/8\/4P3/);
  assert.equal(numberedMoves(["e4", "e5", "Nf3"]), "1. e4 e5 2. Nf3");
});

test("shuffled keeps every item and uses the given randomness", () => {
  const out = shuffled([1, 2, 3, 4], () => 0);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4]);
  assert.deepEqual(out, [2, 3, 4, 1]);
});

test("describeMove covers quiet moves, captures, castling, checks and promotion", () => {
  const start = fenAfter([]);
  assert.equal(describeMove(start, "Nf3"), "Knight to f3");
  assert.equal(describeMove(start, "e4"), "Pawn to e4");
  assert.equal(describeMove(fenAfter(["e4", "d5"]), "exd5"), "Pawn takes d5");
  assert.equal(describeMove(fenAfter(["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"]), "Bxc6"), "Bishop takes the knight on c6");
  assert.equal(describeMove(fenAfter(["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"]), "O-O"), "Castle kingside");
  assert.equal(describeMove(fenAfter(["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6"]), "Qxf7#"), "Queen takes the pawn on f7, checkmate");
  assert.equal(describeMove(fenAfter(["e4", "d5", "exd5", "Qxd5", "Nc3"]), "Qe5+"), "Queen to e5, with check");
  assert.equal(describeMove(fenAfter(["a4", "h5", "a5", "h4", "a6", "h3", "axb7", "hxg2"]), "bxa8=Q"), "Pawn takes a8, becoming a queen");
  assert.match(describeMove(fenAfter(["e4", "a6", "e5", "d5"]), "exd6"), /^Pawn takes on d6 en passant/);
});

test("nameSentence fires only when a new name is reached", () => {
  const evans = replayLine(italian.lines[1].moves);
  assert.equal(nameSentence(italian, evans, 0), "This is the King's Pawn Game.");
  assert.equal(nameSentence(italian, evans, 1), null);
  assert.equal(nameSentence(italian, evans, 4), "This is the Italian Game.");
  assert.equal(nameSentence(italian, evans, 6), "This is the Evans Gambit, part of the Italian Game.");
  const repeat = { names: { ...italian.names, "e4 e5": "King's Pawn Game" } };
  assert.equal(nameSentence(repeat, evans, 1), null);
});

test("moveNote joins description, name and idea", () => {
  const evans = replayLine(italian.lines[1].moves);
  const note = moveNote(italian, evans, 6);
  assert.equal(note.description, "Pawn to b4");
  assert.equal(note.idea, "White offers a pawn to gain time for c3 and d4.");
  assert.equal(note.text, "Pawn to b4. This is the Evans Gambit, part of the Italian Game. White offers a pawn to gain time for c3 and d4.");
  assert.equal(moveNote(italian, evans, 2).text, "Knight to f3.");
});

test("markLearned, recordReview and bests are pure and idempotent where they should be", () => {
  const p0 = emptyCourseProgress();
  const p1 = markLearned(p0, "l01");
  assert.deepEqual(p0.learned, []);
  assert.deepEqual(p1.learned, ["l01"]);
  assert.equal(markLearned(p1, "l01"), p1);
  const p2 = recordReview(p1, "l01", { at: at(0), clean: true });
  assert.deepEqual(p2.reviews.l01, [{ at: at(0), clean: true }]);
  assert.equal(p1.reviews.l01, undefined);
  assert.equal(withBestDrill(p2, 4).bestDrill, 4);
  assert.equal(withBestDrill(withBestDrill(p2, 4), 2).bestDrill, 4);
  assert.equal(withBestTime(p2, 7).bestTime, 7);
});

test("scheduling: never reviewed is due; wrong -> 15 min; clean on separate days -> 1, 3, 7 days", () => {
  let p = markLearned(emptyCourseProgress(), "l01");
  assert.deepEqual(dueLines(p, t0), ["l01"]);
  p = recordReview(p, "l01", { at: at(0), clean: false });
  assert.deepEqual(dueLines(p, t0 + 10 * 60_000), []);
  assert.equal(nextDueAt(p, t0), t0 + 15 * 60_000);
  assert.deepEqual(dueLines(p, t0 + 15 * 60_000), ["l01"]);
  p = recordReview(p, "l01", { at: at(DAY), clean: true });
  assert.equal(lineSchedule(p, "l01", t0 + DAY).dueAt, t0 + 2 * DAY);
  p = recordReview(p, "l01", { at: at(2 * DAY), clean: true });
  assert.equal(lineSchedule(p, "l01", t0 + 2 * DAY).dueAt, t0 + 5 * DAY);
  // A second clean run the same day does not lengthen the interval.
  p = recordReview(p, "l01", { at: at(2 * DAY + 60_000), clean: true });
  assert.equal(lineSchedule(p, "l01", t0 + 2 * DAY + 60_000).intervalDays, 3);
  p = recordReview(p, "l01", { at: at(6 * DAY), clean: true });
  assert.equal(lineSchedule(p, "l01", t0 + 6 * DAY).dueAt, t0 + 13 * DAY);
});

test("dueLines lists only learned lines, most overdue first; nextDueAt", () => {
  let p = emptyCourseProgress();
  assert.equal(nextDueAt(p, t0), null);
  p = markLearned(markLearned(p, "l01"), "l02");
  p = recordReview(p, "l01", { at: at(0), clean: true });
  p = recordReview(p, "l02", { at: at(-DAY), clean: false });
  p = recordReview(p, "l03", { at: at(-DAY), clean: false }); // not learned: ignored
  assert.deepEqual(dueLines(p, t0), ["l02"]);
  assert.deepEqual(dueLines(p, t0 + 2 * DAY), ["l02", "l01"]);
  p = recordReview(p, "l02", { at: at(0), clean: true });
  assert.deepEqual(dueLines(p, t0), []);
  assert.equal(nextDueAt(p, t0), t0 + DAY);
});

test("nextLineToLearn, learnedPositions and courseCounts", () => {
  let p = emptyCourseProgress();
  assert.equal(nextLineToLearn(italian, p)?.id, "l01");
  p = markLearned(p, "l01");
  assert.equal(nextLineToLearn(italian, p)?.id, "l02");
  const known = learnedPositions(italian, p);
  const evans = replayLine(italian.lines[1].moves);
  assert.ok(known.has(learnedKey(evans[4])), "Bc4 is known from line 1");
  assert.ok(!known.has(learnedKey(evans[6])), "b4 is new, even though line 1 played c3 in the same position");
  assert.equal(learnedKey(evans[4]), `${positionKey(evans[4].fenBefore)}|f1c4`);
  assert.equal(learnedPositions(italian, p, "l01").size, 0);
  assert.equal(nextLineToLearn(italian, markLearned(markLearned(p, "l02"), "l03")), null);
  const counts = courseCounts(markLearned(p, "gone"), italian.lines.map((l) => l.id), t0);
  assert.deepEqual(counts, { learned: 1, due: 1 });
  assert.equal(courseCounts(p, null, null).due, null);
});

test("courses container helpers", () => {
  const all = withCourse(emptyCoursesProgress(), "italian", markLearned(emptyCourseProgress(), "l01"));
  assert.deepEqual(courseProgress(all, "italian").learned, ["l01"]);
  assert.deepEqual(courseProgress(all, "other"), emptyCourseProgress());
});

test("parseCoursesProgress tolerates bad JSON and drops malformed parts", () => {
  assert.deepEqual(parseCoursesProgress(null), emptyCoursesProgress());
  assert.deepEqual(parseCoursesProgress("{oops"), emptyCoursesProgress());
  assert.deepEqual(parseCoursesProgress(JSON.stringify({ version: 2, courses: {} })), emptyCoursesProgress());
  const raw = JSON.stringify({
    version: 1,
    courses: {
      italian: { learned: ["l01", 5, "l01", "l02"], reviews: { l01: [{ at: at(0), clean: true }, { at: "nope", clean: true }, { at: at(1), clean: "yes" }], l02: "bad" }, bestDrill: 3.7, bestTime: -2 },
      broken: "x",
    },
  });
  const parsed = parseCoursesProgress(raw);
  assert.deepEqual(parsed.courses.italian, { learned: ["l01", "l02"], reviews: { l01: [{ at: at(0), clean: true }] }, bestDrill: 3, bestTime: 0 });
  assert.deepEqual(parsed.courses.broken, emptyCourseProgress());
});

test("parseIndex and parseCourse validate the data files", () => {
  assert.equal(isCourseId("italian-game"), true);
  assert.equal(isCourseId("../secrets"), false);
  const summary = { id: "italian", name: "Italian Game", side: "white", blurb: "b", setup: ["e4"], lineCount: 3, puzzleCount: 0 };
  const idx = parseIndex({ source: "Lichess", courses: [summary, { id: "bad" }] });
  assert.equal(idx.courses.length, 1);
  assert.throws(() => parseIndex({ nope: true }));
  const course = parseCourse({ ...italian, lines: [...italian.lines, { id: "x", name: "bad", moves: ["e4", "e4"] }, { id: "y" }] }, "italian");
  assert.deepEqual(course.lines.map((l) => l.id), ["l01", "l02", "l03"]);
  assert.throws(() => parseCourse(italian, "other"));
  assert.throws(() => parseCourse({ ...italian, lines: [] }, "italian"), /no playable lines/);
  assert.deepEqual(parseCourse({ ...italian, ideas: "x", names: null }, "italian").ideas, {});
});
