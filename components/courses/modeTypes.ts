import type { LineStep } from "@/lib/courses/line";
import type { Course, CourseProgress } from "@/lib/courses/types";

/** What every mode component receives from CoursePage. */
export interface ModeProps {
  course: Course;
  /** Every line replayed once: line id -> steps. */
  steps: Map<string, LineStep[]>;
  progress: CourseProgress;
  /** Applies one change to this course's progress and saves it. Combine related changes into one call. */
  update: (change: (p: CourseProgress) => CourseProgress) => void;
  /** Link to another mode of this course, e.g. hrefFor("learn"). */
  hrefFor: (mode: string) => string;
}

/** Drill and Time need this many learned lines. */
export const MIN_LINES_FOR_GAMES = 3;
