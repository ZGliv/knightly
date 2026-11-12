import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ChessComError,
  fetchChessComGames,
  normalizeChessComGame,
  openingNames,
} from "../lib/insights/chesscom";
import archives from "./fixtures/chesscom-archives.json";
import gothamNov from "./fixtures/chesscom-gothamchess-2026-11.json";
import gothamOct from "./fixtures/chesscom-gothamchess-2026-10.json";
import erikOct from "./fixtures/chesscom-erik-2026-10.json";

type RawGame = (typeof gothamNov.games)[number] | (typeof erikOct.games)[number];

const API = "https://api.chess.com/pub/player/";
const byUuid = (games: RawGame[], prefix: string) => {
  const game = games.find((g) => g.uuid.startsWith(prefix));
  assert.ok(game, `fixture game ${prefix} exists`);
  return structuredClone(game) as Record<string, unknown>;
};

type Reply = { status?: number; body?: unknown; text?: string; headers?: Record<string, string> } | Error;

/** Fake fetch: each URL maps to a reply, or a queue of replies used in order. Records every call. */
function fakeFetch(routes: Record<string, Reply | Reply[]>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const queues = new Map(Object.entries(routes).map(([url, r]) => [url, Array.isArray(r) ? [...r] : [r]]));
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
    const queue = queues.get(url);
    if (!queue?.length) return new Response('{"code":0,"message":"not found"}', { status: 404 });
    const reply = queue.length > 1 ? queue.shift()! : queue[0];
    if (reply instanceof Error) throw reply;
    const text = reply.text ?? JSON.stringify(reply.body);
    return new Response(text, { status: reply.status ?? 200, headers: reply.headers });
  }) as typeof fetch;
  return { impl, calls };
}

const gothamRoutes = (): Record<string, Reply | Reply[]> => ({
  [`${API}gothamchess/games/archives`]: { body: archives },
  [`${API}gothamchess/games/2026/11`]: { body: gothamNov },
  [`${API}gothamchess/games/2026/10`]: { body: gothamOct },
  // 2026/09 is not routed, so it answers 404 like a bad month does.
});

const ALL = ["bullet", "blitz", "rapid", "daily"] as const;

test("a win as Black maps colour, outcome, ids, ratings, opening and clocks", () => {
  const game = normalizeChessComGame(byUuid(gothamNov.games, "f41fd4b5"), "GOTHAMCHESS");
  assert.ok(game);
  assert.equal(game.id, "chesscom-f41fd4b5-d5f0-11f1-8957-15977101000f");
  assert.equal(game.source, "chesscom");
  assert.equal(game.url, "https://www.chess.com/game/live/186336144138");
  assert.equal(game.userColor, "black");
  assert.equal(game.outcome, "win");
  assert.equal(game.resultCode, "win");
  assert.equal(game.termination, "GothamChess won by checkmate");
  assert.deepEqual(game.white, { name: "StanislavNovikov", rating: 2789 });
  assert.deepEqual(game.black, { name: "GothamChess", rating: 2927 });
  assert.equal(game.endTime, 1793536724 * 1000);
  assert.equal(game.timeClass, "bullet");
  assert.equal(game.baseSec, 60);
  assert.equal(game.incSec, 0);
  assert.equal(game.rated, true);
  assert.equal(game.ecoCode, "A00");
  assert.equal(game.openingName, "King's Fianchetto Opening");
  assert.equal(game.openingFamily, "King's Fianchetto Opening");
  assert.ok(game.plyCount > 10);
  assert.equal(game.clocks.length, game.plyCount);
  assert.ok(game.clocks.every((c) => typeof c === "number" && c >= 0 && c <= 60));
  assert.ok(game.clocks[0]! > 50, "a bullet game starts with nearly a full minute");
  assert.ok(/^[\w-]{1,100}$/.test(game.id));
});

