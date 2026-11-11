import Link from "next/link";
import {
  IconArrowRight,
  IconChevronDown,
  IconCheck,
} from "@tabler/icons-react";
import { PositionPreview } from "./PositionPreview";
import { SEQUENCES, sequencePosition } from "@/lib/learning/sequences";
import { LESSONS } from "@/lib/learning/curriculum";
import { PREREQUISITES, courseProgress } from "@/lib/learning/path";
import { outcomeLabel } from "@/lib/learning/study";
import type { Attempt } from "@/lib/learning/progress";
export function CoursePath({
  attempts,
  now,
  hrefFor,
}: {
  attempts: Attempt[];
  now: number;
  hrefFor: (id: string) => string;
}) {
  const progress = courseProgress(attempts, now);
  const active =
    progress.stages.find((stage) => stage.independent < stage.lessons.length) ??
    progress.stages[2];
  return (
    <div className="course-path">
      <div className="course-intro">
        <div>
          <h2>Build one idea on another.</h2>
        </div>
        <p>
          Learn the idea, try it with guidance, then use it on a different
          board. Progress records those independent attempts. You can open any
          stage.
        </p>
      </div>
      {progress.stages.map((stage, index) => (
        <details
          className="course-stage"
          key={stage.id}
          open={stage.id === active.id}
        >
          <summary>
            <span className="course-number">0{index + 1}</span>
            <div>
              <h3>{stage.title}</h3>
              <p>{stage.description}</p>
              <span>
                {stage.independent} of {stage.lessons.length} tried
                independently on a different board
              </span>
            </div>
            <IconChevronDown size={20} />
          </summary>
          <div className="course-stage-body">
            <p className="course-stage-goal">{stage.goal}</p>
            <ol>
              {stage.lessons.map((id, i) => {
                const lesson = SEQUENCES.find((l) => l.id === id)!;
                const href = hrefFor(id);
                const params = new URLSearchParams(href.split("?")[1]);
                const color = params.get("color") === "black" ? "black" : "white";
                const position = sequencePosition(lesson, params.get("stage") === "transfer" ? "transfer" : "guided", color);
                const done = progress.independent.has(id),
                  latest = progress.latest.get(id);
                const prerequisites = (PREREQUISITES[id] ?? []).filter(
                  (p) => !progress.independent.has(p),
                );
                return (
                  <li key={id}>
                    <Link
                      href={href}
                      className={`course-lesson ${done ? "is-practiced" : ""}`}
                    >
                      <div className="course-lesson-board">
                        <PositionPreview fen={position.fen} color={color} />
                      </div>
                      <div className="course-lesson-copy">
                        <strong><span className="course-lesson-index">{done ? <IconCheck size={16} /> : String(i + 1).padStart(2, "0")}</span>{lesson.title}</strong>
                        <small>
                          {done
                            ? "Different board solved without help"
                            : latest?.stage === "guided" &&
                                latest.outcome !== "not-yet"
                              ? "Guided step done · try a different board"
                              : outcomeLabel(latest)}
                        </small>
                        {prerequisites.length > 0 && (
                          <span className="course-prerequisite">
                            Builds on:{" "}
                            {prerequisites
                              .map(
                                (p) => LESSONS.find((l) => l.id === p)!.title,
                              )
                              .join(" · ")}
                          </span>
                        )}
                      </div>
                      <IconArrowRight size={17} />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </details>
      ))}
      <p className="course-footnote">
        An independent solve is practice evidence, not proof of mastery.
        Scheduled revisits and decisions from your games stay part of the
        course.
      </p>
    </div>
  );
}
