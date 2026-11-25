import type { ComponentType } from "react";
import type { Course } from "@/lib/courses/types";
import { ArenaMode } from "./ArenaMode";
import { DrillMode } from "./DrillMode";
import { LearnMode } from "./LearnMode";
import { PracticeMode } from "./PracticeMode";
import { PuzzlesMode } from "./PuzzlesMode";
import { TimeMode } from "./TimeMode";
import type { ModeProps } from "./modeTypes";

export interface CourseMode {
  /** Used in the URL: /courses/<id>?mode=<id>. */
  id: string;
  label: string;
  /** One short line under the tabs. */
  blurb: string;
  Component: ComponentType<ModeProps>;
  /** Hide the tab for courses this mode has nothing for. Shown for every course when absent. */
  available?: (course: Course) => boolean;
}

/** The course page's tabs, in order. The first is the default. Add a mode by adding an entry here. */
export const COURSE_MODES: CourseMode[] = [
  { id: "learn", label: "Learn", blurb: "Play through a new line with an arrow and a note for each move.", Component: LearnMode },
  { id: "practice", label: "Practice", blurb: "Replay learned lines when they’re due, without arrows, so they stick.", Component: PracticeMode },
  { id: "drill", label: "Drill", blurb: "Learned lines in random order. How many can you play in a row without a mistake?", Component: DrillMode },
  { id: "time", label: "Time", blurb: "Race the clock: 60 seconds, plus 5 for every line played without a mistake.", Component: TimeMode },
  {
    id: "puzzles",
    label: "Puzzles",
    blurb: "Tactics from real games that began with this opening, at your puzzle rating.",
    Component: PuzzlesMode,
    available: (c) => c.puzzleCount > 0,
  },
  { id: "arena", label: "Arena", blurb: "Play the opening as a real game against an opponent at your level.", Component: ArenaMode },
];

/** The tabs this course shows. */
export function modesFor(course: Course | null): CourseMode[] {
  return COURSE_MODES.filter((m) => !m.available || (course !== null && m.available(course)));
}

export function modeById(id: string | null, course: Course | null = null): CourseMode {
  const modes = modesFor(course);
  return modes.find((m) => m.id === id) ?? modes[0];
}
