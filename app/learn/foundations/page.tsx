"use client";

import { followThroughPosition, followThroughWalkthrough, selectPracticeLine } from "@/lib/learning/follow-through";
import { areaForLesson } from "@/lib/learning/areas";
import { AreaGuide } from "@/components/learning/AreaGuide";
import { selectPracticePosition } from "@/lib/learning/practice-selection";
import { COURSE_ORDER, COURSE_STAGES } from "@/lib/learning/path";
import Link from "next/link";
import { IconArrowLeft, IconCheck, IconBulb, IconAdjustmentsHorizontal, IconArrowRight } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "@/components/chess/ChessBoard";
import {
  SEQUENCES,
  sequencePosition,
  type PracticeStage,
} from "@/lib/learning/sequences";
import { CONCEPTS } from "@/lib/learning/study";
import {
  LESSONS,
  PHASE_LABELS,
  PHASES,
  solvesLesson,
  type Lesson,
} from "@/lib/learning/curriculum";
import {
  gameFocus,
  nextLesson,
  phaseAttempts,
  readAttempts,
  saveAttempt,
  type Attempt,
  type Outcome,
} from "@/lib/learning/progress";
import { listGamesLocal } from "@/lib/storage/local-games";
import type { GamePhase } from "@/lib/utils/phase";

export default function LearnPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [focus, setFocus] = useState(() => gameFocus([]));
  const [phase, setPhase] = useState<GamePhase>("opening");
  const [stage, setStage] = useState<PracticeStage>("guided");
  const [side, setSide] = useState<"white" | "black">("white");
  const [sourceGame, setSourceGame] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [gameError, setGameError] = useState("");
  const [active, setActive] = useState<{
    lesson: Lesson;
    reason: string;
    key: number;
  } | null>(null);
  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      try {
        setAttempts(readAttempts());
      } catch {
        setStorageError(
          "Practice history is unavailable. You can still practice; progress will not be saved. Existing data is untouched.",
        );
      }
      try {
        const suggestion = gameFocus(listGamesLocal());
        setFocus(suggestion);
        const requested = new URLSearchParams(window.location.search).get(
          "phase",
        );
        setPhase(
          PHASES.includes(requested as GamePhase)
            ? (requested as GamePhase)
            : suggestion.phase,
        );
      } catch {
        setGameError(
          "Your game library could not be read. Practice still works; open your saved games for recovery tools.",
        );
      }
      const params = new URLSearchParams(window.location.search);
      setSide(params.get("color") === "black" ? "black" : "white");
      setSourceGame(
        (params.get("game")?.length ?? 0) <= 200 ? params.get("game") : null,
      );
      const requestedLesson = LESSONS.find(
        (lesson) =>
          lesson.id ===
          new URLSearchParams(window.location.search).get("lesson"),
      );
      if (requestedLesson) {
        setPhase(requestedLesson.phase);
        if (
          params.get("stage") === "transfer" &&
          SEQUENCES.some((s) => s.id === requestedLesson.id)
        )
          setStage("transfer");
        setActive({
          lesson: requestedLesson,
          reason:
            "You chose this concept from your study path. Try it, use a hint if you need one, and bring the idea into a game.",
          key: Date.now(),
        });
      }
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  function complete(
    lesson: Lesson,
    hints: number,
    misses: number,
    outcome: Outcome,
    positionId: string,
    lineProgress?: { movesCompleted: number; movesRequired: number; lineId?: string },
  ) {
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      lessonId: lesson.id,
      at: new Date().toISOString(),
      hints,
      misses,
      outcome,
      positionId,
      ...lineProgress,
      stage,
      playerColor: side,
      sourceGameId: sourceGame ?? undefined,
    };
    if (storageError) {
      setAttempts((prior) => [...prior, attempt]);
      return;
    }
    try {
      setAttempts(saveAttempt(attempt));
    } catch {
      setAttempts((prior) => [...prior, attempt]);
      setStorageError(
        "Practice progress could not be saved. This session still works; keep the page open to retain its progress.",
      );
    }
  }
  if (!ready) return <p role="status">Opening your lesson…</p>;
  const recommendation = nextLesson(attempts, phase, active?.lesson.id);
  const recent = phaseAttempts(attempts, phase).slice(-5);
  const lesson = active?.lesson ?? recommendation.lesson;
  const chapter = COURSE_STAGES.find(item => item.lessons.some(id => id === lesson.id));
  return (
    <section className="lesson-adventure">
      <header className="lesson-topbar">
        <Link href={`/learn?lesson=${lesson.id}`} aria-label="Back to learning path"><IconArrowLeft size={20}/> Learning path</Link>
        <span>{chapter?.title ?? PHASE_LABELS[phase]}</span>
        <details className="lesson-options">
          <summary aria-label="Lesson options"><IconAdjustmentsHorizontal size={20}/><span>Options</span></summary>
          <div>
            <label>Practice as <select aria-label="Practice side" className="field" value={side} onChange={event => setSide(event.target.value as "white" | "black")}><option value="white">White</option><option value="black">Black</option></select></label>
            <div aria-label="Practice phase">{PHASES.map(item => <button key={item} aria-pressed={phase === item} className="btn secondary" onClick={() => {setPhase(item);setActive(null);setStage("guided");}}>{PHASE_LABELS[item]}</button>)}</div>
            {sourceGame && <Link href={`/learn?game=${encodeURIComponent(sourceGame)}`}>Return to your game decisions</Link>}
          </div>
        </details>
      </header>
      {(storageError || gameError) && <p role="alert" className="lesson-storage-error">{storageError || gameError}</p>}
      <Exercise key={`${active?.key ?? phase}-${stage}-${side}`} stage={stage} side={side}
        attempts={attempts} lesson={lesson} reason={active?.reason ?? recommendation.reason} onComplete={complete}
        onTransfer={lesson => {setActive({lesson,reason:"Same principle, a different position. Try without hints first; help is still available.",key:Date.now()});setStage("transfer");}}
        onNext={currentId => {setStage("guided");const index=COURSE_ORDER.indexOf(currentId as typeof COURSE_ORDER[number]);const lesson=LESSONS.find(item=>item.id===COURSE_ORDER[(index+1)%COURSE_ORDER.length])!;setPhase(lesson.phase);setSourceGame(null);setActive({lesson,reason:"The next idea in the course order. You can return to any earlier idea from Learning path.",key:Date.now()});}}
      />
      <details className="lesson-history"><summary>Recent practice & lesson context</summary>
        <p>{sourceGame ? "These teaching positions connect to your game practice. They do not explain every mistake in that game." : focus.reason}</p>
        {recent.length ? <ul>{[...recent].reverse().map(attempt=><li key={attempt.id}><span>{LESSONS.find(l=>l.id===attempt.lessonId)?.title}</span><span>{attempt.movesRequired ? `Follow-through ${attempt.movesCompleted}/${attempt.movesRequired}` : attempt.stage==="transfer"?"Different position":"Guided"} · {attempt.playerColor==="black"?"Black":"White"} · {attempt.outcome==="independent"?"Independent":attempt.outcome==="supported"?"With support":"Not yet"}</span></li>)}</ul> : <p>Your attempts will appear here.</p>}
        <p>Solving one position is practice success, not proof of mastery. Your latest 500 attempts stay in this browser, separately from your games.</p>
      </details>
    </section>
  );
}

