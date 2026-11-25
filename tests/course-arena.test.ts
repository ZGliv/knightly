import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import {
  arenaElo,
  arenaStatus,
  buildBook,
  chooseBookReply,
  DEFAULT_ARENA_ELO,
  lineToLearn,
  orList,
  walkBook,
  type BookMove,
} from "../lib/courses/arena";
import { positionKey, START_FEN } from "../lib/openings/tree";
import type { Course } from "../lib/courses/types";

const italian: Pick<Course, "lines"> = {
  lines: [
    { id: "l01", name: "Giuoco Piano", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"] },
    { id: "l02", name: "Two Knights", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "d3"] },
  ],
};

/** Keys before each ply, from the start. */
function keysOf(sans: string[]): string[] {
  const chess = new Chess();
  const keys = [positionKey(START_FEN)];
  for (const san of sans) keys.push(positionKey(chess.move(san).after));
  return keys;
}

const walk = (sans: string[], side: "white" | "black" = "white") => walkBook(buildBook(italian), keysOf(sans), sans, side);

test("buildBook merges lines that share positions and lists every course move", () => {
  const book = buildBook(italian);
  const afterBc4 = keysOf(["e4", "e5", "Nf3", "Nc6", "Bc4"]).at(-1)!;
  assert.deepEqual(book.get(afterBc4)!.map((m) => m.san), ["Bc5", "Nf6"]);
  const start = book.get(positionKey(START_FEN))!;
  assert.deepEqual(start, [{ san: "e4", uci: "e2e4", lineIds: ["l01", "l02"] }]);
});

test("walkBook stays in the course while both sides play course moves", () => {
  const w = walk(["e4", "e5", "Nf3", "Nc6"]);
  assert.equal(w.leave, null);
  assert.equal(w.bookPlies, 4);
  assert.equal(arenaStatus(w), "In your course: move 3");
});

test("walkBook: the learner leaves when he plays a move the course does not", () => {
  const w = walk(["e4", "e5", "Bc4"]);
  assert.equal(w.leave?.by, "you");
  assert.equal(w.leave?.ply, 2);
  assert.equal(w.leave?.played, "Bc4");
  assert.deepEqual(w.leave?.course.map((m) => m.san), ["Nf3"]);
  assert.equal(w.bookPlies, 2);
  assert.equal(arenaStatus(w), "You left the course at move 2: the course plays Nf3");
});

test("walkBook: an opponent deviation is the opponent's, not the learner's", () => {
  const w = walk(["e4", "c5"]);
  assert.equal(w.leave?.by, "opponent");
  assert.equal(w.leave?.ply, 1);
  assert.equal(arenaStatus(w), "Your opponent left the course at move 1: you are on your own");
  // Seen from Black's side the same deviation would be the learner's own.
  assert.equal(walk(["e4", "c5"], "black").leave?.by, "you");
});

test("walkBook: reaching the end of a line is neither side leaving", () => {
  const full = walk(["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"]);
  assert.equal(full.leave?.by, "end");
  assert.equal(full.leave?.played, null);
  assert.equal(full.bookPlies, 7);
  assert.equal(arenaStatus(full), "The course ends at move 4: you are on your own");
  const beyond = walk(["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4"]);
  assert.equal(beyond.leave?.by, "end");
  assert.equal(beyond.leave?.ply, 7);
  assert.equal(beyond.bookPlies, 7);
});

test("walkBook: leaving is final even when the game transposes back", () => {
  // 1. Nf3 is off-book for this course; the walk stops there.
  const w = walk(["Nf3", "e5", "e4"]);
  assert.equal(w.leave?.by, "you");
  assert.equal(w.leave?.ply, 0);
});

test("lineToLearn points at the course's move where the game left, or the last line followed", () => {
  const book = buildBook(italian);
  const sans = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5"];
  const keys = keysOf(sans);
  assert.equal(lineToLearn(book, walkBook(book, keys, sans, "white"), keys), "l02");
  const ended = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"];
  const endKeys = keysOf(ended);
  assert.equal(lineToLearn(book, walkBook(book, endKeys, ended, "white"), endKeys), "l01");
});

const options: BookMove[] = [
  { san: "Bc5", uci: "f8c5", lineIds: ["l01"] },
  { san: "Nf6", uci: "g8f6", lineIds: ["l02"] },
  { san: "Be7", uci: "f8e7", lineIds: ["l03"] },
];

test("chooseBookReply is uniform when the learner's opponents never reached the position", () => {
  assert.equal(chooseBookReply(options, undefined, () => 0).san, "Bc5");
  assert.equal(chooseBookReply(options, undefined, () => 0.4).san, "Nf6");
  assert.equal(chooseBookReply(options, undefined, () => 0.99).san, "Be7");
  // Reached, but none of the course's replies was played there: also uniform.
  assert.equal(chooseBookReply(options, { moves: [{ uci: "d7d6", count: 9 }] as never }, () => 0.99).san, "Be7");
});

test("chooseBookReply weights replies by how often real opponents played them", () => {
  const node = { moves: [{ uci: "g8f6", count: 3 }, { uci: "f8c5", count: 1 }, { uci: "d7d6", count: 20 }] } as never;
  // Weights: Bc5 1, Nf6 3, Be7 0 (total 4).
  assert.equal(chooseBookReply(options, node, () => 0).san, "Bc5");
  assert.equal(chooseBookReply(options, node, () => 0.24).san, "Bc5");
  assert.equal(chooseBookReply(options, node, () => 0.25).san, "Nf6");
  assert.equal(chooseBookReply(options, node, () => 0.999).san, "Nf6");
  const picks = new Map<string, number>();
  for (let i = 0; i < 400; i++) {
    const san = chooseBookReply(options, node, () => i / 400).san;
    picks.set(san, (picks.get(san) ?? 0) + 1);
  }
  assert.deepEqual(Object.fromEntries(picks), { Bc5: 100, Nf6: 300 });
  assert.throws(() => chooseBookReply([], node));
});

test("arenaElo prefers manual, then Play's estimate, then the imported rating, then a club default", () => {
  assert.equal(arenaElo({ manual: 1400, estimated: 900, imported: 1700 }), 1400);
  assert.equal(arenaElo({ manual: null, estimated: 900, imported: 1700 }), 900);
  assert.equal(arenaElo({ manual: null, estimated: null, imported: 1666 }), 1650);
  assert.equal(arenaElo({ manual: null, estimated: null, imported: 3000 }), 2400);
  assert.equal(arenaElo({ manual: null, estimated: null, imported: null }), DEFAULT_ARENA_ELO);
});

test("orList joins alternatives in plain English", () => {
  assert.equal(orList(["Nf3"]), "Nf3");
  assert.equal(orList(["Nf3", "c4"]), "Nf3 or c4");
  assert.equal(orList(["Nf3", "c4", "g3"]), "Nf3, c4 or g3");
});
