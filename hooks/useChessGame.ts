/*
 * File: hooks/useChessGame.ts
 * Description: Central gameplay hook that manages chess state, player moves, engine replies, and live move analysis.
 * Functions:
 * - useChessGame: Provides all gameplay state and actions for the play screen.
 */

"use client";

import { Chess, type Square } from "chess.js";
import { useRef, useState } from "react";
import { classifyMove } from "@/lib/chess/classification";
import { detectOpening } from "@/lib/chess/opening-detection";
import { buildGameSummary } from "@/lib/chess/review-generator";
import { explainEnginePlan, explainPlayerMove } from "@/lib/coach/explainer";
import { getPhaseForPly } from "@/lib/utils/phase";
import type {
  ClassifiedMove,
  GameResult,
  MoveClassification,
  PlayerColor,
} from "@/types/game";

interface AnalyzeResponse {
  bestMove: string;
  scoreCp: number;
  mateIn: number | null;
}

interface UseChessGameArgs {
  analyzePosition: (fen: string, depth?: number) => Promise<AnalyzeResponse>;
  onCoachMessage: (message: {
    ply: number;
    kind: "player-feedback" | "opponent-plan";
    title: string;
    classification?: MoveClassification;
    text: string;
  }) => void;
}

function opposite(color: PlayerColor): PlayerColor {
  return color === "white" ? "black" : "white";
}

function engineTurnColor(chess: Chess): PlayerColor {
  return chess.turn() === "w" ? "white" : "black";
}

function scoreFromPlayerPerspective(
  scoreCp: number,
  sideToMove: PlayerColor,
  playerColor: PlayerColor,
) {
  // This converts from side-to-move perspective to player perspective.
  const whitePerspective = sideToMove === "white" ? scoreCp : -scoreCp;
  return playerColor === "white" ? whitePerspective : -whitePerspective;
}

function deriveResult(chess: Chess): GameResult {
  if (!chess.isGameOver()) return "*";
  if (chess.isDraw()) return "1/2-1/2";
  if (!chess.isCheckmate()) return "*";

  // This identifies the winner as the side that just moved before mate.
  const sideToMove = chess.turn();
  return sideToMove === "w" ? "0-1" : "1-0";
}

function isSquare(value: string): value is Square {
  // This validates algebraic board coordinates before asking chess.js for legal moves.
  return /^[a-h][1-8]$/.test(value);
}

