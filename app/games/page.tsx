"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconSearch,
  IconUpload,
  IconArrowRight,
  IconArchive,
  IconChevronDown,
} from "@tabler/icons-react";
import { PositionPreview } from "@/components/library/PositionPreview";
import { Chess } from "chess.js";
import { colorName } from "@/lib/chess/player";
import type { SavedGame, PlayerColor } from "@/types/game";
import {
  getGameLocal,
  listGamesLocal,
  restorePrevious,
  saveGameLocal,
  setActiveGame,
} from "@/lib/storage/local-games";
import { importPgn, loadChess, recordGame } from "@/lib/chess/game-record";
export default function GamesPage() {
  const [games, setGames] = useState<SavedGame[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "finished">("all");
  const [sort, setSort] = useState("newest");
  const importRef = useRef<HTMLDetailsElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [recoveryNeeded, setRecoveryNeeded] = useState(false);
  const [notice, setNotice] = useState("");
  const [pgn, setPgn] = useState("");
  const [importColor, setImportColor] = useState<PlayerColor | "">("");
  const names = useMemo(() => {
    try {
      if (pgn.length > 200000) return {};
      const board = new Chess();
      board.loadPgn(pgn);
      return board.getHeaders();
    } catch {
      return {};
    }
  }, [pgn]);
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
  const filtered = games
    .filter(
      (game) =>
        (filter === "all" ||
          (filter === "active" ? game.result === "*" : game.result !== "*")) &&
        `${game.openingName} ${game.playerColor} ${game.pgn}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "oldest"
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt),
    );
  function openImport() {
    if (importRef.current) {
      importRef.current.open = true;
      importRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  return (
    <section className="archive-page">
      <header className="page-heading">
        <div>
          <h1>Your games</h1>
          <p>
            {games.length
              ? `${games.length} games saved in this browser.`
              : "Your played and imported games, all in one place."}
          </p>
        </div>
        <button className="btn" onClick={openImport}>
          <IconUpload size={16} />
          Import game
        </button>
      </header>
      {error && (
        <div role="alert" className="panel mb-5">
          <p>{error}</p>
          {recoveryNeeded && (
            <div className="flex flex-wrap gap-2 mt-4">
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
        <p role="status" className="archive-notice">
          {notice}
        </p>
      )}
      <div className="archive-toolbar">
        <label className="library-search">
          <IconSearch size={17} />
          <input
            aria-label="Search saved games"
            placeholder="Search an opening, player, or side"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          className="field"
          aria-label="Sort games"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      <div className="archive-filter-row">
        <div className="segmented" aria-label="Filter games">
          {[
            ["all", "All games"],
            ["active", "In progress"],
            ["finished", "Finished"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value as typeof filter)}
            >
              {label}
            </button>
          ))}
        </div>
        <span>
          {filtered.length} {filtered.length === 1 ? "game" : "games"}
        </span>
      </div>
      <div className="game-archive">
        {!ready ? (
          <p role="status" className="panel">
            Loading your games…
          </p>
        ) : !filtered.length ? (
          <div className="empty-state">
            <IconArchive size={30} stroke={1.4} />
            <h2>{games.length ? "No matching games" : "No games saved yet"}</h2>
            <p>
              {games.length
                ? "Try a different search or filter."
                : "Play against the engine or import a PGN. Your games will appear here with their final positions."}
            </p>
            {games.length ? (
              <button
                className="btn secondary"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Show all games
              </button>
            ) : (
              <Link href="/play" className="btn">
                Play a game
                <IconArrowRight size={16} />
              </Link>
            )}
          </div>
        ) : (
          filtered.map((game) => {
            const win =
                game.result === (game.playerColor === "white" ? "1-0" : "0-1"),
              draw = game.result === "1/2-1/2";
            return (
              <article className="archive-game" key={game.id}>
                <Link
                  href={`/review/${game.id}`}
                  aria-label={`Review ${game.openingName}`}
                >
                  <PositionPreview
                    fen={game.fenFinal}
                    color={game.playerColor}
                  />
                </Link>
                <div className="archive-game-info">
                  <span className="small-label">
                    {new Date(game.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <Link href={`/review/${game.id}`}>
                    <h2>
                      {game.openingName === "Unknown Opening"
                        ? "Practice game"
                        : game.openingName}
                    </h2>
                  </Link>
                  <p>
                    {colorName(game.playerColor)}{" "}
                    <span>{Math.ceil(game.moves.length / 2)} moves</span>
                  </p>
                </div>
                <div className="archive-result">
                  <strong
                    className={
                      game.result === "*" ? "" : win ? "result-win" : ""
                    }
                  >
                    {game.result === "*"
                      ? "In progress"
                      : draw
                        ? "Draw"
                        : win
                          ? "Win"
                          : "Loss"}
                  </strong>
                  <span>
                    {game.result === "*" ? "Unfinished" : game.result}
                  </span>
                </div>
                <div className="archive-actions">
                  {game.result === "*" && (
                    <Link
                      className="btn secondary"
                      href="/play"
                      onClick={() => setActiveGame(game.id)}
                    >
                      Resume
                    </Link>
                  )}
                  <Link className="btn secondary" href={`/review/${game.id}`}>
                    Replay &amp; review
                    <IconArrowRight size={15} />
                  </Link>
                  <details className="game-side-details">
                    <summary aria-label={`Options for ${game.id}`}>
                      <IconChevronDown size={17} />
                    </summary>
                    <label>
                      Your side
                      <select
                        className="field"
                        aria-label={`Your side for ${game.id}`}
                        value={game.playerColor}
                        onChange={(event) =>
                          act(() => {
                            const color = event.target.value as PlayerColor;
                            if (
                              !confirm(
                                `Change your side to ${colorName(color)}? Coaching will use only that side’s decisions. The complete game stays unchanged.`,
                              )
                            )
                              return;
                            if (
                              getGameLocal(game.id)?.updatedAt !==
                              game.updatedAt
                            )
                              throw Error(
                                "This game changed in another tab. Reload before changing your side.",
                              );
                            saveGameLocal(
                              recordGame(
                                loadChess(game),
                                game,
                                game.moves,
                                game.result,
                                color,
                              ),
                            );
                            refresh();
                            setNotice(
                              `Player side updated to ${colorName(color)}.`,
                            );
                          })
                        }
                      >
                        <option value="white">White</option>
                        <option value="black">Black</option>
                      </select>
                    </label>
                  </details>
                </div>
              </article>
            );
          })
        )}
      </div>
      <div className="archive-utilities">
        <details ref={importRef} className="panel" id="import-pgn">
          <summary>
            <IconUpload size={18} />
            Bring a game from PGN
          </summary>
          <p className="mt-4 text-sm text-zinc-400">
            Paste a standard-start game, then choose the side you played.
          </p>
          <textarea
            aria-label="PGN to import"
            className="field mt-4 min-h-36 w-full"
            placeholder="1. e4 e5 2. Nf3 Nc6 *"
            value={pgn}
            onChange={(event) => {
              setPgn(event.target.value);
              setImportColor("");
            }}
          />
          <label className="block mt-3 text-sm">
            Your side
            <select
              aria-label="Your side in imported game"
              className="field mt-2 w-full"
              value={importColor}
              onChange={(event) =>
                setImportColor(event.target.value as PlayerColor)
              }
            >
              <option value="">Choose your side</option>
              <option value="white">
                White
                {names.White && names.White !== "?" ? ` · ${names.White}` : ""}
              </option>
              <option value="black">
                Black
                {names.Black && names.Black !== "?" ? ` · ${names.Black}` : ""}
              </option>
            </select>
          </label>
          <button
            className="btn mt-4"
            disabled={!pgn.trim() || !importColor}
            onClick={() =>
              act(() => {
                if (!importColor)
                  throw Error("Choose the side you played first.");
                const imported = importPgn(pgn, importColor);
                saveGameLocal(imported);
                setPgn("");
                setImportColor("");
                refresh();
                setNotice(
                  "PGN imported. Replay the game or open Game practice to scan your decisions.",
                );
              })
            }
          >
            Import PGN
          </button>
        </details>

      </div>
    </section>
  );
}
