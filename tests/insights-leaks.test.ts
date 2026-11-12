import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_POSITION } from "chess.js";
import type { PlayerColor } from "../types/game";
import type { Evaluation } from "../lib/learning/coach/model";
import { replayGame } from "../lib/insights/replay";
import { winPercent, severityForDrop } from "../lib/insights/winprob";
import { phaseForPosition } from "../lib/insights/phase";
import { assessGame, reportableSeverity } from "../lib/insights/leaks";
import type { GameAnalysis, ImportedGame, Outcome, TimeClass } from "../lib/insights/types";
import realLeaks from "./fixtures/insights-real-leaks.json";

const cp = (value: number): Evaluation => ({ kind: "cp", value });
const mate = (winner: PlayerColor, moves: number): Evaluation => ({ kind: "mate", winner, moves });

function makeGame(
  pgn: string,
  options: {
    userColor: PlayerColor;
    outcome?: Outcome;
    timeClass?: TimeClass;
    baseSec?: number;
    incSec?: number;
    clocks?: (number | null)[];
  },
): ImportedGame {
  const plies = replayGame(pgn).sans.length;
  return {
    id: "chesscom-1",
    source: "chesscom",
    url: "https://www.chess.com/game/live/1",
    pgn,
    endTime: 1_700_000_000_000,
    timeClass: options.timeClass ?? "blitz",
    baseSec: options.baseSec ?? 180,
    incSec: options.incSec ?? 0,
    rated: true,
    white: { name: "alpha", rating: 1500 },
    black: { name: "beta", rating: 1500 },
    userColor: options.userColor,
    outcome: options.outcome ?? "draw",
    resultCode: "agreed",
    termination: "Game drawn by agreement",
    ecoCode: null,
    openingName: "Unknown opening",
    openingFamily: "Unknown opening",
    plyCount: plies,
    clocks: options.clocks ?? Array.from({ length: plies }, () => null),
  };
}

/**
 * An analysis where the engine agrees with every move played and every position is level,
 * so each test only spells out the positions it is about.
 */
function makeAnalysis(
  pgn: string,
  overrides: Record<number, { eval?: Evaluation; best?: string; line?: string[] }> = {},
): GameAnalysis {
  const { ucis } = replayGame(pgn);
  const positions = ucis.length + 1;
  const analysis: GameAnalysis = {
    gameId: "chesscom-1",
    version: 1,
    nodes: 150_000,
    analysedAt: "2026-11-11T00:00:00.000Z",
    evals: Array.from({ length: positions }, () => cp(0)),
    best: Array.from({ length: positions }, (_, i) => ucis[i] ?? ""),
    lines: Array.from({ length: positions }, (_, i) => (ucis[i] ? [ucis[i]] : [])),
    depths: Array.from({ length: positions }, () => 14),
  };
  for (const [key, value] of Object.entries(overrides)) {
    const index = Number(key);
    if (value.eval) analysis.evals[index] = value.eval;
    if (value.best !== undefined) analysis.best[index] = value.best;
    if (value.line) analysis.lines[index] = value.line;
  }
  return analysis;
}

test("win percentage is symmetric, clamps big scores and is exact for mates", () => {
  assert.equal(winPercent(cp(0), "white"), 50);
  assert.equal(winPercent(cp(0), "black"), 50);
  assert.ok(Math.abs(winPercent(cp(300), "white") + winPercent(cp(300), "black") - 100) < 1e-9);
  assert.ok(winPercent(cp(300), "white") > 75 && winPercent(cp(300), "white") < 76);
  assert.equal(winPercent(cp(5000), "white"), winPercent(cp(1000), "white"));
  assert.equal(winPercent(cp(-5000), "black"), winPercent(cp(-1000), "black"));
  assert.ok(winPercent(cp(1000), "white") < 100);
  assert.equal(winPercent(mate("white", 3), "white"), 100);
  assert.equal(winPercent(mate("white", 3), "black"), 0);
  assert.equal(winPercent(mate("black", 0), "black"), 100);
  assert.equal(winPercent(mate("black", 0), "white"), 0);
});

