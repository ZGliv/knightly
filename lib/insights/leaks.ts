import { Chess, type Move } from "chess.js";
import type { PlayerColor } from "@/types/game";
import { MATERIAL_VALUES } from "@/lib/chess/material";
import { isPlayerPly, opponentColor, playerTurn } from "@/lib/chess/player";
import { applyUci, legalLine, type Evaluation } from "@/lib/learning/coach/model";
import { replayGame } from "./replay";
import { phaseForPosition } from "./phase";
import { winPercent } from "./winprob";
import {
  BLUNDER_DROP,
  MISTAKE_DROP,
  type GameAnalysis,
  type GameAssessment,
  type ImportedGame,
  type Leak,
  type LeakCategory,
  type MoveStat,
} from "./types";

/** Plies of each engine line played out when comparing material. */
const MATERIAL_PLIES = 6;
/** Material difference (pawn = 1) that counts as material changing hands. */
const MATERIAL_THRESHOLD = 2;
/** Below this the user was already lost; at or above WON_WIN they were still winning. */
const LOST_WIN = 10;
const WON_WIN = 90;
/** Win percentage that counts as clearly winning (or, mirrored, clearly losing). */
const CLEAR_WIN = 85;
const CLEAR_LOSS = 15;

const isMateFor = (evaluation: Evaluation, color: PlayerColor) =>
  evaluation.kind === "mate" && evaluation.winner === color;

/**
 * Whether a move is reported as a leak, and how big.
 * Moves made when already lost are ignored unless they allowed a new forced mate,
 * and moves that leave the user still completely winning are ignored.
 */
export function reportableSeverity(
  move: Pick<MoveStat, "winBefore" | "winAfter" | "drop">,
  allowedNewMate: boolean,
): Leak["severity"] | null {
  if (move.drop < MISTAKE_DROP) return null;
  if (move.winBefore < LOST_WIN && !allowedNewMate) return null;
  if (move.winAfter >= WON_WIN) return null;
  return move.drop >= BLUNDER_DROP ? "blunder" : "mistake";
}

/** Material balance (pawn = 1) from `color`'s point of view. */
function materialBalance(chess: Chess, color: PlayerColor): number {
  const own = playerTurn(color);
  let balance = 0;
  for (const rank of chess.board())
    for (const piece of rank)
      if (piece) balance += (piece.color === own ? 1 : -1) * MATERIAL_VALUES[piece.type];
  return balance;
}

/**
 * Plays up to MATERIAL_PLIES moves from `fen`, stopping at the line's end or at the first illegal move.
 * When the cut falls in the middle of an exchange, the line's own recaptures on that square are played
 * too, so a piece taken on the last ply and won straight back is not counted as lost.
 * (Playing on through every later capture was tried on real games and made labels worse: the engine's
 * moves deep in a line are its least reliable, and they add material changes that never happen.)
 */
function playOut(fen: string, moves: string[]): Chess {
  const chess = new Chess(fen);
  let last: Move | null = null;
  for (let index = 0; index < moves.length; index++) {
    if (index >= MATERIAL_PLIES && !(last?.captured && moves[index].slice(2, 4) === last.to)) break;
    try {
      last = applyUci(chess, moves[index]);
    } catch {
      break;
    }
  }
  return chess;
}

function categorise(
  before: Evaluation,
  after: Evaluation,
  color: PlayerColor,
  startMaterial: number,
  bestMaterial: number,
  playedMaterial: number,
): LeakCategory {
  const opponent = opponentColor(color);
  if (isMateFor(before, color) && !isMateFor(after, color)) return "missed-mate";
  if (isMateFor(after, opponent) && !isMateFor(before, opponent)) return "allowed-mate";
  const swing = bestMaterial - playedMaterial;
  if (swing < MATERIAL_THRESHOLD) return "quiet-mistake";
  // The engine's own scores say how much better the best move is (in pawns). When they show less than
  // half the material the lines claim, the material is a sacrifice paid back with an attack, not won.
  if (before.kind === "cp" && after.kind === "cp") {
    const gap = ((before.value - after.value) * (color === "white" ? 1 : -1)) / 100;
    if (gap < swing / 2) return "quiet-mistake";
  }
  // Name the bigger half of the swing: what the move gave away, or what the best move would have won.
  // A move that drops a pawn while missing a free piece is a missed piece, not hanging material.
  const lost = startMaterial - playedMaterial;
  const missed = bestMaterial - startMaterial;
  return lost >= missed ? "hung-material" : "missed-material";
}

function sameLength(analysis: GameAnalysis, positions: number) {
  return (
    analysis.evals.length === positions &&
    analysis.best.length === positions &&
    analysis.lines.length === positions &&
    analysis.depths.length === positions
  );
}

