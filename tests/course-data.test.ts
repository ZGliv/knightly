import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import type { Course, CourseIndex, CoursePuzzles } from "../lib/courses/types";

const DIR = fileURLToPath(new URL("../public/courses/", import.meta.url));
const read = <T>(file: string): T => JSON.parse(readFileSync(join(DIR, file), "utf8")) as T;
const index = read<CourseIndex>("index.json");
const courses = index.courses.map((s) => read<Course>(`${s.id}.json`));
const posKey = (fen: string) => fen.split(" ").slice(0, 4).join(" ");
const learnerToMove = (ply: number, side: Course["side"]) => (ply % 2 === 0) === (side === "white");

test("the index lists every course file, with matching counts", () => {
  assert.ok(index.source.includes("CC0"));
  assert.ok(index.courses.length >= 10);
  const files = readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "index.json").sort();
  assert.deepEqual(files, index.courses.map((c) => `${c.id}.json`).sort());
  assert.equal(new Set(index.courses.map((c) => c.id)).size, index.courses.length);
  for (const [i, summary] of index.courses.entries()) {
    const course = courses[i];
    assert.equal(course.id, summary.id);
    assert.equal(course.lineCount, course.lines.length, course.id);
    assert.equal(summary.lineCount, course.lines.length, course.id);
    const puzzleFile = join(DIR, "puzzles", `${course.id}.json`);
    const puzzles = existsSync(puzzleFile) ? read<CoursePuzzles>(`puzzles/${course.id}.json`) : [];
    assert.equal(summary.puzzleCount, puzzles.length, course.id);
    assert.equal(course.puzzleCount, puzzles.length, course.id);
    assert.ok(course.blurb.length > 0, `${course.id} has a blurb`);
  }
});

test("every line is legal, starts with the setup, ends on the learner's move and has a unique id", () => {
  for (const course of courses) {
    assert.ok(course.lines.length > 0, course.id);
    assert.equal(new Set(course.lines.map((l) => l.id)).size, course.lines.length, `${course.id} ids`);
    for (const line of course.lines) {
      const chess = new Chess();
      for (const san of line.moves) assert.doesNotThrow(() => chess.move(san), `${course.id} ${line.id} ${san}`);
      assert.ok(learnerToMove(line.moves.length - 1, course.side), `${course.id} ${line.id} ends on the learner's move`);
      assert.deepEqual(line.moves.slice(0, course.setup.length), course.setup, `${course.id} ${line.id} setup`);
      assert.ok(line.name.length > 0);
    }
  }
});

test("the learner always answers a position the same way, and no line is a prefix of another", () => {
  for (const course of courses) {
    const answer = new Map<string, string>();
    for (const line of course.lines) {
      const chess = new Chess();
      line.moves.forEach((san, ply) => {
        if (learnerToMove(ply, course.side)) {
          const key = posKey(chess.fen());
          const seen = answer.get(key);
          assert.ok(seen === undefined || seen === san, `${course.id} ${line.id}: ${san} vs ${seen}`);
          answer.set(key, san);
        }
        chess.move(san);
      });
    }
    const joined = course.lines.map((l) => l.moves.join(" "));
    assert.equal(new Set(joined).size, joined.length, `${course.id} duplicate lines`);
    for (const a of joined)
      for (const b of joined) assert.ok(a === b || !b.startsWith(a + " "), `${course.id}: "${a}" is a prefix of another line`);
  }
});

test("ideas and names are keyed by prefixes of the course's lines", () => {
  for (const course of courses) {
    const joined = course.lines.map((l) => l.moves.join(" "));
    const onLine = (key: string) => joined.some((l) => l === key || l.startsWith(key + " "));
    const ideas = Object.entries(course.ideas);
    assert.ok(ideas.length >= 8 && ideas.length <= 15, `${course.id} has ${ideas.length} ideas`);
    for (const [key, text] of ideas) {
      assert.ok(onLine(key), `${course.id} idea "${key}"`);
      assert.ok(learnerToMove(key.split(" ").length - 1, course.side), `${course.id} idea "${key}" explains a learner move`);
      assert.ok(text.length > 0 && text.length < 220, `${course.id} idea "${key}" length ${text.length}`);
      assert.ok(!text.includes("—"), `${course.id} idea "${key}" has an em dash`);
    }
    for (const key of Object.keys(course.names)) assert.ok(onLine(key), `${course.id} name "${key}"`);
  }
});

test("every puzzle's moves are legal and the puzzle is in the shipped shape", () => {
  for (const course of courses) {
    if (!course.puzzleCount) continue;
    const puzzles = read<CoursePuzzles>(`puzzles/${course.id}.json`);
    assert.equal(new Set(puzzles.map((p) => p.id)).size, puzzles.length);
    for (const [i, p] of puzzles.entries()) {
      assert.deepEqual(Object.keys(p).sort(), ["fen", "id", "moves", "rating", "themes"]);
      if (i > 0) assert.ok(puzzles[i - 1].rating <= p.rating, `${course.id} sorted by rating`);
      assert.ok(p.moves.length >= 2 && p.moves.length % 2 === 0);
      const chess = new Chess(p.fen);
      for (const uci of p.moves)
        assert.doesNotThrow(
          () => chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }),
          `${course.id} puzzle ${p.id} ${uci}`,
        );
    }
  }
});
