import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTodayRecord, markDay, parseTodayRecord, saveTodayRecord, streakLength, TODAY_KEY, emptyTodayRecord } from "../lib/today/streak";

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

test("streak counts days in a row, staying alive until today ends", () => {
  let record = emptyTodayRecord();
  for (const d of ["2026-11-08", "2026-11-10", "2026-11-11"]) record = markDay(record, d);
  assert.equal(streakLength(record, "2026-11-12"), 2, "today not done yet: yesterday's run still counts");
  record = markDay(record, "2026-11-12");
  assert.equal(streakLength(record, "2026-11-12"), 3);
  assert.equal(streakLength(record, "2026-11-14"), 0, "a missed day ends it");
  assert.equal(markDay(record, "2026-11-12"), record, "marking twice changes nothing");
});

test("streak crosses month and year ends", () => {
  const record = ["2025-12-30", "2025-12-31", "2026-01-01"].reduce(markDay, emptyTodayRecord());
  assert.equal(streakLength(record, "2026-01-01"), 3);
});

test("the record round-trips and survives bad or blocked storage", () => {
  const store = memory();
  const record = markDay(emptyTodayRecord(), "2026-11-12");
  assert.ok(saveTodayRecord(record, store));
  assert.deepEqual(loadTodayRecord(store), record);
  store.setItem(TODAY_KEY, "{not json");
  assert.deepEqual(loadTodayRecord(store), emptyTodayRecord());
  assert.deepEqual(parseTodayRecord(JSON.stringify({ version: 1, days: ["2026-11-12", 4, "nope"] })).days, ["2026-11-12"]);
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.deepEqual(loadTodayRecord(blocked), emptyTodayRecord());
  assert.equal(saveTodayRecord(record, blocked), false);
  assert.equal(saveTodayRecord(record, null), false);
});
