import { Chess } from "chess.js";
import type { Course } from "./types";
import type { LineStep } from "./line";

const PIECE: Record<string, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * A plain description of a move, computed from the position: "Knight to f3", "Pawn takes d5",
 * "Bishop takes the knight on c6", "Castle kingside, with check". Only facts the position proves.
 */
export function describeMove(fenBefore: string, san: string): string {
  const move = new Chess(fenBefore).move(san);
  let text: string;
  if (move.flags.includes("k")) text = "Castle kingside";
  else if (move.flags.includes("q")) text = "Castle queenside";
  else if (move.flags.includes("e")) text = `Pawn takes on ${move.to} en passant (capturing the pawn that just moved two squares past it)`;
  else if (move.captured) {
    text = move.piece === "p" ? `Pawn takes ${move.to}` : `${cap(PIECE[move.piece])} takes the ${PIECE[move.captured]} on ${move.to}`;
  } else text = `${cap(PIECE[move.piece])} to ${move.to}`;
  if (move.promotion) text += `, becoming a ${PIECE[move.promotion]}`;
  if (move.san.endsWith("#")) text += ", checkmate";
  else if (move.san.endsWith("+")) text += ", with check";
  return text;
}

/** "Italian Game: Evans Gambit" -> "the Evans Gambit, part of the Italian Game". */
function spokenName(name: string): string {
  const [family, ...rest] = name.split(":");
  const variation = rest.join(":").trim();
  return variation ? `the ${variation}, part of the ${family.trim()}` : `the ${family.trim()}`;
}

/**
 * "This is the …" when this move reaches a named position whose name differs from the last name
 * reached earlier in the line; otherwise null.
 */
export function nameSentence(course: Pick<Course, "names">, steps: LineStep[], index: number): string | null {
  const name = course.names[steps[index].prefix];
  if (!name) return null;
  for (let i = index - 1; i >= 0; i--) {
    const earlier = course.names[steps[i].prefix];
    if (earlier) {
      if (earlier === name) return null;
      break;
    }
  }
  return `This is ${spokenName(name)}.`;
}

export interface MoveNote {
  /** "Knight to f3". */
  description: string;
  /** "This is the Evans Gambit, part of the Italian Game." */
  name: string | null;
  /** AI-written idea from `course.ideas`, when present. */
  idea: string | null;
  /** Everything above as one paragraph. */
  text: string;
}

/** The note shown for the move at `index`: description, opening name, then the written idea. */
export function moveNote(course: Pick<Course, "names" | "ideas">, steps: LineStep[], index: number): MoveNote {
  const step = steps[index];
  const description = describeMove(step.fenBefore, step.san);
  const name = nameSentence(course, steps, index);
  const idea = course.ideas[step.prefix]?.trim() || null;
  return { description, name, idea, text: [`${description}.`, name, idea].filter(Boolean).join(" ") };
}
