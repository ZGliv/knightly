import "fake-indexeddb/auto";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  INSIGHTS_DB_NAME,
  memoryInsightsStore,
  openInsightsStore,
  type InsightsStore,
} from "../lib/insights/store";
import { ANALYSIS_VERSION, type GameAnalysis, type ImportedGame, type InsightsMeta } from "../lib/insights/types";
import type { RetryAttempt } from "../lib/learning/coach/model";

const game = (n: number, overrides: Partial<ImportedGame> = {}): ImportedGame => ({
  id: `chesscom-${n}`,
  source: "chesscom",
  url: `https://www.chess.com/game/live/${n}`,
  pgn: '[Event "Live Chess"]\n\n1. e4 {[%clk 0:04:59]} e5 {[%clk 0:04:58]} 1-0',
  endTime: 1_700_000_000_000 + n * 60_000,
  timeClass: "blitz",
  baseSec: 300,
  incSec: 0,
  rated: true,
  white: { name: "tester", rating: 1200 },
  black: { name: "rival", rating: 1210 },
  userColor: "white",
  outcome: "win",
  resultCode: "win",
  termination: "won by resignation",
  ecoCode: "C20",
  openingName: "King's Pawn Opening",
  openingFamily: "King's Pawn Opening",
  plyCount: 2,
  clocks: [299, 298],
  ...overrides,
});

const analysis = (gameId: string, overrides: Partial<GameAnalysis> = {}): GameAnalysis => ({
  gameId,
  version: ANALYSIS_VERSION,
  nodes: 150_000,
  analysedAt: "2026-11-11T10:00:00.000Z",
  evals: [
    { kind: "cp", value: 20 },
    { kind: "cp", value: 35 },
    { kind: "mate", winner: "white", moves: 3 },
  ],
  best: ["e2e4", "e7e5", ""],
  lines: [["e2e4", "e7e5"], ["e7e5"], []],
  depths: [14, 13, 0],
  ...overrides,
});

const attempt = (id: string, at: string): RetryAttempt => ({
  id,
  decisionId: "chesscom-1:3",
  gameId: "chesscom-1",
  playerColor: "white",
  ply: 3,
  fenBefore: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
  playedUci: "f1c4",
  at,
  triedSan: "Nf3",
  triedUci: "g1f3",
  hints: 0,
  misses: 0,
  outcome: "independent",
  loss: 0,
  evaluation: { kind: "cp", value: 30 },
});

const meta: InsightsMeta = {
  source: "chesscom",
  username: "tester",
  importedAt: "2026-11-11T09:00:00.000Z",
  max: 100,
  timeClasses: ["blitz", "rapid"],
};

const corrupt = <T>(value: unknown) => value as T;

function deleteDatabase() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(INSIGHTS_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("delete blocked"));
  });
}

const backends: { name: string; open: () => Promise<InsightsStore> }[] = [
  {
    name: "IndexedDB",
    open: async () => {
      await deleteDatabase();
      return openInsightsStore();
    },
  },
  { name: "memory", open: async () => memoryInsightsStore() },
];

