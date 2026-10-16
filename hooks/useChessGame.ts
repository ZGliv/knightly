"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { SavedGame } from "@/types/game";
import { loadChess, recordGame } from "@/lib/chess/game-record";
import {
  getActiveGame,
  getGameLocal,
  saveGameLocal,
  setActiveGame,
} from "@/lib/storage/local-games";
import { analyzeMove, type Analyze } from "@/lib/chess/analyze-move";

export function useChessGame(analyze: Analyze) {
  const [game, setGame] = useState<SavedGame | null>(null);
  const current = useRef<SavedGame | null>(null);
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const alive = useRef(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    alive.current = true;
    // Browser-only initialization keeps the server and hydration render identical.
    queueMicrotask(() => {
      if (!alive.current) return;
      try {
        const saved = getActiveGame() ?? recordGame(new Chess());
        current.current = saved;
        setGame(saved);
      } catch (e) {
        setStorageError((e as Error).message);
      }
      setLoaded(true);
    });
    return () => {
      alive.current = false;
    };
  }, []);
  const commit = useCallback((next: SavedGame) => {
    const old = current.current;
    let saved = true;
    try {
      const disk = getGameLocal(next.id);
      if (disk && old?.id === disk.id && disk.updatedAt !== old.updatedAt)
        throw new Error(
          "This game changed in another tab. Reload to use the latest saved position.",
        );
      saveGameLocal(next);
      setActiveGame(next.id);
      setStorageError("");
    } catch (e) {
      saved = false;
      setStorageError((e as Error).message);
    }
    current.current = next;
    setGame(next);
    return saved;
  }, []);
  async function respond() {
    const start = current.current;
    if (!start || flight.current || start.result !== "*") return;
    const chess = loadChess(start);
    if (chess.turn() !== "b" || chess.isGameOver()) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      let annotations = start.moves;
      const last = annotations.at(-1);
      if (last && !last.coachText) {
        const prior = new Chess();
        for (const move of annotations.slice(0, -1)) prior.move(move.san);
        const analyzed = await analyzeMove(prior.fen(), last, analyze);
        annotations = [...annotations.slice(0, -1), analyzed];
        if (!alive.current || current.current?.id !== start.id) return;
        if (!commit(recordGame(chess, current.current, annotations))) return;
      }
      const reply = await analyze(chess.fen(), start.engineLevel);
      if (!alive.current || current.current?.id !== start.id) return;
      chess.move({
        from: reply.bestMove.slice(0, 2),
        to: reply.bestMove.slice(2, 4),
        promotion: reply.bestMove[4],
      });
      commit(recordGame(chess, current.current, annotations));
    } catch (e) {
      if (alive.current)
        setError(
          (e as Error).message +
            " Your move is saved. Retry the engine, then continue its turn.",
        );
    } finally {
      flight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function move(from: string, to: string, promotion = "q") {
    const start = current.current;
    if (!start || flight.current || start.result !== "*" || storageError)
      return false;
    const chess = loadChess(start);
    if (chess.turn() !== "w") return false;
    try {
      chess.move({ from, to, promotion });
    } catch {
      return false;
    }
    const saved = commit(recordGame(chess, start, start.moves));
    if (saved && !chess.isGameOver()) await respond();
    return true;
  }
  function newGame() {
    if (flight.current) return;
    const next = recordGame(new Chess());
    commit(next);
    setError("");
  }
  function resign() {
    const start = current.current;
    if (!start || flight.current || start.result !== "*") return;
    commit(recordGame(loadChess(start), start, start.moves, "0-1"));
  }
  function changeLevel(level: number) {
    if (current.current && !flight.current)
      commit({
        ...current.current,
        engineLevel: level,
        updatedAt: new Date().toISOString(),
      });
  }
  const chess = game ? loadChess(game) : new Chess();
  const legalTargets = (from: string) =>
    chess.moves({ square: from as Square, verbose: true }).map((m) => m.to);
  return {
    game,
    chess,
    loaded,
    busy,
    error,
    storageError,
    move,
    respond,
    newGame,
    resign,
    changeLevel,
    legalTargets,
  };
}
