import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { analyseGame, type PositionSearch } from "../lib/insights/analyse-game";
import { ANALYSIS_NODES, ANALYSIS_VERSION, type ImportedGame } from "../lib/insights/types";
import { applyUci } from "../lib/learning/coach/model";
import type { EngineAnalysis } from "../lib/engine/stockfish-client";

const FOOLS_MATE = '[Event "Live Chess"]\n[Result "0-1"]\n\n1. f3 {[%clk 0:05:00]} 1... e5 {[%clk 0:05:00]} 2. g4 {[%clk 0:04:59]} 2... Qh4# {[%clk 0:04:58]} 0-1\n';
const STALEMATE =
  '[Event "Live Chess"]\n[Result "1/2-1/2"]\n\n1. e3 a5 2. Qh5 Ra6 3. Qxa5 h5 4. h4 Rah6 5. Qxc7 f6 6. Qxd7+ Kf7 7. Qxb7 Qd3 8. Qxb8 Qh7 9. Qxc8 Kg6 10. Qe6 1/2-1/2\n';
const REPETITION = '[Event "Live Chess"]\n[Result "1/2-1/2"]\n\n1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 1/2-1/2\n';
const RESIGNED = '[Event "Live Chess"]\n[Result "1-0"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 1-0\n';

function game(pgn: string, plyCount: number): ImportedGame {
  return {
    id: "chesscom-123",
    source: "chesscom",
    url: "https://www.chess.com/game/live/123",
    pgn,
    endTime: 1_700_000_000_000,
    timeClass: "blitz",
    baseSec: 300,
    incSec: 0,
    rated: true,
    white: { name: "alpha", rating: 1200 },
    black: { name: "beta", rating: 1210 },
    userColor: "white",
    outcome: "loss",
    resultCode: "checkmated",
    termination: "lost by checkmate",
    ecoCode: null,
    openingName: "Unknown opening",
    openingFamily: "Unknown opening",
    plyCount,
    clocks: Array.from({ length: plyCount }, () => null),
  };
}

function board(history: string[]) {
  const chess = new Chess();
  history.forEach((move) => applyUci(chess, move));
  return chess;
}

/** A legal reply with a scripted score (side-to-move relative, like UCI) for each ply. */
function scripted(score: (ply: number) => Partial<EngineAnalysis> = () => ({})) {
  const calls: { history: string[]; nodes: number }[] = [];
  const search: PositionSearch = async (history, limit) => {
    calls.push({ history: [...history], nodes: limit.nodes });
    const chess = board(history);
    const moves = chess.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ""));
    assert(moves.length, "search must never be asked about a finished position");
    const first = moves[0];
    applyUci(chess, first);
    const second = chess.moves({ verbose: true })[0];
    return {
      bestMove: first,
      scoreCp: 20,
      mateIn: null,
      depth: 14,
      pv: second ? [first, second.from + second.to + (second.promotion ?? "")] : [first],
      ...score(history.length),
    };
  };
  return { search, calls };
}

test("checkmate game: one search per non-terminal position and an exact mate at the end", async () => {
  const { search, calls } = scripted((ply) =>
    // White to move at ply 2 is mated in 2 half-moves; Black to move at ply 3 mates in 1.
    ply === 2 ? { scoreCp: null, mateIn: -1 } : ply === 3 ? { scoreCp: null, mateIn: 1 } : {},
  );
  const result = await analyseGame(game(FOOLS_MATE, 4), search);
  assert.equal(calls.length, 4);
  assert.deepEqual(calls.map((c) => c.history.length), [0, 1, 2, 3]);
  assert.deepEqual(calls[3].history, ["f2f3", "e7e5", "g2g4"]);
  assert(calls.every((c) => c.nodes === ANALYSIS_NODES));
  for (const list of [result.evals, result.best, result.lines, result.depths]) assert.equal(list.length, 5);
  assert.deepEqual(result.evals[0], { kind: "cp", value: 20 });
  // Black to move: +20 for the mover is -20 for White.
  assert.deepEqual(result.evals[1], { kind: "cp", value: -20 });
  assert.deepEqual(result.evals[2], { kind: "mate", winner: "black", moves: 1 });
  assert.deepEqual(result.evals[3], { kind: "mate", winner: "black", moves: 1 });
  assert.deepEqual(result.evals[4], { kind: "mate", winner: "black", moves: 0 });
  assert.equal(result.best[4], "");
  assert.deepEqual(result.lines[4], []);
  assert.equal(result.depths[4], 0);
  assert.equal(result.depths[0], 14);
  assert.equal(result.gameId, "chesscom-123");
  assert.equal(result.version, ANALYSIS_VERSION);
  assert.equal(result.nodes, ANALYSIS_NODES);
  assert(!Number.isNaN(Date.parse(result.analysedAt)));
});

