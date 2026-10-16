/*
 * File: app/review/[gameId]/page.tsx
 * Description: Displays the post-game analysis screen for a selected saved game id.
 * Functions:
 * - ReviewPage: Loads saved game data and renders summary and phase strength cards.
 */

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PhaseStrengthCard } from "@/components/review/PhaseStrengthCard";
import { ReviewSummaryCard } from "@/components/review/ReviewSummaryCard";
import { getGameLocal } from "@/lib/storage/local-games";

export default function ReviewPage() {
  const params = useParams<{ gameId: string }>();
  // This reads game review data directly from local persistence for the route id.
  const game = params.gameId ? getGameLocal(params.gameId) : null;

  if (!game) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-zinc-300">Game not found.</p>
        <Link href="/games" className="mt-3 inline-block text-sm text-indigo-300">
          Back to saved games
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <ReviewSummaryCard summary={game.summary} />

      <div className="space-y-4">
        <PhaseStrengthCard phaseStrength={game.summary.phaseStrength} />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
            Metadata
          </h3>
          <p className="mt-2 text-sm text-zinc-300">Result: {game.result}</p>
          <p className="text-sm text-zinc-300">Engine Level: {game.engineLevel}</p>
          <p className="text-sm text-zinc-300">Opening: {game.openingName}</p>
        </div>
      </div>
    </section>
  );
}
