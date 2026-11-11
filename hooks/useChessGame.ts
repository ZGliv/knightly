"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { SavedGame, PlayerColor } from "@/types/game";
import { isPlayerPly, playerTurn } from "@/lib/chess/player";
import { loadChess, recordGame } from "@/lib/chess/game-record";
import {
  listGamesLocal,
  getActiveGame,
  getGameLocal,
  saveGameLocal,
  setActiveGame,
} from "@/lib/storage/local-games";
import {
  estimateLevel,
  readAssistedGames,
  readTraining,
} from "@/lib/learning/adaptive-rating";
import { DEFAULT_ELO, HUMAN_POLICY, continueWithMaia, opponentName } from "@/lib/engine/strength";
import { analyzeMove, type Analyze } from "@/lib/chess/analyze-move";

function newTrainingGame(elo: number, color: PlayerColor = "white"): SavedGame {
  const chess = new Chess();
  chess.setHeader(color === "white" ? "Black" : "White", opponentName());
  return {
    ...recordGame(chess, undefined, [], undefined, color), engineElo: elo,
    training: {origin:"engine",initialElo:elo,changed:false,policy:HUMAN_POLICY},
  };
}

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
        let saved = getActiveGame();
        if (!saved) {
          const settings = readTraining();
          const elo =
            settings.mode === "auto"
              ? estimateLevel(
                  listGamesLocal(),
                  readAssistedGames(),
                  settings.seed,
                ).opponent
              : (settings.manualElo ?? DEFAULT_ELO);
          saved = newTrainingGame(elo);
        }
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
    if (!start || flight.current) return;
    const chess = loadChess(start);
    if (
      chess.turn() === playerTurn(start.playerColor) ||
      (start.result !== "*" && !chess.isGameOver())
    )
      return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      let annotations = start.moves;
      const last = annotations.at(-1);
      if (last && isPlayerPly(last.ply, start.playerColor) && !last.coachText) {
        const prior = new Chess();
        for (const move of annotations.slice(0, -1)) prior.move(move.san);
        const analyzed = await analyzeMove(
          prior.fen(),
          last,
          analyze,
          annotations.slice(0, -1).map((m) => m.uci),
        );
        annotations = [...annotations.slice(0, -1), analyzed];
        if (!alive.current || current.current?.id !== start.id) return;
        if (!commit(recordGame(chess, current.current, annotations))) return;
      }
      if (chess.isGameOver()) return;
      const reply = await analyze(
        chess.fen(),
        { elo: start.engineElo ?? DEFAULT_ELO },
        start.moves.map((m) => m.uci),
      );
      if (!alive.current || current.current?.id !== start.id) return;
      chess.move({
        from: reply.bestMove.slice(0, 2),
        to: reply.bestMove.slice(2, 4),
        promotion: reply.bestMove[4],
      });
      commit(recordGame(chess, continueWithMaia(current.current!), annotations));
    } catch (e) {
      if (alive.current)
        setError(
          (e as Error).message +
            " Your position is saved. Retry the engine, then continue its turn.",
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
    if (chess.turn() !== playerTurn(start.playerColor)) return false;
    try {
      chess.move({ from, to, promotion });
    } catch {
      return false;
    }
    const saved = commit(recordGame(chess, start, start.moves));
    if (saved) await respond();
    return true;
  }
  async function newGame(playerColor: PlayerColor) {
    if (flight.current) return;
    let elo = current.current?.engineElo ?? DEFAULT_ELO;
    try {
      const settings = readTraining();
      if (settings.mode === "auto")
        elo = estimateLevel(
          listGamesLocal(),
          readAssistedGames(),
          settings.seed,
        ).opponent;
      else elo = settings.manualElo ?? elo;
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const next = newTrainingGame(elo, playerColor);
    const saved = commit(next);
    setError("");
    if (saved && playerColor === "black") await respond();
  }
  function resign() {
    const start = current.current;
    if (!start || flight.current || start.result !== "*") return;
    commit(
      recordGame(
        loadChess(start),
        start,
        start.moves,
        start.playerColor === "white" ? "0-1" : "1-0",
      ),
    );
  }
  function changeElo(elo: number) {
    if (
      current.current &&
      current.current.result === "*" &&
      !flight.current &&
      Number.isInteger(elo) &&
      elo >= 400 &&
      elo <= 3190
    )
      commit({
        ...current.current,
        engineElo: elo,
        ...(current.current.training
          ? {
              training: {
                ...current.current.training,
                initialElo: current.current.moves.length
                  ? current.current.training.initialElo
                  : elo,
                changed:
                  current.current.training.changed ||
                  (current.current.moves.length > 0 &&
                    current.current.engineElo !== elo),
              },
            }
          : {}),
        updatedAt: new Date().toISOString(),
      });
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
    changeElo,
    legalTargets,
  };
}
