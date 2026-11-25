import { Chess } from "chess.js";
import type { ImportedGame } from "@/lib/insights/types";
import { positionKey, START_FEN } from "@/lib/openings/tree";
import type { PlayerColor } from "@/types/game";
import { buildBook, moveNumber, orList, walkBook, type Book } from "./arena";
import { moveLabel, numberedMoves } from "./line";
import type { Course, CourseLine, CourseSummary } from "./types";

/** Plies read from each imported game: enough for any course line. */
export const GAME_PLIES = 40;
/** "Your own course" lines go at most 12 moves each deep. */
export const PERSONAL_PLIES = 24;
export const PERSONAL_MIN_LEARNER_MOVES = 4;
export const PERSONAL_MIN_REPLY_GAMES = 2;
export const PERSONAL_MAX_LINES = 30;
export const PERSONAL_MIN_LINES = 3;

export const PERSONAL_IDS = { white: "my-white", black: "my-black" } as const;
export const PERSONAL_NAMES = { white: "Your White openings", black: "Your Black openings" } as const;
export const PERSONAL_BLURB = "The moves you already play, most common first. Not checked by the engine.";
export const isPersonalId = (id: string) => id === PERSONAL_IDS.white || id === PERSONAL_IDS.black;

/** The opening of one imported game, replayed once. */
export interface PlayedGame {
  color: PlayerColor;
  /** Learner's points: win 1, draw 0.5, loss 0. */
  points: number;
  /** The learner's own rating in that game, when known. */
  rating: number | null;
  /** chess.com's opening name, or null when unknown. */
  opening: string | null;
  /** SAN moves from the start, at most GAME_PLIES. */
  sans: string[];
  /** keys[i] is the position key before ply i; one longer than `sans`. */
  keys: string[];
}

type GameInput = Pick<ImportedGame, "pgn" | "userColor" | "outcome" | "openingName" | "white" | "black">;

const POINTS = { win: 1, draw: 0.5, loss: 0 } as const;

/** The SAN tokens of a PGN's movetext: headers, comments, variations, numbers, NAGs and results removed. */
export function pgnSans(pgn: string): string[] {
  let text = pgn.replace(/^\s*\[[^\]]*\]\s*$/gm, " ").replace(/\{[^}]*\}/g, " ").replace(/;[^\n]*/g, " ");
  // Variations can nest; strip innermost first.
  for (let guard = 0; guard < 20 && text.includes("("); guard++) text = text.replace(/\([^()]*\)/g, " ");
  return text
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.+/, "").replace(/[!?]+$/, ""))
    .filter((t) => t && !/^\$\d+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
}

/** Replays the first `maxPlies` moves of an imported game; null when it is unreadable or has no moves. */
export function playedGame(game: GameInput, maxPlies = GAME_PLIES): PlayedGame | null {
  const chess = new Chess();
  const sans: string[] = [];
  const keys = [positionKey(START_FEN)];
  try {
    for (const token of pgnSans(game.pgn).slice(0, maxPlies)) {
      const move = chess.move(token);
      sans.push(move.san);
      keys.push(positionKey(move.after));
    }
  } catch {
    return null;
  }
  if (!sans.length) return null;
  const own = game.userColor === "white" ? game.white.rating : game.black.rating;
  return {
    color: game.userColor,
    points: POINTS[game.outcome],
    rating: typeof own === "number" && Number.isFinite(own) && own > 0 ? own : null,
    opening: game.openingName && game.openingName !== "Unknown opening" ? game.openingName : null,
    sans,
    keys,
  };
}

export function prepareGames(games: GameInput[], maxPlies = GAME_PLIES): PlayedGame[] {
  return games.map((g) => playedGame(g, maxPlies)).filter((g): g is PlayedGame => g !== null);
}

/** Score as a whole percentage, or null with no games. */
export const scorePct = (points: number, games: number) => (games > 0 ? Math.round((points / games) * 100) : null);

/** The learner's own moves a game must share with the course before it counts as his. */
export const MATCH_LEARNER_MOVES = 2;

/**
 * A game belongs to a course when the learner had the course's colour, the game starts with the
 * course's setup, and the learner's first two moves were the course's moves in those positions.
 * (A one-move setup like 1.d4 alone would otherwise claim every 1.d4 game.)
 */
export function belongsTo(game: Pick<PlayedGame, "color" | "sans" | "keys">, course: Pick<CourseSummary, "side" | "setup">, book: Book): boolean {
  if (game.color !== course.side || game.sans.length < course.setup.length) return false;
  if (!course.setup.every((san, i) => game.sans[i] === san)) return false;
  const { bookPlies } = walkBook(book, game.keys, game.sans, course.side);
  const lastNeeded = (course.side === "white" ? 0 : 1) + 2 * (MATCH_LEARNER_MOVES - 1);
  return bookPlies > lastNeeded;
}

