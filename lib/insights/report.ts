import type { PlayerColor } from "@/types/game";
import type { GamePhase } from "@/lib/utils/phase";
import { colorName } from "@/lib/chess/player";
import type {
  CategoryStats,
  GameAssessment,
  Headline,
  ImportedGame,
  InsightsReport,
  Leak,
  LeakCategory,
  OpeningStats,
  PhaseStats,
  RecordCount,
  TimeClass,
} from "@/lib/insights/types";

/** Plain-English copy for every mistake type, shown in the report and reused by headlines. */
export const CATEGORY_COPY: Record<LeakCategory, { label: string; meaning: string; advice: string }> = {
  "missed-mate": {
    label: "Missed checkmates",
    meaning: "A forced checkmate was on the board and your move let it slip.",
    advice: "When the enemy king is short of safe squares, look at every check you have first, including ones that give up material, before considering anything else.",
  },
  "allowed-mate": {
    label: "Allowed checkmate",
    meaning: "Your move let your opponent force checkmate.",
    advice: "Before each move, list every check your opponent would have afterwards, paying special attention to your back rank and the squares around your king.",
  },
  "hung-material": {
    label: "Hanging material",
    meaning: "Your move lost material to your opponent's reply.",
    advice: "Before letting go of the piece, ask two questions: what was this piece defending before it moved, and what checks, captures and threats does my opponent have now?",
  },
  "missed-material": {
    label: "Missed chances to win material",
    meaning: "You had a move that won material and played something else.",
    advice: "At the start of every move, look for your opponent's undefended pieces and go through each of your checks and captures; one of them may simply win something.",
  },
  "quiet-mistake": {
    label: "Quiet mistakes",
    meaning: "A big drop where the move did not simply hang a piece or miss a free one. The cost is harder to see: a lost pawn, a weakened king, a missed defence, a tactic further ahead, or a capture that let your opponent's attack or passed pawns through.",
    advice: "Even when nothing is hanging, or your move wins something, compare two or three candidate moves and ask what each one lets your opponent do next: their checks, captures, threats and pawn pushes.",
  },
};

const PHASES: GamePhase[] = ["opening", "middlegame", "endgame"];
const CATEGORY_ORDER: LeakCategory[] = ["missed-mate", "allowed-mate", "hung-material", "missed-material", "quiet-mistake"];

/** Win percentage that counts as clearly winning; mirrors CLEAR_WIN in leaks.ts. */
const WINNING_PEAK = 85;
/** First ply counted as "after the opening" (the start of move 13 for White). */
const AFTER_OPENING_PLY = 24;
/** Neutral value for openings with no analysed game; such groups never become headlines. */
const NEUTRAL_WIN = 50;
/** The family chess.com games get when their PGN names no opening; never a "problem opening". */
const UNKNOWN_OPENING = "Unknown opening";
export const MIN_ANALYSED_FOR_HEADLINES = 5;
/** Leaks a category needs before it can lead the category headline ahead of quiet mistakes. */
const MIN_PATTERN_LEAKS = 3;
const MAX_HEADLINES = 3;

const round1 = (value: number) => Math.round(value * 10) / 10;
const emptyRecord = (): RecordCount => ({ games: 0, win: 0, draw: 0, loss: 0 });
const scoreOf = (record: RecordCount) => (record.games ? ((record.win + record.draw / 2) / record.games) * 100 : 0);
const byDrop = (a: Leak, b: Leak) => b.drop - a.drop || a.id.localeCompare(b.id);
const sumDrop = (leaks: Leak[]) => leaks.reduce((total, leak) => total + leak.drop, 0);
const plural = (count: number, word: string, many = `${word}s`) => `${count} ${count === 1 ? word : many}`;

function addResult(record: RecordCount, game: ImportedGame) {
  record.games++;
  record[game.outcome]++;
}

function phaseStats(assessments: GameAssessment[]) {
  const raw = Object.fromEntries(PHASES.map((phase) => [phase, { moves: 0, mistakes: 0, blunders: 0, drop: 0 }])) as Record<GamePhase, { moves: number; mistakes: number; blunders: number; drop: number }>;
  for (const assessment of assessments) {
    for (const move of assessment.moves) {
      raw[move.phase].moves++;
      raw[move.phase].drop += move.drop;
    }
    for (const leak of assessment.leaks) {
      if (leak.severity === "blunder") raw[leak.phase].blunders++;
      else raw[leak.phase].mistakes++;
    }
  }
  const rate = (phase: GamePhase) => (raw[phase].moves ? ((raw[phase].mistakes + raw[phase].blunders) / raw[phase].moves) * 100 : 0);
  const phases = Object.fromEntries(PHASES.map((phase): [GamePhase, PhaseStats] => [phase, {
    moves: raw[phase].moves,
    mistakes: raw[phase].mistakes,
    blunders: raw[phase].blunders,
    avgDrop: raw[phase].moves ? round1(raw[phase].drop / raw[phase].moves) : 0,
    leaksPer100: round1(rate(phase)),
  }])) as Record<GamePhase, PhaseStats>;
  return { phases, rate };
}

