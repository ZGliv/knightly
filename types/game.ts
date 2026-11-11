export type PlayerColor = "white" | "black";
export type MoveClassification =
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";
export type GameResult = "1-0" | "0-1" | "1/2-1/2" | "*";
export interface ClassifiedMove {
  ply: number;
  san: string;
  uci: string;
  fenAfter: string;
  evalCp: number | null;
  classification?: MoveClassification;
  coachText?: string;
  cpLoss?: number;
  bestSan?: string;
  searchDepth?: number;
  mateIn?: number | null;
}
export interface PhaseBreakdown {
  opening: number | null;
  middlegame: number | null;
  endgame: number | null;
}
export interface GameSummary {
  result: GameResult;
  openingName: string;
  keyMistakes: Array<{
    ply: number;
    san: string;
    classification: MoveClassification;
    coachText: string;
  }>;
  recurringWeaknesses: string[];
  phaseStrength: PhaseBreakdown;
  recommendations: string[];
}
export interface SavedGame {
  id: string;
  clientId: string;
  createdAt: string;
  updatedAt?: string;
  playerColor: PlayerColor;
  engineLevel: number;
  engineElo?: number;
  training?: { origin: "engine"; initialElo: number; changed: boolean; policy?: "maia3-5m-v1" | "maia3-5m-v2" };
  result: GameResult;
  openingName: string;
  pgn: string;
  fenFinal: string;
  moves: ClassifiedMove[];
  summary: GameSummary;
}
