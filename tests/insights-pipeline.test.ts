import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import {
  analysePending,
  clearStoredGames,
  importGames,
  loadSnapshot,
  MAX_CONSECUTIVE_FAILURES,
  recommendedWorkers,
  type AnalysisProgress,
  type EngineHandle,
} from "../lib/insights/pipeline";
import { memoryInsightsStore, type InsightsStore } from "../lib/insights/store";
import { normalizeChessComGame } from "../lib/insights/chesscom";
import { ANALYSIS_VERSION, type GameAnalysis, type ImportedGame } from "../lib/insights/types";
import { applyUci, type RetryAttempt } from "../lib/learning/coach/model";
import type { EngineAnalysis } from "../lib/engine/stockfish-client";
import archives from "./fixtures/chesscom-archives.json";
import gothamNov from "./fixtures/chesscom-gothamchess-2026-11.json";
import gothamOct from "./fixtures/chesscom-gothamchess-2026-10.json";
import erikOct from "./fixtures/chesscom-erik-2026-10.json";

const API = "https://api.chess.com/pub/player/";
const ALL = ["bullet", "blitz", "rapid", "daily"] as const;

/** Fake fetch serving the repo fixtures; any other URL answers 404. Records every URL. */
function fakeFetch() {
  const routes: Record<string, unknown> = {
    [`${API}gothamchess/games/archives`]: archives,
    [`${API}gothamchess/games/2026/11`]: gothamNov,
    [`${API}gothamchess/games/2026/10`]: gothamOct,
    [`${API}erik/games/archives`]: { archives: [`${API}erik/games/2026/10`] },
    [`${API}erik/games/2026/10`]: erikOct,
  };
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const body = routes[url];
    if (body === undefined) return new Response('{"code":0,"message":"not found"}', { status: 404 });
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  return { impl, calls };
}

/** Every usable fixture game for one player, newest first. */
function fixtureGames(): ImportedGame[] {
  const raw = [...gothamNov.games, ...gothamOct.games];
  return raw
    .map((game) => normalizeChessComGame(game, "gothamchess"))
    .filter((game): game is ImportedGame => game !== null)
    .sort((a, b) => b.endTime - a.endTime);
}

function board(history: string[]) {
  const chess = new Chess();
  history.forEach((move) => applyUci(chess, move));
  return chess;
}

/**
 * A legal engine answer: the first legal move, with a side-to-move score that is usually level but
 * clearly winning for the side to move every 8th position, so the move before it shows up as a leak.
 */
function answer(history: string[], chess = board(history)): EngineAnalysis {
  const moves = chess.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ""));
  assert.ok(moves.length, "a finished position is never searched");
  return { bestMove: moves[0], scoreCp: history.length % 8 === 3 ? 600 : 0, mateIn: null, depth: 12, pv: [moves[0]] };
}

type SearchCall = { engine: number; history: string[]; nodes: number };

/**
 * Engines whose behaviour is scripted per search call. `plan(call, index)` may return "fail" to
 * reject, "hang" to never answer (dispose() still releases it), or nothing to answer normally.
 */
function engines(plan: (call: SearchCall, index: number) => "fail" | "hang" | void = () => undefined) {
  const calls: SearchCall[] = [];
  const disposed: number[] = [];
  let created = 0;
  let active = 0;
  let maxActive = 0;
  const createSearch = (): EngineHandle => {
    const id = created++;
    let alive = true;
    let release: (error: Error) => void = () => {};
    let busy = false;
    // The game is searched position by position, so usually one more move reaches the next one.
    let seen: string[] = [];
    let position = new Chess();
    const boardFor = (history: string[]) => {
      const extends1 = history.length === seen.length + 1 && seen.every((move, i) => move === history[i]);
      if (extends1) applyUci(position, history[history.length - 1]);
      else position = board(history);
      seen = [...history];
      return position;
    };
    return {
      async search(history, limit) {
        if (!alive) throw new Error("Engine session ended.");
        assert.equal(busy, false, "one engine never runs two searches at once");
        busy = true;
        active++;
        maxActive = Math.max(maxActive, active);
        const call = { engine: id, history: [...history], nodes: limit.nodes };
        const index = calls.push(call) - 1;
        try {
          await new Promise((resolve) => setImmediate(resolve));
          const step = plan(call, index);
          if (step === "fail") throw new Error("The engine stopped responding.");
          if (step === "hang")
            await new Promise((_, reject) => {
              release = reject;
            });
          if (!alive) throw new Error("Engine session ended.");
          return answer(history, boardFor(history));
        } finally {
          busy = false;
          active--;
        }
      },
      dispose() {
        assert.equal(alive, true, "an engine is disposed once");
        alive = false;
        disposed.push(id);
        release(new Error("Engine session ended."));
      },
    };
  };
  return {
    createSearch,
    calls,
    disposed,
    get created() {
      return created;
    },
    get maxActive() {
      return maxActive;
    },
  };
}

