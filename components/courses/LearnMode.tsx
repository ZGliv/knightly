"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IconArrowRight, IconRotate } from "@tabler/icons-react";
import { learnedPositions, markLearned, nextLineToLearn } from "@/lib/courses/progress";
import { LineRunner } from "./LineRunner";
import type { ModeProps } from "./modeTypes";

/** Walks through the next line not yet learned, showing each new move with an arrow and a note. */
export function LearnMode({ course, steps, progress, update, hrefFor }: ModeProps) {
  // The line just finished stays on screen until "Next line", even though it is now learned.
  const [finished, setFinished] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  // ?line=<id> (from "Learn this line" links) starts on that line, learned or not, once.
  const linked = useSearchParams().get("line");
  const [requested, setRequested] = useState(() => course.lines.find((l) => l.id === linked)?.id ?? null);
  const line = course.lines.find((l) => l.id === (finished ?? requested)) ?? nextLineToLearn(course, progress);
  const known = useMemo(() => learnedPositions(course, progress, line?.id), [course, progress, line?.id]);
  const learnedCount = course.lines.filter((l) => progress.learned.includes(l.id)).length;
  const total = course.lines.length;

  if (!line)
    return (
      <div className="cr-card cr-empty">
        <h2>You’ve learned all {total} lines</h2>
        <p className="cr-muted">Keep them fresh: Practice brings each line back just before you’re likely to forget it.</p>
        <div className="cr-actions">
          <Link className="btn" href={hrefFor("practice")}>Practice <IconArrowRight size={16} /></Link>
          <Link className="btn secondary" href={hrefFor("drill")}>Drill</Link>
        </div>
      </div>
    );

  const position = course.lines.indexOf(line) + 1;
  return (
    <LineRunner
      key={`${line.id}-${run}`}
      course={course}
      line={line}
      steps={steps.get(line.id)!}
      guide="learn"
      known={known}
      onMistake="retry"
      onFinish={() => {
        update((p) => markLearned(p, line.id));
        setFinished(line.id);
      }}
      status={
        <p className="cr-status">
          <strong>{learnedCount}/{total}</strong> lines learned · line {position} of {total}
        </p>
      }
      actions={
        finished ? (
          <>
            <button className="btn" onClick={() => { setFinished(null); setRequested(null); setRun((r) => r + 1); }}>
              {learnedCount < total ? <>Next line <IconArrowRight size={16} /></> : "Done"}
            </button>
            <button className="btn secondary" onClick={() => setRun((r) => r + 1)}>
              <IconRotate size={16} /> Play it again
            </button>
          </>
        ) : null
      }
    />
  );
}