function Exercise({
  attempts,
  lesson,
  reason,
  stage,
  side,
  onTransfer,
  onComplete,
  onNext,
}: {
  attempts: Attempt[];
  stage: PracticeStage;
  side: "white" | "black";
  onTransfer: (lesson: Lesson) => void;
  lesson: Lesson;
  reason: string;
  onComplete: (
    lesson: Lesson,
    hints: number,
    misses: number,
    outcome: Outcome,
    positionId: string,
    lineProgress?: { movesCompleted: number; movesRequired: number; lineId?: string },
  ) => void;
  onNext: (currentId: string) => void;
}) {
  // Freeze this exercise until Next; recording an outcome can change recommendations.
  const [base] = useState(lesson);
  const [positionId] = useState(() => stage === "transfer"
    ? selectPracticePosition(SEQUENCES.find(s => s.id === lesson.id)!, attempts).positionId : "guided");
  const [line] = useState(() => selectPracticeLine(sequencePosition(lesson, stage, side, positionId), positionId, attempts));
  const initial = line.lesson;
  const [step, setStep] = useState(0);
  const current = followThroughPosition(initial, step);
  const area = areaForLesson(current.id);
  const totalMoves = 1 + (initial.followThrough?.length ?? 0);
  const [replying, setReplying] = useState(false);
  const locked = useRef(false);
  const [played, setPlayed] = useState<string[]>([]);
  const [stepHints, setStepHints] = useState(0);
  const sequence = SEQUENCES.some((item) => item.id === current.id);
  const [why] = useState(reason);
  const [fen, setFen] = useState(current.fen);
  const [hints, setHints] = useState(0);
  const [misses, setMisses] = useState(0);
  const [message, setMessage] = useState("");
  const [notation, setNotation] = useState("");
  const [lastMove, setLastMove] = useState<string>();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);
  const finished = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (outcome) feedback.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [outcome]);
  useEffect(() => {
    if (!replying) return;
    const timer = window.setTimeout(() => {
      const reply = initial.followThrough![step].reply;
      const next = followThroughPosition(initial, step + 1);
      const board = new Chess(fen);
      const opponentMove = board.move(reply);
      setFen(next.fen);
      setLastMove(opponentMove.from + opponentMove.to);
      setPlayed(prior => [...prior, reply]);
      setStep(step + 1);
      setStepHints(0);
      setMessage(`Opponent played ${reply}. Your turn to follow through.`);
      setReplying(false);
      locked.current = false;
    }, 650);
    return () => window.clearTimeout(timer);
  }, [replying, initial, step, fen]);
  const chess = new Chess(fen);
  const targets = (from: string) =>
    chess.moves({ square: from as Square, verbose: true }).map((m) => m.to);
  function finish(result: Outcome, usedHints = hints, movesCompleted = step) {
    if (finished.current) return;
    finished.current = true;
    setOutcome(result);
    onComplete(initial, usedHints, misses, result, positionId, totalMoves > 1 ? { movesCompleted, movesRequired: totalMoves, lineId: line.lineId } : undefined);
  }
  async function move(from: string, to: string, promotion = "q") {
    if (finished.current || locked.current) return false;
    const result = solvesLesson(current, from, to, promotion);
    if (!result.legal) {
      setMessage(
        "That move is not legal. Tap a piece to see its legal squares.",
      );
      return false;
    }
    if (!result.correct) {
      setMisses((count) => count + 1);
      setMessage(
        `${result.san} is legal, but doesn’t meet this exercise’s goal. Try another idea from this position or ask for a hint.`,
      );
      return false;
    }
    locked.current = true;
    setPlayed(prior => [...prior, result.san]);
    setFen(result.fen);
    setLastMove(from + to);
    setMessage(`${result.san} meets the goal.`);
    if (step < totalMoves - 1) {
      setMessage(`${result.san} meets the goal. Watch the opponent’s reply…`);
      setReplying(true);
    } else {
      finish(hints || misses ? "supported" : "independent", hints, totalMoves);
    }
    return true;
  }
  return (
    <div className={`lesson-session ${outcome ? "is-resolved" : ""}`}>
      <div className="lesson-session-heading">
        <h1>{current.title}</h1>
        <ol className="lesson-steps" aria-label="Lesson progress">
          <li className={stage === "guided" ? "is-active" : "is-done"} aria-current={stage === "guided" ? "step" : undefined}><span>{stage === "transfer" ? <IconCheck size={15}/> : "1"}</span> Learn the idea</li>
          <li className={stage === "transfer" ? "is-active" : ""} aria-current={stage === "transfer" ? "step" : undefined}><span>2</span> Try a new position</li>
        </ol>
        <p className="lesson-mobile-goal">{current.goal}</p>
      </div>
      <div className="lesson-board-area">
        <div className="lesson-turn"><span className={`lesson-side-piece ${side}`} />{side === "white" ? "White" : "Black"}{replying ? " · Waiting" : outcome ? " · Your move" : " to move"}<span>{outcome ? "Position complete" : replying ? "Opponent’s reply" : totalMoves > 1 ? `Your move ${step + 1} of ${totalMoves}` : "Your turn"}</span></div>
      <ChessBoard
        key={current.id + (outcome ?? "active") + misses}
        fen={fen}
        lastMove={lastMove}
        playerColor={side}
        activeColor={side}
        canInteract={!outcome && !replying}
        getLegalTargets={targets}
        isMoveLegal={(from, to) => targets(from).includes(to as Square)}
        onMove={move}
      />
        <p className="lesson-board-caption">{totalMoves > 1 ? played.length ? played.join(" → ") : `${totalMoves} moves to finish · ${initial.replyVariants?.length ? "Opponent replies vary between visits." : "Play through the complete technique."}` : outcome ? "Review your move on the board." : "Tap a piece, then its destination."}</p>
      </div>
      <div ref={feedback} className="lesson-coach">
        <div className="lesson-objective"><h2>{stage === "transfer" ? "Same idea. A fresh board." : "Find your move"}</h2><p>{current.goal}</p></div>
        {!outcome && <details className="lesson-principle" onToggle={event=>{if(stage==="transfer" && event.currentTarget.open && !finished.current)setHints(count=>Math.max(count,1));}}>
          <summary><IconBulb size={18}/> The idea · {current.title}</summary>
          <p>{CONCEPTS[current.id].principle}</p>
          {area && <details className="mt-4"><summary>Explore {area.title}</summary><AreaGuide areaId={area.id}/></details>}
        </details>}
      {!outcome && (
        <form
          className="lesson-notation"
          onSubmit={(event) => {
            event.preventDefault();
            if (locked.current || finished.current) return;
            const candidate = chess
              .moves({ verbose: true })
              .find(
                (m) =>
                  m.san.toLowerCase() === notation.trim().toLowerCase() ||
                  m.from + m.to + (m.promotion ?? "") ===
                    notation.trim().toLowerCase(),
              );
            if (!candidate) {
              setMessage(
                "Enter a legal move, such as Nf3 or g1f3. You can also tap the board.",
              );
              return;
            }
            setNotation("");
            void move(candidate.from, candidate.to, candidate.promotion);
          }}
        >
          <input
            className="field min-w-0 flex-1"
            disabled={replying}
            aria-label="Practice move"
            placeholder="Enter your move"
            value={notation}
            onChange={(event) => setNotation(event.target.value)}
          />
          <button disabled={replying} className="btn secondary">Try move</button>
        </form>
      )}
      <div aria-live="polite" className={`lesson-feedback ${outcome ? "resolved" : message ? "retry" : ""}`}>
        {message && (
          <p className="text-sm leading-6 text-emerald-200">{message}</p>
        )}
        {stepHints > 0 && !outcome && (
          <div className="lesson-hint">
            <p className="text-xs font-semibold text-amber-200">
              Hint {stepHints} of 2
            </p>
            <p className="mt-2 text-sm leading-6">
              {current.hints[stepHints - 1]}
            </p>
          </div>
        )}
        {outcome && (
          <div className="lesson-result">
            <span className="lesson-result-mark">{outcome === "not-yet" ? <IconBulb size={24}/> : <IconCheck size={24}/>}</span>
            <h3 className="font-semibold text-emerald-300">
              {outcome === "independent"
                ? "You solved this position without help."
                : outcome === "supported"
                  ? "You found it with support."
                  : "An idea to revisit."}
            </h3>
            <p className="text-sm leading-6">{current.explanation}</p>
            <p className="text-xs leading-5 text-zinc-400">
              {stage === "transfer"
                ? "Different-position result saved."
                : sequence
                  ? "Try the same idea on a different board next."
                  : "Guided result saved."}{" "}
              {outcome === "independent"
                ? "Revisit from My practice tomorrow."
                : "Revisit in 15 minutes."}
            </p>
            <p className="text-sm leading-6 text-zinc-400">
              <strong className="text-zinc-200">
                Take it into your game:{" "}
              </strong>
              {current.transfer}
            </p>
          </div>
        )}
      </div>
      <div className="lesson-actions">
        {!outcome ? (
          <>
            <button
              className="btn secondary"
              disabled={replying || stepHints >= 2}
              onClick={() => { setStepHints(count => Math.min(2, count + 1)); setHints(count => Math.min(2, count + 1)); }}
            >
              {stepHints ? "Give me a stronger hint" : "Give me a hint"}
            </button>
            <button
              className="btn secondary"
              disabled={replying}
              onClick={() => {
                const demo = followThroughWalkthrough(initial);
                setFen(demo.fen);
                setPlayed(demo.moves);
                setHints(3);
                setMessage(
                  `Walkthrough: ${demo.moves.join(" → ")}. Recorded as not yet; revisit to play it yourself.`,
                );
                finish("not-yet", 3);
              }}
            >
              Show me how
            </button>
            <button
              className="btn secondary"
              disabled={replying}
              onClick={() => {
                setMessage(
                  "Set aside for another time. Read the idea, then try a different position.",
                );
                finish("not-yet");
              }}
            >
              Set aside
            </button>
          </>
        ) : (
          <>
            {sequence && (
              <button className="btn" onClick={() => onTransfer(base)}>
                Try a different position <IconArrowRight size={18}/>
              </button>
            )}
            <button
              className="btn secondary"
              onClick={() => onNext(current.id)}
            >
              Next position
            </button>
            <Link href={`/learn?lesson=${base.id}`} className="btn secondary">Learning path</Link>
            <Link href="/study?view=practice" className="btn secondary">
              My practice
            </Link>
            <Link href="/play" className="btn secondary">
              Use it in a game
            </Link>
          </>
        )}
      </div>
      <details className="lesson-selection"><summary>Why this position?</summary><p>{why}</p></details>
      </div>
    </div>
  );
}
