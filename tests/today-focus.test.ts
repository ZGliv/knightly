import { test } from "node:test";
import assert from "node:assert/strict";
import { recommendFor } from "../lib/today/focus";
import { FILTER_THEMES } from "../lib/puzzles/themes";

const themeOf = (href: string | null) => (href?.startsWith("/puzzles?theme=") ? href.slice("/puzzles?theme=".length) : null);

test("each headline kind maps to the agreed tool", () => {
  const cases: [string, string | null][] = [
    ["category:hung-material", "/puzzles?theme=hangingPiece"],
    ["category:missed-material", "/puzzles?theme=fork"],
    ["category:missed-mate", "/puzzles?theme=mateIn2"],
    ["category:allowed-mate", "/puzzles?theme=mateIn2"],
    ["category:quiet-mistake", "/games/insights"],
    ["phase:endgame", "/puzzles?theme=endgame"],
    ["phase:opening", "/openings"],
    ["phase:middlegame", "/masters"],
    ["opening:white:Italian Game", "/openings"],
    ["blown-wins", "/games/insights"],
    ["time", null],
    ["something-new", "/games/insights"],
  ];
  for (const [key, href] of cases) assert.equal(recommendFor(key).href, href, key);
});

test("every puzzle link uses a theme the puzzle filter offers", () => {
  const keys = ["category:hung-material", "category:missed-material", "category:missed-mate", "category:allowed-mate", "phase:endgame"];
  for (const key of keys) {
    const theme = themeOf(recommendFor(key).href);
    assert.ok(theme && (FILTER_THEMES as readonly string[]).includes(theme), key);
  }
});

test("links come with a button label and tips without one", () => {
  for (const key of ["category:hung-material", "phase:middlegame", "blown-wins", "time"]) {
    const r = recommendFor(key);
    assert.ok(r.text.length > 20);
    assert.equal(r.action === null, r.href === null, key);
  }
});
