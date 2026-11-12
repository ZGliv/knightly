import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { buildTree, positionKey, scorePercent, START_FEN, topOpening, TREE_PLIES } from "../lib/openings/tree";
import type { ImportedGame } from "../lib/insights/types";

type G = Pick<ImportedGame, "pgn" | "userColor" | "outcome" | "openingName">;
const g = (pgn: string, userColor: G["userColor"], outcome: G["outcome"], openingName = "Unknown opening"): G => ({
  pgn,
  userColor,
  outcome,
  openingName,
});

test("positionKey drops the move counters so transpositions merge", () => {
  const a = new Chess();
  ["Nf3", "d5", "d4"].forEach((m) => a.move(m));
  const b = new Chess();
  ["d4", "d5", "Nf3"].forEach((m) => b.move(m));
  assert.equal(positionKey(a.fen()), positionKey(b.fen()));
  assert.equal(positionKey(START_FEN).split(" ").length, 4);
});

test("buildTree counts the player's moves, the replies and the score, per colour", () => {
  const games = [
    g("1. e4 e5 2. Nf3 Nc6 *", "white", "win", "Italian Game"),
    g("1. e4 e5 2. Nf3 d6 *", "white", "draw", "Philidor Defense"),
    g("1. e4 c5 2. Nf3 *", "white", "loss", "Sicilian Defense"),
    g("1. d4 d5 *", "white", "win"),
    g("1. e4 e5 *", "black", "win"),
    g("not a game", "white", "win"),
  ];
  const tree = buildTree(games, "white");
  assert.equal(tree.games, 4, "the unreadable game and the Black game are left out");
  const root = tree.nodes[tree.rootKey];
  assert.equal(root.games, 4);
  assert.equal(root.points, 2.5);
  assert.deepEqual(root.moves.map((m) => [m.san, m.count]), [["e4", 3], ["d4", 1]]);
  const e4 = tree.nodes[root.moves[0].childKey];
  assert.equal(e4.turn, "black");
  assert.deepEqual(e4.moves.map((m) => [m.san, m.count, m.points]), [["e5", 2, 1.5], ["c5", 1, 0]]);
  assert.equal(scorePercent(e4.points, e4.games), 50);
  assert.deepEqual(topOpening(e4), { name: "Italian Game", count: 1 });

  const black = buildTree(games, "black");
  assert.equal(black.games, 1);
  assert.equal(black.nodes[black.rootKey].moves[0].san, "e4");
});

test("buildTree merges transposed positions and stops after 12 moves", () => {
  const games = [g("1. Nf3 d5 2. d4 Nf6 *", "white", "win"), g("1. d4 d5 2. Nf3 Nf6 *", "white", "loss")];
  const tree = buildTree(games, "white");
  const chess = new Chess();
  ["d4", "d5", "Nf3"].forEach((m) => chess.move(m));
  const merged = tree.nodes[positionKey(chess.fen())];
  assert.equal(merged.games, 2);
  assert.deepEqual(merged.moves.map((m) => [m.san, m.count]), [["Nf6", 2]]);

  const long = "1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 5. Nf3 Nf6 6. Ng1 Ng8 7. Nf3 Nf6 8. Ng1 Ng8 9. Nf3 Nf6 10. Ng1 Ng8 11. Nf3 Nf6 12. Ng1 Ng8 13. e4 e5 *";
  const shuffle = buildTree([g(long, "white", "win")], "white");
  // The repeated positions count the game once, and 13. e4 is past the opening.
  assert.equal(shuffle.nodes[shuffle.rootKey].games, 1);
  assert.equal(Object.keys(shuffle.nodes).length, 4);
  assert.ok(Object.values(shuffle.nodes).every((n) => n.moves.every((m) => m.san !== "e4")));
  assert.equal(TREE_PLIES, 24);
});

test("an empty game list still has a start position", () => {
  const tree = buildTree([], "black");
  assert.equal(tree.games, 0);
  assert.equal(tree.nodes[tree.rootKey].moves.length, 0);
  assert.equal(scorePercent(0, 0), null);
});
