"use client";
import { currentStreak, solvedToday, themeStats, THEME_MIN_ATTEMPTS } from "@/lib/puzzles/progress";
import { themeName } from "@/lib/puzzles/themes";
import type { PuzzleProgress } from "@/lib/puzzles/types";

export function PuzzleStats({ progress, rating, now }: { progress: PuzzleProgress; rating: number; now: number }) {
  const rated = progress.attempts.filter((a) => a.rated).length;
  const themes = themeStats(progress.attempts);
  return (
    <section className="pz-stats" aria-label="Your puzzle stats">
      <dl className="pz-strip">
        <div>
          <dt>Puzzle rating</dt>
          <dd>
            {rating}
            {rated < 20 && <small title="Your rating moves faster for the first 20 puzzles while it settles.">settling</small>}
          </dd>
        </div>
        <div>
          <dt>Solved today</dt>
          <dd>{now ? solvedToday(progress.attempts, now) : 0}</dd>
        </div>
        <div>
          <dt>Streak</dt>
          <dd>{currentStreak(progress.attempts)}</dd>
        </div>
      </dl>
      {themes.length > 0 ? (
        <details className="pz-theme-stats">
          <summary>Success rate by theme</summary>
          <ul>
            {themes.map((s) => (
              <li key={s.theme}>
                <span>{themeName(s.theme)}</span>
                <span className="pz-bar" aria-hidden>
                  <span style={{ width: `${Math.round(s.rate * 100)}%` }} />
                </span>
                <span className="pz-rate">
                  {Math.round(s.rate * 100)}% <small>of {s.attempts}</small>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        progress.attempts.length > 0 && <p className="pz-muted pz-small">Theme success rates appear after {THEME_MIN_ATTEMPTS} puzzles in a theme.</p>
      )}
    </section>
  );
}