test("a loss on time, draws and openings with move text", () => {
  const timeout = normalizeChessComGame(byUuid(gothamNov.games, "bcadd51e"), "gothamchess");
  assert.ok(timeout);
  assert.equal(timeout.userColor, "black");
  assert.equal(timeout.outcome, "loss");
  assert.equal(timeout.resultCode, "timeout");
  assert.equal(timeout.openingFamily, "Scandinavian Defense");
  assert.equal(timeout.openingName, "Scandinavian Defense Mieses-Kotrc Main Line 4.d4 Nf6 5.Nf3 Bf5");

  const repetition = normalizeChessComGame(byUuid(gothamNov.games, "3712b2ea"), "gothamchess");
  assert.ok(repetition);
  assert.equal(repetition.userColor, "white");
  assert.equal(repetition.outcome, "draw");
  assert.equal(repetition.resultCode, "repetition");
  assert.equal(repetition.timeClass, "blitz");
  assert.equal(repetition.baseSec, 180);
  assert.equal(repetition.openingFamily, "English Opening");
  assert.equal(
    repetition.openingName,
    "English Opening King's English Variation ...6.cxd5 cxd5 7.Nf3 Nc6",
  );

  const insufficient = normalizeChessComGame(byUuid(gothamNov.games, "eec160cc"), "gothamchess");
  assert.equal(insufficient?.outcome, "draw");
  assert.equal(insufficient?.openingFamily, "Trompowsky Attack");

  const qgd = normalizeChessComGame(byUuid(gothamOct.games, "985f9a91"), "gothamchess");
  assert.equal(qgd?.outcome, "loss");
  assert.equal(qgd?.resultCode, "resigned");
  assert.equal(qgd?.openingFamily, "Queen's Gambit Declined");
  assert.equal(qgd?.ecoCode, "D38");
});

test("daily, increment and chess960 games", () => {
  const daily = normalizeChessComGame(byUuid(erikOct.games, "43f156d6"), "Erik");
  assert.ok(daily);
  assert.equal(daily.timeClass, "daily");
  assert.equal(daily.baseSec, 604800);
  assert.equal(daily.incSec, 0);
  assert.equal(daily.userColor, "white");
  assert.equal(daily.openingFamily, "Four Knights Game");

  const increment = normalizeChessComGame(byUuid(erikOct.games, "4495f807"), "erik");
  assert.equal(increment?.baseSec, 60);
  assert.equal(increment?.incSec, 1);
  assert.equal(increment?.userColor, "black");
  assert.equal(increment?.outcome, "win");
  assert.equal(increment?.openingFamily, "Reti Opening");

  assert.equal(normalizeChessComGame(byUuid(erikOct.games, "98f089fa"), "erik"), null);
});

test("daily games carry no clock readings, because their %clk is not time left on a clock", () => {
  // In the fixture, 1.e4 shows 0:00:00.5 and 1...e5 0:16:11.7 in a 7-day-per-move game:
  // those are not seconds remaining, so they must not reach time-trouble or time-spent stats.
  const daily = normalizeChessComGame(byUuid(erikOct.games, "43f156d6"), "erik");
  assert.ok(daily);
  assert.match(daily.pgn, /\[%clk 0:16:11\.7\]/);
  assert.equal(daily.clocks.length, daily.plyCount);
  assert.ok(daily.clocks.every((c) => c === null));

  const live = normalizeChessComGame(byUuid(erikOct.games, "4495f807"), "erik");
  assert.ok(live?.clocks.every((c) => typeof c === "number"));
  assert.equal(live?.clocks[0], 61, "60+1: 1.g3 leaves White 61 seconds");
});

