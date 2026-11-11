import { Chess, type Move } from "chess.js";
import type { SavedGame } from "@/types/game";
import { LESSONS } from "./curriculum";
import { courseProgress, firstPrerequisite } from "./path";
import { revisitSchedule } from "./schedule";
import type { Attempt } from "./progress";
import {
  applyUci,
  decisionsFromGames,
  positionKey,
  sameDecision,
  type CoachData,
  type Decision,
} from "./coach/model";
const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };
export type MistakeObservation = {
  source: Decision;
  lesson: string;
  detail: string;
  loss: number | null;
};
/** Classify concrete board features, not presumed thought processes. Unclear quiet choices stay unclassified. */
export function mistakeTopic(
  source: Decision,
  bestUci: string,
  loss: number | null,
  actualReply?: string,
): MistakeObservation | null {
  const before = new Chess(source.fenBefore),
    after = new Chess(source.fenBefore);
  let best: Move;
  try {
    best = applyUci(after, bestUci);
  } catch {
    return null;
  }
  const result = (lesson: string, detail: string) => ({
    source,
    lesson,
    detail,
    loss,
  });
  if (after.isCheckmate())
    return result(
      "mating-net",
      `A legal immediate mate, ${best.san}, was available.`,
    );
  if (before.isCheck())
    return best.captured
      ? result("capture-checker", `${best.san} answers a check by capturing.`)
      : best.piece === "k"
        ? result(
            "escape-check",
            `${best.san} is a safe king escape from check.`,
          )
        : result("block-check", `${best.san} blocks the checking line.`);
  if (actualReply) {
    const played = new Chess(source.fenAfter);
    try {
      const reply = applyUci(played, actualReply);
      if (played.isCheckmate())
        return result(
          "defend-mate",
          `The next reply, ${reply.san}, delivered mate.`,
        );
      if (
        reply.captured &&
        values[reply.captured] >= 3 &&
        !played
          .moves({ verbose: true })
          .some((move) => move.to === reply.to && move.captured)
      )
        return result(
          "defend-piece",
          `The next reply, ${reply.san}, took a piece that could not be recaptured immediately.`,
        );
    } catch {
      /* Incomplete imported line: classify only the verified best move. */
    }
  }
  if (best.promotion)
    return result(
      best.promotion === "n"
        ? "knight-promotion"
        : best.promotion === "r"
          ? "rook-underpromotion"
          : "promote-pawn",
      `${best.san} uses promotion.`,
    );
  const targets = after
    .board()
    .flat()
    .filter(
      (piece) =>
        piece &&
        piece.color !== best.color &&
        values[piece.type] >= (best.piece === "p" ? 3 : 5) &&
        after.attackers(piece.square, best.color).includes(best.to),
    );
  if (targets.length >= 2 && ["n", "p", "q"].includes(best.piece))
    return result(
      best.piece === "n"
        ? "knight-fork"
        : best.piece === "p"
          ? "pawn-fork"
          : "queen-fork",
      `${best.san} attacks at least two valuable targets.`,
    );
  if (best.captured) {
    const recaptures = after
      .moves({ verbose: true })
      .some((move) => move.to === best.to && move.captured);
    return !recaptures && values[best.captured] >= 3
      ? result(
          "loose-queen",
          `${best.san} takes material without an immediate legal recapture.`,
        )
      : result(
          "exchange-value",
          `${best.san} is a capture worth comparing with the recapture.`,
        );
  }
  if (best.isKingsideCastle() || best.isQueensideCastle())
    return result(
      "castle-king",
      `${best.san} gets the king and rook into play together.`,
    );
  if (
    source.ply <= 20 &&
    ["1", "8"].includes(best.from[1]) &&
    ["n", "b"].includes(best.piece)
  )
    return result(
      best.piece === "n" ? "develop-knight" : "develop-bishop",
      `${best.san} develops a minor piece from its starting rank.`,
    );
  return null;
}
export function gameObservations(games: SavedGame[], coach?: CoachData) {
  const sources = decisionsFromGames(games),
    observations: MistakeObservation[] = [];
  for (const source of sources) {
    const game = games.find((g) => g.id === source.gameId)!;
    const annotated = game.moves[source.ply - 1];
    const checked = coach?.analyses.find((a) => sameDecision(a.source, source));
    let bestUci = "",
      loss: number | null = null;
    if (checked?.teachable) {
      bestUci = checked.bestUci;
      loss = checked.drop;
    } else if (checked) continue;
    else if (
      annotated.searchDepth &&
      annotated.searchDepth > 0 &&
      (annotated.cpLoss ?? 0) >= 100 &&
      annotated.bestSan
    ) {
      try {
        const b = new Chess(source.fenBefore),
          m = b.move(annotated.bestSan);
        bestUci = m.from + m.to + (m.promotion ?? "");
        loss = annotated.cpLoss!;
      } catch {
        continue;
      }
    }
    if (!bestUci || bestUci === source.playedUci) continue;
    const observation = mistakeTopic(
      source,
      bestUci,
      loss,
      game.moves[source.ply]?.uci,
    );
    if (observation) observations.push(observation);
  }
  return observations;
}
export function recommendStudy(
  games: SavedGame[],
  attempts: Attempt[],
  coach?: CoachData,
  now = Date.now(),
) {
  const progress = courseProgress(attempts, now),
    observations = gameObservations(games, coach);
  const groups = new Map<
    string,
    {
      lesson: string;
      examples: MistakeObservation[];
      positions: Set<string>;
      games: Set<string>;
    }
  >();
  for (const observation of observations) {
    const group = groups.get(observation.lesson) ?? {
      lesson: observation.lesson,
      examples: [],
      positions: new Set<string>(),
      games: new Set<string>(),
    };
    const key =
      observation.source.playerColor +
      ":" +
      positionKey(observation.source.fenBefore);
    group.games.add(observation.source.gameId);
    if (!group.positions.has(key)) {
      group.positions.add(key);
      group.examples.push(observation);
    }
    groups.set(group.lesson, group);
  }
  const patterns = [...groups.values()]
    .map((group) => ({
      ...group,
      count: group.positions.size,
      gameCount: group.games.size,
      recurring: group.positions.size >= 2 && group.games.size >= 2,
    }))
    .sort(
      (a, b) => Number(b.recurring) - Number(a.recurring) || b.count - a.count,
    );
  const useful = patterns.find(
    (group) =>
      !progress.independent.has(group.lesson) ||
      revisitSchedule(
        attempts.filter((a) => a.lessonId === group.lesson),
        now,
      ).due,
  );
  if (useful) {
    const prerequisite = firstPrerequisite(useful.lesson, progress.independent);
    const lesson = LESSONS.find(
      (l) => l.id === (prerequisite ?? useful.lesson),
    )!;
    const target = LESSONS.find((l) => l.id === useful.lesson)!;
    const example = useful.examples[0];
    const evidence = `${useful.count} distinct ${useful.count === 1 ? "position" : "positions"} in ${useful.gameCount} ${useful.gameCount === 1 ? "game" : "games"}`;
    return {
      lesson,
      kind: useful.recurring ? "Recurring in your games" : "From your game",
      reason: prerequisite
        ? `${evidence} point to “${target.title}”. Start with “${lesson.title}”, which that idea builds on.`
        : `${evidence} make this a useful next lesson. ${example.detail}`,
      source: example.source,
      patterns,
      progress,
    };
  }
  const due = LESSONS.map((lesson) => ({
    lesson,
    schedule: revisitSchedule(
      attempts.filter((a) => a.lessonId === lesson.id),
      now,
    ),
  }))
    .filter((item) => progress.latest.has(item.lesson.id) && item.schedule.due)
    .sort((a, b) => a.schedule.dueAt - b.schedule.dueAt)[0];
  if (due)
    return {
      lesson: due.lesson,
      kind: "Time to revisit",
      reason:
        "Revisit this idea on its different practice board before moving further through the course.",
      source: undefined,
      patterns,
      progress,
    };
  return {
    lesson: progress.next,
    kind: "Next in your course",
    reason:
      "Follow the course order, then try the idea on a different board without hints. Every stage stays open if you want to explore.",
    source: undefined,
    patterns,
    progress,
  };
}
