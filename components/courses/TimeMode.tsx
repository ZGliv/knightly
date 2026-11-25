"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { IconClock, IconPlayerPlay, IconRotate } from "@tabler/icons-react";
import { shuffled } from "@/lib/courses/line";
import { recordReview, withBestTime } from "@/lib/courses/progress";
import { GamesGate } from "./GamesGate";
import { LineRunner } from "./LineRunner";
import { MIN_LINES_FOR_GAMES, type ModeProps } from "./modeTypes";

const START_MS = 60_000;
const BONUS_MS = 5_000;
const NEXT_DELAY = 350;
const ANSWER_DELAY = 1_400;

type Phase = "ready" | "running" | "over";

/** A 60-second race through learned lines; each clean line adds 5 seconds. */
export function TimeMode({ course, steps, progress, update, hrefFor }: ModeProps) {
  const learned = course.lines.filter((l) => progress.learned.includes(l.id)).map((l) => l.id);
  const [phase, setPhase] = useState<Phase>("ready");
  const [queue, setQueue] = useState<string[]>([]);
  const [at, setAt] = useState(0);
  const [run, setRun] = useState(0);
  const [score, setScore] = useState(0);
  /** Set on the learner's first move; null until then. */
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [bestBefore, setBestBefore] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  const timeUp = useEffectEvent(() => {
    window.clearTimeout(timer.current);
    setPhase("over");
    update((p) => withBestTime(p, score));
  });

  useEffect(() => {
    if (phase !== "running" || deadline === null) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= deadline) timeUp();
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, deadline]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (learned.length < MIN_LINES_FOR_GAMES) return <GamesGate title="Time" learned={learned.length} learnHref={hrefFor("learn")} />;

  function start() {
    window.clearTimeout(timer.current);
    setQueue(shuffled(learned));
    setAt(0);
    setScore(0);
    setDeadline(null);
    setBestBefore(progress.bestTime);
    setPhase("running");
    setRun((r) => r + 1);
  }

  if (phase === "ready")
    return (
      <div className="cr-card cr-empty">
        <h2>Time</h2>
        <p className="cr-muted">
          Play as many learned lines as you can in 60 seconds. Each line without a mistake scores a point and adds 5 seconds. A wrong move shows the answer and moves on. The clock starts on your first move.
        </p>
        {progress.bestTime > 0 && <p>Your best: <strong>{progress.bestTime}</strong> lines.</p>}
        <div className="cr-actions">
          <button className="btn" onClick={start}><IconPlayerPlay size={16} /> Start</button>
        </div>
      </div>
    );

  const lineId = queue[at];
  const line = course.lines.find((l) => l.id === lineId) ?? course.lines[0];
  const left = deadline === null ? START_MS : Math.max(0, deadline - now);
  const seconds = Math.ceil(left / 1000);

  function advance() {
    if (at + 1 < queue.length) setAt(at + 1);
    else {
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
      locked={phase === "over"}
      onFirstMove={() => {
        if (deadline !== null) return;
        const t = Date.now();
        setNow(t);
        setDeadline(t + START_MS);
      }}
      onFinish={(r) => {
        if (phase !== "running") return;
        update((p) => recordReview(p, line.id, { at: new Date().toISOString(), clean: r.clean }));
        if (r.clean) {
          setScore((s) => s + 1);
          setDeadline((d) => (d === null ? d : d + BONUS_MS));
        }
        timer.current = window.setTimeout(advance, r.clean ? NEXT_DELAY : ANSWER_DELAY);
      }}
      status={
        <div className={`cr-clock${phase === "running" && deadline !== null && left <= 10_000 ? " is-low" : ""}`} role="timer" aria-live="off">
          <span><IconClock size={18} /> {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>
          <span><strong>{score}</strong> {score === 1 ? "line" : "lines"}</span>
        </div>
      }
      actions={
        phase === "over" ? (
          <>
            <p className="cr-result">
              Time! You finished <strong>{score}</strong> {score === 1 ? "line" : "lines"} without a mistake.
              {score > bestBefore ? " That’s your best yet!" : ` Your best is ${Math.max(bestBefore, score)}.`}
            </p>
            <button className="btn" onClick={start}><IconRotate size={16} /> Play again</button>
          </>
        ) : deadline === null ? (
          <p className="cr-muted cr-small">The clock starts when you make your first move.</p>
        ) : null
      }
    />
  );
}
