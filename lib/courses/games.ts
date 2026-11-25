import { openInsightsStore } from "@/lib/insights/store";
import type { ImportedGame } from "@/lib/insights/types";
import { playedGame, type PlayedGame } from "./personal";

export interface ImportedGames {
  /** As stored by Your leaks. */
  raw: ImportedGame[];
  /** The same games' openings, replayed (unreadable games dropped). */
  played: PlayedGame[];
}

/** Replays are kept for the page's life, so moving between courses does not replay every game again. */
const replays = new Map<string, PlayedGame | null>();

/**
 * The learner's imported chess.com games (browser only). An unavailable database reads as no
 * games: Your leaks is where storage problems are explained.
 */
export async function readImportedGames(): Promise<ImportedGames> {
  let raw: ImportedGame[] = [];
  try {
    const store = await openInsightsStore();
    try {
      raw = await store.listGames();
    } finally {
      store.close();
    }
  } catch {
    return { raw: [], played: [] };
  }
  const played: PlayedGame[] = [];
  for (const game of raw) {
    if (!replays.has(game.id)) replays.set(game.id, playedGame(game));
    const replay = replays.get(game.id);
    if (replay) played.push(replay);
  }
  return { raw, played };
}