/** Reads one game's analysis from the user's side: every move they made, and their real mistakes. */
export function assessGame(game: ImportedGame, analysis: GameAnalysis): GameAssessment {
  if (analysis.gameId !== game.id)
    throw new Error(`The analysis for ${analysis.gameId} was paired with game ${game.id}.`);
  const replay = replayGame(game.pgn);
  const plies = replay.sans.length;
  if (plies !== game.plyCount)
    throw new Error(`Game ${game.id} has ${plies} moves in its PGN but records ${game.plyCount}.`);
  if (!sameLength(analysis, plies + 1))
    throw new Error(`The analysis of game ${game.id} does not cover its ${plies + 1} positions. It needs to be run again.`);
  if (game.clocks.length !== plies)
    throw new Error(`Game ${game.id} has ${game.clocks.length} clock readings for ${plies} moves.`);

  const color = game.userColor;
  const daily = game.timeClass === "daily";
  const troubleLine = Math.max(10, 0.1 * game.baseSec);
  const hastyLine = Math.max(2, 0.01 * game.baseSec);
  // "Played instantly with plenty of time left": a third of the starting clock, and never under 30 s.
  // Below that, moving fast is how a blitz game is meant to be played, not a lapse.
  const plentyLine = Math.max(30, game.baseSec / 3);
  const wins = analysis.evals.map((evaluation) => winPercent(evaluation, color));
  const moves: MoveStat[] = [];
  const leaks: Leak[] = [];

  for (let ply = 1; ply <= plies; ply++) {
    if (!isPlayerPly(ply, color)) continue;
    const fenBefore = replay.fens[ply - 1];
    const fenAfter = replay.fens[ply];
    const before = analysis.evals[ply - 1];
    const after = analysis.evals[ply];
    const winBefore = wins[ply - 1];
    const winAfter = wins[ply];
    const drop = Math.max(0, winBefore - winAfter);

    // chess.com's daily [%clk] values are not a running clock, and an unreadable time control
    // (baseSec 0) gives no starting clock, so neither is turned into seconds.
    const clockAfter = daily ? null : game.clocks[ply - 1];
    const clockBefore = ply <= 2 ? (game.baseSec > 0 ? game.baseSec : null) : game.clocks[ply - 3];
    const clocksKnown = clockAfter !== null && clockBefore !== null && Number.isFinite(clockAfter) && Number.isFinite(clockBefore);
    const clockSec = clocksKnown ? clockBefore : null;
    const spentSec = clocksKnown ? Math.max(0, Math.round((clockBefore - clockAfter + game.incSec) * 10) / 10) : null;

    const stat: MoveStat = { ply, phase: phaseForPosition(ply, fenBefore), winBefore, winAfter, drop, clockSec, spentSec };
    moves.push(stat);

    const playedUci = replay.ucis[ply - 1];
    const bestUci = analysis.best[ply - 1];
    // The engine's own choice is never a leak, whatever the next search makes of it.
    if (playedUci === bestUci) continue;
    const allowedNewMate = isMateFor(after, opponentColor(color)) && !isMateFor(before, opponentColor(color));
    const severity = reportableSeverity(stat, allowedNewMate);
    if (!severity) continue;

    const board = new Chess(fenBefore);
    let bestSan: string;
    try {
      bestSan = applyUci(board, bestUci).san;
    } catch {
      throw new Error(`The analysis of game ${game.id} has no legal best move before ply ${ply}. It needs to be run again.`);
    }
    const engineLine = analysis.lines[ply - 1];
    const bestMoves = engineLine[0] === bestUci ? engineLine : [bestUci];
    const replyMoves = analysis.lines[ply];

    const startMaterial = materialBalance(new Chess(fenBefore), color);
    const bestMaterial = materialBalance(playOut(fenBefore, bestMoves), color);
    const playedMaterial = materialBalance(playOut(fenBefore, [playedUci, ...replyMoves]), color);
    const materialSwing = bestMaterial - playedMaterial;

    const timeTrouble = !daily && clockSec !== null && clockSec <= troubleLine;
    const hasty =
      !daily && clockSec !== null && spentSec !== null && clockSec >= plentyLine && ply > 16 && spentSec <= hastyLine;

    leaks.push({
      id: `${game.id}:${ply}`,
      gameId: game.id,
      ply,
      moveNumber: Math.ceil(ply / 2),
      userColor: color,
      phase: stat.phase,
      category: categorise(before, after, color, startMaterial, bestMaterial, playedMaterial),
      severity,
      winBefore,
      winAfter,
      drop,
      fenBefore,
      fenAfter,
      playedSan: replay.sans[ply - 1],
      playedUci,
      bestSan,
      bestUci,
      bestLine: legalLine(fenBefore, bestMoves, bestMoves.length),
      refutation: legalLine(fenAfter, replyMoves, replyMoves.length),
      materialSwing,
      clockSec,
      spentSec,
      timeTrouble,
      hasty,
    });
  }

  // Judge the game on positions where the user was to move, plus the final position.
  const judged = wins.filter((_, index) => index === plies || (index < plies && isPlayerPly(index + 1, color)));
  const clearlyWinning = judged.filter((win) => win >= CLEAR_WIN).length >= 2;
  const clearlyLosing = judged.filter((win) => win <= CLEAR_LOSS).length >= 2;
  return {
    gameId: game.id,
    moves,
    leaks,
    peakWin: Math.max(...wins),
    lowWin: Math.min(...wins),
    clearlyWinning,
    clearlyLosing,
    blownWin: game.outcome !== "win" && clearlyWinning,
    savedGame: game.outcome !== "loss" && clearlyLosing,
  };
}
