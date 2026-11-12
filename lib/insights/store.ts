import type { RetryAttempt } from "@/lib/learning/coach/model";
import {
  ANALYSIS_VERSION,
  type GameAnalysis,
  type ImportedGame,
  type InsightsMeta,
} from "@/lib/insights/types";

/**
 * Browser-only storage for "Your leaks". Imported games, their engine analysis and
 * puzzle attempts live in their own IndexedDB database, never in the saved-game library.
 * Every listing validates records on the way out, so one corrupt record is skipped
 * instead of breaking the whole page.
 */

export interface InsightsStore {
  putGames(games: ImportedGame[]): Promise<void>;
  listGames(): Promise<ImportedGame[]>;
  putAnalysis(a: GameAnalysis): Promise<void>;
  listAnalyses(): Promise<GameAnalysis[]>;
  putAttempt(a: RetryAttempt): Promise<void>;
  listAttempts(): Promise<RetryAttempt[]>;
  getMeta(): Promise<InsightsMeta | null>;
  setMeta(m: InsightsMeta): Promise<void>;
  clear(): Promise<void>;
  close(): void;
}

export const INSIGHTS_DB_NAME = "knightly_insights_v1";
const DB_VERSION = 1;
const GAMES = "games";
const ANALYSES = "analyses";
const ATTEMPTS = "attempts";
const META = "meta";
const META_KEY = "current";
const ALL_STORES = [GAMES, ANALYSES, ATTEMPTS, META];

const closedError = () => new Error("The saved insights store has been closed. Reload the page to open it again.");

// ---------- validation ----------

type Rec = Record<string, unknown>;
const isRecord = (value: unknown): value is Rec => typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isNonNegativeInt = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;
const isColor = (value: unknown) => value === "white" || value === "black";
const ID_PATTERN = /^[\w-]{1,100}$/;
const TIME_CLASSES = new Set(["bullet", "blitz", "rapid", "daily"]);
const OUTCOMES = new Set(["win", "draw", "loss"]);
const ATTEMPT_OUTCOMES = new Set(["independent", "supported", "not-yet"]);

function isPlayer(value: unknown) {
  return isRecord(value) && isString(value.name) && (value.rating === null || isFiniteNumber(value.rating));
}

function isEvaluation(value: unknown) {
  if (!isRecord(value)) return false;
  if (value.kind === "cp") return isFiniteNumber(value.value);
  if (value.kind === "mate") return isColor(value.winner) && isNonNegativeInt(value.moves);
  return false;
}

export function isValidGame(value: unknown): value is ImportedGame {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) && ID_PATTERN.test(value.id) &&
    value.source === "chesscom" &&
    isString(value.url) &&
    isString(value.pgn) && value.pgn.length > 0 &&
    isFiniteNumber(value.endTime) &&
    TIME_CLASSES.has(value.timeClass as string) &&
    isFiniteNumber(value.baseSec) &&
    isFiniteNumber(value.incSec) &&
    typeof value.rated === "boolean" &&
    isPlayer(value.white) &&
    isPlayer(value.black) &&
    isColor(value.userColor) &&
    OUTCOMES.has(value.outcome as string) &&
    isString(value.resultCode) &&
    isString(value.termination) &&
    (value.ecoCode === null || isString(value.ecoCode)) &&
    isString(value.openingName) &&
    isString(value.openingFamily) &&
    isNonNegativeInt(value.plyCount) &&
    Array.isArray(value.clocks) &&
    value.clocks.length === value.plyCount &&
    value.clocks.every((c) => c === null || isFiniteNumber(c))
  );
}

export function isValidAnalysis(value: unknown): value is GameAnalysis {
  if (!isRecord(value)) return false;
  if (value.version !== ANALYSIS_VERSION) return false;
  if (!isString(value.gameId) || !ID_PATTERN.test(value.gameId)) return false;
  if (!isFiniteNumber(value.nodes) || !isString(value.analysedAt)) return false;
  const { evals, best, lines, depths } = value;
  if (!Array.isArray(evals) || evals.length === 0) return false;
  const size = evals.length;
  if (!Array.isArray(best) || best.length !== size) return false;
  if (!Array.isArray(lines) || lines.length !== size) return false;
  if (!Array.isArray(depths) || depths.length !== size) return false;
  return (
    evals.every(isEvaluation) &&
    best.every(isString) &&
    lines.every((line) => Array.isArray(line) && line.every(isString)) &&
    depths.every(isFiniteNumber)
  );
}

