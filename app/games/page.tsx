"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SavedGame } from "@/types/game";
import {
  downloadFile,
  exportGames,
  importGames,
  listGamesLocal,
  rawBackup,
  restorePrevious,
  saveGameLocal,
  setActiveGame,
} from "@/lib/storage/local-games";
import { importPgn } from "@/lib/chess/game-record";
export default function GamesPage() {
  const [games, setGames] = useState<SavedGame[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [recoveryNeeded, setRecoveryNeeded] = useState(false);
  const [notice, setNotice] = useState("");
  const [pgn, setPgn] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  function refresh() {
    try {
      setGames(listGamesLocal());
      setError("");
      setRecoveryNeeded(false);
    } catch (e) {
      setError((e as Error).message);
      setRecoveryNeeded(true);
    }
    setReady(true);
  }
  useEffect(() => {
    queueMicrotask(refresh);
  }, []);
  const act = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your practice, kept close</p>
          <h1 className="mt-2 text-3xl font-semibold">Game library</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Resume a board. Revisit a decision. Take your games with you.
          </p>
        </div>
        <Link className="btn" href="/play">
          Open board
        </Link>
      </div>
      {error && (
        <div role="alert" className="panel space-y-3 text-amber-200">
          <p>{error}</p>
          {recoveryNeeded && (
            <div className="flex flex-wrap gap-2">
              <button
                className="btn secondary"
                onClick={() =>
                  act(() =>
                    downloadFile("buddymine-raw-recovery.json", rawBackup()),
                  )
                }
              >
                Download raw backup
              </button>
              <button
                className="btn secondary"
                onClick={() =>
                  act(() => {
                    if (
                      confirm(
                        "Restore the previous browser snapshot? The current raw library will also be preserved for recovery.",
                      )
                    ) {
                      restorePrevious();
                      refresh();
                      setNotice("Previous browser snapshot restored.");
                    }
                  })
                }
              >
                Restore previous snapshot
              </button>
            </div>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="text-sm text-indigo-200">
          {notice}
        </p>
      )}
      <div className="panel space-y-3">
        <h2 className="font-semibold">Keep a backup</h2>
        <p className="text-sm leading-6 text-zinc-400">
          Games stay on this device, in this browser. Export before clearing
          browser data or switching devices. Import merges new games; existing
          game IDs are kept unchanged.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn secondary"
            disabled={!ready}
            onClick={() =>
              act(() => downloadFile("buddymine-backup.json", exportGames()))
            }
          >
            Export all games
          </button>
          <button
            className="btn secondary"
            onClick={() => fileRef.current?.click()}
          >
            Import backup
          </button>
          <input
            type="file"
            accept=".json,application/json"
            aria-label="Import game backup"
            className="sr-only"
            ref={fileRef}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 8000000)
                  throw new Error("Backup is too large (8 MB maximum).");
                const count = importGames(await file.text());
                refresh();
                setNotice(
                  `${count} game${count === 1 ? "" : "s"} imported. Existing games were preserved.`,
                );
              } catch (e) {
                setError((e as Error).message);
              }
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <div className="space-y-3">
        {!ready ? (
          <p>Loading your library…</p>
        ) : !games.length && !error ? (
          <div className="panel">
            <h2 className="font-semibold">Your first game belongs here.</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Play a move to start an autosaved game, or bring a PGN below.
            </p>
          </div>
        ) : (
          games.map((game) => (
            <article
              className="panel flex flex-wrap items-center justify-between gap-4"
              key={game.id}
            >
              <div>
                <p className="eyebrow">
                  {game.result === "*"
                    ? "In progress"
                    : game.result === "1/2-1/2"
                      ? "Draw"
                      : `Result ${game.result}`}
                </p>
                <h2 className="mt-2 font-semibold">
                  {game.openingName === "Unknown Opening"
                    ? "Practice game"
                    : game.openingName}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {Math.ceil(game.moves.length / 2)} moves ·{" "}
                  {new Date(game.createdAt).toLocaleDateString()} · Skill{" "}
                  {game.engineLevel}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {game.result === "*" && (
                  <Link
                    href="/play"
                    className="btn"
                    onClick={() => setActiveGame(game.id)}
                  >
                    Resume
                  </Link>
                )}
                <Link href={`/review/${game.id}`} className="btn secondary">
                  Replay & review
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
      <details className="panel">
        <summary className="cursor-pointer font-semibold">
          Bring a game from PGN
        </summary>
        <p className="mt-3 text-sm text-zinc-400">
          Paste one standard-start game. Moves are checked for legality.
          Imported games have no engine grades until you analyze a move in the
          replay.
        </p>
        <textarea
          aria-label="PGN to import"
          className="field mt-3 min-h-36 w-full"
          placeholder="1. e4 e5 2. Nf3 Nc6 *"
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
        />
        <button
          className="btn mt-3"
          disabled={!pgn.trim()}
          onClick={() =>
            act(() => {
              const imported = importPgn(pgn);
              saveGameLocal(imported);
              setPgn("");
              refresh();
              setNotice(
                "PGN imported. Open its replay to analyze individual moves.",
              );
            })
          }
        >
          Import PGN
        </button>
      </details>
    </section>
  );
}
