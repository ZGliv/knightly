"use client";
import { useEffect, useState } from "react";
import { readImportedGames, type ImportedGames } from "@/lib/courses/games";

/** The learner's imported chess.com games; null while loading. No games (or no database) reads as empty lists. */
export function useImportedGames(): ImportedGames | null {
  const [games, setGames] = useState<ImportedGames | null>(null);
  useEffect(() => {
    let live = true;
    void readImportedGames().then((g) => {
      if (live) setGames(g);
    });
    return () => {
      live = false;
    };
  }, []);
  return games;
}
