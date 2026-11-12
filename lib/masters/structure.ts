import { Chess, type Color, type Square } from "chess.js";

/** Kinds of middlegame the guess-the-move games are grouped by. */
export type StructureTag =
  | "iqp"
  | "opposite-castling"
  | "queens-off"
  | "closed-centre"
  | "open-centre"
  | "fianchetto";

export type StructureGroup = StructureTag | "mixed";

/** Order used to pick the group a game is listed under: the most specific kind comes first. */
export const TAG_ORDER: StructureTag[] = [
  "iqp",
  "opposite-castling",
  "queens-off",
  "closed-centre",
  "open-centre",
  "fianchetto",
];

/** The structure is read from the position after this many half-moves (White's and Black's 15th). */
export const STRUCTURE_PLY = 30;

export interface StructureInfo {
  name: string;
  /** What the kind of position looks like, in one sentence. */
  summary: string;
  /** Usual plans: two sentences for each side. */
  plans: { side: string; text: string }[];
}

export const STRUCTURES: Record<StructureGroup, StructureInfo> = {
  iqp: {
    name: "Isolated queen's pawn",
    summary: "One side has a d-pawn with no pawns of its own on the c- or e-file beside it.",
    plans: [
      {
        side: "With the isolated pawn",
        text: "Use the extra space and the half-open c- and e-files to keep every piece active, often aiming them at the enemy king. The push d4-d5 (or ...d5-d4), when it works tactically, frees the position at the right moment.",
      },
      {
        side: "Against it",
        text: "Trade pieces, because each exchange takes away attacking chances and leaves the lone pawn weaker in the endgame. Blockade the square in front of the pawn, ideally with a knight, then pile up on the pawn itself.",
      },
    ],
  },
  "opposite-castling": {
    name: "Opposite-side castling",
    summary: "The kings have castled on different wings, so each side can push pawns at the other king without weakening its own.",
    plans: [
      {
        side: "Attacking",
        text: "Advance the pawns in front of the enemy king to open files for your rooks and queen. Speed matters more than material here, so a pawn sacrifice that opens a line is often worth it.",
      },
      {
        side: "Defending",
        text: "Avoid moving the pawns in front of your own king, because each pawn move gives the attacker a target to open lines with. A counter-blow in the centre or trading the opponent's best attacking piece is often the best defence.",
      },
    ],
  },
  "queens-off": {
    name: "Queens off early",
    summary: "The queens were traded by move 15, so the middlegame plays more like an endgame.",
    plans: [
      {
        side: "The side pressing",
        text: "Bring the king toward the centre, since without queens it is a strong piece and rarely in danger. Target weak pawns and take the open files with your rooks before the opponent does.",
      },
      {
        side: "The side defending",
        text: "Activate your worst piece and keep your rooks active rather than tying them to passive defence. Trade into an endgame you know you can hold, and keep your pawns off squares where they can be won.",
      },
    ],
  },
  "closed-centre": {
    name: "Closed centre",
    summary: "Central pawns are locked head to head, so play moves to the wings.",
    plans: [
      {
        side: "Each side's plan",
        text: "Play on the wing your pawn chain points toward, where you have more space. Pawn breaks against the base of the opponent's chain open lines there for your rooks.",
      },
      {
        side: "Against the opponent's plan",
        text: "Counter on your own wing instead of only defending, because in closed positions the faster wing attack usually decides. Knights often beat bishops behind locked pawns, so think carefully about which minor pieces to trade.",
      },
    ],
  },
  "open-centre": {
    name: "Open centre",
    summary: "The d- and e-files are nearly free of pawns, so the pieces meet each other directly in the middle.",
    plans: [
      {
        side: "The more active side",
        text: "Put rooks on the open files and pieces on strong central squares quickly, because development and initiative count for more than structure. Look for tactics along the open lines, especially against a king that is still in the centre.",
      },
      {
        side: "The other side",
        text: "Trade the opponent's most active pieces and contest every open file rather than giving it up. Once the tension is gone, small structural edges such as a healthier pawn majority decide the endgame.",
      },
    ],
  },
  fianchetto: {
    name: "Kingside fianchetto",
    summary: "A bishop sits on g2 or g7 in front of its own king, aiming down the long diagonal.",
    plans: [
      {
        side: "With the fianchetto",
        text: "Use the long-diagonal bishop to press on the centre and the queenside, backing it with pawn breaks that open the diagonal. Keep that bishop, because without it the squares around your king become weak.",
      },
      {
        side: "Against it",
        text: "Try to trade the fianchettoed bishop, for example with Bh6 (or ...Bh3) supported by the queen, then use the weakened squares near the king. Blunting the diagonal with a solid pawn chain also takes much of the bishop's power away.",
      },
    ],
  },
  mixed: {
    name: "Mixed middlegames",
    summary: "None of the standard structures fits cleanly, so the plans come from the specific position.",
    plans: [
      {
        side: "Finding a plan",
        text: "Look at which side has more space and where the pawn breaks are, and play on that wing. When nothing concrete is happening, improve your worst-placed piece.",
      },
      {
        side: "Stopping theirs",
        text: "Before following your own plan, check the opponent's checks, captures and threats. Strong players change plans the moment the position changes, so keep asking what the opponent wants.",
      },
    ],
  },
};

