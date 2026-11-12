"use client";
import Link from "next/link";
import {
  IconArrowRight,
  IconChessKnight,
  IconFlag,
  IconChevronLeft,
  IconChevronRight,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconBulb,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { MoveList } from "@/components/chess/MoveList";
import { CapturedPieces } from "@/components/chess/CapturedPieces";
import { GameOverDialog } from "@/components/chess/GameOverDialog";
import { PlayCoach } from "@/components/chess/PlayCoach";
import { materialSnapshot } from "@/lib/chess/material";
import { ELO_PRESETS, opponentName, recordedOpponentName } from "@/lib/engine/strength";
import { useTrainingProfile } from "@/hooks/useTrainingProfile";
import { useEngine } from "@/hooks/useEngine";
import { useChessGame } from "@/hooks/useChessGame";
import { colorName, moveLabel, playerTurn } from "@/lib/chess/player";
import type { PlayerColor } from "@/types/game";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
  }
}
export default function PlayPage() {
  const engine = useEngine(),
    play = useChessGame(engine.analyze);
  const [newColor, setNewColor] = useState<PlayerColor | null>(null);
  const [selection, setSelection] = useState<{
    gameId: string;
    ply: number;
  } | null>(null);
  const [coaching, setCoaching] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    fen: string;
    uci: string | null;
  } | null>(null);
  const { game, chess, busy } = play;
  const training = useTrainingProfile(game);
  const opponentTitle = game && game.result !== "*" ? recordedOpponentName(game) : opponentName();
  const markAssisted = training.assisted;
  useEffect(() => {
    if (game && game.result === "*" && coaching) markAssisted(game.id);
  }, [game, coaching, markAssisted]);
  const ply = game
    ? selection?.gameId === game.id
      ? Math.min(selection.ply, game.moves.length)
      : game.moves.length
    : 0;
  const live = !!game && ply === game.moves.length;
  const board = useMemo(() => {
    const next = new Chess();
    for (const move of game?.moves.slice(0, ply) ?? []) next.move(move.san);
    return next;
  }, [game?.moves, ply]);
  const material = useMemo(() => materialSnapshot(board), [board]);
  const canPlay =
    !!game &&
    live &&
    game.result === "*" &&
    chess.turn() === playerTurn(game.playerColor) &&
    engine.status === "ready" &&
    !busy &&
    !play.storageError;
  const selectPly = useCallback(
    (next: number) => {
      if (!game) return;
      setSuggestion(null);
      setSelection(
        next >= game.moves.length
          ? null
          : { gameId: game.id, ply: Math.max(0, next) },
      );
    },
    [game],
  );
  const onArrow = useCallback(
    (fen: string, uci: string | null) => setSuggestion({ fen, uci }),
    [],
  );
  useEffect(() => {
    try {
      const enabled = localStorage.getItem("knightly_coaching_v1") === "on";
      queueMicrotask(() => setCoaching(enabled));
    } catch {}
  }, []);
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(
          (event.target as HTMLElement).tagName,
        )
      )
        return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        selectPly(ply - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        selectPly(ply + 1);
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [ply, selectPly]);
  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        coordinates:
          "Algebraic: a1 is White’s lower-left; files a–h, ranks 1–8.",
        fen: game?.fenFinal,
        displayedFen: board.fen(),
        turn: chess.turn(),
        legalMoves: chess.moves(),
        legalUci: chess
          .moves({ verbose: true })
          .map((move) => move.from + move.to + (move.promotion ?? "")),
        result: game?.result,
        ply: game?.moves.length,
        viewedPly: ply,
        live,
        engine: engine.status,
        busy,
        saved: !play.storageError,
        error: play.error || play.storageError,
        gameId: game?.id,
        playerColor: game?.playerColor,
        opponentElo: game?.engineElo ?? null,
        opponent: opponentTitle,
        humanStatus: engine.humanStatus,
        legacyLevel: game?.engineLevel,
        captured: material.captured,
        material: material.balance,
        coaching,
      });
    window.advanceTime = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [
    game,
    chess,
    board,
    ply,
    live,
    busy,
    engine.status,
    engine.humanStatus,
    opponentTitle,
    play.error,
    play.storageError,
    material,
    coaching,
  ]);
  if (!play.loaded) return <p>Opening your board…</p>;
  if (!game)
    return (
      <section className="panel">
        <h1>Library needs attention</h1>
        <p role="alert">{play.storageError}</p>
        <Link className="btn" href="/games">
          Open your games
        </Link>
      </section>
    );
  const you = playerTurn(game.playerColor),
    opponent = you === "w" ? "b" : "w";
  const status = !live
    ? `Viewing ${ply ? `${moveLabel(ply)} ${game.moves[ply - 1].san}` : "starting position"}`
    : game.result !== "*"
      ? chess.isCheckmate()
        ? `Checkmate · ${game.result}`
        : chess.isDraw()
          ? "Draw"
          : `Game ended · ${game.result}`
      : busy
        ? engine.humanStatus === "loading" ? "Loading Maia…" : `${opponentTitle} is thinking…`
        : chess.turn() !== you
          ? `${opponentTitle}’s turn is ready to continue`
          : chess.isCheck()
            ? "You are in check"
            : "Your turn";
  return (
    <section className="play-page">
      {game.result !== "*" && (
        <GameOverDialog key={game.id} game={game} chess={chess}
          saved={!play.storageError} busy={busy || engine.status !== "ready"}
          onNewGame={() => {
            setSelection(null);
            setSuggestion(null);
            void play.newGame(newColor ?? game.playerColor);
          }}
        />
      )}
      <header className="play-heading">
        <div>
          <h1>Play</h1>
          <span>Practice at your pace</span>
        </div>
        <div className="new-game-controls">
          <select
            className="field"
            aria-label="New game color"
            value={newColor ?? game.playerColor}
            disabled={busy}
            onChange={(event) => setNewColor(event.target.value as PlayerColor)}
          >
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
          <button
            className="btn"
            disabled={busy || !!play.storageError || engine.status !== "ready"}
            onClick={() => {
              if (
                !game.moves.length ||
                confirm("Start a new game? This game stays in your library.")
              ) {
                setSelection(null);
                setSuggestion(null);
                void play.newGame(newColor ?? game.playerColor);
              }
            }}
          >
            New game
          </button>
        </div>
      </header>
      <div className="play-layout">
        <div className="play-board-column">
          <div className="player-strip">
            <div className="player-mark">
              <IconChessKnight size={24} stroke={1.6} />
            </div>
            <div className="player-identity">
              <strong>{opponentTitle}</strong>
              <select
                className="opponent-rating"
                aria-label="Opponent approximate Elo"
                value={
                  training.settings.mode === "auto"
                    ? "auto"
                    : game.result !== "*"
                      ? (training.settings.manualElo ?? 800)
                      : (game.engineElo ?? "legacy")
                }
                disabled={busy || !!play.storageError}
                onChange={(event) => {
                  const value = event.target.value;
                  if (
                    training.chooseMode(
                      value === "auto" ? "auto" : "manual",
                      value === "auto" ? undefined : Number(value),
                    ) &&
                    value !== "auto"
                  )
                    play.changeElo(Number(value));
                }}
              >
                <option value="auto">
                  Auto ·{" "}
                  {`≈ ${game.engineElo ?? 800} Elo`}
                </option>
                {game.engineElo === undefined && (
                  <option value="legacy">
                    ≈ 800 Elo · resumed game
                  </option>
                )}
                {game.engineElo !== undefined &&
                  !ELO_PRESETS.includes(game.engineElo) && (
                    <option value={game.engineElo}>
                      ≈ {game.engineElo} Elo
                    </option>
                  )}
                {ELO_PRESETS.map((elo) => (
                  <option key={elo} value={elo}>
                    ≈ {elo} Elo
                  </option>
                ))}
              </select>
              <CapturedPieces
                by={opponent}
                pieces={material.captured[opponent]}
                balance={material.balance[opponent]}
              />
            </div>
            <span className="player-side">
              {opponent === "w" ? "White" : "Black"}
            </span>
          </div>
          <ChessBoard
            key={`${game.id}-${live ? "live" : "history"}-${!live ? ply : ""}`}
            fen={board.fen()}
            playerColor={game.playerColor}
            activeColor={board.turn() === "w" ? "white" : "black"}
            canInteract={canPlay}
            isMoveLegal={(from, to) =>
              canPlay && play.legalTargets(from).includes(to as never)
            }
            getLegalTargets={play.legalTargets}
            onMove={async (from, to, promotion) => {
              setSuggestion(null);
              return play.move(from, to, promotion);
            }}
            lastMove={game.moves[ply - 1]?.uci}
            suggestion={
              coaching && suggestion?.fen === board.fen()
                ? suggestion.uci
                : null
            }
          />
          <div className="player-strip player-strip-you">
            <span className={`side-marker ${game.playerColor}`} />
            <div className="player-identity">
              <strong>
                You <small>{colorName(game.playerColor)}</small>
              </strong>
              <CapturedPieces
                by={you}
                pieces={material.captured[you]}
                balance={material.balance[you]}
              />
            </div>
            <p role="status" className="turn-status">
              {status}
            </p>
          </div>
          <div className="play-history-controls" aria-label="Replay controls">
            <button
              className="icon-button"
              aria-label="Starting position"
              disabled={ply === 0}
              onClick={() => selectPly(0)}
            >
              <IconPlayerSkipBack size={19} />
            </button>
            <button
              className="icon-button"
              aria-label="Previous move"
              disabled={ply === 0}
              onClick={() => selectPly(ply - 1)}
            >
              <IconChevronLeft size={21} />
            </button>
            <button
              className={`history-live ${live ? "is-live" : ""}`}
              onClick={() => selectPly(game.moves.length)}
              disabled={live}
            >
              {live ? "Live position" : "Back to live"}
            </button>
            <button
              className="icon-button"
              aria-label="Next move"
              disabled={live}
              onClick={() => selectPly(ply + 1)}
            >
              <IconChevronRight size={21} />
            </button>
            <button
              className="icon-button"
              aria-label="Latest position"
              disabled={live}
              onClick={() => selectPly(game.moves.length)}
            >
              <IconPlayerSkipForward size={19} />
            </button>
          </div>
        </div>
        <aside className="play-sidebar">
          {(engine.status !== "ready" || play.error) && (
            <div className="engine-message">
              <p role="status">
                {engine.status === "loading"
                  ? "Loading Stockfish…"
                  : engine.error || play.error}
              </p>
              {engine.status !== "loading" && (
                <button className="btn secondary" onClick={engine.restart}>
                  Retry engine
                </button>
              )}
            </div>
          )}
          {engine.humanStatus === "loading" && (
            <p role="status" className="engine-message">Loading the human-style opponent for the first time. The model runs on your device.</p>
          )}
          {play.storageError && (
            <div className="engine-message" role="alert">
              <p>{play.storageError}</p>
              <Link href="/games">Open your games</Link>
            </div>
          )}
          {game.result === "*" && chess.turn() !== you && !busy && (
            <button
              className="btn mb-4 w-full"
              disabled={engine.status !== "ready" || !!play.storageError}
              onClick={() => void play.respond()}
            >
              Continue engine turn
            </button>
          )}
          <div className="game-notebook">
            <div className="notebook-heading">
              <h2>Moves</h2>
              <button
                className={`coaching-toggle ${coaching ? "enabled" : ""}`}
                aria-pressed={coaching}
                onClick={() => {
                  const next = !coaching;
                  setCoaching(next);
                  setSuggestion(null);
                  try {
                    localStorage.setItem(
                      "knightly_coaching_v1",
                      next ? "on" : "off",
                    );
                  } catch {}
                }}
              >
                <IconBulb size={17} />
                {coaching ? "Hide coaching" : "Show coaching"}
              </button>
            </div>
            <MoveList
              moves={game.moves}
              selectedPly={ply}
              onSelect={selectPly}
              showGrades={coaching}
            />
            <div className="notebook-bottom">
              <span>{game.result === "*" ? "No clock" : "Game finished"}</span>
              {game.result === "*" && game.moves.length > 0 && (
                <button
                  disabled={busy || !!play.storageError}
                  onClick={() => {
                    if (confirm("Resign this game? It stays in your library."))
                      play.resign();
                  }}
                >
                  <IconFlag size={14} />
                  Resign
                </button>
              )}
            </div>
          </div>
          {coaching && (
            <PlayCoach
              key={`${game.id}-${ply}`}
              game={game}
              board={board}
              ply={ply}
              analyze={engine.analyze}
              ready={engine.status === "ready" && !busy}
              onArrow={onArrow}
            />
          )}
          {game.moves.length > 0 && (
            <Link className="review-game-link" href={`/review/${game.id}`}>
              <span>
                <strong>Review this game</strong>
                <small>Replay moves and practice a decision</small>
              </span>
              <IconArrowRight size={18} />
            </Link>
          )}
          <section className="training-summary" aria-label="Your playing level">
            <span className="small-label">
              {training.profile.evidence.length
                ? "Your estimated level"
                : "Learning your level"}
            </span>
            <strong>
              {training.profile.evidence.length
                ? `≈ ${training.profile.range[0]}–${training.profile.range[1]} Elo`
                : "Start around 800"}
            </strong>
            <p>
              {training.profile.evidence.length
                ? `${training.profile.evidence.length} eligible finished ${training.profile.evidence.length === 1 ? "game" : "games"} · ${training.profile.provisional ? "early estimate" : "local playing estimate"}`
                : "Finish games without coaching to help set your next opponent."}
            </p>
            <p>
              {training.settings.mode === "auto"
                ? `Next new game: about ${training.profile.opponent} Elo. This game keeps its current difficulty.`
                : "Manual difficulty. Choose Auto above to match your next opponent to your results."}
            </p>
            {coaching && game.result === "*" && (
              <p>
                Coaching is on. This game can guide your study, but won’t change
                your level estimate.
              </p>
            )}
            {training.error && <p role="alert">{training.error}</p>}
            <Link href="/today" className="subtle-link">
              Today&apos;s training <IconArrowRight size={14} />
            </Link>
          </section>
          {game.result === "*" && game.engineElo === undefined && (
            <p className="difficulty-note">This older game resumes with Maia at about 800. Choose another rating above; the original moves stay saved.</p>
          )}
          <p className="difficulty-note">
            {opponentTitle === "Maia"
              ? "Maia predicts human moves at this Lichess rating. It is not a verified Chess.com rating."
              : "Difficulty is approximate, not a Chess.com rating."}{" "}
            <Link href="/about">How it works</Link>
          </p>
          <div className="play-save-note">
            <span>
              {play.storageError
                ? "Save needs attention"
                : "Saved in this browser"}
            </span>
            <Link href="/games">
              Your games
              <IconArrowRight size={13} />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
