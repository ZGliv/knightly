import type { Tally } from "./grade";

/** The only localStorage key "Play like the pros" uses. */
export const MASTERS_STORAGE_KEY = "knightly_masters_v1";

export interface FinishedGame {
  best: number;
  max: number;
  plays: number;
  last: Tally;
  lastScore: number;
  finishedAt: string;
}

export interface MastersRecord {
  version: 1;
  games: Record<string, FinishedGame>;
}

type KeyValue = Pick<Storage, "getItem" | "setItem">;

export const emptyRecord = (): MastersRecord => ({ version: 1, games: {} });

function browserStorage(): KeyValue | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

const isTally = (v: unknown): v is Tally =>
  !!v &&
  typeof v === "object" &&
  ["matched", "asGood", "playable", "worse", "shown"].every(
    (k) => Number.isInteger((v as Record<string, unknown>)[k]),
  );

/** Reads saved results; anything missing, unreadable or malformed gives an empty record. */
export function loadRecord(storage: KeyValue | null = browserStorage()): MastersRecord {
  try {
    const raw = storage?.getItem(MASTERS_STORAGE_KEY);
    if (!raw) return emptyRecord();
    const parsed = JSON.parse(raw) as Partial<MastersRecord>;
    if (parsed.version !== 1 || !parsed.games || typeof parsed.games !== "object") return emptyRecord();
    const games: Record<string, FinishedGame> = {};
    for (const [id, g] of Object.entries(parsed.games)) {
      if (
        g &&
        Number.isFinite(g.best) &&
        Number.isFinite(g.max) &&
        Number.isInteger(g.plays) &&
        Number.isFinite(g.lastScore) &&
        typeof g.finishedAt === "string" &&
        isTally(g.last)
      )
        games[id] = g;
    }
    return { version: 1, games };
  } catch {
    return emptyRecord();
  }
}

/** Saves; false when the browser refused (private mode, full storage). */
export function saveRecord(record: MastersRecord, storage: KeyValue | null = browserStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(MASTERS_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/** Adds one finished play-through, keeping the best score. Pure: returns a new record. */
export function recordFinish(
  record: MastersRecord,
  gameId: string,
  result: { score: number; max: number; tally: Tally },
  finishedAt: string,
): MastersRecord {
  const prev = record.games[gameId];
  return {
    version: 1,
    games: {
      ...record.games,
      [gameId]: {
        best: Math.max(prev?.best ?? 0, result.score),
        max: result.max,
        plays: (prev?.plays ?? 0) + 1,
        last: result.tally,
        lastScore: result.score,
        finishedAt,
      },
    },
  };
}