export function useChessGame({ analyzePosition, onCoachMessage }: UseChessGameArgs) {
  const chessRef = useRef(new Chess());
  const gameSessionRef = useRef(crypto.randomUUID());
  const moveInFlightRef = useRef(false);

  const [fen, setFen] = useState(chessRef.current.fen());
  const [moves, setMoves] = useState<ClassifiedMove[]>([]);
  const [thinking, setThinking] = useState(false);
  const [engineLevel, setEngineLevel] = useState(7);
  const [playerColor] = useState<PlayerColor>("white");
  const [error, setError] = useState<string | null>(null);

  const isGameOver = chessRef.current.isGameOver();

  function isMoveLegal(from: string, to: string): boolean {
    // This blocks moves while thinking or after game over to avoid illegal interaction.
    if (moveInFlightRef.current || thinking || isGameOver) return false;

    if (!isSquare(from) || !isSquare(to)) return false;

    const chess = chessRef.current;
    const activeColor = chess.turn() === "w" ? "white" : "black";
    if (activeColor !== playerColor) return false;
    const candidateMoves = chess.moves({ square: from, verbose: true });

    // This verifies the target square is legal for the selected piece.
    return candidateMoves.some((move) => move.to === to);
  }

  function getLegalTargets(from: string): string[] {
    // This returns legal destination squares for a selected source square.
    if (!isSquare(from)) return [];

    const chess = chessRef.current;
    const candidateMoves = chess.moves({ square: from, verbose: true });
    return candidateMoves.map((move) => move.to);
  }

  async function playPlayerMove(from: string, to: string, promotion = "q") {
    if (!isMoveLegal(from, to)) return false;
    moveInFlightRef.current = true;

    const chess = chessRef.current;
    const currentSession = gameSessionRef.current;
    const beforeFen = chess.fen();
    const beforeTurn = engineTurnColor(chess);

    let playerMove;
    try {
      // This applies the player's move and safely ignores invalid move attempts.
      playerMove = chess.move({ from, to, promotion });
    } catch {
      moveInFlightRef.current = false;
      return false;
    }
    if (!playerMove) {
      moveInFlightRef.current = false;
      return false;
    }

    setError(null);
    const playerFen = chess.fen();
    const ply = chess.history().length;
    const playerUci = `${playerMove.from}${playerMove.to}${playerMove.promotion ?? ""}`;

    const baseRecord: ClassifiedMove = {
      ply,
      san: playerMove.san,
      uci: playerUci,
      fenAfter: playerFen,
      evalCp: null,
    };

    // This immediately updates UI so the player sees responsive feedback.
    setMoves((current) => [...current, baseRecord]);
    setFen(playerFen);

    if (chess.isGameOver()) {
      moveInFlightRef.current = false;
      return true;
    }

    setThinking(true);

    try {
      // This evaluates best option before move and resulting position after move.
      const [bestBefore, afterPlayer] = await Promise.all([
        analyzePosition(beforeFen, engineLevel + 6),
        analyzePosition(playerFen, engineLevel + 6),
      ]);

      // This aborts stale async updates if a new session already started.
      if (currentSession !== gameSessionRef.current) return false;

      const bestEval = scoreFromPlayerPerspective(
        bestBefore.scoreCp,
        beforeTurn,
        playerColor,
      );
      const playedEval = scoreFromPlayerPerspective(
        afterPlayer.scoreCp,
        opposite(playerColor),
        playerColor,
      );
      const cpLoss = bestEval - playedEval;
      const classification = classifyMove(cpLoss);

      const pieceCount = playerFen
        .split("")
        .filter((char) => /[prnbqkPRNBQK]/.test(char)).length;
      const phase = getPhaseForPly(ply, pieceCount);
      const coachText = explainPlayerMove({
        classification,
        cpLoss,
        bestMoveUci: bestBefore.bestMove,
        phase,
      });

      // This enriches the latest player move with classification metadata.
      setMoves((current) => {
        if (current.length === 0) return current;
        const next = [...current];
        next[next.length - 1] = {
          ...next[next.length - 1],
          evalCp: playedEval,
          classification,
          coachText,
        };
        return next;
      });

      onCoachMessage({
        ply,
        kind: "player-feedback",
        title: "AI Coach feedback",
        classification,
        text: coachText,
      });

      // This applies engine best response in UCI format.
      const engineUci = afterPlayer.bestMove;
      const engineFrom = engineUci.slice(0, 2);
      const engineTo = engineUci.slice(2, 4);
      const enginePromotion = engineUci.slice(4, 5) || undefined;
      const engineMove = chess.move({
        from: engineFrom,
        to: engineTo,
        promotion: enginePromotion,
      });

      if (engineMove) {
        const enginePly = chess.history().length;
        const engineFenAfter = chess.fen();
        const enginePieceCount = engineFenAfter
          .split("")
          .filter((char) => /[prnbqkPRNBQK]/.test(char)).length;
        const enginePhase = getPhaseForPly(enginePly, enginePieceCount);
        const openingName = detectOpening(chess.history());
        const opponentPlanText = explainEnginePlan({
          openingName,
          engineMoveSan: engineMove.san,
          phase: enginePhase,
        });

        setMoves((current) => [
          ...current,
          {
            ply: enginePly,
            san: engineMove.san,
            uci: `${engineMove.from}${engineMove.to}${engineMove.promotion ?? ""}`,
            fenAfter: engineFenAfter,
            evalCp: -afterPlayer.scoreCp,
          },
        ]);
        setFen(engineFenAfter);

        // This adds a separate opponent-intent message so the coach feed explains both sides.
        onCoachMessage({
          ply: enginePly,
          kind: "opponent-plan",
          title: "Engine plan",
          text: opponentPlanText,
        });
      }
    } catch {
      // This keeps the game usable even if engine analysis fails temporarily.
      setError("Engine analysis failed. Please try another move.");
    } finally {
      setThinking(false);
      moveInFlightRef.current = false;
    }

    return true;
  }

  function resetGame() {
    // This resets all game state to begin a fresh session.
    chessRef.current = new Chess();
    gameSessionRef.current = crypto.randomUUID();
    setFen(chessRef.current.fen());
    setMoves([]);
    setThinking(false);
    setError(null);
  }

  function getReviewPayload() {
    const chess = chessRef.current;
    const sanMoves = chess.history();
    const openingName = detectOpening(sanMoves);
    const result = deriveResult(chess);
    const summary = buildGameSummary({
      result,
      openingName,
      moves: moves.filter((move) => move.classification),
    });

    return {
      result,
      openingName,
      pgn: chess.pgn(),
      fenFinal: chess.fen(),
      summary,
      moves,
    };
  }

  // This derives the side to move from the current chess state.
  const activeColor: PlayerColor =
    chessRef.current.turn() === "w" ? "white" : "black";

  return {
    fen,
    moves,
    thinking,
    playerColor,
    engineLevel,
    error,
    isGameOver,
    result: deriveResult(chessRef.current),
    openingName: detectOpening(chessRef.current.history()),
    activeColor,
    canInteract:
      !moveInFlightRef.current &&
      !thinking &&
      !isGameOver &&
      activeColor === playerColor,
    isMoveLegal,
    getLegalTargets,
    setEngineLevel,
    playPlayerMove,
    resetGame,
    getReviewPayload,
  };
}