test("severity thresholds: +9 to +5 is not a blunder", () => {
  assert.equal(severityForDrop(4.9), null);
  assert.equal(severityForDrop(5), "inaccuracy");
  assert.equal(severityForDrop(10), "mistake");
  assert.equal(severityForDrop(15), "blunder");
  const drop = winPercent(cp(900), "white") - winPercent(cp(500), "white");
  assert.notEqual(severityForDrop(drop), "blunder");
  assert.equal(severityForDrop(winPercent(cp(100), "white") - winPercent(cp(-300), "white")), "blunder");
});

test("phase uses knights, bishops, rooks and queens of both sides", () => {
  // Move 8 for White (ply 15) with everything still on the board.
  assert.equal(phaseForPosition(15, DEFAULT_POSITION), "opening");
  assert.equal(phaseForPosition(20, DEFAULT_POSITION), "opening");
  assert.equal(phaseForPosition(21, DEFAULT_POSITION), "middlegame");
  // Rook ending with five pawns each: endgame even early on.
  const rookEnding = "r5k1/5ppp/2p1p3/1p6/1P6/2P1P3/5PPP/R5K1 w - - 0 30";
  assert.equal(phaseForPosition(59, rookEnding), "endgame");
  assert.equal(phaseForPosition(10, rookEnding), "endgame");
  // Ten pieces early is no longer the opening; seven is middlegame; six is endgame.
  assert.equal(phaseForPosition(12, "rnb1kb1r/pppppppp/8/8/8/8/PPPPPPPP/RNB1KB1R w KQkq - 0 7"), "middlegame");
  assert.equal(phaseForPosition(40, "r1b1kb1r/pppppppp/8/8/8/8/PPPPPPPP/R1B1KB2 w - - 0 20"), "middlegame");
  assert.equal(phaseForPosition(40, "r1b1kb2/pppppppp/8/8/8/8/PPPPPPPP/R1B1KB2 w - - 0 20"), "endgame");
});

test("hung material: the played move loses the queen to the engine's reply", () => {
  const pgn = "1. e4 e5 2. Qh5 Nc6 3. Qxe5+ Nxe5 *";
  const game = makeGame(pgn, { userColor: "white", outcome: "loss" });
  const analysis = makeAnalysis(pgn, {
    4: { eval: cp(20), best: "f1c4", line: ["f1c4", "g7g6", "h5f3", "g8f6", "g1e2", "f8g7"] },
    5: { eval: cp(-800), line: ["c6e5", "d2d4", "e5c6", "d4d5", "c6e5", "f2f4"] },
    6: { eval: cp(-800) },
  });
  const result = assessGame(game, analysis);
  assert.equal(result.moves.length, 3);
  assert.equal(result.leaks.length, 1);
  const leak = result.leaks[0];
  assert.equal(leak.id, "chesscom-1:5");
  assert.equal(leak.moveNumber, 3);
  assert.equal(leak.category, "hung-material");
  assert.equal(leak.severity, "blunder");
  assert.equal(leak.phase, "opening");
  assert.equal(leak.playedSan, "Qxe5+");
  assert.equal(leak.bestSan, "Bc4");
  assert.deepEqual(leak.bestLine, ["Bc4", "g6", "Qf3", "Nf6", "Ne2", "Bg7"]);
  assert.deepEqual(leak.refutation, ["Nxe5", "d4", "Nc6", "d5", "Ne5", "f4"]);
  assert.equal(leak.materialSwing, 8);
});

test("missed material: the engine wins the queen and the move played does not", () => {
  const pgn = "1. e4 e5 2. Nf3 Qg5 3. d4 Qg6 *";
  const game = makeGame(pgn, { userColor: "white", outcome: "draw" });
  const analysis = makeAnalysis(pgn, {
    4: { eval: cp(800), best: "f3g5", line: ["f3g5", "g8f6", "g5f3", "f6e4", "d2d3", "e4f6"] },
    5: { eval: cp(0), line: ["g5g6", "d4e5", "g6e4", "f1e2", "b8c6"] },
  });
  const [leak] = assessGame(game, analysis).leaks;
  assert.equal(leak.category, "missed-material");
  assert.equal(leak.materialSwing, 8);
  assert.equal(leak.bestSan, "Nxg5");
  assert.deepEqual(leak.refutation, ["Qg6", "dxe5", "Qxe4+", "Be2", "Nc6"]);
});

