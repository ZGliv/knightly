import { MaiaClient, type HumanStatus } from "./maia-client";
import {
  strengthCommands,
  type EngineStrength,
} from "./strength";
export interface EngineAnalysis {
  bestMove: string;
  scoreCp: number | null;
  mateIn: number | null;
  depth: number;
  pv: string[];
}

/** A fixed node budget makes a search give the same result on every device. */
export interface SearchLimit {
  nodes: number;
}

type Request = {
  fen: string;
  skill: EngineStrength;
  history?: string[];
  limit?: SearchLimit;
  resolve: (a: EngineAnalysis) => void;
  reject: (e: Error) => void;
};

// A browser may pause a hidden page together with its workers while timers keep counting real time.
let lastVisibilityChange = -Infinity;
let watchingVisibility = false;
function watchVisibility() {
  if (watchingVisibility || typeof document === "undefined") return;
  watchingVisibility = true;
  document.addEventListener("visibilitychange", () => {
    lastVisibilityChange = performance.now();
  });
}
const pageHiddenSince = (since: number) =>
  (typeof document !== "undefined" && document.hidden) || lastVisibilityChange >= since;

/** One UCI search at a time. A failed worker rejects every waiter; callers can start a fresh one. */
export class StockfishClient {
  private worker: Worker;
  private pending: Request[] = [];
  private active: Request | null = null;
  private result: EngineAnalysis = {
    bestMove: "",
    scoreCp: null,
    mateIn: null,
    depth: 0,
    pv: [],
  };
  private timer: ReturnType<typeof setTimeout> | undefined;
  private searchStartedAt = 0;
  private failure: Error | null = null;
  private ready: Promise<void>;
  private readyResolve!: () => void;
  private readyReject!: (e: Error) => void;

  private human: MaiaClient | null = null;

  constructor(private onHumanStatus: (status: HumanStatus) => void = () => {}) {
    watchVisibility();
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    this.worker = new Worker("/engine/stockfish-18-lite-single.js");
    this.worker.onmessage = ({ data }) => this.receive(String(data));
    this.worker.onerror = () =>
      this.fail(
        new Error(
          "Stockfish could not load. Check your connection, then retry the engine.",
        ),
      );
    this.worker.onmessageerror = () =>
      this.fail(
        new Error(
          "Stockfish returned an unreadable response. Retry the engine.",
        ),
      );
    this.timer = setTimeout(
      () =>
        this.fail(
          new Error("Stockfish took too long to load. Retry the engine."),
        ),
      20000,
    );
    this.worker.postMessage("uci");
  }
  init() {
    return this.ready;
  }
  async analyzePosition(
    fen: string,
    skill: EngineStrength = 20,
    history?: string[],
    limit?: SearchLimit,
  ): Promise<EngineAnalysis> {
    if (limit && !(Number.isSafeInteger(limit.nodes) && limit.nodes > 0))
      throw new Error("The engine search limit must be a positive whole number of nodes.");
    await this.ready;
    if (this.failure) throw this.failure;
    if (typeof skill === "object") {
      this.human ??= new MaiaClient(this.onHumanStatus);
      return this.human.analyzePosition(fen, skill.elo, history);
    }
    return new Promise((resolve, reject) => {
      this.pending.push({ fen, skill, history, limit, resolve, reject });
      this.next();
    });
  }
  private next() {
    if (this.active || this.failure || !this.pending.length) return;
    this.active = this.pending.shift()!;
    this.result = {
      bestMove: "",
      scoreCp: null,
      mateIn: null,
      depth: 0,
      pv: [],
    };
    // Hash and move-ordering history from earlier searches change a fixed-node result,
    // so each one starts from a cleared engine and depends only on its own position.
    if (this.active.limit) this.worker.postMessage("ucinewgame");
    for (const command of strengthCommands(this.active.skill))
      this.worker.postMessage(command);
    this.worker.postMessage(
      this.active.history
        ? "position startpos" +
            (this.active.history.length
              ? " moves " + this.active.history.join(" ")
              : "")
        : "position fen " + this.active.fen,
    );
    // The same fixed search budget is used for both sides of a move comparison.
    this.worker.postMessage(
      this.active.limit
        ? `go nodes ${this.active.limit.nodes}`
        : "go movetime 500",
    );
    this.searchStartedAt = performance.now();
    this.armSearchTimer();
  }
  private armSearchTimer() {
    this.timer = setTimeout(() => {
      // A node-limited search the page was hidden during may have been paused, not stuck: give it
      // a fresh 15 seconds instead of failing the moment the page wakes up.
      if (this.active?.limit && pageHiddenSince(this.searchStartedAt)) {
        this.searchStartedAt = performance.now();
        this.armSearchTimer();
        return;
      }
      this.fail(
        new Error(
          "The engine stopped responding. Your position is saved; retry the engine.",
        ),
      );
    }, 15000);
  }
  private receive(line: string) {
    if (this.failure) return;
    if (line === "uciok") {
      this.worker.postMessage("setoption name Hash value 16");
      this.worker.postMessage("isready");
    }
    if (line === "readyok") {
      clearTimeout(this.timer);
      this.readyResolve();
      return;
    }
    if (!this.active) return;
    // Bound lines are partial results and secondary MultiPV lines describe other moves:
    // neither may replace the latest exact score of the main line.
    const multipv = line.match(/\bmultipv (\d+)/);
    if (
      line.startsWith("info ") &&
      !line.includes(" upperbound") &&
      !line.includes(" lowerbound") &&
      (!multipv || Number(multipv[1]) === 1)
    ) {
      const score = line.match(/\bscore (cp|mate) (-?\d+)/);
      const depth = line.match(/\bdepth (\d+)/);
      const pv = line.match(/\bpv (.+)/);
      if (score) {
        this.result.scoreCp = score[1] === "cp" ? Number(score[2]) : null;
        this.result.mateIn = score[1] === "mate" ? Number(score[2]) : null;
        this.result.depth = depth ? Number(depth[1]) : 0;
        this.result.pv = pv ? pv[1].split(" ") : [];
      }
    }
    if (line.startsWith("bestmove ")) {
      clearTimeout(this.timer);
      const request = this.active;
      this.active = null;
      const bestMove = line.split(" ")[1];
      request.resolve({ ...this.result, bestMove });
      this.next();
    }
  }
  private fail(error: Error) {
    if (this.failure) return;
    this.failure = error;
    clearTimeout(this.timer);
    this.readyReject(error);
    this.active?.reject(error);
    this.active = null;
    this.pending.splice(0).forEach((request) => request.reject(error));
    this.worker.terminate();
    this.human?.terminate();
  }
  terminate() {
    this.fail(new Error("Engine session ended."));
  }
}
