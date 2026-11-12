import { test } from "node:test";
import assert from "node:assert/strict";
import { formatLine, scoreOf, tally, uciLineToSan, verdictForGap } from "../lib/masters/grade";
import { MASTERS_STORAGE_KEY, emptyRecord, loadRecord, recordFinish, saveRecord } from "../lib/masters/storage";

test("verdicts follow the 3 and 8 point thresholds", () => {
  assert.equal(verdictForGap(60, 57), "as-good");
  assert.equal(verdictForGap(60, 65), "as-good", "a guess the engine prefers is as good");
  assert.equal(verdictForGap(60, 56.9), "playable");
  assert.equal(verdictForGap(60, 52), "playable");
  assert.equal(verdictForGap(60, 51.9), "worse");
});

test("tally and score count each verdict", () => {
  const verdicts = ["matched", "as-good", "playable", "worse", "shown", "matched"] as const;
  assert.deepEqual(tally([...verdicts]), { matched: 2, asGood: 1, playable: 1, worse: 1, shown: 1 });
  assert.equal(scoreOf([...verdicts]), 3 + 2 + 1 + 0 + 0 + 3);
});

test("engine lines convert to SAN and stop at the first move that does not fit", () => {
  assert.deepEqual(uciLineToSan("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", ["e2e4", "e7e5", "g1f3"]), [
    "e4",
    "e5",
    "Nf3",
  ]);
  assert.deepEqual(uciLineToSan("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", ["e2e4", "e2e4"]), ["e4"]);
  assert.deepEqual(uciLineToSan("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", ["junk"]), []);
});

test("lines are numbered from the side to move", () => {
  const black = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
  assert.equal(formatLine(black, ["e5", "Nf3", "Nc6"]), "1... e5 2. Nf3 Nc6");
  assert.equal(formatLine("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", ["e4", "e5"]), "1. e4 e5");
});

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

test("results save under one key and keep the best score", () => {
  const storage = memoryStorage();
  const t = { matched: 1, asGood: 0, playable: 0, worse: 1, shown: 0 };
  let record = recordFinish(emptyRecord(), "g1", { score: 9, max: 30, tally: t }, "2026-11-12T00:00:00.000Z");
  record = recordFinish(record, "g1", { score: 4, max: 30, tally: t }, "2026-11-12T01:00:00.000Z");
  assert.equal(record.games.g1.best, 9);
  assert.equal(record.games.g1.lastScore, 4);
  assert.equal(record.games.g1.plays, 2);
  assert.equal(saveRecord(record, storage), true);
  assert.deepEqual(Object.keys(storage.data), [MASTERS_STORAGE_KEY]);
  assert.equal(MASTERS_STORAGE_KEY, "knightly_masters_v1");
  assert.deepEqual(loadRecord(storage), record);
});

test("bad or missing storage never throws", () => {
  assert.deepEqual(loadRecord(memoryStorage({ [MASTERS_STORAGE_KEY]: "{not json" })), emptyRecord());
  assert.deepEqual(loadRecord(memoryStorage({ [MASTERS_STORAGE_KEY]: '{"version":2,"games":{}}' })), emptyRecord());
  assert.deepEqual(
    loadRecord(memoryStorage({ [MASTERS_STORAGE_KEY]: '{"version":1,"games":{"x":{"best":"a"}}}' })),
    emptyRecord(),
  );
  assert.deepEqual(loadRecord(null), emptyRecord());
  const throwing = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("full");
    },
  };
  assert.deepEqual(loadRecord(throwing), emptyRecord());
  assert.equal(saveRecord(emptyRecord(), throwing), false);
});
