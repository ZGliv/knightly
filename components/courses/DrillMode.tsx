"use client";
import { useEffect, useRef, useState } from "react";
import { IconFlame, IconPlayerPlay, IconRotate } from "@tabler/icons-react";
import { shuffled } from "@/lib/courses/line";
import { recordReview, withBestDrill } from "@/lib/courses/progress";
import { GamesGate } from "./GamesGate";
import { LineRunner } from "./LineRunner";
import { MIN_LINES_FOR_GAMES, type ModeProps } from "./modeTypes";

const NEXT_DELAY = 900;

/** Learned lines in random order with no help; counts lines in a row without a mistake. */
export function DrillMode({ course, steps, progress, update, hrefFor }: ModeProps) {
  const learned = course.lines.filter((l) => progress.learned.includes(l.id)).map((l) => l.id);
  const [queue, setQueue] = useState<string[] | null>(null);
  const [at, setAt] = useState(0);
  const [run, setRun] = useState(0);
  const [streak, setStreak] = useState(0);
  const [over, setOver] = useState(false);
  /** Best streak before this drill began, so a new record can be called out. */
  const [bestBefore, setBestBefore] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (learned.length < MIN_LINES_FOR_GAMES) return <GamesGate title="Drill" learned={learned.length} learnHref={hrefFor("learn")} />;

  function start() {
    window.clearTimeout(timer.current);
    setQueue(shuffled(learned));
    setAt(0);
    setStreak(0);
    setOver(false);
    setBestBefore(progress.bestDrill);
    setRun((r) => r + 1);
  }

  if (!queue)
    return (
      <div className="cr-card cr-empty">
        <h2>Drill</h2>
        <p className="cr-muted">
          Your {learned.length} learned lines in random order, with no arrows and no hints. See how many you can play in a row without a mistake.
        </p>
        {progress.bestDrill > 0 && <p>Your best: <strong>{progress.bestDrill}</strong> in a row.</p>}
        <div className="cr-actions">
          <button className="btn" onClick={start}><IconPlayerPlay size={16} /> Start drill</button>
        </div>
      </div>
    );

  const lineId = queue[at];
  const line = course.lines.find((l) => l.id === lineId) ?? course.lines[0];

  function advance() {
    if (!queue) return;
    if (at + 1 < queue.length) setAt(at + 1);
    else {
      // Reshuffle, avoiding the same line twice in a row.
      let fresh = shuffled(learned);
      if (fresh.length > 1 && fresh[0] === lineId) fresh = [...fresh.slice(1), fresh[0]];
      setQueue(fresh);
      setAt(0);
    }
    setRun((r) => r + 1);
  }

  return (
    <LineRunner
      key={`${line.id}-${run}`}
      course={course}
      line={line}
      steps={steps.get(line.id)!}
      guide="test"
      onMistake="end"
      onFinish={(r) => {
        const review = { at: new Date().toISOString(), clean: r.clean };
        const total = r.clean ? streak + 1 : streak;
        update((p) => withBestDrill(recordReview(p, line.id, review), total));
        if (r.clean) {
          setStreak(total);
          timer.current = window.setTimeout(advance, NEXT_DELAY);
        } else setOver(true);
      }}
      status={
        <p className="cr-status">
          <span className="cr-streak"><IconFlame size={16} /> <strong>{streak}</strong> in a row</span>
          <span className="cr-muted"> · best {Math.max(progress.bestDrill, streak)}</span>
        </p>
      }
      actions={
        over ? (
          <>
            <p className="cr-result">
              Streak over at <strong>{streak}</strong>.{streak > bestBefore ? " That’s your best yet!" : ""} The arrow shows the move this line expects.
            </p>
            <button className="btn" onClick={start}><IconRotate size={16} /> Start over</button>
          </>
        ) : null
      }
    />
  );
}
