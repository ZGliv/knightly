import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import {
  COLLECTIONS,
  OPENINGS,
  openingPositions,
  openingLines,
  openingFen,
  readSavedItems,
  toggleSavedItem,
  LIBRARY_SAVED_KEY,
} from "../lib/library/catalog";
import { LESSONS } from "../lib/learning/curriculum";
test("every library collection opens real lessons and the catalog covers the curriculum once", () => {
  assert.deepEqual(
    COLLECTIONS.flatMap((item) => item.lessonIds).sort(),
    LESSONS.map((item) => item.id).sort(),
  );
  for (const collection of COLLECTIONS) {
    assert.doesNotThrow(() => new Chess(collection.fen));
    assert.ok(collection.takeaways.length);
  }
});
test("opening studies have legal complete lines and an explanation for each played move", () => {
  for (const study of OPENINGS)
    for (const opening of openingLines(study)) {
      const positions = openingPositions(opening);
      assert.equal(positions.length, opening.moves.length + 1);
      assert.equal(opening.notes.length, opening.moves.length);
      assert.equal(new Set(positions).size, positions.length);
      assert.ok(opening.notes.every((note) => note.trim().length > 0));
      assert.equal(new Chess(positions.at(-1)!).isGameOver(), false);
    }
});
test("library bookmarks persist and malformed history cannot be overwritten", () => {
  const store = new Map<string, string>();
  Object.assign(globalThis, {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });
  assert.deepEqual(readSavedItems(), []);
  assert.deepEqual(toggleSavedItem("italian-game"), ["italian-game"]);
  assert.deepEqual(readSavedItems(), ["italian-game"]);
  assert.deepEqual(toggleSavedItem("italian-game"), []);
  store.set(LIBRARY_SAVED_KEY, "broken");
  assert.throws(() => toggleSavedItem("italian-game"));
  assert.equal(store.get(LIBRARY_SAVED_KEY), "broken");
});

test("static opening covers match the final legal positions", () => {
  for (const opening of OPENINGS)
    assert.equal(openingFen(opening), openingPositions(opening).at(-1));
});

test("every library route has a unique identity", () => {
 const ids=[...COLLECTIONS,...OPENINGS].map(item=>item.id);
 assert.equal(new Set(ids).size,ids.length);
});
