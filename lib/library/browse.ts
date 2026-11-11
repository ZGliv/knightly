import { LESSONS } from "@/lib/learning/curriculum";
import { COURSE_STAGES } from "@/lib/learning/path";
import { COLLECTIONS, OPENINGS, type Collection } from "./catalog";

export const STUDY_TOPICS = [
  "All topics",
  "Openings",
  "Middlegames",
  "Endgames",
  "Tactics",
  "Fundamentals",
] as const;
export type StudyTopic = (typeof STUDY_TOPICS)[number];
export const STUDY_SHELVES = [
  {
    title: "Openings",
    description: "Find your first moves and understand the plan behind them.",
    ids: ["italian-game", "queens-gambit", "caro-kann"],
  },
  {
    title: "Middlegames",
    description: "Spot the tactic. Improve your pieces. Choose a plan.",
    ids: [
      "course-double-attacks",
      "course-piece-activity",
      "course-pawn-structures",
    ],
  },
  {
    title: "Endgames",
    description: "Turn an advantage into a win, or find the way to hold.",
    ids: ["course-pawn-endings", "course-rook-endings", "course-checkmating"],
  },
] as const;
const phases: Record<string, string> = {
  Openings: "opening",
  Middlegames: "middlegame",
  Endgames: "endgame",
};
const lessonPhases = new Map(LESSONS.map((l) => [l.id, l.phase]));
export function matchesStudyTopic(item: Collection, topic: string) {
  return (
    topic === "All topics" ||
    item.category === topic ||
    item.lessonIds.some((id) => lessonPhases.get(id) === phases[topic])
  );
}
export function topicCount(topic: string) {
  return (
    COLLECTIONS.filter((c) => matchesStudyTopic(c, topic)).length +
    (["All topics", "Openings"].includes(topic) ? OPENINGS.length : 0)
  );
}
export function collectionLevel(item: Collection) {
  const stages = COURSE_STAGES.filter((stage) =>
    item.lessonIds.some((id) =>
      (stage.lessons as readonly string[]).includes(id),
    ),
  );
  return stages.length > 1
    ? `${stages[0].title}–${stages.at(-1)!.title}`
    : (stages[0]?.title ?? "Lessons");
}
export interface BrowseState {
  view: "browse" | "saved" | "practice";
  category: StudyTopic;
  query: string;
  openingSide: "all" | "White" | "Black";
  layout: "grid" | "list";
  showAll: boolean;
}
export function readBrowseState(search: string): BrowseState {
  const p = new URLSearchParams(search),
    topic = p.get("topic");
  return {
    view:
      p.get("view") === "saved"
        ? "saved"
        : p.get("view") === "practice"
          ? "practice"
          : "browse",
    category: STUDY_TOPICS.includes(topic as StudyTopic)
      ? (topic as StudyTopic)
      : "All topics",
    query: (p.get("q") ?? "").slice(0, 200),
    openingSide:
      p.get("side") === "White"
        ? "White"
        : p.get("side") === "Black"
          ? "Black"
          : "all",
    layout: p.get("layout") === "list" ? "list" : "grid",
    showAll: p.get("all") === "1",
  };
}
export function browseHref(state: BrowseState) {
  const p = new URLSearchParams();
  if (state.view !== "browse") p.set("view", state.view);
  if (state.category !== "All topics") p.set("topic", state.category);
  if (state.query) p.set("q", state.query.slice(0, 200));
  if (state.category === "Openings" && state.openingSide !== "all")
    p.set("side", state.openingSide);
  if (state.layout !== "grid") p.set("layout", state.layout);
  if (state.showAll) p.set("all", "1");
  return "/study" + (p.size ? "?" + p.toString() : "");
}