export interface CourseMatch {
  id: string;
  games: number;
  points: number;
  /** 0-100. */
  score: number;
}

/** Courses whose setup starts at least one of these games: the only ones worth loading to check `belongsTo`. */
export function candidateCourses<T extends Pick<CourseSummary, "side" | "setup">>(courses: T[], games: Pick<PlayedGame, "color" | "sans">[]): T[] {
  return courses.filter((c) => c.setup.length > 0 && games.some((g) => g.color === c.side && c.setup.every((san, i) => g.sans[i] === san)));
}

/** The courses the learner already plays, with games count and score, most played first. Courses with no games are left out. */
export function matchCourses(courses: Pick<Course, "id" | "side" | "setup" | "lines">[], games: PlayedGame[]): CourseMatch[] {
  const out: CourseMatch[] = [];
  for (const course of courses) {
    const book = buildBook(course);
    const mine = games.filter((g) => belongsTo(g, course, book));
    if (!mine.length) continue;
    const points = mine.reduce((a, g) => a + g.points, 0);
    out.push({ id: course.id, games: mine.length, points, score: scorePct(points, mine.length)! });
  }
  return out.sort((a, b) => b.games - a.games || b.score - a.score || a.id.localeCompare(b.id));
}

export interface CourseExit {
  /** Position key + move played. */
  key: string;
  /** 1-based move number where it happened (the first time it was seen). */
  move: number;
  /** The move just before, so exits at the same move number can be told apart: "1...d5". Null at the very first move. */
  after: string | null;
  played: string;
  /** The course's move(s) there. */
  courseSans: string[];
  /** Line to open in Learn for the course's move. */
  lineId: string | null;
  games: number;
  points: number;
  score: number;
}

export interface CourseGamesReport {
  /** Games that belong to the course (see `belongsTo`). */
  games: number;
  points: number;
  /** Games that played every course move until the course had no more. */
  stayed: number;
  /** Games in which the opponent left the course first. */
  opponentLeft: number;
  /** Games in which the learner left the course first. */
  youLeft: number;
  /** Most frequent first, at most `limit`. */
  exits: CourseExit[];
}

/** Where the learner's own games leave a course. Opponent deviations are not the learner's exits. */
export function courseGames(course: Pick<Course, "side" | "setup" | "lines">, games: PlayedGame[], limit = 5, book: Book = buildBook(course)): CourseGamesReport {
  const mine = games.filter((g) => belongsTo(g, course, book));
  const exits = new Map<string, CourseExit>();
  const firstPly = new Map<string, number>();
  let stayed = 0;
  let opponentLeft = 0;
  let youLeft = 0;
  for (const game of mine) {
    const { leave } = walkBook(book, game.keys, game.sans, course.side);
    if (!leave) continue;
    if (leave.by === "end") {
      stayed++;
      continue;
    }
    if (leave.by === "opponent") {
      opponentLeft++;
      continue;
    }
    youLeft++;
    const key = `${leave.key}|${leave.played}`;
    const exit = exits.get(key) ?? {
      key,
      move: moveNumber(leave.ply),
      after: leave.ply > 0 ? moveLabel(leave.ply - 1, game.sans[leave.ply - 1]) : null,
      played: leave.played!,
      courseSans: leave.course.map((m) => m.san),
      lineId: leave.course[0]?.lineIds[0] ?? null,
      games: 0,
      points: 0,
      score: 0,
    };
    exit.games++;
    exit.points += game.points;
    exit.score = scorePct(exit.points, exit.games)!;
    const ply = Math.min(firstPly.get(key) ?? leave.ply, leave.ply);
    firstPly.set(key, ply);
    exit.move = moveNumber(ply);
    exits.set(key, exit);
  }
  const ranked = [...exits.values()]
    .sort((a, b) => b.games - a.games || firstPly.get(a.key)! - firstPly.get(b.key)! || a.played.localeCompare(b.played))
    .slice(0, limit);
  return { games: mine.length, points: mine.reduce((a, g) => a + g.points, 0), stayed, opponentLeft, youLeft, exits: ranked };
}

/** "After 4...Nf6, at move 5 you played d3 in 7 of 19 games. The course plays c3." */
export function exitSentence(exit: CourseExit, total: number): string {
  return `${exit.after ? `After ${exit.after}, at` : "At"} move ${exit.move} you played ${exit.played} in ${exit.games} of ${total} game${total === 1 ? "" : "s"}. The course plays ${orList(exit.courseSans)}.`;
}

