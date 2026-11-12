export const START_RATING = 1000;
export const MIN_PUZZLE_RATING = 100;

/** Chance of solving, by the standard Elo formula. */
export function expectedScore(rating: number, puzzleRating: number) {
  return 1 / (1 + 10 ** ((puzzleRating - rating) / 400));
}

/** K 32 while the rating is still settling (first 20 rated puzzles), then 16. */
export const kFactor = (ratedSoFar: number) => (ratedSoFar < 20 ? 32 : 16);

export function nextRating(rating: number, puzzleRating: number, solved: boolean, ratedSoFar: number) {
  const change = kFactor(ratedSoFar) * ((solved ? 1 : 0) - expectedScore(rating, puzzleRating));
  return Math.max(MIN_PUZZLE_RATING, Math.round(rating + change));
}

/** Average of the player's own rating across imported games, or 1000 when there is none. */
export function initialRating(games: { userColor: "white" | "black"; white: { rating: number | null }; black: { rating: number | null } }[]) {
  const own = games
    .map((g) => (g.userColor === "white" ? g.white.rating : g.black.rating))
    .filter((r): r is number => typeof r === "number" && Number.isFinite(r) && r > 0);
  if (!own.length) return START_RATING;
  return Math.round(own.reduce((a, b) => a + b, 0) / own.length);
}
