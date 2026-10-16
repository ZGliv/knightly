import { test } from "node:test";
import assert from "node:assert/strict";
import { StockfishClient } from "../lib/engine/stockfish-client";
class FakeWorker {
  static last: FakeWorker;
  messages: string[] = [];
  ended = false;
  onmessage: ((e: { data: string }) => void) | null = null;
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
  emit(message: string) {
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