function categoryStats(leaks: Leak[]): CategoryStats[] {
  // Ranked on the exact sum; only the reported total is rounded.
  return CATEGORY_ORDER.map((category) => {
    const matching = leaks.filter((leak) => leak.category === category).sort(byDrop);
    return { exact: sumDrop(matching), stats: {
      category,
      count: matching.length,
      totalDrop: round1(sumDrop(matching)),
      games: new Set(matching.map((leak) => leak.gameId)).size,
      leakIds: matching.map((leak) => leak.id),
    } satisfies CategoryStats };
  }).filter(({ stats }) => stats.count > 0)
    .sort((a, b) => b.exact - a.exact || b.stats.count - a.stats.count || CATEGORY_ORDER.indexOf(a.stats.category) - CATEGORY_ORDER.indexOf(b.stats.category))
    .map(({ stats }) => stats);
}

/** The user's win percentage at their first move from ply 24 on, or at their last move in a shorter game. */
function winAfterOpening(assessment: GameAssessment): number | null {
  if (!assessment.moves.length) return null;
  const ordered = [...assessment.moves].sort((a, b) => a.ply - b.ply);
  return (ordered.find((move) => move.ply >= AFTER_OPENING_PLY) ?? ordered[ordered.length - 1]).winBefore;
}

/** `score` is the exact score; `stats.score` is rounded for display. */
interface OpeningGroup { stats: OpeningStats; score: number; analysed: number; gameIds: string[] }

function openingGroups(games: ImportedGame[], assessed: Map<string, GameAssessment>): OpeningGroup[] {
  const groups = new Map<string, { family: string; color: PlayerColor; record: RecordCount; analysed: number; wins: number[]; gameIds: string[] }>();
  for (const game of games) {
    const key = `${game.userColor}\u0000${game.openingFamily}`;
    const group = groups.get(key) ?? { family: game.openingFamily, color: game.userColor, record: emptyRecord(), analysed: 0, wins: [], gameIds: [] };
    addResult(group.record, game);
    group.gameIds.push(game.id);
    const assessment = assessed.get(game.id);
    if (assessment) group.analysed++;
    const win = assessment ? winAfterOpening(assessment) : null;
    if (win !== null) group.wins.push(win);
    groups.set(key, group);
  }
  return [...groups.values()].map((group): OpeningGroup => ({
    stats: {
      family: group.family,
      color: group.color,
      ...group.record,
      score: round1(scoreOf(group.record)),
      winAfterOpening: group.wins.length ? round1(group.wins.reduce((a, b) => a + b, 0) / group.wins.length) : NEUTRAL_WIN,
    },
    score: scoreOf(group.record),
    analysed: group.analysed,
    gameIds: group.gameIds,
  })).sort((a, b) => b.stats.games - a.stats.games || a.stats.family.localeCompare(b.stats.family) || a.stats.color.localeCompare(b.stats.color));
}

interface Candidate extends Headline { cost: number }

const TIME_ADVICE = {
  hasty: "On any move that is not a forced recapture or an escape from check, spend at least ten seconds and use them for one blunder check: what does my opponent's best capture or check do after this move?",
  trouble: "Manage your clock earlier: play the moves you know quickly in the opening, and when a middlegame decision takes long, pick the safe candidate rather than calculating everything.",
};

const PHASE_ADVICE: Record<GamePhase, string> = {
  opening: "Pick one opening as White and one reply each to 1.e4 and 1.d4, and after every game look up the point where you left the moves you know.",
  middlegame: "Before each middlegame move, look at your opponent's checks, captures and threats first, then choose your own plan.",
  endgame: "Learn the basic king-and-pawn and rook endings, and bring your king towards the centre as soon as the queens are off.",
};

const BLOWN_ADVICE = "When you are clearly winning, slow down: trade pieces rather than pawns, shut down your opponent's counterplay before grabbing more, and check every check and capture your opponent has before each move.";
const OPENING_ADVICE = "Replay these games up to where they left the moves you know, compare with a reference game in that line, and settle on one setup you understand instead of switching each time.";

