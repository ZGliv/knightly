import { Chess, type Color, type Square } from "chess.js";
const names: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
export function positionIdeas(board: Chess) {
  if (board.isCheckmate())
    return ["The king is checkmated: no legal reply escapes check."];
  if (board.isDraw())
    return [
      "This position is drawn under the game’s current rules and history.",
    ];
  const side = board.turn(),
    enemy: Color = side === "w" ? "b" : "w",
    moves = board.moves({ verbose: true }),
    ideas: string[] = [];
  if (board.isCheck())
    ideas.push(
      "Your king is in check. Compare capturing the checker, blocking the line, and moving the king; only legal escapes count.",
    );
  const exposed = board
    .board()
    .flat()
    .filter(
      (piece) =>
        piece &&
        piece.color === side &&
        piece.type !== "k" &&
        piece.type !== "p" &&
        board.isAttacked(piece.square, enemy),
    )
    .sort(
      (a, b) =>
        ({ q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 })[b!.type] -
        { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 }[a!.type],
    );
  if (exposed[0])
    ideas.push(
      `Your ${names[exposed[0].type]} on ${exposed[0].square} is attacked. Check whether it can be captured safely before starting another plan.`,
    );
  const home = side === "w" ? "1" : "8";
  const undeveloped = ["b", "c", "f", "g"].filter((file) => {
    const piece = board.get((file + home) as Square);
    return piece?.color === side && ["n", "b"].includes(piece.type);
  });
  if (undeveloped.length >= 2)
    ideas.push(
      `${undeveloped.length} minor pieces are still on their starting squares. Look for development that controls the center or creates a threat.`,
    );
  if (moves.some((move) => move.isKingsideCastle() || move.isQueensideCastle()))
    ideas.push(
      "Castling is legal here. Compare the king’s safety before and after moving it away from the center.",
    );
  const captures = moves.filter((move) => move.captured);
  if (captures.length)
    ideas.push(
      `There ${captures.length === 1 ? "is 1 legal capture" : `are ${captures.length} legal captures`}. Calculate the opponent’s recapture before choosing one.`,
    );
  const nonPawns = board
    .board()
    .flat()
    .filter((piece) => piece && !["k", "p"].includes(piece.type)).length;
  if (nonPawns <= 4)
    ideas.push(
      "With fewer pieces on the board, king activity and passed pawns matter more. Find a safe route for your king and count promotion moves.",
    );
  if (!ideas.length)
    ideas.push(
      "Compare checks, captures, and the opponent’s immediate threats. If nothing is forcing, improve your least active piece.",
    );
  return ideas.slice(0, 3);
}
export function readableLine(fen: string, moves: string[], limit = 6) {
  const board = new Chess(fen),
    line: string[] = [];
  for (const uci of moves.slice(0, limit)) {
    try {
      const number = board.moveNumber(),
        side = board.turn();
      const move = board.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      });
      line.push(`${number}${side === "w" ? "." : "…"} ${move.san}`);
    } catch {
      break;
    }
  }
  return line;
}