test("missed mate: a mate in one was on the board and the move let it go", () => {
  const pgn = "1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qf3 *";
  const game = makeGame(pgn, { userColor: "white" });
  const analysis = makeAnalysis(pgn, {
    6: { eval: mate("white", 1), best: "h5f7", line: ["h5f7"] },
    7: { eval: cp(100) },
  });
  const [leak] = assessGame(game, analysis).leaks;
  assert.equal(leak.category, "missed-mate");
  assert.equal(leak.severity, "blunder");
  assert.equal(leak.winBefore, 100);
  assert.equal(leak.bestSan, "Qxf7#");
});

test("allowed mate from Black's side, with an illegal tail in the engine line", () => {
  const pgn = "1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0";
  const game = makeGame(pgn, { userColor: "black", outcome: "loss" });
  const analysis = makeAnalysis(pgn, {
    5: { eval: cp(40), best: "g7g6", line: ["g7g6", "h5f3", "g8f6", "a1a8"] },
    6: { eval: mate("white", 1), line: ["h5f7"] },
    7: { eval: mate("white", 0) },
  });
  const result = assessGame(game, analysis);
  assert.deepEqual(result.moves.map((move) => move.ply), [2, 4, 6]);
  const [leak] = result.leaks;
  assert.equal(leak.userColor, "black");
  assert.equal(leak.category, "allowed-mate");
  assert.equal(leak.winAfter, 0);
  assert.ok(leak.winBefore > 40 && leak.winBefore < 50);
  assert.deepEqual(leak.bestLine, ["g6", "Qf3", "Nf6"]);
  assert.deepEqual(leak.refutation, ["Qxf7#"]);
  assert.equal(result.lowWin, 0);
});

test("quiet mistake: a big drop with no material changing hands", () => {
  const pgn = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 *";
  const game = makeGame(pgn, { userColor: "white" });
  const analysis = makeAnalysis(pgn, {
    4: { eval: cp(30), best: "f1b5", line: ["f1b5", "a7a6", "b5a4", "g8f6"] },
    5: { eval: cp(-300), line: ["g8f6", "d2d3", "f8c5"] },
  });
  const [leak] = assessGame(game, analysis).leaks;
  assert.equal(leak.category, "quiet-mistake");
  assert.equal(leak.materialSwing, 0);
});

test("the engine's own choice and small drops are not leaks", () => {
  const pgn = "1. e4 e5 2. Nf3 Nc6 *";
  const game = makeGame(pgn, { userColor: "white" });
  const analysis = makeAnalysis(pgn, { 2: { eval: cp(30) }, 3: { eval: cp(-400) } });
  assert.equal(assessGame(game, analysis).leaks.length, 0);
  const small = makeAnalysis(pgn, { 2: { eval: cp(30), best: "f1c4" }, 3: { eval: cp(-20) } });
  assert.equal(assessGame(game, small).leaks.length, 0);
});

