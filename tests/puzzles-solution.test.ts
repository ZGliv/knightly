import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Chess } from "chess.js";
import { checkMove, linePositions, lineSan, solverSide } from "../lib/puzzles/solution";
import type { Puzzle, PuzzleIndex } from "../lib/puzzles/types";

const twoMates: Puzzle = { id: "t1", fen: "7k/6pp/8/8/8/8/r4PPP/1R1R2K1 b - - 0 1", moves: ["a2a3", "b1b8"], rating: 600, themes: ["mateIn1"] };
const promo: Puzzle = { id: "t2", fen: "8/P6k/8/8/8/8/8/2K5 b - - 0 1", moves: ["h7h6", "a7a8q"], rating: 600, themes: ["promotion"] };
const underpromo: Puzzle = { ...promo, id: "t3", moves: ["h7h6", "a7a8n"] };
const long: Puzzle = { id: "t4", fen: "r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24", moves: ["f2g3", "e6e7", "b2b1", "b3c1", "b1c1", "h6c1"], rating: 1819, themes: [] };

const after = (p: Puzzle) => linePositions(p)[1];

test("the solver is the side not making the setup move", () => {
  assert.equal(solverSide(twoMates), "white");
  assert.equal(solverSide(long), "white");
  assert.equal(solverSide({ ...promo, fen: "8/P6k/8/8/8/8/8/2K5 w - - 0 1", moves: ["c1d1", "h7h6"] }), "black");
});

test("the expected move is correct and ends a one-move puzzle", () => {
  const v = checkMove(twoMates, after(twoMates), 1, { from: "b1", to: "b8" });
  assert.ok(v.kind === "correct" && v.done);
});

test("any checkmate counts, even if it is not the listed move", () => {
  const v = checkMove(twoMates, after(twoMates), 1, { from: "d1", to: "d8" });
  assert.ok(v.kind === "correct" && v.done && v.uci === "d1d8");
});

test("a different non-mating move fails; an illegal move is reported separately", () => {
  assert.equal(checkMove(twoMates, after(twoMates), 1, { from: "g1", to: "f1" }).kind, "wrong");
  assert.equal(checkMove(twoMates, after(twoMates), 1, { from: "b1", to: "c3" }).kind, "illegal");
});

test("promotions compare the chosen piece", () => {
  assert.equal(checkMove(promo, after(promo), 1, { from: "a7", to: "a8", promotion: "q" }).kind, "correct");
  assert.equal(checkMove(promo, after(promo), 1, { from: "a7", to: "a8", promotion: "n" }).kind, "wrong");
  assert.equal(checkMove(underpromo, after(underpromo), 1, { from: "a7", to: "a8", promotion: "n" }).kind, "correct");
});

test("multi-move puzzles hand back the opponent's reply until the last move", () => {
  const fens = linePositions(long);
  const first = checkMove(long, fens[1], 1, { from: "e6", to: "e7" });
  assert.deepEqual(first.kind === "correct" && [first.done, first.reply], [false, "b2b1"]);
  const last = checkMove(long, fens[5], 5, { from: "h6", to: "c1" });
  assert.ok(last.kind === "correct" && last.done);
  assert.deepEqual(lineSan(long).slice(0, 2), ["Bxg3", "Rxe7"]);
});

test("every shipped puzzle is a legal line ending on the solver's move, in its band", () => {
  const dir = new URL("../public/puzzles/", import.meta.url);
  const index = JSON.parse(readFileSync(new URL("index.json", dir), "utf8")) as PuzzleIndex;
  let total = 0;
  const ids = new Set<string>();
  for (const band of index.bands) {
    const puzzles = JSON.parse(readFileSync(new URL(band.file, dir), "utf8")) as Puzzle[];
    assert.equal(puzzles.length, band.count);
    for (const p of puzzles) {
      assert.ok(p.rating >= band.min && p.rating < band.min + index.bandSize, `${p.id} rating`);
      assert.equal(p.moves.length % 2, 0, `${p.id} ends on the solver's move`);
      assert.ok(!ids.has(p.id), `${p.id} duplicated`);
      ids.add(p.id);
      const fens = linePositions(p);
      assert.equal(fens.length, p.moves.length + 1);
      assert.ok(new Chess(fens.at(-1)!).fen());
    }
    total += puzzles.length;
  }
  assert.ok(total >= 3500, `only ${total} puzzles`);
});
