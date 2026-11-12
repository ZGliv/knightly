import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import type { PlayerColor } from "../types/game";
import type { GamePhase } from "../lib/utils/phase";
import type { GameAssessment, ImportedGame, Leak, LeakCategory, MoveStat } from "../lib/insights/types";
import { buildReport, CATEGORY_COPY } from "../lib/insights/report";
import { leakToDecision, rankPuzzles } from "../lib/insights/puzzles";
import { replayGame } from "../lib/insights/replay";
import { decisionBoard, type RetryAttempt } from "../lib/learning/coach/model";
import {
  analysisProgress,
  openingVerdict,
  practiceQueue,
  readSetAside,
  sharesOf,
  timeLeftText,
  writeSetAside,
} from "../components/insights/shared";

const DAY = 86_400_000;
const BASE_TIME = Date.UTC(2026, 9, 1);

function game(id: string, overrides: Partial<ImportedGame> = {}): ImportedGame {
  return {
    id,
    source: "chesscom",
    url: `https://www.chess.com/game/live/${id}`,
    pgn: "1. e4 e5 *",
    endTime: BASE_TIME,
    timeClass: "blitz",
    baseSec: 300,
    incSec: 0,
    rated: true,
    white: { name: "me", rating: 1200 },
    black: { name: "them", rating: 1210 },
    userColor: "white",
    outcome: "win",
    resultCode: "win",
    termination: "won by resignation",
    ecoCode: "C20",
    openingName: "King's Pawn Opening",
    openingFamily: "King's Pawn Opening",
    plyCount: 60,
    clocks: [],
    ...overrides,
  };
}

/** User moves for one game: `counts` moves in each phase, in phase order, on the user's plies. */
function moves(color: PlayerColor, counts: Partial<Record<GamePhase, number>>, winBefore = 50): MoveStat[] {
  const result: MoveStat[] = [];
  let index = 0;
  for (const phase of ["opening", "middlegame", "endgame"] as GamePhase[]) {
    for (let i = 0; i < (counts[phase] ?? 0); i++, index++) {
      result.push({ ply: index * 2 + (color === "white" ? 1 : 2), phase, winBefore, winAfter: winBefore, drop: 0, clockSec: null, spentSec: null });
    }
  }
  return result;
}

function leak(gameId: string, ply: number, overrides: Partial<Leak> = {}): Leak {
  const drop = overrides.drop ?? 20;
  return {
    id: `${gameId}:${ply}`,
    gameId,
    ply,
    moveNumber: Math.ceil(ply / 2),
    userColor: ply % 2 ? "white" : "black",
    phase: "middlegame",
    category: "hung-material",
    severity: drop >= 15 ? "blunder" : "mistake",
    winBefore: 60,
    winAfter: 60 - drop,
    drop,
    fenBefore: "",
    fenAfter: "",
    playedSan: "",
    playedUci: "",
    bestSan: "",
    bestUci: "",
    bestLine: [],
    refutation: [],
    materialSwing: 0,
    clockSec: null,
    spentSec: null,
    timeTrouble: false,
    hasty: false,
    ...overrides,
  };
}

function assessment(gameId: string, overrides: Partial<GameAssessment> = {}): GameAssessment {
  return { gameId, moves: moves("white", { opening: 10, middlegame: 10 }), leaks: [], peakWin: 60, lowWin: 40, clearlyWinning: false, clearlyLosing: false, blownWin: false, savedGame: false, ...overrides };
}

/** Five analysed draws with clean moves: a neutral base for headline triggers. */
function baseSet(count = 5) {
  const games = Array.from({ length: count }, (_, i) => game(`g${i}`, { outcome: "draw", resultCode: "agreed", endTime: BASE_TIME + i * DAY }));
  const assessments = games.map((g) => assessment(g.id));
  return { games, assessments };
}

const keys = (report: ReturnType<typeof buildReport>) => report.headlines.map((h) => h.key);

