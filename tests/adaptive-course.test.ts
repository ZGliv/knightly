import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { importPgn, validateGame } from "../lib/chess/game-record";
import {
  estimateLevel,
  readTraining,
  setTrainingMode,
  markGameAssisted,
  readAssistedGames,
  TRAINING_KEY,
  ASSISTANCE_KEY,
} from "../lib/learning/adaptive-rating";
import {
  COURSE_ORDER,
  COURSE_STAGES,
  PREREQUISITES,
  courseProgress,
  firstPrerequisite,
} from "../lib/learning/path";
import { LESSONS } from "../lib/learning/curriculum";
import { SEQUENCES, sequencePosition } from "../lib/learning/sequences";
import {
  gameObservations,
  recommendStudy,
} from "../lib/learning/recommendations";
import type { Attempt } from "../lib/learning/progress";
import type { SavedGame } from "../types/game";
function rated(
  color: "white" | "black",
  id: string,
  pgn = "1. f3 e5 2. g4 Qh4#",
  elo = 800,
): SavedGame {
  const game = importPgn(pgn, color);
  return {
    ...game,
    id,
    createdAt: `2026-10-27T12:${id.padStart(2, "0")}:00Z`,
    engineElo: elo,
    training: { origin: "engine", initialElo: elo, changed: false, policy:"maia3-5m-v2" },
  };
}
const now = Date.parse("2026-10-28T12:00:00Z");
const attempt = (
  id: string,
  stage: "guided" | "transfer",
  outcome: Attempt["outcome"] = "independent",
  offset = -1000,
): Attempt => ({
  id: id + stage + offset,
  lessonId: id,
  stage,
  outcome,
  hints: outcome === "supported" ? 1 : 0,
  misses: 0,
  at: new Date(now + offset).toISOString(),
});
test("completed results adjust the local estimate in the player's direction, at most50 per game", () => {
  const whiteLoss = rated("white", "1"),
    blackWin = rated("black", "2");
  assert.equal(estimateLevel([whiteLoss], []).estimate, 750);
  assert.equal(estimateLevel([blackWin], []).estimate, 850);
  const profile = estimateLevel([whiteLoss, blackWin], []);
  assert.equal(profile.evidence.length, 2);
  assert(profile.evidence.every((e) => Math.abs(e.after - e.before) <= 50));
  assert.deepEqual(profile, estimateLevel([blackWin, whiteLoss], []));
  assert.equal(validateGame(whiteLoss).training?.initialElo, 800);
});
test("imports, legacy, unfinished, assisted, changed, short resignations and duplicate games do not inflate level", () => {
  const game = rated("black", "1");
  const imported = importPgn(game.pgn, "black");
  const unfinished = { ...game, id: "3", result: "*" as const };
  const changed = {
    ...game,
    id: "4",
    training: { ...game.training!, changed: true },
  };
  const short = {
    ...rated("white", "5", "1. e4 e5 *"),
    result: "0-1" as const,
  };
  const duplicate = { ...game, id: "6" };
  const eligible = estimateLevel(
    [game, imported, unfinished, changed, short, duplicate],
    [],
  );
  assert.equal(eligible.evidence.length, 1);
  assert.equal(eligible.excluded.unknown, 1);
  assert.equal(eligible.excluded.unfinished, 1);
  assert.equal(eligible.excluded.changed, 1);
  assert.equal(eligible.excluded.short, 1);
  assert.equal(eligible.excluded.duplicate, 1);
  assert.equal(estimateLevel([game], [game.id]).evidence.length, 0);
  assert.equal(
    estimateLevel([{ ...game, engineElo: 1000 }], []).evidence.length,
    0,
  );
});
test("automatic preferences and assistance preserve malformed storage instead of resetting it", () => {
  const store = new Map<string, string>();
  Object.assign(globalThis, {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });
  assert.equal(readTraining().mode, "auto");
  setTrainingMode("manual", 1200);
  assert.equal(readTraining().manualElo, 1200);
  setTrainingMode("auto");
  assert.equal(readTraining().manualElo, 1200);
  markGameAssisted("one");
  markGameAssisted("one");
  assert.deepEqual(readAssistedGames(), ["one"]);
  store.set(TRAINING_KEY, "broken");
  assert.throws(() => setTrainingMode("auto"));
  assert.equal(store.get(TRAINING_KEY), "broken");
  store.set(ASSISTANCE_KEY, "broken");
  assert.throws(() => markGameAssisted("two"));
  assert.equal(store.get(ASSISTANCE_KEY), "broken");
});
test("the three-stage course covers all concepts once and has acyclic prerequisites", () => {
  assert.equal(COURSE_STAGES.length, 3);
  assert.equal(COURSE_ORDER.length, LESSONS.length);
  assert.deepEqual([...COURSE_ORDER].sort(), LESSONS.map((l) => l.id).sort());
  for (const id of COURSE_ORDER) {
    const seen = new Set<string>();
    const visit = (current: string) => {
      assert(!seen.has(current), `cycle at ${current}`);
      seen.add(current);
      for (const p of PREREQUISITES[current] ?? []) {
        assert(COURSE_ORDER.includes(p as never));
        visit(p);
      }
      seen.delete(current);
    };
    visit(id);
  }
  assert.equal(firstPrerequisite("knight-fork", new Set()), "loose-queen");
});
test("course progression needs a different-board independent result, not a hint, repeat or future attempt", () => {
  assert.equal(
    courseProgress([attempt("pawn-capture", "guided")], now).independent.size,
    0,
  );
  assert.equal(
    courseProgress([attempt("pawn-capture", "transfer", "supported")], now)
      .independent.size,
    0,
  );
  const progress = courseProgress(
    [
      attempt("pawn-capture", "transfer"),
      attempt("pawn-capture", "transfer", "independent", -500),
      attempt("claim-center", "transfer", "independent", 1000),
    ],
    now,
  );
  assert.equal(progress.independent.size, 1);
  assert.equal(progress.next.id, "claim-center");
});
function annotated(
  pgn: string,
  id: string,
  color: "white" | "black",
  ply: number,
  bestSan: string,
) {
  const game = { ...importPgn(pgn, color), id };
  game.moves = game.moves.map((m) =>
    m.ply === ply
      ? {
          ...m,
          cpLoss: 300,
          bestSan,
          searchDepth: 14,
          classification: "blunder" as const,
        }
      : m,
  );
  return game;
}
test("automatic move evidence picks recurring development problems, carries the correct side and excludes stale/opponent evidence", () => {
  const first = annotated("1. a3 e5 *", "one", "white", 1, "Nf3");
  const second = annotated("1. e4 e5 2. a3 Nc6 *", "two", "white", 3, "Nf3");
  const black = annotated("1. e4 a6 *", "black", "black", 2, "Nf6");
  const before = JSON.stringify([first, second, black]);
  const recommendation = recommendStudy(
    [first, second, black],
    [],
    undefined,
    now,
  );
  assert.equal(recommendation.lesson.id, "develop-knight");
  assert.equal(recommendation.kind, "Recurring in your games");
  assert.equal(recommendation.patterns[0].count, 3);
  assert.equal(recommendation.patterns[0].gameCount, 3);
  assert.equal(
    gameObservations([{ ...first, playerColor: "black" }]).length,
    0,
  );
  assert.equal(
    gameObservations([
      {
        ...first,
        moves: first.moves.map((m) => ({ ...m, bestSan: "invalid" })),
      },
    ]).length,
    0,
  );
  assert.equal(JSON.stringify([first, second, black]), before);
});
test("duplicate positions do not become recurring mistakes and fresh independent transfer lets another idea lead", () => {
  const game = annotated("1. a3 e5 *", "one", "white", 1, "Nf3");
  const repeat = { ...game, id: "two" };
  const recommendation = recommendStudy([game, repeat], [], undefined, now);
  assert.equal(recommendation.patterns[0].count, 1);
  assert.equal(recommendation.kind, "From your game");
  assert.equal(
    recommendStudy(
      [game],
      [attempt("develop-knight", "transfer")],
      undefined,
      now,
    ).kind,
    "Next in your course",
  );
});
test("new mating patterns really mate in both versions and both colors; rook promotion avoids stalemate", () => {
  for (const id of [
    "smothered-mate",
    "anastasia-mate",
    "arabian-mate",
    "forcing-first",
  ]) {
    const lesson = SEQUENCES.find((l) => l.id === id)!;
    for (const stage of ["guided", "transfer"] as const)
      for (const color of ["white", "black"] as const) {
        const pos = sequencePosition(lesson, stage, color),
          board = new Chess(pos.fen);
        board.move(pos.answers[0]);
        assert(board.isCheckmate(), id);
      }
  }
  const lesson = SEQUENCES.find((l) => l.id === "rook-underpromotion")!;
  for (const stage of ["guided", "transfer"] as const)
    for (const color of ["white", "black"] as const) {
      const pos = sequencePosition(lesson, stage, color),
        rook = new Chess(pos.fen),
        queen = new Chess(pos.fen);
      rook.move(pos.answers[0]);
      queen.move(pos.answers[0].replace("=R", "=Q"));
      assert(!rook.isGameOver());
      assert(queen.isStalemate());
    }
});
test("defensive examples permit the advertised recapture and remove the immediate mating support", () => {
  const defend = SEQUENCES.find((l) => l.id === "defend-piece")!;
  for (const [pos, line] of [
    [defend, ["f3", "Bxe4", "fxe4"]],
    [defend.independent, ["c3", "Bxd4", "cxd4"]],
  ] as const) {
    const board = new Chess(pos.fen);
    for (const move of line) assert.doesNotThrow(() => board.move(move));
  }
  const mate = SEQUENCES.find((l) => l.id === "defend-mate")!;
  for (const [pos, line] of [
    [mate, ["g3", "Qxh2+", "Kxh2"]],
    [mate.independent, ["b3", "Qxa2+", "Kxa2"]],
  ] as const) {
    const board = new Chess(pos.fen);
    for (const move of line) assert.doesNotThrow(() => board.move(move));
  }
});

test("old random beginner games remain readable but cannot calibrate the human opponent",()=>{
 const game=rated("black","30");
 const old={...game,training:{origin:"engine" as const,initialElo:800,changed:false}};
 assert.equal(validateGame(old).pgn,game.pgn);
 assert.equal(estimateLevel([old],[]).evidence.length,0);
 assert.equal(estimateLevel([game],[]).evidence.length,1);
 assert.throws(()=>validateGame({...game,training:{...game.training,policy:"unknown"}}),/metadata/);
});

test("old high-rated Stockfish results do not calibrate Maia; earlier Maia results survive",()=>{
 const high=rated("black","31",undefined,2400);
 assert.equal(estimateLevel([high],[]).evidence.length,1);
 assert.equal(estimateLevel([{...high,training:{...high.training!,policy:"maia3-5m-v1"}}],[]).evidence.length,0);
 const low=rated("black","32");
 assert.equal(estimateLevel([{...low,training:{...low.training!,policy:"maia3-5m-v1"}}],[]).evidence.length,1);
});
