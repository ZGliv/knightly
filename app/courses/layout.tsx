import type { ReactNode } from "react";
// Course puzzles reuse the Puzzles board, whose styles live with that route.
import "../puzzles/puzzles.css";
import "./courses.css";

export default function CoursesLayout({ children }: { children: ReactNode }) {
  return children;
}