test("totals, phases, categories, conversion and openings are counted from the right games", () => {
  const games = [
    game("a", { endTime: BASE_TIME + 7 * DAY, outcome: "win", openingFamily: "Sicilian Defense", userColor: "white", timeClass: "blitz" }),
    game("b", { endTime: BASE_TIME + 6 * DAY, outcome: "loss", resultCode: "timeout", openingFamily: "Sicilian Defense", userColor: "black", timeClass: "blitz" }),
    game("c", { endTime: BASE_TIME + 5 * DAY, outcome: "draw", resultCode: "repetition", openingFamily: "Sicilian Defense", userColor: "white", timeClass: "rapid" }),
    game("d", { endTime: BASE_TIME + 4 * DAY, outcome: "loss", resultCode: "resigned", openingFamily: "Italian Game", userColor: "white", timeClass: "rapid" }),
    game("e", { endTime: BASE_TIME + 3 * DAY, outcome: "win", openingFamily: "Italian Game", userColor: "black", timeClass: "bullet" }),
    game("f", { endTime: BASE_TIME + 2 * DAY, outcome: "loss", resultCode: "checkmated", openingFamily: "Italian Game", userColor: "black", timeClass: "blitz" }),
    game("g", { endTime: BASE_TIME + 1 * DAY, outcome: "draw", resultCode: "stalemate", openingFamily: "French Defense", userColor: "black", timeClass: "blitz" }),
    game("h", { endTime: BASE_TIME, outcome: "loss", resultCode: "timeout", openingFamily: "French Defense", userColor: "black", timeClass: "blitz" }),
  ];
  const assessments: GameAssessment[] = [
    // Won from a winning position: converted. After-opening win% read at ply 25 (first white move >= 24).
    assessment("a", { moves: moves("white", { opening: 10, middlegame: 10 }, 70), peakWin: 90, clearlyWinning: true, leaks: [leak("a", 15, { drop: 30, category: "hung-material", timeTrouble: true, clockSec: 20 })] }),
    // Lost on time from a losing position: counts as "losing", not saved.
    assessment("b", { moves: moves("black", { opening: 10, middlegame: 5, endgame: 5 }, 40), lowWin: 10, clearlyLosing: true, leaks: [leak("b", 30, { drop: 12, category: "missed-material", phase: "endgame" }), leak("b", 20, { drop: 18, category: "hung-material" })] }),
    // Drawn from winning: blown.
    assessment("c", { moves: moves("white", { opening: 6 }, 55), peakWin: 92, clearlyWinning: true, blownWin: true, leaks: [leak("c", 9, { drop: 40, category: "quiet-mistake", phase: "opening", hasty: true, clockSec: 200 })] }),
    // Lost from winning: blown.
    assessment("d", { moves: moves("white", { opening: 10, middlegame: 10 }), peakWin: 88, clearlyWinning: true, blownWin: true, leaks: [leak("d", 21, { drop: 25, category: "allowed-mate" })] }),
    // Won from losing: saved.
    assessment("e", { moves: moves("black", { opening: 10, middlegame: 10 }), lowWin: 5, clearlyLosing: true, savedGame: true }),
    assessment("f", { moves: moves("black", { opening: 10, middlegame: 10 }) }),
    // Assessment for a game that was never imported is ignored.
    assessment("ghost", { leaks: [leak("ghost", 11, { drop: 99 })] }),
  ];
  const report = buildReport("me", games, assessments);

  assert.equal(report.username, "me");
  assert.equal(report.games, 8);
  assert.equal(report.analysed, 6);
  assert.equal(report.from, BASE_TIME);
  assert.equal(report.to, BASE_TIME + 7 * DAY);
  assert.deepEqual(report.record, { games: 8, win: 2, draw: 2, loss: 4 });
  assert.deepEqual(report.byColor.white, { games: 3, win: 1, draw: 1, loss: 1 });
  assert.deepEqual(report.byColor.black, { games: 5, win: 1, draw: 1, loss: 3 });
  assert.deepEqual(report.byTimeClass, {
    blitz: { games: 5, win: 1, draw: 1, loss: 3 },
    rapid: { games: 2, win: 0, draw: 1, loss: 1 },
    bullet: { games: 1, win: 1, draw: 0, loss: 0 },
  });
  assert.equal("daily" in report.byTimeClass, false);

  // Moves: opening 10+10+6+10+10+10, middlegame 10+5+10+10+10, endgame 5.
  assert.equal(report.phases.opening.moves, 56);
  assert.equal(report.phases.middlegame.moves, 45);
  assert.equal(report.phases.endgame.moves, 5);
  assert.deepEqual([report.phases.middlegame.mistakes, report.phases.middlegame.blunders], [0, 3]);
  assert.deepEqual([report.phases.endgame.mistakes, report.phases.endgame.blunders], [1, 0]);
  assert.equal(report.phases.endgame.leaksPer100, 20);
  assert.equal(report.phases.middlegame.leaksPer100, 6.7);

  assert.deepEqual(report.categories.map((c) => [c.category, c.count, c.totalDrop, c.games]), [
    ["hung-material", 2, 48, 2],
    ["quiet-mistake", 1, 40, 1],
    ["allowed-mate", 1, 25, 1],
    ["missed-material", 1, 12, 1],
  ]);
  assert.deepEqual(report.categories[0].leakIds, ["a:15", "b:20"]);

  assert.deepEqual(report.time, { lostOnTime: 2, leaks: 5, clockedLeaks: 2, inTimeTrouble: 1, hasty: 1 });
  assert.deepEqual(report.conversion, { winning: 3, converted: 1, blownGameIds: ["c", "d"], losing: 2, saved: 1 });

  assert.deepEqual(report.openings.map((o) => [o.family, o.color, o.games]), [
    ["French Defense", "black", 2],
    ["Italian Game", "black", 2],
    ["Sicilian Defense", "white", 2],
    ["Italian Game", "white", 1],
    ["Sicilian Defense", "black", 1],
  ]);
  const sicilianWhite = report.openings.find((o) => o.family === "Sicilian Defense" && o.color === "white")!;
  assert.equal(sicilianWhite.score, 75);
  // Game a: first white move at ply >= 24 has winBefore 70; game c is shorter, so its last move (55) counts.
  assert.equal(sicilianWhite.winAfterOpening, 62.5);
  // No analysed game in the group: neutral 50.
  assert.equal(report.openings.find((o) => o.family === "French Defense")!.winAfterOpening, 50);
  assert.equal(report.openings.find((o) => o.family === "French Defense")!.score, 25);

  // Six analysed games: headlines are produced, at most three, ranked by cost.
  assert.ok(report.headlines.length > 0 && report.headlines.length <= 3);
  assert.equal(report.headlines[0].key, "blown-wins");
  for (const headline of report.headlines) {
    assert.ok(headline.title && headline.detail && headline.advice);
    assert.doesNotMatch(`${headline.title} ${headline.detail} ${headline.advice}`, /NaN|undefined|Infinity/);
  }
});

