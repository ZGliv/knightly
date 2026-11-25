"use client";
import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { buildBook } from "@/lib/courses/arena";
import type { LineStep } from "@/lib/courses/line";
import { courseGames, exitSentence, isPersonalId } from "@/lib/courses/personal";
import type { Course } from "@/lib/courses/types";
import { useImportedGames } from "./useImportedGames";

const WIDE = "(min-width: 851px)";
const subscribe = (change: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** How the learner's own chess.com games follow this course, and where he usually leaves it. Open on wide screens, collapsed on small ones. */
export function YourGamesPanel({ course, steps, learnHref }: { course: Course; steps: Map<string, LineStep[]>; learnHref: (lineId: string) => string }) {
  const games = useImportedGames();
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => false);
  const book = useMemo(() => buildBook(course, steps), [course, steps]);
  const report = useMemo(() => (games?.played.length ? courseGames(course, games.played, 5, book) : null), [course, games, book]);

  if (!games) return null;
  if (!games.played.length)
    return (
      <p className="cr-muted cr-small">
        <Link className="cr-link" href="/games/insights">Connect your chess.com account</Link> to see how your own games follow this opening.
      </p>
    );

  const colour = course.side === "white" ? "White" : "Black";
  return (
    <details className="cr-card cr-yours" open={wide || undefined}>
      <summary>
        <h2>Your games in this opening</h2>
        {report && <span className="cr-muted cr-small">{plural(report.games, "game")}</span>}
      </summary>
      {!report || report.games === 0 ? (
        <p className="cr-muted">
          None of your imported games as {colour} {isPersonalId(course.id) || !course.setup.length ? "could be read" : "began with this opening’s moves"}.
        </p>
      ) : (
        <>
          <p>
            {plural(report.games, "game")} as {colour}
            {course.setup.length ? " began this way" : ""}. Your score: <strong>{Math.round((report.points / report.games) * 100)}%</strong>
            <span className="cr-muted"> (a win counts 1, a draw half)</span>.
          </p>
          <p className="cr-muted">
            {plural(report.stayed, "game")} stayed in the course to its end. In {plural(report.opponentLeft, "game")} your opponent left it first, and in {plural(report.youLeft, "game")} you did.
          </p>
          {report.exits.length > 0 ? (
            <>
              <h3>Where you leave the course</h3>
              <ol className="cr-exits">
                {report.exits.map((exit) => (
                  <li key={exit.key}>
                    <p>{exitSentence(exit, report.games)}</p>
                    <p className="cr-muted cr-small">You scored {exit.score}% in those games.</p>
                    {exit.lineId && (
                      <Link className="cr-link" href={learnHref(exit.lineId)}>
                        Learn this line <IconArrowRight size={14} />
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="cr-muted">You never left the course before your opponent did.</p>
          )}
        </>
      )}
    </details>
  );
}