test("mate scores for White are oriented correctly on both sides to move", async () => {
  const { search } = scripted((ply) =>
    ply === 0 ? { scoreCp: null, mateIn: 3 } : ply === 1 ? { scoreCp: null, mateIn: -2 } : { scoreCp: -150 },
  );
  const result = await analyseGame(game(RESIGNED, 6), search, { nodes: 5000 });
  assert.deepEqual(result.evals[0], { kind: "mate", winner: "white", moves: 3 });
  assert.deepEqual(result.evals[1], { kind: "mate", winner: "white", moves: 2 });
  assert.deepEqual(result.evals[2], { kind: "cp", value: -150 });
  assert.deepEqual(result.evals[3], { kind: "cp", value: 150 });
  // A game that ended by resignation still gets its final position searched.
  assert.equal(result.best.length, 7);
  assert.notEqual(result.best[6], "");
  assert.equal(result.nodes, 5000);
});

test("stalemate and repetition endings are exact draws without a search", async () => {
  for (const [pgn, plies] of [[STALEMATE, 19], [REPETITION, 8]] as const) {
    const { search, calls } = scripted();
    const result = await analyseGame(game(pgn, plies), search);
    assert.equal(calls.length, plies);
    assert.equal(result.evals.length, plies + 1);
    assert.deepEqual(result.evals[plies], { kind: "cp", value: 0 });
    assert.equal(result.best[plies], "");
    assert.deepEqual(result.lines[plies], []);
  }
});

test("lines keep only the legal prefix, start with the best move and stop at eight plies", async () => {
  const long = ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6", "d2d3", "f8c5", "e1g1", "e8g8"];
  const search: PositionSearch = async (history) =>
    history.length === 0
      ? { bestMove: "e2e4", scoreCp: 30, mateIn: null, depth: 12, pv: long }
      : history.length === 1
        ? { bestMove: "g8f6", scoreCp: 10, mateIn: null, depth: 12, pv: ["g8f6", "e1e8"] }
        : history.length === 2
          ? { bestMove: "d2d4", scoreCp: 10, mateIn: null, depth: 12, pv: ["g1f3", "b8c6"] }
          : scripted().search(history, { nodes: 1 });
  const result = await analyseGame(game(RESIGNED, 6), search);
  assert.deepEqual(result.lines[0], long.slice(0, 8));
  assert.deepEqual(result.lines[1], ["g8f6"]);
  // A pv that disagrees with bestmove carries the exact score, so its first move is the best move.
  assert.equal(result.best[2], "g1f3");
  assert.deepEqual(result.lines[2], ["g1f3", "b8c6"]);
});

test("a bestmove named in an unfinished depth gives way to the move the score belongs to", async () => {
  // Real Stockfish 18 lite output at 150,000 nodes (a chess.com game, before Black's 14th move):
  // depth 13 exact "score cp 3 pv f7g8 d2g5 ...", then depth 14 "score cp -20 upperbound pv d7c5 c3e4",
  // then "bestmove d7c5". The client keeps the exact depth-13 score and line.
  const pgn = "1. e4 e5 *";
  const search: PositionSearch = async (history) =>
    history.length === 0
      ? { bestMove: "d2d4", scoreCp: 3, mateIn: null, depth: 13, pv: ["e2e4", "e7e5", "g1f3"] }
      : history.length === 1
        ? { bestMove: "c7c5", scoreCp: -20, mateIn: null, depth: 13, pv: ["e7e9"] }
        : { bestMove: "g1f3", scoreCp: 20, mateIn: null, depth: 13, pv: [] };
  const result = await analyseGame(game(pgn, 2), search);
  assert.equal(result.best[0], "e2e4");
  assert.deepEqual(result.lines[0], ["e2e4", "e7e5", "g1f3"]);
  // An unusable pv falls back on the engine's bestmove, and so does an empty one.
  assert.equal(result.best[1], "c7c5");
  assert.deepEqual(result.lines[1], ["c7c5"]);
  assert.equal(result.best[2], "g1f3");
});

