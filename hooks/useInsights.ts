"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { StockfishClient } from "@/lib/engine/stockfish-client";
import {
  analysePending,
  clearStoredGames,
  importGames,
  isAbortError,
  loadSnapshot,
  recommendedWorkers,
  type AnalysisFailure,
  type EngineHandle,
  type ImportResult,
  type InsightsSnapshot,
} from "@/lib/insights/pipeline";
import { memoryInsightsStore, openInsightsStore, type InsightsStore } from "@/lib/insights/store";
import { ANALYSIS_NODES, type TimeClass } from "@/lib/insights/types";
import type { RetryAttempt } from "@/lib/learning/coach/model";

export type InsightsStatus = "loading" | "empty" | "ready" | "error";

export interface ImportState {
  running: boolean;
  /** Month being read, "YYYY-MM", while running. */
  month: string | null;
  /** Games found so far while running. */
  found: number;
  /** Plain-English reason the last import failed; null when it worked or was cancelled. */
  error: string | null;
  /** Outcome of the last successful import. */
  result: ImportResult | null;
}

export interface AnalysisState {
  running: boolean;
  /** Games analysed and saved in this run, out of `total` waiting when it started. */
  done: number;
  total: number;
  /** Positions finished, out of the positions in the games being analysed right now. */
  positionsDone: number;
  positionsTotal: number;
  /** Games that could not be analysed in this run; the next run tries them again. */
  failed: number;
  failures: AnalysisFailure[];
  /** Why the run stopped early (engine kept failing, saving failed); null otherwise. */
  error: string | null;
  /** Rough seconds left, once there is enough to go on; null otherwise. */
  etaSeconds: number | null;
  /** Engines running at once. */
  workers: number;
}

export interface ConnectOptions {
  max: number;
  timeClasses: TimeClass[];
}

export interface UseInsights {
  status: InsightsStatus;
  /** Problem loading or saving insights; with status "error" nothing could be loaded. */
  error: string | null;
  /** False when the browser refused storage: everything lasts only until the page is closed. */
  saved: boolean;
  /** Why insights are not being saved in this browser, ready to show as-is. */
  storageNote: string | null;
  snapshot: InsightsSnapshot | null;
  importState: ImportState;
  analysisState: AnalysisState;
  /** Imports a player's games (clearing a different player's data first), then starts analysis. */
  connect(username: string, options: ConnectOptions): Promise<boolean>;
  /** Re-imports the stored player with the stored settings, then analyses new games. */
  refresh(): Promise<boolean>;
  cancelImport(): void;
  startAnalysis(): void;
  stopAnalysis(): void;
  /**
   * Stops everything and deletes every imported game, analysis and attempt. False when nothing was
   * deleted: the store could not be cleared, or another tab changed its player.
   */
  disconnect(): Promise<boolean>;
  recordAttempt(attempt: RetryAttempt): Promise<void>;
}

const IDLE_IMPORT: ImportState = { running: false, month: null, found: 0, error: null, result: null };
const IDLE_ANALYSIS: AnalysisState = {
  running: false,
  done: 0,
  total: 0,
  positionsDone: 0,
  positionsTotal: 0,
  failed: 0,
  failures: [],
  error: null,
  etaSeconds: null,
  workers: 0,
};
const SNAPSHOT_INTERVAL_MS = 1000;
const PROGRESS_INTERVAL_MS = 250;

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/** The engine's own messages are written for Play ("retry the engine"); this page words them itself. */
function analysisEngineError(error: unknown): Error {
  const message = messageOf(error, "");
  if (/stopped responding/i.test(message)) return new Error("The engine stopped responding while analysing this game.");
  if (/could not load|too long to load/i.test(message)) return new Error("Stockfish could not start. Check your connection.");
  if (/unreadable response/i.test(message)) return new Error("Stockfish sent an answer that could not be read.");
  return error instanceof Error ? error : new Error("The engine failed while analysing this game.");
}

type Job = { controller: AbortController; done: Promise<void> };

/**
 * The in-memory stand-in when the browser refuses IndexedDB. Kept for the life of the page, not of
 * one visit to it, so moving around the app and coming back keeps everything until the page closes.
 */
let fallbackStore: InsightsStore | null = null;

/**
 * State and actions for the "Your leaks" page. Imported games stay in their own IndexedDB
 * database (or in memory when the browser refuses storage). Each analysis worker owns its own
 * Stockfish, separate from Play's engine, and every engine is terminated on stop and on unmount.
 */
