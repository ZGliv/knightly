import type { PlayerColor } from "@/types/game";
import type { ImportedGame, Outcome, TimeClass } from "@/lib/insights/types";
import { parseClocks, replayGame } from "@/lib/insights/replay";

/**
 * chess.com provider for "Your leaks". Calls the public API straight from the browser:
 * plain GETs with no custom headers (the CORS preflight only allows Origin), one at a time.
 */

const API = "https://api.chess.com/pub/player/";
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const USERNAME = /^[A-Za-z0-9_-]{3,25}$/;
const TIME_CLASSES: readonly TimeClass[] = ["bullet", "blitz", "rapid", "daily"];
const DRAW_CODES = new Set([
  "agreed",
  "repetition",
  "stalemate",
  "insufficient",
  "50move",
  "timevsinsufficient",
]);
const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 30_000;

export type ChessComErrorKind =
  | "invalid-username"
  | "not-found"
  | "unreachable"
  | "rate-limited"
  | "bad-response";

export class ChessComError extends Error {
  kind: ChessComErrorKind;
  constructor(kind: ChessComErrorKind, message: string) {
    super(message);
    this.name = "ChessComError";
    this.kind = kind;
  }
}

function abortError(): Error {
  return new DOMException("The import was cancelled.", "AbortError");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function header(pgn: string, name: string): string | null {
  const match = pgn.match(new RegExp(`^\\[${name}\\s+"((?:[^"\\\\]|\\\\.)*)"\\]\\s*$`, "m"));
  const value = match?.[1].trim();
  return value && value !== "?" ? value : null;
}

/** Slugs drop apostrophes ("Queens-Gambit"). Restore them only where the next word makes the possessive certain. */
const POSSESSIVES: Record<string, string> = {
  Queens: "Queen's",
  Kings: "King's",
  Alekhines: "Alekhine's",
  Birds: "Bird's",
  Bishops: "Bishop's",
  Petrovs: "Petrov's",
  Owens: "Owen's",
  Carls: "Carl's",
  Monkeys: "Monkey's",
};
const POSSESSED = new Set([
  "Gambit",
  "Pawn",
  "Indian",
  "Opening",
  "Defense",
  "Knight",
  "Fianchetto",
  "Attack",
  "Variation",
  "Countergambit",
  "Game",
  "Bum",
  "Line",
  "English",
]);
/** Words that close an opening's base name, e.g. "Sicilian Defense", "Italian Game", "London System". */
const FAMILY_END = new Set([
  "Defense",
  "Opening",
  "Game",
  "Gambit",
  "Countergambit",
  "Attack",
  "Counterattack",
  "System",
]);

/** Names whose own hyphen the slug turns into a word break, e.g. "Caro-Kann". */
const HYPHENATED = new Set([
  "Caro-Kann",
  "Nimzo-Indian",
  "Bogo-Indian",
  "Nimzo-Larsen",
  "Neo-Grunfeld",
  "Smith-Morra",
  "Max-Lange",
  "Richter-Rauzer",
  "Panov-Botvinnik",
  "Mieses-Kotrc",
  "Schliemann-Jaenisch",
]);
/** Base names that chess.com sometimes prefixes with a variation, e.g. "Alapin Sicilian Defense". */
const PREFIXED_FAMILIES = ["Sicilian Defense"];

/** Castling is spelled "O-O" in the slug, so its hyphens split it into "O" words: "7.O", "O", "b5". */
function joinCastling(words: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const start = words[i].match(/^(.*?)O$/);
    if (!start || (start[1] && !start[1].endsWith("."))) {
      result.push(words[i]);
      continue;
    }
    let run = 1;
    while (words[i + run] === "O") run++;
    if (run === 1) {
      result.push(words[i]);
      continue;
    }
    // Two castling moves in a row (White then Black) leave four or six O's; five cannot be told
    // apart, so it is read as queenside then kingside.
    const moves = run === 2 ? ["O-O"] : run === 3 ? ["O-O-O"] : run === 4 ? ["O-O", "O-O"] : run === 6 ? ["O-O-O", "O-O-O"] : ["O-O-O", "O-O"];
    if (run > 6) moves.push(...Array.from({ length: run - 6 }, () => "O"));
    moves[0] = start[1] + moves[0];
    result.push(...moves);
    i += run - 1;
  }
  return result;
}

function readableWords(raw: string[]): string[] {
  const words: string[] = [];
  for (const word of joinCastling(raw)) {
    const joined = words.length ? `${words[words.length - 1]}-${word}` : "";
    if (HYPHENATED.has(joined)) words[words.length - 1] = joined;
    else words.push(word);
  }
  return words.map((word, i) => {
    if (word === "OKelly") return "O'Kelly";
    const possessive = POSSESSIVES[word];
    return possessive && POSSESSED.has(words[i + 1] ?? "") ? possessive : word;
  });
}

