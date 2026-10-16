/*
 * File: app/games/page.tsx
 * Description: Lists recently saved local games so users can revisit review pages quickly.
 * Functions:
 * - GamesPage: Reads saved games from local storage and renders a recent-games list.
 */

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { listGamesLocal } from "@/lib/storage/local-games";

export default function GamesPage() {
  // This reads local games lazily on the client to avoid effect-only state syncing.
  const games = useMemo(() => listGamesLocal(), []);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
        <h1 className="text-xl font-semibold text-zinc-100">Saved Games</h1>
        <p className="text-sm text-zinc-400">
          Open any finished game to review mistakes and recommendations.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        {games.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No saved games yet. Play and save your first game.
          </p>
        ) : (
          <div className="space-y-3">
            {games.map((game) => (
              <div
                key={game.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3"
              >
                <div>
                  <p className="font-medium text-zinc-100">
                    {new Date(game.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Result: {game.result} · Opening: {game.openingName}
                  </p>
                </div>
                <Link
                  href={`/review/${game.id}`}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                >
                  Open Review
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