export function useInsights(): UseInsights {
  const [snapshot, setSnapshot] = useState<InsightsSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [storageNote, setStorageNote] = useState<string | null>(null);
  const [importState, setImportState] = useState<ImportState>(IDLE_IMPORT);
  const [analysisState, setAnalysisState] = useState<AnalysisState>(IDLE_ANALYSIS);

  const storeRef = useRef<InsightsStore | null>(null);
  const snapshotRef = useRef<InsightsSnapshot | null>(null);
  // Bumped on unmount and on disconnect: any async result from an older generation is dropped.
  const generation = useRef(0);
  const reloadSeq = useRef(0);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastReload = useRef(0);
  const importJob = useRef<Job | null>(null);
  const analysisJob = useRef<Job | null>(null);
  const clients = useRef(new Set<StockfishClient>());

  const reload = useCallback(async (token: number) => {
    const store = storeRef.current;
    if (!store) return;
    const seq = ++reloadSeq.current;
    try {
      const next = await loadSnapshot(store, snapshotRef.current);
      if (generation.current !== token || seq !== reloadSeq.current) return;
      snapshotRef.current = next;
      setSnapshot(next);
      setLoadError(null);
    } catch (e) {
      if (generation.current === token && seq === reloadSeq.current)
        setLoadError(messageOf(e, "Your saved insights could not be read."));
    }
  }, []);

  const reloadNow = useCallback(
    (token: number) => {
      clearTimeout(reloadTimer.current);
      reloadTimer.current = undefined;
      lastReload.current = Date.now();
      return reload(token);
    },
    [reload],
  );

  /** At most about one snapshot rebuild a second while games keep finishing. */
  const reloadSoon = useCallback(
    (token: number) => {
      if (reloadTimer.current !== undefined) return;
      const wait = Math.max(0, lastReload.current + SNAPSHOT_INTERVAL_MS - Date.now());
      reloadTimer.current = setTimeout(() => {
        reloadTimer.current = undefined;
        if (generation.current !== token) return;
        lastReload.current = Date.now();
        void reload(token);
      }, wait);
    },
    [reload],
  );

  useEffect(() => {
    let alive = true;
    let opened: InsightsStore | null = null;
    const token = generation.current;
    const engines = clients.current;
    queueMicrotask(async () => {
      if (!alive) return;
      let store: InsightsStore;
      let note: string | null = null;
      try {
        store = await openInsightsStore();
      } catch (e) {
        fallbackStore ??= memoryInsightsStore();
        store = fallbackStore;
        note = messageOf(e, "This browser is not letting the app save insights. They will only last until the page is closed.");
      }
      if (!alive) {
        if (store !== fallbackStore) store.close();
        return;
      }
      opened = store;
      storeRef.current = store;
      setStorageNote(note);
      lastReload.current = Date.now();
      await reload(token);
    });
    return () => {
      alive = false;
      // Intentional generation invalidation: drop every async result started while mounted.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      importJob.current?.controller.abort();
      analysisJob.current?.controller.abort();
      clearTimeout(reloadTimer.current);
      reloadTimer.current = undefined;
      for (const client of engines) client.terminate();
      engines.clear();
      if (opened) {
        // The memory stand-in stays open: closing it would lose everything at the next page change.
        if (opened !== fallbackStore) opened.close();
        if (storeRef.current === opened) storeRef.current = null;
      }
    };
  }, [reload]);

  const createSearch = useCallback((): EngineHandle => {
    const client = new StockfishClient();
    clients.current.add(client);
    // A client stopped before its first search would otherwise leave its start-up promise unhandled.
    client.init().catch(() => undefined);
    return {
      search: async (history, limit) => {
        try {
          await client.init();
          return await client.analyzePosition("", 20, history, limit);
        } catch (e) {
          throw analysisEngineError(e);
        }
      },
      dispose: () => {
        clients.current.delete(client);
        client.terminate();
      },
    };
  }, []);

  const startAnalysis = useCallback(() => {
    const store = storeRef.current;
    // An import may clear the store, so analysis waits for it to finish.
    if (!store || analysisJob.current || importJob.current) return;
    const token = generation.current;
    const controller = new AbortController();
    const workers = recommendedWorkers();
    const startedAt = Date.now();
    let lastEmit = 0;
    let lastGames = -1;
    setAnalysisState({ ...IDLE_ANALYSIS, running: true, workers });
    const done = analysePending({
      store,
      createSearch,
      workers,
      nodes: ANALYSIS_NODES,
      signal: controller.signal,
      onProgress: (p) => {
        if (generation.current !== token) return;
        const now = Date.now();
        const games = p.done + p.failed;
        if (games === lastGames && now - lastEmit < PROGRESS_INTERVAL_MS) return;
        lastEmit = now;
        lastGames = games;
        const elapsed = (now - startedAt) / 1000;
        const rate = elapsed >= 5 && p.searchedPositions >= 10 ? p.searchedPositions / elapsed : 0;
        setAnalysisState((prior) => ({
          ...prior,
          running: true,
          done: p.done,
          total: p.total,
          failed: p.failed,
          positionsDone: p.positionsDone,
          positionsTotal: p.positionsTotal,
          etaSeconds: rate > 0 ? Math.ceil(p.remainingPositions / rate) : null,
        }));
      },
      onGameAnalysed: () => {
        if (generation.current === token) reloadSoon(token);
      },
    }).then(
      (result) => {
        if (generation.current !== token) return;
        setAnalysisState((prior) => ({
          ...prior,
          running: false,
          done: result.analysed,
          total: result.total,
          failed: result.failed.length,
          failures: result.failed,
          positionsDone: 0,
          positionsTotal: 0,
          etaSeconds: null,
          error: null,
        }));
      },
      (e) => {
        if (generation.current !== token) return;
        setAnalysisState((prior) => ({
          ...prior,
          running: false,
          positionsDone: 0,
          positionsTotal: 0,
          etaSeconds: null,
          error: messageOf(e, "Analysis stopped unexpectedly. Your finished games are saved."),
        }));
      },
    ).finally(() => {
      if (analysisJob.current?.controller === controller) analysisJob.current = null;
      if (generation.current === token) void reloadNow(token);
    });
    analysisJob.current = { controller, done };
  }, [createSearch, reloadNow, reloadSoon]);

  const stopAnalysis = useCallback(() => {
    analysisJob.current?.controller.abort();
  }, []);

  const cancelImport = useCallback(() => {
    importJob.current?.controller.abort();
  }, []);

  const connect = useCallback(
    async (username: string, options: ConnectOptions) => {
      const store = storeRef.current;
      if (!store || importJob.current) return false;
      const token = generation.current;
      // The player this tab shows (and the page confirmed a switch against). Another tab may have
      // imported someone else since; the import then refuses to clear that player's data.
      const shown = snapshotRef.current;
      const expectedOwner = shown ? (shown.meta?.username ?? null) : undefined;
      const controller = new AbortController();
      let finish: () => void = () => {};
      importJob.current = { controller, done: new Promise<void>((resolve) => (finish = resolve)) };
      setImportState({ ...IDLE_IMPORT, running: true });
      // Importing another player clears the store, so no analysis may still be writing to it.
      const running = analysisJob.current;
      running?.controller.abort();
      let imported = false;
      try {
        await running?.done;
        const result = await importGames({
          store,
          username,
          max: options.max,
          timeClasses: options.timeClasses,
          expectedOwner,
          signal: controller.signal,
          onProgress: (p) => {
            if (generation.current === token) setImportState((prior) => ({ ...prior, month: p.month, found: p.found }));
          },
        });
        imported = true;
        if (generation.current !== token) return false;
        setImportState({ ...IDLE_IMPORT, result });
        return true;
      } catch (e) {
        if (generation.current === token)
          setImportState({
            ...IDLE_IMPORT,
            error: isAbortError(e) ? null : messageOf(e, "The import failed. Please try again."),
          });
        return false;
      } finally {
        finish();
        if (importJob.current?.controller === controller) importJob.current = null;
        if (generation.current === token) {
          await reloadNow(token);
          // New games get analysed; after a failed import, analysis that was running carries on.
          if (imported || running) startAnalysis();
        }
      }
    },
    [reloadNow, startAnalysis],
  );

  const refresh = useCallback(async () => {
    const meta = snapshotRef.current?.meta;
    if (!meta) return false;
    return connect(meta.username, { max: meta.max, timeClasses: meta.timeClasses });
  }, [connect]);

  const disconnect = useCallback(async () => {
    const store = storeRef.current;
    if (!store) return false;
    // The player this tab shows (and the page asked to delete). Another tab may have imported someone else since.
    const shown = snapshotRef.current;
    const expectedOwner = shown ? (shown.meta?.username ?? null) : undefined;
    const token = ++generation.current;
    const jobs = [importJob.current, analysisJob.current];
    for (const job of jobs) job?.controller.abort();
    clearTimeout(reloadTimer.current);
    reloadTimer.current = undefined;
    setImportState(IDLE_IMPORT);
    setAnalysisState(IDLE_ANALYSIS);
    await Promise.all(jobs.map((job) => job?.done));
    if (generation.current !== token) return false;
    try {
      if (!(await clearStoredGames(store, expectedOwner))) {
        if (generation.current !== token) return false;
        setSaveError("This browser's saved games changed in another tab, so nothing was deleted. Check the player shown now before deleting.");
        await reloadNow(token);
        return false;
      }
    } catch (e) {
      if (generation.current === token) setSaveError(messageOf(e, "Your imported games could not be deleted."));
      return false;
    }
    setSaveError(null);
    snapshotRef.current = null;
    await reloadNow(token);
    return true;
  }, [reloadNow]);

  const recordAttempt = useCallback(async (attempt: RetryAttempt) => {
    const store = storeRef.current;
    const token = generation.current;
    let failure: string | null = null;
    try {
      if (!store) throw new Error("Your saved insights are not open yet.");
      await store.putAttempt(attempt);
    } catch (e) {
      failure = messageOf(e, "This attempt could not be saved.");
    }
    if (generation.current !== token) return;
    setSaveError(failure && `${failure} You can keep practising; this attempt may be lost when the page closes.`);
    const prior = snapshotRef.current;
    if (!prior) return;
    const next = { ...prior, attempts: [...prior.attempts.filter((a) => a.id !== attempt.id), attempt] };
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const error = loadError ?? saveError;
  const status: InsightsStatus = snapshot ? (snapshot.games.length ? "ready" : "empty") : loadError ? "error" : "loading";

  return {
    status,
    error,
    saved: storageNote === null,
    storageNote,
    snapshot,
    importState,
    analysisState,
    connect,
    refresh,
    cancelImport,
    startAnalysis,
    stopAnalysis,
    disconnect,
    recordAttempt,
  };
}
