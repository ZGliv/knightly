#!/usr/bin/env node
/**
 * Builds public/puzzles/*.json from the Lichess puzzle database (CC0).
 *
 * Usage:
 *   node scripts/build-puzzles.mjs              # streams the live file (needs curl + zstd on PATH)
 *   node scripts/build-puzzles.mjs puzzles.csv  # or reads an already-decompressed CSV
 *
 * The database rows are ordered by random puzzle ids, so reading the first part of the file gives
 * a fair sample. We stop as soon as every rating band has enough candidates to choose from.
 */
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "https://database.lichess.org/lichess_db_puzzle.csv.zst";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "puzzles");
const BAND_SIZE = 200;
const MIN_RATING = 400;
const MAX_RATING = 2400; // exclusive
const PER_BAND = 400;
const CANDIDATE_FACTOR = 2; // keep reading until each band has this many times PER_BAND candidates
const MAX_LINES = 4_000_000;

/** Themes we keep in the output; must match the keys of THEMES in lib/puzzles/themes.ts. */
const KEEP = new Set([
  "fork", "pin", "skewer", "discoveredAttack", "doubleCheck", "hangingPiece", "trappedPiece",
  "sacrifice", "deflection", "attraction", "capturingDefender", "interference", "clearance",
  "xRayAttack", "intermezzo", "quietMove", "defensiveMove", "zugzwang", "exposedKing",
  "kingsideAttack", "mate", "mateIn1", "mateIn2", "mateIn3", "backRankMate", "smotheredMate",
  "promotion", "advancedPawn", "endgame", "opening",
]);

const bands = [];
for (let r = MIN_RATING; r < MAX_RATING; r += BAND_SIZE) bands.push(r);
const candidates = new Map(bands.map((b) => [b, []]));
const bandOf = (rating) => Math.floor(rating / BAND_SIZE) * BAND_SIZE;
const enough = () => bands.every((b) => candidates.get(b).length >= PER_BAND * CANDIDATE_FACTOR);

function openSource() {
  const file = process.argv[2];
  if (file) return { stream: createReadStream(file), stop: () => {} };
  // Decompress with the zstd command-line tool so the app gains no dependency.
  const child = spawn("sh", ["-c", `curl -sfL ${SOURCE} | zstd -dc`], { stdio: ["ignore", "pipe", "inherit"], detached: true });
  child.on("error", (e) => { console.error("Could not start curl/zstd:", e.message); process.exit(1); });
  // Kill the whole group (sh, curl and zstd); killing only sh leaves curl downloading in the background.
  return { stream: child.stdout, stop: () => { child.stdout.destroy(); try { process.kill(-child.pid, "SIGTERM"); } catch {} } };
}

const { stream, stop } = openSource();
const lines = createInterface({ input: stream, crlfDelay: Infinity });
let header = null;
let read = 0;
for await (const line of lines) {
  if (!header) {
    header = Object.fromEntries(line.split(",").map((name, i) => [name, i]));
    for (const col of ["PuzzleId", "FEN", "Moves", "Rating", "RatingDeviation", "Popularity", "NbPlays", "Themes"])
      if (!(col in header)) throw new Error(`Missing column ${col}`);
    continue;
  }
  read++;
  const c = line.split(",");
  const rating = Number(c[header.Rating]);
  if (
    !(rating >= MIN_RATING && rating < MAX_RATING) ||
    Number(c[header.Popularity]) < 85 ||
    Number(c[header.NbPlays]) < 500 ||
    Number(c[header.RatingDeviation]) > 90
  ) continue;
  const moves = c[header.Moves].split(" ");
  if (moves.length < 2 || moves.length % 2 !== 0) continue;
  const list = candidates.get(bandOf(rating));
  if (list.length >= PER_BAND * CANDIDATE_FACTOR * 3) continue; // plenty already; save memory
  list.push({
    id: c[header.PuzzleId],
    fen: c[header.FEN],
    moves,
    rating,
    themes: c[header.Themes].split(" ").filter((t) => KEEP.has(t)),
    plays: Number(c[header.NbPlays]),
  });
  if (enough() || read >= MAX_LINES) break;
}
lines.close();
stop();
console.log(`Read ${read.toLocaleString()} rows.`);

// How often each theme appears across all candidates: rarer themes get picked first for spread.
const frequency = new Map();
for (const list of candidates.values())
  for (const p of list) for (const t of p.themes) frequency.set(t, (frequency.get(t) ?? 0) + 1);
const rarest = (p) =>
  p.themes.filter((t) => t !== "endgame" && t !== "opening" && t !== "mate")
    .sort((a, b) => frequency.get(a) - frequency.get(b))[0] ?? "other";

/** Round-robin across each puzzle's rarest theme, most-played first, so no single motif dominates a band. */
function pick(list) {
  const buckets = new Map();
  for (const p of [...list].sort((a, b) => b.plays - a.plays || a.id.localeCompare(b.id))) {
    const key = rarest(p);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
  }
  const queues = [...buckets.values()];
  const chosen = [];
  while (chosen.length < PER_BAND && queues.some((q) => q.length))
    for (const q of queues) if (q.length && chosen.length < PER_BAND) chosen.push(q.shift());
  return chosen.sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id));
}

await mkdir(OUT, { recursive: true });
for (const name of await readdir(OUT)) if (name.endsWith(".json")) await rm(join(OUT, name));
const index = { source: "Lichess puzzle database (CC0)", bandSize: BAND_SIZE, bands: [] };
for (const band of bands) {
  const chosen = pick(candidates.get(band)).map(({ id, fen, moves, rating, themes }) => ({ id, fen, moves, rating, themes }));
  const file = `${String(band).padStart(4, "0")}.json`;
  await writeFile(join(OUT, file), JSON.stringify(chosen));
  index.bands.push({ min: band, file, count: chosen.length });
  console.log(`${file}: ${chosen.length} puzzles (from ${candidates.get(band).length} candidates)`);
}
await writeFile(join(OUT, "index.json"), JSON.stringify(index, null, 2) + "\n");
process.exit(0);
