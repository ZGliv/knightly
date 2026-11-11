"use client";
import { memo } from "react";
import Image from "next/image";

/** A compact, non-interactive diagram of a real chess position. */
export const PositionPreview = memo(function PositionPreview({
  fen,
  color = "white",
  className = "",
}: {
  fen: string;
  color?: "white" | "black";
  className?: string;
}) {
  const pieces = new Map<string, string>();
  fen
    .split(" ")[0]
    .split("/")
    .forEach((rank, row) => {
      let file = 0;
      for (const piece of rank) {
        if (/\d/.test(piece)) file += Number(piece);
        else {
          pieces.set(
            "abcdefgh"[file++] + (8 - row),
            (piece === piece.toUpperCase() ? "w" : "b") + piece.toUpperCase(),
          );
        }
      }
    });
  const files = color === "white" ? "abcdefgh" : "hgfedcba";
  const ranks = color === "white" ? "87654321" : "12345678";
  return (
    <div className={`position-preview ${className}`} aria-hidden="true">
      {[...ranks].flatMap((rank, row) =>
        [...files].map((file, col) => {
          const name = pieces.get(file + rank);
          return (
            <span
              className={(row + col) % 2 ? "dark-square" : "light-square"}
              key={file + rank}
            >
              {name && (
                <Image
                  src={`/pieces/neo/${name}.png`}
                  alt=""
                  width={45}
                  height={45}
                  unoptimized
                  draggable={false}
                />
              )}
            </span>
          );
        }),
      )}
    </div>
  );
});
