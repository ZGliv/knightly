"use client";
import { markGameAssisted } from "@/lib/learning/adaptive-rating";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Chess, DEFAULT_POSITION } from "chess.js";
import { NEO_PIECES } from "@/components/chess/pieces";
import { Chessboard } from "react-chessboard";
import { colorName, isPlayerPly } from "@/lib/chess/player";
import type { SavedGame } from "@/types/game";
import {
  getGameLocal,
  saveGameLocal,
  setActiveGame,
} from "@/lib/storage/local-games";
import { loadChess, recordGame } from "@/lib/chess/game-record";
import { analyzeMove } from "@/lib/chess/analyze-move";
import { useEngine } from "@/hooks/useEngine";
import { ReviewSummaryCard } from "./ReviewSummaryCard";
import { PhaseStrengthCard } from "./PhaseStrengthCard";
export function GameReview({ id }: { id: string }) {
  const [game, setGame] = useState<SavedGame | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [ply, setPly] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const engine = useEngine();
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = getGameLocal(id);
        if (saved?.result === "*") markGameAssisted(saved.id);
        setGame(saved);
      } catch (e) {
        setError((e as Error).message);
      }
      setLoaded(true);
    });
  }, [id]);
  if (!loaded) return <p>Loading game…</p>;
  if (!game)
    return (
      <div className="panel">
        <h1 className="text-xl">Game not found in this browser</h1>
        <p className="mt-3">
          {error || "Import the PGN on this device to reopen the game."}
        </p>
        <Link className="btn mt-4" href="/games">
          Open library
        </Link>
      </div>
    );
  const fen = ply ? game.moves[ply - 1].fenAfter : DEFAULT_POSITION;
  const selected = ply ? game.moves[ply - 1] : null;
  const isOwnMove = isPlayerPly(ply, game.playerColor);
  async function reviewMove() {
    if (!game || !selected || busy) return;
    setBusy(true);
    setError("");
    try {
      if (game.result === "*") markGameAssisted(game.id);
      const beforeFen =
        ply > 1 ? game.moves[ply - 2].fenAfter : DEFAULT_POSITION;
      const analyzed = await analyzeMove(
        beforeFen,
        selected,
        engine.analyze,
        game.moves.slice(0, ply - 1).map((m) => m.uci),
      );
      const latest = getGameLocal(game.id);
      if (latest?.updatedAt !== game.updatedAt)
        throw new Error(
          "This game changed in another tab. Reload before adding analysis.",
        );
      const moves = game.moves.map((m, i) => (i === ply - 1 ? analyzed : m));
      const next = recordGame(loadChess(game), game, moves, game.result);
      setGame(next);
      saveGameLocal(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="review-page space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">
            Study · Game replay ·{" "}
            {game.result === "*" ? "In progress" : game.result}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Game review</h1>
          <p className="mt-2 text-sm text-zinc-400">
            You played {colorName(game.playerColor)} · {game.openingName} ·{" "}
            {new Date(game.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Link href="/games" className="btn secondary">
          Back to library
        </Link>
      </div>
      {error && (
        <p className="panel text-amber-200" role="alert">
          {error}
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <div className="min-w-0 space-y-4">
          <div className="review-board">
            <Chessboard
              options={{
                pieces: NEO_PIECES,
                darkSquareStyle: { backgroundColor: "#769656" },
                lightSquareStyle: { backgroundColor: "#eeeed2" },
                darkSquareNotationStyle: { color: "#eeeed2" },
                lightSquareNotationStyle: { color: "#769656" },
                position: fen,
                boardOrientation: game.playerColor,
                allowDragging: false,
              }}
            />
            <p className="mt-4 text-center text-sm" aria-live="polite">
              {ply
                ? `${Math.ceil(ply / 2)}${ply % 2 ? "." : "…"} ${selected!.san}`
                : "Starting position"}{" "}
              · {ply} / {game.moves.length} plies
            </p>
            <div className="mt-3 flex justify-center gap-2">
              {[
                { label: "First", target: 0 },
                { label: "Previous", target: Math.max(0, ply - 1) },
                { label: "Next", target: Math.min(game.moves.length, ply + 1) },
                { label: "Last", target: game.moves.length },
              ].map((action) => (
                <button
                  key={action.label}
                  className="btn secondary px-3"
                  disabled={busy || action.target === ply}
                  onClick={() => setPly(action.target)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
          <div className="panel">
            <h2 className="font-semibold">Selected move</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              {(isOwnMove ? selected?.coachText : null) ||
                (selected
                  ? "Select one of your moves to analyze the position."
                  : "Select a move or use the replay controls.")}
            </p>
            {isOwnMove && (
              <button
                className="btn mt-4"
                disabled={busy || engine.status !== "ready"}
                onClick={() => void reviewMove()}
              >
                {busy ? "Comparing positions…" : "Analyze this move"}
              </button>
            )}
            {isOwnMove && (
              <Link
                className="btn secondary mt-3 ml-2"
                href={`/learn?game=${game.id}&ply=${ply}`}
              >
                Retry this decision
              </Link>
            )}
            {engine.status === "error" && (
              <button className="btn secondary mt-3" onClick={engine.restart}>
                Retry engine
              </button>
            )}
            <details className="mt-4 text-xs leading-5 text-zinc-500">
              <summary>About the analysis</summary>
              <p>
                Short Stockfish searches are estimates. “Near best” means a loss
                estimate of at most 0.25 pawns.
              </p>
            </details>
          </div>
          <div className="flex flex-wrap gap-2">
            {game.result === "*" && (
              <Link
                className="btn"
                href="/play"
                onClick={() => setActiveGame(game.id)}
              >
                Resume game
              </Link>
            )}
          </div>
        </div>
        <div className="min-w-0 space-y-4">
          <div className="panel">
            <h2 className="font-semibold">Moves</h2>
            <div className="mt-4 flex max-h-64 flex-wrap gap-2 overflow-y-auto">
              {game.moves.map((m, i) => (
                <button
                  key={m.ply}
                  aria-pressed={ply === i + 1}
                  className={`rounded-lg border px-3 py-2 text-sm ${ply === i + 1 ? "border-emerald-400 bg-emerald-500/20" : "border-zinc-700"}`}
                  disabled={busy}
                  onClick={() => setPly(i + 1)}
                >
                  {Math.ceil(m.ply / 2)}
                  {m.ply % 2 ? "." : "…"} {m.san}
                </button>
              ))}
            </div>
          </div>
          <ReviewSummaryCard summary={game.summary} />
          <PhaseStrengthCard phaseStrength={game.summary.phaseStrength} />
        </div>
      </div>
      <details className="text-xs text-zinc-500">
        <summary>Position FEN</summary>
        <p className="mt-2 break-all">{new Chess(fen).fen()}</p>
      </details>
    </section>
  );
}
