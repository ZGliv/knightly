/*
 * File: lib/engine/stockfish-client.ts
 * Description: Provides a minimal queued UCI client for communicating with a Stockfish web worker.
 * Functions:
 * - StockfishClient.constructor: Initializes worker wiring and internal queue state.
 * - StockfishClient.init: Sends startup UCI commands once.
 * - StockfishClient.setSkillLevel: Sets Stockfish skill option for difficulty control.
 * - StockfishClient.analyzePosition: Returns best move and score for a FEN at a target depth.
 * - StockfishClient.terminate: Cleans up the worker when unmounting.
 */

interface AnalysisResult {
  bestMove: string;
  scoreCp: number;
  mateIn: number | null;
}

interface PendingTask {
  fen: string;
  depth: number;
  resolve: (value: AnalysisResult) => void;
  reject: (reason?: unknown) => void;
}

export class StockfishClient {
  private worker: Worker | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private queue: PendingTask[] = [];
  private activeTask: PendingTask | null = null;
  private lastScoreCp = 0;
  private lastMateIn: number | null = null;
  private initResolver: (() => void) | null = null;

  constructor() {
    // This bootstraps a same-origin worker and then imports Stockfish to avoid cross-origin worker blocking.
    const bootstrapScript = `
      importScripts("https://unpkg.com/stockfish@18.0.5/bin/stockfish-18-asm.js");
    `;
    const bootstrapUrl = URL.createObjectURL(
      new Blob([bootstrapScript], { type: "application/javascript" }),
    );
    this.worker = new Worker(bootstrapUrl);
    URL.revokeObjectURL(bootstrapUrl);

    // This routes all UCI output through a single parser for queue-based requests.
    this.worker.onmessage = (event: MessageEvent<string>) => {
      this.handleEngineLine(event.data);
    };
  }

  init(): Promise<void> {
    if (this.initialized) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve) => {
      // This stores the resolver until a readyok line arrives from the engine.
      this.initResolver = resolve;
      this.send("uci");
      this.send("isready");
    });

    return this.initPromise;
  }

  async setSkillLevel(level: number): Promise<void> {
    await this.init();
    const normalized = Math.max(0, Math.min(20, Math.round(level)));
    this.send(`setoption name Skill Level value ${normalized}`);
    this.send("isready");
  }

  async analyzePosition(fen: string, depth = 10): Promise<AnalysisResult> {
    await this.init();

    return new Promise<AnalysisResult>((resolve, reject) => {
      // This stores requests and processes one UCI search at a time.
      this.queue.push({ fen, depth, resolve, reject });
      this.processQueue();
    });
  }

  terminate(): void {
    if (!this.worker) return;
    this.send("quit");
    this.worker.terminate();
    this.worker = null;
  }

  private processQueue(): void {
    if (this.activeTask || this.queue.length === 0) return;
    this.activeTask = this.queue.shift() ?? null;
    if (!this.activeTask) return;

    // This resets score tracking for the active search task.
    this.lastScoreCp = 0;
    this.lastMateIn = null;

    this.send("ucinewgame");
    this.send(`position fen ${this.activeTask.fen}`);
    this.send(`go depth ${this.activeTask.depth}`);
  }

  private send(command: string): void {
    this.worker?.postMessage(command);
  }

  private handleEngineLine(rawLine: string): void {
    const line = rawLine.trim();
    if (!line) return;

    // This completes initial handshake once the engine confirms readiness.
    if (line === "readyok" && this.initResolver) {
      this.initialized = true;
      this.initResolver();
      this.initResolver = null;
    }

    if (!this.activeTask) return;

    // This extracts latest cp/mate score from UCI info lines.
    if (line.startsWith("info")) {
      // This parses numeric centipawn scores from engine info lines.
      const cpMatch = line.match(/score cp (-?\d+)/);
      if (cpMatch) this.lastScoreCp = Number(cpMatch[1]);

      // This parses mate scores so forced mates are represented as large score swings.
      const mateMatch = line.match(/score mate (-?\d+)/);
      if (mateMatch) {
        this.lastMateIn = Number(mateMatch[1]);
        this.lastScoreCp = this.lastMateIn > 0 ? 10000 : -10000;
      }
      return;
    }

    // This completes the task when UCI emits bestmove.
    if (line.startsWith("bestmove")) {
      const bestMove = line.split(" ")[1] ?? "(none)";
      this.activeTask.resolve({
        bestMove,
        scoreCp: this.lastScoreCp,
        mateIn: this.lastMateIn,
      });
      this.activeTask = null;
      this.processQueue();
    }
  }
}
