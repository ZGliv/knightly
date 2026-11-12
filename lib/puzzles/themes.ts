/** Plain-English names for the Lichess themes we ship. Keys are Lichess theme ids. */
export const THEMES: Record<string, { name: string; blurb: string }> = {
  fork: { name: "Fork", blurb: "One piece attacks two things at once." },
  pin: { name: "Pin", blurb: "A piece can’t move without exposing something more valuable behind it." },
  skewer: { name: "Skewer", blurb: "A valuable piece is attacked, and when it moves the piece behind it falls." },
  discoveredAttack: { name: "Discovered attack", blurb: "Moving one piece uncovers an attack by another." },
  doubleCheck: { name: "Double check", blurb: "Two pieces give check at once, so the king must move." },
  hangingPiece: { name: "Free piece", blurb: "A piece is left undefended and can simply be taken." },
  trappedPiece: { name: "Trapped piece", blurb: "A piece has no safe square left and can be won." },
  sacrifice: { name: "Sacrifice", blurb: "Give up material on purpose to get something bigger." },
  deflection: { name: "Deflection", blurb: "Force a defender away from the square or piece it guards." },
  attraction: { name: "Attraction", blurb: "Lure a piece, often the king, onto a square where it gets hit." },
  capturingDefender: { name: "Remove the defender", blurb: "Take the piece that protects something, then take that too." },
  interference: { name: "Interference", blurb: "Put a piece between an enemy piece and what it defends." },
  clearance: { name: "Clearance", blurb: "Move a piece out of the way so another can use its square or line." },
  xRayAttack: { name: "X-ray", blurb: "A piece attacks or defends through another piece on the same line." },
  intermezzo: { name: "In-between move", blurb: "Instead of the expected recapture, play a stronger move first." },
  quietMove: { name: "Quiet move", blurb: "A calm move with no check or capture that sets up an unstoppable threat." },
  defensiveMove: { name: "Defence", blurb: "Find the only move that saves your position." },
  zugzwang: { name: "Zugzwang", blurb: "Your opponent has to move, and every move makes things worse." },
  exposedKing: { name: "Exposed king", blurb: "Attack a king that has lost its pawn cover." },
  kingsideAttack: { name: "Kingside attack", blurb: "Break through to a king that has castled short." },
  mate: { name: "Checkmate", blurb: "Find the moves that end the game." },
  mateIn1: { name: "Mate in 1", blurb: "One move ends the game." },
  mateIn2: { name: "Mate in 2", blurb: "Force checkmate in two moves." },
  mateIn3: { name: "Mate in 3", blurb: "Force checkmate in three moves." },
  backRankMate: { name: "Back-rank mate", blurb: "Mate a king trapped behind its own pawns on the back row." },
  smotheredMate: { name: "Smothered mate", blurb: "A knight mates a king boxed in by its own pieces." },
  promotion: { name: "Promotion", blurb: "Push a pawn to the last row to make a new queen (or other piece)." },
  advancedPawn: { name: "Advanced pawn", blurb: "A pawn close to promoting decides the position." },
  endgame: { name: "Endgame", blurb: "Tactics with few pieces left on the board." },
  opening: { name: "Opening", blurb: "Tactics in the first moves of the game." },
};

/** The themes offered in the filter, most broadly useful first. */
export const FILTER_THEMES = [
  "fork", "pin", "skewer", "discoveredAttack", "hangingPiece", "trappedPiece", "capturingDefender",
  "deflection", "attraction", "sacrifice", "intermezzo", "quietMove", "defensiveMove",
  "mateIn1", "mateIn2", "backRankMate", "promotion", "endgame",
] as const;

export const themeName = (id: string) => THEMES[id]?.name ?? id;
