"use client";
import { useEffect, useMemo, useState } from "react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import type { PlayerColor } from "@/types/game";
import { dueAt, dueKeys, drillableKeys, isRightAnswer, nextStep, untilText, type DrillStep } from "@/lib/openings/drill";
import { chooseMove, playUci, recordReview, type RepertoireData, type RepertoireMove } from "@/lib/openings/repertoire";
import { positionKey, type OpeningTree } from "@/lib/openings/tree";
import { boardMoveUci, fenOf, legalTargets, moveNumber, plural, type PathStep } from "./shared";

interface Props {
  tree: OpeningTree;
  color: PlayerColor;
  data: RepertoireData;
  onChange: (next: RepertoireData) => void;
  /** Opens this position in the explorer. */
  onExplore: (path: PathStep[]) => void;
}

type Feedback =
  | { kind: "right"; san: string }
  | { kind: "wrong"; played: string; expected: RepertoireMove; comesBack: string }
  | { kind: "added"; san: string };

interface Line {
  path: PathStep[];
  step: DrillStep;
  /** Opponent moves just played, shown as "They played …". */
  replies: string[];
  feedback: Feedback | null;
  /** After a wrong answer the board shows the right move until the player continues. */
  waiting: RepertoireMove | null;
  /** Positions in this line answered wrongly once already, so a retry is not recorded twice. */
  missed: string[];
}