test("noise rules: already lost, or still completely winning", () => {
  assert.equal(reportableSeverity({ winBefore: 8, winAfter: 0, drop: 12 }, false), null);
  assert.equal(reportableSeverity({ winBefore: 8, winAfter: 0, drop: 12 }, true), "mistake");
  assert.equal(reportableSeverity({ winBefore: 100, winAfter: 90, drop: 10 }, false), null);
  assert.equal(reportableSeverity({ winBefore: 100, winAfter: 89, drop: 11 }, false), "mistake");
  assert.equal(reportableSeverity({ winBefore: 60, winAfter: 40, drop: 20 }, false), "blunder");
  assert.equal(reportableSeverity({ winBefore: 60, winAfter: 51, drop: 9 }, false), null);

  // In a real game: a forced mate traded for a still-crushing position is not reported.
  const pgn = "1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qf3 *";
  const game = makeGame(pgn, { userColor: "white" });
  const crushing = makeAnalysis(pgn, { 6: { eval: mate("white", 1), best: "h5f7" }, 7: { eval: cp(1200) } });
  assert.equal(assessGame(game, crushing).leaks.length, 0);
  // And a lost position getting a little more lost is not reported.
  const lost = makeAnalysis(pgn, { 6: { eval: cp(-900), best: "h5f7" }, 7: { eval: mate("black", 4) } });
  assert.equal(assessGame(game, lost).leaks.length, 0);
});

const RUY = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 *";

test("clock maths with increment, time trouble and hasty moves", () => {
  // 3+2 blitz. Clock after each ply, White then Black.
  const clocks = [178, 180, 175, 179, 170, 178, 160, 170, 150, 160, 120, 150, 90, 140, 60, 130, 59.5, 120, 8, 110];
  const game = makeGame(RUY, { userColor: "white", outcome: "loss", incSec: 2, clocks });
  const analysis = makeAnalysis(RUY, {
    16: { eval: cp(30), best: "d2d4", line: ["d2d4"] },
    17: { eval: cp(-400) },
    18: { eval: cp(-400), best: "d2d3" },
    19: { eval: cp(-1000) },
    20: { eval: cp(-1000) },
  });
  const result = assessGame(game, analysis);
  const byPly = new Map(result.moves.map((move) => [move.ply, move]));
  assert.equal(byPly.get(1)?.clockSec, 180);
  assert.equal(byPly.get(1)?.spentSec, 4);
  assert.equal(byPly.get(3)?.clockSec, 178);
  assert.equal(byPly.get(3)?.spentSec, 5);
  assert.equal(byPly.get(17)?.clockSec, 60);
  assert.equal(byPly.get(17)?.spentSec, 2.5);
  assert.equal(byPly.get(19)?.spentSec, 53.5);
  assert.equal(byPly.get(17)?.phase, "opening");

  const [first, second] = result.leaks;
  assert.equal(first.ply, 17);
  assert.equal(first.category, "quiet-mistake");
  assert.equal(first.timeTrouble, false);
  assert.equal(first.hasty, false, "2.5 s is more than the 2 s hasty line");
  assert.equal(second.ply, 19);
  assert.equal(second.clockSec, 59.5);
  assert.equal(second.timeTrouble, false, "59.5 s is above the 18 s line for a 3-minute game");

  const fast = [...clocks];
  fast[16] = 61; // 60 -> 61 with +2: 1 s spent
  fast[18] = 8; // 61 left before move 10
  const quick = assessGame(makeGame(RUY, { userColor: "white", incSec: 2, clocks: fast }), analysis);
  assert.equal(quick.leaks[0].spentSec, 1);
  assert.equal(quick.leaks[0].hasty, true);

  const low = [...clocks];
  low[16] = 9; // under 10 s before move 10
  const pressed = assessGame(makeGame(RUY, { userColor: "white", incSec: 2, clocks: low }), analysis);
  assert.equal(pressed.leaks[1].clockSec, 9);
  assert.equal(pressed.leaks[1].timeTrouble, true);
  assert.equal(pressed.leaks[1].hasty, false);
});

