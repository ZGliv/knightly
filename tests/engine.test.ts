import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { StockfishClient } from "../lib/engine/stockfish-client";
class FakeWorker {
  static last: FakeWorker;
  messages: string[] = [];
  ended = false;
  onmessage: ((e: { data: string | Record<string, unknown> }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  constructor(public url: string) {
    FakeWorker.last = this;
  }
  postMessage(message: string) {
    this.messages.push(message);
  }
  terminate() {
    this.ended = true;
  }
  emit(message: string | Record<string, unknown>) {
    this.onmessage?.({ data: message });
  }
}
Object.assign(globalThis, { Worker: FakeWorker });
async function ready() {
  const engine = new StockfishClient();
  const worker = FakeWorker.last;
  worker.emit("uciok");
  worker.emit("readyok");
  await engine.init();
  return { engine, worker };
}
test("same-origin worker handshakes and preserves parsed evaluation", async () => {
  const { engine, worker } = await ready();
  assert.equal(worker.url, "/engine/stockfish-18-lite-single.js");
  const p = engine.analyzePosition("test-fen");
  await Promise.resolve();
  worker.emit("info depth 12 score cp 35 pv e2e4 e7e5");
  worker.emit("bestmove e2e4");
  const result = await p;
  assert.deepEqual(result, {
    bestMove: "e2e4",
    scoreCp: 35,
    mateIn: null,
    depth: 12,
    pv: ["e2e4", "e7e5"],
  });
  engine.terminate();
});
test("queue gives each request its own skill setting and response", async () => {
  const { engine, worker } = await ready();
  const first = engine.analyzePosition("first", 20);
  const second = engine.analyzePosition("second", 3);
  await Promise.resolve();
  assert(!worker.messages.includes("position fen second"));
  worker.emit("bestmove e2e4");
  assert.equal((await first).bestMove, "e2e4");
  assert(worker.messages.includes("setoption name Skill Level value 3"));
  worker.emit("bestmove d2d4");
  assert.equal((await second).bestMove, "d2d4");
  engine.terminate();
});
test("cp output clears earlier mate evidence; missing score stays unknown", async () => {
  const { engine, worker } = await ready();
  const p = engine.analyzePosition("test");
  await Promise.resolve();
  worker.emit("info depth 10 score mate 3 pv e2e4");
  worker.emit("info depth 11 score cp 80 pv d2d4");
  worker.emit("bestmove d2d4");
  assert.equal((await p).mateIn, null);
  const q = engine.analyzePosition("test");
  await Promise.resolve();
  worker.emit("bestmove d2d4");
  assert.equal((await q).scoreCp, null);
  engine.terminate();
});
test("worker load failure rejects initialization", async () => {
  const engine = new StockfishClient();
  const result = assert.rejects(engine.init(), /could not load/);
  FakeWorker.last.onerror!();
  await result;
  assert(FakeWorker.last.ended);
});
test("worker failure rejects active and queued work; never hangs", async () => {
  const { engine, worker } = await ready();
  const first = engine.analyzePosition("first");
  const second = engine.analyzePosition("second");
  const assertions = [
    assert.rejects(first, /could not load/),
    assert.rejects(second, /could not load/),
  ];
  await Promise.resolve();
  worker.onerror!();
  await Promise.all(assertions);
  assert(worker.ended);
});
test("termination rejects pending search instead of applying a stale reply", async () => {
  const { engine, worker } = await ready();
  const p = engine.analyzePosition("first");
  const assertion = assert.rejects(p, /session ended/);
  await Promise.resolve();
  engine.terminate();
  worker.emit("bestmove e2e4");
  await assertion;
});

test("coach requests retain the complete UCI move history for repetition", async () => {
  const { engine, worker } = await ready();
  const p = engine.analyzePosition("ignored-fen", 20, [
    "g1f3",
    "g8f6",
    "f3g1",
    "f6g8",
  ]);
  await Promise.resolve();
  assert(
    worker.messages.includes("position startpos moves g1f3 g8f6 f3g1 f6g8"),
  );
  assert(!worker.messages.includes("position fen ignored-fen"));
  worker.emit("info depth 12 score cp 0 pv e2e4");
  worker.emit("bestmove e2e4");
  await p;
  engine.terminate();
});

test("every opponent target uses Maia while queued analysis uses full-strength Stockfish", async () => {
  for (const elo of [400,800,1200,1400,1600,1800,2000,2200,2400,3190]) {
    const {engine,worker}=await ready();
    const opponent=engine.analyzePosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",{elo});
    await Promise.resolve();
    const human=FakeWorker.last;
    assert.equal(human.url,"/engine/maia/worker.mjs");
    assert(!worker.messages.some(m=>m.startsWith("go ")));
    human.emit({id:1,move:"e2e4"});await opponent;
    const coach=engine.analyzePosition("analysis",20);await Promise.resolve();
    assert(worker.messages.includes("setoption name Skill Level value 20"));
    assert(!worker.messages.some(m=>m.includes("UCI_LimitStrength value true")));
    worker.emit("info depth 12 score cp 30 pv d2d4");worker.emit("bestmove d2d4");
    assert.equal((await coach).scoreCp,30);engine.terminate();
  }
});

test("human opponent uses a separate worker and cannot contaminate coach evaluation", async () => {
  const {engine,worker} = await ready();
  const reply = engine.analyzePosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", {elo:800});
  await Promise.resolve();
  const human = FakeWorker.last;
  assert.equal(human.url,"/engine/maia/worker.mjs");
  assert(!worker.messages.some(message=>message.startsWith("go ")));
  human.emit({id:1,move:"e2e4"});
  assert.deepEqual(await reply,{bestMove:"e2e4",scoreCp:null,mateIn:null,depth:0,pv:["e2e4"]});
  const coach = engine.analyzePosition("test-fen",20);
  await Promise.resolve();
  worker.emit("info depth 14 score cp 25 pv d2d4 d7d5");
  worker.emit("bestmove d2d4");
  assert.equal((await coach).scoreCp,25);
  engine.terminate(); assert(human.ended);
});

test("a node limit sends go nodes; without one the search stays at movetime 500", async () => {
  const { engine, worker } = await ready();
  const limited = engine.analyzePosition("ignored", 20, ["e2e4"], { nodes: 150000 });
  await Promise.resolve();
  assert.equal(worker.messages.at(-1), "go nodes 150000");
  assert(worker.messages.includes("position startpos moves e2e4"));
  worker.emit("info depth 15 score cp -20 nodes 150000 pv e7e5 g1f3");
  worker.emit("bestmove e7e5");
  assert.deepEqual(await limited, { bestMove: "e7e5", scoreCp: -20, mateIn: null, depth: 15, pv: ["e7e5", "g1f3"] });
  const timed = engine.analyzePosition("test-fen");
  await Promise.resolve();
  assert.equal(worker.messages.at(-1), "go movetime 500");
  worker.emit("bestmove d2d4");
  await timed;
  assert.equal(worker.messages.filter((m) => m.startsWith("go ")).length, 2);
  engine.terminate();
});

test("an invalid node limit is rejected without reaching the engine", async () => {
  const { engine, worker } = await ready();
  for (const nodes of [0, -5, 1.5, Number.NaN])
    await assert.rejects(engine.analyzePosition("fen", 20, [], { nodes }), /positive whole number/);
  assert(!worker.messages.some((m) => m.startsWith("go ")));
  engine.terminate();
});

test("a trailing bound line cannot replace the latest exact score, depth or line", async () => {
  const { engine, worker } = await ready();
  const p = engine.analyzePosition("test", 20, [], { nodes: 1000 });
  await Promise.resolve();
  worker.emit("info depth 14 seldepth 18 multipv 1 score cp 42 nodes 900 pv e2e4 e7e5 g1f3");
  worker.emit("info depth 15 seldepth 20 multipv 1 score cp 90 lowerbound nodes 990 pv d2d4");
  worker.emit("info depth 15 seldepth 20 multipv 1 score cp -10 upperbound nodes 1000 pv c2c4");
  worker.emit("bestmove e2e4 ponder e7e5");
  assert.deepEqual(await p, { bestMove: "e2e4", scoreCp: 42, mateIn: null, depth: 14, pv: ["e2e4", "e7e5", "g1f3"] });
  engine.terminate();
});

test("secondary MultiPV lines never overwrite the main line", async () => {
  const { engine, worker } = await ready();
  const p = engine.analyzePosition("test", 20, [], { nodes: 1000 });
  await Promise.resolve();
  worker.emit("info depth 12 multipv 1 score mate 2 pv d1h5 g7g6");
  worker.emit("info depth 12 multipv 2 score cp -300 pv a2a3 a7a6");
  worker.emit("info depth 12 multipv 10 score cp 5 pv h2h3");
  worker.emit("bestmove d1h5");
  assert.deepEqual(await p, { bestMove: "d1h5", scoreCp: null, mateIn: 2, depth: 12, pv: ["d1h5", "g7g6"] });
  engine.terminate();
});

test("a node-limited search starts from a cleared engine so its result never depends on earlier searches", async () => {
  const { engine, worker } = await ready();
  const coach = engine.analyzePosition("coach-fen");
  await Promise.resolve();
  worker.emit("bestmove e2e4");
  await coach;
  // Hash and move-ordering history left behind by any earlier search would change a fixed-node result.
  for (const history of [["e2e4"], ["e2e4", "e7e5"]]) {
    const start = worker.messages.length;
    const p = engine.analyzePosition("ignored", 20, history, { nodes: 150000 });
    await Promise.resolve();
    const sent = worker.messages.slice(start);
    const clear = sent.indexOf("ucinewgame");
    assert(clear >= 0, "every fixed-node search must clear the engine first");
    assert(clear < sent.indexOf("position startpos moves " + history.join(" ")));
    assert.equal(sent.at(-1), "go nodes 150000");
    worker.emit("bestmove d2d4");
    await p;
  }
  // Existing movetime callers keep their warm hash and exact command sequence.
  const start = worker.messages.length;
  const timed = engine.analyzePosition("test-fen");
  await Promise.resolve();
  assert(!worker.messages.slice(start).includes("ucinewgame"));
  worker.emit("bestmove d2d4");
  await timed;
  engine.terminate();
});

test("a node-limited search the page was hidden during gets a fresh budget; a stuck one still fails", async () => {
  const listeners: (() => void)[] = [];
  const page = { hidden: false, addEventListener: (_: string, listener: () => void) => listeners.push(listener) };
  const setHidden = (hidden: boolean) => {
    page.hidden = hidden;
    listeners.forEach((listener) => listener());
  };
  Object.assign(globalThis, { document: page });
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { engine, worker } = await ready();
    // The browser pauses the hidden page and its worker for 20 seconds, then wakes it.
    const paused = engine.analyzePosition("ignored", 20, ["e2e4"], { nodes: 150000 });
    await Promise.resolve();
    setHidden(true);
    mock.timers.tick(20000);
    setHidden(false);
    mock.timers.tick(5000);
    worker.emit("info depth 14 score cp 10 pv e7e5");
    worker.emit("bestmove e7e5");
    assert.equal((await paused).bestMove, "e7e5");
    // Hidden at the moment the timer runs (the page has not woken yet): still not a failure.
    const asleep = engine.analyzePosition("ignored", 20, ["e2e4"], { nodes: 150000 });
    await Promise.resolve();
    page.hidden = true;
    mock.timers.tick(15000);
    page.hidden = false;
    worker.emit("bestmove e7e5");
    assert.equal((await asleep).bestMove, "e7e5");
    // A visible page whose engine never answers still fails after 15 seconds.
    const stuck = engine.analyzePosition("ignored", 20, ["e2e4"], { nodes: 150000 });
    const failed = assert.rejects(stuck, /stopped responding/);
    await Promise.resolve();
    mock.timers.tick(15000);
    await failed;
    assert(worker.ended);

    // Play's searches (no node limit) keep the plain 15-second watchdog, hidden or not.
    const play = await ready();
    const timed = play.engine.analyzePosition("test-fen");
    const timedOut = assert.rejects(timed, /stopped responding/);
    await Promise.resolve();
    setHidden(true);
    mock.timers.tick(15000);
    await timedOut;
    setHidden(false);
  } finally {
    mock.timers.reset();
    delete (globalThis as { document?: unknown }).document;
  }
});
