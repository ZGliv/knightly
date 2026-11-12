import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyRecord, guessesOn, loadRecord, MASTERS_STORAGE_KEY, recordFinish, recordGuess, saveRecord } from "../lib/masters/storage";
import { emptyTally } from "../lib/masters/grade";
import { fullName, shortName } from "../lib/masters/games";

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

test("guesses are counted per day and survive a finished game and a reload", () => {
  let record = recordGuess(recordGuess(emptyRecord(), "2026-11-12"), "2026-11-12");
  record = recordGuess(record, "2026-11-11");
  record = recordFinish(record, "g1", { score: 6, max: 9, tally: emptyTally() }, "2026-11-12T10:00:00.000Z");
  assert.equal(guessesOn(record, "2026-11-12"), 2);
  assert.equal(guessesOn(record, "2026-11-10"), 0);
  const store = memory();
  saveRecord(record, store);
  const loaded = loadRecord(store);
  assert.equal(guessesOn(loaded, "2026-11-12"), 2);
  assert.equal(loaded.games.g1.best, 6);
});

test("older saves without guess counts still load, and bad counts are dropped", () => {
  const store = memory();
  store.setItem(MASTERS_STORAGE_KEY, JSON.stringify({ version: 1, games: {} }));
  assert.equal(guessesOn(loadRecord(store), "2026-11-12"), 0);
  store.setItem(MASTERS_STORAGE_KEY, JSON.stringify({ version: 1, games: {}, guesses: { "2026-11-12": 3, bad: 2, "2026-11-11": -1 } }));
  assert.deepEqual(loadRecord(store).guesses, { "2026-11-12": 3 });
});

test("only the last 60 days of guess counts are kept", () => {
  let record = emptyRecord();
  for (let i = 0; i < 70; i++) record = recordGuess(record, `2026-${String(1 + Math.floor(i / 28)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`);
  assert.equal(Object.keys(record.guesses ?? {}).length, 60);
  assert.equal(guessesOn(record, "2026-01-01"), 0);
});

test("player names read naturally whatever order the broadcast used", () => {
  assert.equal(shortName("Gukesh D"), "Gukesh");
  assert.equal(shortName("D Gukesh"), "Gukesh");
  assert.equal(fullName("Erigaisi Arjun"), "Arjun Erigaisi");
  assert.equal(shortName("Erigaisi Arjun"), "Erigaisi");
  assert.equal(fullName("Liren Ding"), "Ding Liren");
  assert.equal(shortName("Liren Ding"), "Ding");
  assert.equal(shortName("Magnus Carlsen"), "Carlsen");
  assert.equal(fullName("Magnus Carlsen"), "Magnus Carlsen");
  // Unknown players with an initial never show as a bare letter.
  assert.equal(shortName("Someone X."), "Someone");
});
