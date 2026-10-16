/*
 * File: app/page.tsx
 * Description: Renders the landing page with MVP value proposition and clear action links.
 * Functions:
 * - Home: Displays product intro and entry points to gameplay and saved reviews.
 */

import Link from "next/link";

export default function Home() {
  return (
    <section className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <p className="text-sm uppercase tracking-[0.18em] text-indigo-300">
          BuddyMine Chess Coach
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight text-zinc-100">
          Play. Learn. Improve.
          <br />
          With a live chess coach.
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-300">
          Play against the engine, get plain-English move feedback in real time,
          and finish every game with a focused review you can use immediately.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/play"
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            Start Coaching Game
          </Link>
          <Link
            href="/games"
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800"
          >
            View Saved Reviews
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <h2 className="text-lg font-semibold text-zinc-100">What this MVP does</h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-300">
          <li>- Play full games against Stockfish.</li>
          <li>- Get move labels: best, good, inaccuracy, mistake, blunder.</li>
          <li>- Receive concise live coaching text.</li>
          <li>- See opening detection and post-game summary.</li>
          <li>- Save game reviews for quick replay.</li>
        </ul>
      </div>
    </section>
  );
}
