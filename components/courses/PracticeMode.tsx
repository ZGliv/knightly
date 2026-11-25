"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IconArrowRight, IconCheck, IconRepeat } from "@tabler/icons-react";
import { untilText } from "@/lib/openings/drill";
import { dueLines, lineSchedule, nextDueAt, nextLineToLearn, recordReview } from "@/lib/courses/progress";
import { LineRunner, type RunResult } from "./LineRunner";
import type { ModeProps } from "./modeTypes";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Spaced repetition over learned lines that are due. No arrows; a hint or a wrong move makes the run not clean. */
export function PracticeMode({ course, steps, progress, update, hrefFor }: ModeProps) {
  const [now, setNow] = useState<number | null>(null);
  /** The line being played (pinned so a finished line stays on screen). */
  const [active, setActive] = useState<string | null>(null);
  const [result, setResult] = useState<(RunResult & { back: string }) | null>(null);
  const [run, setRun] = useState(0);
  const [session, setSession] = useState({ clean: 0, total: 0 });

  // The clock is read after render; due lines refresh whenever progress changes.
  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
  }, [progress]);

  if (now === null) return <p className="cr-muted" role="status">Checking which lines are due…</p>;

  const lineIds = new Set(course.lines.map((l) => l.id));
  const scoped = { ...progress, learned: progress.learned.filter((id) => lineIds.has(id)) };
  const due = dueLines(scoped, now);
  const lineId = active ?? due[0] ?? null;
  const line = lineId ? course.lines.find((l) => l.id === lineId) ?? null : null;

  if (!line) {
    const nextAt = nextDueAt(scoped, now);
    const more = nextLineToLearn(course, progress);
    return (
      <div className="cr-card cr-empty">
        {scoped.learned.length === 0 ? (
          <>
            <h2>Nothing to practise yet</h2>
            <p className="cr-muted">Practice reviews lines you’ve already learned. Learn your first line to get started.</p>
          </>
        ) : (
          <>
            <h2>{session.total ? "All caught up" : "Nothing due right now"}</h2>
            {session.total > 0 && <p>This session: {session.clean} of {plural(session.total, "line")} played without a mistake.</p>}
            <p className="cr-muted">
              {nextAt !== null ? `Your next line is due ${untilText(nextAt - now)}.` : ""} Lines come back after 1, 3 and then 7 days when you play them cleanly, and after 15 minutes when you slip.
            </p>
          </>
        )}
        {more && (
          <div className="cr-actions">
            <Link className="btn" href={hrefFor("learn")}>Learn a new line <IconArrowRight size={16} /></Link>
          </div>
        )}
      </div>
    );
  }

  const remaining = due.filter((id) => id !== line.id).length;
  return (
    <LineRunner
      key={`${line.id}-${run}`}
      course={course}
      line={line}
      steps={steps.get(line.id)!}
      guide="test"
      onMistake="retry"
      hints
      onFinish={(r) => {
        const t = Date.now();
        const review = { at: new Date(t).toISOString(), clean: r.clean };
        update((p) => recordReview(p, line.id, review));
        const back = lineSchedule(recordReview(progress, line.id, review), line.id, t).dueAt - t;
        setActive(line.id);
        setResult({ ...r, back: untilText(back) });
        setSession((s) => ({ clean: s.clean + (r.clean ? 1 : 0), total: s.total + 1 }));
      }}
      status={
        <p className="cr-status">
          {result
            ? result.clean
              ? <span className="cr-good"><IconCheck size={16} /> Clean run. This line comes back {result.back}.</span>
              : <span className="cr-warn"><IconRepeat size={16} /> Finished with help. This line comes back {result.back} for another go.</span>
            : <><strong>{plural(due.length, "line")}</strong> due · no arrows here, use Hint if you’re stuck</>}
        </p>
      }
      actions={
        result ? (
          <button
            className="btn"
            onClick={() => {
              setActive(null);
              setResult(null);
              setRun((n) => n + 1);
              setNow(Date.now());
            }}
          >
            {remaining > 0 ? <>Next line <IconArrowRight size={16} /></> : "Finish"}
          </button>
        ) : null
      }
    />
  );
}