/** Records which games were saved, in order. */
function trackingStore(base: InsightsStore = memoryInsightsStore()) {
  const saved: string[] = [];
  const store: InsightsStore = {
    ...base,
    async putAnalysis(analysis) {
      await base.putAnalysis(analysis);
      saved.push(analysis.gameId);
    },
  };
  return { store, saved };
}

const SMALL = 500;

// ---------- import ----------

test("import stores games and meta, and re-importing the same player merges", async () => {
  const store = memoryInsightsStore();
  const fetch = fakeFetch();
  const progress: { month: string; found: number }[] = [];
  const first = await importGames({
    store,
    username: "GothamChess",
    max: 3,
    timeClasses: [...ALL],
    fetchImpl: fetch.impl,
    onProgress: (p) => progress.push(p),
  });
  assert.deepEqual(first, { username: "GothamChess", added: 3, total: 3, skipped: 0, replaced: false });
  assert.deepEqual(progress, [{ month: "2026-11", found: 3 }]);
  const meta = await store.getMeta();
  assert.equal(meta?.username, "GothamChess");
  assert.equal(meta?.max, 3);
  assert.deepEqual(meta?.timeClasses, [...ALL]);
  const stored = await store.listGames();
  assert.equal(stored.length, 3);

  // An analysis and an attempt saved in between survive a merge.
  const analysis = fakeAnalysis(stored[0]);
  await store.putAnalysis(analysis);
  await store.putAttempt(attemptFor(stored[0].id));

  const second = await importGames({ store, username: "gothamchess", max: 10, timeClasses: [...ALL], fetchImpl: fetch.impl });
  assert.equal(second.replaced, false, "names are compared without case");
  assert.equal(second.total, fixtureGames().length);
  assert.equal(second.added, second.total - 3);
  assert.equal((await store.listGames()).length, second.total);
  assert.deepEqual((await store.listAnalyses()).map((a) => a.gameId), [analysis.gameId]);
  assert.equal((await store.listAttempts()).length, 1);
  assert.equal((await store.getMeta())?.username, "gothamchess");
});

test("importing a different player clears the old player's games, analyses and attempts", async () => {
  const store = memoryInsightsStore();
  const fetch = fakeFetch();
  await importGames({ store, username: "gothamchess", max: 4, timeClasses: [...ALL], fetchImpl: fetch.impl });
  const old = await store.listGames();
  await store.putAnalysis(fakeAnalysis(old[0]));
  await store.putAttempt(attemptFor(old[0].id));

  const result = await importGames({ store, username: "erik", max: 10, timeClasses: [...ALL], fetchImpl: fetch.impl });
  assert.equal(result.replaced, true);
  assert.equal(result.skipped, 1, "the Chess960 game is skipped");
  assert.equal(result.added, 2);
  assert.equal(result.total, 2);
  const games = await store.listGames();
  assert.equal(games.length, 2);
  assert.ok(games.every((game) => [game.white.name, game.black.name].some((n) => n.toLowerCase() === "erik")));
  assert.deepEqual(await store.listAnalyses(), []);
  assert.deepEqual(await store.listAttempts(), []);
  assert.equal((await store.getMeta())?.username, "erik");
});

