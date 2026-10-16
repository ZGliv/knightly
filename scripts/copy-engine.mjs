import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("public/engine", { recursive: true });
for (const name of [
  "stockfish-18-lite-single.js",
  "stockfish-18-lite-single.wasm",
])
  copyFileSync(`node_modules/stockfish/bin/${name}`, `public/engine/${name}`);
copyFileSync("node_modules/stockfish/Copying.txt", "public/engine/COPYING.txt");