export function isValidAttempt(value: unknown): value is RetryAttempt {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) && value.id.length > 0 &&
    isString(value.decisionId) &&
    isString(value.gameId) &&
    isColor(value.playerColor) &&
    isNonNegativeInt(value.ply) &&
    isString(value.fenBefore) &&
    isString(value.playedUci) &&
    isString(value.at) &&
    isString(value.triedSan) &&
    isString(value.triedUci) &&
    isNonNegativeInt(value.hints) &&
    isNonNegativeInt(value.misses) &&
    ATTEMPT_OUTCOMES.has(value.outcome as string) &&
    (value.loss === null || isFiniteNumber(value.loss)) &&
    (value.evaluation === null || isEvaluation(value.evaluation))
  );
}

export function isValidMeta(value: unknown): value is InsightsMeta {
  if (!isRecord(value)) return false;
  return (
    value.source === "chesscom" &&
    isString(value.username) && value.username.length > 0 &&
    isString(value.importedAt) &&
    isNonNegativeInt(value.max) &&
    Array.isArray(value.timeClasses) &&
    value.timeClasses.every((t) => TIME_CLASSES.has(t as string))
  );
}

// ---------- shared ordering ----------

const newestFirst = (a: ImportedGame, b: ImportedGame) => b.endTime - a.endTime || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const byGameId = (a: GameAnalysis, b: GameAnalysis) => (a.gameId < b.gameId ? -1 : a.gameId > b.gameId ? 1 : 0);
const byTime = (a: RetryAttempt, b: RetryAttempt) =>
  a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

function finishGames(raw: unknown[]) {
  return raw.filter(isValidGame).sort(newestFirst);
}
function finishAnalyses(raw: unknown[]) {
  return raw.filter(isValidAnalysis).sort(byGameId);
}
function finishAttempts(raw: unknown[]) {
  return raw.filter(isValidAttempt).sort(byTime);
}

// ---------- IndexedDB ----------

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("A saved insights request failed."));
  });
}

function storageFailure(error: DOMException | Error | null | undefined) {
  if (error?.name === "QuotaExceededError") return new Error("Your browser has run out of storage space for saved insights.");
  return new Error(error?.message ? `Saving insights failed: ${error.message}` : "Saving insights failed.");
}

/** The record's key, checked the same way by both stores before anything is written. */
function keyOf(value: unknown, field: string) {
  const key = isRecord(value) ? value[field] : undefined;
  if (!isString(key) || key.length === 0) throw new Error(`Saving insights failed: the record has no ${field}.`);
  return key;
}

class IndexedDbInsightsStore implements InsightsStore {
  private closed = false;

  constructor(private readonly db: IDBDatabase) {
    // Another tab upgrading or deleting the database: step aside instead of blocking it.
    db.onversionchange = () => this.close();
    db.onclose = () => {
      this.closed = true;
    };
  }

  private transaction(stores: string[], mode: IDBTransactionMode) {
    if (this.closed) throw closedError();
    return this.db.transaction(stores, mode);
  }

  private async write(stores: string[], fill: (tx: IDBTransaction) => void) {
    const tx = this.transaction(stores, "readwrite");
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      // A failed request reaches the transaction before tx.error is set, so read the request's own error.
      tx.onerror = (event) => reject(storageFailure((event.target as IDBRequest | null)?.error ?? tx.error));
      tx.onabort = () => reject(storageFailure(tx.error));
    });
    try {
      fill(tx);
    } catch (error) {
      try {
        tx.abort();
      } catch {
        // The transaction already finished or aborted; the original error is what matters.
      }
      done.catch(() => undefined);
      throw storageFailure(error instanceof Error ? error : null);
    }
    await done;
  }

  private async readAll(store: string) {
    const tx = this.transaction([store], "readonly");
    return requestResult(tx.objectStore(store).getAll()) as Promise<unknown[]>;
  }

  async putGames(games: ImportedGame[]) {
    if (this.closed) throw closedError();
    for (const game of games) keyOf(game, "id");
    if (games.length === 0) return;
    await this.write([GAMES], (tx) => {
      const store = tx.objectStore(GAMES);
      for (const game of games) store.put(game);
    });
  }

  async listGames() {
    return finishGames(await this.readAll(GAMES));
  }

  async putAnalysis(analysis: GameAnalysis) {
    if (this.closed) throw closedError();
    keyOf(analysis, "gameId");
    await this.write([ANALYSES], (tx) => {
      tx.objectStore(ANALYSES).put(analysis);
    });
  }

  async listAnalyses() {
    return finishAnalyses(await this.readAll(ANALYSES));
  }

  async putAttempt(attempt: RetryAttempt) {
    if (this.closed) throw closedError();
    keyOf(attempt, "id");
    await this.write([ATTEMPTS], (tx) => {
      tx.objectStore(ATTEMPTS).put(attempt);
    });
  }

  async listAttempts() {
    return finishAttempts(await this.readAll(ATTEMPTS));
  }

  async getMeta() {
    const tx = this.transaction([META], "readonly");
    const value: unknown = await requestResult(tx.objectStore(META).get(META_KEY));
    return isValidMeta(value) ? value : null;
  }

  async setMeta(meta: InsightsMeta) {
    await this.write([META], (tx) => {
      tx.objectStore(META).put(meta, META_KEY);
    });
  }

  async clear() {
    await this.write(ALL_STORES, (tx) => {
      for (const name of ALL_STORES) tx.objectStore(name).clear();
    });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.db.close();
  }
}

