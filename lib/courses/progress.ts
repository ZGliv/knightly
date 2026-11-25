import { revisitSchedule } from "@/lib/learning/schedule";
import { positionKey } from "@/lib/openings/tree";
import { replayLine, type LineStep } from "./line";
import type { Course, CourseLine, CourseProgress, CoursesProgress, LineReview } from "./types";

export const emptyCourseProgress = (): CourseProgress => ({ learned: [], reviews: {}, bestDrill: 0, bestTime: 0 });
export const emptyCoursesProgress = (): CoursesProgress => ({ version: 1, courses: {} });

/** One course's progress out of the stored whole (empty when never started). */
export function courseProgress(all: CoursesProgress, id: string): CourseProgress {
  return all.courses[id] ?? emptyCourseProgress();
}

export function withCourse(all: CoursesProgress, id: string, progress: CourseProgress): CoursesProgress {
  return { ...all, courses: { ...all.courses, [id]: progress } };
}

export function markLearned(p: CourseProgress, lineId: string): CourseProgress {
  return p.learned.includes(lineId) ? p : { ...p, learned: [...p.learned, lineId] };
}

export function recordReview(p: CourseProgress, lineId: string, review: LineReview): CourseProgress {
  return { ...p, reviews: { ...p.reviews, [lineId]: [...(p.reviews[lineId] ?? []), review] } };
}

export function withBestDrill(p: CourseProgress, streak: number): CourseProgress {
  return streak > p.bestDrill ? { ...p, bestDrill: streak } : p;
}

export function withBestTime(p: CourseProgress, score: number): CourseProgress {
  return score > p.bestTime ? { ...p, bestTime: score } : p;
}

/** When a learned line is next due. Clean runs count as "independent" in the shared schedule. */
export function lineSchedule(p: CourseProgress, lineId: string, now: number) {
  const history = (p.reviews[lineId] ?? []).map((r) => ({ at: r.at, outcome: r.clean ? "independent" : "not-yet" }));
  return revisitSchedule(history, now);
}

/** Learned line ids due for practice now (never-reviewed lines are due), most overdue first. */
export function dueLines(p: CourseProgress, now: number): string[] {
  return p.learned
    .map((id, order) => ({ id, order, at: lineSchedule(p, id, now) }))
    .filter((x) => x.at.due)
    .sort((a, b) => a.at.dueAt - b.at.dueAt || a.order - b.order)
    .map((x) => x.id);
}

/** The soonest time a learned line becomes due, or null when nothing is learned. Now or earlier when something is already due. */
export function nextDueAt(p: CourseProgress, now: number): number | null {
  if (!p.learned.length) return null;
  return Math.min(...p.learned.map((id) => lineSchedule(p, id, now).dueAt));
}

/** The first line, in course order, not yet learned. */
export function nextLineToLearn(course: Pick<Course, "lines">, p: CourseProgress): CourseLine | null {
  return course.lines.find((l) => !p.learned.includes(l.id)) ?? null;
}

/** Key for "this move in this position", as stored in `learnedPositions`. */
export const learnedKey = (step: Pick<LineStep, "fenBefore" | "uci">) => `${positionKey(step.fenBefore)}|${step.uci}`;

/**
 * Learner moves already played in a learned line, keyed by position and move (see `learnedKey`),
 * optionally ignoring one line. Learn mode asks these without the arrow. The move is part of the
 * key because two lines may reach the same position and continue differently.
 */
export function learnedPositions(course: Pick<Course, "lines" | "side">, p: CourseProgress, exceptLineId?: string): Set<string> {
  const keys = new Set<string>();
  for (const line of course.lines) {
    if (line.id === exceptLineId || !p.learned.includes(line.id)) continue;
    try {
      for (const step of replayLine(line.moves)) if (step.mover === course.side) keys.add(learnedKey(step));
    } catch {
      // A broken line teaches nothing; skip it.
    }
  }
  return keys;
}

/** Counts for a course card or header. Learned ids no longer in the course are ignored. */
export function courseCounts(p: CourseProgress, lineIds: string[] | null, now: number | null) {
  const learned = lineIds ? p.learned.filter((id) => lineIds.includes(id)) : p.learned;
  const scoped = { ...p, learned };
  return { learned: learned.length, due: now === null ? null : dueLines(scoped, now).length };
}

/** The course with the most learned lines due now, or null when nothing is due. Ties go to the first course in storage order. */
export function mostDueCourse(all: CoursesProgress, now: number): { id: string; due: number } | null {
  let best: { id: string; due: number } | null = null;
  for (const [id, p] of Object.entries(all.courses)) {
    const due = dueLines(p, now).length;
    if (due > 0 && (!best || due > best.due)) best = { id, due };
  }
  return best;
}