test("unusable games are skipped instead of throwing", () => {
  const base = () => byUuid(gothamNov.games, "837e619b");
  assert.equal(normalizeChessComGame(base(), "someoneelse"), null);
  assert.equal(normalizeChessComGame({ ...base(), rules: "crazyhouse" }, "gothamchess"), null);
  assert.equal(
    normalizeChessComGame(
      { ...base(), initial_setup: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN1 w Qkq - 0 1" },
      "gothamchess",
    ),
    null,
  );
  assert.equal(normalizeChessComGame({ ...base(), pgn: "1. e4 e5 2. Ke3 Ke6 *" }, "gothamchess"), null);
  assert.equal(normalizeChessComGame({ ...base(), pgn: '[Event "Live Chess"]\n\n*' }, "gothamchess"), null);
  assert.equal(normalizeChessComGame({ ...base(), time_class: "hyperbullet" }, "gothamchess"), null);
  assert.equal(normalizeChessComGame({ ...base(), white: null }, "gothamchess"), null);
  assert.equal(normalizeChessComGame({ ...base(), end_time: "soon" }, "gothamchess"), null);
  assert.equal(normalizeChessComGame(null, "gothamchess"), null);
  assert.equal(normalizeChessComGame("game", "gothamchess"), null);
});

test("missing uuid falls back to the numeric id in the url; missing opening header is named plainly", () => {
  const raw = byUuid(gothamNov.games, "837e619b");
  delete raw.uuid;
  delete raw.eco;
  raw.pgn = String(raw.pgn).replace(/^\[ECOUrl .*\]\n/m, "").replace(/^\[ECO .*\]\n/m, "");
  const game = normalizeChessComGame(raw, "gothamchess");
  assert.ok(game);
  assert.equal(game.id, "chesscom-186452351244");
  assert.equal(game.openingName, "Unknown opening");
  assert.equal(game.openingFamily, "Unknown opening");
  assert.equal(game.ecoCode, null);
});

test("opening family is the base name without variation detail or move text", () => {
  const cases: [string, string, string][] = [
    ["Sicilian-Defense-Open-Najdorf-Variation-6.Be2", "Sicilian Defense", "Sicilian Defense Open Najdorf Variation 6.Be2"],
    ["Modern-Defense-with-1-d4", "Modern Defense", "Modern Defense with 1 d4"],
    ["Kings-Gambit-Accepted-Fischer-Defense", "King's Gambit Accepted", "King's Gambit Accepted Fischer Defense"],
    ["Ruy-Lopez-Opening-Berlin-Defense", "Ruy Lopez Opening", "Ruy Lopez Opening Berlin Defense"],
    ["Caro-Kann-Defense", "Caro-Kann Defense", "Caro-Kann Defense"],
    ["Nimzo-Indian-Defense-Rubinstein-Variation", "Nimzo-Indian Defense", "Nimzo-Indian Defense Rubinstein Variation"],
    // Real slugs: castling is spelled with hyphens, and some Sicilians put the variation first.
    ["Sicilian-Defense-Open-Scheveningen-Sozin-Attack-6...a6-7.O-O-b5", "Sicilian Defense", "Sicilian Defense Open Scheveningen Sozin Attack 6...a6 7.O-O b5"],
    ["Sicilian-Defense-Open-Najdorf-Variation...8.O-O-O-O-9.Be3-Nc6", "Sicilian Defense", "Sicilian Defense Open Najdorf Variation ...8.O-O O-O 9.Be3 Nc6"],
    ["Queens-Gambit-Declined-Exchange-Positional-Line...6.e3-O-O-7.Bd3-Re8", "Queen's Gambit Declined", "Queen's Gambit Declined Exchange Positional Line ...6.e3 O-O 7.Bd3 Re8"],
    ["Ruy-Lopez-Opening-Morphy-Defense-Closed-6.d3-b5-7.Bb3-d6-8.O-O-O", "Ruy Lopez Opening", "Ruy Lopez Opening Morphy Defense Closed 6.d3 b5 7.Bb3 d6 8.O-O-O"],
    ["Alapin-Sicilian-Defense-2...d5", "Sicilian Defense", "Alapin Sicilian Defense 2...d5"],
    ["Closed-Sicilian-Defense", "Sicilian Defense", "Closed Sicilian Defense"],
    ["Alekhines-Defense-Four-Pawns-Attack...6.fxe5-c5-7.d5-e6", "Alekhine's Defense", "Alekhine's Defense Four Pawns Attack ...6.fxe5 c5 7.d5 e6"],
    ["Queens-Pawn-Opening-Accelerated-London-System", "Queen's Pawn Opening", "Queen's Pawn Opening Accelerated London System"],
    ["Four-Knights-Game-Glek-Variation", "Four Knights Game", "Four Knights Game Glek Variation"],
    ["Benko-Gambit-Declined-Main-Line", "Benko Gambit Declined", "Benko Gambit Declined Main Line"],
    ["Birds-Opening-1...f5", "Bird's Opening", "Bird's Opening 1...f5"],
    ["Reti-Opening-Kings-Indian-Attack-2...d6-3.Bg2", "Reti Opening", "Reti Opening King's Indian Attack 2...d6 3.Bg2"],
    // chess.com's placeholder when it could not name the opening.
    ["Undefined", "Unknown opening", "Unknown opening"],
  ];
  for (const [slug, family, name] of cases) {
    assert.deepEqual(openingNames(`https://www.chess.com/openings/${slug}`), { name, family }, slug);
  }
  assert.deepEqual(openingNames(null), { name: "Unknown opening", family: "Unknown opening" });
  assert.deepEqual(openingNames("https://www.chess.com/openings/"), {
    name: "Unknown opening",
    family: "Unknown opening",
  });
});

test("walks months newest first, serially, stops at max and returns newest games first", async () => {
  const { impl, calls } = fakeFetch(gothamRoutes());
  const progress: { month: string; found: number }[] = [];
  const result = await fetchChessComGames("  GothamChess ", {
    max: 6,
    timeClasses: [...ALL],
    fetchImpl: impl,
    onProgress: (p) => progress.push(p),
  });
  assert.equal(result.username, "gothamchess");
  assert.deepEqual(
    calls.map((c) => c.url),
    [`${API}gothamchess/games/archives`, `${API}gothamchess/games/2026/11`, `${API}gothamchess/games/2026/10`],
  );
  for (const call of calls) assert.equal(call.init?.headers, undefined, "no custom headers");
  assert.equal(result.games.length, 6);
  assert.equal(result.skipped, 0);
  for (let i = 1; i < result.games.length; i++) {
    assert.ok(result.games[i - 1].endTime >= result.games[i].endTime);
  }
  assert.equal(result.games[0].id, "chesscom-eec160cc-dc54-11f1-8cee-4cc05b01000f");
  // Only the newest October game made the cut.
  assert.equal(result.games[5].id, "chesscom-985f9a91-c8ee-11f1-abba-56388501000f");
  assert.deepEqual(progress, [
    { month: "2026-11", found: 5 },
    { month: "2026-10", found: 6 },
  ]);
});

test("max: Infinity means every game, not none", async () => {
  const { impl } = fakeFetch(gothamRoutes());
  const result = await fetchChessComGames("gothamchess", { max: Infinity, timeClasses: [...ALL], fetchImpl: impl });
  assert.equal(result.games.length, 7);
  const none = await fetchChessComGames("gothamchess", { max: Number.NaN, timeClasses: [...ALL], fetchImpl: impl });
  assert.equal(none.games.length, 0);
});

test("catching up stops at the newest stored game even when its id is no longer in the archive", async () => {
  const gone = new Set(["chesscom-no-longer-listed"]);
  // Newest stored game ended 2 Nov 2026 14:45 UTC: the walk stops at the first game no newer than that.
  const byTime = fakeFetch(gothamRoutes());
  const sameMonth = await fetchChessComGames("gothamchess", {
    max: 2,
    timeClasses: [...ALL],
    fetchImpl: byTime.impl,
    knownIds: gone,
    knownNewestEnd: 1793630703 * 1000,
  });
  assert.deepEqual(sameMonth.games.map((g) => g.id.slice(9, 17)), ["eec160cc", "3712b2ea", "837e619b", "bcadd51e"]);
  assert.equal(byTime.calls.length, 2);
  // Newest stored game ended in November before any blitz game there: October is not fetched.
  const byMonth = fakeFetch(gothamRoutes());
  const olderMonth = await fetchChessComGames("gothamchess", {
    max: 2,
    timeClasses: ["blitz"],
    fetchImpl: byMonth.impl,
    knownIds: gone,
    knownNewestEnd: Date.UTC(2026, 10, 1),
  });
  assert.deepEqual(olderMonth.games.map((g) => g.id.slice(9, 17)), ["3712b2ea", "837e619b"]);
  assert.deepEqual(byMonth.calls.map((c) => c.url), [`${API}gothamchess/games/archives`, `${API}gothamchess/games/2026/11`]);
});

test("filters time classes, keeps going past a missing month and stops when months run out", async () => {
  const { impl, calls } = fakeFetch(gothamRoutes());
  const result = await fetchChessComGames("gothamchess", { max: 50, timeClasses: ["blitz"], fetchImpl: impl });
  assert.equal(calls.length, 4);
  assert.equal(calls[3].url, `${API}gothamchess/games/2026/09`);
  assert.deepEqual(
    result.games.map((g) => g.id.slice(9, 17)),
    ["3712b2ea", "837e619b", "985f9a91"],
  );
  assert.ok(result.games.every((g) => g.timeClass === "blitz"));
  assert.equal(result.skipped, 0);
});

test("daily games come in only when asked for; variants count as skipped", async () => {
  const routes = {
    [`${API}erik/games/archives`]: { body: { archives: [`${API}erik/games/2026/10`] } },
    [`${API}erik/games/2026/10`]: { body: erikOct },
  };
  const live = await fetchChessComGames("Erik", {
    max: 10,
    timeClasses: ["bullet", "blitz", "rapid"],
    fetchImpl: fakeFetch(routes).impl,
  });
  assert.deepEqual(live.games.map((g) => g.timeClass), ["bullet"]);
  assert.equal(live.skipped, 0);

  const daily = await fetchChessComGames("erik", { max: 10, timeClasses: ["daily"], fetchImpl: fakeFetch(routes).impl });
  assert.deepEqual(daily.games.map((g) => g.id), ["chesscom-43f156d6-b62b-11f1-bb35-b55e4201000b"]);
  assert.equal(daily.skipped, 1);
});

test("one bad game never fails the import, and duplicates are dropped", async () => {
  const good = byUuid(gothamNov.games, "837e619b");
  const broken = { ...byUuid(gothamNov.games, "3712b2ea"), pgn: "1. e4 e5 2. Qxf7 *" };
  const { impl } = fakeFetch({
    [`${API}gothamchess/games/archives`]: { body: { archives: [`${API}gothamchess/games/2026/11`] } },
    [`${API}gothamchess/games/2026/11`]: { body: { games: [null, 7, {}, broken, good, good] } },
  });
  const result = await fetchChessComGames("gothamchess", { max: 10, timeClasses: [...ALL], fetchImpl: impl });
  assert.deepEqual(result.games.map((g) => g.id), ["chesscom-837e619b-d771-11f1-9e10-24852401000f"]);
  assert.equal(result.skipped, 4);
});

test("an empty month or an empty account returns no games", async () => {
  const { impl } = fakeFetch({
    [`${API}newplayer/games/archives`]: { body: { archives: [`${API}newplayer/games/2026/11`] } },
    [`${API}newplayer/games/2026/11`]: { body: { games: [] } },
  });
  assert.deepEqual(await fetchChessComGames("newplayer", { max: 10, timeClasses: [...ALL], fetchImpl: impl }), {
    username: "newplayer",
    games: [],
    skipped: 0,
  });
  const none = fakeFetch({ [`${API}newplayer/games/archives`]: { body: { archives: [] } } });
  const result = await fetchChessComGames("newplayer", { max: 10, timeClasses: [...ALL], fetchImpl: none.impl });
  assert.equal(result.games.length, 0);
  assert.equal(none.calls.length, 1);
});

async function rejectsWith(promise: Promise<unknown>, kind: ChessComError["kind"]) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof ChessComError, String(error));
    assert.equal(error.kind, kind);
    assert.ok(error.message.length > 10);
    return true;
  });
}

