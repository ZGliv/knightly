import { Chess } from "chess.js";
import type { PlayerColor } from "@/types/game";

/** One move of a line, replayed from the starting position. */
export interface LineStep {
  /** 0-based ply. */
  index: number;
  fenBefore: string;
  fenAfter: string;
  san: string;
  uci: string;
  mover: PlayerColor;
  /** Moves up to and including this one, joined with spaces: the key format of `course.ideas` and `course.names`. */
  prefix: string;
}

/** Replays SAN moves from the starting position. Throws when a move is illegal, naming the move. */
export function replayLine(moves: string[]): LineStep[] {
  const chess = new Chess();
  const steps: LineStep[] = [];
  for (const [index, san] of moves.entries()) {
    const fenBefore = chess.fen();
    let move;
    try {
      move = chess.move(san);
    } catch {
      throw new Error(`Move ${index + 1} (${san}) is not legal in this line.`);
    }
    steps.push({
      index,
      fenBefore,
      fenAfter: chess.fen(),
      san: move.san,
      uci: move.from + move.to + (move.promotion ?? ""),
      mover: move.color === "w" ? "white" : "black",
      prefix: moves.slice(0, index + 1).join(" "),
    });
  }
  return steps;
}

/** The step indexes the learner plays. */
export function learnerIndexes(steps: LineStep[], side: PlayerColor): number[] {
  return steps.filter((s) => s.mover === side).map((s) => s.index);
}

/** True when a board move (from, to, promotion piece) is the move this step expects. */
export function isExpectedMove(step: Pick<LineStep, "uci">, from: string, to: string, promotion?: string): boolean {
  if (step.uci.slice(0, 4) !== from + to) return false;
  return step.uci.length === 4 || step.uci[4] === (promotion ?? "q");
}

/** A shuffled copy. `random` is injectable for tests; call it only from event handlers or effects. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The position after `moves` from the start (the start position for none). Throws on an illegal move. */
export function fenAfter(moves: string[]): string {
  return replayLine(moves).at(-1)?.fenAfter ?? new Chess().fen();
}

/** "1. e4 e5 2. Nf3" style text for a list of SAN moves. */
export function numberedMoves(moves: string[]): string {
  return moves.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m}` : m)).join(" ");
}

/** "4.Nf3" for White's move at a 0-based ply, "3...Bf5" for Black's. */
export function moveLabel(index: number, san: string): string {
  return `${Math.floor(index / 2) + 1}${index % 2 === 0 ? "." : "..."}${san}`;
}

/**
 * Display names for a course's lines. A name already used by an earlier line gets the first move
 * that tells it apart from every earlier line of that name: "London System (3...Bf5)".
 */
export function lineLabels(lines: readonly { id: string; name: string; moves: string[] }[]): Map<string, string> {
  const labels = new Map<string, string>();
  const byName = new Map<string, string[][]>();
  for (const line of lines) {
    const earlier = byName.get(line.name) ?? [];
    if (!earlier.length) labels.set(line.id, line.name);
    else {
      const firstDiff = (other: string[]) => {
        let i = 0;
        while (i < line.moves.length && i < other.length && line.moves[i] === other[i]) i++;
        return i;
      };
      const at = Math.min(line.moves.length - 1, Math.max(...earlier.map(firstDiff)));
      labels.set(line.id, `${line.name} (${moveLabel(at, line.moves[at])})`);
    }
    byName.set(line.name, [...earlier, line.moves]);
  }
  return labels;
}
