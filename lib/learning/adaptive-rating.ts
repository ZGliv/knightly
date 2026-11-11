import { hasHumanPolicy } from "@/lib/engine/strength";
import { Chess } from "chess.js";
import type { SavedGame } from "@/types/game";
export const TRAINING_KEY = "knightly_training_v1";
export const ASSISTANCE_KEY = "knightly_assisted_games_v1";
export type TrainingSettings = {
  version: 1;
  mode: "auto" | "manual";
  seed: number;
  manualElo?: number;
};
export const defaultTraining: TrainingSettings = {
  version: 1,
  mode: "auto",
  seed: 800,
  manualElo: 800,
};
export function readTraining(): TrainingSettings {
  const raw = localStorage.getItem(TRAINING_KEY);
  if (!raw) return { ...defaultTraining };
  const data = JSON.parse(raw);
  if (
    data?.version !== 1 ||
    !["auto", "manual"].includes(data.mode) ||
    !Number.isInteger(data.seed) ||
    data.seed < 400 ||
    data.seed > 2400 ||
    (data.manualElo !== undefined &&
      (!Number.isInteger(data.manualElo) ||
        data.manualElo < 400 ||
        data.manualElo > 3190))
  )
    throw Error(
      "Difficulty preferences could not be read. They have been preserved.",
    );
  return { ...data, manualElo: data.manualElo ?? 800 };
}
export function setTrainingMode(mode: TrainingSettings["mode"], elo?: number) {
  if (elo !== undefined && (!Number.isInteger(elo) || elo < 400 || elo > 3190))
    throw Error("Choose a valid opponent Elo.");
  const next = {
    ...readTraining(),
    mode,
    ...(elo === undefined ? {} : { manualElo: elo }),
  };
  localStorage.setItem(TRAINING_KEY, JSON.stringify(next));
  return next;
}
export function readAssistedGames(): string[] {
  const raw = localStorage.getItem(ASSISTANCE_KEY);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (
    !Array.isArray(data) ||
    data.length > 1000 ||
    data.some((id) => typeof id !== "string")
  )
    throw Error(
      "Assistance history is unavailable. Automatic level updates are paused.",
    );
  return data;
}
export function markGameAssisted(id: string) {
  const prior = readAssistedGames();
  if (!prior.includes(id))
    localStorage.setItem(
      ASSISTANCE_KEY,
      JSON.stringify([...prior, id].slice(-1000)),
    );
}
const clamp = (n: number) => Math.max(400, Math.min(2400, n));
/** A local opponent-matching estimate. Engine labels are not a calibrated human rating pool. */
export function estimateLevel(
  games: SavedGame[],
  assisted: string[],
  seed = 800,
) {
  let estimate = clamp(seed);
  const evidence: {
    id: string;
    color: string;
    opponent: number;
    score: number;
    before: number;
    after: number;
  }[] = [];
  const excluded = {
    unfinished: 0,
    unknown: 0,
    assisted: 0,
    changed: 0,
    short: 0,
    duplicate: 0,
  };
  const seen = new Set<string>();
  for (const game of [...games].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  )) {
    if (game.result === "*") {
      excluded.unfinished++;
      continue;
    }
    if (
      !game.training ||
      game.training.origin !== "engine" ||
      game.engineElo === undefined ||
      !hasHumanPolicy(game)
    ) {
      excluded.unknown++;
      continue;
    }
    if (assisted.includes(game.id)) {
      excluded.assisted++;
      continue;
    }
    if (game.training.changed || game.engineElo !== game.training.initialElo) {
      excluded.changed++;
      continue;
    }
    const board = new Chess();
    try {
      board.loadPgn(game.pgn);
    } catch {
      excluded.unknown++;
      continue;
    }
    const ownMoves = game.moves.filter(
      (move) => move.ply % 2 === (game.playerColor === "white" ? 1 : 0),
    ).length;
    if (ownMoves < 8 && !board.isCheckmate()) {
      excluded.short++;
      continue;
    }
    const signature =
      game.playerColor + ":" + game.moves.map((m) => m.uci).join(" ");
    if (seen.has(signature)) {
      excluded.duplicate++;
      continue;
    }
    seen.add(signature);
    const score =
      game.result === "1/2-1/2"
        ? 0.5
        : game.result === (game.playerColor === "white" ? "1-0" : "0-1")
          ? 1
          : 0;
    const expected =
      1 / (1 + 10 ** ((game.training.initialElo - estimate) / 400));
    const before = estimate;
    const k = evidence.length < 5 ? 100 : 60;
    estimate = clamp(
      estimate + Math.max(-50, Math.min(50, k * (score - expected))),
    );
    evidence.push({
      id: game.id,
      color: game.playerColor,
      opponent: game.training.initialElo,
      score,
      before: Math.round(before),
      after: Math.round(estimate),
    });
  }
  const rounded = Math.round(estimate / 50) * 50;
  const spread = evidence.length < 5 ? 250 : evidence.length < 15 ? 200 : 150;
  return {
    estimate: rounded,
    opponent: rounded,
    range: [clamp(rounded - spread), clamp(rounded + spread)],
    evidence,
    excluded,
    provisional: evidence.length < 5,
  };
}
