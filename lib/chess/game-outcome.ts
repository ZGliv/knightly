import { recordedOpponentName } from "@/lib/engine/strength";
import type { Chess } from "chess.js";
import type { SavedGame } from "@/types/game";

export function gameOutcome(game: Pick<SavedGame, "result" | "playerColor" | "training" | "engineElo">, chess: Chess) {
  const draw = game.result === "1/2-1/2";
  const won = game.result === (game.playerColor === "white" ? "1-0" : "0-1");
  const reason = chess.isCheckmate() ? "Checkmate"
    : chess.isStalemate() ? "Stalemate"
    : chess.isInsufficientMaterial() ? "Insufficient material"
    : chess.isThreefoldRepetition() ? "Threefold repetition"
    : chess.isDrawByFiftyMoves() ? "Fifty-move rule"
    : draw ? "Draw" : game.training?.origin === "engine" ? "Resignation" : "Game ended";
  return { title: draw ? "Draw" : won ? "You won" : `${recordedOpponentName(game)} won`, reason, won, draw };
}
