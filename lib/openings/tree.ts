import { Chess } from "chess.js";
import type { PlayerColor } from "@/types/game";
import { replayGame } from "@/lib/insights/replay";
import type { ImportedGame } from "@/lib/insights/types";

/** The opening is the first 12 moves each: 24 plies. */
export const TREE_PLIES = 24;

export const START_FEN = new Chess().fen();

/**
 * Board, side to move, castling rights and en-passant square: the first four FEN fields.
 * The move counters are dropped so the same position reached by a different move order
 * (a transposition) gets the same key.
 */
export function positionKey(fen: string): string {
  return fen.trim().split(/\s+/).slice(0, 4).join(" ");
}

export function turnOf(fen: string): PlayerColor {
  return fen.trim().split(/\s+/)[1] === "b" ? "black" : "white";
}

export interface MoveStat {
  san: string;
  uci: string;
  /** Games in which this move was played from this position. */
  count: number;
  /** The player's points in those games (win 1, draw 0.5). */
  points: number;
  /** Key of the position after the move. */
  childKey: string;
  childFen: string;
}

export interface PositionNode {
  key: string;
  fen: string;
  turn: PlayerColor;
  /** Games that reached this position. */
  games: number;
  /** The player's points in those games. */
  points: number;
  /** Most played first. */
  moves: MoveStat[];
  /** Opening names (from chess.com) of the games that passed through here, with counts. */
  openings: Record<string, number>;
}

export interface OpeningTree {
  color: PlayerColor;
  games: number;
  rootKey: string;
  nodes: Record<string, PositionNode>;
}

type TreeGame = Pick<ImportedGame, "pgn" | "userColor" | "outcome" | "openingName">;

const POINTS = { win: 1, draw: 0.5, loss: 0 } as const;

/** Builds the tree of the first 12 moves of the player's games with one colour. Unreadable games are skipped. */
export function buildTree(games: TreeGame[], color: PlayerColor, maxPlies = TREE_PLIES): OpeningTree {
  const rootKey = positionKey(START_FEN);
  const nodes: Record<string, PositionNode> = {};
  const nodeFor = (fen: string): PositionNode => {
    const key = positionKey(fen);
    return (nodes[key] ??= { key, fen, turn: turnOf(fen), games: 0, points: 0, moves: [], openings: {} });
  };
  let counted = 0;
  for (const game of games) {
    if (game.userColor !== color) continue;
    let replay;
    try {
      replay = replayGame(game.pgn);
    } catch {
      continue;
    }
    counted++;
    const points = POINTS[game.outcome];
    const name = game.openingName && game.openingName !== "Unknown opening" ? game.openingName : null;
    const plies = Math.min(maxPlies, replay.sans.length);
    // A game can repeat a position (e.g. knights out and back); it still counts once there.
    const seenNodes = new Set<string>();
    const seenMoves = new Set<string>();
    for (let i = 0; i <= plies; i++) {
      const node = nodeFor(replay.fens[i]);
      if (!seenNodes.has(node.key)) {
        seenNodes.add(node.key);
        node.games++;
        node.points += points;
        if (name) node.openings[name] = (node.openings[name] ?? 0) + 1;
      }
      if (i === plies) break;
      const moveId = `${node.key}|${replay.ucis[i]}`;
      if (seenMoves.has(moveId)) continue;
      seenMoves.add(moveId);
      let move = node.moves.find((m) => m.uci === replay.ucis[i]);
      if (!move) {
        move = {
          san: replay.sans[i],
          uci: replay.ucis[i],
          count: 0,
          points: 0,
          childKey: positionKey(replay.fens[i + 1]),
          childFen: replay.fens[i + 1],
        };
        node.moves.push(move);
      }
      move.count++;
      move.points += points;
    }
  }
  for (const node of Object.values(nodes)) node.moves.sort((a, b) => b.count - a.count || a.san.localeCompare(b.san));
  if (!nodes[rootKey]) nodes[rootKey] = { key: rootKey, fen: START_FEN, turn: "white", games: 0, points: 0, moves: [], openings: {} };
  return { color, games: counted, rootKey, nodes };
}

/** Points as a 0-100 score, or null with no games. */
export function scorePercent(points: number, games: number): number | null {
  return games > 0 ? Math.round((points / games) * 100) : null;
}

/** The most common opening name among the games through this position, with how many of them had it. */
export function topOpening(node: PositionNode): { name: string; count: number } | null {
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of Object.entries(node.openings))
    if (!best || count > best.count || (count === best.count && name.length < best.name.length)) best = { name, count };
  return best;
}
