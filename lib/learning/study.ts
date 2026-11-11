import { revisitSchedule } from "./schedule";
import { SEQUENCES } from "./sequences";
import { LESSONS } from "./curriculum";
import type { Attempt } from "./progress";

export const STUDY_UNITS = [
  {
    id: "opening",
    title: "Build your opening",
    description: "Give your pieces room. Get your king safe.",
    mark: "♞",
    lessons: ["claim-center", "develop-knight", "castle-king"],
  },
  {
    id: "middlegame",
    title: "Notice the opportunity",
    description: "Read captures, escape squares and double threats.",
    mark: "♝",
    lessons: ["loose-queen", "back-rank", "knight-fork"],
  },
  {
    id: "endgame",
    title: "Finish with a plan",
    description: "Promote a pawn. Coordinate your king and pieces.",
    mark: "♜",
    lessons: ["promote-pawn", "queen-finish", "rook-finish"],
  },
  {
    id: "decisions",
    title: "Think through a decision",
    description: "Learn, try with support, then solve a different position.",
    mark: "♟",
    lessons: SEQUENCES.filter(
      (lesson) =>
        ![
          "claim-center",
          "develop-knight",
          "castle-king",
          "loose-queen",
          "back-rank",
          "knight-fork",
          "promote-pawn",
          "queen-finish",
          "rook-finish",
        ].includes(lesson.id),
    ).map((lesson) => lesson.id),
  },
] as const;
export const CONCEPTS: Record<string, { title: string; principle: string }> = {
  ...Object.fromEntries(
    SEQUENCES.map((lesson) => [
      lesson.id,
      { title: lesson.title, principle: lesson.principle },
    ]),
  ),
  "claim-center": {
    title: "The center",
    principle:
      "Central pawns can claim space and open routes for your pieces. Think about what a pawn move makes possible.",
  },
  "develop-knight": {
    title: "Development",
    principle:
      "Bring pieces into play where they influence useful squares. A developing move can also create a threat.",
  },
  "castle-king": {
    title: "King safety",
    principle:
      "Castling moves the king and rook together. Clear the path first, and check that the king is not in, moving through, or moving into check.",
  },
  "loose-queen": {
    title: "Undefended pieces",
    principle:
      "Before choosing a plan, scan the pieces that can be captured. A valuable piece without protection may be an immediate opportunity.",
  },
  "back-rank": {
    title: "Escape squares",
    principle:
      "A checking move is only mate when there is no legal escape, capture or block. The king’s own pieces can restrict its escape.",
  },
  "knight-fork": {
    title: "Double threats",
    principle:
      "A fork attacks two pieces at once. When one target is the king, your opponent must answer the check.",
  },
  "promote-pawn": {
    title: "Promotion",
    principle:
      "A pawn reaching the final rank becomes a queen, rook, bishop or knight. Check the resulting position before choosing.",
  },
  "queen-finish": {
    title: "King and queen",
    principle:
      "A king can protect its queen and cover escape squares. Coordinate them, and check that the opposing king is actually in check.",
  },
  "rook-finish": {
    title: "King and rook",
    principle:
      "A rook controls a rank or file while the king covers escape squares. Both pieces have a job in the final mating position.",
  },
};
export function studyProgress(attempts: Attempt[], now = Date.now()) {
  const valid = attempts
    .filter(
      (a) =>
        LESSONS.some((l) => l.id === a.lessonId) && Date.parse(a.at) <= now,
    )
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const latest = new Map(valid.map((attempt) => [attempt.lessonId, attempt]));
  const due = LESSONS.map((lesson) => ({
    lesson,
    ...revisitSchedule(
      valid.filter((a) => a.lessonId === lesson.id),
      now,
    ),
  }))
    .filter((item) => latest.has(item.lesson.id) && item.due)
    .sort((a, b) => a.dueAt - b.dueAt);
  const transfer = new Map(
    valid.filter((a) => a.stage === "transfer").map((a) => [a.lessonId, a]),
  );
  const next =
    due[0]?.lesson ??
    LESSONS.find((l) => !latest.has(l.id)) ??
    [...LESSONS].sort(
      (a, b) =>
        Date.parse(latest.get(a.id)!.at) - Date.parse(latest.get(b.id)!.at),
    )[0];
  return {
    latest,
    transfer,
    due,
    practiced: latest.size,
    next,
    independent: [...latest.values()].filter((a) => a.outcome === "independent")
      .length,
    supported: [...latest.values()].filter((a) => a.outcome === "supported")
      .length,
    notYet: [...latest.values()].filter((a) => a.outcome === "not-yet").length,
  };
}
export const outcomeLabel = (attempt?: Attempt) =>
  !attempt
    ? "Not tried"
    : attempt.outcome === "independent"
      ? "Solved independently"
      : attempt.outcome === "supported"
        ? "Solved with help"
        : "Revisit this idea";