/** Short stable id for a line, so progress stays attached to the same moves when games are added. */
function lineId(moves: string[]): string {
  let h = 5381;
  for (const ch of moves.join(" ")) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return `g${h.toString(36)}`;
}

type Edge = { count: number; openings: Map<string, number> };

/**
 * "Your own course" for one colour, built from the learner's games: his most played move at each
 * of his positions, opponent replies seen in at least two games, one line per leaf, at most 12
 * moves each, each ending on his move with at least 4 of his moves, the 30 most played lines.
 * Null when that leaves fewer than 3 lines.
 */
export function buildPersonalCourse(games: PlayedGame[], color: PlayerColor): Course | null {
  const nodes = new Map<string, Map<string, Edge>>();
  const mine = games.filter((g) => g.color === color);
  for (const game of mine) {
    const seen = new Set<string>();
    const plies = Math.min(PERSONAL_PLIES, game.sans.length);
    for (let i = 0; i < plies; i++) {
      const id = `${game.keys[i]}|${game.sans[i]}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const moves = nodes.get(game.keys[i]) ?? new Map<string, Edge>();
      const edge = moves.get(game.sans[i]) ?? { count: 0, openings: new Map() };
      edge.count++;
      if (game.opening) edge.openings.set(game.opening, (edge.openings.get(game.opening) ?? 0) + 1);
      moves.set(game.sans[i], edge);
      nodes.set(game.keys[i], moves);
    }
  }

  const learnerTurn = (ply: number) => (ply % 2 === 0) === (color === "white");
  const found = new Map<string, { moves: string[]; weight: number; edge: Edge }>();
  const emit = (path: { san: string; edge: Edge }[]) => {
    let end = path.length;
    while (end > 0 && !learnerTurn(end - 1)) end--;
    const kept = path.slice(0, end);
    const learnerMoves = kept.filter((_, i) => learnerTurn(i)).length;
    if (learnerMoves < PERSONAL_MIN_LEARNER_MOVES) return;
    const moves = kept.map((p) => p.san);
    const last = kept.at(-1)!.edge;
    const id = moves.join(" ");
    const prior = found.get(id);
    if (!prior || last.count > prior.weight) found.set(id, { moves, weight: last.count, edge: last });
  };

  const chess = new Chess();
  const walk = (path: { san: string; edge: Edge }[], onPath: Set<string>) => {
    const ply = path.length;
    const key = positionKey(chess.fen());
    const moves = nodes.get(key);
    if (ply >= PERSONAL_PLIES || !moves || onPath.has(key)) return emit(path);
    const ranked = [...moves].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
    const next = learnerTurn(ply) ? ranked.slice(0, 1) : ranked.filter(([, e]) => e.count >= PERSONAL_MIN_REPLY_GAMES);
    if (!next.length) return emit(path);
    onPath.add(key);
    for (const [san, edge] of next) {
      chess.move(san);
      walk([...path, { san, edge }], onPath);
      chess.undo();
    }
    onPath.delete(key);
  };
  walk([], new Set());

  const ranked = [...found.values()].sort((a, b) => b.weight - a.weight || a.moves.length - b.moves.length || a.moves.join(" ").localeCompare(b.moves.join(" ")));
  if (ranked.length < PERSONAL_MIN_LINES) return null;
  const lines: CourseLine[] = ranked.slice(0, PERSONAL_MAX_LINES).map((l) => {
    let name: string | null = null;
    let best = 0;
    for (const [n, c] of l.edge.openings) if (c > best || (c === best && name !== null && n.length < name.length)) [name, best] = [n, c];
    return { id: lineId(l.moves), name: name ?? numberedMoves(l.moves.slice(0, 6)), moves: l.moves };
  });
  let setup: string[] = [];
  for (let i = 0; lines.every((l) => l.moves[i] !== undefined && l.moves[i] === lines[0].moves[i]); i++) setup = lines[0].moves.slice(0, i + 1);
  return {
    id: PERSONAL_IDS[color],
    name: PERSONAL_NAMES[color],
    side: color,
    blurb: PERSONAL_BLURB,
    setup,
    lineCount: lines.length,
    puzzleCount: 0,
    lines,
    ideas: {},
    names: {},
  };
}

/** Average own rating across games, or null. */
export function averageRating(games: Pick<PlayedGame, "rating">[]): number | null {
  const own = games.map((g) => g.rating).filter((r): r is number => r !== null);
  return own.length ? Math.round(own.reduce((a, b) => a + b, 0) / own.length) : null;
}
