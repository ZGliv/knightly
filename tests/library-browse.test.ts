import test from "node:test";
import assert from "node:assert/strict";
import { COLLECTIONS, OPENINGS } from "../lib/library/catalog";
import {
  STUDY_SHELVES,
  matchesStudyTopic,
  topicCount,
  collectionLevel,
  readBrowseState,
  browseHref,
} from "../lib/library/browse";
const collection = (id: string) => COLLECTIONS.find((c) => c.id === id)!;
test("phase browsing includes relevant collections regardless of their original category", () => {
  assert.ok(matchesStudyTopic(collection("opening-essentials"), "Openings"));
  assert.ok(matchesStudyTopic(collection("course-checkmating"), "Endgames"));
  assert.ok(
    matchesStudyTopic(collection("course-pawn-structures"), "Middlegames"),
  );
  assert.ok(!matchesStudyTopic(collection("course-rook-endings"), "Openings"));
  assert.equal(topicCount("All topics"), COLLECTIONS.length + OPENINGS.length);
  assert.ok(topicCount("Openings") > OPENINGS.length);
  const entries = STUDY_SHELVES.flatMap((s) => s.ids);
  assert.equal(entries.length, new Set(entries).size);
  for (const shelf of STUDY_SHELVES)
    for (const id of shelf.ids) {
      const item = collection(id);
      assert.ok(
        item
          ? matchesStudyTopic(item, shelf.title)
          : shelf.title === "Openings" && OPENINGS.some((o) => o.id === id),
      );
    }
});
test("collection labels reflect course placement instead of assigning Beginner to everything", () => {
  assert.equal(collectionLevel(collection("course-rook-endings")), "Advanced");
  assert.equal(
    collectionLevel(collection("course-checkmating")),
    "Basics–Advanced",
  );
  assert.equal(
    collectionLevel(collection("opening-essentials")),
    "Basics–Intermediate",
  );
});
test("library context survives a detail round trip and ignores unsupported destinations", () => {
  const state = readBrowseState(
    "?view=saved&topic=Openings&q=king%27s&side=Black&layout=list&all=1",
  );
  assert.deepEqual(
    readBrowseState(browseHref(state).slice("/study?".length)),
    state,
  );
  assert.equal(browseHref(readBrowseState("https://evil.example")), "/study");
  assert.equal(
    browseHref(
      readBrowseState("topic=Anything&view=anything&layout=bad&side=bad"),
    ),
    "/study",
  );
  assert.equal(readBrowseState("q=" + "x".repeat(500)).query.length, 200);
});