test("a failed or cancelled import leaves the store untouched", async () => {
  const store = memoryInsightsStore();
  const fetch = fakeFetch();
  await importGames({ store, username: "gothamchess", max: 2, timeClasses: ["bullet"], fetchImpl: fetch.impl });
  const before = await store.listGames();
  const meta = await store.getMeta();

  await assert.rejects(
    importGames({ store, username: "nobody_here", max: 5, timeClasses: [...ALL], fetchImpl: fetch.impl }),
    (error: Error) => error.name === "ChessComError" && /no chess\.com player/.test(error.message),
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    importGames({ store, username: "erik", max: 5, timeClasses: [...ALL], fetchImpl: fetch.impl, signal: controller.signal }),
    (error: Error) => error.name === "AbortError",
  );
  await assert.rejects(importGames({ store, username: "erik", max: 0, timeClasses: [...ALL], fetchImpl: fetch.impl }), /how many games/);
  await assert.rejects(importGames({ store, username: "erik", max: 5, timeClasses: [], fetchImpl: fetch.impl }), /at least one kind/);
  assert.deepEqual(await store.listGames(), before);
  assert.deepEqual(await store.getMeta(), meta);
});

test("games left without an owner on record are cleared before an import", async () => {
  const store = memoryInsightsStore();
  const [orphan] = fixtureGames().filter((game) => game.timeClass === "blitz");
  await store.putGames([orphan]);
  const fetch = fakeFetch();
  const result = await importGames({ store, username: "gothamchess", max: 1, timeClasses: ["bullet"], fetchImpl: fetch.impl });
  assert.equal(result.replaced, true);
  assert.ok(!(await store.listGames()).some((game) => game.id === orphan.id));
});

test("checking for new games fetches every game since the last import, even past max", async () => {
  const store = memoryInsightsStore();
  const months: Record<string, unknown> = { "2026/10": gothamOct };
  const impl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const body =
      url === `${API}gothamchess/games/archives`
        ? { archives: Object.keys(months).map((month) => `${API}gothamchess/games/${month}`) }
        : months[url.slice(`${API}gothamchess/games/`.length)];
    if (body === undefined) return new Response('{"code":0,"message":"not found"}', { status: 404 });
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  const all = fixtureGames();

  const first = await importGames({ store, username: "gothamchess", max: 2, timeClasses: [...ALL], fetchImpl: impl });
  assert.equal(first.total, 2);
  // Five games are played before the next check, more than the 2 the first import asked for.
  months["2026/11"] = gothamNov;
  const refresh = await importGames({ store, username: "gothamchess", max: 2, timeClasses: [...ALL], fetchImpl: impl });
  assert.equal(refresh.added, all.length - 2);
  assert.equal(refresh.total, all.length);
  assert.deepEqual((await store.listGames()).map((game) => game.id).sort(), all.map((game) => game.id).sort());
  const again = await importGames({ store, username: "gothamchess", max: 2, timeClasses: [...ALL], fetchImpl: impl });
  assert.deepEqual([again.added, again.total], [0, all.length]);
});

test("an import refuses to clear a player that another tab imported", async () => {
  const store = memoryInsightsStore();
  const fetch = fakeFetch();
  // This tab still shows gothamchess; another tab switched the shared store to erik.
  await importGames({ store, username: "erik", max: 10, timeClasses: [...ALL], fetchImpl: fetch.impl });
  const games = await store.listGames();
  await store.putAnalysis(fakeAnalysis(games[0]));
  await store.putAttempt(attemptFor(games[0].id));
  const meta = await store.getMeta();

  for (const expectedOwner of ["GothamChess", null])
    await assert.rejects(
      importGames({ store, username: "gothamchess", max: 3, timeClasses: [...ALL], expectedOwner, fetchImpl: fetch.impl }),
      /changed in another tab/,
    );
  assert.deepEqual(await store.listGames(), games);
  assert.equal((await store.listAnalyses()).length, 1);
  assert.equal((await store.listAttempts()).length, 1);
  assert.deepEqual(await store.getMeta(), meta);

  // A switch the user confirmed against the real owner still goes ahead.
  const confirmed = await importGames({
    store,
    username: "gothamchess",
    max: 3,
    timeClasses: [...ALL],
    expectedOwner: "Erik",
    fetchImpl: fetch.impl,
  });
  assert.equal(confirmed.replaced, true);
  assert.deepEqual(await store.listAttempts(), []);
});