type Board = ReturnType<Chess["board"]>;

function pawnSquares(board: Board, color: Color) {
  const out: { file: number; rank: number }[] = [];
  board.forEach((row, r) =>
    row.forEach((cell, f) => {
      if (cell?.type === "p" && cell.color === color) out.push({ file: f, rank: 8 - r });
    }),
  );
  return out;
}

function pieceAt(chess: Chess, square: Square) {
  return chess.get(square) ?? null;
}

/** A d-pawn with no pawns of the same colour on the c- or e-file. */
export function hasIsolatedQueenPawn(chess: Chess, color: Color): boolean {
  const pawns = pawnSquares(chess.board(), color);
  const has = (file: number) => pawns.some((p) => p.file === file);
  return has(3) && !has(2) && !has(4);
}

/** Which way each side castled in a list of SAN moves (White first). */
export function castlingSides(sanMoves: string[]): Record<Color, "king" | "queen" | null> {
  const out: Record<Color, "king" | "queen" | null> = { w: null, b: null };
  sanMoves.forEach((san, i) => {
    const color: Color = i % 2 === 0 ? "w" : "b";
    const move = san.replace(/[+#]/g, "");
    if (move === "O-O-O") out[color] = "queen";
    else if (move === "O-O") out[color] = "king";
  });
  return out;
}

/** Number of files among c-f where a white pawn stands directly in front of a black pawn. */
export function blockedCentralFiles(chess: Chess): { count: number; centre: boolean } {
  const board = chess.board();
  const white = pawnSquares(board, "w");
  const black = pawnSquares(board, "b");
  let count = 0;
  let centre = false;
  for (const file of [2, 3, 4, 5]) {
    const blocked = white.some(
      (w) => w.file === file && black.some((b) => b.file === file && b.rank === w.rank + 1),
    );
    if (blocked) {
      count++;
      if (file === 3 || file === 4) centre = true;
    }
  }
  return { count, centre };
}

export function isClosedCentre(chess: Chess): boolean {
  const { count, centre } = blockedCentralFiles(chess);
  return count >= 2 && centre;
}

/** At most one pawn, of either colour, left on the d- and e-files together. */
export function isOpenCentre(chess: Chess): boolean {
  const pawns = [...pawnSquares(chess.board(), "w"), ...pawnSquares(chess.board(), "b")];
  return pawns.filter((p) => p.file === 3 || p.file === 4).length <= 1;
}

/** A bishop on g2 with a pawn on g3, or on g7 with a pawn on g6. */
export function hasKingsideFianchetto(chess: Chess, color: Color): boolean {
  const [bishop, pawn]: [Square, Square] = color === "w" ? ["g2", "g3"] : ["g7", "g6"];
  const b = pieceAt(chess, bishop);
  const p = pieceAt(chess, pawn);
  return b?.type === "b" && b.color === color && p?.type === "p" && p.color === color;
}

export function queensOff(chess: Chess): boolean {
  return !chess
    .board()
    .some((row) => row.some((cell) => cell?.type === "q"));
}

/**
 * Tags for a game, from the position after `ply` half-moves (or the last position, if shorter).
 * Throws if a move is illegal, so a bad game never gets tagged.
 */
export function detectStructure(sanMoves: string[], ply = STRUCTURE_PLY): StructureTag[] {
  const chess = new Chess();
  const played = sanMoves.slice(0, ply);
  for (const san of played) chess.move(san);
  const tags = new Set<StructureTag>();
  if (hasIsolatedQueenPawn(chess, "w") || hasIsolatedQueenPawn(chess, "b")) tags.add("iqp");
  const castled = castlingSides(played);
  if (castled.w && castled.b && castled.w !== castled.b) tags.add("opposite-castling");
  if (queensOff(chess)) tags.add("queens-off");
  if (isClosedCentre(chess)) tags.add("closed-centre");
  if (isOpenCentre(chess)) tags.add("open-centre");
  if (hasKingsideFianchetto(chess, "w") || hasKingsideFianchetto(chess, "b")) tags.add("fianchetto");
  return TAG_ORDER.filter((tag) => tags.has(tag));
}

/** The group a game is listed under: its most specific tag, or "mixed". */
export function primaryGroup(tags: StructureTag[]): StructureGroup {
  return TAG_ORDER.find((tag) => tags.includes(tag)) ?? "mixed";
}
