"use client";
import { useEffect, useRef, useState } from "react";
import { IconArrowRight, IconCheck, IconX } from "@tabler/icons-react";
import { openInsightsStore } from "@/lib/insights/store";
import { recordResult, weakThemes } from "@/lib/puzzles/progress";
import { initialRating } from "@/lib/puzzles/rating";
import { bandsFor, choosePuzzle, RATING_WINDOW, type Filter } from "@/lib/puzzles/selection";
import { loadProgress, saveProgress } from "@/lib/puzzles/storage";
import { THEMES, themeName } from "@/lib/puzzles/themes";
import { emptyProgress, type Puzzle, type PuzzleAttempt, type PuzzleIndex, type PuzzleProgress } from "@/lib/puzzles/types";
import { PuzzleBoard } from "./PuzzleBoard";
import { PuzzleStats } from "./PuzzleStats";
import { ThemePicker, type Mode } from "./ThemePicker";

type Current = { puzzle: Puzzle; repeat: boolean; n: number };

async function startingRating(): Promise<number> {
  try {
    const store = await openInsightsStore();
    try {
      return initialRating(await store.listGames());
    } finally {
      store.close();
    }
  } catch {
    return initialRating([]);
  }
}

export function PuzzlesPage() {
  const [progress, setProgress] = useState<PuzzleProgress>(emptyProgress);
  const [startRating, setStartRating] = useState<number | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const [index, setIndex] = useState<PuzzleIndex | null>(null);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<Current | null>(null);
  const [noneLeft, setNoneLeft] = useState(false);
  const [result, setResult] = useState<{ attempt: PuzzleAttempt; repeat: boolean } | null>(null);
  const [mode, setMode] = useState<Mode>("all");
  const [theme, setTheme] = useState<string>("fork");
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(false);
  const pool = useRef(new Map<string, Puzzle[]>());
  const serial = useRef(0);

  async function load(files: string[]) {
    await Promise.all(
      files.filter((f) => !pool.current.has(f)).map(async (file) => {
        const res = await fetch(`/puzzles/${file}`);
        if (!res.ok) throw new Error(`Could not load puzzles (${res.status}).`);
        const data: unknown = await res.json();
        pool.current.set(file, Array.isArray(data) ? (data as Puzzle[]) : []);
      }),
    );
    return [...pool.current.values()].flat();
  }

  async function serve(opts: { idx: PuzzleIndex; progress: PuzzleProgress; rating: number; filter: Filter; skip?: string }) {
    const ticket = ++serial.current;
    setLoading(true);
    setError("");
    try {
      const at = Date.now();
      const base = { progress: opts.progress, rating: opts.rating, filter: opts.filter, now: at, skip: opts.skip };
      let pick = choosePuzzle({ ...base, pool: await load(bandsFor(opts.idx, opts.rating)) });
      // Nothing close enough in the nearby bands (rare themes, or you've done them all): look everywhere.
      if (!pick || (!pick.repeat && Math.abs(pick.puzzle.rating - opts.rating) > RATING_WINDOW))
        pick = choosePuzzle({ ...base, pool: await load(opts.idx.bands.map((b) => b.file)) });
      if (ticket !== serial.current) return;
      setNow(at);
      setResult(null);
      setNoneLeft(!pick);
      setCurrent(pick ? { ...pick, n: ticket } : null);
    } catch (e) {
      if (ticket === serial.current) setError((e as Error).message || "Could not load puzzles.");
    } finally {
      if (ticket === serial.current) setLoading(false);
    }
  }

  useEffect(() => {
    let live = true;
    (async () => {
      const stored = loadProgress();
      const start = stored.progress.rating ?? (await startingRating());
      let idx: PuzzleIndex;
      try {
        const res = await fetch("/puzzles/index.json");
        if (!res.ok) throw new Error();
        idx = (await res.json()) as PuzzleIndex;
      } catch {
        if (live) setError("Could not load the puzzle list. Check your connection and reload.");
        return;
      }
      if (!live) return;
      setProgress(stored.progress);
      setStorageOk(stored.available);
      setStartRating(start);
      setIndex(idx);
      void serve({ idx, progress: stored.progress, rating: stored.progress.rating ?? start, filter: { kind: "all" } });
    })();
    return () => {
      live = false;
    };
    // serve() only touches refs and setters; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rating = progress.rating ?? startRating ?? 0;
  const weak = weakThemes(progress.attempts);
  const filterFor = (m: Mode, t: string): Filter =>
    m === "theme" ? { kind: "theme", theme: t } : m === "weak" && weak.length ? { kind: "weak", themes: weak } : { kind: "all" };

  function next(m = mode, t = theme) {
    if (index) void serve({ idx: index, progress, rating, filter: filterFor(m, t), skip: current?.puzzle.id });
  }

  function finish(solved: boolean) {
    if (!current || startRating === null) return;
    const at = Date.now();
    const recorded = recordResult(progress, current.puzzle, solved, startRating, at);
    setProgress(recorded.progress);
    if (!saveProgress(recorded.progress)) setStorageOk(false);
    setResult({ attempt: recorded.attempt, repeat: current.repeat });
    setNow(at);
  }

  if (!index || startRating === null)
    return (
      <section className="pz-page">
        <h1>Puzzles</h1>
        <p className={error ? "pz-error" : "pz-muted"} role={error ? "alert" : "status"}>{error || "Loading puzzles…"}</p>
      </section>
    );

  const change = result ?result.attempt.ratingAfter - result.attempt.ratingBefore : 0;
  return (
    <section className="pz-page">
      <header className="pz-head">
        <div>
          <h1>Puzzles</h1>
          <p className="pz-muted">Find the winning move. Puzzles match your puzzle rating and missed ones come back.</p>
        </div>
      </header>
      <PuzzleStats progress={progress} rating={rating} now={now} />
      <ThemePicker
        mode={mode}
        theme={theme}
        weak={weak}
        disabled={loading}
        onChange={(m, t) => {
          setMode(m);
          setTheme(t);
          next(m, t);
        }}
      />
      {!storageOk && <p className="pz-note" role="status">This browser isn’t saving progress, so your rating and history reset when you leave.</p>}
      {error && (
        <p className="pz-error" role="alert">
          {error} <button className="pz-link" onClick={() => next()}>Try again</button>
        </p>
      )}
      <div className="pz-layout">
        <div className="pz-main">
          {current ? (
            <PuzzleBoard key={`${current.puzzle.id}-${current.n}`} puzzle={current.puzzle} onFinish={finish} />
          ) : noneLeft ? (
            <div className="pz-card">
              <p>You’ve done every puzzle that fits this filter. Try another theme or mixed puzzles.</p>
              <button className="btn" onClick={() => { setMode("all"); next("all"); }}>Mixed puzzles</button>
            </div>
          ) : (
            <p className="pz-muted" role="status">Loading puzzle…</p>
          )}
        </div>
        <aside className="pz-side-panel">
          {current && !result && (
            <div className="pz-card">
              <span className="eyebrow">{current.repeat ? "Second look" : "Puzzle"}</span>
              <p className="pz-big">Rated {current.puzzle.rating}</p>
              <p className="pz-muted">
                {current.repeat
                  ? "You missed this one before. Repeats don’t change your rating."
                  : "Solve it without a hint to gain rating. A wrong move ends the puzzle."}
              </p>
            </div>
          )}
          {current && result && (
            <div className={`pz-card pz-result ${result.attempt.solved ? "is-solved" : "is-missed"}`}>
              <p className="pz-result-title">
                {result.attempt.solved ? <IconCheck size={20} /> : <IconX size={20} />}
                {result.attempt.solved ? "Solved" : "Missed"}
              </p>
              <p className="pz-rating-change">
                {result.attempt.rated ? (
                  <>
                    <strong>{result.attempt.ratingAfter}</strong>
                    <span className={change >= 0 ? "pz-up" : "pz-down"}>{change >= 0 ? `+${change}` : `−${-change}`}</span>
                  </>
                ) : (
                  <span className="pz-muted">Repeat puzzle, rating unchanged</span>
                )}
              </p>
              <p className="pz-muted">
                Puzzle rated {current.puzzle.rating}.
                {!result.attempt.solved && " It will come back tomorrow for another try."}
              </p>
              {current.puzzle.themes.length > 0 && (
                <ul className="pz-themes">
                  {current.puzzle.themes.map((t) => (
                    <li key={t}>
                      <strong>{themeName(t)}</strong>
                      {THEMES[t] && <span>{THEMES[t].blurb}</span>}
                    </li>
                  ))}
                </ul>
              )}
              <button className="btn pz-next" onClick={() => next()} disabled={loading}>
                Next puzzle <IconArrowRight size={16} />
              </button>
            </div>
          )}
        </aside>
      </div>
      <p className="pz-credit">Puzzles from the Lichess puzzle database (public domain).</p>
    </section>
  );
}