test("no headlines until five games are analysed", () => {
  const { games, assessments } = baseSet(6);
  assessments.forEach((a, i) => { a.leaks = [leak(a.gameId, 11 + i * 2, { drop: 30, timeTrouble: true })]; a.blownWin = i < 3; });
  assert.equal(buildReport("me", games, assessments.slice(0, 4)).headlines.length, 0);
  assert.ok(buildReport("me", games, assessments.slice(0, 5)).headlines.length > 0);
});

test("top category headline appears only when there are leaks", () => {
  const clean = baseSet();
  assert.deepEqual(keys(buildReport("me", clean.games, clean.assessments)), []);
  const { games, assessments } = baseSet();
  assessments[0].leaks = [leak("g0", 11, { drop: 20, category: "missed-material" }), leak("g0", 13, { drop: 30, category: "missed-material" })];
  assessments[1].leaks = [leak("g1", 11, { drop: 25, category: "hung-material" })];
  const report = buildReport("me", games, assessments);
  const headline = report.headlines.find((h) => h.key === "category:missed-material")!;
  assert.ok(headline);
  assert.equal(headline.title, `${CATEGORY_COPY["missed-material"].label}: 2 times in 1 game`);
  assert.match(headline.detail, /25 points out of 100/);
  assert.deepEqual(headline.leakIds, ["g0:13", "g0:11"]);
  assert.ok(!keys(report).includes("category:hung-material"));
});

test("time headline needs a quarter of the leaks in time trouble or played instantly", () => {
  const build = (flagged: number, total: number) => {
    const { games, assessments } = baseSet();
    assessments[0].leaks = Array.from({ length: total }, (_, i) => leak("g0", 11 + i * 2, { drop: 20, category: "quiet-mistake", hasty: i < flagged, clockSec: 100 }));
    return buildReport("me", games, assessments);
  };
  const yes = build(1, 4);
  const headline = yes.headlines.find((h) => h.key === "time")!;
  assert.ok(headline);
  assert.equal(headline.title, "1 of your 4 mistakes came in time trouble or on instant moves");
  assert.match(headline.detail, /^0 were made with little time left on your clock, and 1 was played almost instantly/);
  assert.match(headline.advice, /ten seconds/);
  assert.ok(!keys(build(1, 5)).includes("time"));
});

test("weakest phase headline needs 30 moves and a rate 1.5 times the best phase", () => {
  const build = (middlegameLeaks: number, endgameMoves = 0, endgameLeaks = 0) => {
    const { games, assessments } = baseSet();
    // Each game: 10 opening and 10 middlegame moves, so 50 of each across five games.
    assessments[0].moves = moves("white", { opening: 10, middlegame: 10, endgame: endgameMoves });
    assessments[0].leaks = [
      leak("g0", 1, { phase: "opening", drop: 6, category: "quiet-mistake", severity: "mistake" }),
      ...Array.from({ length: middlegameLeaks }, (_, i) => leak("g0", 21 + i * 2, { phase: "middlegame", drop: 6, category: "quiet-mistake", severity: "mistake" })),
      ...Array.from({ length: endgameLeaks }, (_, i) => leak("g0", 41 + i * 2, { phase: "endgame", drop: 6, category: "quiet-mistake", severity: "mistake" })),
    ];
    return buildReport("me", games, assessments);
  };
  const yes = build(3);
  const headline = yes.headlines.find((h) => h.key === "phase:middlegame")!;
  assert.ok(headline);
  assert.equal(headline.title, "Mistakes in the middlegame: 6 per 100 moves");
  assert.match(headline.detail, /3 times your opening rate of 2 per 100 moves/);
  assert.ok(!keys(build(1)).some((k) => k.startsWith("phase:")));
  // An endgame with only 10 moves never counts, however bad it looks.
  assert.ok(!keys(build(1, 10, 5)).some((k) => k.startsWith("phase:")));
});

test("thrown-away wins headline needs two blown games and a 20% blow rate", () => {
  const build = (blown: number, converted: number) => {
    const { games, assessments } = baseSet(Math.max(5, blown + converted));
    assessments.forEach((a, i) => {
      if (i < blown) { a.blownWin = true; a.clearlyWinning = true; a.peakWin = 90; }
      else if (i < blown + converted) { games[i].outcome = "win"; a.clearlyWinning = true; a.peakWin = 95; }
    });
    return buildReport("me", games, assessments);
  };
  const yes = build(2, 3);
  const headline = yes.headlines.find((h) => h.key === "blown-wins")!;
  assert.ok(headline);
  assert.equal(headline.title, "Winning positions not won: 2 of 5");
  assert.ok(!keys(build(1, 1)).includes("blown-wins"));
  assert.ok(!keys(build(2, 9)).includes("blown-wins"));
});