test("deleting refuses to clear a player that another tab imported", async () => {
  const store = memoryInsightsStore();
  const fetch = fakeFetch();
  // This tab still shows gothamchess; another tab switched the shared store to erik.
  await importGames({ store, username: "erik", max: 10, timeClasses: [...ALL], fetchImpl: fetch.impl });
  const games = await store.listGames();
  await store.putAnalysis(fakeAnalysis(games[0]));
  await store.putAttempt(attemptFor(games[0].id));
  const meta = await store.getMeta();

  for (const expectedOwner of ["GothamChess", null]) assert.equal(await clearStoredGames(store, expectedOwner), false);
  assert.deepEqual(await store.listGames(), games);
  assert.equal((await store.listAnalyses()).length, 1);
  assert.equal((await store.listAttempts()).length, 1);
  assert.deepEqual(await store.getMeta(), meta);

  // Deleting the player the user saw goes ahead.
  assert.equal(await clearStoredGames(store, "Erik"), true);
  assert.deepEqual([await store.listGames(), await store.listAttempts(), await store.getMeta()], [[], [], null]);
});

// ---------- analysis ----------

test("analysis runs newest first, saves each game as it finishes and reports progress", async () => {
  const games = fixtureGames().slice(0, 3);
  const { store, saved } = trackingStore();
  await store.putGames(games);
  const engine = engines();
  const progress: AnalysisProgress[] = [];
  const finished: string[] = [];
  const result = await analysePending({
    store,
    createSearch: engine.createSearch,
    workers: 1,
    nodes: SMALL,
    onProgress: (p) => progress.push({ ...p }),
    onGameAnalysed: (analysis) => {
      finished.push(analysis.gameId);
      // Saved before the caller hears about it.
      assert.ok(saved.includes(analysis.gameId));
    },
  });
  assert.deepEqual(result, { total: 3, analysed: 3, failed: [], cancelled: false });
  assert.deepEqual(saved, games.map((game) => game.id), "newest game first");
  assert.deepEqual(finished, saved);
  assert.equal(engine.created, 1);
  assert.deepEqual(engine.disposed, [0], "the engine is released at the end");
  assert.ok(engine.calls.every((call) => call.nodes === SMALL));

  const positions = games.reduce((sum, game) => sum + game.plyCount + 1, 0);
  const last = progress[progress.length - 1];
  assert.equal(last.done, 3);
  assert.equal(last.positionsTotal, 0, "nothing in flight at the end");
  assert.equal(last.searchedPositions, positions);
  assert.equal(last.remainingPositions, 0);
  const mid = progress.find((p) => p.positionsDone === 5);
  assert.ok(mid);
  assert.equal(mid.positionsTotal, games[0].plyCount + 1);
  assert.equal(mid.done, 0);
  assert.ok(progress.every((p, i) => i === 0 || p.searchedPositions >= progress[i - 1].searchedPositions));

  const analyses = await store.listAnalyses();
  for (const game of games) {
    const analysis = analyses.find((a) => a.gameId === game.id);
    assert.ok(analysis);
    assert.equal(analysis.evals.length, game.plyCount + 1);
    assert.equal(analysis.nodes, SMALL);
    assert.equal(analysis.version, ANALYSIS_VERSION);
  }

  const again = await analysePending({ store, createSearch: engine.createSearch, workers: 2, nodes: SMALL });
  assert.deepEqual(again, { total: 0, analysed: 0, failed: [], cancelled: false });
  assert.equal(engine.created, 1, "no engine is started when nothing is pending");
});

test("two workers analyse two games at once, each with its own engine", async () => {
  const games = fixtureGames().slice(0, 4);
  const { store, saved } = trackingStore();
  await store.putGames(games);
  const engine = engines();
  const result = await analysePending({ store, createSearch: engine.createSearch, workers: 2, nodes: SMALL });
  assert.equal(result.analysed, 4);
  assert.equal(engine.created, 2);
  assert.equal(engine.maxActive, 2);
  assert.deepEqual([...engine.disposed].sort(), [0, 1]);
  assert.deepEqual([...saved].sort(), games.map((game) => game.id).sort());
});

