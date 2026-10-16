/*
 * File: components/chess/ChessBoard.tsx
 * Description: Renders the interactive chessboard and relays drag-drop move attempts to gameplay logic.
 * Functions:
 * - ChessBoard: Displays board state and handles user piece drops.
 */

"use client";

import { type CSSProperties, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";

interface ChessBoardProps {
  fen: string;
  playerColor: "white" | "black";
  activeColor: "white" | "black";
  canInteract: boolean;
  isMoveLegal: (from: string, to: string) => boolean;
  getLegalTargets: (from: string) => string[];
  onMove: (from: string, to: string) => Promise<boolean>;
}

export function ChessBoard({
  fen,
  playerColor,
  activeColor,
  canInteract,
  isMoveLegal,
  getLegalTargets,
  onMove,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [highlightedTargets, setHighlightedTargets] = useState<string[]>([]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};

    // This styles the selected source square so the active piece is obvious.
    if (selectedSquare) {
      styles[selectedSquare] = {
        boxShadow: "inset 0 0 0 3px rgba(99, 102, 241, 0.9)",
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
  }, [selectedSquare, highlightedTargets]);

  return (
    <div className="w-full max-w-[580px] rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-2xl">
      {/* This provides an MVP-friendly board with custom dark-square contrast. */}
      <Chessboard
        options={{
          position: fen,
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!canInteract) return false;
            if (!targetSquare) return false;
            if (!isMoveLegal(sourceSquare, targetSquare)) return false;
            setSelectedSquare(null);
            setHighlightedTargets([]);
            void onMove(sourceSquare, targetSquare);
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

            if (piece) {
              const pieceColor =
                piece.pieceType.startsWith("w") ? "white" : "black";
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
            const pieceColor = piece.pieceType.startsWith("w") ? "white" : "black";
            return pieceColor === playerColor && activeColor === playerColor;
          },
          squareStyles,
          darkSquareStyle: { backgroundColor: "#3f3f46" },
          lightSquareStyle: { backgroundColor: "#d4d4d8" },
          boardStyle: { borderRadius: "10px" },
          allowDragging: canInteract,
          animationDurationInMs: 180,
        }}
      />
    </div>
  );
}
