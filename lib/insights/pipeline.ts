import type { RetryAttempt } from "@/lib/learning/coach/model";
import { analyseGame, type PositionSearch } from "@/lib/insights/analyse-game";
import { fetchChessComGames } from "@/lib/insights/chesscom";
import { assessGame } from "@/lib/insights/leaks";
import { buildReport } from "@/lib/insights/report";
import type { InsightsStore } from "@/lib/insights/store";
import {
  ANALYSIS_NODES,
  ANALYSIS_VERSION,
  type GameAnalysis,
  type GameAssessment,
  type ImportedGame,
  type InsightsMeta,
  type InsightsReport,
  type Leak,
  type TimeClass,
} from "@/lib/insights/types";

/**
 * Orchestration for "Your leaks", free of React and browser APIs so it runs under node:test:
 * import games into the store, analyse the ones that still need it, and read everything back
 * as one snapshot for the page.
 */

function abortError(message: string) {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

export const isAbortError = (error: unknown) => error instanceof Error && error.name === "AbortError";

// ---------- import ----------

export interface ImportResult {
  /** The name as the user typed it (trimmed); chess.com treats names case-insensitively. */
  username: string;
  /** Games that were not in the store before this import. */
  added: number;
  /** Games in the store after this import. */
  total: number;
  /** chess.com games that could not be used (variants, odd starts, unreadable records). */
  skipped: number;
  /** True when a different player's data was cleared first. */
  replaced: boolean;
}

/**
 * Fetches the player's recent games and merges them into the store. Nothing is written until the
 * fetch succeeds, so a failed or cancelled import leaves the store as it was. Importing a different
 * player than the one stored clears everything first (games, analyses, attempts); ask the user before.
 *
 * Re-importing the stored player fetches every game played since the newest stored one, even past
 * `max`, so no game is skipped between two imports.
 *
 * `expectedOwner` is the stored player the caller showed the user (null for none). The store is
 * shared by every tab, so when it would clear a different owner than that, the import is refused.
 */
export async function importGames(options: {
  store: InsightsStore;
  username: string;
  max: number;
  timeClasses: TimeClass[];
  expectedOwner?: string | null;
  signal?: AbortSignal;
  onProgress?: (p: { month: string; found: number }) => void;
  fetchImpl?: typeof fetch;
}): Promise<ImportResult> {
  const { store, max, signal } = options;
  if (!Number.isSafeInteger(max) || max < 1) throw new Error("Choose how many games to import (at least 1).");
  const timeClasses = [...new Set(options.timeClasses)];
  if (!timeClasses.length) throw new Error("Choose at least one kind of game to import.");

  const [metaBefore, stored] = await Promise.all([store.getMeta(), store.listGames()]);
  const samePlayer =
    typeof options.username === "string" &&
    metaBefore?.username.toLowerCase() === options.username.trim().toLowerCase();
  const wanted = new Set<TimeClass>(timeClasses);
  const storedWanted = samePlayer ? stored.filter((game) => wanted.has(game.timeClass)) : [];
  const knownIds = new Set(storedWanted.map((game) => game.id));
  const knownNewestEnd = storedWanted.length ? Math.max(...storedWanted.map((game) => game.endTime)) : undefined;

  const fetched = await fetchChessComGames(options.username, {
    max,
    timeClasses,
    signal,
    onProgress: options.onProgress,
    fetchImpl: options.fetchImpl,
    knownIds,
    knownNewestEnd,
  });
  if (signal?.aborted) throw abortError("The import was cancelled.");

  // Read again: another tab may have changed the store while the games were being fetched.
  const [meta, previous] = await Promise.all([store.getMeta(), store.listGames()]);
  // Data with no owner on record (a half-finished earlier import) is treated as someone else's.
  const replaced = meta ? meta.username.toLowerCase() !== fetched.username : previous.length > 0;
  if (
    replaced &&
    options.expectedOwner !== undefined &&
    (meta?.username.toLowerCase() ?? null) !== (options.expectedOwner?.toLowerCase() ?? null)
  ) {
    throw new Error("This browser's saved games changed in another tab. Reload the page before importing.");
  }
  if (replaced) await store.clear();
  const known = new Set(replaced ? [] : previous.map((game) => game.id));
  const added = fetched.games.filter((game) => !known.has(game.id)).length;
  await store.putGames(fetched.games);
  const username = options.username.trim();
  await store.setMeta({ source: "chesscom", username, importedAt: new Date().toISOString(), max, timeClasses });
  return { username, added, total: known.size + added, skipped: fetched.skipped, replaced };
}

/**
 * Deletes everything stored (games, analyses, attempts, owner). `expectedOwner` is the stored player
 * the caller showed the user (null for none); when another tab has changed the owner since, nothing
 * is deleted and the result is false.
 */
export async function clearStoredGames(store: InsightsStore, expectedOwner?: string | null): Promise<boolean> {
  if (expectedOwner !== undefined) {
    const meta = await store.getMeta();
    if ((meta?.username.toLowerCase() ?? null) !== (expectedOwner?.toLowerCase() ?? null)) return false;
  }
  await store.clear();
  return true;
}

// ---------- analysis ----------

/** One engine owned by one worker. dispose() must stop it and make any search in flight settle. */
export interface EngineHandle {
  search: PositionSearch;
  dispose(): void;
}

export interface AnalysisProgress {
  /** Games to analyse in this run. */
  total: number;
  /** Games analysed and saved so far in this run. */
  done: number;
  /** Games that could not be analysed in this run. */
  failed: number;
  /** Positions finished, and positions in total, across the games being analysed right now. */
  positionsDone: number;
  positionsTotal: number;
  /** Positions finished in this run across all games, and positions still to go (for a time estimate). */
  searchedPositions: number;
  remainingPositions: number;
}

export interface AnalysisFailure {
  gameId: string;
  message: string;
}

export interface AnalysisRunResult {
  total: number;
  analysed: number;
  failed: AnalysisFailure[];
  /** True when the run was stopped through its signal before every game was tried. */
  cancelled: boolean;
}

/** Consecutive engine failures (across all workers) that end the run. */
export const MAX_CONSECUTIVE_FAILURES = 3;

/** A stored analysis this code can use for this game: right version and one entry per position. */
export function hasUsableAnalysis(game: ImportedGame, analysis: GameAnalysis | undefined) {
  return (
    !!analysis &&
    analysis.version === ANALYSIS_VERSION &&
    analysis.gameId === game.id &&
    analysis.evals.length === game.plyCount + 1 &&
    analysis.best.length === game.plyCount + 1 &&
    analysis.lines.length === game.plyCount + 1 &&
    analysis.depths.length === game.plyCount + 1
  );
}

function pendingGames(games: ImportedGame[], analyses: GameAnalysis[]) {
  const byGame = new Map(analyses.map((analysis) => [analysis.gameId, analysis]));
  return games.filter((game) => !hasUsableAnalysis(game, byGame.get(game.id)));
}

const messageOf = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Something went wrong while analysing this game.";

/**
 * Analyses every stored game that has no usable analysis, newest first, `workers` games at a time.
 * Each worker owns one engine from createSearch(). Each finished game is saved straight away.
 *
 * - Aborting `signal` disposes every engine and resolves with cancelled: true (never rejects).
 * - A game whose own data is unusable (fails before any search) is recorded as failed and skipped.
 * - An engine failure is recorded as failed, that worker's engine is replaced, and the run goes on;
 *   MAX_CONSECUTIVE_FAILURES engine failures in a row reject the run with a plain-English Error.
 * - A failure to save rejects the run straight away (every later save would fail the same way).
 * - Each game is checked to still be stored before it is searched and before it is saved. Once one
 *   is gone (the store was cleared, e.g. from another tab) the run ends quietly with nothing more
 *   saved; it resolves with fewer games analysed than `total`.
 */
export async function analysePending(options: {
  store: InsightsStore;
  createSearch: () => EngineHandle | Promise<EngineHandle>;
  workers: number;
  nodes?: number;
  signal?: AbortSignal;
  onProgress?: (progress: AnalysisProgress) => void;
  onGameAnalysed?: (analysis: GameAnalysis) => void;
}): Promise<AnalysisRunResult> {
  const { store, signal } = options;
  const nodes = options.nodes ?? ANALYSIS_NODES;
  const [games, analyses] = await Promise.all([store.listGames(), store.listAnalyses()]);
  const queue = pendingGames(games, analyses);
  const total = queue.length;
  const failed: AnalysisFailure[] = [];
  let analysed = 0;
  if (!total || signal?.aborted) return { total, analysed, failed, cancelled: !!signal?.aborted && total > 0 };

  const engines = new Set<EngineHandle>();
  const dispose = (engine: EngineHandle) => {
    if (!engines.delete(engine)) return;
    try {
      engine.dispose();
    } catch {
      // A broken engine is being thrown away anyway.
    }
  };

  let stopped = false;
  let fatal: Error | null = null;
  let rejectStopped: (error: Error) => void = () => {};
  // Settles every search in flight the moment the run stops, even one whose engine ignores dispose().
  const whenStopped = new Promise<never>((_, reject) => {
    rejectStopped = reject;
  });
  whenStopped.catch(() => undefined);
  const stop = () => {
    if (stopped) return;
    stopped = true;
    rejectStopped(abortError("Game analysis was cancelled."));
    for (const engine of [...engines]) dispose(engine);
  };
  const onAbort = () => stop();
  signal?.addEventListener("abort", onAbort, { once: true });

  const inFlight = new Map<string, { done: number; total: number }>();
  let searchedPositions = 0;
  let remainingPositions = queue.reduce((sum, game) => sum + game.plyCount + 1, 0);
  let consecutive = 0;
  const report = () => {
    if (stopped) return;
    let positionsDone = 0;
    let positionsTotal = 0;
    for (const entry of inFlight.values()) {
      positionsDone += entry.done;
      positionsTotal += entry.total;
    }
    options.onProgress?.({
      total,
      done: analysed,
      failed: failed.length,
      positionsDone,
      positionsTotal,
      searchedPositions,
      remainingPositions,
    });
  };

  // Games are only ever removed all together (another tab switching player or deleting them), so
  // a queued game that is gone means the queue is stale: the run ends instead of analysing games
  // nobody can see any more.
  const stillStored = async (game: ImportedGame) => {
    if ((await store.listGames()).some((stored) => stored.id === game.id)) return true;
    queue.length = 0;
    return false;
  };

  async function runWorker() {
    let engine: EngineHandle | null = null;
    try {
      while (!stopped) {
        const game = queue.shift();
        if (!game) return;
        try {
          if (!(await stillStored(game))) return;
        } catch (error) {
          fatal ??= error instanceof Error ? error : new Error(messageOf(error));
          stop();
          return;
        }
        if (stopped) return;
        const progress = { done: 0, total: game.plyCount + 1 };
        inFlight.set(game.id, progress);
        report();
        // Data errors are thrown before the first search; only errors after it are the engine's fault.
        let searched = false;
        let engineFault = false;
        try {
          if (!engine) {
            engineFault = true;
            const creating = Promise.resolve().then(() => options.createSearch());
            // An engine that arrives after the run stopped is thrown away at once.
            creating.then(
              (late) => {
                if (!stopped || engines.has(late)) return;
                try {
                  late.dispose();
                } catch {
                  // Nothing left to stop.
                }
              },
              () => undefined,
            );
            const created = await Promise.race([creating, whenStopped]);
            engines.add(created);
            engine = created;
            if (stopped) return;
            engineFault = false;
          }
          const handle = engine;
          const search: PositionSearch = (history, limit) => {
            searched = true;
            const pending = handle.search(history, limit);
            pending.catch(() => undefined);
            return Promise.race([pending, whenStopped]);
          };
          const analysis = await analyseGame(game, search, {
            nodes,
            isCancelled: () => stopped,
            onPosition: (done) => {
              progress.done = done;
              searchedPositions++;
              remainingPositions--;
              report();
            },
          });
          if (stopped) return;
          try {
            if (!(await stillStored(game)) || stopped) return;
            await store.putAnalysis(analysis);
          } catch (error) {
            fatal ??= error instanceof Error ? error : new Error(messageOf(error));
            stop();
            return;
          }
          analysed++;
          consecutive = 0;
          options.onGameAnalysed?.(analysis);
        } catch (error) {
          if (stopped) return;
          failed.push({ gameId: game.id, message: messageOf(error) });
          remainingPositions -= progress.total - progress.done;
          if (searched || engineFault) {
            if (engine) dispose(engine);
            engine = null;
            consecutive++;
            if (consecutive >= MAX_CONSECUTIVE_FAILURES) {
              fatal ??= new Error(
                `Analysis stopped because the engine failed on ${MAX_CONSECUTIVE_FAILURES} games in a row. ` +
                  `Games finished before that are saved. The last problem was: ${messageOf(error)}`,
              );
              stop();
              return;
            }
          }
        } finally {
          inFlight.delete(game.id);
          report();
        }
      }
    } finally {
      if (engine) dispose(engine);
    }
  }

  const count = Math.max(1, Math.min(Number.isFinite(options.workers) ? Math.floor(options.workers) : 1, total));
  try {
    await Promise.all(Array.from({ length: count }, () => runWorker()));
  } finally {
    signal?.removeEventListener("abort", onAbort);
    stop();
  }
  if (fatal) throw fatal;
  return { total, analysed, failed, cancelled: !!signal?.aborted && analysed + failed.length < total };
}

// ---------- snapshot ----------

export interface InsightsSnapshot {
  meta: InsightsMeta | null;
  /** Newest first. */
  games: ImportedGame[];
  /** Usable analyses of stored games only. */
  analyses: GameAnalysis[];
  /** One per analysed game whose analysis could be read, newest game first. */
  assessments: GameAssessment[];
  report: InsightsReport;
  /** Every mistake and blunder from every assessed game, biggest drop first. */
  leaks: Leak[];
  attempts: RetryAttempt[];
  /** Games still waiting for a usable analysis. */
  pending: number;
  /** Games whose saved analysis is complete but could not be read; they are left out of the report. */
  unreadable: number;
}

const byDrop = (a: Leak, b: Leak) => b.drop - a.drop || a.id.localeCompare(b.id);

/**
 * Reads the store and builds everything the page shows. A game whose analysis cannot be assessed is
 * skipped and counted in `unreadable`, never failing the whole snapshot. Pass the previous snapshot
 * to reuse assessments whose analysis has not changed (assessing replays every game).
 */
export async function loadSnapshot(store: InsightsStore, previous?: InsightsSnapshot | null): Promise<InsightsSnapshot> {
  const [meta, games, storedAnalyses, attempts] = await Promise.all([
    store.getMeta(),
    store.listGames(),
    store.listAnalyses(),
    store.listAttempts(),
  ]);
  const byGame = new Map(storedAnalyses.map((analysis) => [analysis.gameId, analysis]));
  const earlier = new Map<string, { analysedAt: string; assessment: GameAssessment }>();
  if (previous) {
    const stamps = new Map(previous.analyses.map((analysis) => [analysis.gameId, analysis.analysedAt]));
    for (const assessment of previous.assessments) {
      const analysedAt = stamps.get(assessment.gameId);
      if (analysedAt !== undefined) earlier.set(assessment.gameId, { analysedAt, assessment });
    }
  }

  const analyses: GameAnalysis[] = [];
  const assessments: GameAssessment[] = [];
  let pending = 0;
  let unreadable = 0;
  for (const game of games) {
    const analysis = byGame.get(game.id);
    if (!analysis || !hasUsableAnalysis(game, analysis)) {
      pending++;
      continue;
    }
    analyses.push(analysis);
    const reused = earlier.get(game.id);
    if (reused && reused.analysedAt === analysis.analysedAt) {
      assessments.push(reused.assessment);
      continue;
    }
    try {
      assessments.push(assessGame(game, analysis));
    } catch {
      unreadable++;
    }
  }

  return {
    meta,
    games,
    analyses,
    assessments,
    report: buildReport(meta?.username ?? "", games, assessments),
    leaks: assessments.flatMap((assessment) => assessment.leaks).sort(byDrop),
    attempts,
    pending,
    unreadable,
  };
}

// ---------- device ----------

/**
 * How many engines to run at once: 1 on phones, on fewer than 8 logical cores (or an unknown count)
 * and on devices reporting under 4 GB of memory; otherwise 2.
 */
export function recommendedWorkers(): 1 | 2 {
  const nav = typeof navigator === "undefined" ? undefined : (navigator as Navigator & { deviceMemory?: number });
  const cores = nav?.hardwareConcurrency;
  if (typeof cores !== "number" || !(cores >= 8)) return 1;
  const memory = nav?.deviceMemory;
  if (typeof memory === "number" && memory < 4) return 1;
  try {
    const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    const shortSide = typeof screen === "undefined" ? Infinity : Math.min(screen.width, screen.height);
    if (coarse && shortSide < 600) return 1;
  } catch {
    // Without media queries there is no sign of a phone.
  }
  return 2;
}
