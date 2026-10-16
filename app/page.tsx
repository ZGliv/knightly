import Link from "next/link";
export default function Home() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="panel py-10 md:p-12">
        <p className="eyebrow">BuddyMine Chess Coach</p>
        <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight md:text-5xl">
          Understand your moves.
          <br />
          <span className="text-indigo-300">Improve your game.</span>
        </h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-zinc-300">
          A quiet place to play, pause and look again. Practice against
          Stockfish, compare your choices with its suggestions, and keep a
          record you can return to.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn" href="/play">
            Open your board
          </Link>
          <Link className="btn secondary" href="/games">
            Your game library
          </Link>
        </div>
        <p className="mt-5 text-xs leading-5 text-zinc-500">
          No account required. Engine and game storage run on your device.
          Export a backup to keep your games beyond this browser.
        </p>
      </div>
      <div className="panel flex flex-col justify-center gap-7 p-8">
        {[
          [
            "01",
            "Play a real game",
            "Legal chess, adjustable opponent skill, tap or drag controls, and a board that resumes where you left it.",
          ],
          [
            "02",
            "Understand a decision",
            "Short engine searches compare positions before and after your moves. Feedback states what was measured, with no invented strategic story.",
          ],
          [
            "03",
            "Return with a purpose",
            "Replay move by move. Analyze a decision. Export PGN or a portable backup, then import it on another device.",
          ],
        ].map(([number, title, copy]) => (
          <div key={number} className="flex gap-4">
            <span className="pt-1 text-xs text-indigo-400">{number}</span>
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
