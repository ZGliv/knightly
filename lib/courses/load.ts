import type { Puzzle } from "@/lib/puzzles/types";
import { readImportedGames } from "./games";
import { replayLine } from "./line";
import { buildPersonalCourse, isPersonalId, PERSONAL_IDS } from "./personal";
import type { Course, CourseIndex, CourseLine, CoursePuzzles, CourseSummary } from "./types";

/** A course id is also a file name, so only plain slugs are fetched. */
export const isCourseId = (id: string) => /^[a-z0-9][a-z0-9-]{0,80}$/.test(id);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
const isStringMap = (v: unknown): v is Record<string, string> => isObj(v) && Object.values(v).every((x) => typeof x === "string");

function isSummary(v: unknown): v is CourseSummary {
  return isObj(v) && typeof v.id === "string" && isCourseId(v.id) && typeof v.name === "string" &&
    (v.side === "white" || v.side === "black") && typeof v.blurb === "string" && isStrings(v.setup) &&
    isCount(v.lineCount) && isCount(v.puzzleCount);
}

function isLine(v: unknown): v is CourseLine {
  return isObj(v) && typeof v.id === "string" && typeof v.name === "string" && isStrings(v.moves) && v.moves.length > 0;
}

/** Validates public/courses/index.json. Malformed course rows are dropped; a malformed file throws. */
export function parseIndex(data: unknown): CourseIndex {
  if (!isObj(data) || !Array.isArray(data.courses)) throw new Error("The course list is malformed.");
  return { source: typeof data.source === "string" ? data.source : "", courses: data.courses.filter(isSummary) };
}

/** Legal from the start and gives the learner at least one move to play. */
function isPlayable(line: CourseLine, side: CourseSummary["side"]): boolean {
  try {
    return replayLine(line.moves).some((s) => s.mover === side);
  } catch {
    return false;
  }
}

/** Validates public/courses/<id>.json. Malformed or illegal lines are dropped; a malformed file throws. */
export function parseCourse(data: unknown, id: string): Course {
  if (!isSummary(data) || data.id !== id) throw new Error("This course file is malformed.");
  const raw = data as unknown as Record<string, unknown>;
  const lines = Array.isArray(raw.lines) ? raw.lines.filter(isLine).filter((l) => isPlayable(l, data.side)) : [];
  if (!lines.length) throw new Error("This course has no playable lines yet.");
  return {
    ...(data as CourseSummary),
    lines,
    ideas: isStringMap(raw.ideas) ? raw.ideas : {},
    names: isStringMap(raw.names) ? raw.names : {},
  };
}

export class CourseLoadError extends Error {
  constructor(message: string, readonly notFound = false) {
    super(message);
  }
}

async function getJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new CourseLoadError("Couldn’t reach the server. Check your connection and try again.");
  }
  if (res.status === 404) throw new CourseLoadError("That course doesn’t exist.", true);
  if (!res.ok) throw new CourseLoadError(`The server couldn’t send the course data (error ${res.status}).`);
  try {
    return await res.json();
  } catch {
    throw new CourseLoadError("The course data is damaged and couldn’t be read.");
  }
}

let indexCache: Promise<CourseIndex> | null = null;
const courseCache = new Map<string, Promise<Course>>();

/** The course list, fetched once per page load. A failed fetch is not cached, so retrying works. */
export function loadIndex(): Promise<CourseIndex> {
  indexCache ??= getJson("/courses/index.json")
    .then((data) => {
      try {
        return parseIndex(data);
      } catch (e) {
        throw new CourseLoadError((e as Error).message);
      }
    })
    .catch((e) => {
      indexCache = null;
      throw e;
    });
  return indexCache;
}

/**
 * "my-white" / "my-black": built from the learner's imported games instead of fetched. Rebuilt on
 * every load because new games may have been imported since.
 */
async function buildRuntimeCourse(id: string): Promise<Course> {
  const color = id === PERSONAL_IDS.white ? "white" : "black";
  const { played } = await readImportedGames();
  if (!played.length)
    throw new CourseLoadError("This course is built from your chess.com games. Connect your account on Your leaks first.", true);
  const course = buildPersonalCourse(played, color);
  if (!course)
    throw new CourseLoadError(`Your games as ${color === "white" ? "White" : "Black"} don’t repeat often enough yet to make at least 3 lines.`, true);
  return course;
}

/** One course with all its lines, fetched once per page load (built from your games for "my-white" and "my-black"). */
export function loadCourse(id: string): Promise<Course> {
  if (!isCourseId(id)) return Promise.reject(new CourseLoadError("That course doesn’t exist.", true));
  if (isPersonalId(id)) return buildRuntimeCourse(id);
  let pending = courseCache.get(id);
  if (!pending) {
    pending = getJson(`/courses/${id}.json`)
      .then((data) => {
        try {
          return parseCourse(data, id);
        } catch (e) {
          throw new CourseLoadError((e as Error).message);
        }
      })
      .catch((e) => {
        courseCache.delete(id);
        throw e;
      });
    courseCache.set(id, pending);
  }
  return pending;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function isPuzzle(v: unknown): v is Puzzle {
  return isObj(v) && typeof v.id === "string" && typeof v.fen === "string" && isStrings(v.moves) && v.moves.length >= 2 &&
    isNum(v.rating) && isStrings(v.themes);
}

/** Validates public/courses/puzzles/<id>.json, dropping malformed puzzles; sorted by rating. A malformed file throws. */
export function parseCoursePuzzles(data: unknown): CoursePuzzles {
  if (!Array.isArray(data)) throw new Error("This course’s puzzle file is malformed.");
  return data.filter(isPuzzle).sort((a, b) => a.rating - b.rating);
}

const puzzleCache = new Map<string, Promise<CoursePuzzles>>();

/** A course's puzzles, fetched once per page load. */
export function loadCoursePuzzles(id: string): Promise<CoursePuzzles> {
  if (!isCourseId(id) || isPersonalId(id)) return Promise.resolve([]);
  let pending = puzzleCache.get(id);
  if (!pending) {
    pending = getJson(`/courses/puzzles/${id}.json`)
      .then((data) => {
        try {
          return parseCoursePuzzles(data);
        } catch (e) {
          throw new CourseLoadError((e as Error).message);
        }
      })
      .catch((e) => {
        puzzleCache.delete(id);
        throw e;
      });
    puzzleCache.set(id, pending);
  }
  return pending;
}
