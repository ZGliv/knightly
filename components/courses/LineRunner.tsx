"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Chess, type Square } from "chess.js";
import { IconBulb } from "@tabler/icons-react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { moveNote, type MoveNote } from "@/lib/courses/describe";
import { isExpectedMove, learnerIndexes, lineLabels, type LineStep } from "@/lib/courses/line";
import { learnedKey } from "@/lib/courses/progress";
import type { Course, CourseLine } from "@/lib/courses/types";

const FIRST_REPLY_DELAY = 600;
const REPLY_DELAY = 450;

export interface RunResult {
  /** No wrong move and no hint. */
  clean: boolean;
  /** False when a wrong move ended the run early (mistake policy "end"). */
  completed: boolean;
}

export interface LineRunnerProps {
  course: Course;
  line: CourseLine;
  /** `replayLine(line.moves)`, replayed once by the page. */
  steps: LineStep[];
  /** "learn": show an arrow for moves not yet learned (see `known`). "test": never show the move first. */
  guide: "learn" | "test";
  /** Learn only: `learnedPositions(...)` keys; these moves are asked without the arrow. */
  known?: Set<string>;
  /** "retry": a wrong move is rejected and the right one shown until played. "end": a wrong move shows the answer and ends the run. */
  onMistake: "retry" | "end";
  /** Show a Hint button (using it makes the run not clean). */
  hints?: boolean;
  /** Freeze the board (e.g. the clock ran out). */
  locked?: boolean;
  /** Called once, on the learner's first move attempt. */
  onFirstMove?: () => void;
  /** Called once when the line is finished or ended by a mistake. */
  onFinish: (result: RunResult) => void;
  /** Mode-specific status shown above the coach note (streak, clock, counts). */
  status?: ReactNode;
  /** Mode-specific buttons shown under the coach note. */
  actions?: ReactNode;
}

type Mistake = { played: string; expected: number };

/**
 * Plays one line: the learner's moves on the board, the opponent's automatically, with a coach
 * note beside the board. Key it by line and run so every run starts fresh.
 */
