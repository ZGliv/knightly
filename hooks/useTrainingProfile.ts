"use client";
import { useCallback, useEffect, useState } from "react";
import type { SavedGame } from "@/types/game";
import { listGamesLocal } from "@/lib/storage/local-games";
import {
  defaultTraining,
  estimateLevel,
  markGameAssisted,
  readAssistedGames,
  readTraining,
  setTrainingMode,
  type TrainingSettings,
} from "@/lib/learning/adaptive-rating";
export function useTrainingProfile(game: SavedGame | null) {
  const [settings, setSettings] = useState(defaultTraining);
  const [profile, setProfile] = useState(() => estimateLevel([], []));
  const [error, setError] = useState("");
  const refresh = useCallback(() => {
    try {
      const next = readTraining();
      setSettings(next);
      setProfile(
        estimateLevel(listGamesLocal(), readAssistedGames(), next.seed),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh, game?.id, game?.result]);
  function chooseMode(mode: TrainingSettings["mode"], elo?: number) {
    try {
      setSettings(setTrainingMode(mode, elo));
      setError("");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  const assisted = useCallback((id: string) => {
    try {
      markGameAssisted(id);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  return { settings, profile, error, chooseMode, assisted };
}
