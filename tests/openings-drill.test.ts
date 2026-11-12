import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { buildTree, positionKey, START_FEN } from "../lib/openings/tree";
import { chooseMove, EMPTY_REPERTOIRE, recordReview, type RepertoireData } from "../lib/openings/repertoire";
import {
  drillableKeys,
  dueAt,
  dueKeys,
  isDue,
  isRightAnswer,
  nextStep,
  pickReply,
  untilText,
  weightedPick,
} from "../lib/openings/drill";
import { checkMove, verdictText } from "../lib/openings/check";
import type { ImportedGame } from "../lib/insights/types";

const NOW = Date.UTC(2026, 10, 12, 12);
const MIN = 60_000;
const DAY = 86_400_000;
const after = (...sans: string[]) => {
  const chess = new Chess();
  sans.forEach((m) => chess.move(m));
  return chess.fen();
};
const game = (pgn: string): Pick<ImportedGame, "pgn" | "userColor" | "outcome" | "openingName"> => ({
  pgn,
  userColor: "white",
  outcome: "win",
  openingName: "Unknown opening",
});

// Opponents answered 1. e4 with e5 three times and c5 once.
const tree = buildTree(
  [game("1. e4 e5 2. Nf3 Nc6 *"), game("1. e4 e5 2. Nf3 Nc6 *"), game("1. e4 e5 2. Nf3 d6 *"), game("1. e4 c5 2. Nf3 *")],
  "white",
);

function repertoire(): RepertoireData {
  let data = chooseMove(EMPTY_REPERTOIRE, START_FEN, "e2e4")!;
  data = chooseMove(data, after("e4", "e5"), "g1f3")!;
  data = chooseMove(data, after("e4", "c5"), "g1f3")!;
  return data;
}

test("weightedPick follows how often opponents played each reply", () => {
  const replies = tree.nodes[positionKey(after("e4"))].moves;
  assert.equal(weightedPick(replies, () => 0).san, "e5");
  assert.equal(weightedPick(replies, () => 0.74).san, "e5");
  assert.equal(weightedPick(replies, () => 0.76).san, "c5");
  assert.equal(weightedPick(replies, () => 1).san, "c5");
});

test("due positions are drilled first", () => {
  let data = repertoire();
  const e5 = positionKey(after("e4", "e5"));
  const c5 = positionKey(after("e4", "c5"));
  assert.deepEqual([...drillableKeys(tree, data)].sort(), [positionKey(START_FEN), e5, c5].sort());
  // Everything is new, so everything is due and replies keep their real frequencies.
  assert.equal(pickReply(tree, data, after("e4"), dueKeys(tree, data, NOW), () => 0)!.san, "e5");
  // After right answers on e5 and the start, only the c5 position is due: the drill steers there.
  data = recordReview(data, e5, { at: new Date(NOW - MIN).toISOString(), outcome: "independent" });
  data = recordReview(data, positionKey(START_FEN), { at: new Date(NOW - MIN).toISOString(), outcome: "independent" });
  const due = dueKeys(tree, data, NOW);
  assert.deepEqual([...due], [c5]);
  assert.equal(pickReply(tree, data, after("e4"), due, () => 0)!.san, "c5");
  // With nothing due, it falls back to the real frequencies.
  assert.equal(pickReply(tree, data, after("e4"), new Set(), () => 0)!.san, "e5");
});

test("a wrong answer comes back sooner than a right one", () => {
  const key = positionKey(START_FEN);
  const right = recordReview(repertoire(), key, { at: new Date(NOW).toISOString(), outcome: "independent" });
  const wrong = recordReview(repertoire(), key, { at: new Date(NOW).toISOString(), outcome: "not-yet" });
  assert.equal(isDue(repertoire(), key, NOW), true, "a new position is due");
  assert.equal(dueAt(wrong, key, NOW) - NOW, 15 * MIN);
  assert.equal(dueAt(right, key, NOW) - NOW, DAY);
  assert.equal(isDue(wrong, key, NOW + 16 * MIN), true);
  assert.equal(isDue(right, key, NOW + 16 * MIN), false);
  // Right answers on separate days space out further.
  let spaced = right;
  spaced = recordReview(spaced, key, { at: new Date(NOW + DAY).toISOString(), outcome: "independent" });
  assert.equal(dueAt(spaced, key, NOW + DAY) - (NOW + DAY), 3 * DAY);
});

test("nextStep asks for the prepared move, replies for the opponent and ends honestly", () => {
  const data = repertoire();
  const due = dueKeys(tree, data, NOW);
  const first = nextStep(tree, data, START_FEN, 0, due, () => 0);
  assert.equal(first.kind, "answer");
  assert.ok(first.kind === "answer" && first.expected.san === "e4");
  const reply = nextStep(tree, data, after("e4"), 1, due, () => 0);
  assert.ok(reply.kind === "reply" && reply.move.san === "e5");
  const unprepared = nextStep(tree, data, after("e4", "e5", "Nf3", "Nc6"), 4, due, () => 0);
  assert.equal(unprepared.kind, "unprepared");
  const noGames = nextStep(tree, chooseMove(data, after("e4", "c5"), "g1f3")!, after("e4", "c5", "Nf3"), 3, due);
  assert.ok(noGames.kind === "end" && noGames.reason === "no-games");
  assert.equal(nextStep(tree, data, START_FEN, 24, due).kind, "end");
});

test("isRightAnswer and untilText", () => {
  const expected = { uci: "e2e4", san: "e4", fen: START_FEN };
  assert.equal(isRightAnswer(expected, "e2e4"), true);
  assert.equal(isRightAnswer(expected, "d2d4"), false);
  assert.equal(isRightAnswer({ uci: "a7a8q", san: "a8=Q", fen: START_FEN }, "a7a8"), true);
  assert.equal(untilText(15 * MIN), "in 15 minutes");
  assert.equal(untilText(DAY), "in 1 day");
  assert.equal(untilText(3 * DAY), "in 3 days");
});

test("checkMove turns two evaluations into lost winning chances", () => {
  const even = { kind: "cp", value: 0 } as const;
  const minusTwo = { kind: "cp", value: -200 } as const;
  const white = checkMove(even, minusTwo, "white");
  assert.equal(white.before, 50);
  assert.ok(white.drop >= 15 && white.verdict === "blunder");
  assert.match(verdictText(white, "f3", "Nf3", true), /usually play here, is a serious mistake.*prefers Nf3/);
  const black = checkMove(even, minusTwo, "black");
  assert.equal(black.drop, 0);
  assert.equal(black.verdict, "fine");
  assert.match(verdictText(black, "e5", "e5", false), /engine's own choice/);
  const mate = checkMove(even, { kind: "mate", winner: "black", moves: 2 }, "white");
  assert.equal(mate.after, 0);
  assert.equal(checkMove(even, { kind: "cp", value: -60 }, "white").verdict, "inaccuracy");
  assert.equal(checkMove(even, { kind: "cp", value: -130 }, "white").verdict, "mistake");
});
