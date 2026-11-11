/*
 * File: components/chess/ChessBoard.tsx
 * Description: Renders the interactive chessboard and relays drag-drop move attempts to gameplay logic.
 * Functions:
 * - ChessBoard: Displays board state and handles user piece drops.
 */

"use client";

import { type CSSProperties, useMemo, useState } from "react";
import { NEO_PIECES } from "./pieces";
import { Chessboard } from "react-chessboard";

interface ChessBoardProps {
  fen: string;
  playerColor: "white" | "black";
  activeColor: "white" | "black";
  orientation?: "white" | "black";
  canInteract: boolean;
  isMoveLegal: (from: string, to: string) => boolean;
  getLegalTargets: (from: string) => string[];
  suggestion?: string | null;
  lastMove?: string;
  onMove: (from: string, to: string, promotion?: string) => Promise<boolean>;
}

export function ChessBoard({
  fen,
  playerColor,
  activeColor,
  orientation,
  suggestion,
  lastMove,
  canInteract,
  isMoveLegal,
  getLegalTargets,
  onMove,
}: ChessBoardProps) {
  const [promotion, setPromotion] = useState("q");
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [highlightedTargets, setHighlightedTargets] = useState<string[]>([]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    if (lastMove)
      for (const square of [lastMove.slice(0, 2), lastMove.slice(2, 4)])
        styles[square] = { backgroundColor: "rgba(246,246,105,.65)" };

    // This styles the selected source square so the active piece is obvious.
    if (selectedSquare) {
      styles[selectedSquare] = {
        boxShadow: "inset 0 0 0 3px rgba(237, 205, 91, 0.95)",
      };
    }

    // This styles legal destination squares with a subtle green highlight.
    for (const target of highlightedTargets) {
      styles[target] = {
        ...(styles[target] ?? {}),
        boxShadow: "inset 0 0 0 3px rgba(16, 185, 129, 0.9)",
      };
    }

    return styles;
  }, [selectedSquare, highlightedTargets, lastMove]);

  return (
    <div className="chessboard-frame">
      {/* This provides an MVP-friendly board with custom dark-square contrast. */}
      <Chessboard
        options={{
          position: fen,
          pieces: NEO_PIECES,
          arrows: suggestion
            ? [
                {
                  startSquare: suggestion.slice(0, 2),
                  endSquare: suggestion.slice(2, 4),
                  color: "rgba(235,154,45,.85)",
                },
              ]
            : [],
          darkSquareNotationStyle: { color: "#eeeed2", fontWeight: 600 },
          lightSquareNotationStyle: { color: "#769656", fontWeight: 600 },
          boardOrientation: orientation ?? playerColor,
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!canInteract) return false;
            if (!targetSquare) return false;
            if (!isMoveLegal(sourceSquare, targetSquare)) return false;
            setSelectedSquare(null);
            setHighlightedTargets([]);
            void onMove(sourceSquare, targetSquare, promotion);
            return true;
          },
          onPieceClick: ({ piece, square }) => {
            // This is intentionally unused because onSquareClick handles selection reliably.
            void piece;
            void square;
          },
          onSquareClick: ({ piece, square }) => {
            // This handles click-to-highlight using square clicks (works for both piece and empty squares).
            if (!canInteract || !square) {
              setSelectedSquare(null);
              setHighlightedTargets([]);
              return;
            }

            if (selectedSquare && isMoveLegal(selectedSquare, square)) {
              void onMove(selectedSquare, square, promotion);
              setSelectedSquare(null);
              setHighlightedTargets([]);
              return;
            }

            if (piece) {
              const pieceColor = piece.pieceType.startsWith("w")
                ? "white"
                : "black";
              if (pieceColor === playerColor && activeColor === playerColor) {
                // This toggles the selected piece when clicked twice.
                if (selectedSquare === square) {
                  setSelectedSquare(null);
                  setHighlightedTargets([]);
                  return;
                }

                setSelectedSquare(square);
                setHighlightedTargets(getLegalTargets(square));
                return;
              }
            }

            // This clears visual hints when clicking empty squares or non-selectable pieces.
            setSelectedSquare(null);
            setHighlightedTargets([]);
          },
          canDragPiece: ({ piece }) => {
            // This limits dragging to the user's own pieces only on the user's turn.
            if (!canInteract) return false;
            const pieceColor = piece.pieceType.startsWith("w")
              ? "white"
              : "black";
            return pieceColor === playerColor && activeColor === playerColor;
          },
          squareStyles,
          darkSquareStyle: { backgroundColor: "var(--board-dark)" },
          lightSquareStyle: { backgroundColor: "var(--board-light)" },
          boardStyle: { borderRadius: "3px" },
          allowDragging: canInteract,
          animationDurationInMs: 180,
        }}
      />
      {canInteract && (
        <details className="board-options">
          <summary>Board controls</summary>
          <p>Tap a piece and a destination, or drag it.</p>
          <label>
            Promote pawns to
            <select
              aria-label="Promotion piece"
              value={promotion}
              onChange={(e) => setPromotion(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-950 p-2 text-zinc-100"
            >
              <option value="q">Queen</option>
              <option value="r">Rook</option>
              <option value="b">Bishop</option>
              <option value="n">Knight</option>
            </select>
          </label>
        </details>
      )}
    </div>
  );
}