/** The app plays the opponent's side from his real games; he must play his prepared moves. */
export function Drill({ tree, color, data, onChange, onExplore }: Props) {
  const [line, setLine] = useState<Line | null>(null);
  const [session, setSession] = useState({ right: 0, wrong: 0 });
  const [now, setNow] = useState<number | null>(null);

  // The clock is read after render; due counts refresh whenever the repertoire changes.
  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
  }, [data]);

  const drillable = useMemo(() => drillableKeys(tree, data), [tree, data]);
  const due = useMemo(() => (now === null ? null : dueKeys(tree, data, now)), [tree, data, now]);
  const nextDue = useMemo(() => {
    if (now === null || !drillable.size || due?.size) return null;
    return Math.min(...[...drillable].map((k) => dueAt(data, k, now)));
  }, [drillable, due, data, now]);

  /** Plays opponent replies until it is the player's turn or the line ends. */
  function advance(path: PathStep[], current: RepertoireData, carry: Omit<Line, "path" | "step" | "replies">): Line {
    const dueNow = dueKeys(tree, current, Date.now());
    const replies: string[] = [];
    let walk = path;
    let step = nextStep(tree, current, fenOf(walk), walk.length, dueNow);
    while (step.kind === "reply") {
      const next = playUci(step.fen, step.move.uci);
      if (!next) break;
      walk = [...walk, { uci: step.move.uci, san: next.san, fen: next.fen }];
      replies.push(step.move.san);
      step = nextStep(tree, current, next.fen, walk.length, dueNow);
    }
    return { ...carry, path: walk, step, replies };
  }

  function startLine() {
    setLine(advance([], data, { feedback: null, waiting: null, missed: [] }));
  }

  function save(next: RepertoireData) {
    onChange(next);
    return next;
  }

  async function boardMove(from: string, to: string, promotion?: string) {
    if (!line) return false;
    const fen = fenOf(line.path);
    const uci = boardMoveUci(fen, from, to, promotion);
    if (!uci) return false;
    const step = line.step;

    if (step.kind === "unprepared") {
      const next = chooseMove(data, fen, uci);
      const played = playUci(fen, uci);
      if (!next || !played) return false;
      save(next);
      setLine(advance([...line.path, { uci, san: played.san, fen: played.fen }], next, {
        feedback: { kind: "added", san: played.san },
        waiting: null,
        missed: line.missed,
      }));
      return true;
    }
    if (step.kind !== "answer" || line.waiting) return false;

    const at = new Date().toISOString();
    if (isRightAnswer(step.expected, uci)) {
      const first = !line.missed.includes(step.key);
      const next = first ? save(recordReview(data, step.key, { at, outcome: "independent" })) : data;
      if (first) setSession((s) => ({ ...s, right: s.right + 1 }));
      const played = playUci(fen, step.expected.uci)!;
      setLine(advance([...line.path, { uci: step.expected.uci, san: played.san, fen: played.fen }], next, {
        feedback: { kind: "right", san: played.san },
        waiting: null,
        missed: line.missed,
      }));
      return true;
    }

    const playedSan = playUci(fen, uci)?.san ?? uci;
    let next = data;
    if (!line.missed.includes(step.key)) {
      next = save(recordReview(data, step.key, { at, outcome: "not-yet" }));
      setSession((s) => ({ ...s, wrong: s.wrong + 1 }));
    }
    const back = dueAt(next, step.key, Date.now()) - Date.now();
    setLine({
      ...line,
      replies: [],
      waiting: step.expected,
      missed: line.missed.includes(step.key) ? line.missed : [...line.missed, step.key],
      feedback: { kind: "wrong", played: playedSan, expected: step.expected, comesBack: untilText(back) },
    });
    return false;
  }

  function continueAfterMiss() {
    if (!line?.waiting) return;
    const fen = fenOf(line.path);
    const played = playUci(fen, line.waiting.uci);
    if (!played) return;
    setLine(advance([...line.path, { uci: line.waiting.uci, san: played.san, fen: played.fen }], data, {
      feedback: null,
      waiting: null,
      missed: line.missed,
    }));
  }

  function addUsual(uci: string) {
    if (!line) return;
    const fen = fenOf(line.path);
    const next = chooseMove(data, fen, uci);
    const played = playUci(fen, uci);
    if (!next || !played) return;
    save(next);
    setLine(advance([...line.path, { uci, san: played.san, fen: played.fen }], next, {
      feedback: { kind: "added", san: played.san },
      waiting: null,
      missed: line.missed,
    }));
  }

  const summary = (
    <p className="op-note">
      {drillable.size === 0
        ? "Nothing to drill yet: choose your moves in Explore first, or start a line and add moves as you go."
        : `${plural(drillable.size, "prepared position")} the drill can reach. ${
            due === null
              ? ""
              : due.size
                ? `${due.size} due now.`
                : nextDue !== null
                  ? `Nothing due; the next one comes back ${untilText(nextDue - (now ?? 0))}. You can still practise.`
                  : ""
          }`}
    </p>
  );

  if (!line)
    return (
      <section className="op-panel op-drill-intro">
        <h2 className="op-h2">Drill your repertoire</h2>
        <p className="op-note">
          The app plays your opponents&apos; side, choosing replies as often as your real opponents chose them.
          You play your prepared move. Positions you get wrong come back within 15 minutes; ones you know come
          back after 1, then 3, then 7 days (spaced repetition: reviewing just before you would forget).
        </p>
        {summary}
        <button className="btn" onClick={startLine}>
          Start a line
        </button>
      </section>
    );

  const fen = fenOf(line.path);
  const step = line.step;
  const turnColor = fen.split(" ")[1] === "b" ? "black" : "white";
  const canPlay = (step.kind === "answer" && !line.waiting) || step.kind === "unprepared";
  const usual = step.kind === "unprepared" ? tree.nodes[positionKey(fen)]?.moves[0] : undefined;
  const lastMove = line.path.at(-1)?.uci;

  return (
    <div className="op-layout">
      <div className="op-board">
        <ChessBoard
          key={`${fen}|${line.waiting ? "w" : ""}`}
          fen={fen}
          playerColor={color}
          activeColor={turnColor}
          orientation={color}
          canInteract={canPlay}
          isMoveLegal={(from, to) => legalTargets(fen, from).includes(to)}
          getLegalTargets={(from) => legalTargets(fen, from)}
          lastMove={lastMove}
          suggestion={line.waiting?.uci ?? null}
          onMove={boardMove}
        />
        <p className="op-line" aria-label="Moves in this line">
          {line.path.length ? line.path.map((s, i) => `${moveNumber(i)}${moveNumber(i) ? " " : ""}${s.san}`).join(" ") : "Start position"}
        </p>
      </div>

      <section className="op-panel" aria-live="polite">
        <p className="op-note">
          This session: {session.right} right · {session.wrong} to review
        </p>

        {line.feedback?.kind === "right" && <p className="op-good">Right: {line.feedback.san}.</p>}
        {line.feedback?.kind === "added" && <p className="op-good">{line.feedback.san} is now your prepared move here.</p>}
        {line.feedback?.kind === "wrong" && (
          <div className="op-verdict is-bad">
            <p className="op-verdict-text">
              You played {line.feedback.played}. Your prepared move here is <strong>{line.feedback.expected.san}</strong> (shown
              by the arrow).
            </p>
            <p className="op-note">This position comes back {line.feedback.comesBack}.</p>
            <button className="btn" onClick={continueAfterMiss}>
              Play {line.feedback.expected.san} and continue
            </button>
          </div>
        )}

        {line.replies.length > 0 && (
          <p className="op-reply">
            {line.replies.length === 1 && line.path.length === 1 ? "Your opponent opens" : "Your opponent plays"}{" "}
            <strong>{line.replies.join(", then ")}</strong>.
          </p>
        )}

        {step.kind === "answer" && !line.waiting && <p className="op-prompt">Your move: play your prepared move.</p>}

        {step.kind === "unprepared" && (
          <div className="op-choice">
            <p className="op-prompt">You have no move prepared here.</p>
            {usual ? (
              <button className="btn" onClick={() => addUsual(usual.uci)}>
                Add {usual.san}, the move you usually play
              </button>
            ) : null}
            <p className="op-note">{usual ? "Or play" : "Play"} a move on the board to add it to your repertoire.</p>
            <button className="btn secondary op-small" onClick={() => onExplore(line.path)}>
              Look at this position in Explore
            </button>
          </div>
        )}

        {step.kind === "end" && (
          <div className="op-choice">
            <p className="op-prompt">
              {step.reason === "depth"
                ? "Line complete: you reached the end of the first 12 moves."
                : line.path.length === 0
                  ? "None of your imported games were played with this colour, so there are no opponent replies to drill."
                  : "Line complete: none of your opponents has played on from here."}
            </p>
          </div>
        )}

        <div className="op-actions">
          <button className={`btn ${step.kind === "end" ? "" : "secondary"}`} onClick={startLine}>
            {step.kind === "end" ? "Next line" : "Restart from move 1"}
          </button>
          <button className="btn secondary" onClick={() => setLine(null)}>
            Stop
          </button>
        </div>
        {summary}
      </section>
    </div>
  );
}
