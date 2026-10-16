import { Chess, DEFAULT_POSITION } from "chess.js";
import type { SavedGame, ClassifiedMove, GameResult } from "@/types/game";
import { classifyMove } from "./classification";
import { generateReview } from "./review-generator";

export function resultOf(chess: Chess): GameResult {
  if (chess.isCheckmate()) return chess.turn() === "w" ? "0-1" : "1-0";
  return chess.isDraw() ? "1/2-1/2" : "*";
}
export function loadChess(game: SavedGame) {
  const chess = new Chess();
  chess.loadPgn(game.pgn);
  return chess;
}
export function recordGame(
  chess: Chess,
  base?: SavedGame,
  annotations: ClassifiedMove[] = [],
  result?: GameResult,
): SavedGame {
  const now = new Date().toISOString();
  const outcome = result ?? resultOf(chess);
  const headers = chess.getHeaders();
  for (const [key, value] of Object.entries({
    Event:
      headers.Event && headers.Event !== "?"
        ? headers.Event
        : "BuddyMine practice",
    White: headers.White && headers.White !== "?" ? headers.White : "Player",
    Black:
      headers.Black && headers.Black !== "?" ? headers.Black : "Stockfish 18",
    Result: outcome,
  }))
    chess.setHeader(key, value);
  const moves = chess
    .history({ verbose: true })
    .map((m, i) => ({
      ...annotations[i],
      ply: i + 1,
      san: m.san,
      uci: m.from + m.to + (m.promotion ?? ""),
      fenAfter: m.after,
      evalCp: annotations[i]?.evalCp ?? null,
    }));
  const summary = generateReview(moves, outcome);
  return {
    id: base?.id ?? crypto.randomUUID(),
    clientId: base?.clientId ?? "local",
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
    playerColor: "white",
    engineLevel: base?.engineLevel ?? 7,
    result: outcome,
    openingName: summary.openingName,
    pgn: chess.pgn(),
    fenFinal: chess.fen(),
    moves,
    summary,
  };
}
export function importPgn(pgn: string): SavedGame {
  if (pgn.length > 200000)
    throw new Error("PGN is too large. Import a single game under 200 KB.");
  const chess = new Chess();
  chess.loadPgn(pgn);
  if (
    chess.history({ verbose: true })[0]?.before !== DEFAULT_POSITION &&
    chess.history().length
  )
    throw new Error(
      "This version supports games from the standard starting position.",
    );
  if (chess.getHeaders().FEN && chess.getHeaders().FEN !== DEFAULT_POSITION)
    throw new Error("Custom starting positions are not supported yet.");
  if (!chess.history().length) throw new Error("This PGN contains no moves.");
  const declared = chess.getHeaders().Result;
  const result = ["1-0", "0-1", "1/2-1/2"].includes(declared)
    ? (declared as GameResult)
    : resultOf(chess);
  return recordGame(chess, undefined, [], result);
}
export function validateGame(value: unknown): SavedGame {
  if (!value || typeof value !== "object")
    throw new Error("Invalid game in backup.");
  const v = value as SavedGame;
  if (
    typeof v.id !== "string" ||
    !/^[\w-]{1,100}$/.test(v.id) ||
    typeof v.pgn !== "string" ||
    v.pgn.length > 200000 ||
    !Number.isFinite(Date.parse(v.createdAt))
  )
    throw new Error("Invalid game metadata in backup.");
  if (v.playerColor !== "white")
    throw new Error("Only games played as White are supported.");
  if (!["*", "1-0", "0-1", "1/2-1/2"].includes(v.result))
    throw new Error("Invalid game result.");
  const chess = new Chess();
  chess.loadPgn(v.pgn);
  if (chess.getHeaders().FEN && chess.getHeaders().FEN !== DEFAULT_POSITION)
    throw new Error("Custom starting positions are not supported.");
  if (chess.fen() !== v.fenFinal)
    throw new Error("A saved position does not match its legal move history.");
  if (chess.isGameOver() && v.result !== resultOf(chess))
    throw new Error("The result does not match the finished position.");
  const history = chess.history({ verbose: true });
  const annotations = history.map((m, i): ClassifiedMove => {
    const a = v.moves?.[i];
    const validAnalysis =
      a?.san === m.san &&
      a?.fenAfter === m.after &&
      Number.isFinite(a.cpLoss) &&
      a.cpLoss! >= 0 &&
      a.cpLoss! <= 200000;
    return {
      ply: i + 1,
      san: m.san,
      uci: m.from + m.to + (m.promotion ?? ""),
      fenAfter: m.after,
      evalCp: validAnalysis && Number.isFinite(a.evalCp) ? a.evalCp : null,
      ...(validAnalysis
        ? {
            cpLoss: a.cpLoss,
            classification: classifyMove(a.cpLoss!),
            coachText: String(a.coachText ?? "").slice(0, 1500),
            bestSan: String(a.bestSan ?? "").slice(0, 20),
            searchDepth: Number.isFinite(a.searchDepth)
              ? a.searchDepth
              : undefined,
            mateIn: Number.isFinite(a.mateIn) ? a.mateIn : null,
          }
        : a?.san === m.san && typeof a.coachText === "string"
          ? {
              coachText: a.coachText.startsWith("Legacy note (not reverified):")
                ? a.coachText.slice(0, 1500)
                : "Legacy note (not reverified): " + a.coachText.slice(0, 1450),
            }
          : {}),
    };
  });
  const normalized = recordGame(
    chess,
    {
      ...v,
      engineLevel: Number.isInteger(v.engineLevel)
        ? Math.max(1, Math.min(20, v.engineLevel))
        : 7,
    },
    annotations,
    v.result,
  );
  return {
    ...normalized,
    updatedAt:
      v.updatedAt && Number.isFinite(Date.parse(v.updatedAt))
        ? v.updatedAt
        : v.createdAt,
  };
}
