import { mkdirSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultPieces } from "react-chessboard";
// Reuse the board library's piece artwork for lightweight library diagrams.
mkdirSync("public/pieces", { recursive: true });
for (const [name, Piece] of Object.entries(defaultPieces)) {
  writeFileSync(
    `public/pieces/${name}.svg`,
    renderToStaticMarkup(createElement(Piece)),
  );
}