test("problem opening headline needs four analysed games scoring 15 points under the overall score", () => {
  const build = (analysedInGroup: number) => {
    const games = [
      ...Array.from({ length: 4 }, (_, i) => game(`bad${i}`, { outcome: "loss", resultCode: "resigned", openingFamily: "Caro-Kann Defense", userColor: "black", endTime: BASE_TIME + i })),
      ...Array.from({ length: 6 }, (_, i) => game(`good${i}`, { outcome: "win", openingFamily: "London System", endTime: BASE_TIME + 10 + i })),
    ];
    const analysed = [...games.slice(0, analysedInGroup), ...games.slice(4)];
    return buildReport("me", games, analysed.map((g) => assessment(g.id, { moves: moves(g.userColor, { opening: 10, middlegame: 10 }) })));
  };
  const yes = build(4);
  const headline = yes.headlines.find((h) => h.key === "opening:black:Caro-Kann Defense")!;
  assert.ok(headline);
  assert.equal(headline.title, "Caro-Kann Defense as Black: 0% score in 4 games");
  assert.match(headline.detail, /60 points below your overall score of 60%/);
  assert.ok(!keys(build(3)).some((k) => k.startsWith("opening:")));
});

test("headlines are capped at three and ranked by cost", () => {
  const { games, assessments } = baseSet(8);
  assessments.forEach((a, i) => {
    a.leaks = [leak(a.gameId, 21, { drop: 30, category: "hung-material", timeTrouble: true, clockSec: 5 })];
    if (i < 4) { a.blownWin = true; a.clearlyWinning = true; a.peakWin = 90; }
  });
  const report = buildReport("me", games, assessments);
  assert.equal(report.headlines.length, 3);
  // hung-material 240, time 240, blown 200, middlegame phase 240: blown is the cheapest and drops out.
  assert.deepEqual(keys(report), ["category:hung-material", "phase:middlegame", "time"]);
});

test("every category has label, meaning and advice copy", () => {
  const all: LeakCategory[] = ["missed-mate", "allowed-mate", "hung-material", "missed-material", "quiet-mistake"];
  for (const category of all) {
    const copy = CATEGORY_COPY[category];
    assert.ok(copy.label.length > 3 && /[.?]$/.test(copy.meaning) && /[.?]$/.test(copy.advice), category);
  }
});