test("an unusable engine reply for a live position is an error, not a silent gap", async () => {
  for (const reply of [
    { bestMove: "(none)", scoreCp: 0, mateIn: null, depth: 1, pv: [] },
    { bestMove: "e2e5", scoreCp: 0, mateIn: null, depth: 1, pv: [] },
    { bestMove: "e2e4", scoreCp: null, mateIn: null, depth: 1, pv: ["e2e4"] },
  ]) {
    await assert.rejects(analyseGame(game(RESIGNED, 6), async () => reply), /engine/i);
  }
});

test("cancellation is checked before every search and raises an AbortError", async () => {
  const { search, calls } = scripted();
  let cancelled = false;
  const progress: [number, number][] = [];
  const run = analyseGame(game(RESIGNED, 6), search, {
    isCancelled: () => cancelled,
    onPosition: (done, total) => {
      progress.push([done, total]);
      if (done === 3) cancelled = true;
    },
  });
  await assert.rejects(run, (error: Error) => error.name === "AbortError");
  assert.equal(calls.length, 3);
  assert.deepEqual(progress, [[1, 7], [2, 7], [3, 7]]);

  const before = scripted();
  await assert.rejects(
    analyseGame(game(RESIGNED, 6), before.search, { isCancelled: () => true }),
    (error: Error) => error.name === "AbortError",
  );
  assert.equal(before.calls.length, 0);
});

test("progress counts every position, terminal ones included", async () => {
  const { search } = scripted();
  const progress: number[] = [];
  await analyseGame(game(FOOLS_MATE, 4), search, { onPosition: (done, total) => progress.push(done * 10 + total) });
  assert.deepEqual(progress, [15, 25, 35, 45, 55]);
});

test("an illegal PGN is rejected before any search", async () => {
  const { search, calls } = scripted();
  await assert.rejects(analyseGame(game('[Result "*"]\n\n1. e4 e4 *\n', 2), search));
  assert.equal(calls.length, 0);
});

test("castling, en passant and promotion reach the engine as exact UCI, and a promoting best move is accepted", async () => {
  const pgn = '[Event "Live Chess"]\n[Result "*"]\n\n1. e4 Nf6 2. e5 d5 3. exd6 e6 4. dxc7 Be7 5. Nf3 O-O 6. cxd8=Q Rxd8 7. Bc4 Nc6 8. O-O *\n';
  const { search: base, calls } = scripted();
  const search: PositionSearch = async (history, limit) =>
    history.length === 10
      ? (calls.push({ history: [...history], nodes: limit.nodes }),
        { bestMove: "c7b8q", scoreCp: 900, mateIn: null, depth: 16, pv: ["c7b8q", "d8d1", "e1d1"] })
      : base(history, limit);
  const result = await analyseGame(game(pgn, 15), search);
  assert.equal(calls.length, 16);
  assert.deepEqual(calls.find((c) => c.history.length === 15)!.history.slice(4), [
    "e5d6", "e7e6", "d6c7", "f8e7", "g1f3", "e8g8", "c7d8q", "f8d8", "f1c4", "b8c6", "e1g1",
  ]);
  assert.equal(result.best[10], "c7b8q");
  assert.deepEqual(result.evals[10], { kind: "cp", value: 900 });
  // The illegal tail of that line (d8d1 is blocked by the d2 pawn) is dropped.
  assert.deepEqual(result.lines[10], ["c7b8q"]);
});

test("a game that does not start from the standard position is refused before any search", async () => {
  const pgn =
    '[Event "Live Chess"]\n[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n[Result "*"]\n\n1. e4 Kd7 2. Kd2 *\n';
  const { search, calls } = scripted();
  await assert.rejects(analyseGame(game(pgn, 3), search), /standard starting position/);
  assert.equal(calls.length, 0);
});

test("a stored game whose move count disagrees with its moves is refused before any search", async () => {
  const { search, calls } = scripted();
  await assert.rejects(analyseGame(game(RESIGNED, 5), search), /does not match/);
  assert.equal(calls.length, 0);
});
