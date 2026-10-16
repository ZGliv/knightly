/*
 * File: components/review/PhaseStrengthCard.tsx
 * Description: Renders phase strength values as compact progress bars for opening, middlegame, and endgame.
 * Functions:
 * - PhaseStrengthCard: Displays phase strength metrics from a completed game summary.
 */

"use client";

import type { PhaseBreakdown } from "@/types/game";

interface PhaseStrengthCardProps {
  phaseStrength: PhaseBreakdown;
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="font-medium text-zinc-100">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800">
        <div
          className="h-2 rounded-full bg-indigo-500"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function PhaseStrengthCard({ phaseStrength }: PhaseStrengthCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-300">
        Strength by Phase
      </h3>
      <div className="space-y-4">
        <ProgressRow label="Opening" value={phaseStrength.opening} />
        <ProgressRow label="Middlegame" value={phaseStrength.middlegame} />
        <ProgressRow label="Endgame" value={phaseStrength.endgame} />
      </div>
    </div>
  );
}