/** The opening slug from an ECOUrl such as https://www.chess.com/openings/Sicilian-Defense-Open-Najdorf-Variation-6.Be2 */
function openingSlug(ecoUrl: string | null): string | null {
  if (!ecoUrl) return null;
  const slug = ecoUrl.split("/openings/")[1]?.split(/[?#]/)[0];
  if (!slug) return null;
  try {
    return decodeURIComponent(slug).trim() || null;
  } catch {
    return null;
  }
}

/** Names that come with the slug: the full name, and the base name used to group games. */
export function openingNames(ecoUrl: string | null): { name: string; family: string } {
  const slug = openingSlug(ecoUrl);
  // "Undefined" is chess.com's own placeholder when it could not name the opening.
  if (!slug || slug.toLowerCase() === "undefined") {
    return { name: "Unknown opening", family: "Unknown opening" };
  }
  // "Variation...6.cxd5" reads as "Variation ...6.cxd5".
  const name = readableWords(slug.replace(/([A-Za-z])\.\.\./g, "$1-...").split("-").filter(Boolean)).join(" ");
  // Cut before move text ("-6.Be2", "...6.fxe5", "-with-1-d4") so only named words remain.
  const named = slug.split(/\.\.\.|-(?=\d)|-with-/)[0];
  const words = readableWords(named.split("-").filter(Boolean));
  if (!words.length) return { name, family: name };
  const end = words.findIndex((word) => FAMILY_END.has(word));
  let family = end === -1 ? words : words.slice(0, end + 1);
  // "Queen's Gambit Declined" and "King's Gambit Accepted" are their own families.
  const next = end === -1 ? undefined : words[end + 1];
  if (next === "Declined" || next === "Accepted") family = words.slice(0, end + 2);
  const base = family.join(" ");
  // "Alapin Sicilian Defense" and "Closed Sicilian Defense" are played from the same first moves
  // as every other Sicilian, so they share its group.
  return { name, family: PREFIXED_FAMILIES.find((known) => base.endsWith(` ${known}`)) ?? base };
}

function parseTimeControl(value: unknown): { baseSec: number; incSec: number } {
  if (typeof value !== "string") return { baseSec: 0, incSec: 0 };
  const daily = value.match(/^1\/(\d+)$/);
  if (daily) return { baseSec: Number(daily[1]), incSec: 0 };
  const live = value.match(/^(\d+)(?:\+(\d+))?$/);
  if (live) return { baseSec: Number(live[1]), incSec: Number(live[2] ?? 0) };
  return { baseSec: 0, incSec: 0 };
}

function outcomeFor(code: string): Outcome {
  if (code === "win") return "win";
  if (DRAW_CODES.has(code)) return "draw";
  return "loss";
}

function terminationFor(pgn: string, outcome: Outcome, code: string): string {
  const fromPgn = header(pgn, "Termination");
  if (fromPgn) return fromPgn;
  if (outcome === "win") return "won";
  if (outcome === "draw") return `drawn (${code})`;
  return `lost (${code})`;
}

function gameId(raw: Record<string, unknown>): string | null {
  const uuid = typeof raw.uuid === "string" ? raw.uuid.trim() : "";
  const siteId =
    uuid ||
    (typeof raw.url === "string" ? (raw.url.match(/(\d+)\/?$/)?.[1] ?? "") : "");
  const id = `chesscom-${siteId}`;
  return siteId && /^[\w-]{1,100}$/.test(id) ? id : null;
}

function player(raw: unknown): { username: string; rating: number | null; result: string } | null {
  if (!isRecord(raw) || typeof raw.username !== "string" || !raw.username) return null;
  if (typeof raw.result !== "string" || !raw.result) return null;
  const rating = typeof raw.rating === "number" && Number.isFinite(raw.rating) ? raw.rating : null;
  return { username: raw.username, rating, result: raw.result };
}

function isStandardSetup(setup: unknown): boolean {
  if (setup === undefined || setup === null || setup === "") return true;
  if (typeof setup !== "string") return false;
  // Move counters do not change the position; compare placement, side, castling and en passant.
  return setup.trim().split(/\s+/).slice(0, 4).join(" ") === START_FEN.split(" ").slice(0, 4).join(" ");
}

function isTimeClass(value: unknown): value is TimeClass {
  return typeof value === "string" && (TIME_CLASSES as readonly string[]).includes(value);
}

/**
 * Turns one game object from a chess.com monthly archive into an ImportedGame.
 * Returns null when the game cannot be used: a variant, a non-standard start, no moves,
 * an unreadable PGN, or a game the user did not play in.
 */
export function normalizeChessComGame(raw: unknown, username: string): ImportedGame | null {
  if (!isRecord(raw)) return null;
  if (raw.rules !== "chess" || !isStandardSetup(raw.initial_setup)) return null;
  if (!isTimeClass(raw.time_class)) return null;
  if (typeof raw.pgn !== "string" || !raw.pgn.trim()) return null;
  if (typeof raw.end_time !== "number" || !Number.isFinite(raw.end_time)) return null;
  const white = player(raw.white);
  const black = player(raw.black);
  if (!white || !black) return null;
  const me = username.trim().toLowerCase();
  const userColor: PlayerColor | null =
    white.username.toLowerCase() === me ? "white" : black.username.toLowerCase() === me ? "black" : null;
  if (!userColor) return null;
  const id = gameId(raw);
  if (!id) return null;

  const pgn = raw.pgn;
  let replay: ReturnType<typeof replayGame>;
  try {
    replay = replayGame(pgn);
  } catch {
    return null;
  }
  if (!isStandardSetup(replay.fens[0])) return null;

  const plyCount = replay.sans.length;
  const resultCode = (userColor === "white" ? white : black).result;
  const outcome = outcomeFor(resultCode);
  const opening = openingNames(header(pgn, "ECOUrl") ?? (typeof raw.eco === "string" ? raw.eco : null));
  const url =
    typeof raw.url === "string" && raw.url ? raw.url : (header(pgn, "Link") ?? "");

  return {
    id,
    source: "chesscom",
    url,
    pgn,
    endTime: raw.end_time * 1000,
    timeClass: raw.time_class,
    ...parseTimeControl(raw.time_control),
    rated: raw.rated === true,
    white: { name: white.username, rating: white.rating },
    black: { name: black.username, rating: black.rating },
    userColor,
    outcome,
    resultCode,
    termination: terminationFor(pgn, outcome, resultCode),
    ecoCode: header(pgn, "ECO"),
    openingName: opening.name,
    openingFamily: opening.family,
    plyCount,
    // A daily game's %clk is not the time left on a running clock (1.e4 can show 0:00:00.5 in a
    // 7-day game), so it can say nothing about time trouble or time spent.
    clocks:
      raw.time_class === "daily"
        ? Array.from({ length: plyCount }, () => null)
        : parseClocks(pgn, plyCount),
  };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Retry-After as seconds or an HTTP date; null when missing or unreadable. */
function retryAfterMs(response: Response): number | null {
  const value = response.headers?.get("Retry-After")?.trim();
  if (!value) return null;
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value) * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

type JsonResult = { status: "ok"; body: unknown } | { status: "not-found" };

async function getJson(
  url: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal | undefined,
): Promise<JsonResult> {
  for (let attempt = 0; ; attempt++) {
    if (signal?.aborted) throw abortError();
    let response: Response;
    try {
      response = await fetchImpl(url, signal ? { signal } : undefined);
    } catch (error) {
      if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
        throw abortError();
      }
      // Browsers report network failures and blocked cross-origin replies (such as a
      // Cloudflare challenge page, which has no CORS header) as a bare TypeError.
      throw new ChessComError(
        "unreachable",
        "chess.com can't be reached right now. Check your connection and try again in a few minutes.",
      );
    }
    if (response.status === 429) {
      if (attempt >= MAX_RETRIES) {
        throw new ChessComError(
          "rate-limited",
          "chess.com is asking us to slow down. Wait a minute, then try the import again.",
        );
      }
      const wait = retryAfterMs(response) ?? 1000 * 2 ** attempt;
      await sleep(Math.min(wait, MAX_RETRY_DELAY_MS), signal);
      continue;
    }
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) {
      if (response.status >= 500 || response.status === 403) {
        throw new ChessComError(
          "unreachable",
          "chess.com isn't answering properly right now. Try again in a few minutes.",
        );
      }
      throw new ChessComError(
        "bad-response",
        `chess.com sent an unexpected reply (status ${response.status}). Try again later.`,
      );
    }
    try {
      return { status: "ok", body: await response.json() };
    } catch (error) {
      if (signal?.aborted) throw abortError();
      if (error instanceof Error && error.name === "AbortError") throw abortError();
      throw new ChessComError("bad-response", "chess.com sent a reply we couldn't read. Try again later.");
    }
  }
}

function badShape(): ChessComError {
  return new ChessComError("bad-response", "chess.com sent a reply we couldn't read. Try again later.");
}

/** Monthly archive URLs as { year, month } pairs, newest first. Only the months are trusted, not the hosts. */
function archiveMonths(body: unknown): { year: string; month: string }[] {
  if (!isRecord(body) || !Array.isArray(body.archives)) throw badShape();
  const months = new Map<string, { year: string; month: string }>();
  for (const entry of body.archives) {
    if (typeof entry !== "string") continue;
    const match = entry.match(/\/games\/(\d{4})\/(\d{2})\/?$/);
    if (match) months.set(`${match[1]}-${match[2]}`, { year: match[1], month: match[2] });
  }
  return [...months.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([, value]) => value);
}

/** A month's games, newest first. The API lists them oldest first; end_time decides when present. */
function newestFirst(list: unknown[]): unknown[] {
  const endTime = (raw: unknown) =>
    isRecord(raw) && typeof raw.end_time === "number" && Number.isFinite(raw.end_time) ? raw.end_time : -Infinity;
  return list
    .map((raw, index) => ({ raw, index, end: endTime(raw) }))
    .sort((a, b) => b.end - a.end || b.index - a.index)
    .map((entry) => entry.raw);
}

/**
 * Imports a player's most recent standard-chess games from chess.com, newest first.
 * Walks the monthly archives newest month first, one request at a time, until `max` games are found.
 * With `knownIds` (games already stored), `max` only applies once a stored game has been reached, so
 * every game played since the last import is fetched and no gap is left before the stored ones.
 * `knownNewestEnd` (the newest stored game's end time) also counts as reaching them, so the walk
 * stops there even when a stored game is no longer in the archive.
 * `skipped` counts games that could not be used (variants, odd starts, unreadable records);
 * games outside the requested time classes are left out without being counted.
 */
export async function fetchChessComGames(
  username: string,
  options: {
    max: number;
    timeClasses: TimeClass[];
    signal?: AbortSignal;
    onProgress?: (p: { month: string; found: number }) => void;
    fetchImpl?: typeof fetch;
    knownIds?: ReadonlySet<string>;
    knownNewestEnd?: number;
  },
): Promise<{ username: string; games: ImportedGame[]; skipped: number }> {
  const trimmed = typeof username === "string" ? username.trim() : "";
  if (!USERNAME.test(trimmed)) {
    throw new ChessComError(
      "invalid-username",
      "chess.com usernames are 3 to 25 characters: letters, numbers, _ and - only.",
    );
  }
  const user = trimmed.toLowerCase();
  const fetchImpl = options.fetchImpl ?? fetch;
  const { signal, onProgress } = options;
  // Infinity means "no limit"; NaN or a non-number means none.
  const max = typeof options.max === "number" && !Number.isNaN(options.max) ? Math.floor(options.max) : 0;
  const wanted = new Set(options.timeClasses);
  const known = options.knownIds;
  // Without stored games there is nothing to reach, and `max` applies from the start.
  let reachedKnown = !known?.size;
  const knownEnd = options.knownNewestEnd;
  // chess.com archives games by UTC month: a month older than the newest stored game's has no newer game.
  const knownMonth = knownEnd !== undefined && Number.isFinite(knownEnd) ? new Date(knownEnd).toISOString().slice(0, 7) : null;

  const archives = await getJson(`${API}${encodeURIComponent(user)}/games/archives`, fetchImpl, signal);
  if (archives.status === "not-found") {
    throw new ChessComError("not-found", `There is no chess.com player called "${trimmed}".`);
  }
  const months = archiveMonths(archives.body);

  const games: ImportedGame[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  if (max < 1 || wanted.size === 0) return { username: user, games, skipped };

  for (const { year, month } of months) {
    if (knownMonth && `${year}-${month}` < knownMonth) reachedKnown = true;
    if (reachedKnown && games.length >= max) break;
    const result = await getJson(
      `${API}${encodeURIComponent(user)}/games/${year}/${month}`,
      fetchImpl,
      signal,
    );
    if (result.status === "ok") {
      if (!isRecord(result.body) || !Array.isArray(result.body.games)) throw badShape();
      for (const raw of newestFirst(result.body.games)) {
        if (reachedKnown && games.length >= max) break;
        // Cheap filter first so unwanted games are never replayed.
        if (isRecord(raw) && isTimeClass(raw.time_class) && !wanted.has(raw.time_class)) continue;
        let game: ImportedGame | null = null;
        try {
          game = normalizeChessComGame(raw, user);
        } catch {
          game = null;
        }
        if (!game) {
          skipped++;
          continue;
        }
        if (!wanted.has(game.timeClass) || seen.has(game.id)) continue;
        if (known?.has(game.id) || (knownEnd !== undefined && game.endTime <= knownEnd)) reachedKnown = true;
        seen.add(game.id);
        games.push(game);
      }
    }
    if (signal?.aborted) throw abortError();
    onProgress?.({ month: `${year}-${month}`, found: games.length });
  }

  games.sort((a, b) => b.endTime - a.endTime);
  return { username: user, games, skipped };
}