test("usernames are checked before any request", async () => {
  for (const name of ["ab", "bad name", "x".repeat(26), "drop;table", ""]) {
    const { impl, calls } = fakeFetch({});
    await rejectsWith(fetchChessComGames(name, { max: 5, timeClasses: ["blitz"], fetchImpl: impl }), "invalid-username");
    assert.equal(calls.length, 0);
  }
});

test("each failure maps to its own error kind", async () => {
  const opts = (impl: typeof fetch) => ({ max: 5, timeClasses: [...ALL], fetchImpl: impl });
  const archivesUrl = `${API}gothamchess/games/archives`;

  await rejectsWith(fetchChessComGames("gothamchess", opts(fakeFetch({}).impl)), "not-found");
  await rejectsWith(
    fetchChessComGames("gothamchess", opts(fakeFetch({ [archivesUrl]: new TypeError("Failed to fetch") }).impl)),
    "unreachable",
  );
  await rejectsWith(
    fetchChessComGames("gothamchess", opts(fakeFetch({ [archivesUrl]: { status: 503, text: "down" } }).impl)),
    "unreachable",
  );
  await rejectsWith(
    fetchChessComGames("gothamchess", opts(fakeFetch({ [archivesUrl]: { status: 403, text: "blocked" } }).impl)),
    "unreachable",
  );
  await rejectsWith(
    fetchChessComGames("gothamchess", opts(fakeFetch({ [archivesUrl]: { text: "<html>challenge</html>" } }).impl)),
    "bad-response",
  );
  await rejectsWith(
    fetchChessComGames("gothamchess", opts(fakeFetch({ [archivesUrl]: { body: { months: [] } } }).impl)),
    "bad-response",
  );
  await rejectsWith(
    fetchChessComGames(
      "gothamchess",
      opts(
        fakeFetch({
          [archivesUrl]: { body: archives },
          [`${API}gothamchess/games/2026/11`]: { body: { games: "none" } },
        }).impl,
      ),
    ),
    "bad-response",
  );
  await rejectsWith(
    fetchChessComGames("gothamchess", opts(fakeFetch({ [archivesUrl]: { status: 400, body: {} } }).impl)),
    "bad-response",
  );
});

