#!/usr/bin/env node
/*
 * Builds public/masters/games.json for "Play like the pros" from real over-the-board games.
 *
 * Source: Lichess's open broadcast API (no login). For each tournament below it downloads the
 * whole tournament as PGN (GET https://lichess.org/api/broadcast/{tournamentId}.pgn), keeps
 * classical games that Magnus Carlsen or Hikaru Nakamura won in 30-70 moves, replays every game
 * with chess.js, tags its middlegame with lib/masters/structure.ts and writes a balanced selection.
 *
 * Run (re-runnable; it overwrites the file):  pnpm exec tsx scripts/build-master-games.mjs
 * The tournament ids were found with https://lichess.org/api/broadcast/search?q=...
 */
import { mkdir, writeFile } from "node:fs/promises";
import { Chess } from "chess.js";
import { detectStructure, primaryGroup } from "../lib/masters/structure.ts";

const TOURNAMENTS = [
  { id: "kDQUxYbE", name: "Norway Chess 2026" },
  { id: "PcsMbQ9J", name: "Norway Chess 2025" },
  { id: "qkY2yAcs", name: "Norway Chess 2024" },
  { id: "eHDUE77y", name: "Norway Chess 2023" },
  { id: "KeMXJB4g", name: "Norway Chess 2022" },
  { id: "qQvTLffB", name: "Norway Chess 2021" },
  { id: "1X75mYa7", name: "TePe Sigeman & Co 2026" },
  { id: "BLA70Vds", name: "FIDE Candidates 2026" },
  { id: "wEuVhT9c", name: "FIDE Candidates 2024" },
  { id: "l40HBYGJ", name: "FIDE World Cup 2023" },
  { id: "1YsJS3PW", name: "Tata Steel Masters 2023" },
  { id: "IsMvGXWN", name: "Tata Steel Masters 2022" },
];

const PROS = [
  { pattern: /\bCarlsen\b/i, name: "Magnus Carlsen" },
  { pattern: /\bNakamura\b/i, name: "Hikaru Nakamura" },
];

const MIN_MOVES = 30;
const MAX_MOVES = 70;
const MAX_GAMES = 45;
const MIN_GAMES = 30;
const OUT = new URL("../public/masters/games.json", import.meta.url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPgn(id) {
  const url = `https://lichess.org/api/broadcast/${id}.pgn`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { Accept: "application/x-chess-pgn" } });
    if (res.status === 429) {
      console.warn(`  rate limited; waiting 60s`);
      await sleep(60_000);
      continue;
    }
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    return res.text();
  }
  throw new Error(`${url} kept rate limiting`);
}