test("cancelling stops quickly, disposes engines, keeps finished games, and a resume does only the rest", async () => {
  const games = fixtureGames().slice(0, 4);
  const { store, saved } = trackingStore();
  await store.putGames(games);
  const controller = new AbortController();
  // The engine answers until the second game is well under way, then hangs and ignores nothing but dispose().
  const first = engines((_, index) => (index >= games[0].plyCount + 10 ? "hang" : undefined));
  let hangs = 0;
  const run = analysePending({
    store,
    createSearch: first.createSearch,
    workers: 1,
    nodes: SMALL,
    signal: controller.signal,
    onProgress: () => {
      if (first.calls.length >= games[0].plyCount + 10 && hangs++ === 0) setImmediate(() => controller.abort());
    },
  });
  const result = await run;
  assert.equal(result.cancelled, true);
  assert.equal(result.analysed, 1);
  assert.deepEqual(result.failed, []);
  assert.deepEqual(saved, [games[0].id]);
  assert.deepEqual(first.disposed, [0]);

  const second = engines();
  const resumed = await analysePending({ store, createSearch: second.createSearch, workers: 2, nodes: SMALL });
  assert.equal(resumed.total, 3);
  assert.equal(resumed.analysed, 3);
  assert.deepEqual([...saved.slice(1)].sort(), games.slice(1).map((game) => game.id).sort());
  assert.equal(new Set(saved).size, 4, "no game is analysed twice");
});

test("a run whose engine ignores dispose() still stops when cancelled", async () => {
  const games = fixtureGames().slice(0, 2);
  const store = memoryInsightsStore();
  await store.putGames(games);
  const controller = new AbortController();
  let created = 0;
  const createSearch = (): EngineHandle => {
    created++;
    return {
      search: () => new Promise<EngineAnalysis>(() => {}),
      dispose() {},
    };
  };
  setTimeout(() => controller.abort(), 20);
  const result = await analysePending({ store, createSearch, workers: 2, nodes: SMALL, signal: controller.signal });
  assert.equal(result.cancelled, true);
  assert.equal(result.analysed, 0);
  assert.equal(created, 2);
  assert.deepEqual(await store.listAnalyses(), []);
});

test("an already-cancelled signal starts no engine", async () => {
  const store = memoryInsightsStore();
  await store.putGames(fixtureGames().slice(0, 2));
  const controller = new AbortController();
  controller.abort();
  const engine = engines();
  const result = await analysePending({ store, createSearch: engine.createSearch, workers: 2, signal: controller.signal });
  assert.deepEqual(result, { total: 2, analysed: 0, failed: [], cancelled: true });
  assert.equal(engine.created, 0);
});

test("one engine failure marks that game failed, replaces the engine and the run goes on", async () => {
  const games = fixtureGames().slice(0, 3);
  const { store, saved } = trackingStore();
  await store.putGames(games);
  // Fails once, in the middle of the second game.
  const failAt = games[0].plyCount + 5;
  const engine = engines((_, index) => (index === failAt ? "fail" : undefined));
  const result = await analysePending({ store, createSearch: engine.createSearch, workers: 1, nodes: SMALL });
  assert.equal(result.analysed, 2);
  assert.deepEqual(result.failed, [{ gameId: games[1].id, message: "The engine stopped responding." }]);
  assert.equal(result.cancelled, false);
  assert.equal(engine.created, 2, "the failed engine is replaced");
  assert.deepEqual(engine.disposed, [0, 1]);
  assert.deepEqual(saved, [games[0].id, games[2].id]);
  assert.ok(engine.calls.slice(failAt + 1).every((call) => call.engine === 1));

  // The next run picks up only the game that failed.
  const retry = engines();
  const next = await analysePending({ store, createSearch: retry.createSearch, workers: 1, nodes: SMALL });
  assert.deepEqual(next, { total: 1, analysed: 1, failed: [], cancelled: false });
  assert.equal(saved[saved.length - 1], games[1].id);
});

