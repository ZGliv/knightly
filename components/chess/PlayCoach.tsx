"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Chess, DEFAULT_POSITION } from "chess.js";
import type { SavedGame, ClassifiedMove } from "@/types/game";
import type { EngineAnalysis } from "@/lib/engine/stockfish-client";
import { analyzeMove, type Analyze } from "@/lib/chess/analyze-move";
import { positionIdeas, readableLine } from "@/lib/chess/position-ideas";
import { colorName, moveLabel, isPlayerPly } from "@/lib/chess/player";
const pieceNames: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
type Mode = "hint" | "plan" | "best" | "analysis";
export function PlayCoach({
  game,
  board,
  ply,
  analyze,
  ready,
  onArrow,
}: {
  game: SavedGame;
  board: Chess;
  ply: number;
  analyze: Analyze;
  ready: boolean;
  onArrow: (fen: string, uci: string | null) => void;
}) {
  const [mode, setMode] = useState<Mode>("hint");
  const [result, setResult] = useState<EngineAnalysis | null>(null);
  const [review, setReview] = useState<ClassifiedMove | null>(null);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true),
    flight = useRef(false);
  const fen = board.fen();
  const selected = game.moves[ply - 1];
  const feedback = review ?? selected;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    onArrow(
      fen,
      result && (mode === "best" || (mode === "hint" && reveal))
        ? result.bestMove
        : null,
    );
    return () => onArrow(fen, null);
  }, [fen, result, mode, reveal, onArrow]);
  async function search(moveReview = false) {
    if (!ready || flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      if (moveReview && selected) {
        const annotation = await analyzeMove(
          selected.ply > 1
            ? game.moves[selected.ply - 2].fenAfter
            : DEFAULT_POSITION,
          selected,
          analyze,
          game.moves.slice(0, selected.ply - 1).map((move) => move.uci),
        );
        if (alive.current) setReview(annotation);
      } else {
        const next = await analyze(
          fen,
          20,
          game.moves.slice(0, ply).map((move) => move.uci),
        );
        if (alive.current) setResult(next);
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      flight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const best = result ? readableLine(fen, [result.bestMove])[0] : "";
  const piece = result
    ? board.get(result.bestMove.slice(0, 2) as Parameters<Chess["get"]>[0])
    : undefined;
  const whiteScore =
    result?.scoreCp === null || !result
      ? null
      : result.scoreCp * (board.turn() === "w" ? 1 : -1);
  const mateSide =
    result?.mateIn !== null && result?.mateIn !== undefined
      ? result.mateIn >= 0 === (board.turn() === "w")
        ? "White"
        : "Black"
      : null;
  return (
    <section className="play-coach" aria-label="Chess coaching">
      <div className="coach-tabs" role="group" aria-label="Coaching view">
        {(
          [
            ["hint", "Hints"],
            ["plan", "Plan"],
            ["best", "Best line"],
            ["analysis", "Move analysis"],
          ] as const
        ).map(([key, title]) => (
          <button
            key={key}
            aria-pressed={mode === key}
            onClick={() => {
              setMode(key);
              setReveal(false);
            }}
          >
            {title}
          </button>
        ))}
      </div>
      <div className="coach-content">
        <span className="small-label">
          {mode === "analysis"
            ? feedback
              ? `Move ${moveLabel(feedback.ply)} ${feedback.san}`
              : "No move to analyze"
            : `${board.turn() === "w" ? "White" : "Black"} to move`}
        </span>
        {mode === "plan" ? (
          <>
            <h2>A plan for this position</h2>
            <ul className="position-ideas">
              {positionIdeas(board).map((idea) => (
                <li key={idea}>{idea}</li>
              ))}
            </ul>
          </>
        ) : mode === "analysis" ? (
          <>
            <h2>
              {feedback?.classification
                ? feedback.classification === "best"
                  ? "Near best"
                  : feedback.classification[0].toUpperCase() +
                    feedback.classification.slice(1)
                : "Look back at the move"}
            </h2>
            <p>
              {feedback?.coachText ??
                "Select a move in the history, then compare it with Stockfish’s suggestion."}
            </p>
            {feedback?.bestSan && (
              <p className="coach-best">
                Stockfish preferred <strong>{feedback.bestSan}</strong>
                {feedback.cpLoss !== undefined && (
                  <span>
                    {" "}
                    · {(feedback.cpLoss / 100).toFixed(2)} evaluation loss
                  </span>
                )}
              </p>
            )}
            {selected && (
              <button
                className="btn secondary"
                disabled={!ready || busy}
                onClick={() => void search(true)}
              >
                {busy ? "Analyzing…" : "Analyze move"}
              </button>
            )}
            {selected && isPlayerPly(selected.ply, game.playerColor) && (
              <Link
                className="subtle-link"
                href={`/learn?game=${game.id}&ply=${selected.ply}`}
              >
                Practice this decision
              </Link>
            )}
          </>
        ) : board.isGameOver() ? (
          <>
            <h2>Position complete</h2>
            <p>{positionIdeas(board)[0]}</p>
          </>
        ) : (
          <>
            <h2>
              {mode === "best"
                ? "Stockfish’s best line"
                : "A nudge before your move"}
            </h2>
            {!result ? (
              <>
                <p>
                  {mode === "best"
                    ? "See a suggested move and one possible continuation."
                    : "Get a piece to consider first. Reveal the move only when you want it."}
                </p>
                <button
                  className="btn secondary"
                  disabled={!ready || busy}
                  onClick={() => void search()}
                >
                  {busy
                    ? "Thinking…"
                    : mode === "best"
                      ? "Find best line"
                      : "Get a hint"}
                </button>
              </>
            ) : mode === "hint" && !reveal ? (
              <>
                <p>
                  Look at your {pieceNames[piece?.type ?? "p"]} on{" "}
                  <strong>{result.bestMove.slice(0, 2)}</strong>. Compare its
                  legal moves and the threats they create.
                </p>
                <button
                  className="btn secondary"
                  onClick={() => setReveal(true)}
                >
                  Show the move
                </button>
              </>
            ) : (
              <>
                <p className="suggested-move">{best}</p>
                {mode === "best" && (
                  <p className="engine-line">
                    {readableLine(
                      fen,
                      result.pv[0] === result.bestMove
                        ? result.pv
                        : [result.bestMove],
                    ).join("  ")}
                  </p>
                )}
                <p className="position-evaluation">
                  {mateSide
                    ? `${mateSide} has a mating line in ${Math.abs(result.mateIn!)} moves`
                    : whiteScore === null
                      ? "No numerical evaluation returned"
                      : whiteScore === 0
                        ? "Position evaluation: equal (0.00)"
                        : `Position evaluation: ${whiteScore > 0 ? "White" : "Black"} +${(Math.abs(whiteScore) / 100).toFixed(2)}`}
                </p>
              </>
            )}
          </>
        )}
        {error && <p role="alert">{error}</p>}
        <p className="coach-caption">
          {mode === "plan"
            ? `Ideas for the side to move. You are playing ${colorName(game.playerColor)}.`
            : "Full-strength, short-search estimates. Opponent difficulty does not weaken these suggestions."}
        </p>
      </div>
    </section>
  );
}