const OPERA_PGN = `[Event "Paris"]
[Site "Paris FRA"]
[Date "1858.??.??"]
[White "Morphy, Paul"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]
[ECO "C41"]

1. e4 {[%clk 0:05:00]} 1... e5 {[%clk 0:05:00]} 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

function realLeak(target: ImportedGame, ply: number): Leak {
  const replay = replayGame(target.pgn);
  return leak(target.id, ply, {
    userColor: target.userColor,
    fenBefore: replay.fens[ply - 1],
    fenAfter: replay.fens[ply],
    playedSan: replay.sans[ply - 1],
    playedUci: replay.ucis[ply - 1],
  });
}

test("leaks become coach decisions that replay to the exact position for both colours", () => {
  for (const [color, ply, san] of [["white", 19, "Nxb5"], ["black", 6, "Bg4"]] as const) {
    const target = game(`chesscom-opera-${color}`, { pgn: OPERA_PGN, userColor: color, plyCount: 33, openingName: "Philidor Defense", endTime: Date.UTC(2026, 9, 20, 18, 30) });
    const source = leakToDecision(realLeak(target, ply), target);
    assert.equal(source.id, `${target.id}:${ply}`);
    assert.equal(source.playedSan, san);
    assert.equal(source.playerColor, color);
    assert.equal(source.prefix.length, ply - 1);
    assert.equal(source.date, "2026-10-20T18:30:00.000Z");
    assert.equal(source.opening, "Philidor Defense");
    const board = decisionBoard(source);
    assert.equal(board.fen(), source.fenBefore);
    board.move(source.playedSan);
    assert.equal(board.fen(), source.fenAfter);
    assert.equal(new Chess(source.fenAfter).fen(), source.fenAfter);
  }
});

test("leakToDecision rejects leaks that do not match their game", () => {
  const target = game("chesscom-opera", { pgn: OPERA_PGN, plyCount: 33 });
  assert.throws(() => leakToDecision(realLeak(target, 19), { ...target, id: "chesscom-other" }));
  assert.throws(() => leakToDecision({ ...realLeak(target, 19), playedUci: "a2a3" }, target));
  assert.throws(() => leakToDecision({ ...realLeak(target, 19), ply: 40 }, target));
  assert.throws(() => leakToDecision({ ...realLeak(target, 19), userColor: "black" }, target));
});

function attempt(decisionId: string, at: number, outcome: RetryAttempt["outcome"]): RetryAttempt {
  return { id: `${decisionId}@${at}`, decisionId, gameId: decisionId.split(":")[0], playerColor: "white", ply: 1, fenBefore: "", playedUci: "", at: new Date(at).toISOString(), triedSan: "", triedUci: "", hints: 0, misses: 0, outcome, loss: null, evaluation: null };
}

test("puzzles: untried biggest drops first, then unsolved, then solved ones only when due", () => {
  const now = BASE_TIME + 30 * DAY;
  const leaks = [
    leak("a", 11, { drop: 30 }),
    leak("b", 11, { drop: 20 }),
    leak("c", 11, { drop: 40 }),
    leak("d", 11, { drop: 25 }),
    leak("e", 11, { drop: 35 }),
    leak("f", 11, { drop: 50 }),
  ];
  const attempts = [
    attempt("a:11", now + DAY, "independent"), // in the future: ignored, so a counts as untried
    attempt("b:11", now - 3 * DAY, "independent"),
    attempt("b:11", now - DAY, "not-yet"),
    attempt("d:11", now - 2 * DAY, "independent"), // one solve: due again after 1 day
    attempt("e:11", now - 60 * 60_000, "independent"), // solved an hour ago: not due
    attempt("f:11", now - 2 * DAY, "supported"),
  ];
  assert.deepEqual(rankPuzzles(leaks, attempts, now).map((l) => l.gameId), ["c", "a", "f", "b", "d"]);
  // Two days later the solved ones are due, earliest due date first.
  assert.deepEqual(rankPuzzles(leaks, attempts, now + 2 * DAY).map((l) => l.gameId), ["c", "f", "b", "d", "e", "a"]);
  // Two spaced independent solves push the next review to three days.
  const spaced = [attempt("d:11", now - 4 * DAY, "independent"), attempt("d:11", now - 2 * DAY, "independent")];
  assert.deepEqual(rankPuzzles([leaks[3]], spaced, now), []);
  assert.deepEqual(rankPuzzles([leaks[3]], spaced, now + DAY).map((l) => l.gameId), ["d"]);
  // Deterministic for a fixed now.
  assert.deepEqual(rankPuzzles(leaks, attempts, now), rankPuzzles([...leaks].reverse(), [...attempts].reverse(), now));
});

test("practice queue: a set-aside position is never counted as ready, though it never gets an attempt", () => {
  const now = BASE_TIME + 30 * DAY;
  const aside = leak("a", 11, { drop: 40 }); // the fresh check found nothing clear: no attempt is ever saved
  const solved = leak("b", 11, { drop: 30 });
  const attempts = [attempt("b:11", now - 60 * 60_000, "independent")]; // solved an hour ago: not due
  // rankPuzzles alone treats the set-aside position as never tried, so the page would offer an empty set.
  assert.equal(rankPuzzles([aside, solved], attempts, now).length, 1);
  assert.deepEqual(practiceQueue([aside, solved], attempts, new Set(["a:11"]), now), []);
  // Positions not set aside keep their place and order.
  const fresh = leak("c", 11, { drop: 20 });
  assert.deepEqual(
    practiceQueue([aside, solved, fresh], attempts, new Set(["a:11"]), now).map((l) => l.id),
    ["c:11"],
  );
});

test("practice queue: the set-aside list survives a reload and tolerates missing or broken storage", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) },
  });
  try {
    assert.deepEqual([...readSetAside()], []);
    writeSetAside(new Set(["a:11", "b:13"]));
    assert.deepEqual([...readSetAside()], ["a:11", "b:13"]);
    store.set("knightly_insights_set_aside_v1", "{not json");
    assert.deepEqual([...readSetAside()], []);
    store.set("knightly_insights_set_aside_v1", JSON.stringify(["a:11", 7, null]));
    assert.deepEqual([...readSetAside()], ["a:11"]);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});

test("opening table: a verdict needs four analysed games with a reading, and it reads as an average", () => {
  assert.equal(openingVerdict(3, 3, 80), "Too few games to judge");
  assert.equal(openingVerdict(10, 0, 50), "Not analysed yet");
  // Analysis runs newest first and can be paused: one analysed game out of ten is not a habit.
  assert.equal(openingVerdict(10, 1, 20), "Too few analysed yet (1 of 10)");
  assert.equal(openingVerdict(10, 3, 90), "Too few analysed yet (3 of 10)");
  // 95, 95, 30 and 30 average 62.5: ahead on average, not "usually" ahead.
  assert.equal(openingVerdict(10, 4, 62.5), "On average ahead around move 12");
  assert.equal(openingVerdict(4, 4, 50), "On average about level around move 12");
  assert.equal(openingVerdict(4, 4, 40), "On average a little worse around move 12");
  assert.equal(openingVerdict(4, 4, 20), "On average clearly worse around move 12");
});

test("categories and the top-category headline rank by the exact points lost, not the rounded totals", () => {
  const { games, assessments } = baseSet();
  // 48.04 points in one hung piece against 48.01 points over two quiet mistakes: both round to 48.
  assessments[0].leaks = [leak("g0", 21, { drop: 48.04, category: "hung-material" })];
  assessments[1].leaks = [leak("g1", 21, { drop: 24.005, category: "quiet-mistake" }), leak("g1", 23, { drop: 24.005, category: "quiet-mistake" })];
  const report = buildReport("me", games, assessments);
  assert.deepEqual(report.categories.map((c) => c.category), ["hung-material", "quiet-mistake"]);
  assert.ok(keys(report).includes("category:hung-material"));
  assert.ok(!keys(report).includes("category:quiet-mistake"));
});

test("weakest phase headline does not claim the most mistakes when a smaller phase is worse", () => {
  const { games, assessments } = baseSet();
  // Middlegame 3 in 50 moves (6 per 100), opening 1 in 50 (2 per 100), endgame 5 in 10 (50 per 100, too few moves to judge).
  assessments[0].moves = moves("white", { opening: 10, middlegame: 10, endgame: 10 });
  assessments[0].leaks = [
    leak("g0", 1, { phase: "opening", drop: 6, category: "quiet-mistake", severity: "mistake" }),
    ...Array.from({ length: 3 }, (_, i) => leak("g0", 21 + i * 2, { phase: "middlegame", drop: 6, category: "quiet-mistake", severity: "mistake" })),
    ...Array.from({ length: 5 }, (_, i) => leak("g0", 41 + i * 2, { phase: "endgame", drop: 6, category: "quiet-mistake", severity: "mistake" })),
  ];
  const headline = buildReport("me", games, assessments).headlines.find((h) => h.key === "phase:middlegame")!;
  assert.ok(headline);
  assert.match(headline.title, /6 per 100 moves/);
  assert.doesNotMatch(headline.title, /most/i);
  assert.match(headline.detail, /3 times your opening rate of 2 per 100 moves/);
});

test("problem opening headline ignores games with no known opening", () => {
  const games = [
    ...Array.from({ length: 4 }, (_, i) => game(`unknown${i}`, { outcome: "loss", resultCode: "resigned", openingFamily: "Unknown opening", openingName: "Unknown opening", ecoCode: null, userColor: "black", endTime: BASE_TIME + i })),
    ...Array.from({ length: 6 }, (_, i) => game(`good${i}`, { outcome: "win", openingFamily: "London System", endTime: BASE_TIME + 10 + i })),
  ];
  const report = buildReport("me", games, games.map((g) => assessment(g.id, { moves: moves(g.userColor, { opening: 10, middlegame: 10 }) })));
  assert.ok(report.openings.some((o) => o.family === "Unknown opening"));
  assert.ok(!keys(report).some((k) => k.startsWith("opening:")));
});

test("problem opening headline counts an analysed game even when the user never got to move", () => {
  const games = [
    ...Array.from({ length: 4 }, (_, i) => game(`bad${i}`, { outcome: "loss", resultCode: "resigned", openingFamily: "Caro-Kann Defense", userColor: "black", endTime: BASE_TIME + i })),
    ...Array.from({ length: 6 }, (_, i) => game(`good${i}`, { outcome: "win", openingFamily: "London System", endTime: BASE_TIME + 10 + i })),
  ];
  // bad0 ended after White's first move (Black resigned or abandoned), so Black has no moves in it.
  const report = buildReport("me", games, games.map((g) => assessment(g.id, { moves: g.id === "bad0" ? [] : moves(g.userColor, { opening: 10, middlegame: 10 }, g.id === "bad1" ? 20 : 40) })));
  assert.ok(keys(report).includes("opening:black:Caro-Kann Defense"));
  // The after-opening average only uses games where the user moved: (20 + 40 + 40) / 3.
  assert.equal(report.openings.find((o) => o.family === "Caro-Kann Defense")!.winAfterOpening, 33.3);
});

test("problem opening threshold uses the exact score, not the rounded one", () => {
  // Group: 1 win in 6 = 16.67%, shown as 16.7. Overall: 32 points in 101 games = 31.68%. Exact gap 15.02, rounded gap 14.98.
  const games = [
    ...Array.from({ length: 6 }, (_, i) => game(`ck${i}`, { outcome: i === 0 ? "win" : "loss", resultCode: i === 0 ? "win" : "resigned", openingFamily: "Caro-Kann Defense", userColor: "black", endTime: BASE_TIME + i })),
    ...Array.from({ length: 95 }, (_, i) => game(`o${i}`, { outcome: i < 31 ? "win" : "loss", resultCode: i < 31 ? "win" : "resigned", openingFamily: "London System", endTime: BASE_TIME + 10 + i })),
  ];
  const report = buildReport("me", games, games.map((g) => assessment(g.id, { moves: moves(g.userColor, { opening: 10, middlegame: 10 }) })));
  assert.equal(report.openings.find((o) => o.family === "Caro-Kann Defense")!.score, 16.7);
  const headline = report.headlines.find((h) => h.key === "opening:black:Caro-Kann Defense");
  assert.ok(headline);
  assert.match(headline.detail, /15 points below your overall score of 31\.7%/);
});

const TACTICS_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Result "*"]

1. e4 a6 2. e5 d5 3. exd6 Nf6 4. dxc7 Qd5 5. cxb8=N Qe5+ 6. Be2 g6 7. Nf3 Bg7 8. O-O O-O 9. d4 *`;