test(`${MAX_CONSECUTIVE_FAILURES} engine failures in a row end the run with a clear error`, async () => {
  const games = fixtureGames().slice(0, 5);
  const { store, saved } = trackingStore();
  await store.putGames(games);
  const engine = engines(() => "fail");
  await assert.rejects(
    analysePending({ store, createSearch: engine.createSearch, workers: 1, nodes: SMALL }),
    (error: Error) =>
      /engine failed on 3 games in a row/.test(error.message) &&
      /Games finished before that are saved/.test(error.message) &&
      /The engine stopped responding\./.test(error.message),
  );
  assert.equal(engine.created, 3);
  assert.deepEqual(engine.disposed, [0, 1, 2]);
  assert.deepEqual(saved, []);
});

test("a finished game resets the failure count", async () => {
  const games = fixtureGames().slice(0, 6);
  const { store, saved } = trackingStore();
  await store.putGames(games);
  // Engines 0 and 1 fail at once; engine 2 finishes one game, then fails on its next; later engines fail.
  let starts = 0;
  const engine = engines((call) => {
    if (call.engine !== 2) return "fail";
    if (call.history.length === 0 && ++starts > 1) return "fail";
  });
  await assert.rejects(
    analysePending({ store, createSearch: engine.createSearch, workers: 1, nodes: SMALL }),
    /3 games in a row/,
  );
  assert.deepEqual(saved, [games[2].id]);
  assert.equal(engine.created, 5, "failures 1, 2, success, then 1, 2, 3");
  assert.deepEqual(engine.disposed, [0, 1, 2, 3, 4]);
});

test("with two workers a fatal stop releases every engine", async () => {
  const store = memoryInsightsStore();
  await store.putGames(fixtureGames().slice(0, 6));
  const engine = engines(() => "fail");
  await assert.rejects(
    analysePending({ store, createSearch: engine.createSearch, workers: 2, nodes: SMALL }),
    /3 games in a row/,
  );
  assert.ok(engine.created >= 3);
  assert.equal(engine.disposed.length, engine.created, "every engine that was started is disposed");
});

test("a game whose own data is broken is skipped without counting against the engine", async () => {
  const good = fixtureGames().slice(0, 2);
  const broken = brokenGames(good[0], 3);
  const { store, saved } = trackingStore();
  await store.putGames([...broken, ...good]);
  const engine = engines();
  const result = await analysePending({ store, createSearch: engine.createSearch, workers: 1, nodes: SMALL });
  assert.equal(result.analysed, 2);
  assert.deepEqual(
    result.failed.map((f) => f.gameId).sort(),
    broken.map((g) => g.id).sort(),
  );
  assert.ok(result.failed.every((f) => /move count does not match/.test(f.message)));
  assert.equal(engine.created, 1, "the engine was not blamed or replaced");
  assert.deepEqual([...saved].sort(), good.map((g) => g.id).sort());
});

test("a failed engine start counts as an engine failure", async () => {
  const store = memoryInsightsStore();
  await store.putGames(fixtureGames().slice(0, 4));
  let attempts = 0;
  await assert.rejects(
    analysePending({
      store,
      createSearch: () => {
        attempts++;
        throw new Error("Stockfish could not load.");
      },
      workers: 1,
    }),
    /3 games in a row[\s\S]*Stockfish could not load\./,
  );
  assert.equal(attempts, 3);
});

test("a failure to save stops the run with the store's message", async () => {
  const base = memoryInsightsStore();
  const store: InsightsStore = {
    ...base,
    async putAnalysis() {
      throw new Error("Your browser has run out of storage space for saved insights.");
    },
  };
  await base.putGames(fixtureGames().slice(0, 3));
  const engine = engines();
  await assert.rejects(
    analysePending({ store, createSearch: engine.createSearch, workers: 2, nodes: SMALL }),
    /run out of storage space/,
  );
  assert.equal(engine.disposed.length, engine.created);
});