for (const backend of backends) {
  describe(`${backend.name} insights store`, () => {
    async function withStore(run: (store: InsightsStore) => Promise<void>) {
      const store = await backend.open();
      try {
        await run(store);
      } finally {
        store.close();
      }
    }

    test("starts empty", () =>
      withStore(async (store) => {
        assert.deepEqual(await store.listGames(), []);
        assert.deepEqual(await store.listAnalyses(), []);
        assert.deepEqual(await store.listAttempts(), []);
        assert.equal(await store.getMeta(), null);
      }));

    test("putGames merges by id, keeps analyses and lists newest first", () =>
      withStore(async (store) => {
        await store.putGames([game(1), game(3), game(2)]);
        await store.putAnalysis(analysis("chesscom-1"));
        await store.putGames([game(1, { outcome: "loss", resultCode: "resigned" }), game(4)]);
        const listed = await store.listGames();
        assert.deepEqual(listed.map((g) => g.id), ["chesscom-4", "chesscom-3", "chesscom-2", "chesscom-1"]);
        assert.equal(listed.find((g) => g.id === "chesscom-1")?.outcome, "loss");
        assert.deepEqual(await store.listAnalyses(), [analysis("chesscom-1")]);
        await store.putGames([]);
        assert.equal((await store.listGames()).length, 4);
      }));

    test("returned records are copies, not live references", () =>
      withStore(async (store) => {
        const original = game(1);
        await store.putGames([original]);
        original.white.name = "changed";
        const [first] = await store.listGames();
        assert.equal(first.white.name, "tester");
        first.openingName = "mutated";
        assert.equal((await store.listGames())[0].openingName, "King's Pawn Opening");
      }));

    test("analyses replace by game id and stale versions are dropped", () =>
      withStore(async (store) => {
        await store.putAnalysis(analysis("chesscom-2"));
        await store.putAnalysis(analysis("chesscom-1", { nodes: 1 }));
        await store.putAnalysis(analysis("chesscom-1"));
        await store.putAnalysis(analysis("chesscom-3", { version: ANALYSIS_VERSION + 1 }));
        await store.putAnalysis(analysis("chesscom-4", { version: 0 }));
        const listed = await store.listAnalyses();
        assert.deepEqual(listed.map((a) => a.gameId), ["chesscom-1", "chesscom-2"]);
        assert.equal(listed[0].nodes, 150_000);
      }));

    test("corrupt records are skipped instead of breaking a listing", () =>
      withStore(async (store) => {
        await store.putGames([
          game(1),
          corrupt<ImportedGame>({ id: "chesscom-2", pgn: 42 }),
          game(3, { clocks: [1] }),
          game(5, { userColor: corrupt<"white">("green") }),
          game(6, { id: "bad id with spaces" }),
        ]);
        assert.deepEqual((await store.listGames()).map((g) => g.id), ["chesscom-1"]);

        await store.putAnalysis(analysis("chesscom-1"));
        await store.putAnalysis(analysis("chesscom-2", { best: ["e2e4"] }));
        await store.putAnalysis(analysis("chesscom-3", { lines: corrupt<string[][]>(["e2e4", "e7e5", ""]) }));
        await store.putAnalysis(analysis("chesscom-4", { evals: corrupt<GameAnalysis["evals"]>([{ kind: "cp" }, null, 3]) }));
        await store.putAnalysis(analysis("chesscom-5", { evals: [], best: [], lines: [], depths: [] }));
        await store.putAnalysis(corrupt<GameAnalysis>({ gameId: "chesscom-6", version: ANALYSIS_VERSION }));
        assert.deepEqual((await store.listAnalyses()).map((a) => a.gameId), ["chesscom-1"]);

        await store.putAttempt(attempt("a1", "2026-11-11T10:00:00.000Z"));
        await store.putAttempt(corrupt<RetryAttempt>({ id: "a2", outcome: "maybe" }));
        assert.deepEqual((await store.listAttempts()).map((a) => a.id), ["a1"]);

        await store.setMeta(corrupt<InsightsMeta>({ source: "chesscom", username: "" }));
        assert.equal(await store.getMeta(), null);
      }));

    test("attempts are kept by id and listed oldest first", () =>
      withStore(async (store) => {
        await store.putAttempt(attempt("b", "2026-11-11T12:00:00.000Z"));
        await store.putAttempt(attempt("a", "2026-11-11T11:00:00.000Z"));
        await store.putAttempt({ ...attempt("b", "2026-11-11T12:00:00.000Z"), outcome: "not-yet" });
        const listed = await store.listAttempts();
        assert.deepEqual(listed.map((a) => a.id), ["a", "b"]);
        assert.equal(listed[1].outcome, "not-yet");
      }));

    test("meta round-trips and is replaced on set", () =>
      withStore(async (store) => {
        await store.setMeta(meta);
        assert.deepEqual(await store.getMeta(), meta);
        await store.setMeta({ ...meta, username: "other", max: 50 });
        assert.equal((await store.getMeta())?.username, "other");
      }));

    test("clear empties every store", () =>
      withStore(async (store) => {
        await store.putGames([game(1), game(2)]);
        await store.putAnalysis(analysis("chesscom-1"));
        await store.putAttempt(attempt("a", "2026-11-11T11:00:00.000Z"));
        await store.setMeta(meta);
        await store.clear();
        assert.deepEqual(await store.listGames(), []);
        assert.deepEqual(await store.listAnalyses(), []);
        assert.deepEqual(await store.listAttempts(), []);
        assert.equal(await store.getMeta(), null);
        await store.putGames([game(7)]);
        assert.equal((await store.listGames()).length, 1);
      }));

    test("a record without its key is rejected and nothing from that batch is saved", () =>
      withStore(async (store) => {
        await assert.rejects(store.putGames([game(1), corrupt<ImportedGame>({ pgn: "1. e4 *" })]));
        assert.deepEqual(await store.listGames(), []);
      }));

    test("a record with a missing or non-text key is refused with a readable message", () =>
      withStore(async (store) => {
        await assert.rejects(store.putGames([game(1), corrupt<ImportedGame>({ pgn: "1. e4 *" })]), /^Error: Saving insights failed/);
        await assert.rejects(store.putGames([game(2, { id: corrupt<string>(42) })]), /^Error: Saving insights failed/);
        await assert.rejects(store.putAnalysis(corrupt<GameAnalysis>({ version: ANALYSIS_VERSION })), /^Error: Saving insights failed/);
        await assert.rejects(store.putAttempt(corrupt<RetryAttempt>({ at: "2026-11-11T11:00:00.000Z" })), /^Error: Saving insights failed/);
        assert.deepEqual(await store.listGames(), []);
        assert.deepEqual(await store.listAnalyses(), []);
        assert.deepEqual(await store.listAttempts(), []);
      }));

    test("a closed store rejects further use", async () => {
      const store = await backend.open();
      store.close();
      store.close();
      await assert.rejects(store.listGames(), /closed/);
      await assert.rejects(store.putGames([game(1)]), /closed/);
    });

    test("a closed store rejects every method, even a write with nothing in it", async () => {
      const store = await backend.open();
      store.close();
      await assert.rejects(store.putGames([]), /closed/);
      await assert.rejects(store.putAnalysis(analysis("chesscom-1")), /closed/);
      await assert.rejects(store.listAnalyses(), /closed/);
      await assert.rejects(store.putAttempt(attempt("a", "2026-11-11T11:00:00.000Z")), /closed/);
      await assert.rejects(store.listAttempts(), /closed/);
      await assert.rejects(store.getMeta(), /closed/);
      await assert.rejects(store.setMeta(meta), /closed/);
      await assert.rejects(store.clear(), /closed/);
    });
  });
}