export function LineRunner({ course, line, steps, guide, known, onMistake, hints, locked, onFirstMove, onFinish, status, actions }: LineRunnerProps) {
  const side = course.side;
  const mine = useMemo(() => learnerIndexes(steps, side), [steps, side]);
  const lastMine = mine.at(-1) ?? -1;
  /** Index of the next move to be played. */
  const [ply, setPly] = useState(0);
  const [done, setDone] = useState(false);
  const [mistake, setMistake] = useState<Mistake | null>(null);
  const [dirty, setDirty] = useState(false);
  const [hinted, setHinted] = useState<number | null>(null);
  const [boardKey, setBoardKey] = useState(0);
  const started = useRef(false);

  const ended = done || (mistake !== null && onMistake === "end");
  const next = steps[ply];
  const yourTurn = !ended && !!next && next.mover === side;

  // The opponent's moves play themselves after a short pause.
  useEffect(() => {
    if (ended || !next || next.mover === side) return;
    const t = window.setTimeout(() => setPly((p) => p + 1), ply === 0 ? FIRST_REPLY_DELAY : REPLY_DELAY);
    return () => window.clearTimeout(t);
  }, [ended, next, side, ply]);

  const fen = ply === 0 ? steps[0].fenBefore : steps[ply - 1].fenAfter;
  const chess = new Chess(fen);
  const canPlay = yourTurn && !locked;
  const targets = (from: string) => chess.moves({ square: from as Square, verbose: true }).map((m) => m.to);

  const isNew = guide === "learn" && yourTurn && !known?.has(learnedKey(next));
  const showMove = yourTurn && (isNew || mistake?.expected === ply || hinted === ply);
  const answerShown = mistake && onMistake === "end" ? steps[mistake.expected].uci : null;
  const arrow = answerShown ?? (showMove ? next.uci : null);

  async function move(from: string, to: string, promotion?: string) {
    if (!canPlay) return false;
    if (!started.current) {
      started.current = true;
      onFirstMove?.();
    }
    if (!isExpectedMove(next, from, to, promotion)) {
      let played = `${from}-${to}`;
      try {
        played = new Chess(fen).move({ from, to, promotion: promotion ?? "q" }).san;
      } catch {
        // Illegal moves never reach here; keep the squares as a fallback.
      }
      setBoardKey((k) => k + 1);
      if (guide === "test") setDirty(true);
      setMistake({ played, expected: ply });
      if (onMistake === "end") onFinish({ clean: false, completed: false });
      return false;
    }
    setMistake(null);
    setPly(ply + 1);
    if (ply === lastMine) {
      setDone(true);
      onFinish({ clean: !dirty && hinted === null, completed: true });
    }
    return true;
  }

  function hint() {
    setHinted(ply);
    setDirty(true);
  }

  const note = (i: number): MoveNote => moveNote(course, steps, i);
  const lastOpp = ply > 0 && steps[ply - 1].mover !== side ? ply - 1 : null;
  const prevMine = [...mine].reverse().find((i) => i < ply) ?? null;
  const usedIdea = (i: number | null) => i !== null && !!course.ideas[steps[i].prefix];

  let prompt: ReactNode;
  let explain: number | null = null;
  if (mistake && onMistake === "end") {
    const want = steps[mistake.expected];
    prompt = (
      <>
        <strong>{mistake.played}</strong> isn’t the move in this line. It continues <strong>{want.san}</strong>: {note(mistake.expected).description}.
      </>
    );
  } else if (done) {
    prompt = <><strong>Line complete.</strong> You played every move.</>;
    explain = prevMine;
  } else if (!yourTurn) {
    prompt = ply === 0 ? "Your opponent starts…" : "Your opponent is replying…";
    explain = prevMine;
  } else if (mistake) {
    prompt = (
      <>
        Not quite. <strong>{mistake.played}</strong> is a different move. Here you play <strong>{next.san}</strong> ({note(ply).description}). Play it on the board.
      </>
    );
    explain = prevMine;
  } else if (isNew) {
    prompt = <>Your move: play <strong>{next.san}</strong>, shown by the arrow.</>;
    explain = ply;
  } else if (hinted === ply) {
    prompt = <>Hint: play <strong>{next.san}</strong> ({note(ply).description}), shown by the arrow.</>;
    explain = prevMine;
  } else {
    prompt = guide === "learn" ? "You’ve learned this move in an earlier line. What do you play here?" : "Your move. What do you play here?";
    explain = prevMine;
  }

  const explainNote = explain !== null ? note(explain) : null;
  const oppNote = lastOpp !== null ? note(lastOpp) : null;
  const aiNote = usedIdea(explain) || usedIdea(lastOpp);

  return (
    <div className="cr-runner">
      <div className="cr-board">
        <ChessBoard
          key={`${line.id}-${boardKey}`}
          fen={fen}
          playerColor={side}
          activeColor={chess.turn() === "w" ? "white" : "black"}
          canInteract={canPlay}
          getLegalTargets={targets}
          isMoveLegal={(from, to) => canPlay && targets(from).includes(to as Square)}
          lastMove={ply > 0 ? steps[ply - 1].uci : undefined}
          suggestion={arrow}
          onMove={move}
        />
        <ol className="cr-moves" aria-label="Moves so far">
          {steps.slice(0, ply).map((s) => (
            <li key={s.index} className={s.mover === side ? "is-mine" : ""}>
              {s.index % 2 === 0 && <span>{s.index / 2 + 1}.</span>}
              {s.san}
            </li>
          ))}
        </ol>
      </div>
      <aside className="cr-side">
        {status}
        <p className="cr-line-name">
          <span className="eyebrow">Line</span> {lineLabels(course.lines).get(line.id) ?? line.name}
        </p>
        <div className={`cr-coach${mistake ? " is-mistake" : ""}${done ? " is-done" : ""}`} role="status" aria-live="polite">
          {oppNote && lastOpp !== null && (
            <p className="cr-coach-opp">
              They played <strong>{steps[lastOpp].san}</strong>: {oppNote.description}.{oppNote.name && ` ${oppNote.name}`}
              {oppNote.idea && ` ${oppNote.idea}`}
            </p>
          )}
          <p className="cr-coach-prompt">{prompt}</p>
          {explainNote && explain !== null && (
            <div className="cr-coach-note">
              <span className="eyebrow">{explain === ply ? "Why this move" : `Your move ${steps[explain].san}`}</span>
              <p>{explainNote.text}</p>
            </div>
          )}
          {aiNote && <p className="cr-ai">Notes written by AI</p>}
        </div>
        {hints && yourTurn && !locked && (
          <div className="cr-actions">
            <button className="btn secondary" onClick={hint} disabled={hinted === ply || mistake?.expected === ply}>
              <IconBulb size={16} /> Hint
            </button>
          </div>
        )}
        {actions && <div className="cr-actions">{actions}</div>}
      </aside>
    </div>
  );
}