test("a run ends without saving anything more once another tab clears the store", async () => {
  const games = fixtureGames().slice(0, 7);
  const { store, saved } = trackingStore();
  await store.putGames(games);
  const engine = engines();
  let cleared = false;
  const result = await analysePending({
    store,
    createSearch: engine.createSearch,
    workers: 2,
    nodes: SMALL,
    onProgress: (p) => {
      // Stands in for "Use a different account" in another tab, part-way into the first games.
      if (!cleared && p.positionsDone >= 5) {
        cleared = true;
        void store.clear();
      }
    },
  });
  assert.ok(cleared);
  assert.deepEqual(saved, [], "no analysis is written for a game that is no longer stored");
  assert.deepEqual(await store.listAnalyses(), []);
  assert.equal(result.total, 7);
  assert.equal(result.analysed, 0);
  assert.deepEqual(result.failed, []);
  assert.equal(result.cancelled, false);
  const positions = games.slice(0, 2).reduce((sum, game) => sum + game.plyCount + 1, 0);
  assert.ok(engine.calls.length <= positions, "only the two games already in flight were searched");
  assert.equal(engine.disposed.length, engine.created, "every engine is released");
});

// ---------- snapshot ----------

test("the snapshot pairs games with analyses and builds the report and leaks", async () => {
  const games = fixtureGames();
  const store = memoryInsightsStore();
  const fetch = fakeFetch();
  await importGames({ store, username: "GothamChess", max: 50, timeClasses: [...ALL], fetchImpl: fetch.impl });
  const empty = await loadSnapshot(store);
  assert.equal(empty.pending, games.length);
  assert.equal(empty.report.games, games.length);
  assert.equal(empty.report.analysed, 0);
  assert.deepEqual(empty.leaks, []);

  const engine = engines();
  await analysePending({ store, createSearch: engine.createSearch, workers: 2, nodes: SMALL });
  const attempt = attemptFor(games[0].id);
  await store.putAttempt(attempt);
  // An analysis for a game that is not stored is ignored.
  await store.putAnalysis({ ...fakeAnalysis(games[0]), gameId: "chesscom-gone" });

  const snapshot = await loadSnapshot(store);
  assert.equal(snapshot.meta?.username, "GothamChess");
  assert.equal(snapshot.report.username, "GothamChess");
  assert.deepEqual(snapshot.games.map((g) => g.id), games.map((g) => g.id));
  assert.equal(snapshot.analyses.length, games.length);
  assert.equal(snapshot.assessments.length, games.length);
  assert.equal(snapshot.pending, 0);
  assert.equal(snapshot.unreadable, 0);
  assert.equal(snapshot.report.analysed, games.length);
  assert.deepEqual(snapshot.attempts, [attempt]);
  const flattened = snapshot.assessments.flatMap((a) => a.leaks);
  assert.ok(flattened.length > 0, "the scripted scores produce leaks");
  assert.equal(snapshot.leaks.length, flattened.length);
  assert.ok(snapshot.leaks.every((leak, i) => i === 0 || snapshot.leaks[i - 1].drop >= leak.drop));
  assert.equal(snapshot.report.time.leaks, snapshot.leaks.length);

  // Unchanged analyses reuse the earlier assessment instead of replaying the game again.
  const again = await loadSnapshot(store, snapshot);
  assert.ok(again.assessments.every((a, i) => a === snapshot.assessments[i]));
  assert.deepEqual(again.report, snapshot.report);
});

test("a game whose analysis cannot be read is skipped and counted, not fatal", async () => {
  const games = fixtureGames().slice(0, 3);
  const store = memoryInsightsStore();
  await store.putGames(games);
  await store.setMeta({ source: "chesscom", username: "gothamchess", importedAt: new Date(0).toISOString(), max: 3, timeClasses: [...ALL] });
  const engine = engines();
  await analysePending({ store, createSearch: engine.createSearch, workers: 1, nodes: SMALL });

  // Game 0: a complete analysis whose best move at a real mistake is illegal.
  const target = games[0];
  const userPly = target.userColor === "white" ? 1 : 2;
  const evals = fakeAnalysis(target).evals.map(() => ({ kind: "cp" as const, value: 0 }));
  evals[userPly] = { kind: "cp", value: target.userColor === "white" ? -900 : 900 };
  const best = Array.from({ length: target.plyCount + 1 }, () => "a1a1");
  await store.putAnalysis({ ...fakeAnalysis(target), evals, best });
  // Game 1: an analysis that is too short is not unreadable, just pending.
  const short = fakeAnalysis(games[1]);
  await store.putAnalysis({ ...short, evals: short.evals.slice(1), best: short.best.slice(1), lines: short.lines.slice(1), depths: short.depths.slice(1) });

  const snapshot = await loadSnapshot(store);
  assert.equal(snapshot.unreadable, 1);
  assert.equal(snapshot.pending, 1);
  assert.deepEqual(snapshot.assessments.map((a) => a.gameId), [games[2].id]);
  assert.equal(snapshot.report.analysed, 1);
  assert.equal(snapshot.report.games, 3);

  // The short one is what the next run picks up.
  const next = await analysePending({ store, createSearch: engines().createSearch, workers: 1, nodes: SMALL });
  assert.equal(next.total, 1);
});