test("leakToDecision handles en passant, promotion and castling moves", () => {
  for (const [color, ply, uci] of [["white", 5, "e5d6"], ["white", 9, "c7b8n"], ["white", 15, "e1g1"], ["black", 16, "e8g8"]] as const) {
    const target = game(`chesscom-tactics-${ply}`, { pgn: TACTICS_PGN, userColor: color, plyCount: 17 });
    const source = leakToDecision(realLeak(target, ply), target);
    assert.equal(source.playedUci, uci);
    const board = decisionBoard(source);
    assert.equal(board.fen(), source.fenBefore);
    assert.equal(board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).after, source.fenAfter);
  }
});

test("leakToDecision rejects a game that does not start from the normal position", () => {
  const fen = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";
  const pgn = `[Event "x"]\n[SetUp "1"]\n[FEN "${fen}"]\n\n1. e4 Kd7 2. Kd2 Ke6 *`;
  const target = game("chesscom-setup", { pgn, plyCount: 4, userColor: "white" });
  const replay = replayGame(pgn);
  const bad = leak(target.id, 3, { userColor: "white", playedUci: replay.ucis[2] });
  assert.throws(() => leakToDecision(bad, target), /normal starting position/);
});

test("puzzle order does not depend on the order attempts are stored in when two share a time", () => {
  const now = BASE_TIME + 30 * DAY;
  const at = now - 60 * 60_000;
  const leaks = [leak("a", 11, { drop: 30 }), leak("b", 11, { drop: 20 })];
  const attempts = [attempt("a:11", at, "not-yet"), { ...attempt("a:11", at, "independent"), id: "a:11@second" }];
  const forward = rankPuzzles(leaks, attempts, now).map((l) => l.gameId);
  const backward = rankPuzzles(leaks, [...attempts].reverse(), now).map((l) => l.gameId);
  assert.deepEqual(forward, backward);
});

