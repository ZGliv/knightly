import Image from "next/image";
import type { Color, PieceSymbol } from "chess.js";
const names: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
export function CapturedPieces({
  by,
  pieces,
  balance,
}: {
  by: Color;
  pieces: PieceSymbol[];
  balance: number;
}) {
  const color = by === "w" ? "White" : "Black";
  const count = [...new Set(pieces)]
    .map(
      (piece) =>
        `${pieces.filter((p) => p === piece).length} ${names[piece]}${pieces.filter((p) => p === piece).length > 1 ? "s" : ""}`,
    )
    .join(", ");
  const signed = balance > 0 ? `+${balance}` : String(balance);
  return (
    <div
      className="captured-pieces"
      aria-label={`${color} captured ${count || "no pieces"}. Material ${signed}.`}
      title="Material: pawn 1, knight/bishop 3, rook 5, queen 9. Promotions are included in the balance."
    >
      <span className="captured-icons" aria-hidden="true">
        {pieces.map((piece, index) => (
          <Image
            key={index}
            src={`/pieces/neo/${by === "w" ? "b" : "w"}${piece.toUpperCase()}.png`}
            alt=""
            width={24}
            height={24}
            unoptimized
            draggable={false}
          />
        ))}
      </span>
      <span
        className={`material-balance ${balance > 0 ? "ahead" : balance < 0 ? "behind" : ""}`}
      >
        {balance === 0 ? "=" : signed}
      </span>
    </div>
  );
}
