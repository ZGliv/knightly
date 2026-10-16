import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Chess, DEFAULT_POSITION } from "chess.js";
import { importPgn, recordGame, validateGame } from "../lib/chess/game-record";
import { generateReview } from "../lib/chess/review-generator";
import { analyzeMove } from "../lib/chess/analyze-move";
import {
  listGamesLocal,
  saveGameLocal,
  importGames,
  exportGames,
  restorePrevious,
  GAMES_KEY,
  getActiveGame,
  setActiveGame,
} from "../lib/storage/local-games";
const store = new Map<string, string>();
const storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => store.delete(key),
};
Object.assign(globalThis, { window: {}, localStorage: storage });
beforeEach(() => store.clear());
const sample = () => importPgn("1. e4 e5 2. Nf3 Nc6 *");
test("legal PGN can round-trip through validated storage and active resume", () => {
  const g = sample();
  saveGameLocal(g);
  setActiveGame(g.id);
  assert.equal(getActiveGame()?.fenFinal, g.fenFinal);
  assert.equal(listGamesLocal().length, 1);
  saveGameLocal(g);
  assert.equal(listGamesLocal().length, 1);
});
test("invalid SAN and fabricated final positions are rejected", () => {
  assert.throws(() => importPgn("1. e5 *"));
  assert.throws(() =>
    validateGame({ ...sample(), fenFinal: DEFAULT_POSITION }),
  );
});
test("checkmate cannot be restored as unfinished", () => {
  const g = importPgn("1. f3 e5 2. g4 Qh4# 0-1");
  assert.equal(g.result, "0-1");
  assert.throws(() => validateGame({ ...g, result: "*" }));
});
test("standard chess supports castling, en passant and promotion", () => {
  const c = new Chess();
  for (const m of ["e4", "a6", "e5", "d5", "exd6"]) c.move(m);
  assert.equal(c.get("d5"), undefined);
  const castle = importPgn("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O *");
  assert.equal(new Chess(castle.fenFinal).get("g1")?.type, "k");
  const promotion = new Chess("7k/P7/8/8/8/8/8/7K w - - 0 1");
  assert.equal(
    promotion.move({ from: "a7", to: "a8", promotion: "n" }).promotion,
    "n",
  );
});
test("stalemate and insufficient material are draws", () => {
  assert.equal(
    recordGame(new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")).result,
    "1/2-1/2",
  );
  assert.equal(
    recordGame(new Chess("7k/8/8/8/8/8/8/K7 w - - 0 1")).result,
    "1/2-1/2",
  );
});
test("threefold repetition survives PGN reload", () => {
  const g = importPgn("1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 1/2-1/2");
  assert.equal(g.result, "1/2-1/2");
  assert.equal(validateGame(g).result, "1/2-1/2");
});
test("no evidence produces no invented phase scores", () => {
  const summary = generateReview(sample().moves, "*");
  assert.deepEqual(summary.phaseStrength, {
    opening: null,
    middlegame: null,
    endgame: null,
  });
  assert.equal(summary.recurringWeaknesses.length, 0);
});
test("legacy games keep their original prose clearly marked unverified", () => {
  const g = sample();
  g.moves[0].coachText = "The legacy coaching note";
  const restored = validateGame(g);
  assert.match(
    restored.moves[0].coachText!,
    /Legacy note.*legacy coaching note/,
  );
  assert.equal(restored.moves[0].classification, undefined);
});
test("corrupt library never gets silently overwritten", () => {
  store.set(GAMES_KEY, "corrupt-data");
  assert.throws(() => listGamesLocal());
  assert.throws(() => saveGameLocal(sample()));
  assert.equal(store.get(GAMES_KEY), "corrupt-data");
});
test("previous valid snapshot can recover a corrupt current library", () => {
  const g = sample();
  saveGameLocal(g);
  saveGameLocal({ ...g, engineLevel: 10 });
  store.set(GAMES_KEY, "corrupt");
  restorePrevious();
  assert.equal(listGamesLocal()[0].engineLevel, 7);
  assert.equal(store.get("buddymine_recovery_original"), "corrupt");
});
test("backup import merges but never replaces a same-id local game", () => {
  const g = sample();
  saveGameLocal(g);
  const backup = exportGames();
  assert.equal(importGames(backup), 0);
  assert.equal(importGames(JSON.stringify([{ ...g, id: "another-game" }])), 1);
  assert.equal(listGamesLocal().length, 2);
});
test("invalid backup is atomic and preserves library", () => {
  saveGameLocal(sample());
  const before = store.get(GAMES_KEY);
  assert.throws(() => importGames(JSON.stringify([sample(), { id: "bad" }])));
  assert.equal(store.get(GAMES_KEY), before);
});
test("backup size and custom starting positions are bounded", () => {
  assert.throws(() => importGames("x".repeat(8000001)));
  assert.throws(() =>
    importPgn(
      '[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n1. a8=Q+ *',
    ),
  );
});
test("analysis compares opposite side-to-move scores and records search evidence", async () => {
  const c = new Chess();
  c.move("e4");
  const m = recordGame(c).moves[0];
  let calls = 0;
  const analyzed = await analyzeMove(DEFAULT_POSITION, m, async () => ({
    bestMove: "e2e4",
    scoreCp: ++calls === 1 ? 50 : 20,
    mateIn: null,
    depth: 12,
    pv: [],
  }));
  assert.equal(analyzed.cpLoss, 70);
  assert.equal(analyzed.classification, "good");
  assert.equal(analyzed.bestSan, "e4");
  assert.equal(analyzed.evalCp, -20);
  assert.match(analyzed.coachText!, /0.70 pawn/);
});
test("mate evidence never becomes an invented centipawn grade", async () => {
  const c = new Chess();
  c.move("e4");
  const m = recordGame(c).moves[0];
  const analyzed = await analyzeMove(DEFAULT_POSITION, m, async () => ({
    bestMove: "e2e4",
    scoreCp: null,
    mateIn: 3,
    depth: 10,
    pv: [],
  }));
  assert.equal(analyzed.cpLoss, undefined);
  assert.equal(analyzed.classification, undefined);
  assert.match(analyzed.coachText!, /forced mate/);
});

test('quota failure preserves the last saved library', () => {
  const game = sample();
  saveGameLocal(game);
  const previous = store.get(GAMES_KEY);
  const setItem = storage.setItem;
  storage.setItem = (key, value) => {
    if (key === GAMES_KEY) throw new Error('QuotaExceededError');
    setItem(key, value);
  };
  try {
    assert.throws(() => saveGameLocal({ ...game, engineLevel: 20 }), /could not save/);
    assert.equal(store.get(GAMES_KEY), previous);
  } finally {
    storage.setItem = setItem;
  }
});
