"use client";
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { PlayerColor } from "@/types/game";
import { StockfishClient } from "@/lib/engine/stockfish-client";
import { whiteEvaluation } from "@/lib/learning/coach/model";
import { checkMove, CHECK_NODES, verdictText, type MoveCheck } from "@/lib/openings/check";
import { playUci } from "@/lib/openings/repertoire";

interface Props {
  /** Position before the move. */
  fen: string;
  /** Moves (UCI) from the start position to `fen`. */
  history: string[];
  move: { uci: string; san: string };
  color: PlayerColor;
  /** The move is the one he plays most often here. */
  habitual: boolean;
}

type State =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; check: MoveCheck; bestSan: string | null; text: string }
  | { status: "error"; message: string };

/**
 * Runs Stockfish on the position before and after one move, at a fixed node budget, and says how
 * much winning chance the move gives away. Mounted per position and move; the engine is ended on unmount.
 */
export function EngineCheck({ fen, history, move, color, habitual }: Props) {
  const [state, setState] = useState<State>({ status: "idle" });
  const engines = useRef(new Set<StockfishClient>());
  const alive = useRef(true);

  useEffect(() => {
    const running = engines.current;
    alive.current = true;
    return () => {
      alive.current = false;
      for (const client of running) client.terminate();
      running.clear();
    };
  }, []);

  async function run() {
    setState({ status: "running" });
    const client = new StockfishClient();
    engines.current.add(client);
    try {
      await client.init();
      const limit = { nodes: CHECK_NODES };
      const before = await client.analyzePosition(fen, 20, history, limit);
      const after = await client.analyzePosition("", 20, [...history, move.uci], limit);
      const afterFen = playUci(fen, move.uci)?.fen;
      if (!afterFen) throw new Error("That move is not legal in this position.");
      const check = checkMove(whiteEvaluation(new Chess(fen), before), whiteEvaluation(new Chess(afterFen), after), color);
      const bestSan = before.bestMove ? (playUci(fen, before.bestMove)?.san ?? null) : null;
      if (alive.current) setState({ status: "done", check, bestSan, text: verdictText(check, move.san, bestSan, habitual) });
    } catch (e) {
      if (alive.current)
        setState({
          status: "error",
          message: e instanceof Error && e.message ? e.message : "The engine could not finish this check.",
        });
    } finally {
      engines.current.delete(client);
      client.terminate();
    }
  }

  return (
    <div className="op-check" aria-live="polite">
      {state.status === "idle" && (
        <button className="btn secondary" onClick={run}>
          Check {move.san} with the engine
        </button>
      )}
      {state.status === "running" && <p className="op-note">Stockfish is checking {move.san}…</p>}
      {state.status === "error" && (
        <>
          <p className="op-warn">{state.message}</p>
          <button className="btn secondary" onClick={run}>
            Try the check again
          </button>
        </>
      )}
      {state.status === "done" && (
        <div className={`op-verdict ${state.check.verdict === "mistake" || state.check.verdict === "blunder" ? "is-bad" : ""}`}>
          <p className="op-verdict-text">{state.text}</p>
          <p className="op-note">
            Your winning chances: {Math.round(state.check.before)}% with the best move,{" "}
            {Math.round(state.check.after)}% after {move.san}. Winning chances put the engine&apos;s score on a
            0–100 scale: 50 is level, 100 is a certain win. Losing 10 or more points in one move is a mistake.
          </p>
        </div>
      )}
    </div>
  );
}
