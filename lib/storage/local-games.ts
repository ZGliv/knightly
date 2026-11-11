import type { SavedGame } from "@/types/game";
import { validateGame } from "@/lib/chess/game-record";
export const GAMES_KEY = "buddymine_games_v1";
const BACKUP_KEY = "buddymine_games_previous";
const ACTIVE_KEY = "buddymine_active_game";
export function listGamesLocal(): SavedGame[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(GAMES_KEY);
  if (!raw) return [];
  try {
    const values: unknown = JSON.parse(raw);
    if (!Array.isArray(values) || values.length > 1000) throw new Error();
    return values
      .map(validateGame)
      .sort((a, b) =>
        (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt),
      );
  } catch {
    throw new Error(
      "Your saved library could not be read. It has not been overwritten. Open Your games to restore the previous browser snapshot if one is available.",
    );
  }
}
export function saveGameLocal(game: SavedGame) {
  const games = listGamesLocal();
  const next = [validateGame(game), ...games.filter((g) => g.id !== game.id)];
  writeGames(next);
}
function writeGames(games: SavedGame[]) {
  if (games.length > 1000)
    throw new Error(
      "Library limit reached (1,000 games). Your existing games are preserved.",
    );
  const previous = localStorage.getItem(GAMES_KEY);
  try {
    if (previous) localStorage.setItem(BACKUP_KEY, previous);
    localStorage.setItem(GAMES_KEY, JSON.stringify(games));
  } catch {
    throw new Error(
      "This browser could not save the game (storage is full or blocked). Keep this page open; the current position remains here until you reload.",
    );
  }
}
export function getGameLocal(id: string) {
  return listGamesLocal().find((g) => g.id === id) ?? null;
}
export function setActiveGame(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}
export function getActiveGame() {
  const id = localStorage.getItem(ACTIVE_KEY);
  return id ? getGameLocal(id) : null;
}
export function exportGames() {
  return JSON.stringify(
    {
      app: "BuddyMine",
      version: 1,
      exportedAt: new Date().toISOString(),
      games: listGamesLocal(),
    },
    null,
    2,
  );
}
export function rawBackup() {
  return localStorage.getItem(GAMES_KEY) ?? "[]";
}
export function restorePrevious() {
  const raw = localStorage.getItem(BACKUP_KEY);
  if (!raw)
    throw new Error(
      "No previous browser snapshot is available. The unreadable library has been preserved.",
    );
  const games: unknown = JSON.parse(raw);
  if (!Array.isArray(games)) throw new Error("Previous snapshot is invalid.");
  const validated = games.map(validateGame);
  // Explicit user recovery only; preserve the unreadable original separately first.
  const current = localStorage.getItem(GAMES_KEY);
  if (current) localStorage.setItem("buddymine_recovery_original", current);
  localStorage.setItem(GAMES_KEY, JSON.stringify(validated));
}
export function importGames(raw: string) {
  if (raw.length > 8000000)
    throw new Error("Backup is too large (8 MB maximum).");
  const parsed = JSON.parse(raw);
  const values = Array.isArray(parsed)
    ? parsed
    : parsed?.app === "BuddyMine" && parsed.version === 1
      ? parsed.games
      : null;
  if (!Array.isArray(values) || !values.length || values.length > 1000)
    throw new Error("Choose a Knightly or legacy BuddyMine backup with 1–1,000 games.");
  const incoming = values.map(validateGame);
  const existing = listGamesLocal();
  const merged = new Map(existing.map((g) => [g.id, g]));
  let count = 0;
  for (const game of incoming) {
    // Never replace a local game with an older or conflicting imported version.
    if (merged.has(game.id)) continue;
    merged.set(game.id, game);
    count++;
  }
  writeGames([...merged.values()]);
  return count;
}
export function downloadFile(
  filename: string,
  contents: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