test("Black's clocks, daily games and unknown clocks", () => {
  const clocks = [178, 180, 175, 179, 170, 178, 160, 170, 150, 160, 120, 150, 90, 140, 60, 5, 59.5, 4, 8, 3];
  const black = assessGame(makeGame(RUY, { userColor: "black", incSec: 2, clocks }), makeAnalysis(RUY));
  assert.deepEqual(black.moves.slice(0, 2).map((move) => [move.ply, move.clockSec, move.spentSec]), [[2, 180, 2], [4, 180, 3]]);
  assert.equal(black.moves.at(-1)?.clockSec, 4);

  const dailyAnalysis = makeAnalysis(RUY, { 17: { eval: cp(30), best: "c8b7" }, 18: { eval: cp(600) } });
  const daily = assessGame(
    makeGame(RUY, { userColor: "black", timeClass: "daily", baseSec: 86_400, clocks: clocks.map((clock) => clock / 100) }),
    dailyAnalysis,
  );
  assert.equal(daily.leaks.length, 1);
  assert.equal(daily.leaks[0].timeTrouble, false);
  assert.equal(daily.leaks[0].hasty, false);

  const unknown = assessGame(makeGame(RUY, { userColor: "black" }), dailyAnalysis);
  assert.ok(unknown.moves.every((move) => move.clockSec === null && move.spentSec === null));
  assert.equal(unknown.leaks[0].timeTrouble, false);
  assert.equal(unknown.leaks[0].hasty, false);
});

test("blown wins and saved games are judged on the user's turns", () => {
  const winning = makeAnalysis(RUY, { 16: { eval: cp(900) }, 18: { eval: cp(900) }, 20: { eval: cp(0) } });
  const drawn = assessGame(makeGame(RUY, { userColor: "white", outcome: "draw" }), winning);
  assert.equal(drawn.blownWin, true);
  assert.equal(drawn.savedGame, false);
  assert.ok(drawn.peakWin > 95);
  const won = assessGame(makeGame(RUY, { userColor: "white", outcome: "win" }), winning);
  assert.equal(won.blownWin, false);
  assert.equal(won.clearlyWinning, true);
  assert.equal(drawn.clearlyWinning, true);

  // Seen from Black the same scores fall on White's turns, so they do not count.
  const asBlack = assessGame(makeGame(RUY, { userColor: "black", outcome: "draw" }), winning);
  assert.equal(asBlack.savedGame, false);
  assert.ok(asBlack.lowWin < 5);

  // A crushing score that only appears after the opponent's move once does not count.
  const flicker = makeAnalysis(RUY, { 16: { eval: cp(900) } });
  assert.equal(assessGame(makeGame(RUY, { userColor: "white", outcome: "loss" }), flicker).blownWin, false);
  // The same rule holds for a game the user won: one flicker is not "clearly winning".
  const flickerWon = assessGame(makeGame(RUY, { userColor: "white", outcome: "win" }), flicker);
  assert.equal(flickerWon.clearlyWinning, false);
  assert.ok(flickerWon.peakWin > 95);

  // Black clearly lost on two of Black's turns but drew: a saved game.
  const rescued = makeAnalysis(RUY, { 15: { eval: cp(800) }, 17: { eval: cp(800) } });
  const saved = assessGame(makeGame(RUY, { userColor: "black", outcome: "draw" }), rescued);
  assert.equal(saved.savedGame, true);
  assert.equal(saved.blownWin, false);
  const lost = assessGame(makeGame(RUY, { userColor: "black", outcome: "loss" }), rescued);
  assert.equal(lost.savedGame, false);
  assert.equal(lost.clearlyLosing, true);
  assert.equal(assessGame(makeGame(RUY, { userColor: "white", outcome: "loss" }), rescued).clearlyLosing, false);

  // The final position counts as one of the judged positions.
  const finalOnly = makeAnalysis(RUY, { 19: { eval: cp(-900) }, 20: { eval: cp(-900) } });
  assert.equal(assessGame(makeGame(RUY, { userColor: "black", outcome: "draw" }), finalOnly).blownWin, true);
});

test("mismatched analysis is rejected with a clear error", () => {
  const pgn = "1. e4 e5 2. Nf3 Nc6 *";
  const game = makeGame(pgn, { userColor: "white" });
  const short = makeAnalysis(pgn);
  short.evals.pop();
  assert.throws(() => assessGame(game, short), /does not cover its 5 positions/);
  const other = { ...makeAnalysis(pgn), gameId: "chesscom-2" };
  assert.throws(() => assessGame(game, other), /paired with game/);
  const bad = makeAnalysis(pgn, { 2: { eval: cp(30), best: "e1e8" }, 3: { eval: cp(-400) } });
  assert.throws(() => assessGame(game, bad), /no legal best move/);
});

