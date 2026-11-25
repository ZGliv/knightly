#!/usr/bin/env node
/**
 * Builds the opening courses in public/courses/ (see lib/courses/types.ts for the shapes):
 *   public/courses/index.json           CourseIndex
 *   public/courses/<id>.json            Course
 *   public/courses/puzzles/<id>.json    CoursePuzzles
 *
 * Lines come from the Lichess chess-openings list (CC0), puzzles from the Lichess puzzle database (CC0).
 * The written notes (blurb, ideas) live in scripts/course-ideas.mjs and are merged in here.
 *
 * Usage:
 *   node scripts/build-courses.mjs                    # uses the cache when present
 *   node scripts/build-courses.mjs --refresh          # re-download the opening list and re-stream puzzles
 *
 * Downloads and engine results are cached outside the repo (COURSE_CACHE, default $TMPDIR/knightly-courses),
 * so re-runs are fast. Stockfish runs single-threaded at a fixed node count after `ucinewgame`, so the
 * same inputs always give the same output.
 *
 * Every learner move is checked with Stockfish: a move that loses more than LOSS_LIMIT centipawns
 * against the engine's best move is replaced by the next most common move (or the branch is dropped),
 * unless it is listed in the course's `gambits`. Lines whose final position is worse than FINAL_LIMIT
 * for the learner are dropped.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import COURSE_TEXT from "./course-ideas.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "courses");
const CACHE = process.env.COURSE_CACHE || join(tmpdir(), "knightly-courses");
const REFRESH = process.argv.includes("--refresh");
const DRAFT = process.argv.includes("--draft"); // drop notes that no longer fit a line instead of failing
const ENGINE = join(ROOT, "node_modules", "stockfish", "bin", "stockfish-18-single.js");
const OPENINGS_URL = (f) => `https://raw.githubusercontent.com/lichess-org/chess-openings/master/${f}.tsv`;
const PUZZLE_URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst";

const NODES = 200_000;
const LOSS_LIMIT = 150; // centipawns a learner move may lose against the best move
const FINAL_LIMIT = -150; // worst evaluation (learner's view) a line may end on
const MIN_LEARNER_MOVES = 4;
const MAX_LINES = 40;
const MAX_LEARNER_MOVES = 12; // longer lines are cut after the learner's 12th move
const EXTEND_BELOW = 10; // courses with fewer dataset lines than this are extended with the engine
const EXTEND_TO = 8; // learner moves an extended line reaches
const PLAN_LOSS = 50; // a planned learner move in an extension may lose at most this much
const PUZZLES_PER_COURSE = 80;
const PUZZLE_MIN = 600;
const PUZZLE_MAX = 2200; // inclusive
const PUZZLE_BAND = 200;

/** Themes we keep; must match the keys of THEMES in lib/puzzles/themes.ts (same list as build-puzzles.mjs). */
const KEEP_THEMES = new Set([
  "fork", "pin", "skewer", "discoveredAttack", "doubleCheck", "hangingPiece", "trappedPiece",
  "sacrifice", "deflection", "attraction", "capturingDefender", "interference", "clearance",
  "xRayAttack", "intermezzo", "quietMove", "defensiveMove", "zugzwang", "exposedKing",
  "kingsideAttack", "mate", "mateIn1", "mateIn2", "mateIn3", "backRankMate", "smotheredMate",
  "promotion", "advancedPawn", "endgame", "opening",
]);

/**
 * families: dataset names whose rows feed the course (a row matches when its name is the family or
 *   starts with "<family>:" / "<family>,"). Only rows that begin with `setup` are used.
 * strip: family prefixes removed from line names ("Italian Game: Giuoco Piano" -> "Giuoco Piano").
 * gambits: SAN prefixes ending in a learner move that is a deliberate gambit, exempt from the loss check.
 * prefer: prefix -> learner move, overriding "most lines" where the dataset's count is misleading
 *   (it lists named sidelines, not how often moves are played). Still engine-checked.
 * seeds: opponent move scripts played from the end of `setup` (engine fills the rest), for courses whose
 *   dataset lines are too few; plan: learner moves tried first in those extensions.
 * mainReplies: prefix -> opponent moves in order of how standard they are, used to put the main line first
 *   where the dataset's row counts mislead. lateReplies: opponent moves that push a line toward the end
 *   (an array of moves, or prefix -> moves).
 * tags: Lichess puzzle OpeningTags that belong to the course.
 */
