export interface EngineAnalysis {
  bestMove: string;
  scoreCp: number | null;
  mateIn: number | null;
  depth: number;
  pv: string[];
}

type Request = {
  fen: string;
  skill: number;
  resolve: (a: EngineAnalysis) => void;
  reject: (e: Error) => void;
};

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
  private failure: Error | null = null;
  private ready: Promise<void>;
  private readyResolve!: () => void;
  private readyReject!: (e: Error) => void;

  constructor() {
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
  async analyzePosition(fen: string, skill = 20): Promise<EngineAnalysis> {
    await this.ready;
    if (this.failure) throw this.failure;
    return new Promise((resolve, reject) => {
      this.pending.push({ fen, skill, resolve, reject });
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
    this.worker.postMessage(
      `setoption name Skill Level value ${Math.max(0, Math.min(20, this.active.skill))}`,
    );
    this.worker.postMessage("position fen " + this.active.fen);
    // The same fixed search budget is used for both sides of a move comparison.
    this.worker.postMessage("go movetime 500");
    this.timer = setTimeout(
      () =>
        this.fail(
          new Error(
            "The engine stopped responding. Your position is saved; retry the engine.",
          ),
        ),
      15000,
    );
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
    if (
      line.startsWith("info ") &&
      !line.includes(" upperbound ") &&
      !line.includes(" lowerbound ")
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
      request.resolve({ ...this.result, bestMove: line.split(" ")[1] });
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
  }
  terminate() {
    this.fail(new Error("Engine session ended."));
  }
}
