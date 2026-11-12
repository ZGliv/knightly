"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GuessTheMove } from "./GuessTheMove";
import { fullMoves, groupGames, parseGamesFile, prosIn, shortName, type MasterGame } from "@/lib/masters/games";
import { STRUCTURES } from "@/lib/masters/structure";
import { emptyRecord, loadRecord, type MastersRecord } from "@/lib/masters/storage";

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; games: MasterGame[] };

export function MastersPage() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [coachAvailable, setCoachAvailable] = useState(false);
  const [record, setRecord] = useState<MastersRecord>(emptyRecord);
  const [pro, setPro] = useState<string | null>(null);
  const [active, setActive] = useState<{ id: string; run: number } | null>(null);

  useEffect(() => {
    let live = true;
    queueMicrotask(() => {
      if (live) setRecord(loadRecord());
    });
    fetch("/masters/games.json")
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data) => {
        if (live) setLoad({ status: "ready", games: parseGamesFile(data) });
      })
      .catch(() => {
        if (live) setLoad({ status: "error", message: "The games could not be loaded. Check your connection and reload." });
      });
    fetch("/api/coach")
      .then((res) => (res.ok ? res.json() : { available: false }))
      .then((data: { available?: boolean }) => {
        if (live) setCoachAvailable(data.available === true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const games = useMemo(() => (load.status === "ready" ? load.games : []), [load]);
  const groups = useMemo(() => groupGames(games, pro), [games, pro]);
  const pros = useMemo(() => prosIn(games), [games]);
  const activeGame = active ? games.find((g) => g.id === active.id) : undefined;

  const open = (id: string) => {
    setActive({ id, run: 0 });
    window.scrollTo({ top: 0 });
  };
  const onRecord = useCallback((next: MastersRecord) => setRecord(next), []);

  if (activeGame && active)
    return (
      <GuessTheMove
        key={`${active.id}-${active.run}`}
        game={activeGame}
        record={record}
        coachAvailable={coachAvailable}
        onRecord={onRecord}
        onBack={() => setActive(null)}
        onRestart={() => setActive({ id: active.id, run: active.run + 1 })}
      />
    );

  return (
    <section className="masters-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Learn from the best</p>
          <h1>Play like the pros</h1>
          <p>
            Step into real classical games by Magnus Carlsen and Hikaru Nakamura and guess their moves. Games are
            grouped by the kind of middlegame, so you learn the plans that go with each structure.
          </p>
        </div>
      </header>

      {load.status === "loading" && <p className="masters-muted">Loading games…</p>}
      {load.status === "error" && (
        <p className="masters-error" role="alert">
          {load.message}
        </p>
      )}

      {load.status === "ready" && (
        <>
          <div className="masters-filter" role="group" aria-label="Filter by player">
            <button type="button" aria-pressed={pro === null} onClick={() => setPro(null)}>
              All players <span>{games.length}</span>
            </button>
            {pros.map((name) => (
              <button key={name} type="button" aria-pressed={pro === name} onClick={() => setPro(name)}>
                {name} <span>{games.filter((g) => g.pro === name).length}</span>
              </button>
            ))}
          </div>

          {groups.map(({ group, games: list }) => {
            const info = STRUCTURES[group];
            return (
              <section key={group} className="masters-group" aria-labelledby={`group-${group}`}>
                <div className="masters-group-head">
                  <h2 id={`group-${group}`}>
                    {info.name} <span>{list.length}</span>
                  </h2>
                  <p>{info.summary}</p>
                  <details>
                    <summary>Usual plans</summary>
                    <dl>
                      {info.plans.map((plan) => (
                        <div key={plan.side}>
                          <dt>{plan.side}</dt>
                          <dd>{plan.text}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </div>
                <ul className="masters-cards">
                  {list.map((game) => {
                    const saved = record.games[game.id];
                    return (
                      <li key={game.id}>
                        <button type="button" className="masters-card" onClick={() => open(game.id)}>
                          <span className="masters-card-players">
                            {shortName(game.white)} – {shortName(game.black)}
                            <em>{game.result}</em>
                          </span>
                          <span className="masters-card-meta">
                            {game.event.replace(/\s*\d{4}$/, "")} · {game.year} · {fullMoves(game)} moves
                          </span>
                          {game.opening && <span className="masters-card-opening">{game.opening}</span>}
                          <span className="masters-card-foot">
                            <span>
                              Play as {game.proSide === "white" ? "White" : "Black"} ({shortName(game.pro)})
                            </span>
                            {saved && (
                              <span className="masters-card-best">
                                Best {saved.best}/{saved.max}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          <p className="masters-muted masters-source">
            Games from Lichess broadcasts of classical over-the-board events (Norway Chess, Candidates, World Cup,
            Tata Steel, TePe Sigeman). Middlegame types are detected automatically from the position after move 15.
          </p>
        </>
      )}
    </section>
  );
}
