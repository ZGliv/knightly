"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlayerColor } from "@/types/game";
import { openInsightsStore } from "@/lib/insights/store";
import type { ImportedGame } from "@/lib/insights/types";
import { EMPTY_REPERTOIRE, preparedCount, type RepertoireData } from "@/lib/openings/repertoire";
import { loadRepertoire, saveRepertoire } from "@/lib/openings/storage";
import { buildTree } from "@/lib/openings/tree";
import { Drill } from "./Drill";
import { Explorer } from "./Explorer";
import { plural, type PathStep } from "./shared";

type Load = { status: "loading" } | { status: "ready"; games: ImportedGame[] } | { status: "error"; message: string };
type View = "explore" | "drill";

export function OpeningsPage() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [data, setData] = useState<RepertoireData>(EMPTY_REPERTOIRE);
  const [saveFailed, setSaveFailed] = useState(false);
  const [color, setColor] = useState<PlayerColor>("white");
  const [view, setView] = useState<View>("explore");
  const [paths, setPaths] = useState<Record<PlayerColor, PathStep[]>>({ white: [], black: [] });

  useEffect(() => {
    let alive = true;
    queueMicrotask(async () => {
      if (!alive) return;
      setData(loadRepertoire());
      try {
        const store = await openInsightsStore();
        try {
          const games = await store.listGames();
          if (!alive) return;
          setLoad({ status: "ready", games });
          // Start on the colour he has more games with.
          const black = games.filter((g) => g.userColor === "black").length;
          if (black > games.length - black) setColor("black");
        } finally {
          store.close();
        }
      } catch (e) {
        if (alive)
          setLoad({
            status: "error",
            message: e instanceof Error && e.message ? e.message : "Your imported games could not be read.",
          });
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const games = load.status === "ready" ? load.games : null;
  const tree = useMemo(() => (games ? buildTree(games, color) : null), [games, color]);

  const update = useCallback((next: RepertoireData) => {
    setData(next);
    setSaveFailed(!saveRepertoire(next));
  }, []);

  const setPath = useCallback((path: PathStep[]) => setPaths((prior) => ({ ...prior, [color]: path })), [color]);

  return (
    <div className="op-page">
      <header className="op-header">
        <h1>Your openings</h1>
        <p>
          See what you really play in the first 12 moves of your games, settle on one move for every position
          (your <em>repertoire</em>: the set of moves you have decided to play), then drill it against the
          replies your real opponents chose.
        </p>
      </header>

      {load.status === "loading" && <p className="op-note">Reading your imported games…</p>}

      {load.status === "error" && (
        <div className="op-empty">
          <p>{load.message}</p>
          <Link className="btn secondary" href="/games/insights">
            Go to Your leaks
          </Link>
        </div>
      )}

      {load.status === "ready" && load.games.length === 0 && (
        <div className="op-empty">
          <h2 className="op-h2">No games imported yet</h2>
          <p className="op-note">
            This trainer is built from your own games. Import your chess.com games first, then come back here.
          </p>
          <Link className="btn" href="/games/insights">
            Import your games
          </Link>
        </div>
      )}

      {tree && load.status === "ready" && load.games.length > 0 && (
        <>
          <div className="op-toolbar">
            <div className="op-segment" role="tablist" aria-label="Colour">
              {(["white", "black"] as const).map((c) => (
                <button key={c} role="tab" aria-selected={color === c} className={color === c ? "is-on" : ""} onClick={() => setColor(c)}>
                  As {c === "white" ? "White" : "Black"}
                </button>
              ))}
            </div>
            <div className="op-segment" role="tablist" aria-label="Mode">
              {(["explore", "drill"] as const).map((v) => (
                <button key={v} role="tab" aria-selected={view === v} className={view === v ? "is-on" : ""} onClick={() => setView(v)}>
                  {v === "explore" ? "Explore" : "Drill"}
                </button>
              ))}
            </div>
          </div>
          <p className="op-note op-counts">
            {plural(tree.games, "game")} as {color === "white" ? "White" : "Black"} ·{" "}
            {plural(preparedCount(data, color), "prepared move")}
            {" · "}The same position reached by a different move order (a transposition) counts as one.
          </p>
          {saveFailed && (
            <p className="op-warn" role="alert">
              This browser is not letting the app save your repertoire. Changes will be lost when the page closes.
            </p>
          )}

          {view === "explore" ? (
            <Explorer
              key={color}
              tree={tree}
              color={color}
              data={data}
              onChange={update}
              path={paths[color]}
              onPath={setPath}
            />
          ) : (
            <Drill
              key={color}
              tree={tree}
              color={color}
              data={data}
              onChange={update}
              onExplore={(path) => {
                setPath(path);
                setView("explore");
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
