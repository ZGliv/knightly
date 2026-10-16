/*
 * File: components/chess/MoveList.tsx
 * Description: Shows chronological SAN moves with optional quality tags for analyzed player moves.
 * Functions:
 * - MoveList: Renders move pairs and quality labels.
 */

"use client";

import type { ClassifiedMove } from "@/types/game";

interface MoveListProps {
  moves: ClassifiedMove[];
}

function badgeClass(label?: string) {
  if (label === "best") return "bg-emerald-600/30 text-emerald-200";
  if (label === "good") return "bg-green-600/20 text-green-200";
  if (label === "inaccuracy") return "bg-yellow-600/30 text-yellow-200";
  if (label === "mistake") return "bg-orange-600/30 text-orange-200";
  if (label === "blunder") return "bg-red-600/35 text-red-200";
  return "bg-zinc-700 text-zinc-200";
}

export function MoveList({ moves }: MoveListProps) {
  const rows = [];
  for (let index = 0; index < moves.length; index += 2) {
    const white = moves[index];
    const black = moves[index + 1];
    rows.push({ moveNumber: Math.floor(index / 2) + 1, white, black });
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-300">
        Move List
      </h3>
      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1 text-sm">
        {rows.length === 0 ? (
          <p className="text-zinc-500">No moves yet.</p>
        ) : (
          rows.map((row) => (
            <div
              key={`row-${row.moveNumber}`}
              className="grid grid-cols-[40px_1fr_1fr] items-center gap-2"
            >
              <span className="text-zinc-500">{row.moveNumber}.</span>
              <div className="flex items-center gap-2 rounded-md bg-zinc-800 px-2 py-1">
                <span className="font-medium text-zinc-100">{row.white.san}</span>
                {row.white.classification ? (
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${badgeClass(
                      row.white.classification,
                    )}`}
                  >
                    {row.white.classification}
                  </span>
                ) : null}
              </div>
              <div className="rounded-md bg-zinc-800 px-2 py-1">
                <span className="font-medium text-zinc-100">
                  {row.black?.san ?? "-"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
