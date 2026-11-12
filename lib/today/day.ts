/** Local calendar day as "YYYY-MM-DD" (the user's own midnight, not UTC). */
export function localDay(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** True when an ISO timestamp falls on the same local day as `now`. False for unreadable stamps. */
export function isSameDay(iso: string | undefined, now: number): boolean {
  if (!iso) return false;
  const at = Date.parse(iso);
  return Number.isFinite(at) && localDay(at) === localDay(now);
}

/** The local day before `day` ("YYYY-MM-DD"). */
export function previousDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(y, m - 1, d - 1, 12).getTime());
}
