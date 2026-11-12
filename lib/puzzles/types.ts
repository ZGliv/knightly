/** One Lichess puzzle as shipped in public/puzzles/*.json. */
export interface Puzzle {
  id: string;
  /** Position before the opponent's setup move (moves[0]). */
  fen: string;
  /** UCI moves: moves[0] is the opponent's, then solver and opponent alternate; the solver plays last. */
  moves: string[];
  rating: number;
  themes: string[];
}

export interface PuzzleIndex {
  source: string;
  bandSize: number;
  bands: { min: number; file: string; count: number }[];
}

export interface PuzzleAttempt {
  puzzleId: string;
  /** ISO timestamp. */
  at: string;
  solved: boolean;
  /** Only first attempts change the rating; repeats are practice. */
  rated: boolean;
  puzzleRating: number;
  themes: string[];
  ratingBefore: number;
  ratingAfter: number;
}

export interface PuzzleProgress {
  version: 1;
  /** null until the first puzzle is finished; the starting point is then chosen by initialRating(). */
  rating: number | null;
  attempts: PuzzleAttempt[];
  /** Puzzles that have been failed, kept whole so they can come back without fetching their band. */
  repeats: Record<string, Puzzle>;
}

export const emptyProgress = (): PuzzleProgress => ({ version: 1, rating: null, attempts: [], repeats: {} });