test("an exchange cut off at the end of the engine line is not counted as lost material", () => {
  // The reply line's sixth ply is ...Bxc3+ and the engine's next move is the recapture bxc3.
  const pgn = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 *";
  const game = makeGame(pgn, { userColor: "white" });
  const analysis = makeAnalysis(pgn, {
    4: { eval: cp(30), best: "f1b5", line: ["f1b5", "a7a6", "b5a4", "g8f6", "e1g1", "f8e7"] },
    5: { eval: cp(-300), line: ["g8f6", "b1c3", "f8b4", "d2d3", "b4c3", "b2c3", "e8g8"] },
  });
  const [leak] = assessGame(game, analysis).leaks;
  assert.equal(leak.materialSwing, 0);
  assert.equal(leak.category, "quiet-mistake");
  assert.deepEqual(leak.refutation, ["Nf6", "Nc3", "Bb4", "d3", "Bxc3+", "bxc3", "O-O"]);
});

test("hung material seen from Black's side", () => {
  const pgn = "1. e4 e5 2. Nf3 Qh4 3. Nxh4 *";
  const game = makeGame(pgn, { userColor: "black", outcome: "loss" });
  const analysis = makeAnalysis(pgn, {
    3: { eval: cp(30), best: "b8c6", line: ["b8c6", "f1b5", "a7a6", "b5a4", "g8f6", "e1g1"] },
    4: { eval: cp(900), line: ["f3h4", "g8f6", "d2d3", "f8c5", "b1c3", "e8g8"] },
    5: { eval: cp(900) },
  });
  const result = assessGame(game, analysis);
  assert.deepEqual(result.moves.map((move) => move.ply), [2, 4]);
  const [leak] = result.leaks;
  assert.equal(leak.ply, 4);
  assert.equal(leak.moveNumber, 2);
  assert.equal(leak.playedSan, "Qh4");
  assert.equal(leak.bestSan, "Nc6");
  assert.equal(leak.category, "hung-material");
  assert.equal(leak.severity, "blunder");
  assert.equal(leak.materialSwing, 9);
  assert.ok(leak.winBefore > 45 && leak.winBefore < 50);
  assert.ok(leak.winAfter < 5);
});

test("daily games carry no clock readings: chess.com's daily clocks are not a running clock", () => {
  // Real daily PGNs carry [%clk] values like 0:00:19.4 in a one-day-per-move game.
  const clocks = [19.4, 37.6, 91, 3330.4, 962.4, 86.4, 4.6, 69.8, 133.3, 36.6, 17.9, 113.3, 1730.3, 48, 42, 116.4, 227.1, 79.6, 383, 207.8];
  const analysis = makeAnalysis(RUY, { 17: { eval: cp(30), best: "c8b7" }, 18: { eval: cp(600) } });
  const daily = assessGame(makeGame(RUY, { userColor: "black", timeClass: "daily", baseSec: 86_400, clocks }), analysis);
  assert.ok(daily.moves.every((move) => move.clockSec === null && move.spentSec === null));
  assert.equal(daily.leaks[0].clockSec, null);
  assert.equal(daily.leaks[0].spentSec, null);
  assert.equal(daily.leaks[0].timeTrouble, false);
});

test("an unknown time control does not invent a starting clock", () => {
  // chess.com's importer gives baseSec 0 when the time control cannot be read.
  const pgn = "1. e4 e5 2. Nf3 Nc6 *";
  const game = makeGame(pgn, { userColor: "white", baseSec: 0, clocks: [300, 300, 290, 295] });
  const analysis = makeAnalysis(pgn, { 0: { eval: cp(30), best: "d2d4", line: ["d2d4"] }, 1: { eval: cp(-400) } });
  const result = assessGame(game, analysis);
  assert.equal(result.moves[0].clockSec, null);
  assert.equal(result.moves[0].spentSec, null);
  assert.equal(result.moves[1].clockSec, 300);
  assert.equal(result.moves[1].spentSec, 10);
  assert.equal(result.leaks[0].timeTrouble, false);
});