// ---------- device ----------

test("recommended workers: one on small, phone-like or unknown devices, otherwise two", () => {
  const saved = {
    navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    matchMedia: Object.getOwnPropertyDescriptor(globalThis, "matchMedia"),
    screen: Object.getOwnPropertyDescriptor(globalThis, "screen"),
  };
  const set = (nav: object, coarse: boolean, size: [number, number]) => {
    Object.defineProperty(globalThis, "navigator", { value: nav, configurable: true, writable: true });
    Object.defineProperty(globalThis, "matchMedia", {
      value: (query: string) => ({ matches: query === "(pointer: coarse)" && coarse }),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "screen", { value: { width: size[0], height: size[1] }, configurable: true, writable: true });
  };
  try {
    set({ hardwareConcurrency: 10, deviceMemory: 8 }, false, [1440, 900]);
    assert.equal(recommendedWorkers(), 2);
    set({ hardwareConcurrency: 8 }, false, [1440, 900]);
    assert.equal(recommendedWorkers(), 2, "no memory figure (Safari, Firefox) is not a reason to hold back");
    set({ hardwareConcurrency: 4, deviceMemory: 8 }, false, [1440, 900]);
    assert.equal(recommendedWorkers(), 1);
    set({ hardwareConcurrency: 12, deviceMemory: 2 }, false, [1440, 900]);
    assert.equal(recommendedWorkers(), 1);
    set({ hardwareConcurrency: 8, deviceMemory: 8 }, true, [390, 844]);
    assert.equal(recommendedWorkers(), 1, "a phone");
    set({ hardwareConcurrency: 8, deviceMemory: 8 }, true, [1024, 1366]);
    assert.equal(recommendedWorkers(), 2, "a large touch tablet");
    set({}, false, [1440, 900]);
    assert.equal(recommendedWorkers(), 1, "unknown core count");
  } finally {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as Record<string, unknown>)[key];
    }
  }
});

// ---------- helpers ----------

function fakeAnalysis(game: ImportedGame): GameAnalysis {
  const size = game.plyCount + 1;
  return {
    gameId: game.id,
    version: ANALYSIS_VERSION,
    nodes: SMALL,
    analysedAt: new Date(0).toISOString(),
    evals: Array.from({ length: size }, () => ({ kind: "cp" as const, value: 0 })),
    best: Array.from({ length: size }, () => ""),
    lines: Array.from({ length: size }, () => []),
    depths: Array.from({ length: size }, () => 0),
  };
}

function attemptFor(gameId: string): RetryAttempt {
  return {
    id: `${gameId}:attempt-1`,
    decisionId: `${gameId}:1`,
    gameId,
    playerColor: "white",
    ply: 1,
    fenBefore: new Chess().fen(),
    playedUci: "e2e4",
    at: new Date(1_800_000_000_000).toISOString(),
    triedSan: "d4",
    triedUci: "d2d4",
    hints: 0,
    misses: 0,
    outcome: "independent",
    loss: null,
    evaluation: null,
  };
}

/** Games that pass store validation but whose recorded move count does not match their PGN. */
function brokenGames(source: ImportedGame, count: number): ImportedGame[] {
  return Array.from({ length: count }, (_, i) => {
    const plyCount = source.plyCount + 2;
    return {
      ...source,
      id: `chesscom-broken-${i}`,
      endTime: source.endTime + 1000 * (i + 1),
      plyCount,
      clocks: Array.from({ length: plyCount }, () => null),
    };
  });
}
