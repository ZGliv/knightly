import { Chess } from "chess.js";
import { TAG_ORDER, primaryGroup, type StructureGroup, type StructureTag } from "./structure";

export type Side = "white" | "black";

/** One grandmaster game, as written by scripts/build-master-games.mjs. */
export interface MasterGame {
  id: string;
  white: string;
  black: string;
  whiteElo: number | null;
  blackElo: number | null;
  event: string;
  year: number;
  result: "1-0" | "0-1";
  opening: string;
  eco: string;
  /** SAN moves from the starting position. */
  moves: string[];
  /** The side the user plays: the winner, who is always the named pro. */
  proSide: Side;
  pro: string;
  tags: StructureTag[];
  /** Where the game was broadcast. */
  source: string;
}

export interface MasterGamesFile {
  version: 1;
  generatedAt: string;
  source: string;
  games: MasterGame[];
}

/** Moves the app plays for both sides before the user starts guessing. */
export const AUTO_PLY = 16;

/**
 * Broadcasts write some names surname first or with an initial ("Gukesh D", "Erigaisi Arjun").
 * Known players get the name they are usually called by and a short name for compact lists.
 */
const KNOWN_PLAYERS: Record<string, { full: string; short: string }> = {
  "Gukesh D": { full: "Gukesh Dommaraju", short: "Gukesh" },
  "D Gukesh": { full: "Gukesh Dommaraju", short: "Gukesh" },
  "Erigaisi Arjun": { full: "Arjun Erigaisi", short: "Erigaisi" },
  "Arjun Erigaisi": { full: "Arjun Erigaisi", short: "Erigaisi" },
  "Liren Ding": { full: "Ding Liren", short: "Ding" },
  "Ding Liren": { full: "Ding Liren", short: "Ding" },
  "Jiner Zhu": { full: "Zhu Jiner", short: "Zhu" },
  "Zhu Jiner": { full: "Zhu Jiner", short: "Zhu" },
  "Praggnanandhaa R": { full: "R Praggnanandhaa", short: "Praggnanandhaa" },
  "R Praggnanandhaa": { full: "R Praggnanandhaa", short: "Praggnanandhaa" },
};

/** The name to show in full, e.g. "Arjun Erigaisi" for the broadcast's "Erigaisi Arjun". */
export const fullName = (name: string) => KNOWN_PLAYERS[name.trim()]?.full ?? name.trim();

/** The surname for compact lists. A one-letter initial is never used: "Gukesh D" gives "Gukesh". */
export function shortName(name: string): string {
  const known = KNOWN_PLAYERS[name.trim()];
  if (known) return known.short;
  const words = name.trim().split(/\s+/).filter((w) => w.replace(/\./g, "").length > 1);
  return words.at(-1) ?? name.trim();
}

export const fullMoves = (game: Pick<MasterGame, "moves">) => Math.ceil(game.moves.length / 2);
export const playerName = (game: MasterGame, side: Side) => (side === "white" ? game.white : game.black);
export const opponentName = (game: MasterGame) => playerName(game, game.proSide === "white" ? "black" : "white");

/** Number of moves the user is asked to guess in a game. */
export function guessCount(game: Pick<MasterGame, "moves" | "proSide">): number {
  const first = game.proSide === "white" ? 0 : 1;
  let count = 0;
  for (let ply = first; ply < game.moves.length; ply += 2) if (ply >= AUTO_PLY) count++;
  return count;
}

/** Checks a parsed games file, replaying every game; returns the games or throws with the reason. */
export function parseGamesFile(value: unknown): MasterGame[] {
  if (!value || typeof value !== "object") throw new Error("The games file is not an object.");
  const file = value as Partial<MasterGamesFile>;
  if (file.version !== 1 || !Array.isArray(file.games)) throw new Error("The games file has an unknown format.");
  for (const game of file.games) {
    const chess = new Chess();
    for (const san of game.moves) chess.move(san);
    if (game.result !== (game.proSide === "white" ? "1-0" : "0-1"))
      throw new Error(`Game ${game.id}: the guessing side did not win.`);
  }
  return file.games;
}

/** Games listed under each group, groups in display order, each group newest first. */
export function groupGames(games: MasterGame[], pro: string | null) {
  const groups = new Map<StructureGroup, MasterGame[]>();
  for (const game of games) {
    if (pro && game.pro !== pro) continue;
    const group = primaryGroup(game.tags);
    groups.set(group, [...(groups.get(group) ?? []), game]);
  }
  const order: StructureGroup[] = [...TAG_ORDER, "mixed"];
  return order
    .filter((group) => groups.has(group))
    .map((group) => ({
      group,
      games: groups.get(group)!.sort((a, b) => b.year - a.year || a.event.localeCompare(b.event)),
    }));
}

export function prosIn(games: MasterGame[]): string[] {
  return [...new Set(games.map((g) => g.pro))].sort();
}
