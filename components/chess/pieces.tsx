import Image from "next/image";
import type { PieceRenderObject } from "react-chessboard";
const names: Record<string, string> = {
  P: "pawn",
  N: "knight",
  B: "bishop",
  R: "rook",
  Q: "queen",
  K: "king",
};
export const NEO_PIECES: PieceRenderObject = Object.fromEntries(
  ["w", "b"].flatMap((color) =>
    Object.keys(names).map((piece) => [
      color + piece,
      function NeoPiece() {
        return (
          <Image
            src={`/pieces/neo/${color}${piece}.png`}
            alt={`${color === "w" ? "White" : "Black"} ${names[piece]}`}
            width={150}
            height={150}
            unoptimized
            loading="eager"
            draggable={false}
            style={{ width: "100%", height: "100%", pointerEvents: "none" }}
          />
        );
      },
    ]),
  ),
);
