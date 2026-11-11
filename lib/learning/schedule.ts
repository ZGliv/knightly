/** Explicit scheduling heuristic; same-day repetitions never lengthen the interval. */
export function revisitSchedule(history: { at: string; outcome: string }[], now = Date.now()) {
  const ordered = history.filter((a) => Date.parse(a.at) <= now).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const last = ordered.at(-1);
  if (!last) return { due: true, dueAt: now, intervalDays: 0 };
  let spaced = 0;
  let countedAt = -Infinity;
  for (const attempt of ordered) {
    if (attempt.outcome !== "independent") { spaced = 0; countedAt = -Infinity; }
    else if (Date.parse(attempt.at) - countedAt >= 86400000) { spaced++; countedAt = Date.parse(attempt.at); }
  }
  const intervalDays = last.outcome === "independent" ? [1, 3, 7][Math.min(Math.max(spaced - 1, 0), 2)] : 1 / 96;
  const dueAt = Date.parse(last.at) + intervalDays * 86400000;
  return { due: now >= dueAt, dueAt, intervalDays };
}
