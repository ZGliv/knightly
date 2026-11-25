import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCoursePuzzles } from "../lib/courses/load";
import { lineLabels, moveLabel, replayLine } from "../lib/courses/line";
import { buildBook } from "../lib/courses/arena";
import {
  averageRating,
  belongsTo,
  candidateCourses,
  buildPersonalCourse,
  courseGames,
  exitSentence,
  matchCourses,
  PERSONAL_BLURB,
  pgnSans,
  playedGame,
  prepareGames,
  type PlayedGame,
} from "../lib/courses/personal";
import { emptyCourseProgress, emptyCoursesProgress, markLearned, mostDueCourse, withCourse } from "../lib/courses/progress";
import type { Course } from "../lib/courses/types";
import type { ImportedGame } from "../lib/insights/types";

type G = Parameters<typeof playedGame>[0];
const game = (moves: string, userColor: ImportedGame["userColor"], outcome: ImportedGame["outcome"], openingName = "Unknown opening", rating: number | null = null): G => ({
  pgn: `[Event "Live Chess"]\n[White "a"]\n[Black "b"]\n\n${moves} *`,
  userColor,
  outcome,
  openingName,
  white: { name: "a", rating: userColor === "white" ? rating : 1500 },
  black: { name: "b", rating: userColor === "black" ? rating : 1500 },
});
const played = (...games: G[]): PlayedGame[] => prepareGames(games);

const italian: Course = {
  id: "italian",
  name: "Italian Game",
  side: "white",
  blurb: "",
  setup: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
  lineCount: 2,
  puzzleCount: 0,
  lines: [
    { id: "l01", name: "Giuoco Piano", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"] },
    { id: "l02", name: "Two Knights", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "d3"] },
  ],
  ideas: {},
  names: {},
};

test("pgnSans strips headers, comments, variations, numbers, NAGs and the result", () => {
  const pgn = '[Event "x"]\n[Site "y"]\n\n1. e4 {[%clk 0:03:00]} 1... e5 (1... c5 2. Nf3 (2. c3)) 2. Nf3!? $1 Nc6 3. Bc4 1-0';
  assert.deepEqual(pgnSans(pgn), ["e4", "e5", "Nf3", "Nc6", "Bc4"]);
});

test("playedGame replays the opening, keeps points and the learner's rating, and drops unreadable games", () => {
  const g = playedGame(game("1. e4 e5 2. Nf3", "white", "draw", "King's Pawn", 1320))!;
  assert.deepEqual(g.sans, ["e4", "e5", "Nf3"]);
  assert.equal(g.keys.length, 4);
  assert.equal(g.points, 0.5);
  assert.equal(g.rating, 1320);
  assert.equal(g.opening, "King's Pawn");
  assert.equal(playedGame(game("1. e4 e5 2. Ke3", "white", "win")), null);
  assert.equal(playedGame(game("", "white", "win")), null);
  assert.equal(playedGame(game("1. e4 e5 2. Nf3 Nc6", "white", "win"), 2)!.sans.length, 2);
  assert.equal(averageRating([{ rating: 1000 }, { rating: null }, { rating: 1201 }]), 1101);
  assert.equal(averageRating([]), null);
});

const london: Course = {
  ...italian,
  id: "london",
  name: "London System",
  setup: ["d4"],
  lines: [
    { id: "l01", name: "London System", moves: ["d4", "d5", "Bf4", "Nf6", "e3"] },
    { id: "l02", name: "London System", moves: ["d4", "Nf6", "Bf4", "g6", "e3"] },
  ],
};

test("a game belongs to a course with his colour, the setup, and his first two moves from the course", () => {
  const belongs = (moves: string, color: "white" | "black", course: Course) => {
    const [g] = played(game(moves, color, "win"));
    return belongsTo(g, course, buildBook(course));
  };
  assert.equal(belongs("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5", "white", italian), true);
  assert.equal(belongs("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5", "black", italian), false);
  assert.equal(belongs("1. e4 e5 2. Nf3", "white", italian), false);
  // One-move setup: 1.d4 alone is not the London; his second move must be the course's.
  assert.equal(belongs("1. d4 d5 2. Bf4 e6", "white", london), true);
  assert.equal(belongs("1. d4 d5 2. Bg5", "white", london), false);
  assert.equal(belongs("1. d4 d5 2. c4", "white", london), false);
  // The opponent leaving before his second move also means the game is not in this course.
  assert.equal(belongs("1. d4 e5 2. dxe5", "white", london), false);
});

