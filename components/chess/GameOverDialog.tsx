"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconChessKing, IconX } from "@tabler/icons-react";
import type { Chess } from "chess.js";
import type { SavedGame } from "@/types/game";
import { recordedOpponentName } from "@/lib/engine/strength";
import { gameOutcome } from "@/lib/chess/game-outcome";

export function GameOverDialog({ game, chess, saved, busy, onNewGame }: {
  game: SavedGame;
  chess: Chess;
  saved: boolean;
  busy: boolean;
  onNewGame: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const outcome = gameOutcome(game, chess);
  useEffect(() => {
    const element = dialog.current;
    if (!dismissed) element?.showModal();
    return () => element?.close();
  }, [dismissed]);
  const dismiss = () => { dialog.current?.close(); setDismissed(true); };
  if (dismissed) return null;
  return (
    <dialog ref={dialog} className="game-result-dialog" aria-labelledby="game-result-title"
      aria-describedby="game-result-description" onCancel={dismiss}>
      <button className="icon-button result-close" aria-label="Close game result" onClick={dismiss} autoFocus>
        <IconX size={20} />
      </button>
      <IconChessKing className="result-king" size={48} stroke={1.5} />
      <h2 id="game-result-title">{outcome.title}</h2>
      <p id="game-result-description">{outcome.reason} · {game.result}</p>
      <div className="result-players">
        <span>You <small>{game.playerColor === "white" ? "White" : "Black"}</small></span>
        <span>{recordedOpponentName(game)} <small>{game.engineElo ? `≈ ${game.engineElo} difficulty` : `Level ${game.engineLevel}`}</small></span>
      </div>
      {!saved && <p role="alert">This result could not be saved. Keep this page open and check the save message.</p>}
      <div className="result-actions">
        {saved && <Link className="btn" href={`/review/${game.id}`}>Review game</Link>}
        <button className="btn secondary" disabled={busy || !saved} onClick={onNewGame}>Play again</button>
        <button className="subtle-link" onClick={dismiss}>View final board</button>
      </div>
    </dialog>
  );
}
