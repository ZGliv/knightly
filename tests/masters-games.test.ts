import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AUTO_PLY, fullMoves, groupGames, guessCount, parseGamesFile, prosIn } from "../lib/masters/games";
import { detectStructure } from "../lib/masters/structure";

const games = parseGamesFile(JSON.parse(readFileSync(new URL("../public/masters/games.json", import.meta.url), "utf8")));

test("the shipped games file has 30 to 45 decisive games of 30 to 70 moves", () => {
  assert.ok(games.length >= 30 && games.length <= 45, `${games.length} games`);
  assert.equal(new Set(games.map((g) => g.id)).size, games.length, "ids are unique");
  for (const g of games) {
    const moves = fullMoves(g);
    assert.ok(moves >= 30 && moves <= 70, `${g.id}: ${moves} moves`);
    assert.ok(g.result === "1-0" || g.result === "0-1");
    assert.ok(["Magnus Carlsen", "Hikaru Nakamura"].includes(g.pro), g.pro);
    const winner = g.proSide === "white" ? g.white : g.black;
    assert.equal(winner, g.pro, `${g.id}: the guessing side is the pro`);
    assert.ok(g.event && g.year >= 2020, g.id);
    assert.ok(g.moves.length > AUTO_PLY && guessCount(g) > 10, g.id);
  }
});

test("tags in the file are exactly what the detectors compute", () => {
  for (const g of games) assert.deepEqual(g.tags, detectStructure(g.moves), g.id);
});

test("grouping lists every game once and filters by pro", () => {
  const all = groupGames(games, null);
  assert.equal(all.reduce((n, g) => n + g.games.length, 0), games.length);
  for (const pro of prosIn(games)) {
    const only = groupGames(games, pro).flatMap((g) => g.games);
    assert.ok(only.length > 0 && only.every((g) => g.pro === pro));
  }
});

test("a game where the guessing side did not win is rejected", () => {
  const [first] = games;
  assert.throws(() => parseGamesFile({ version: 1, games: [{ ...first, proSide: first.proSide === "white" ? "black" : "white" }] }));
  assert.throws(() => parseGamesFile({ version: 1, games: [{ ...first, moves: [...first.moves.slice(0, 4), "Ke9"] }] }));
});
