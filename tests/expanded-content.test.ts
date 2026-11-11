import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { SEQUENCES } from "../lib/learning/sequences";
import { LESSONS } from "../lib/learning/curriculum";
import { OPENINGS, openingLines } from "../lib/library/catalog";

test("every concept has a different practice board, including all preserved starter IDs", () => {
  assert.equal(new Set(LESSONS.map((item) => item.id)).size, LESSONS.length);
  assert.equal(SEQUENCES.length, LESSONS.length);
  for (const lesson of LESSONS) {
    const sequence = SEQUENCES.find((item) => item.id === lesson.id)!;
    assert.ok(sequence.principle.length > 30);
    assert.notEqual(
      sequence.fen.split(" ")[0],
      sequence.independent.fen.split(" ")[0],
    );
  }
});
test("each opening has distinct named lines, with equal White and Black coverage", () => {
  assert.equal(OPENINGS.length, 24);
  assert.equal(OPENINGS.filter((item) => item.side === "White").length, 12);
  for (const study of OPENINGS) {
    const lines = openingLines(study);
    assert.equal(lines.length, 2);
    assert.equal(new Set(lines.map((line) => line.id)).size, lines.length);
    assert.equal(
      new Set(lines.map((line) => line.moves.join(" "))).size,
      lines.length,
    );
    for (const line of lines) assert.ok(line.description.length > 20);
  }
});
test("pins actually prevent the target moving, and double checks require a king move", () => {
  const pinned = SEQUENCES.find((item) => item.id === "absolute-pin")!;
  for (const [exercise, target] of [
    [pinned, "d7"],
    [pinned.independent, "e5"],
  ] as const) {
    const board = new Chess(exercise.fen);
    board.move(exercise.answers[0]);
    assert.equal(board.moves({ square: target }).length, 0);
  }
  const double = SEQUENCES.find((item) => item.id === "double-check")!;
  for (const exercise of [double, double.independent]) {
    const board = new Chess(exercise.fen);
    board.move(exercise.answers[0]);
    assert.ok(board.isCheck());
    assert.equal(
      board.attackers(board.findPiece({ type: "k", color: "b" })[0], "w")
        .length,
      2,
    );
    assert.ok(
      board.moves({ verbose: true }).every((move) => move.piece === "k"),
    );
  }
});
test("skewered queens remain capturable after every king reply", () => {
  const skewer = SEQUENCES.find((item) => item.id === "skewer")!;
  for (const exercise of [skewer, skewer.independent]) {
    const board = new Chess(exercise.fen);
    const attack = board.move(exercise.answers[0]);
    for (const reply of board.moves()) {
      const next = new Chess(board.fen());
      next.move(reply);
      assert.ok(
        next
          .moves({ verbose: true })
          .some((move) => move.from === attack.to && move.captured === "q"),
        reply,
      );
    }
  }
});
test("checking pawn forks are protected and leave the rook available after every reply", () => {
  const fork = SEQUENCES.find((item) => item.id === "pawn-fork")!;
  for (const exercise of [fork, fork.independent]) {
    const board = new Chess(exercise.fen);
    const attack = board.move(exercise.answers[0]);
    assert.ok(board.isCheck());
    assert.ok(
      board.moves({ verbose: true }).every((move) => move.captured !== "p"),
    );
    for (const reply of board.moves()) {
      const next = new Chess(board.fen());
      next.move(reply);
      assert.ok(
        next
          .moves({ verbose: true })
          .some((move) => move.from === attack.to && move.captured === "r"),
        reply,
      );
    }
  }
});
