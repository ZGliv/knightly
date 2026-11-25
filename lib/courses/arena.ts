import { positionKey, type PositionNode } from "@/lib/openings/tree";
import type { PlayerColor } from "@/types/game";
import { replayLine, type LineStep } from "./line";
import type { Course } from "./types";

/** One move the course plays (or expects) at a position, with the lines that contain it. */
export interface BookMove {
  san: string;
  uci: string;
  lineIds: string[];
}

/** Every position the course covers (by `positionKey`) -> the course's moves there, in course order. */
export type Book = Map<string, BookMove[]>;

/** Indexes every line's positions. Transpositions merge because positions are keyed without move counters. */
export function buildBook(course: Pick<Course, "lines">, steps?: Map<string, LineStep[]>): Book {
  const book: Book = new Map();
  for (const line of course.lines) {
    let replayed = steps?.get(line.id);
    if (!replayed) {
      try {
        replayed = replayLine(line.moves);
      } catch {
        continue;
      }
    }
    for (const step of replayed) {
      const key = positionKey(step.fenBefore);
      const moves = book.get(key) ?? [];
      const known = moves.find((m) => m.uci === step.uci);
      if (known) {
        if (!known.lineIds.includes(line.id)) known.lineIds.push(line.id);
      } else moves.push({ san: step.san, uci: step.uci, lineIds: [line.id] });
      book.set(key, moves);
    }
  }
  return book;
}

/**
 * Where a game left the course:
 * - "you": the learner played a move the course does not play in a position it covers;
 * - "opponent": the opponent did;
 * - "end": every move so far was the course's, and the course has nothing more to say here.
 */
export interface Leave {
  by: "you" | "opponent" | "end";
  /** 0-based ply of the move that left (for "end", the first ply the course does not cover). */
  ply: number;
  /** Position key before that ply. */
  key: string;
  /** The move actually played, or null when the game had no move there yet. */
  played: string | null;
  /** The course's moves at that position (empty for "end"). */
  course: BookMove[];
}

export interface Walk {
  /** Plies played inside the course before it was left (all of them while still in the course). */
  bookPlies: number;
  /** Null while the game is still inside the course. */
  leave: Leave | null;
}

const moverAt = (ply: number): PlayerColor => (ply % 2 === 0 ? "white" : "black");

/**
 * Follows a game from the starting position along the course.
 * `keys[i]` is the position key before ply i (so `keys.length === sans.length + 1`).
 * The first move that is not the course's ends the walk; leaving is final even if the game later
 * transposes back into a course position.
 */
export function walkBook(book: Book, keys: string[], sans: string[], side: PlayerColor): Walk {
  for (let i = 0; i < sans.length; i++) {
    const options = book.get(keys[i]);
    if (!options) return { bookPlies: i, leave: { by: "end", ply: i, key: keys[i], played: sans[i], course: [] } };
    if (!options.some((o) => o.san === sans[i]))
      return { bookPlies: i, leave: { by: moverAt(i) === side ? "you" : "opponent", ply: i, key: keys[i], played: sans[i], course: options } };
  }
  const n = sans.length;
  if (book.has(keys[n])) return { bookPlies: n, leave: null };
  return { bookPlies: n, leave: { by: "end", ply: n, key: keys[n], played: null, course: [] } };
}

/** "Move 7" style number for a 0-based ply. */
export const moveNumber = (ply: number) => Math.floor(ply / 2) + 1;

/**
 * Picks the opponent's in-course reply. When the learner's real opponents reached this position
 * (`node` from `buildTree` over his games with the course's colour), each course reply is weighted
 * by how often they played it; replies they never played are then not chosen. When they never
 * reached it, or played none of the course's replies, every course reply is equally likely.
 * `random` returns [0, 1); call it only from event handlers or effects.
 */
export function chooseBookReply(options: BookMove[], node: Pick<PositionNode, "moves"> | undefined, random: () => number = Math.random): BookMove {
  if (!options.length) throw new Error("There is no course reply to choose from.");
  const weights = options.map((o) => node?.moves.find((m) => m.uci === o.uci)?.count ?? 0);
  const total = weights.reduce((a, b) => a + b, 0);
  const r = random();
  if (total === 0) return options[Math.min(options.length - 1, Math.floor(r * options.length))];
  let cursor = r * total;
  for (let i = 0; i < options.length; i++) {
    if (weights[i] === 0) continue;
    if (cursor < weights[i]) return options[i];
    cursor -= weights[i];
  }
  return options[weights.findLastIndex((w) => w > 0)];
}

/** "Nf3", "Nf3 or c4", "Nf3, c4 or g3". */
export function orList(sans: string[]): string {
  if (sans.length <= 1) return sans[0] ?? "";
  return `${sans.slice(0, -1).join(", ")} or ${sans.at(-1)}`;
}

/** The quiet status line under the board. */
export function arenaStatus(walk: Walk): string {
  const { leave } = walk;
  if (!leave) return `In your course: move ${moveNumber(walk.bookPlies)}`;
  const n = moveNumber(leave.ply);
  if (leave.by === "you") return `You left the course at move ${n}: the course plays ${orList(leave.course.map((m) => m.san))}`;
  if (leave.by === "opponent") return `Your opponent left the course at move ${n}: you are on your own`;
  return `The course ends at move ${n}: you are on your own`;
}

/** The line to open in Learn after a game: the one the learner should have followed where it was left. */
export function lineToLearn(book: Book, walk: Walk, keys: string[]): string | null {
  if (walk.leave?.course.length) return walk.leave.course[0].lineIds[0] ?? null;
  // Course ended (or the opponent's move had no continuation): the line the last course move belongs to.
  for (let i = walk.bookPlies - 1; i >= 0; i--) {
    const options = book.get(keys[i]);
    if (options?.length) return options[0].lineIds[0] ?? null;
  }
  return null;
}

/** Club level, used when nothing better is known. */
export const DEFAULT_ARENA_ELO = 1200;

/**
 * The computer opponent's approximate Elo once the game leaves the course, in order of preference:
 * the manual difficulty chosen on Play, Play's estimate from finished games against Knightly,
 * the learner's own average rating in imported chess.com games, then a club default.
 */
export function arenaElo(input: { manual: number | null; estimated: number | null; imported: number | null }): number {
  const pick = input.manual ?? input.estimated ?? input.imported;
  if (pick === null || !Number.isFinite(pick)) return DEFAULT_ARENA_ELO;
  return Math.max(400, Math.min(2400, Math.round(pick / 50) * 50));
}
