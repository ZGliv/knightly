import { themeName } from "@/lib/puzzles/themes";

/** One concrete thing to do about the top leak. `href` is null for a plain tip. */
export interface Recommendation {
  text: string;
  href: string | null;
  action: string | null;
}

const puzzles = (theme: string, text: string): Recommendation => ({
  text,
  href: `/puzzles?theme=${theme}`,
  action: `${themeName(theme)} puzzles`,
});

const OPENINGS: Recommendation = {
  text: "Choose your moves in the positions you reach most often, then drill them until they are automatic.",
  href: "/openings",
  action: "Your openings",
};

/**
 * Maps a Your leaks headline (by its key, see lib/insights/report.ts) to a recommendation.
 * Keys: "category:<kind>", "time", "phase:<opening|middlegame|endgame>", "blown-wins",
 * "opening:<colour>:<family>".
 */
export function recommendFor(headlineKey: string): Recommendation {
  const [kind, detail] = headlineKey.split(":");
  if (kind === "category") {
    if (detail === "hung-material")
      return puzzles("hangingPiece", "Solve free-piece puzzles. Spotting your opponent's loose pieces trains you to see your own before you move.");
    if (detail === "missed-material")
      return puzzles("fork", "Solve fork puzzles to get used to spotting moves that win material.");
    if (detail === "missed-mate")
      return puzzles("mateIn2", "Solve mate-in-2 puzzles so you spot the finishing blow when it is there.");
    if (detail === "allowed-mate")
      return puzzles("mateIn2", "Solve mate-in-2 puzzles. Knowing the patterns is how you see them coming against you.");
  }
  if (kind === "phase") {
    if (detail === "endgame")
      return puzzles("endgame", "Solve endgame puzzles to practise positions with few pieces left.");
    if (detail === "opening") return OPENINGS;
    if (detail === "middlegame")
      return {
        text: "Study a pro game: guessing a grandmaster's middlegame moves teaches you what to aim for.",
        href: "/masters",
        action: "Play like the pros",
      };
  }
  if (kind === "opening") return OPENINGS;
  if (kind === "time")
    return {
      text: "Play a few longer games this week (10 or 15 minutes) and use the extra time to check every capture and check before you move.",
      href: null,
      action: null,
    };
  // Thrown-away wins, quiet mistakes and anything new: practise the positions themselves.
  return {
    text: "Practise the positions where it happened. You play them again until you find the better move.",
    href: "/games/insights",
    action: "Practise in Your leaks",
  };
}