test("an empty or unanalysed import gives a report with zeros and no headlines", () => {
  const empty = buildReport("me", [], []);
  assert.deepEqual([empty.games, empty.analysed, empty.from, empty.to], [0, 0, null, null]);
  assert.deepEqual(empty.record, { games: 0, win: 0, draw: 0, loss: 0 });
  assert.deepEqual(empty.phases.opening, { moves: 0, mistakes: 0, blunders: 0, avgDrop: 0, leaksPer100: 0 });
  assert.deepEqual([empty.categories, empty.openings, empty.headlines], [[], [], []]);
  const { games } = baseSet(6);
  const unanalysed = buildReport("me", games, []);
  assert.deepEqual([unanalysed.games, unanalysed.analysed], [6, 0]);
  assert.deepEqual(unanalysed.conversion, { winning: 0, converted: 0, blownGameIds: [], losing: 0, saved: 0 });
  assert.deepEqual(unanalysed.openings.map((o) => [o.games, o.score, o.winAfterOpening]), [[6, 50, 50]]);
  assert.deepEqual(unanalysed.headlines, []);
  assert.doesNotMatch(JSON.stringify(unanalysed), /NaN|null,"to":null/);
});

test("quiet mistakes copy does not claim no material changed hands", () => {
  const copy = CATEGORY_COPY["quiet-mistake"];
  assert.equal(copy.label, "Quiet mistakes");
  // The bucket also holds moves that grabbed material and lost, and sacrifices the engine did not trust.
  assert.doesNotMatch(copy.meaning, /without material changing hands|positional/i);
  assert.doesNotMatch(copy.advice, /^When nothing is hanging/);
});

test("category headline leads with the costliest other kind when it has at least three leaks", () => {
  const build = (hung: number) => {
    const { games, assessments } = baseSet();
    assessments[0].leaks = Array.from({ length: 6 }, (_, i) => leak("g0", 11 + i * 2, { drop: 30, category: "quiet-mistake" }));
    assessments[1].leaks = Array.from({ length: hung }, (_, i) => leak("g1", 11 + i * 2, { drop: 20, category: "hung-material" }));
    assessments[2].leaks = [leak("g2", 11, { drop: 15, category: "missed-material" })];
    return buildReport("me", games, assessments);
  };
  const yes = build(3);
  // The ranking itself is unchanged: quiet mistakes still cost the most.
  assert.deepEqual(yes.categories.map((c) => c.category), ["quiet-mistake", "hung-material", "missed-material"]);
  const headline = yes.headlines.find((h) => h.key.startsWith("category:"))!;
  assert.equal(headline.key, "category:hung-material");
  assert.equal(headline.title, `${CATEGORY_COPY["hung-material"].label}: 3 times in 1 game`);
  assert.doesNotMatch(headline.detail, /most costly/);
  assert.match(headline.detail, /20 points out of 100 on average\. Only quiet mistakes/);
  assert.deepEqual(headline.leakIds, ["g1:11", "g1:13", "g1:15"]);

  // With only two, it is not yet a pattern and the top category leads as before.
  const no = build(2);
  const top = no.headlines.find((h) => h.key.startsWith("category:"))!;
  assert.equal(top.key, "category:quiet-mistake");
  assert.match(top.detail, /^Your most costly kind of mistake/);
});

test("clearly winning and clearly losing use the same rule whatever the result", () => {
  const games = [
    game("won-spike", { outcome: "win" }),
    game("won-clear", { outcome: "win" }),
    game("lost-spike", { outcome: "loss", resultCode: "resigned" }),
    game("lost-clear", { outcome: "loss", resultCode: "resigned" }),
    game("drawn-clear", { outcome: "draw", resultCode: "agreed" }),
  ];
  const assessments = [
    // One reading of 95 (say, after the opponent's move) is not "clearly winning" for a win either.
    assessment("won-spike", { peakWin: 95 }),
    assessment("won-clear", { peakWin: 95, clearlyWinning: true }),
    assessment("lost-spike", { lowWin: 5 }),
    assessment("lost-clear", { lowWin: 5, clearlyLosing: true }),
    assessment("drawn-clear", { peakWin: 90, clearlyWinning: true, blownWin: true }),
  ];
  assert.deepEqual(buildReport("me", games, assessments).conversion, { winning: 2, converted: 1, blownGameIds: ["drawn-clear"], losing: 1, saved: 0 });
});

test("time share counts only mistakes with clock readings", () => {
  const games = Array.from({ length: 8 }, (_, i) => game(`t${i}`, { outcome: "loss", resultCode: "resigned", timeClass: i < 6 ? "daily" : "rapid", endTime: BASE_TIME + i }));
  const assessments = games.map((g, i) => assessment(g.id, {
    leaks: Array.from({ length: 5 }, (_, j) => leak(g.id, 21 + j * 2, {
      drop: 20,
      category: "quiet-mistake",
      clockSec: i < 6 ? null : 100,
      // Rapid games: 4 of the 10 in time trouble, 2 played instantly.
      timeTrouble: i === 6 && j < 4,
      hasty: i === 7 && j < 2,
    })),
  }));
  const report = buildReport("me", games, assessments);
  assert.deepEqual(report.time, { lostOnTime: 0, leaks: 40, clockedLeaks: 10, inTimeTrouble: 4, hasty: 2 });
  const headline = report.headlines.find((h) => h.key === "time")!;
  assert.ok(headline);
  assert.equal(headline.title, "6 of your 10 mistakes with clock readings came in time trouble or on instant moves");
  assert.equal(headline.leakIds.length, 6);
});