test("matchCourses counts games and score per course, most played first, and skips courses never played", () => {
  const games = played(
    game("1. e4 e5 2. Nf3 Nc6 3. Bc4", "white", "win"),
    game("1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6", "white", "draw"),
    game("1. e4 e5 2. Nf3 Nc6 3. Bb5", "white", "loss"),
    game("1. e4 e5 2. Nf3 Nc6 3. Bb5", "white", "loss"),
    game("1. e4 e5 2. Nf3 Nc6 3. Bb5", "white", "win"),
    game("1. d4 d5 2. Bg5", "white", "win"),
  );
  const ruy = { ...italian, id: "ruy", setup: ["e4", "e5", "Nf3", "Nc6", "Bb5"], lines: [{ id: "l01", name: "Ruy", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"] }] };
  assert.deepEqual(matchCourses([italian, ruy, london], games), [
    { id: "ruy", games: 3, points: 1, score: 33 },
    { id: "italian", games: 2, points: 1.5, score: 75 },
  ]);
  assert.deepEqual(candidateCourses([italian, ruy, london], games).map((c) => c.id), ["italian", "ruy", "london"]);
});

test("exits at the same move number in different positions are separate rows, told apart by the move before", () => {
  const games = played(
    game("1. d4 d5 2. Bf4 Nf6 3. Nf3", "white", "win"),
    game("1. d4 d5 2. Bf4 Nf6 3. Nf3", "white", "loss"),
    game("1. d4 Nf6 2. Bf4 g6 3. Nf3", "white", "win"),
  );
  const report = courseGames(london, games);
  assert.equal(report.games, 3);
  assert.deepEqual(report.exits.map((e) => [e.after, e.games, e.lineId]), [["2...Nf6", 2, "l01"], ["2...g6", 1, "l02"]]);
  assert.equal(exitSentence(report.exits[0], 3), "After 2...Nf6, at move 3 you played Nf3 in 2 of 3 games. The course plays e3.");
  assert.equal(exitSentence(report.exits[1], 3), "After 2...g6, at move 3 you played Nf3 in 1 of 3 games. The course plays e3.");
});

test("courseGames finds where the learner leaves the course, ignoring opponent deviations", () => {
  const games = played(
    // Leaves at move 4 with d4 instead of c3, three times.
    game("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d4", "white", "win"),
    game("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d4 exd4", "white", "loss"),
    game("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d4", "white", "draw"),
    // Leaves at move 4 with Ng5 instead of d3.
    game("1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5", "white", "win"),
    // Opponent leaves first: not the learner's exit.
    game("1. e4 e5 2. Nf3 Nc6 3. Bc4 Be7 4. d4", "white", "win"),
    // Follows the course to its end.
    game("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6", "white", "win"),
    // Other colour and other openings do not count.
    game("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d4", "black", "win"),
    game("1. d4 d5", "white", "win"),
  );
  const report = courseGames(italian, games);
  assert.equal(report.games, 6);
  assert.equal(report.stayed, 1);
  assert.equal(report.opponentLeft, 1);
  assert.equal(report.youLeft, 4);
  assert.equal(report.exits.length, 2);
  const [top, next] = report.exits;
  assert.equal(top.played, "d4");
  assert.equal(top.move, 4);
  assert.equal(top.games, 3);
  assert.equal(top.score, 50);
  assert.deepEqual(top.courseSans, ["c3"]);
  assert.equal(top.lineId, "l01");
  assert.equal(exitSentence(top, report.games), "After 3...Bc5, at move 4 you played d4 in 3 of 6 games. The course plays c3.");
  assert.equal(next.played, "Ng5");
  assert.equal(next.lineId, "l02");
  assert.equal(courseGames(italian, games, 1).exits.length, 1);
});

function repeatGames(moves: string, count: number, color: ImportedGame["userColor"], opening: string): G[] {
  return Array.from({ length: count }, (_, i) => game(moves, color, i % 2 ? "win" : "loss", opening));
}

test("buildPersonalCourse: his most played move, replies seen twice, lines end on his move", () => {
  const games = [
    ...repeatGames("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6", 4, "white", "Italian Game"),
    ...repeatGames("1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. c3", 3, "white", "Italian Game: Two Knights"),
    ...repeatGames("1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3", 2, "white", "Sicilian Defense"),
    // A reply seen once is not a line.
    game("1. e4 e6 2. d4 d5 3. Nc3 Nf6 4. Bg5 Be7 5. e5", "white", "win", "French Defense"),
    // He played 2. Bc4 once against e5: his most played move (Nf3) wins.
    game("1. e4 e5 2. Bc4 Nf6 3. d3", "white", "win", "Bishop's Opening"),
    // Black games are a different course.
    ...repeatGames("1. d4 d5 2. c4 e6", 5, "black", "Queen's Gambit Declined"),
  ];
  const course = buildPersonalCourse(prepareGames(games), "white")!;
  assert.equal(course.id, "my-white");
  assert.equal(course.name, "Your White openings");
  assert.equal(course.blurb, PERSONAL_BLURB);
  assert.deepEqual(course.ideas, {});
  assert.equal(course.lines.length, 3);
  assert.equal(course.lineCount, 3);
  assert.deepEqual(course.setup, ["e4"]);
  const [first, second, third] = course.lines;
  assert.deepEqual(first.moves, ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d3"]);
  assert.equal(first.name, "Italian Game");
  assert.deepEqual(second.moves, ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "d3", "Bc5", "c3"]);
  assert.equal(second.name, "Italian Game: Two Knights");
  assert.deepEqual(third.moves, ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3"]);
  for (const line of course.lines) {
    const steps = replayLine(line.moves);
    assert.equal(steps.at(-1)!.mover, "white");
    assert.ok(steps.filter((s) => s.mover === "white").length >= 4);
    assert.match(line.id, /^g[0-9a-z]+$/);
  }
  assert.equal(new Set(course.lines.map((l) => l.id)).size, 3);
  // Ids depend only on the moves, so progress survives new imports.
  assert.equal(buildPersonalCourse(prepareGames([...games, ...games]), "white")!.lines[0].id, first.id);
});

test("buildPersonalCourse skips a colour with fewer than 3 lines and lines with fewer than 4 of his moves", () => {
  const few = [
    ...repeatGames("1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5", 3, "black", "QGD"),
    ...repeatGames("1. e4 e5 2. Nf3 Nc6", 3, "black", "Open Game"),
  ];
  assert.equal(buildPersonalCourse(prepareGames(few), "black"), null);
  assert.equal(buildPersonalCourse([], "white"), null);
});

test("buildPersonalCourse caps lines at 12 moves each", () => {
  const long = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 a6 8. a4 Ba7 9. h3 h6 10. Nbd2 Re8 11. Nf1 Be6 12. Bxe6 Rxe6 13. Ng3 d5";
  const branchA = "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3";
  const branchB = "1. e4 e6 2. d4 d5 3. Nc3 Nf6 4. Bg5 Be7 5. e5";
  const course = buildPersonalCourse(
    prepareGames([...repeatGames(long, 2, "white", "Italian"), ...repeatGames(branchA, 2, "white", "Sicilian"), ...repeatGames(branchB, 2, "white", "French")]),
    "white",
  )!;
  assert.equal(course.lines.length, 3);
  const italianLine = course.lines.find((l) => l.moves[1] === "e5")!;
  assert.equal(italianLine.moves.length, 23);
  assert.equal(italianLine.moves.at(-1), "Bxe6");
});

test("mostDueCourse picks the course with the most learned lines due", () => {
  let all = emptyCoursesProgress();
  all = withCourse(all, "italian", markLearned(emptyCourseProgress(), "l01"));
  all = withCourse(all, "london", markLearned(markLearned(emptyCourseProgress(), "l01"), "l02"));
  assert.deepEqual(mostDueCourse(all, Date.parse("2026-03-01T09:00:00Z")), { id: "london", due: 2 });
  assert.equal(mostDueCourse(emptyCoursesProgress(), 0), null);
});

test("parseCoursePuzzles drops malformed puzzles and sorts by rating", () => {
  const ok = (id: string, rating: number) => ({ id, fen: "8/8/8/8/8/8/8/8 w - - 0 1", moves: ["a1a2", "a2a3"], rating, themes: [] });
  const parsed = parseCoursePuzzles([ok("b", 1500), { id: "bad" }, ok("a", 900)]);
  assert.deepEqual(parsed.map((p) => p.id), ["a", "b"]);
  assert.throws(() => parseCoursePuzzles({}));
});

test("lineLabels tells apart lines that share a name by their first distinguishing move", () => {
  const labels = lineLabels([
    { id: "a", name: "London System", moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6"] },
    { id: "b", name: "London System", moves: ["d4", "d5", "Bf4", "Nf6", "e3", "Bf5"] },
    { id: "c", name: "Other", moves: ["d4", "Nf6"] },
    { id: "d", name: "London System", moves: ["d4", "d5", "Bf4", "c5"] },
    { id: "e", name: "London System", moves: ["d4", "d5", "Bf4", "Nf6", "e3", "Bf5", "c4"] },
  ]);
  assert.equal(labels.get("a"), "London System");
  assert.equal(labels.get("b"), "London System (3...Bf5)");
  assert.equal(labels.get("c"), "Other");
  assert.equal(labels.get("d"), "London System (2...c5)");
  assert.equal(labels.get("e"), "London System (4.c4)");
  assert.equal(moveLabel(0, "e4"), "1.e4");
  assert.equal(moveLabel(5, "Bf5"), "3...Bf5");
});
