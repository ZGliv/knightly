import { previousDay } from "./day";

/** The only localStorage key the daily session uses. */
export const TODAY_KEY = "knightly_today_v1";

/** Days kept; enough for any streak worth showing without growing forever. */
const DAYS_KEPT = 400;

export interface TodayRecord {
  version: 1;
  /** Local days ("YYYY-MM-DD") on which at least three steps were done, oldest first. */
  days: string[];
}

export const emptyTodayRecord = (): TodayRecord => ({ version: 1, days: [] });

type KeyValue = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): KeyValue | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function parseTodayRecord(raw: string | null): TodayRecord {
  if (!raw) return emptyTodayRecord();
  try {
    const data = JSON.parse(raw) as Partial<TodayRecord>;
    if (data.version !== 1 || !Array.isArray(data.days)) return emptyTodayRecord();
    const days = data.days.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d));
    return { version: 1, days: [...new Set(days)].sort() };
  } catch {
    return emptyTodayRecord();
  }
}

/** Reads the record; empty when nothing is saved or storage is blocked. */
export function loadTodayRecord(storage: KeyValue | null = browserStorage()): TodayRecord {
  try {
    return parseTodayRecord(storage?.getItem(TODAY_KEY) ?? null);
  } catch {
    return emptyTodayRecord();
  }
}

/** Saves; false when the browser refused. */
export function saveTodayRecord(record: TodayRecord, storage: KeyValue | null = browserStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(TODAY_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/** Adds a day; returns the same record when it is already there. Pure. */
export function markDay(record: TodayRecord, day: string): TodayRecord {
  if (record.days.includes(day)) return record;
  return { version: 1, days: [...record.days, day].sort().slice(-DAYS_KEPT) };
}

/**
 * Days in a row ending today, or ending yesterday when today is not done yet (the streak is
 * still alive until today ends).
 */
export function streakLength(record: TodayRecord, today: string): number {
  const days = new Set(record.days);
  let day = days.has(today) ? today : previousDay(today);
  let count = 0;
  while (days.has(day)) {
    count++;
    day = previousDay(day);
  }
  return count;
}
