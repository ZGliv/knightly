import type { SavedGame } from '@/types/game';
export type EngineStrength = number | { elo: number };
export const ELO_PRESETS = [400,600,800,1000,1200,1400,1600,1800,2000,2200,2400];
export const DEFAULT_ELO = 800;
export const MAX_ELO = 3190; // Preserve existing custom targets in saved games.
export const HUMAN_POLICY = 'maia3-5m-v2' as const;
export function humanOpponent(elo: number | undefined) {
  return elo !== undefined && Number.isInteger(elo) && elo >= 400 && elo <= MAX_ELO;
}
export function opponentName() { return 'Maia'; }

/** v1 used Maia only below 1320. Never relabel its higher-rated Stockfish games. */
export function hasHumanPolicy(game: {engineElo?:number;training?:{policy?:string}}) {
  return humanOpponent(game.engineElo) && (game.training?.policy === HUMAN_POLICY ||
    (game.training?.policy === 'maia3-5m-v1' && game.engineElo! < 1320));
}
export function recordedOpponentName(game: {engineElo?:number;training?:{policy?:string}}) {
  return hasHumanPolicy(game) ? 'Maia' : 'Stockfish';
}

/** Call only after a successful opponent reply. Legacy skill is not a human Elo. */
export function continueWithMaia(game: SavedGame): SavedGame {
  const elo = game.engineElo ?? DEFAULT_ELO;
  return {...game,engineElo:elo,training:{
    origin:'engine',initialElo:game.training?.initialElo ?? elo,
    changed:game.training?.changed === true || !hasHumanPolicy(game),
    policy:HUMAN_POLICY,
  }};
}

/** Numeric requests are analysis. Every rated opponent request belongs to Maia. */
export function strengthCommands(strength: EngineStrength) {
  if (typeof strength !== 'number') throw new Error('Opponent difficulty must use Maia.');
  return [
    'setoption name UCI_LimitStrength value false',
    `setoption name Skill Level value ${Math.max(0,Math.min(20,strength))}`,
    'setoption name MultiPV value 1',
  ];
}
