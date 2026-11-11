import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { materialSnapshot } from "../lib/chess/material";
import { strengthCommands } from "../lib/engine/strength";
import { recordGame, validateGame } from "../lib/chess/game-record";
import { readableLine, positionIdeas } from "../lib/chess/position-ideas";

test("captures belong to the capturing side, balance follows replay", () => {
  const board = new Chess();
  for (const move of ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qe6+"])
    board.move(move);
  assert.deepEqual(materialSnapshot(board).captured, { w: ["p"], b: ["p"] });
  assert.deepEqual(materialSnapshot(board).balance, { w: 0, b: 0 });
  board.undo();
  board.undo();
  board.undo();
  assert.deepEqual(materialSnapshot(board).captured, { w: ["p"], b: [] });
  assert.deepEqual(materialSnapshot(board).balance, { w: 1, b: -1 });
});
test("en passant counts and promotion changes material without inventing captures", () => {
  const board = new Chess();
  for (const move of ["e4", "a6", "e5", "d5", "exd6"]) board.move(move);
  assert.deepEqual(materialSnapshot(board).captured, { w: ["p"], b: [] });
  assert.equal(materialSnapshot(board).balance.w, 1);
  const promotion = new Chess("7k/P7/8/8/8/8/8/7K w - - 0 1");
  promotion.move("a8=Q+");
  assert.equal(materialSnapshot(promotion).balance.w, 9);
  assert.deepEqual(materialSnapshot(promotion).captured.w, []);
});
test("Stockfish accepts analysis strengths but rejects every opponent rating", () => {
  for(const elo of [400,800,1400,2400,3190]) assert.throws(()=>strengthCommands({elo}),/must use Maia/);
  assert(strengthCommands(20).includes("setoption name Skill Level value 20"));
  assert(strengthCommands(20).includes("setoption name UCI_LimitStrength value false"));
});
test("Elo is additive, legacy saves retain their original skill, invalid Elo is rejected", () => {
  const board = new Chess();
  board.move("e4");
  const legacy = { ...recordGame(board), engineLevel: 11 };
  assert.equal(validateGame(legacy).engineElo, undefined);
  assert.equal(validateGame(legacy).engineLevel, 11);
  const rated = { ...legacy, engineElo: 1600 };
  assert.equal(validateGame(rated).engineElo, 1600);
  board.move("e5");
  assert.equal(recordGame(board, rated).engineElo, 1600);
  for (const elo of [100, 3200, 600.5, NaN])
    assert.throws(
      () => validateGame({ ...legacy, engineElo: elo }),
      /difficulty/,
    );
});
test("coaching displays a legal line with move numbers and position-specific ideas", () => {
  const board = new Chess();
  board.move("e4");
  assert.deepEqual(readableLine(board.fen(), ["e7e5", "g1f3", "bad"]), [
    "1… e5",
    "2. Nf3",
  ]);
  assert(
    positionIdeas(board).some((idea) => /minor|knight|bishop/i.test(idea)),
  );
  board.loadPgn("1. f3 e5 2. g4 Qh4#");
  assert(positionIdeas(board)[0].toLowerCase().includes("checkmate"));
});
