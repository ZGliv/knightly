import { emptyCourseProgress, emptyCoursesProgress } from "./progress";
import type { CourseProgress, CoursesProgress, LineReview } from "./types";

export const COURSES_KEY = "knightly_courses_v1";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

function isReview(v: unknown): v is LineReview {
  return isObj(v) && typeof v.at === "string" && Number.isFinite(Date.parse(v.at)) && typeof v.clean === "boolean";
}

function parseCourse(v: unknown): CourseProgress {
  if (!isObj(v)) return emptyCourseProgress();
  const learned = Array.isArray(v.learned) ? [...new Set(v.learned.filter((x): x is string => typeof x === "string"))] : [];
  const reviews: Record<string, LineReview[]> = {};
  if (isObj(v.reviews))
    for (const [id, list] of Object.entries(v.reviews)) if (Array.isArray(list)) reviews[id] = list.filter(isReview).map((r) => ({ at: r.at, clean: r.clean }));
  return { learned, reviews, bestDrill: count(v.bestDrill), bestTime: count(v.bestTime) };
}

/** Parses stored progress, dropping anything malformed instead of failing. */
export function parseCoursesProgress(raw: string | null): CoursesProgress {
  if (!raw) return emptyCoursesProgress();
  try {
    const data: unknown = JSON.parse(raw);
    if (!isObj(data) || data.version !== 1 || !isObj(data.courses)) return emptyCoursesProgress();
    const courses: Record<string, CourseProgress> = {};
    for (const [id, p] of Object.entries(data.courses)) courses[id] = parseCourse(p);
    return { version: 1, courses };
  } catch {
    return emptyCoursesProgress();
  }
}

/** Reads progress; returns `available: false` when this browser blocks storage. */
export function loadCoursesProgress(): { progress: CoursesProgress; available: boolean } {
  try {
    return { progress: parseCoursesProgress(localStorage.getItem(COURSES_KEY)), available: true };
  } catch {
    return { progress: emptyCoursesProgress(), available: false };
  }
}

export function saveCoursesProgress(progress: CoursesProgress): boolean {
  try {
    localStorage.setItem(COURSES_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
