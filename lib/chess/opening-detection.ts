/*
 * File: lib/chess/opening-detection.ts
 * Description: Detects a known opening name from an initial SAN move sequence using a lightweight built-in map.
 * Functions:
 * - detectOpening: Matches early-game SAN sequences to a friendly opening name.
 */

const OPENING_PREFIXES: Array<{ sequence: string; name: string }> = [
  { sequence: "e4 e5 Nf3 Nc6 Bb5", name: "Ruy Lopez" },
  { sequence: "e4 e5 Nf3 Nc6 Bc4", name: "Italian Game" },
  { sequence: "e4 c5", name: "Sicilian Defense" },
  { sequence: "e4 e6", name: "French Defense" },
  { sequence: "e4 c6", name: "Caro-Kann Defense" },
  { sequence: "d4 d5 c4", name: "Queen's Gambit" },
  { sequence: "d4 Nf6 c4 g6", name: "King's Indian Defense" },
  { sequence: "d4 Nf6 c4 e6 Nc3 Bb4", name: "Nimzo-Indian Defense" },
  { sequence: "d4 d5 Nf3 Nf6", name: "Queen's Pawn Game" },
  { sequence: "Nf3 d5 g3", name: "Reti Opening" },
  { sequence: "c4", name: "English Opening" },
];

export function detectOpening(sanMoves: string[]): string {
  // This normalizes SAN moves into a single comparison string.
  const sequence = sanMoves.slice(0, 10).join(" ");

  // This finds the longest matching prefix so more specific openings win.
  const match = OPENING_PREFIXES.filter((item) =>
    sequence.startsWith(item.sequence),
  ).sort((a, b) => b.sequence.length - a.sequence.length)[0];

  // This falls back to an explicit unknown value for unsupported lines.
  return match?.name ?? "Unknown Opening";
}