function headlineCandidates(input: {
  record: RecordCount;
  leaks: Leak[];
  categories: CategoryStats[];
  phases: Record<GamePhase, PhaseStats>;
  rate: (phase: GamePhase) => number;
  blownGameIds: string[];
  /** For each blown game, the first ply where the user was clearly winning with the move. */
  firstWinningPly: Map<string, number>;
  winning: number;
  openings: OpeningGroup[];
}): Candidate[] {
  const { leaks, categories, phases, rate, blownGameIds, firstWinningPly, winning, openings } = input;
  const candidates: Candidate[] = [];

  // Quiet mistakes are a catch-all with generic advice, so the costliest other kind leads when it
  // happened often enough to be a pattern.
  const top = categories[0];
  const other = categories.find((category) => category.category !== "quiet-mistake");
  const chosen = other && other.count >= MIN_PATTERN_LEAKS ? other : top;
  if (chosen) {
    const copy = CATEGORY_COPY[chosen.category];
    const average = Math.round(chosen.totalDrop / chosen.count);
    candidates.push({
      key: `category:${chosen.category}`,
      title: `${copy.label}: ${plural(chosen.count, "time")} in ${plural(chosen.games, "game")}`,
      detail: chosen === top
        ? `Your most costly kind of mistake: each one cut your winning chances by ${average} points out of 100 on average.`
        : `Each one cut your winning chances by ${average} points out of 100 on average. Only ${CATEGORY_COPY["quiet-mistake"].label.toLowerCase()}, which have many different causes, cost you more in total.`,
      advice: copy.advice,
      leakIds: chosen.leakIds,
      cost: chosen.totalDrop,
    });
  }

  // Daily games and games without clock readings can never show time trouble, so they are left out of the share.
  const clocked = leaks.filter((leak) => leak.clockSec !== null);
  const timed = clocked.filter((leak) => leak.timeTrouble || leak.hasty).sort(byDrop);
  if (clocked.length && timed.length && timed.length / clocked.length >= 0.25) {
    const trouble = timed.filter((leak) => leak.timeTrouble).length;
    const hasty = timed.filter((leak) => leak.hasty).length;
    const outOf = clocked.length === leaks.length ? `${leaks.length} mistakes` : `${clocked.length} mistakes with clock readings`;
    candidates.push({
      key: "time",
      title: `${timed.length} of your ${outOf} came in time trouble or on instant moves`,
      detail: `${plural(trouble, "was", "were")} made with little time left on your clock, and ${plural(hasty, "was", "were")} played almost instantly with plenty of time left.`,
      advice: hasty >= trouble ? TIME_ADVICE.hasty : TIME_ADVICE.trouble,
      leakIds: timed.map((leak) => leak.id),
      cost: sumDrop(timed),
    });
  }

  const measured = PHASES.filter((phase) => phases[phase].moves >= 30);
  if (measured.length >= 2) {
    const ranked = [...measured].sort((a, b) => rate(b) - rate(a) || PHASES.indexOf(a) - PHASES.indexOf(b));
    const worst = ranked[0];
    const best = ranked[ranked.length - 1];
    if (rate(worst) > 0 && rate(worst) >= 1.5 * rate(best)) {
      const inPhase = leaks.filter((leak) => leak.phase === worst).sort(byDrop);
      const comparison = rate(best) > 0
        ? `That is ${round1(rate(worst) / rate(best))} times your ${best} rate of ${phases[best].leaksPer100} per 100 moves.`
        : `You made none in the ${best} over ${plural(phases[best].moves, "move")}.`;
      candidates.push({
        key: `phase:${worst}`,
        title: `Mistakes in the ${worst}: ${phases[worst].leaksPer100} per 100 moves`,
        detail: `${plural(inPhase.length, "mistake")} in ${plural(phases[worst].moves, "move")} you played in the ${worst}. ${comparison}`,
        advice: PHASE_ADVICE[worst],
        leakIds: inPhase.map((leak) => leak.id),
        cost: sumDrop(inPhase),
      });
    }
  }

  if (blownGameIds.length >= 2 && winning > 0 && blownGameIds.length / winning >= 0.2) {
    const blownSet = new Set(blownGameIds);
    candidates.push({
      key: "blown-wins",
      title: `Winning positions not won: ${blownGameIds.length} of ${winning}`,
      detail: `You were clearly winning (at least ${WINNING_PEAK}% winning chance in two or more positions where you were to move, with the final position counting as one) in ${plural(winning, "game")} and did not win ${blownGameIds.length} of them.`,
      advice: BLOWN_ADVICE,
      // Only the mistakes from the point the user was clearly winning, while still at least level:
      // earlier ones and moves defending a position already lost are a different lesson.
      leakIds: leaks
        .filter((leak) => blownSet.has(leak.gameId) && leak.ply >= (firstWinningPly.get(leak.gameId) ?? Infinity) && leak.winBefore >= 50)
        .sort(byDrop)
        .map((leak) => leak.id),
      cost: 50 * blownGameIds.length,
    });
  }

  const overall = scoreOf(input.record);
  const problem = openings
    .filter((group) => group.stats.family !== UNKNOWN_OPENING && group.analysed >= 4 && group.score <= overall - 15)
    .map((group) => ({ group, cost: (group.stats.games * (overall - group.score)) / 2 }))
    .sort((a, b) => b.cost - a.cost || a.group.stats.family.localeCompare(b.group.stats.family))[0];
  if (problem) {
    const { stats, score, gameIds } = problem.group;
    const ids = new Set(gameIds);
    candidates.push({
      key: `opening:${stats.color}:${stats.family}`,
      title: `${stats.family} as ${colorName(stats.color)}: ${stats.score}% score in ${plural(stats.games, "game")}`,
      detail: `That is ${round1(overall - score)} points below your overall score of ${round1(overall)}%, and your winning chance after the opening averages ${stats.winAfterOpening}%.`,
      advice: OPENING_ADVICE,
      leakIds: leaks.filter((leak) => ids.has(leak.gameId)).sort(byDrop).map((leak) => leak.id),
      cost: problem.cost,
    });
  }

  return candidates;
}

