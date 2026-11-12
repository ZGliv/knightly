"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { IconBulb, IconChevronLeft, IconChevronRight, IconEye, IconPlayerSkipBack, IconPlayerSkipForward } from "@tabler/icons-react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { checkMove, linePositions, lineSan, solverSide } from "@/lib/puzzles/solution";
import type { Puzzle } from "@/lib/puzzles/types";

const PIECE_NAMES: Record<string, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const SETUP_DELAY = 700;
const REPLY_DELAY = 450;

type Status = "intro" | "playing" | "solved" | "failed";

/** Plays one puzzle. The parent keys it per puzzle, so all state starts fresh. */
export function PuzzleBoard({ puzzle, onFinish }: { puzzle: Puzzle; onFinish: (solved: boolean) => void }) {
  const fens = useMemo(() => linePositions(puzzle), [puzzle]);
  const san = useMemo(() => lineSan(puzzle), [puzzle]);
  const side = solverSide(puzzle);
  const [status, setStatus] = useState<Status>("intro");
  const [ply, setPly] = useState(0);
  const [fen, setFen] = useState(puzzle.fen);
  const [lastMove, setLastMove] = useState<string | undefined>();
  const [hinted, setHinted] = useState(false);
  const [hint, setHint] = useState("");
  const [feedback, setFeedback] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [boardKey, setBoardKey] = useState(0);
  const [view, setView] = useState<number | null>(null);
  const finished = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    list.push(window.setTimeout(() => {
      setFen(fens[1]);
      setPly(1);
      setLastMove(puzzle.moves[0]);
      setStatus("playing");
    }, SETUP_DELAY));
    return () => list.forEach((t) => window.clearTimeout(t));
  }, [fens, puzzle.moves]);

  function finish(solved: boolean, atPly: number) {
    if (finished.current) return;
    finished.current = true;
    setStatus(solved ? "solved" : "failed");
    // Solved: keep the user's own final position (it may be a different mate). Missed: review from the critical moment.
    if (!solved) setView(atPly);
    onFinish(solved);
  }

  const canPlay = status === "playing" && !waiting;
  const chess = new Chess(fen);
  const targets = (from: string) => chess.moves({ square: from as Square, verbose: true }).map((m) => m.to);

  async function move(from: string, to: string, promotion?: string) {
    if (!canPlay) return false;
    const verdict = checkMove(puzzle, fen, ply, { from, to, promotion });
    if (verdict.kind === "illegal") {
      setBoardKey((k) => k + 1);
      return false;
    }
    if (verdict.kind === "wrong") {
      const wasPromotion = verdict.uci.length === 5;
      setFeedback(`${chess.move({ from, to, promotion: promotion ?? "q" }).san} isn’t it.${wasPromotion ? " (Promotions use the piece picked under Board controls.)" : ""} Step through the solution below.`);
      setBoardKey((k) => k + 1);
      finish(false, ply);
      return false;
    }
    setFen(verdict.fen);
    setLastMove(verdict.uci);
    setHint("");
    if (verdict.done) {
      setFeedback(hinted ? "Correct, but a hint was used, so this one counts as missed." : "");
      finish(!hinted, ply);
      return true;
    }
    setFeedback("Correct. Keep going.");
    setWaiting(true);
    timers.current.push(window.setTimeout(() => {
      setFen(fens[ply + 2]);
      setLastMove(verdict.reply);
      setPly(ply + 2);
      setWaiting(false);
    }, REPLY_DELAY));
    return true;
  }

  function showHint() {
    const from = puzzle.moves[ply].slice(0, 2) as Square;
    const piece = chess.get(from);
    setHinted(true);
    setHint(`Hint: look at your ${piece ? PIECE_NAMES[piece.type] : "piece"} on ${from}. Using a hint means this puzzle won’t count as solved.`);
  }

  function giveUp() {
    setFeedback("Here’s the solution. Step through it below.");
    finish(false, ply);
  }

  const reviewing = view !== null;
  const shownPly = view ?? 0;
  const boardFen = reviewing ? fens[shownPly] : fen;
  const boardLastMove = reviewing ? puzzle.moves[shownPly - 1] : lastMove;
  const sideName = side === "white" ? "White" : "Black";
  const prompt =
    status === "intro" ? "Watch your opponent’s move…"
    : status === "playing" ? (waiting ? "Opponent is replying…" : `${sideName} to move. Find the best move.`)
    : status === "solved" ? "Solved"
    : "Missed";

  return (
    <div className="pz-board">
      <div className={`pz-prompt pz-${status}`} role="status">
        <span className={`pz-side pz-side-${side}`} aria-hidden />
        <strong>{prompt}</strong>
      </div>
      <ChessBoard
        key={`${puzzle.id}-${boardKey}-${reviewing ? `view-${shownPly}` : "play"}`}
        fen={boardFen}
        playerColor={side}
        activeColor={new Chess(boardFen).turn() === "w" ? "white" : "black"}
        canInteract={canPlay}
        getLegalTargets={targets}
        isMoveLegal={(from, to) => canPlay && targets(from).includes(to as Square)}
        lastMove={boardLastMove}
        onMove={move}
      />
      {feedback && <p className="pz-feedback">{feedback}</p>}
      {hint && <p className="pz-hint">{hint}</p>}
      {status === "playing" && (
        <div className="pz-actions">
          <button className="btn secondary" onClick={showHint} disabled={waiting || !!hint}>
            <IconBulb size={16} /> Hint
          </button>
          <button className="btn secondary" onClick={giveUp} disabled={waiting}>
            <IconEye size={16} /> Show solution
          </button>
        </div>
      )}
      {reviewing && (
        <div className="pz-solution" aria-label="Solution">
          <ol className="pz-line">
            {san.map((s, i) => (
              <li key={i}>
                <button
                  className={`${i % 2 === 1 ? "pz-yours" : ""} ${i + 1 === shownPly ? "pz-current" : ""}`}
                  onClick={() => setView(i + 1)}
                  aria-label={`${i % 2 === 1 ? "Your move" : "Opponent"} ${s}`}
                >
                  {s}
                </button>
              </li>
            ))}
          </ol>
          <div className="pz-steps">
            <button className="icon-button" aria-label="Start position" disabled={shownPly === 0} onClick={() => setView(0)}><IconPlayerSkipBack size={18} /></button>
            <button className="icon-button" aria-label="Previous move" disabled={shownPly === 0} onClick={() => setView(shownPly - 1)}><IconChevronLeft size={20} /></button>
            <span>{shownPly === 0 ? "Start" : `Move ${shownPly} of ${puzzle.moves.length}`}</span>
            <button className="icon-button" aria-label="Next move" disabled={shownPly >= puzzle.moves.length} onClick={() => setView(shownPly + 1)}><IconChevronRight size={20} /></button>
            <button className="icon-button" aria-label="Last move" disabled={shownPly >= puzzle.moves.length} onClick={() => setView(puzzle.moves.length)}><IconPlayerSkipForward size={18} /></button>
          </div>
          <p className="pz-legend">Highlighted moves are yours to find.</p>
        </div>
      )}
    </div>
  );
}
