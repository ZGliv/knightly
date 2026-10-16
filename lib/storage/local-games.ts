/*
 * File: lib/storage/local-games.ts
 * Description: Handles localStorage persistence for saved games and stable anonymous client identity.
 * Functions:
 * - getClientId: Returns a stable anonymous id for the current browser.
 * - saveGameLocal: Saves a game to localStorage.
 * - listGamesLocal: Lists saved games sorted by newest first.
 * - getGameLocal: Fetches one game by id.
 */

import type { SavedGame } from "@/types/game";

const CLIENT_ID_KEY = "buddymine_client_id";
const GAMES_KEY = "buddymine_games_v1";

export function getClientId(): string {
  if (typeof window === "undefined") return "server";

  // This reuses the same id across sessions for lightweight profile continuity.
  const existing = localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;

  const newId = crypto.randomUUID();
  localStorage.setItem(CLIENT_ID_KEY, newId);
  return newId;
}

export function listGamesLocal(): SavedGame[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(GAMES_KEY);
  if (!raw) return [];

  try {
    const games = JSON.parse(raw) as SavedGame[];
    return games.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export function saveGameLocal(game: SavedGame): void {
  if (typeof window === "undefined") return;

  // This prepends new games so recents render instantly.
  const existing = listGamesLocal().filter((item) => item.id !== game.id);
  const next = [game, ...existing];
  localStorage.setItem(GAMES_KEY, JSON.stringify(next));
}

export function getGameLocal(id: string): SavedGame | null {
  const games = listGamesLocal();
  return games.find((game) => game.id === id) ?? null;
}
