import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import {
  chooseMove,
  EMPTY_REPERTOIRE,
  parseRepertoire,
  preparedCount,
  recordReview,
  removeLine,
  serializeRepertoire,
  type RepertoireData,
} from "../lib/openings/repertoire";
import { positionKey, START_FEN } from "../lib/openings/tree";
import { loadRepertoire, REPERTOIRE_KEY, saveRepertoire } from "../lib/openings/storage";

const after = (...sans: string[]) => {
  const chess = new Chess();
  sans.forEach((m) => chess.move(m));
  return chess.fen();
};

function whiteLine(): RepertoireData {
  let data = chooseMove(EMPTY_REPERTOIRE, START_FEN, "e2e4")!;
  data = chooseMove(data, after("e4", "e5"), "g1f3")!;
  data = chooseMove(data, after("e4", "c5"), "b1c3")!;
  data = chooseMove(data, after("e4", "e5", "Nf3", "Nc6"), "f1c4")!;
  return data;
}

test("chooseMove keys by position, stores SAN, and rejects illegal moves", () => {
  const data = whiteLine();
  assert.equal(data.moves[positionKey(START_FEN)].san, "e4");
  assert.equal(preparedCount(data, "white"), 4);
  assert.equal(preparedCount(data, "black"), 0);
  assert.equal(chooseMove(data, START_FEN, "e2e5"), null);
  // A transposed position is the same entry.
  const viaOther = chooseMove(EMPTY_REPERTOIRE, after("Nf3", "d5", "d4", "Nf6"), "c2c4")!;
  assert.ok(viaOther.moves[positionKey(after("d4", "d5", "Nf3", "Nf6"))]);
});

test("changing a move clears its drill record", () => {
  let data = recordReview(whiteLine(), positionKey(START_FEN), { at: "2026-11-01T00:00:00.000Z", outcome: "independent" });
  assert.equal(data.reviews[positionKey(START_FEN)].length, 1);
  data = chooseMove(data, START_FEN, "e2e4")!;
  assert.equal(data.reviews[positionKey(START_FEN)].length, 1, "the same move keeps its record");
  data = chooseMove(data, START_FEN, "d2d4")!;
  assert.equal(data.reviews[positionKey(START_FEN)], undefined);
});

test("removeLine removes the move and everything only reachable through it", () => {
  const data = whiteLine();
  const cut = removeLine(data, after("e4", "e5"));
  assert.equal(cut.moves[positionKey(after("e4", "e5"))], undefined);
  assert.equal(cut.moves[positionKey(after("e4", "e5", "Nf3", "Nc6"))], undefined, "the deeper move went with it");
  assert.ok(cut.moves[positionKey(after("e4", "c5"))], "the other line stays");
  const all = removeLine(data, START_FEN);
  assert.equal(preparedCount(all, "white"), 0);
});

test("removing a White line leaves the Black repertoire alone", () => {
  let data = whiteLine();
  data = chooseMove(data, after("e4"), "c7c5")!;
  const cut = removeLine(data, START_FEN);
  assert.equal(preparedCount(cut, "black"), 1);
});

test("stored data round-trips and malformed parts are skipped", () => {
  const data = recordReview(whiteLine(), positionKey(START_FEN), { at: "2026-11-01T00:00:00.000Z", outcome: "not-yet" });
  assert.deepEqual(parseRepertoire(JSON.parse(serializeRepertoire(data))), data);
  const raw = JSON.parse(serializeRepertoire(data));
  raw.moves.junk = { uci: "e2e4", fen: "bad" };
  raw.moves[positionKey(START_FEN)].uci = "e2e5";
  raw.reviews.other = [{ at: "x", outcome: "independent" }];
  const parsed = parseRepertoire(raw);
  assert.equal(parsed.moves[positionKey(START_FEN)], undefined);
  assert.equal(parsed.moves.junk, undefined);
  assert.equal(Object.keys(parsed.moves).length, 3);
  assert.deepEqual(parseRepertoire({ version: 2 }), EMPTY_REPERTOIRE);
  assert.deepEqual(parseRepertoire("nonsense"), EMPTY_REPERTOIRE);
});

test("storage uses one key and survives a broken or missing localStorage", () => {
  const store = new Map<string, string>();
  const g = globalThis as { localStorage?: unknown };
  const original = g.localStorage;
  g.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
  try {
    assert.deepEqual(loadRepertoire(), EMPTY_REPERTOIRE);
    assert.equal(saveRepertoire(whiteLine()), true);
    assert.deepEqual([...store.keys()], [REPERTOIRE_KEY]);
    assert.equal(REPERTOIRE_KEY, "knightly_repertoire_v1");
    assert.deepEqual(loadRepertoire(), whiteLine());
    store.set(REPERTOIRE_KEY, "{not json");
    assert.deepEqual(loadRepertoire(), EMPTY_REPERTOIRE);
    g.localStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    assert.deepEqual(loadRepertoire(), EMPTY_REPERTOIRE);
    assert.equal(saveRepertoire(whiteLine()), false);
  } finally {
    g.localStorage = original;
  }
});
