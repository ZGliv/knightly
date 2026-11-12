import type { PlayerColor } from "@/types/game";
import type { GamePhase } from "@/lib/utils/phase";
import type { Evaluation } from "@/lib/learning/coach/model";

/**
 * Shared contract for "Your leaks": games imported from an outside site,
 * their engine analysis, the mistakes found in them and the report built on top.
 * Imported games never enter the in-app saved-game library (buddymine_games_v1).
 */

export type TimeClass = "bullet" | "blitz" | "rapid" | "daily";
export type Outcome = "win" | "draw" | "loss";
export type GameSource = "chesscom";

export interface ImportedPlayer {
  name: string;
  rating: number | null;
}

export interface ImportedGame {
  /** `${source}-${site id}`; matches /^[\w-]{1,100}$/ so it can be a Decision gameId. */
  id: string;
  source: GameSource;
  url: string;
  /** Exactly as delivered, including headers and clock comments. Standard chess from the normal start only. */
  pgn: string;
  /** Unix milliseconds. */
  endTime: number;
  timeClass: TimeClass;
  baseSec: number;
  incSec: number;
  rated: boolean;
  white: ImportedPlayer;
  black: ImportedPlayer;
  userColor: PlayerColor;
  outcome: Outcome;
  /** The site's own result code for the user's side, e.g. "win", "resigned", "timeout". */
  resultCode: string;
  /** Display only, e.g. "won by resignation". Never parsed for logic. */
  termination: string;
  ecoCode: string | null;
  /** Full opening name from the site, or "Unknown opening". */
  openingName: string;
  /** Coarse grouping for "by opening" tables, e.g. "Sicilian Defense". */
  openingFamily: string;
  plyCount: number;
  /** Seconds left on the mover's clock after each ply (index = ply - 1), or null when unknown. */
  clocks: (number | null)[];
}

/** One engine pass over every position of a game. Index i is the position after i plies. */
export interface GameAnalysis {
  gameId: string;
  /** Bumped whenever the analysis method changes; stale records are re-run. */
  version: number;
  /** Fixed node budget per position, so results do not depend on device speed. */
  nodes: number;
  analysedAt: string;
  /** White-relative, mate-aware. Length plyCount + 1. */
  evals: Evaluation[];
  /** Engine's preferred move (UCI) in each position; "" when the game is over there. Length plyCount + 1. */
  best: string[];
  /** Engine's main line (UCI) from each position, at most 8 plies. Length plyCount + 1. */
  lines: string[][];
  depths: number[];
}

export const ANALYSIS_VERSION = 1;
export const ANALYSIS_NODES = 150_000;

/** Win-percentage points lost by one move (0-100 scale, Lichess thresholds). */
export const INACCURACY_DROP = 5;
export const MISTAKE_DROP = 10;
export const BLUNDER_DROP = 15;

export type Severity = "inaccuracy" | "mistake" | "blunder";

/**
 * Deliberately coarse. Each label is something the engine evidence can actually show.
 * Pins, skewers and discovered attacks are not separated out; they land in the material buckets.
 */
export type LeakCategory =
  | "missed-mate" // a forced mate was on the board and the move let it go
  | "allowed-mate" // the move let the opponent force mate
  | "hung-material" // the move loses material to the engine's reply
  | "missed-material" // the best move won material and the move played did not
  | "quiet-mistake"; // a large drop the short lines do not put down to simply losing or missing material

export interface MoveStat {
  ply: number;
  phase: GamePhase;
  /** User's win percentage before and after their move. */
  winBefore: number;
  winAfter: number;
  /** max(0, winBefore - winAfter). */
  drop: number;
  /** Seconds on the user's clock before this move, and seconds spent on it. */
  clockSec: number | null;
  spentSec: number | null;
}

export interface Leak {
  /** `${gameId}:${ply}`, the same form as a coach Decision id. */
  id: string;
  gameId: string;
  ply: number;
  moveNumber: number;
  userColor: PlayerColor;
  phase: GamePhase;
  category: LeakCategory;
  severity: Exclude<Severity, "inaccuracy">;
  winBefore: number;
  winAfter: number;
  drop: number;
  fenBefore: string;
  fenAfter: string;
  playedSan: string;
  playedUci: string;
  bestSan: string;
  bestUci: string;
  /** Engine's line starting with the best move, SAN. */
  bestLine: string[];
  /** Engine's line after the move actually played, starting with the opponent's reply, SAN. */
  refutation: string[];
  /** Points of material (pawn = 1) the played line ends up behind the best line. */
  materialSwing: number;
  clockSec: number | null;
  spentSec: number | null;
  /** Little time left when the move was made. */
  timeTrouble: boolean;
  /** Played almost instantly with plenty of time left. */
  hasty: boolean;
}

export interface GameAssessment {
  gameId: string;
  /** One entry per move the user made. */
  moves: MoveStat[];
  /** Mistakes and blunders only. */
  leaks: Leak[];
  /** Highest and lowest win percentage the user had at any point. */
  peakWin: number;
  lowWin: number;
  /**
   * At least 85% (clearly winning) or at most 15% (clearly losing) on two or more of the user's turns,
   * counting the final position as one. A single reading does not count, so one engine flicker cannot.
   */
  clearlyWinning: boolean;
  clearlyLosing: boolean;
  /** Clearly winning but did not win. */
  blownWin: boolean;
  /** Clearly losing but did not lose. */
  savedGame: boolean;
}

export interface RecordCount {
  games: number;
  win: number;
  draw: number;
  loss: number;
}

export interface PhaseStats {
  moves: number;
  mistakes: number;
  blunders: number;
  /** Average win-percentage points lost per move. */
  avgDrop: number;
  /** Mistakes plus blunders per 100 of the user's moves in this phase. */
  leaksPer100: number;
}

export interface CategoryStats {
  category: LeakCategory;
  count: number;
  /** Sum of win-percentage points lost; the ranking key. */
  totalDrop: number;
  games: number;
  /** Largest drops first. */
  leakIds: string[];
}

export interface OpeningStats extends RecordCount {
  family: string;
  color: PlayerColor;
  /** Points scored out of games played, 0-100. */
  score: number;
  /** Average win percentage for the user at move 12 (or the last move if shorter). */
  winAfterOpening: number;
}

export interface Headline {
  key: string;
  title: string;
  detail: string;
  /** What to do about it, in one or two sentences. */
  advice: string;
  leakIds: string[];
}

export interface InsightsReport {
  username: string;
  /** Imported games, and how many of them have been analysed so far. */
  games: number;
  analysed: number;
  from: number | null;
  to: number | null;
  record: RecordCount;
  byColor: Record<PlayerColor, RecordCount>;
  byTimeClass: Partial<Record<TimeClass, RecordCount>>;
  phases: Record<GamePhase, PhaseStats>;
  /** Ranked by totalDrop, biggest first. */
  categories: CategoryStats[];
  /** Ranked by games played. */
  openings: OpeningStats[];
  time: {
    lostOnTime: number;
    leaks: number;
    /** Leaks with a clock reading; daily games and games without clock data have none. */
    clockedLeaks: number;
    inTimeTrouble: number;
    hasty: number;
  };
  conversion: {
    winning: number;
    converted: number;
    blownGameIds: string[];
    losing: number;
    saved: number;
  };
  /** The two or three findings that cost the most. Empty until enough games are analysed. */
  headlines: Headline[];
}

export interface InsightsMeta {
  source: GameSource;
  username: string;
  importedAt: string;
  max: number;
  timeClasses: TimeClass[];
}
