import { Chess } from "chess.js";
import type { EngineAnalysis } from "@/lib/engine/stockfish-client";
import { applyUci, whiteEvaluation, type Evaluation } from "@/lib/learning/coach/model";
import { replayGame } from "./replay";
import { ANALYSIS_NODES, ANALYSIS_VERSION, type GameAnalysis, type ImportedGame } from "./types";

/** Searches the position reached by playing `history` (UCI) from the standard start. */
export type PositionSearch = (history: string[], limit: { nodes: number }) => Promise<EngineAnalysis>;

const MAX_LINE = 8;

function abortError() {
  const error = new Error("Game analysis was cancelled.");
  error.name = "AbortError";
  return error;
}

/** The legal prefix of the engine's line, starting with its best move, at most MAX_LINE plies. */
function legalPrefix(fen: string, best: string, pv: string[]) {
  const moves = pv[0] === best ? pv : [best];
  const chess = new Chess(fen);
  const line: string[] = [];
  for (const value of moves.slice(0, MAX_LINE)) {
    try {
      applyUci(chess, value);
    } catch {
      break;
    }
    line.push(value);
  }
  return line;
}

function isLegal(chess: Chess, value: string) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value)) return false;
  return chess.moves({ verbose: true }).some(
    (move) => move.from + move.to + (move.promotion ?? "") === value,
  );
}

/**
 * Analyses every position of a game once with a fixed node budget: plies + 1 searches, minus a
 * final position where the game is already over (its value is exact). Results are White-relative.
 */
export async function analyseGame(
  game: ImportedGame,
  search: PositionSearch,
  options: { nodes?: number; isCancelled?: () => boolean; onPosition?: (done: number, total: number) => void } = {},
): Promise<GameAnalysis> {
  const nodes = options.nodes ?? ANALYSIS_NODES;
  const { ucis, fens } = replayGame(game.pgn);
  // One board walked forward keeps the move history, so repetition draws are recognised too.
  const chess = new Chess();
  // The engine is sent "startpos + moves", so a game set up from another position would be misread.
  if (fens[0] !== chess.fen())
    throw new Error("This game does not begin from the standard starting position, so it cannot be analysed.");
  if (ucis.length !== game.plyCount)
    throw new Error("This game's saved move count does not match its moves. Re-import it to analyse it.");
  const total = ucis.length + 1;
  const evals: Evaluation[] = [];
  const best: string[] = [];
  const lines: string[][] = [];
  const depths: number[] = [];

  for (let ply = 0; ply < total; ply++) {
    if (ply > 0) applyUci(chess, ucis[ply - 1]);
    if (chess.isGameOver()) {
      evals.push(whiteEvaluation(chess));
      best.push("");
      lines.push([]);
      depths.push(0);
    } else {
      if (options.isCancelled?.()) throw abortError();
      const result = await search(ucis.slice(0, ply), { nodes });
      if (options.isCancelled?.()) throw abortError();
      // When the node budget runs out part way through a depth, Stockfish can name a new bestmove that
      // only has a bound score, while the exact score and line kept are from the depth before, for
      // another move. The score belongs to that line, so its first move is the best move recorded.
      const move = result.pv.length && isLegal(chess, result.pv[0]) ? result.pv[0] : result.bestMove;
      if (!isLegal(chess, move))
        throw new Error(
          `The engine gave no usable move after ${ply} ${ply === 1 ? "move" : "moves"} in this game.`,
        );
      evals.push(whiteEvaluation(chess, result));
      best.push(move);
      lines.push(legalPrefix(chess.fen(), move, result.pv));
      depths.push(result.depth);
    }
    options.onPosition?.(ply + 1, total);
  }

  return {
    gameId: game.id,
    version: ANALYSIS_VERSION,
    nodes,
    analysedAt: new Date().toISOString(),
    evals,
    best,
    lines,
    depths,
  };
}
