import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import {
  STRUCTURES,
  TAG_ORDER,
  blockedCentralFiles,
  castlingSides,
  detectStructure,
  hasIsolatedQueenPawn,
  hasKingsideFianchetto,
  isClosedCentre,
  isOpenCentre,
  primaryGroup,
  queensOff,
} from "../lib/masters/structure";

test("isolated queen's pawn is found for the side that has it", () => {
  const chess = new Chess("r1bq1rk1/pp2bppp/2n1pn2/8/3P4/2NB1N2/PP3PPP/R1BQ1RK1 w - - 0 10");
  assert.equal(hasIsolatedQueenPawn(chess, "w"), true);
  assert.equal(hasIsolatedQueenPawn(chess, "b"), false, "no d-pawn is not an isolated d-pawn");
  assert.equal(hasIsolatedQueenPawn(new Chess(), "w"), false);
});

test("castling sides come from the SAN moves of each colour", () => {
  assert.deepEqual(castlingSides(["e4", "e5", "O-O", "O-O-O+"]), { w: "king", b: "queen" });
  assert.deepEqual(castlingSides(["d4", "d5"]), { w: null, b: null });
});

test("opposite-side castling is tagged from a real move sequence", () => {
  const moves = "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bd2 e6 Bc4 Bb4 Qe2 Nbd7 O-O-O O-O".split(" ");
  const tags = detectStructure(moves, moves.length);
  assert.ok(tags.includes("opposite-castling"));
  const same = "e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6 d3 O-O".split(" ");
  assert.ok(!detectStructure(same, same.length).includes("opposite-castling"));
});

test("a locked French advance centre is closed, not open", () => {
  const chess = new Chess("rnbqkbnr/pp3ppp/4p3/2ppP3/3P4/8/PPP2PPP/RNBQKBNR w KQkq - 0 4");
  assert.deepEqual(blockedCentralFiles(chess), { count: 2, centre: true });
  assert.equal(isClosedCentre(chess), true);
  assert.equal(isOpenCentre(chess), false);
  assert.equal(isClosedCentre(new Chess()), false);
});

test("open centre needs the d- and e-files almost free of pawns", () => {
  assert.equal(isOpenCentre(new Chess("r1bqk2r/ppp2ppp/2n2n2/2b5/2B5/2N2N2/PPP2PPP/R1BQK2R w KQkq - 0 6")), true);
  assert.equal(isOpenCentre(new Chess("r1bqk2r/ppp2ppp/2n2n2/2b1p3/2B5/2N2N2/PPP2PPP/R1BQK2R w KQkq - 0 6")), true);
  assert.equal(isOpenCentre(new Chess("r1bqk2r/ppp2ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPP2PPP/R1BQK2R w KQkq - 0 6")), false);
});

test("kingside fianchetto needs both the bishop and the g-pawn", () => {
  const chess = new Chess("rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4");
  assert.equal(hasKingsideFianchetto(chess, "b"), true);
  assert.equal(hasKingsideFianchetto(chess, "w"), false);
});

test("queens off only when both queens are gone", () => {
  assert.equal(queensOff(new Chess("r1b1k2r/ppp2ppp/2n2n2/2b5/2B5/2N2N2/PPP2PPP/R1B1K2R w KQkq - 0 8")), true);
  assert.equal(queensOff(new Chess("r1b1k2r/ppp2ppp/2n2n2/2b5/2B5/2N2N2/PPP2PPP/R1BQK2R w KQkq - 0 8")), false);
});

test("an ordinary position has no tags and is grouped as mixed", () => {
  const tags = detectStructure(["e4", "e5"]);
  assert.deepEqual(tags, []);
  assert.equal(primaryGroup(tags), "mixed");
  assert.equal(primaryGroup(["fianchetto", "iqp"]), "iqp");
});

test("illegal moves are rejected instead of tagged", () => {
  assert.throws(() => detectStructure(["e4", "e4"]));
});

test("every structure has a name, a summary and two plans of two sentences", () => {
  for (const group of [...TAG_ORDER, "mixed" as const]) {
    const info = STRUCTURES[group];
    assert.ok(info.name && info.summary, group);
    assert.equal(info.plans.length, 2, group);
    for (const plan of info.plans) {
      const sentences = plan.text.split(/(?<=\.)\s+/).filter(Boolean);
      assert.equal(sentences.length, 2, `${group}: ${plan.side}`);
    }
  }
});