/** Builds the cross-game report. Results use every imported game; engine-based figures use the analysed ones only. */
export function buildReport(username: string, games: ImportedGame[], assessments: GameAssessment[]): InsightsReport {
  const gameIds = new Set(games.map((game) => game.id));
  const assessed = new Map<string, GameAssessment>();
  for (const assessment of assessments) if (gameIds.has(assessment.gameId)) assessed.set(assessment.gameId, assessment);
  const analysedGames = games.filter((game) => assessed.has(game.id)).sort((a, b) => b.endTime - a.endTime || a.id.localeCompare(b.id));
  const analysedList = analysedGames.map((game) => assessed.get(game.id)!);

  const record = emptyRecord();
  const byColor: Record<PlayerColor, RecordCount> = { white: emptyRecord(), black: emptyRecord() };
  const byTimeClass: Partial<Record<TimeClass, RecordCount>> = {};
  for (const game of games) {
    addResult(record, game);
    addResult(byColor[game.userColor], game);
    addResult((byTimeClass[game.timeClass] ??= emptyRecord()), game);
  }

  const leaks = analysedList.flatMap((assessment) => assessment.leaks);
  const { phases, rate } = phaseStats(analysedList);
  const categories = categoryStats(leaks);
  const openings = openingGroups(games, assessed);

  // One rule for every result: clearlyWinning and clearlyLosing, the same test blownWin and savedGame use.
  const blownGameIds: string[] = [];
  const firstWinningPly = new Map<string, number>();
  let converted = 0;
  let losing = 0;
  let saved = 0;
  for (const game of analysedGames) {
    const assessment = assessed.get(game.id)!;
    if (assessment.blownWin) {
      blownGameIds.push(game.id);
      // Start at the first winning reading that holds to the user's next move or is lost by a mistake on that move,
      // so a lone flicker earlier in the game does not start the count. Moves are in ply order.
      const { moves } = assessment;
      const leakPlies = new Set(assessment.leaks.map((leak) => leak.ply));
      const start =
        moves.find((move, i) => move.winBefore >= WINNING_PEAK && (leakPlies.has(move.ply) || (moves[i + 1]?.winBefore ?? 0) >= WINNING_PEAK)) ??
        moves.find((move) => move.winBefore >= WINNING_PEAK);
      if (start) firstWinningPly.set(game.id, start.ply);
    } else if (game.outcome === "win" && assessment.clearlyWinning) converted++;
    if (assessment.savedGame) { saved++; losing++; }
    else if (game.outcome === "loss" && assessment.clearlyLosing) losing++;
  }
  const winning = blownGameIds.length + converted;

  const headlines = analysedGames.length >= MIN_ANALYSED_FOR_HEADLINES
    ? headlineCandidates({ record, leaks, categories, phases, rate, blownGameIds, firstWinningPly, winning, openings })
      .sort((a, b) => b.cost - a.cost || a.key.localeCompare(b.key))
      .slice(0, MAX_HEADLINES)
      .map((candidate): Headline => ({ key: candidate.key, title: candidate.title, detail: candidate.detail, advice: candidate.advice, leakIds: candidate.leakIds }))
    : [];

  const times = games.map((game) => game.endTime);
  return {
    username,
    games: games.length,
    analysed: analysedGames.length,
    from: times.length ? Math.min(...times) : null,
    to: times.length ? Math.max(...times) : null,
    record,
    byColor,
    byTimeClass,
    phases,
    categories,
    openings: openings.map((group) => group.stats),
    time: {
      lostOnTime: games.filter((game) => game.outcome === "loss" && game.resultCode === "timeout").length,
      leaks: leaks.length,
      clockedLeaks: leaks.filter((leak) => leak.clockSec !== null).length,
      inTimeTrouble: leaks.filter((leak) => leak.timeTrouble).length,
      hasty: leaks.filter((leak) => leak.hasty).length,
    },
    conversion: { winning, converted, blownGameIds, losing, saved },
    headlines,
  };
}