const COURSES = [
  {
    id: "italian-game", name: "Italian Game", side: "white",
    families: ["Italian Game"], setup: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
    // The dataset is full of named gambits (Evans, Fried Liver); learners get the Giuoco Piano and 4.d3.
    prefer: {
      "e4 e5 Nf3 Nc6 Bc4 Bc5": "c3",
      "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6": "d4",
      "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4": "cxd4",
      "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+": "Bd2",
      "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+": "Nbxd2",
      "e4 e5 Nf3 Nc6 Bc4 Nf6": "d3",
    },
    seeds: [
      ["Bc5", "Nf6", "exd4", "Bb4+", "Bxd2+", "d5", "Nxd5"],
      ["Bc5", "Nf6", "exd4", "Bb6"],
      ["Bc5", "Nf6", "Bb6"],
      ["Bc5", "d6"],
      ["Bc5", "Qe7"],
      ["Nf6", "Bc5", "c3", "d6"],
      ["Nf6", "Be7", "O-O", "d6"],
      ["Nf6", "h6"],
      ["Nf6", "d5"],
      ["Be7", "exd4", "Nf6"],
    ],
    mainReplies: {
      "e4 e5 Nf3 Nc6 Bc4": ["Bc5", "Nf6", "Be7"],
      "e4 e5 Nf3 Nc6 Bc4 Bc5 c3": ["Nf6", "d6", "Qe7"],
      "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4": ["exd4", "Bb6"],
      "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4": ["Bb4+", "Bb6"],
      "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2": ["Bxd2+"],
      "e4 e5 Nf3 Nc6 Bc4 Nf6 d3": ["Bc5", "Be7", "h6", "d5"],
    },
    tags: ["Italian_Game"],
  },
  {
    id: "ruy-lopez", name: "Ruy Lopez", side: "white",
    families: ["Ruy Lopez"], setup: ["e4", "e5", "Nf3", "Nc6", "Bb5"],
    mainReplies: {
      "e4 e5 Nf3 Nc6 Bb5": ["a6", "Nf6", "Bc5", "d6"],
      "e4 e5 Nf3 Nc6 Bb5 a6 Ba4": ["Nf6", "d6", "b5"],
      "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O": ["Be7", "Nxe4", "b5", "d6"],
      "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3": ["d6", "O-O"],
      "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3": ["O-O", "Na5"],
      "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3": ["Na5", "Nb8", "Bb7"],
      "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O": ["Nxe4", "Bc5", "d6"],
    },
    tags: ["Ruy_Lopez"],
  },
  {
    id: "queens-gambit", name: "Queen's Gambit", side: "white",
    families: ["Queen's Gambit", "Queen's Gambit Declined", "Queen's Gambit Accepted", "Slav Defense", "Semi-Slav Defense"],
    strip: ["Queen's Gambit"],
    setup: ["d4", "d5", "c4"],
    mainReplies: {
      "d4 d5 c4": ["e6", "c6", "dxc4", "Nc6", "c5", "e5", "Bf5"],
      "d4 d5 c4 e6 Nc3": ["Nf6", "Be7", "c5", "c6"],
      "d4 d5 c4 e6 Nc3 Nf6 Bg5": ["Be7", "c5", "c6"],
      "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3": ["O-O", "Nbd7"],
      "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3": ["Nbd7", "h6"],
      "d4 d5 c4 c6 Nf3": ["Nf6", "e6"],
      "d4 d5 c4 c6 Nf3 Nf6 Nc3": ["dxc4", "e6", "a6"],
      "d4 d5 c4 dxc4 Nf3": ["Nf6", "a6", "e6"],
    },
    prefer: { "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5": "e3" },
    tags: ["Queens_Gambit", "Queens_Gambit_Declined", "Queens_Gambit_Accepted", "Slav_Defense", "Semi-Slav_Defense"],
  },
  {
    id: "london-system", name: "London System", side: "white",
    // Picked by moves, not by name: White plays d4 and an early Bf4 (after at most d4 and Nf3).
    rowFilter: (row) => {
      const white = row.moves.filter((_, i) => i % 2 === 0);
      const b = white.indexOf("Bf4");
      return white[0] === "d4" && b >= 1 && b <= 2 && white.slice(0, b).every((m) => m === "d4" || m === "Nf3") &&
        !white.some((m) => ["c4", "e4", "Nc3", "g3", "f3", "g4"].includes(m));
    },
    strip: ["Queen's Pawn Game", "Indian Defense"],
    setup: ["d4"],
    plan: [{ san: "Bg3", after: "Bd6" }, "Bf4", "e3", "Nf3", "c3", "Bd3", "Nbd2", "h3", "O-O"],
    mustPlay: "Bf4", // an extension that never gets the bishop out is not a London
    // Common Black setups, written out so the standard plans come first; Stockfish fills in after them.
    seeds: [
      ["d5", "Nf6", "e6", "c5", "Nc6", "Bd6", "O-O"],
      ["d5", "e6", "Nf6", "c5", "Nc6", "Bd6", "O-O"],
      ["d5", "Nf6", "c5", "Nc6", "e6", "Bd6", "O-O"],
      ["d5", "Nf6", "Bf5", "e6", "Bd6", "Nbd7", "O-O"],
      ["Nf6", "g6", "Bg7", "O-O", "d6", "Nbd7", "c5"],
      ["Nf6", "e6", "c5", "d5", "Nc6", "Bd6", "O-O"],
      ["d5", "Nf6", "g6", "Bg7", "O-O", "c5", "Nc6"],
      ["d5", "c5", "Nc6", "Qb6"],
      ["Nf6", "e6", "b6", "Bb7", "Be7", "O-O", "d6"],
      ["d5", "Bf5", "e6", "Bd6", "Nd7", "Ngf6"],
      ["Nf6", "d6", "Nbd7", "g6", "Bg7", "O-O"],
      ["f5", "Nf6", "e6", "Be7", "O-O", "b6"],
    ],
    mainReplies: {
      "d4": ["d5", "Nf6", "e6", "g6", "f5"],
      "d4 d5 Nf3": ["Nf6", "e6", "c5", "Bf5"],
      "d4 d5 Nf3 Nf6 Bf4": ["e6", "c5", "Bf5", "g6"],
      "d4 d5 Nf3 Nf6 Bf4 e6 e3": ["c5", "Bd6"],
      "d4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3": ["Nc6"],
      "d4 Nf6 Nf3": ["g6", "e6", "d5", "c5", "d6"],
      "d4 Nf6 Nf3 g6 Bf4 Bg7 e3": ["O-O", "d6"],
    },
    // ...Nh5 to trade off the London bishop is fine for Black, but not what a learner should meet first.
    lateReplies: ["Nh5"],
    tags: ["London_System", "Queens_Pawn_Game_London_System", "Queens_Pawn_Game_Accelerated_London_System",
      "Indian_Defense_London_System", "Indian_Defense_Accelerated_London_System"],
  },
  {
    id: "vienna-game", name: "Vienna Game", side: "white",
    families: ["Vienna Game", "Vienna Gambit, with Max Lange Defense"], setup: ["e4", "e5", "Nc3"],
    gambits: ["e4 e5 Nc3 Nf6 f4", "e4 e5 Nc3 Nc6 f4"],
    prefer: {
      "e4 e5 Nc3 Bc5": "Nf3", "e4 e5 Nc3 Bb4": "Nf3", "e4 e5 Nc3 d6 f4 exf4": "Nf3",
      "e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4": "Nf3", "e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5": "h4",
    },
    mainReplies: {
      "e4 e5 Nc3": ["Nf6", "Nc6", "Bc5", "Bb4", "d6"],
      "e4 e5 Nc3 Nf6 f4": ["d5", "exf4", "d6", "Nc6"],
      "e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3": ["Be7", "Nc6", "Bg4"],
      "e4 e5 Nc3 Nc6 f4": ["exf4", "Nf6", "Bc5", "Bb4"],
      "e4 e5 Nc3 Nc6 f4 exf4 Nf3": ["Nf6", "d6", "Be7", "g5"],
    },
    seeds: [["Nf6", "d5", "Nxe4", "Be7", "O-O"], ["Nf6", "d5", "Nxe4", "Nc6"], ["Nf6", "d5", "Nxe4", "Bg4"],
      ["Nc6", "exf4", "Nf6"], ["Nc6", "exf4", "d6"], ["Nf6", "exf4"], ["Nf6", "d6"], ["Nc6", "Nf6"], ["Nc6", "Bb4"], ["Nf6", "Nc6"], ["Nf6", "d5", "d4"], ["Bc5", "d6"], ["Bc5", "Nc6"]],
    tags: ["Vienna_Game", "Vienna_Gambit_with_Max_Lange_Defense"],
  },
  {
    id: "scotch-game", name: "Scotch Game", side: "white",
    families: ["Scotch Game"], setup: ["e4", "e5", "Nf3", "Nc6", "d4"],
    seeds: [["exd4", "Bc5", "Bb6"], ["exd4", "Bc5", "Nf6"], ["exd4", "Bc5", "Nxd4"], ["exd4", "Qf6"], ["exd4", "d6"],
      ["exd4", "g6"], ["exd4", "Nf6", "bxc6", "Nd5"], ["d6"]],
    mainReplies: {
      "e4 e5 Nf3 Nc6 d4": ["exd4", "Nxd4", "d6"],
      "e4 e5 Nf3 Nc6 d4 exd4 Nxd4": ["Nf6", "Bc5", "Qh4", "Nxd4", "Bb4+", "Qf6", "d6", "g6"],
      "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5": ["Qe7", "Nd5"],
      "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3": ["Qf6", "Bb6", "Nf6"],
    },
    tags: ["Scotch_Game"],
  },
  {
    id: "kings-gambit", name: "King's Gambit", side: "white",
    families: ["King's Gambit", "King's Gambit Accepted", "King's Gambit Declined"], strip: ["King's Gambit"],
    setup: ["e4", "e5", "f4"],
    mainReplies: {
      "e4 e5 f4": ["exf4", "d5", "Bc5"],
      "e4 e5 f4 exf4 Nf3": ["g5", "d6", "Nf6", "d5", "Be7"],
    },
    tags: ["Kings_Gambit", "Kings_Gambit_Accepted", "Kings_Gambit_Declined"],
  },
  {
    id: "english-opening", name: "English Opening", side: "white",
    families: ["English Opening"], setup: ["c4"],
    mainReplies: {
      "c4": ["e5", "c5", "Nf6", "e6"],
      "c4 e5 Nc3": ["Nf6", "Nc6"],
      "c4 e5 Nc3 Nf6 Nf3": ["Nc6", "e4"],
      "c4 e5 Nc3 Nf6 Nf3 Nc6 g3": ["d5", "Bb4", "Bc5"],
    },
    tags: ["English_Opening"],
  },
  {
    id: "sicilian-najdorf", name: "Sicilian Najdorf", side: "black",
    families: ["Sicilian Defense: Najdorf Variation"],
    setup: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
    mainReplies: {
      "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6": ["Bg5", "Be3", "Be2", "Bc4", "f4", "h3", "g3", "Bd3", "g4", "Rg1"],
    },
    tags: ["Sicilian_Defense_Najdorf_Variation"],
  },
  {
    id: "french-defense", name: "French Defense", side: "black",
    families: ["French Defense"], setup: ["e4", "e6"],
    prefer: { "e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3": "c4" },
    mainReplies: {
      "e4 e6": ["d4", "d3"],
      "e4 e6 d4 d5": ["e5", "Nc3", "Nd2", "exd5"],
      "e4 e6 d4 d5 e5 c5": ["c3", "Nf3", "Qg4"],
      "e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6": ["a3", "Bd3"],
      "e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4": ["Nbd2", "Be2"],
      "e4 e6 d4 d5 Nc3 Bb4": ["e5", "a3", "exd5", "Bd3", "Bd2", "Ne2"],
      "e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7": ["Nf3", "a4", "Qg4", "h4", "Bd3"],
    },
    tags: ["French_Defense"],
  },
  {
    id: "caro-kann", name: "Caro-Kann Defense", side: "black",
    families: ["Caro-Kann Defense"], setup: ["e4", "c6"],
    mainReplies: {
      "e4 c6": ["d4", "Nc3", "Nf3", "c4", "d3"],
      "e4 c6 d4 d5": ["Nc3", "Nd2", "e5", "exd5", "f3"],
      "e4 c6 d4 d5 e5 Bf5": ["c3", "Nc3"],
      "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5": ["Ng3"],
      "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6": ["h4", "Nf3"],
    },
    // The Classical ...Bf5 is the main line; the dataset's counts lean to ...Nf6 sidelines.
    prefer: { "e4 c6 d4 d5 Nc3 dxe4 Nxe4": "Bf5", "e4 c6 d4 d5 Nd2 dxe4 Nxe4": "Bf5" },
    extend: true, // so the preferred ...Bf5 line is continued past the dataset
    lateReplies: { "e4 c6 d4 d5 Nc3 dxe4": ["Bc4", "f3"], "e4 c6 d4 d5 Nd2 dxe4": ["Bc4", "f3"] },
    tags: ["Caro-Kann_Defense"],
  },
  {
    id: "scandinavian", name: "Scandinavian Defense", side: "black",
    families: ["Scandinavian Defense"], setup: ["e4", "d5"],
    // The dataset has more named ...Nf6 sidelines (Portuguese Gambit and friends), but ...Qxd5 is the main line.
    prefer: { "e4 d5 exd5": "Qxd5" },
    mainReplies: {
      "e4 d5": ["exd5", "Nc3", "e5", "b3", "b4"],
      "e4 d5 exd5 Qxd5": ["Nc3", "Nf3", "d4"],
      "e4 d5 exd5 Qxd5 Nc3 Qa5": ["d4", "Nf3", "b4"],
      "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6": ["Nf3", "Bd2"],
      "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5": ["Bc4", "Bd2", "Ne5"],
      "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Ne5 c6": ["Bc4", "g4"],
    },
    seeds: [["exd5", "Nc3", "d4", "Nf3", "Bc4", "Bd2", "Qe2"], ["exd5", "Nc3", "d4", "Nf3"], ["exd5", "Nc3", "Nf3", "d4", "Bc4"], ["exd5", "Nf3"], ["exd5", "d4"], ["Nc3"], ["e5"],
      ["exd5", "Nc3", "d4", "Bd2"], ["exd5", "Nc3", "Nf3", "Be2"]],
    tags: ["Scandinavian_Defense"],
  },
  {
    id: "petrov", name: "Petrov Defense", side: "black",
    families: ["Petrov's Defense"], setup: ["e4", "e5", "Nf3", "Nf6"],
    mainReplies: {
      "e4 e5 Nf3 Nf6": ["Nxe5", "d4", "Nc3", "Bc4", "Qe2"],
      "e4 e5 Nf3 Nf6 Nxe5 d6": ["Nf3", "Nc4", "Nd3", "Nxf7"],
      "e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4": ["d4", "Nc3", "c4", "d3", "Qe2"],
    },
    tags: ["Petrovs_Defense", "Russian_Game"],
  },
  {
    id: "kings-indian", name: "King's Indian Defense", side: "black",
    families: ["King's Indian Defense"], setup: ["d4", "Nf6", "c4", "g6"],
    mainReplies: {
      "d4 Nf6 c4 g6": ["Nc3", "Nf3", "g3"],
      "d4 Nf6 c4 g6 Nc3 Bg7": ["e4", "Nf3"],
      "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6": ["Nf3", "f3", "Be2", "f4", "h3", "g3"],
      "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O": ["Be2"],
      "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5": ["O-O", "d5"],
      "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7": ["Ne1", "b4"],
    },
    tags: ["Kings_Indian_Defense"],
  },
  {
    id: "queens-gambit-declined", name: "Queen's Gambit Declined", side: "black",
    families: ["Queen's Gambit Declined"], setup: ["d4", "d5", "c4", "e6"],
    mainReplies: {
      "d4 d5 c4 e6": ["Nc3", "Nf3", "g3"],
      "d4 d5 c4 e6 Nc3 Nf6": ["Bg5", "cxd5", "Nf3", "Bf4", "e3"],
      "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7": ["e3", "Nf3", "Bxf6"],
      "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7": ["Rc1", "Qc2"],
    },
    seeds: [["Nc3", "cxd5"], ["Nf3", "g3"], ["Nc3", "Bf4"], ["Nf3", "Nc3", "Bf4"], ["Nf3", "Nc3", "Qc2"], ["Nc3", "Nf3", "e3"]],
    tags: ["Queens_Gambit_Declined"],
  },
  {
    id: "slav-defense", name: "Slav Defense", side: "black",
    families: ["Slav Defense"], setup: ["d4", "d5", "c4", "c6"],
    prefer: { "d4 d5 c4 c6 Nc3": "Nf6" },
    mainReplies: {
      "d4 d5 c4 c6": ["Nf3", "cxd5", "e3", "Nc3", "e4"],
      "d4 d5 c4 c6 Nf3 Nf6": ["Nc3", "e3", "cxd5", "g3", "Bg5", "Nbd2"],
      "d4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6": ["Nf3", "Bf4", "f3"],
      "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4": ["a4", "e3", "e4"],
      "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5": ["e3", "Ne5", "Nh4"],
    },
    tags: ["Slav_Defense"],
  },
];