describe("IndexedDB persistence", () => {
  test("reopening the database still sees the data", async () => {
    await deleteDatabase();
    const first = await openInsightsStore();
    await first.putGames([game(1), game(2)]);
    await first.putAnalysis(analysis("chesscom-2"));
    await first.putAttempt(attempt("a", "2026-11-11T11:00:00.000Z"));
    await first.setMeta(meta);
    first.close();

    const second = await openInsightsStore();
    try {
      assert.deepEqual((await second.listGames()).map((g) => g.id), ["chesscom-2", "chesscom-1"]);
      assert.deepEqual(await second.listAnalyses(), [analysis("chesscom-2")]);
      assert.equal((await second.listAttempts()).length, 1);
      assert.deepEqual(await second.getMeta(), meta);
    } finally {
      second.close();
    }
  });

  test("asks the browser to keep the data and ignores a refusal", async () => {
    await deleteDatabase();
    let asked = 0;
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        storage: {
          persist: () => {
            asked++;
            return Promise.reject(new Error("denied"));
          },
        },
      },
    });
    try {
      const store = await openInsightsStore();
      store.close();
      assert.equal(asked, 1);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "navigator", descriptor);
      else Reflect.deleteProperty(globalThis, "navigator");
    }
  });

  test("a write the browser refuses reports its reason and saves nothing from that batch", async () => {
    await deleteDatabase();
    const store = await openInsightsStore();
    const proto = globalThis.IDBObjectStore.prototype;
    const put = Object.getOwnPropertyDescriptor(proto, "put");
    assert.ok(put);
    // Make a repeated key fail at request time (ConstraintError), the way a real request error arrives.
    Object.defineProperty(proto, "put", {
      configurable: true,
      writable: true,
      value(this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
        return this.add(value, key);
      },
    });
    try {
      await store.putGames([game(1)]);
      await assert.rejects(store.putGames([game(2), game(1)]), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /^Saving insights failed: \S/);
        return true;
      });
    } finally {
      Object.defineProperty(proto, "put", put);
    }
    try {
      assert.deepEqual((await store.listGames()).map((g) => g.id), ["chesscom-1"]);
    } finally {
      store.close();
    }
  });

  test("another tab deleting the database is not blocked, and this store steps aside", async () => {
    await deleteDatabase();
    const store = await openInsightsStore();
    await store.putGames([game(1)]);
    await deleteDatabase();
    await assert.rejects(store.listGames(), /closed/);
    store.close();
    const fresh = await openInsightsStore();
    try {
      assert.deepEqual(await fresh.listGames(), []);
    } finally {
      fresh.close();
    }
  });

  test("rejects with a clear error when IndexedDB is missing", async () => {
    const saved = globalThis.indexedDB;
    Object.assign(globalThis, { indexedDB: undefined });
    try {
      await assert.rejects(openInsightsStore(), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /not letting the app save insights/);
        return true;
      });
    } finally {
      Object.assign(globalThis, { indexedDB: saved });
    }
  });

  test("rejects with a clear error when the browser refuses to open the database", async () => {
    const saved = globalThis.indexedDB;
    Object.assign(globalThis, {
      indexedDB: {
        open: () => {
          throw new DOMException("The operation is insecure.", "SecurityError");
        },
      },
    });
    try {
      await assert.rejects(openInsightsStore(), /not letting the app save insights \(The operation is insecure\.\)/);
    } finally {
      Object.assign(globalThis, { indexedDB: saved });
    }
  });
});
