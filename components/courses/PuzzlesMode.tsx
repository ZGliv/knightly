"use client";
import { useEffect, useState } from "react";
import { IconArrowRight, IconCheck, IconX } from "@tabler/icons-react";
import { PuzzleBoard } from "@/components/puzzles/PuzzleBoard";
import { readImportedGames } from "@/lib/courses/games";
import { loadCoursePuzzles } from "@/lib/courses/load";
import { initialRating } from "@/lib/puzzles/rating";
import { recordResult } from "@/lib/puzzles/progress";
import { choosePuzzle } from "@/lib/puzzles/selection";
import { loadProgress, saveProgress } from "@/lib/puzzles/storage";
import { themeName } from "@/lib/puzzles/themes";
import type { Puzzle, PuzzleAttempt, PuzzleProgress } from "@/lib/puzzles/types";
import type { ModeProps } from "./modeTypes";

type Current = { puzzle: Puzzle; repeat: boolean; n: number };
type Load = { status: "loading" } | { status: "error" } | { status: "ready"; pool: Puzzle[]; start: number };

/** Only this course's missed puzzles may come back here; other repeats wait for the Puzzles page. */
const scoped = (progress: PuzzleProgress, ids: Set<string>): PuzzleProgress => ({
  ...progress,
  repeats: Object.fromEntries(Object.entries(progress.repeats).filter(([id]) => ids.has(id))),
});

function pick(pool: Puzzle[], progress: PuzzleProgress, rating: number, n: number, skip?: string): Current | null {
  const ids = new Set(pool.map((p) => p.id));
  const chosen = choosePuzzle({ pool, progress: scoped(progress, ids), rating, filter: { kind: "all" }, now: Date.now(), skip });
  return chosen ? { ...chosen, n } : null;
}

/** Tactics from games that began with this opening, served at the learner's puzzle rating and recorded with his puzzle progress. */
export function PuzzlesMode({ course }: ModeProps) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState<PuzzleProgress | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const [current, setCurrent] = useState<Current | null>(null);
  const [result, setResult] = useState<PuzzleAttempt | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      let pool: Puzzle[];
      try {
        pool = await loadCoursePuzzles(course.id);
      } catch {
        if (live) setLoad({ status: "error" });
        return;
      }
      const stored = loadProgress();
      const start = stored.progress.rating ?? initialRating((await readImportedGames()).raw);
      if (!live) return;
      setProgress(stored.progress);
      setStorageOk(stored.available);
      setLoad({ status: "ready", pool, start });
      setCurrent(pick(pool, stored.progress, stored.progress.rating ?? start, 1));
    })();
    return () => {
      live = false;
    };
  }, [course.id, attempt]);

  if (load.status === "loading" || (load.status === "ready" && !progress))
    return <p className="cr-muted" role="status">Loading puzzles…</p>;
  if (load.status === "error")
    return (
      <div className="cr-card cr-empty" role="alert">
        <h2>Couldn’t load the puzzles</h2>
        <p className="cr-muted">The puzzles for this course didn’t arrive. Check your connection and try again.</p>
        <div className="cr-actions">
          <button className="btn" onClick={() => { setLoad({ status: "loading" }); setAttempt((a) => a + 1); }}>Try again</button>
        </div>
      </div>
    );

  const { pool, start } = load;
  if (!pool.length)
    return (
      <div className="cr-card cr-empty">
        <h2>No puzzles for this course yet</h2>
        <p className="cr-muted">None of the puzzles we have started from this opening.</p>
      </div>
    );

  const prog = progress!;
  const rating = prog.rating ?? start;
  const ids = new Set(pool.map((p) => p.id));
  const solved = new Set(prog.attempts.filter((a) => a.solved && ids.has(a.puzzleId)).map((a) => a.puzzleId)).size;

  function finish(ok: boolean) {
    if (!current) return;
    // Re-read storage so a puzzle finished in another tab is not overwritten.
    const latest = loadProgress().progress;
    const recorded = recordResult(latest, current.puzzle, ok, start, Date.now());
    setProgress(recorded.progress);
    if (!saveProgress(recorded.progress)) setStorageOk(false);
    setResult(recorded.attempt);
  }

  function next() {
    setResult(null);
    setCurrent(pick(pool, prog, rating, (current?.n ?? 0) + 1, current?.puzzle.id));
  }

  const change = result ? result.ratingAfter - result.ratingBefore : 0;
  return (
    <div className="cr-runner">
      <div className="cr-board">
        {current ? (
          <PuzzleBoard key={`${current.puzzle.id}-${current.n}`} puzzle={current.puzzle} onFinish={finish} />
        ) : (
          <div className="cr-card cr-empty">
            <h2>You’ve done every puzzle in this course</h2>
            <p className="cr-muted">Puzzles you missed come back here after 1, 3 and 7 days. The Puzzles page has thousands more.</p>
          </div>
        )}
      </div>
      <aside className="cr-side">
        <p className="cr-status">
          <strong>{solved}/{pool.length}</strong> solved in this course · your puzzle rating <strong>{rating}</strong>
        </p>
        <p className="cr-muted cr-small">
          These positions come from real games that started with this opening. They count towards your puzzle rating, a number that rises when you solve puzzles and falls when you miss them.
        </p>
        {!storageOk && <p className="cr-note" role="status">This browser isn’t saving puzzle progress, so your rating resets when you leave.</p>}
        {current && !result && (
          <div className="cr-card">
            <span className="eyebrow">{current.repeat ? "Second look" : "Puzzle"}</span>
            <p><strong>Rated {current.puzzle.rating}</strong></p>
            <p className="cr-muted">
              {current.repeat ? "You missed this one before. Repeats don’t change your rating." : "Solve it without a hint to gain rating. A wrong move ends the puzzle."}
            </p>
          </div>
        )}
        {current && result && (
          <div className="cr-card">
            <p className={result.solved ? "cr-good" : "cr-warn"}>
              {result.solved ? <IconCheck size={16} /> : <IconX size={16} />} {result.solved ? "Solved" : "Missed"}
              {result.rated ? ` · rating ${result.ratingAfter} (${change >= 0 ? `+${change}` : `−${-change}`})` : " · repeat, rating unchanged"}
            </p>
            {current.puzzle.themes.length > 0 && <p className="cr-muted cr-small">Themes: {current.puzzle.themes.map(themeName).join(", ")}</p>}
            {!result.solved && <p className="cr-muted cr-small">It will come back tomorrow for another try.</p>}
            <div className="cr-actions">
              <button className="btn" onClick={next}>Next puzzle <IconArrowRight size={16} /></button>
            </div>
          </div>
        )}
        <p className="cr-credit">Puzzles from the Lichess puzzle database (public domain).</p>
      </aside>
    </div>
  );
}