function splitPgn(text) {
  return text
    .replace(/\r/g, "")
    .split(/\n\n(?=\[Event )/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * "Carlsen, Magnus" -> "Magnus Carlsen"; "Carlsen Magnus (NOR)" (World Cup style) -> "Magnus
 * Carlsen", unless the given name is an initial ("Gukesh D (IND)" -> "Gukesh D"). Other names stay.
 */
function displayName(raw) {
  const name = raw.trim();
  if (name.includes(",")) {
    const [last, first] = name.split(",").map((s) => s.trim());
    return first ? `${first} ${last}` : last;
  }
  const flagged = name.match(/^(.+?)\s+\([A-Z]{3}\)$/);
  if (!flagged) return name;
  const parts = flagged[1].split(/\s+/);
  const first = parts.at(-1);
  return parts.length > 1 && first.length > 1 ? `${first} ${parts.slice(0, -1).join(" ")}` : flagged[1];
}

/**
 * Classical games only. Uses the time control when it is recorded ("40/7200:..." or free text such
 * as "120 minutes for the first 40 moves..."), otherwise the first clock comment: Norway Chess
 * PGNs record neither header nor format, and mix classical games with 10-minute Armageddon games.
 * A game with neither is skipped.
 */
function isClassical(tc, pgn) {
  if (tc && tc !== "?" && tc !== "-") {
    if (/^\d/.test(tc) && !/min/i.test(tc)) {
      const first = tc.split(":")[0];
      const base = Number(first.includes("/") ? first.split("/")[1] : first.split("+")[0]);
      return Number.isFinite(base) && base >= 3600;
    }
    const minutes = tc.match(/(\d+)\s*min/i);
    return minutes ? Number(minutes[1]) >= 60 : false;
  }
  const clock = pgn.match(/\[%clk (\d+):(\d+):\d+\]/);
  return clock ? Number(clock[1]) * 60 + Number(clock[2]) >= 60 : false;
}

function parseGame(pgn, tournament) {
  const chess = new Chess();
  // Broadcast PGNs carry engine and clock comments, sometimes two in a row, which chess.js does
  // not parse; they are not needed, so they are removed before loading.
  chess.loadPgn(pgn.replace(/\{[^}]*\}/g, " ")); // throws on any illegal move
  const h = chess.getHeaders();
  const result = h.Result;
  if (result !== "1-0" && result !== "0-1") return null;
  if (h.Variant && h.Variant !== "Standard") return null;
  if (h.FEN || h.SetUp === "1") return null;
  if (!isClassical(h.TimeControl, pgn)) return null;
  const moves = chess.history();
  const full = Math.ceil(moves.length / 2);
  if (full < MIN_MOVES || full > MAX_MOVES) return null;

  const proSide = result === "1-0" ? "white" : "black";
  const winnerRaw = proSide === "white" ? h.White : h.Black;
  const pro = PROS.find((p) => p.pattern.test(winnerRaw ?? ""));
  if (!pro) return null;

  // Replay once more from scratch to be certain every SAN move is legal as stored.
  const check = new Chess();
  for (const san of moves) check.move(san);

  const year = Number((h.Date ?? h.UTCDate ?? "").slice(0, 4));
  const url = h.GameURL ?? h.BroadcastURL ?? `https://lichess.org/broadcast/-/${tournament.id}`;
  const elo = (v) => (v && /^\d+$/.test(v) ? Number(v) : null);
  return {
    id: url.split("/").pop(),
    white: displayName(h.White),
    black: displayName(h.Black),
    whiteElo: elo(h.WhiteElo),
    blackElo: elo(h.BlackElo),
    event: tournament.name,
    year: Number.isFinite(year) && year > 1900 ? year : Number(tournament.name.match(/\d{4}/)?.[0]),
    result,
    opening: h.Opening && h.Opening !== "?" ? h.Opening : "",
    eco: h.ECO && h.ECO !== "?" ? h.ECO : "",
    moves,
    proSide,
    pro: pro.name,
    tags: detectStructure(moves),
    source: url,
  };
}

/** Round-robin over (pro, group) buckets, newest first, so no single kind of game dominates. */
function balance(games) {
  const buckets = new Map();
  for (const g of [...games].sort((a, b) => b.year - a.year)) {
    const key = `${g.pro}|${primaryGroup(g.tags)}`;
    buckets.set(key, [...(buckets.get(key) ?? []), g]);
  }
  const lists = [...buckets.values()];
  const out = [];
  while (out.length < MAX_GAMES && lists.some((l) => l.length)) {
    for (const list of lists) {
      if (out.length >= MAX_GAMES) break;
      const next = list.shift();
      if (next) out.push(next);
    }
  }
  return out;
}

async function main() {
  const all = [];
  const seen = new Set();
  for (const t of TOURNAMENTS) {
    console.log(`Fetching ${t.name} (${t.id})`);
    const text = await fetchPgn(t.id);
    let kept = 0;
    for (const pgn of splitPgn(text)) {
      let game;
      try {
        game = parseGame(pgn, t);
      } catch (error) {
        console.warn(`  skipped a game that does not replay: ${error.message.split("\n")[0]}`);
        continue;
      }
      if (!game || seen.has(game.id)) continue;
      seen.add(game.id);
      all.push(game);
      kept++;
    }
    console.log(`  ${kept} usable games`);
    await sleep(1500);
  }
  const games = balance(all);
  if (games.length < MIN_GAMES) throw new Error(`Only ${games.length} usable games; need at least ${MIN_GAMES}.`);

  const count = (key) =>
    games.reduce((m, g) => {
      for (const k of key(g)) m[k] = (m[k] ?? 0) + 1;
      return m;
    }, {});
  console.log(`Kept ${games.length} of ${all.length} candidates`);
  console.log("By pro:", count((g) => [g.pro]));
  console.log("By tag:", count((g) => (g.tags.length ? g.tags : ["mixed"])));
  console.log("By group:", count((g) => [primaryGroup(g.tags)]));

  await mkdir(new URL(".", OUT), { recursive: true });
  const file = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "Lichess broadcasts (https://lichess.org/broadcast), downloaded with scripts/build-master-games.mjs",
    games,
  };
  await writeFile(OUT, JSON.stringify(file) + "\n");
  console.log(`Wrote ${OUT.pathname}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
