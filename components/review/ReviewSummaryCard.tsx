/*
 * File: components/review/ReviewSummaryCard.tsx
 * Description: Shows key game review details including opening, mistakes, recurring weaknesses, and recommendations.
 * Functions:
 * - ReviewSummaryCard: Renders the high-level post-game coaching summary.
 */

"use client";

import type { GameSummary } from "@/types/game";

interface ReviewSummaryCardProps {
  summary: GameSummary;
}

export function ReviewSummaryCard({ summary }: ReviewSummaryCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-lg font-semibold text-zinc-100">Game Review</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Opening: {summary.openingName}
      </p>

      <section className="mt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
          Key Mistakes
        </h3>
        <div className="mt-2 space-y-2">
          {summary.keyMistakes.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No measured evaluation drops to review yet.
            </p>
          ) : (
            summary.keyMistakes.map((mistake) => (
              <div
                key={`${mistake.ply}-${mistake.san}`}
                className="rounded-md border border-zinc-800 bg-zinc-950 p-2"
              >
                <p className="text-xs text-zinc-500">
                  Ply {mistake.ply} · {mistake.classification}
                </p>
                <p className="font-medium text-zinc-100">{mistake.san}</p>
                <p className="text-sm text-zinc-300">{mistake.coachText}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
          Observed Patterns
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {summary.recurringWeaknesses.length === 0 ? (
            <span className="text-sm text-zinc-400">No clear pattern yet.</span>
          ) : (
            summary.recurringWeaknesses.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
              >
                {tag}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
          Try This Next
        </h3>
        <ul className="mt-2 space-y-2">
          {summary.recommendations.map((item) => (
            <li
              key={item}
              className="rounded-md border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-300"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