test("thrown-away wins practice set leaves out mistakes made before the user was winning", () => {
  const { games, assessments } = baseSet();
  // Game g0: level until ply 41, clearly winning from ply 41 on, then thrown away in two steps.
  const before = moves("white", { opening: 10, middlegame: 10 }, 50);
  const after = moves("white", { opening: 10, middlegame: 10 }, 90).map((move) => ({ ...move, ply: move.ply + 40 }));
  Object.assign(assessments[0], {
    moves: [...before, ...after],
    peakWin: 90,
    clearlyWinning: true,
    blownWin: true,
    leaks: [
      leak("g0", 9, { winBefore: 50, winAfter: 20, drop: 30 }),
      leak("g0", 43, { winBefore: 90, winAfter: 70, drop: 20 }),
      leak("g0", 45, { winBefore: 70, winAfter: 40, drop: 30 }),
    ],
  });
  Object.assign(assessments[1], {
    moves: moves("white", { opening: 10, middlegame: 10 }, 92),
    peakWin: 92,
    clearlyWinning: true,
    blownWin: true,
    leaks: [leak("g1", 31, { winBefore: 92, winAfter: 50, drop: 42 })],
  });
  const headline = buildReport("me", games, assessments).headlines.find((h) => h.key === "blown-wins")!;
  assert.ok(headline);
  assert.deepEqual(headline.leakIds, ["g1:31", "g0:45", "g0:43"]);
});

test("thrown-away wins practice set ignores a lone early flicker and moves defending a lost position", () => {
  const { games, assessments } = baseSet();
  const at = (ply: number, winBefore: number): MoveStat => ({ ply, phase: "middlegame", winBefore, winAfter: winBefore, drop: 0, clockSec: null, spentSec: null });
  // Game g0: one 86% reading at ply 11, a mistake at 50%, really winning at 41-45, thrown away at 45, then defending.
  Object.assign(assessments[0], {
    moves: [at(11, 86), at(21, 50), at(41, 90), at(43, 92), at(45, 92), at(61, 30), at(71, 20)],
    peakWin: 92,
    clearlyWinning: true,
    blownWin: true,
    leaks: [
      leak("g0", 21, { winBefore: 50, winAfter: 25, drop: 25 }),
      leak("g0", 45, { winBefore: 92, winAfter: 32, drop: 60 }),
      leak("g0", 61, { winBefore: 30, winAfter: 15, drop: 15 }),
      leak("g0", 71, { winBefore: 20, winAfter: 8, drop: 12 }),
    ],
  });
  // Game g1: thrown away on the first winning move, winning again later and still not won: the first mistake counts.
  Object.assign(assessments[1], {
    moves: [at(29, 50), at(31, 90), at(33, 40), at(51, 88), at(53, 88)],
    peakWin: 90,
    clearlyWinning: true,
    blownWin: true,
    leaks: [leak("g1", 31, { winBefore: 90, winAfter: 40, drop: 50 }), leak("g1", 53, { winBefore: 88, winAfter: 60, drop: 28 })],
  });
  const headline = buildReport("me", games, assessments).headlines.find((h) => h.key === "blown-wins")!;
  assert.ok(headline);
  assert.deepEqual(headline.leakIds, ["g0:45", "g1:31", "g1:53"]);
  assert.match(headline.detail, /in two or more positions where you were to move, with the final position counting as one/);
});

test("share of the damage adds up to 100 and a small kind is not rounded away silently", () => {
  // Rounded one by one these were 51 + 50 = 101.
  assert.deepEqual(sharesOf([101, 99]), [51, 49]);
  const shares = sharesOf([1800, 1500, 1200, 485, 15]);
  assert.deepEqual(shares, [36, 30, 24, 10, 0]);
  assert.equal(shares.reduce((sum, share) => sum + share, 0), 100);
  assert.equal(sharesOf([1, 1, 1]).reduce((sum, share) => sum + share, 0), 100);
  assert.deepEqual(sharesOf([0, 0]), [0, 0]);
  assert.deepEqual(sharesOf([]), []);
});

test("time left never reads as an hour and 60 minutes", () => {
  assert.equal(timeLeftText(7130), "About 2 hours left");
  assert.equal(timeLeftText(10_680), "About 3 hours left");
  assert.equal(timeLeftText(3570), "About 1 hour left");
  assert.equal(timeLeftText(5400), "About 1 hour 30 minutes left");
  assert.equal(timeLeftText(3540), "About 59 minutes left");
  assert.equal(timeLeftText(30), "Less than a minute left");
});

test("analysis progress does not start out full before the run's first report", () => {
  // 50 stored games, 45 still waiting; the run has not reported yet (total 0).
  assert.deepEqual(analysisProgress(50, 45, { total: 0, done: 0, failed: 0 }), {
    overall: 50,
    analysed: 5,
    finished: 5,
    value: 10,
  });
  // After the first report the run's own numbers take over.
  assert.deepEqual(analysisProgress(50, 45, { total: 45, done: 3, failed: 1 }), {
    overall: 50,
    analysed: 8,
    finished: 9,
    value: 18,
  });
});
