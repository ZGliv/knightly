"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { MoveList } from "@/components/chess/MoveList";
import { useEngine } from "@/hooks/useEngine";
import { useChessGame } from "@/hooks/useChessGame";
import { downloadFile } from "@/lib/storage/local-games";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
  }
}
export default function PlayPage() {
  const engine = useEngine();
  const play = useChessGame(engine.analyze);
  const [notation, setNotation] = useState("");
  const [inputError, setInputError] = useState("");
  const { game, chess, busy } = play;
  const canPlay =
    !!game &&
    game.result === "*" &&
    chess.turn() === "w" &&
    engine.status === "ready" &&
    !busy &&
    !play.storageError;
  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        coordinates:
          "Algebraic: a1 is White’s lower-left square; files a–h, ranks 1–8.",
        fen: game?.fenFinal,
        turn: chess.turn(),
        legalMoves: chess.moves(),
        result: game?.result,
        ply: game?.moves.length,
        engine: engine.status,
        busy,
        saved: !play.storageError,
        error: play.error || play.storageError,
        gameId: game?.id,
      });
    // Chess has no animation simulation; this waits for real rendering/worker time.
    window.advanceTime = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [game, chess, busy, engine.status, play.error, play.storageError]);
  if (!play.loaded) return <p>Opening your board…</p>;
  if (!game)
    return (
      <section className="panel">
        <h1>Library needs attention</h1>
        <p role="alert">{play.storageError}</p>
        <Link className="btn" href="/games">
          Recover your library
        </Link>
      </section>
    );
  const feedback = [...game.moves].reverse().find((m) => m.coachText);
  const status =
    game.result !== "*"
      ? chess.isCheckmate()
        ? `Checkmate · ${game.result}`
        : chess.isDraw()
          ? "Draw"
          : `Game ended · ${game.result}`
      : busy
        ? "Stockfish is reviewing and responding…"
        : chess.turn() === "b"
          ? "Stockfish’s turn is ready to continue"
          : chess.isCheck()
            ? "You are in check"
            : "Your turn · White";
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">BuddyMine · Practice board</p>
          <h1 className="mt-2 text-3xl font-semibold">Make your next move.</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Understand your moves. Improve your game.
          </p>
        </div>
        <Link href="/games" className="btn secondary">
          Your library
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <p role="status" className="text-sm text-indigo-200">
            {status}
          </p>
          <ChessBoard
            key={game.id}
            fen={game.fenFinal}
            playerColor="white"
            activeColor={chess.turn() === "w" ? "white" : "black"}
            canInteract={canPlay}
            isMoveLegal={(from, to) =>
              canPlay && play.legalTargets(from).includes(to as never)
            }
            getLegalTargets={play.legalTargets}
            onMove={play.move}
          />
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const m = chess
                .moves({ verbose: true })
                .find(
                  (m) =>
                    m.san.toLowerCase() === notation.trim().toLowerCase() ||
                    m.from + m.to + (m.promotion ?? "") ===
                      notation.trim().toLowerCase(),
                );
              if (!m) {
                setInputError(
                  "Enter a legal SAN move (Nf3) or coordinates (e2e4).",
                );
                return;
              }
              setInputError("");
              setNotation("");
              await play.move(m.from, m.to, m.promotion);
            }}
          >
            <input
              className="field min-w-0 flex-1"
              aria-label="Move notation"
              placeholder="Or type a move: e4, Nf3, e2e4"
              value={notation}
              onChange={(e) => setNotation(e.target.value)}
              disabled={!canPlay}
            />
            <button className="btn secondary" disabled={!canPlay}>
              Play move
            </button>
          </form>
          {inputError && (
            <p role="alert" className="text-sm text-amber-200">
              {inputError}
            </p>
          )}
          <div className="panel space-y-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              Opponent skill <span>{game.engineLevel} / 20</span>
            </label>
            <input
              aria-label="Opponent skill"
              type="range"
              min="1"
              max="20"
              value={game.engineLevel}
              disabled={busy}
              onChange={(e) => play.changeLevel(Number(e.target.value))}
              className="w-full accent-indigo-400"
            />
            <p className="text-xs text-zinc-400">
              Controls the opponent’s play. Coaching always uses full engine
              strength with a short search. These levels are not Elo ratings.
            </p>
          </div>
        </div>
        <div className="min-w-0 space-y-4">
          {(engine.status !== "ready" || play.error) && (
            <div className="panel space-y-3">
              <p role="status" className="text-sm">
                {engine.status === "loading"
                  ? "Loading Stockfish on your device…"
                  : engine.error || play.error}
              </p>
              {engine.status !== "loading" && (
                <button className="btn secondary" onClick={engine.restart}>
                  Retry engine
                </button>
              )}
            </div>
          )}
          {play.storageError && (
            <div className="panel text-amber-200" role="alert">
              <p>{play.storageError}</p>
              <Link href="/games" className="underline">
                Open recovery tools
              </Link>
            </div>
          )}
          {game.result === "*" && chess.turn() === "b" && !busy && (
            <button
              className="btn w-full"
              disabled={engine.status !== "ready" || !!play.storageError}
              onClick={() => void play.respond()}
            >
              Continue engine turn
            </button>
          )}
          <div className="panel">
            <p className="eyebrow">Move notes</p>
            <h2 className="mt-2 text-xl font-semibold">
              {feedback
                ? `${Math.ceil(feedback.ply / 2)}. ${feedback.san}`
                : "A little context, every move."}
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {feedback?.coachText ||
                "Play a legal move. Stockfish compares the position before and after it, then makes its reply. Your game is saved after each move."}
            </p>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Local Stockfish 18 · 500 ms per search · factual templates, no
              generative AI. A deeper search can change a suggestion.
            </p>
          </div>
          <MoveList moves={game.moves} />
          <div className="panel space-y-3">
            <p className="text-sm text-zinc-300">
              {play.storageError
                ? "Save needs attention"
                : game.moves.length
                  ? "Saved in this browser"
                  : "Your next move starts a saved game"}
            </p>
            <div className="flex flex-wrap gap-2">
              {game.moves.length > 0 && (
                <Link className="btn" href={`/review/${game.id}`}>
                  Review game
                </Link>
              )}
              <button
                className="btn secondary"
                onClick={() =>
                  downloadFile(
                    `buddymine-${game.id}.pgn`,
                    game.pgn,
                    "application/x-chess-pgn",
                  )
                }
              >
                Export PGN
              </button>
              <button
                className="btn secondary"
                onClick={() =>
                  downloadFile(
                    `buddymine-${game.id}.json`,
                    JSON.stringify({
                      app: "BuddyMine",
                      version: 1,
                      games: [game],
                    }),
                  )
                }
              >
                Backup this game
              </button>
              <button
                className="btn secondary"
                disabled={busy || !!play.storageError}
                onClick={() => {
                  if (
                    !game.moves.length ||
                    confirm(
                      "Start a new game? This game stays in your library.",
                    )
                  )
                    play.newGame();
                }}
              >
                New game
              </button>
              {game.result === "*" && game.moves.length > 0 && (
                <button
                  className="btn secondary"
                  disabled={busy || !!play.storageError}
                  onClick={() => {
                    if (
                      confirm(
                        "Resign this game? You can still replay and export it.",
                      )
                    )
                      play.resign();
                  }}
                >
                  Resign
                </button>
              )}
            </div>
            <p className="text-xs leading-5 text-zinc-500">
              No account or server copy. Download a backup before clearing
              browser data or changing devices.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
