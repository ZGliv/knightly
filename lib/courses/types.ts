import type { PlayerColor } from "@/types/game";
import type { Puzzle } from "@/lib/puzzles/types";

/** One row of public/courses/index.json: enough to draw the course library without loading a course. */
export interface CourseSummary {
  /** URL-safe id, also the file name: public/courses/<id>.json. */
  id: string;
  name: string;
  /** The colour the learner plays. */
  side: PlayerColor;
  /** One or two plain sentences on what the opening is and who it suits. */
  blurb: string;
  /** The moves that define the opening, as SAN from the starting position, e.g. ["e4","e5","Nf3","Nc6","Bc4"]. */
  setup: string[];
  lineCount: number;
  /** Puzzles available in public/courses/puzzles/<id>.json (0 when there is no file). */
  puzzleCount: number;
}

/** One line: a full sequence of moves from the starting position. The learner plays `side`'s moves. */
export interface CourseLine {
  /** Stable within the course, e.g. "l01". Progress is stored against it. */
  id: string;
  /** The variation's name from the opening list, e.g. "Giuoco Piano, Greco Attack". */
  name: string;
  /** SAN moves from the starting position, both colours. Always ends on the learner's move. */
  moves: string[];
}

/** public/courses/<id>.json */
export interface Course extends CourseSummary {
  /** Main line first, then roughly from most to least common. */
  lines: CourseLine[];
  /**
   * Written explanations for key moves, keyed by the moves played so far joined with spaces
   * ("e4 e5 Nf3 Nc6 Bc4" explains Bc4). These are AI-written; the plain description of each move
   * ("Bishop to c4") is computed in the app and is not stored here.
   */
  ideas: Record<string, string>;
  /**
   * Opening names by move prefix (same key format as `ideas`), from the Lichess opening list, so
   * the trainer can say "This is the Evans Gambit" when a line reaches a named position.
   */
  names: Record<string, string>;
}

export interface CourseIndex {
  /** Where the lines come from, shown in the app. */
  source: string;
  courses: CourseSummary[];
}

/** public/courses/puzzles/<id>.json: Lichess puzzles that arose from this opening. */
export type CoursePuzzles = Puzzle[];

/** One run through a line in Practice, Drill or Time. `clean` means no wrong move and no hint. */
export interface LineReview {
  /** ISO timestamp. */
  at: string;
  clean: boolean;
}

export interface CourseProgress {
  /** Line ids finished in Learn, in the order they were learned. */
  learned: string[];
  /** Line id -> runs, oldest first. Drives the spaced-repetition schedule. */
  reviews: Record<string, LineReview[]>;
  /** Most lines in a row without a mistake in Drill. */
  bestDrill: number;
  /** Most lines finished in one Time run. */
  bestTime: number;
}

/** Stored in localStorage under knightly_courses_v1. */
export interface CoursesProgress {
  version: 1;
  /** Course id -> progress. */
  courses: Record<string, CourseProgress>;
}