test("429 is retried with Retry-After and then succeeds", async () => {
  const routes = gothamRoutes();
  routes[`${API}gothamchess/games/2026/11`] = [
    { status: 429, text: "", headers: { "Retry-After": "0" } },
    { body: gothamNov },
  ];
  const { impl, calls } = fakeFetch(routes);
  const result = await fetchChessComGames("gothamchess", { max: 2, timeClasses: [...ALL], fetchImpl: impl });
  assert.equal(result.games.length, 2);
  assert.equal(calls.filter((c) => c.url.endsWith("2026/11")).length, 2);
});

test("429 with Retry-After as an HTTP date in the past retries straight away", async () => {
  const routes = gothamRoutes();
  routes[`${API}gothamchess/games/archives`] = [
    { status: 429, text: "", headers: { "Retry-After": new Date(Date.now() - 60_000).toUTCString() } },
    { body: archives },
  ];
  const { impl, calls } = fakeFetch(routes);
  const started = Date.now();
  const result = await fetchChessComGames("gothamchess", { max: 1, timeClasses: [...ALL], fetchImpl: impl });
  assert.equal(result.games.length, 1);
  assert.equal(calls.filter((c) => c.url.endsWith("archives")).length, 2);
  assert.ok(Date.now() - started < 900, "no fallback backoff when the date is readable");
});