function requestPersistence() {
  try {
    if (typeof navigator === "undefined") return;
    const pending = navigator.storage?.persist?.();
    if (pending) pending.catch(() => undefined);
  } catch {
    // Persistence is a nice-to-have; the browser may refuse or not support it.
  }
}

/**
 * Opens (and on first use creates) the "knightly_insights_v1" database.
 * Rejects with a plain Error when IndexedDB is missing, blocked or refused (for example in
 * some private-browsing modes), so the caller can fall back to memoryInsightsStore().
 */
export function openInsightsStore(): Promise<InsightsStore> {
  return new Promise<InsightsStore>((resolve, reject) => {
    const unavailable = (detail?: string) =>
      new Error(`This browser is not letting the app save insights${detail ? ` (${detail})` : ""}. They will only last until the page is closed.`);
    const factory: IDBFactory | undefined = typeof indexedDB === "undefined" ? undefined : indexedDB;
    if (!factory) {
      reject(unavailable("storage is not available"));
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(INSIGHTS_DB_NAME, DB_VERSION);
    } catch (error) {
      reject(unavailable(error instanceof Error ? error.message : undefined));
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(GAMES)) db.createObjectStore(GAMES, { keyPath: "id" });
      if (!db.objectStoreNames.contains(ANALYSES)) db.createObjectStore(ANALYSES, { keyPath: "gameId" });
      if (!db.objectStoreNames.contains(ATTEMPTS)) db.createObjectStore(ATTEMPTS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    let settled = false;
    request.onblocked = () => {
      settled = true;
      reject(unavailable("another tab is holding the saved insights open; close it and try again"));
    };
    request.onerror = () => {
      settled = true;
      reject(unavailable(request.error?.message));
    };
    request.onsuccess = () => {
      // A blocked open can still succeed later; the caller has already fallen back, so let go of it.
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      requestPersistence();
      resolve(new IndexedDbInsightsStore(request.result));
    };
  });
}

// ---------- memory ----------

/** Same behaviour as the IndexedDB store, kept in memory. Used by tests and when IndexedDB is unavailable. */
export function memoryInsightsStore(): InsightsStore {
  const games = new Map<string, unknown>();
  const analyses = new Map<string, unknown>();
  const attempts = new Map<string, unknown>();
  let meta: unknown = null;
  let closed = false;

  const guard = () => {
    if (closed) throw closedError();
  };
  const copy = <T>(value: T): T => structuredClone(value);

  return {
    async putGames(list) {
      guard();
      const staged = list.map((game) => [keyOf(game, "id"), copy(game)] as const);
      for (const [id, game] of staged) games.set(id, game);
    },
    async listGames() {
      guard();
      return finishGames([...games.values()].map(copy));
    },
    async putAnalysis(analysis) {
      guard();
      analyses.set(keyOf(analysis, "gameId"), copy(analysis));
    },
    async listAnalyses() {
      guard();
      return finishAnalyses([...analyses.values()].map(copy));
    },
    async putAttempt(attempt) {
      guard();
      attempts.set(keyOf(attempt, "id"), copy(attempt));
    },
    async listAttempts() {
      guard();
      return finishAttempts([...attempts.values()].map(copy));
    },
    async getMeta() {
      guard();
      return isValidMeta(meta) ? copy(meta) : null;
    },
    async setMeta(value) {
      guard();
      meta = copy(value);
    },
    async clear() {
      guard();
      games.clear();
      analyses.clear();
      attempts.clear();
      meta = null;
    },
    close() {
      closed = true;
    },
  };
}
