import { isSameDay } from "./day";

export type StepId = "puzzles" | "leaks" | "openings" | "masters" | "play";

export interface Step {
  id: StepId;
  title: string;
  /** Why this step is in today's session, in one sentence. */
  reason: string;
  /** Done so far today, and the target. */
  done: number;
  goal: number;
  complete: boolean;
  href: string;
  action: string;
}

/** What the tools have stored, reduced to what the session needs. Every field is real stored data. */
export interface SessionInput {
  /** Puzzle attempts (any result). */
  puzzleAttempts: { at: string }[];
  /** Your leaks; null when no chess.com account is linked (or the browser database cannot be read). */
  leaks: {
    /** Positions Practice would offer right now. */
    ready: number;
    /** Imported games still waiting for analysis. */
    pending: number;
    /** Practice attempts on your own mistakes. */
    attempts: { decisionId: string; at: string }[];
  } | null;
  /** Prepared opening positions (both colours) and every drill answer. */
  repertoire: { prepared: number; reviews: { at: string }[] };
  /** Pro-game moves guessed today. */
  masterGuessesToday: number;
  /** Games played against the app. */
  playedGames: { result: string; createdAt: string; updatedAt?: string }[];
}

export const PUZZLE_GOAL = 5;
export const LEAK_GOAL = 3;
export const OPENING_GOAL = 5;
export const MASTER_GOAL = 10;
/** Steps a day needs to count towards the streak. */
export const STREAK_STEPS = 3;

const step = (s: Omit<Step, "complete">): Step => ({ ...s, complete: s.done >= s.goal });

function leakStep(leaks: SessionInput["leaks"], now: number): Step {
  if (!leaks)
    return step({
      id: "leaks",
      title: "Link your chess.com account",
      reason: "Knightly imports your games and finds the mistakes you actually make, so you can fix them.",
      done: 0,
      goal: 1,
      href: "/games/insights",
      action: "Link account",
    });
  const fixed = new Set(leaks.attempts.filter((a) => isSameDay(a.at, now)).map((a) => a.decisionId)).size;
  if (fixed > 0 || leaks.ready > 0)
    return step({
      id: "leaks",
      title: `Fix ${LEAK_GOAL} mistakes from your own games`,
      reason: "Replaying the positions where you went wrong is the fastest way to stop repeating them.",
      done: fixed,
      // Never ask for more than is left to practise.
      goal: Math.min(LEAK_GOAL, fixed + leaks.ready),
      href: "/games/insights",
      action: "Practise",
    });
  if (leaks.pending > 0)
    return step({
      id: "leaks",
      title: "Analyse your games",
      reason: `${leaks.pending} of your games ${leaks.pending === 1 ? "is" : "are"} waiting for analysis. It runs while Your leaks is open.`,
      done: 0,
      goal: 1,
      href: "/games/insights",
      action: "Open Your leaks",
    });
  return step({
    id: "leaks",
    title: "Play some games",
    reason: "You have practised every mistake found so far. New chess.com games are imported when you open Your leaks.",
    done: 0,
    goal: 1,
    href: "/games/insights",
    action: "Check for new games",
  });
}

/** Today's session in order. `now` is Unix milliseconds; "today" is the local calendar day. */
export function buildSession(input: SessionInput, now: number): Step[] {
  const puzzles = input.puzzleAttempts.filter((a) => isSameDay(a.at, now)).length;
  const drilled = input.repertoire.reviews.filter((r) => isSameDay(r.at, now)).length;
  const played = input.playedGames.filter((g) => g.result !== "*" && isSameDay(g.updatedAt ?? g.createdAt, now)).length;
  return [
    step({
      id: "puzzles",
      title: `Warm up: ${PUZZLE_GOAL} puzzles`,
      reason: "Short tactics get your eye for loose pieces and checks working before anything else.",
      done: puzzles,
      goal: PUZZLE_GOAL,
      href: "/puzzles",
      action: "Solve puzzles",
    }),
    leakStep(input.leaks, now),
    input.repertoire.prepared === 0
      ? step({
          id: "openings",
          title: "Choose your opening moves",
          reason: "Pick a reply in the positions your opponents really play, so the first moves stop costing you time.",
          done: 0,
          goal: 1,
          href: "/openings",
          action: "Choose moves",
        })
      : step({
          id: "openings",
          title: `Drill your openings: ${Math.min(OPENING_GOAL, input.repertoire.prepared)} positions`,
          reason: "Playing your prepared moves from memory makes them automatic in real games.",
          done: drilled,
          goal: Math.min(OPENING_GOAL, input.repertoire.prepared),
          href: "/openings",
          action: "Drill",
        }),
    step({
      id: "masters",
      title: `Study one pro game: guess ${MASTER_GOAL} moves`,
      reason: "Guessing a grandmaster's move, then seeing theirs, teaches plans that puzzles do not.",
      done: input.masterGuessesToday,
      goal: MASTER_GOAL,
      href: "/masters",
      action: "Guess moves",
    }),
    step({
      id: "play",
      title: "Play a game",
      reason: "Use what you practised against an opponent at your level.",
      done: played,
      goal: 1,
      href: "/play",
      action: "Play",
    }),
  ];
}

export const stepsDone = (steps: Step[]) => steps.filter((s) => s.complete).length;