/**
 * Positions from real chess.com games, with the engine's own stored scores and lines
 * (150k-node searches as the app makes them, or 2M-node reference searches).
 */
function realLeak(name: string) {
  const entry = realLeaks.find((item) => item.name === name)!;
  const color = entry.userColor as PlayerColor;
  const game = makeGame(entry.moves, { userColor: color });
  const analysis = makeAnalysis(entry.moves, {
    [entry.ply - 1]: { eval: entry.before.eval as Evaluation, best: entry.before.best, line: entry.before.line },
    [entry.ply]: { eval: entry.after.eval as Evaluation, line: entry.after.line },
  });
  const leak = assessGame(game, analysis).leaks.find((item) => item.ply === entry.ply);
  assert.ok(leak, `${name} should be a leak`);
  return leak;
}

test("real game: material won in a sacrifice line the scores do not back is not 'missed material'", () => {
  // 22.f3 (Hikaru, 3+0). The 150k line after 22.Bxd5 has Black answer Qc7 with ...f4, giving up the
  // rook and a knight for an attack, yet scores it only 1.2 pawns better than 22.f3. A 2M search
  // plays 23...Ra8 instead: Bxd5 wins a pawn, not seven points.
  const leak = realLeak("real-1");
  assert.equal(leak.materialSwing, 7);
  assert.equal(leak.category, "quiet-mistake");
});

test("real game: dropping a pawn while missing a loose bishop is a missed chance, not hanging material", () => {
  // 19...Ne7? when 19...Qxd3 took the undefended bishop. The played line also loses the f7 pawn,
  // which made the old rule call it hanging material.
  const leak = realLeak("real-2");
  assert.equal(leak.bestSan, "Qxd3");
  assert.equal(leak.category, "missed-material");
});

test("real game: a fork that wins a rook is hanging material", () => {
  // 31...Qxb3?? Qg5+ Kh7 Qxd8.
  const leak = realLeak("real-3");
  assert.deepEqual(leak.refutation.slice(0, 3), ["Qg5+", "Kh7", "Qxd8"]);
  assert.equal(leak.category, "hung-material");
});

test("real game: a large real loss the scores mostly confirm stays hanging material", () => {
  // 19.Qc5?? Qb1+ Ke2 c2 Kf2 c1=Q: the line shows 9 points lost and the scores 6.6 pawns,
  // more than half, so the material is real.
  const leak = realLeak("real-4");
  assert.equal(leak.materialSwing, 9);
  assert.equal(leak.category, "hung-material");
});

test("instant moves are only 'hasty' with plenty of time left: a third of the starting clock", () => {
  // 3+0 blitz, 25 s left before move 9 (Hikaru's 68...Ke6 had 25 s): moving fast is normal there.
  const analysis = makeAnalysis(RUY, { 16: { eval: cp(30), best: "d2d4", line: ["d2d4"] }, 17: { eval: cp(-400) } });
  const clocksAt = (left: number) => {
    const clocks: (number | null)[] = Array.from({ length: 20 }, () => null);
    clocks[14] = left; // White's clock after ply 15, i.e. before ply 17
    clocks[16] = left - 1; // 1 s spent on ply 17
    return clocks;
  };
  const low = assessGame(makeGame(RUY, { userColor: "white", baseSec: 180, clocks: clocksAt(25) }), analysis).leaks[0];
  assert.equal(low.spentSec, 1);
  assert.equal(low.timeTrouble, false);
  assert.equal(low.hasty, false);
  const plenty = assessGame(makeGame(RUY, { userColor: "white", baseSec: 180, clocks: clocksAt(60) }), analysis).leaks[0];
  assert.equal(plenty.hasty, true);
  const rapid = assessGame(makeGame(RUY, { userColor: "white", baseSec: 600, clocks: clocksAt(150) }), analysis).leaks[0];
  assert.equal(rapid.hasty, false, "150 s is under a third of a 10-minute clock");
});
