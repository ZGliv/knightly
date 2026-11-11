import type { Chess, Color, PieceSymbol } from "chess.js";
export const MATERIAL_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};
export function materialSnapshot(board: Chess) {
  const captured: Record<Color, PieceSymbol[]> = { w: [], b: [] };
  for (const move of board.history({ verbose: true }))
    if (move.captured) captured[move.color].push(move.captured);
  const totals = { w: 0, b: 0 };
  for (const rank of board.board())
    for (const piece of rank)
      if (piece) totals[piece.color] += MATERIAL_VALUES[piece.type];
  for (const side of ["w", "b"] as const)
    captured[side].sort((a, b) => MATERIAL_VALUES[a] - MATERIAL_VALUES[b]);
  return {
    captured,
    balance: { w: totals.w - totals.b, b: totals.b - totals.w },
    totals,
  };
}