test("429 without Retry-After waits 1s, 2s, then 4s before giving up", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
  const { impl, calls } = fakeFetch({ [`${API}gothamchess/games/archives`]: { status: 429, text: "" } });
  const pending = fetchChessComGames("gothamchess", { max: 5, timeClasses: [...ALL], fetchImpl: impl });
  pending.catch(() => {});
  for (const [index, wait] of [1000, 2000, 4000].entries()) {
    await flush();
    assert.equal(calls.length, index + 1);
    t.mock.timers.tick(wait - 1);
    await flush();
    assert.equal(calls.length, index + 1, `still waiting before ${wait}ms`);
    t.mock.timers.tick(1);
  }
  await rejectsWith(pending, "rate-limited");
  assert.equal(calls.length, 4);
});

test("429 gives up after three retries", async () => {
  const limited = { status: 429, text: "", headers: { "Retry-After": "0" } };
  const { impl, calls } = fakeFetch({ [`${API}gothamchess/games/archives`]: limited });
  await rejectsWith(fetchChessComGames("gothamchess", { max: 5, timeClasses: [...ALL], fetchImpl: impl }), "rate-limited");
  assert.equal(calls.length, 4);
});

const isAbort = (error: unknown) => error instanceof Error && error.name === "AbortError";

test("an aborted signal stops the import before, during and between requests", async () => {
  const before = new AbortController();
  before.abort();
  const first = fakeFetch(gothamRoutes());
  await assert.rejects(
    fetchChessComGames("gothamchess", { max: 5, timeClasses: [...ALL], fetchImpl: first.impl, signal: before.signal }),
    isAbort,
  );
  assert.equal(first.calls.length, 0);

  const between = new AbortController();
  const second = fakeFetch(gothamRoutes());
  await assert.rejects(
    fetchChessComGames("gothamchess", {
      max: 50,
      timeClasses: [...ALL],
      fetchImpl: second.impl,
      signal: between.signal,
      onProgress: () => between.abort(),
    }),
    isAbort,
  );
  assert.equal(second.calls.length, 2, "no request after the abort");

  const during = new AbortController();
  const routes = gothamRoutes();
  routes[`${API}gothamchess/games/archives`] = { status: 429, text: "", headers: { "Retry-After": "20" } };
  const started = Date.now();
  setTimeout(() => during.abort(), 20);
  await assert.rejects(
    fetchChessComGames("gothamchess", {
      max: 5,
      timeClasses: [...ALL],
      fetchImpl: fakeFetch(routes).impl,
      signal: during.signal,
    }),
    isAbort,
  );
  assert.ok(Date.now() - started < 5000, "the retry wait is cut short");
});