const SOURCE =
  "Lines from the Lichess chess-openings list (CC0), checked with Stockfish. Puzzles from the Lichess puzzle database (CC0).";

// ---------------------------------------------------------------------------------------------------------
// Helpers

const posKey = (fen) => fen.split(" ").slice(0, 4).join(" ");
const join_ = (moves) => moves.join(" ");
const learnerToMove = (ply, side) => (ply % 2 === 0) === (side === "white");

async function cached(name, make) {
  const file = join(CACHE, name);
  if (!REFRESH && existsSync(file)) return readFile(file, "utf8");
  const text = await make();
  await writeFile(file, text);
  return text;
}

async function loadOpenings() {
  const rows = [];
  for (const f of ["a", "b", "c", "d", "e"]) {
    const text = await cached(`${f}.tsv`, async () => {
      const res = await fetch(OPENINGS_URL(f));
      if (!res.ok) throw new Error(`Could not download ${f}.tsv: ${res.status}`);
      return res.text();
    });
    for (const line of text.split("\n").slice(1)) {
      if (!line.trim()) continue;
      const [eco, name, pgn] = line.split("\t");
      const moves = pgn.split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));
      rows.push({ eco, name, moves });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------------------
// Stockfish over UCI (the npm build runs as a plain node process reading stdin).

class Engine {
  constructor(cacheFile) {
    this.cacheFile = cacheFile;
    this.cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
    this.calls = 0;
    this.proc = null;
  }
  start() {
    this.proc = spawn(process.execPath, [ENGINE], { stdio: ["pipe", "pipe", "inherit"] });
    this.lines = createInterface({ input: this.proc.stdout });
    this.waiters = [];
    this.lines.on("line", (line) => {
      for (const w of [...this.waiters]) w(line);
    });
  }
  send(cmd) { this.proc.stdin.write(cmd + "\n"); }
  waitFor(pred, onLine) {
    return new Promise((resolve) => {
      const w = (line) => {
        onLine?.(line);
        if (pred(line)) { this.waiters.splice(this.waiters.indexOf(w), 1); resolve(line); }
      };
      this.waiters.push(w);
    });
  }
  async ready() {
    if (this.proc) return;
    this.start();
    const ok = this.waitFor((l) => l === "uciok");
    this.send("uci");
    await ok;
    this.send("setoption name Threads value 1");
    this.send("setoption name Hash value 16");
  }
  /** Score in centipawns for the side to move; with `move` (UCI) the search is limited to that move. */
  async score(fen, move = null) {
    const key = `${posKey(fen)}|${move ?? ""}|${NODES}`;
    if (key in this.cache) return this.cache[key];
    return (await this.search(fen, move)).cp;
  }
  /** The engine's preferred move (UCI) for the side to move, or null when there is none. */
  async best(fen) {
    const key = `best|${posKey(fen)}|${NODES}`;
    if (key in this.cache) return this.cache[key];
    return (await this.search(fen, null)).best;
  }
  async search(fen, move) {
    const key = `${posKey(fen)}|${move ?? ""}|${NODES}`;
    await this.ready();
    this.calls++;
    const isReady = this.waitFor((l) => l === "readyok");
    this.send("ucinewgame");
    this.send("isready");
    await isReady;
    let last = null;
    let exact = null;
    const done = this.waitFor((l) => l.startsWith("bestmove"), (l) => {
      const m = l.match(/ score (cp|mate) (-?\d+)( lowerbound| upperbound)?/);
      if (!m || !/ multipv 1 /.test(l + " ")) return;
      const n = Number(m[2]);
      const cp = m[1] === "cp" ? n : n > 0 ? 100000 - n : -100000 - n;
      last = cp;
      if (!m[3]) exact = cp;
    });
    this.send(`position fen ${fen}`);
    this.send(`go nodes ${NODES}${move ? ` searchmoves ${move}` : ""}`);
    const best = await done;
    let cp = exact ?? last;
    if (cp === null) {
      // No legal moves: checkmate or stalemate.
      cp = best.includes("(none)") && new Chess(fen).isCheckmate() ? -100000 : 0;
    }
    const bestMove = best.split(" ")[1];
    this.cache[key] = cp;
    if (!move) this.cache[`best|${posKey(fen)}|${NODES}`] = bestMove && bestMove !== "(none)" ? bestMove : null;
    return { cp, best: this.cache[`best|${posKey(fen)}|${NODES}`] ?? null };
  }
  async save() { await writeFile(this.cacheFile, JSON.stringify(this.cache)); }
  stop() { if (this.proc) { this.send("quit"); this.proc.stdin.end(); } }
}

// ---------------------------------------------------------------------------------------------------------
// Course lines

const inCourse = (row, course) => (course.rowFilter ? course.rowFilter(row) : matchesFamily(row.name, course.families));

function matchesFamily(name, families) {
  return families.some((f) => name === f || name.startsWith(f + ":") || name.startsWith(f + ","));
}

function lineName(name, course) {
  for (const f of [...(course.strip ?? course.families)].sort((a, b) => b.length - a.length)) {
    if (name === f) return name;
    if (name.startsWith(f + ":") || name.startsWith(f + ",")) return name.slice(f.length + 1).trim();
  }
  return name;
}

function buildTree(rows, course) {
  const root = { children: new Map(), count: 0, name: null, moves: [] };
  for (const row of rows) {
    if (!inCourse(row, course)) continue;
    if (row.moves.length < course.setup.length) continue;
    if (!course.setup.every((m, i) => row.moves[i] === m)) continue;
    let node = root;
    node.count++;
    row.moves.forEach((san, i) => {
      if (!node.children.has(san)) node.children.set(san, { children: new Map(), count: 0, name: null, moves: row.moves.slice(0, i + 1) });
      node = node.children.get(san);
      node.count++;
    });
    node.name ??= row.name;
  }
  return root;
}

function fenAfter(moves) {
  const chess = new Chess();
  for (const m of moves) chess.move(m);
  return chess.fen();
}

function uciOf(moves, san) {
  const chess = new Chess(fenAfter(moves));
  const m = chess.move(san);
  return m.from + m.to + (m.promotion ?? "");
}

/** Keeps one learner move per learner node (most lines beneath, engine-checked) and all opponent replies. */
async function prune(node, course, engine, stats) {
  const ply = node.moves.length;
  if (!node.children.size) return;
  if (!learnerToMove(ply, course.side)) {
    for (const child of node.children.values()) await prune(child, course, engine, stats);
    return;
  }
  const fen = fenAfter(node.moves);
  const inSetup = ply < course.setup.length;
  const loss = async (san) => {
    const key = join_([...node.moves, san]);
    if (inSetup || course.gambits?.includes(key)) return 0;
    const best = await engine.score(fen);
    const mine = await engine.score(fen, uciOf(node.moves, san));
    return best - mine;
  };
  const preferred = course.prefer?.[join_(node.moves)];
  if (preferred) {
    const child = node.children.get(preferred) ?? { children: new Map(), count: 0, name: null, moves: [...node.moves, preferred] };
    const l = await loss(preferred);
    if (l > LOSS_LIMIT) throw new Error(`${course.id}: preferred ${preferred} after "${join_(node.moves)}" loses ${l}`);
    node.children = new Map([[preferred, child]]);
    await prune(child, course, engine, stats);
    return;
  }
  const candidates = [...node.children.entries()].map(([san, child]) => ({ san, child, count: child.count }));
  // Most lines first; ties go to the engine's preference.
  const top = Math.max(...candidates.map((c) => c.count));
  for (const c of candidates) c.loss = c.count === top && candidates.filter((d) => d.count === top).length > 1 ? await loss(c.san) : null;
  candidates.sort((a, b) => b.count - a.count || (a.loss ?? 0) - (b.loss ?? 0) || a.san.localeCompare(b.san));
  let chosen = null;
  for (const [i, c] of candidates.entries()) {
    c.loss ??= await loss(c.san);
    if (c.loss <= LOSS_LIMIT) { chosen = c; if (i > 0) stats.replaced.push(`${join_(node.moves)} : ${candidates[0].san} -> ${c.san}`); break; }
    stats.rejected.push(`${join_([...node.moves, c.san])} (-${c.loss})`);
  }
  node.children = chosen ? new Map([[chosen.san, chosen.child]]) : new Map();
  if (!chosen) stats.deadEnds.push(join_(node.moves));
  if (chosen) await prune(chosen.child, course, engine, stats);
}

/**
 * Continues a line until the learner has made EXTEND_TO moves. Learner: the course's answer for the position
 * if it has one, else the first move of `course.plan` within PLAN_LOSS of best, else the engine's move.
 * Opponent: the next scripted move if legal, else the engine's move.
 */
async function extendLine(start, script, course, answers, engine) {
  const chess = new Chess();
  for (const m of start) chess.move(m);
  const toSan = (fen, uci) => new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
  const count = () => chess.history().filter((_, ply) => learnerToMove(ply, course.side)).length;
  while (count() < EXTEND_TO && !chess.isGameOver()) {
    const fen = chess.fen();
    const ply = chess.history().length;
    let san = null;
    if (learnerToMove(ply, course.side)) {
      san = course.prefer?.[join_(chess.history())] ?? answers.get(posKey(fen)) ?? null;
      if (!san) {
        const best = await engine.score(fen);
        const lastOpponent = chess.history().at(-1);
        for (const item of course.plan ?? []) {
          const p = typeof item === "string" ? item : item.after === lastOpponent ? item.san : null;
          if (!p) continue;
          const m = new Chess(fen).moves({ verbose: true }).find((x) => x.san === p);
          if (!m) continue;
          if (best - (await engine.score(fen, m.from + m.to + (m.promotion ?? ""))) <= PLAN_LOSS) { san = p; break; }
        }
        san ??= toSan(fen, await engine.best(fen));
        answers.set(posKey(fen), san);
      }
    } else {
      while (script.length && !san) {
        const next = script.shift();
        if (chess.moves().includes(next)) san = next;
      }
      san ??= toSan(fen, await engine.best(fen));
    }
    chess.move(san);
  }
  return chess.history();
}

/**
 * Main line first, then the rest by how far they stray from standard opponent play. At every opponent
 * move, the replies present in the course are ranked (the course's hand-ordered `mainReplies` first, then
 * dataset rows beneath the reply); a line scores the sum of the ranks of the replies it follows, so the
 * all-main-replies line scores 0. Ties go to the shorter line.
 */
function orderLines(lines, course, full) {
  const next = new Map();
  for (const l of lines) {
    const moves = l.split(" ");
    moves.forEach((san, i) => {
      const prefix = join_(moves.slice(0, i));
      if (!next.has(prefix)) next.set(prefix, new Set());
      next.get(prefix).add(san);
    });
  }
  const rows = (moves) => {
    let node = full;
    for (const m of moves) { node = node.children.get(m); if (!node) return 0; }
    return node.count;
  };
  const ranks = new Map();
  const rankOf = (prefixMoves, san) => {
    const prefix = join_(prefixMoves);
    if (!ranks.has(prefix)) {
      const hand = course.mainReplies?.[prefix] ?? [];
      const at = (m) => (hand.includes(m) ? hand.indexOf(m) : hand.length);
      const order = [...next.get(prefix)].sort(
        (a, b) => at(a) - at(b) || rows([...prefixMoves, b]) - rows([...prefixMoves, a]) || a.localeCompare(b),
      );
      ranks.set(prefix, order);
    }
    return ranks.get(prefix).indexOf(san);
  };
  const score = new Map(lines.map((l) => {
    const moves = l.split(" ");
    let s = 0;
    moves.forEach((san, ply) => {
      if (learnerToMove(ply, course.side)) return;
      const late = Array.isArray(course.lateReplies)
        ? course.lateReplies.includes(san)
        : (course.lateReplies?.[join_(moves.slice(0, ply))] ?? []).includes(san);
      s += rankOf(moves.slice(0, ply), san) + (late ? 2 : 0);
    });
    return [l, s];
  }));
  return [...lines].sort((a, b) => score.get(a) - score.get(b) || a.split(" ").length - b.split(" ").length || a.localeCompare(b));
}

function leaves(node, out = []) {
  if (!node.children.size) out.push(node.moves);
  for (const child of node.children.values()) leaves(child, out);
  return out;
}

/** Product of how often each opponent reply was chosen in the dataset: a rough "how likely is this line". */
function weight(root, moves, side) {
  let w = 1;
  let node = root;
  for (const [ply, san] of moves.entries()) {
    const child = node.children.get(san);
    if (!learnerToMove(ply, side)) {
      const total = [...node.children.values()].reduce((s, c) => s + c.count, 0);
      // A reply the dataset does not have (an engine extension) counts as a rare one.
      w *= child ? child.count / total : 0.5 / (total + 1);
    }
    if (!child) break;
    node = child;
  }
  return w;
}

async function buildCourse(course, rows, allNames, engine) {
  const stats = { replaced: [], rejected: [], deadEnds: [], droppedFinal: [], droppedShort: 0, droppedTransposition: 0, droppedCap: 0 };
  const root = buildTree(rows, course);
  const full = buildTree(rows, course); // unpruned, for weights
  await prune(root, course, engine, stats);

  const trim = (moves) => {
    const m = [...moves];
    if (m.length && !learnerToMove(m.length - 1, course.side)) m.pop();
    return m;
  };
  const learnerMoves = (moves) => moves.filter((_, ply) => learnerToMove(ply, course.side)).length;

  const tidy = (list) => {
    const unique = [...new Set(list)].filter(Boolean);
    return unique.filter((l) => !unique.some((o) => o !== l && o.startsWith(l + " ")));
  };
  let lines = tidy(leaves(root).map((m) => join_(trim(m))));
  const longEnough = (l) => learnerMoves(l.split(" ")) >= MIN_LEARNER_MOVES;
  const datasetLines = lines.filter(longEnough).length;
  stats.extended = [];
  if (course.seeds || course.extend || datasetLines < EXTEND_BELOW) {
    // Too few full lines in the dataset: continue every leaf (short ones too) and every seeded opponent
    // setup with the engine, keeping the learner's dataset answers wherever the position already has one.
    const answers = new Map();
    const record = (node) => {
      if (learnerToMove(node.moves.length, course.side) && node.children.size === 1)
        answers.set(posKey(fenAfter(node.moves)), [...node.children.keys()][0]);
      for (const child of node.children.values()) record(child);
    };
    record(root);
    const starts = [
      // Raw leaves, not trimmed: a leaf that ends on an opponent move gets a learner answer.
      ...[...new Set(leaves(root).map(join_))].filter(Boolean).map((l) => ({ moves: l.split(" "), script: [] })),
      ...(course.seeds ?? []).map((script) => ({ moves: [...course.setup], script: [...script] })),
    ].sort((a, b) => weight(full, b.moves, course.side) - weight(full, a.moves, course.side));
    const out = [];
    for (const start of starts) {
      const moves = await extendLine(start.moves, start.script, course, answers, engine);
      const line = join_(trim(moves));
      if (moves.length > start.moves.length) stats.extended.push(line);
      out.push(line);
    }
    lines = tidy(out);
  }
  if (course.mustPlay) {
    const before = lines.length;
    lines = lines.filter((l) => l.split(" ").some((san, ply) => san === course.mustPlay && learnerToMove(ply, course.side)));
    stats.droppedOffPlan = before - lines.length;
  }
  const cap = (l) => {
    const moves = l.split(" ");
    let n = 0;
    for (let ply = 0; ply < moves.length; ply++)
      if (learnerToMove(ply, course.side) && ++n === MAX_LEARNER_MOVES) return join_(moves.slice(0, ply + 1));
    return l;
  };
  lines = tidy(lines.map(cap));
  const beforeShort = lines.length;
  lines = lines.filter(longEnough);
  stats.droppedShort = beforeShort - lines.length;

  lines = orderLines(lines, course, full);

  // Transpositions: the learner must always answer a position the same way.
  const answer = new Map();
  const consistent = [];
  for (const l of lines) {
    const moves = l.split(" ");
    const chess = new Chess();
    const mine = [];
    moves.forEach((san, ply) => {
      if (learnerToMove(ply, course.side)) mine.push([posKey(chess.fen()), san]);
      chess.move(san);
    });
    if (mine.some(([k, san]) => answer.has(k) && answer.get(k) !== san)) { stats.droppedTransposition++; continue; }
    for (const [k, san] of mine) answer.set(k, san);
    consistent.push(l);
  }

  // Never end a line in a position that is bad for the learner.
  const kept = [];
  for (const l of consistent) {
    if (kept.length >= MAX_LINES) { stats.droppedCap++; continue; }
    const score = -(await engine.score(fenAfter(l.split(" "))));
    if (score < FINAL_LIMIT) { stats.droppedFinal.push(`${l} (${score})`); continue; }
    kept.push(l);
  }

  const familyNames = new Map(rows.filter((r) => inCourse(r, course)).map((r) => [join_(r.moves), r.name]).reverse());
  const courseLines = kept.map((l, i) => {
    const moves = l.split(" ");
    let name = null;
    for (let n = moves.length; n > 0 && !name; n--) name = familyNames.get(join_(moves.slice(0, n))) ?? null;
    // Engine-extended lines may leave the dataset: fall back to any named position on the way.
    for (let n = moves.length; n > 0 && !name; n--) {
      const any = allNames.get(join_(moves.slice(0, n)));
      if (any && n > course.setup.length) name = any;
    }
    return { id: `l${String(i + 1).padStart(2, "0")}`, name: name ? lineName(name, course) : course.name, moves };
  });

  const names = {};
  for (const line of courseLines)
    for (let n = 1; n <= line.moves.length; n++) {
      const key = join_(line.moves.slice(0, n));
      if (allNames.has(key)) names[key] = allNames.get(key);
    }

  const text = COURSE_TEXT[course.id];
  if (!text) throw new Error(`No blurb/ideas for ${course.id} in course-ideas.mjs`);
  const ideas = {};
  for (const [key, idea] of Object.entries(text.ideas)) {
    const n = key.split(" ").length;
    let problem = null;
    if (!kept.some((l) => l === key || l.startsWith(key + " "))) problem = "is not on any line";
    else if (!learnerToMove(n - 1, course.side)) problem = "does not end on a learner move";
    if (!problem) { ideas[key] = idea; continue; }
    if (!DRAFT) throw new Error(`${course.id}: idea "${key}" ${problem}`);
    console.warn(`  draft: dropped idea "${key}" (${problem})`);
  }

  return {
    course: {
      id: course.id, name: course.name, side: course.side, blurb: text.blurb, setup: course.setup,
      lineCount: courseLines.length, puzzleCount: 0, lines: courseLines, ideas, names,
    },
    stats,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Puzzles

async function puzzleCandidates() {
  const file = join(CACHE, "puzzle-candidates.json");
  const tagsKey = JSON.stringify(COURSES.map((c) => [c.id, c.side, c.tags]));
  if (!REFRESH && existsSync(file)) {
    const saved = JSON.parse(await readFile(file, "utf8"));
    if (saved.tagsKey === tagsKey) return saved.candidates;
  }
  const want = PUZZLES_PER_COURSE * 4; // learner-side candidates per course before we stop reading
  const candidates = Object.fromEntries(COURSES.map((c) => [c.id, []]));
  const byTag = new Map();
  for (const c of COURSES) for (const t of c.tags) byTag.set(t, [...(byTag.get(t) ?? []), c]);
  const enough = () => COURSES.every((c) => candidates[c.id].filter((p) => p.learnerSide).length >= want);

  const child = spawn("sh", ["-c", `curl -sfL ${PUZZLE_URL} | zstd -dc`], { stdio: ["ignore", "pipe", "inherit"], detached: true });
  child.on("error", (e) => { console.error("Could not start curl/zstd:", e.message); process.exit(1); });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  let header = null;
  let read = 0;
  for await (const line of lines) {
    if (!header) {
      header = Object.fromEntries(line.split(",").map((name, i) => [name, i]));
      for (const col of ["PuzzleId", "FEN", "Moves", "Rating", "RatingDeviation", "Popularity", "NbPlays", "Themes", "OpeningTags"])
        if (!(col in header)) throw new Error(`Missing column ${col}`);
      continue;
    }
    read++;
    if (read % 500_000 === 0) console.log(`  puzzles: read ${read.toLocaleString()} rows`);
    const c = line.split(",");
    const tags = c[header.OpeningTags];
    if (!tags) continue;
    const courses = new Set(tags.split(" ").flatMap((t) => byTag.get(t) ?? []));
    if (!courses.size) continue;
    const rating = Number(c[header.Rating]);
    if (
      !(rating >= PUZZLE_MIN && rating <= PUZZLE_MAX) ||
      Number(c[header.Popularity]) < 80 ||
      Number(c[header.NbPlays]) < 500 ||
      Number(c[header.RatingDeviation]) > 90
    ) continue;
    const moves = c[header.Moves].split(" ");
    if (moves.length < 2 || moves.length % 2 !== 0) continue;
    const fen = c[header.FEN];
    const solver = fen.split(" ")[1] === "w" ? "black" : "white";
    for (const course of courses) {
      const list = candidates[course.id];
      if (list.length >= want * 4) continue;
      list.push({
        id: c[header.PuzzleId], fen, moves, rating,
        themes: c[header.Themes].split(" ").filter((t) => KEEP_THEMES.has(t)),
        plays: Number(c[header.NbPlays]),
        learnerSide: solver === course.side,
      });
    }
    if (enough()) break;
  }
  lines.close();
  child.stdout.destroy();
  try { process.kill(-child.pid, "SIGTERM"); } catch {}
  console.log(`  puzzles: read ${read.toLocaleString()} rows`);
  await writeFile(file, JSON.stringify({ tagsKey, candidates }));
  return candidates;
}

/** Up to PUZZLES_PER_COURSE, round-robin over 200-point rating bands, learner's side and most played first. */
function pickPuzzles(list) {
  const bands = new Map();
  for (let r = PUZZLE_MIN; r <= PUZZLE_MAX; r += PUZZLE_BAND) bands.set(r, []);
  const sorted = [...list].sort((a, b) => b.learnerSide - a.learnerSide || b.plays - a.plays || a.id.localeCompare(b.id));
  for (const p of sorted) {
    const band = Math.min(PUZZLE_MAX - (PUZZLE_MAX - PUZZLE_MIN) % PUZZLE_BAND, PUZZLE_MIN + Math.floor((p.rating - PUZZLE_MIN) / PUZZLE_BAND) * PUZZLE_BAND);
    bands.get(band).push(p);
  }
  const queues = [...bands.values()];
  const chosen = [];
  const seen = new Set();
  while (chosen.length < PUZZLES_PER_COURSE && queues.some((q) => q.length))
    for (const q of queues) {
      if (!q.length || chosen.length >= PUZZLES_PER_COURSE) continue;
      const p = q.shift();
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      chosen.push(p);
    }
  return chosen
    .sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id))
    .map(({ id, fen, moves, rating, themes }) => ({ id, fen, moves, rating, themes }));
}

// ---------------------------------------------------------------------------------------------------------

await mkdir(CACHE, { recursive: true });
const rows = await loadOpenings();
for (const r of rows) {
  const chess = new Chess();
  for (const m of r.moves) chess.move(m); // throws on a bad row
}
const allNames = new Map();
for (const r of rows) if (!allNames.has(join_(r.moves))) allNames.set(join_(r.moves), r.name);

const engine = new Engine(join(CACHE, "engine-cache.json"));
const built = [];
for (const course of COURSES) {
  const { course: c, stats } = await buildCourse(course, rows, allNames, engine);
  await engine.save();
  built.push(c);
  console.log(
    `${c.id}: ${c.lineCount} lines | engine replaced ${stats.replaced.length}, rejected ${stats.rejected.length} moves, ` +
    `${stats.deadEnds.length} dead ends | dropped: ${stats.droppedFinal.length} bad final, ${stats.droppedShort} short, ` +
    `${stats.droppedTransposition} transposition, ${stats.droppedCap} over cap, ${stats.droppedOffPlan ?? 0} off plan | engine-extended ${c.lines.filter((l) => stats.extended.includes(l.moves.join(" "))).length}`,
  );
  if (stats.extended.length)
    for (const l of c.lines) if (stats.extended.includes(l.moves.join(" "))) console.log(`   extended ${l.id}: ${l.moves.join(" ")}`);
  if (process.env.VERBOSE) {
    for (const s of stats.replaced) console.log("   replaced", s);
    for (const s of stats.rejected) console.log("   rejected", s);
    for (const s of stats.droppedFinal) console.log("   bad final", s);
  }
}
engine.stop();

console.log("Puzzles...");
const candidates = await puzzleCandidates();

await mkdir(join(OUT, "puzzles"), { recursive: true });
for (const name of await readdir(OUT)) if (name.endsWith(".json")) await rm(join(OUT, name));
for (const name of await readdir(join(OUT, "puzzles"))) if (name.endsWith(".json")) await rm(join(OUT, "puzzles", name));

const index = { source: SOURCE, courses: [] };
for (const c of built) {
  const puzzles = pickPuzzles(candidates[c.id] ?? []);
  c.puzzleCount = puzzles.length;
  if (puzzles.length) await writeFile(join(OUT, "puzzles", `${c.id}.json`), JSON.stringify(puzzles));
  await writeFile(join(OUT, `${c.id}.json`), JSON.stringify(c));
  index.courses.push({ id: c.id, name: c.name, side: c.side, blurb: c.blurb, setup: c.setup, lineCount: c.lineCount, puzzleCount: c.puzzleCount });
  console.log(`${c.id}: ${c.lineCount} lines, ${puzzles.length} puzzles`);
}
await writeFile(join(OUT, "index.json"), JSON.stringify(index, null, 2) + "\n");
process.exit(0);
