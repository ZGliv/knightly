"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PositionPreview } from "@/components/library/PositionPreview";
import { fenAfter, numberedMoves } from "@/lib/courses/line";
import { CourseLoadError, loadCourse, loadIndex } from "@/lib/courses/load";
import { courseProgress, dueLines, emptyCoursesProgress } from "@/lib/courses/progress";
import { buildPersonalCourse, candidateCourses, matchCourses, PERSONAL_BLURB, scorePct, type CourseMatch } from "@/lib/courses/personal";
import { loadCoursesProgress } from "@/lib/courses/storage";
import type { Course, CourseIndex, CourseSummary, CoursesProgress } from "@/lib/courses/types";
import { useImportedGames } from "./useImportedGames";

function setupFen(moves: string[]): string {
  try {
    return fenAfter(moves);
  } catch {
    return fenAfter([]);
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function CourseCard({ course, progress, now, played }: { course: CourseSummary; progress: CoursesProgress; now: number | null; played: boolean }) {
  const p = courseProgress(progress, course.id);
  const learned = Math.min(p.learned.length, course.lineCount);
  const due = now === null ? 0 : dueLines(p, now).length;
  return (
    <li>
      <Link className="cr-course" href={`/courses/${course.id}`}>
        <PositionPreview fen={setupFen(course.setup)} color={course.side} className="cr-course-board" />
        <div className="cr-course-body">
          {played && <span className="cr-badge">You play this</span>}
          <h3>{course.name}</h3>
          <p className="cr-muted">{course.blurb}</p>
          <p className="cr-setup">{numberedMoves(course.setup)}</p>
          <div className="cr-course-foot">
            <span>{learned}/{course.lineCount} lines learned</span>
            {due > 0 && <span className="cr-due">{due} due now</span>}
          </div>
          <div className="cr-bar"><span style={{ width: `${course.lineCount ? (learned / course.lineCount) * 100 : 0}%` }} /></div>
        </div>
      </Link>
    </li>
  );
}

/** The course library: every opening course, grouped by the colour you play. */
export function CoursesPage() {
  const [index, setIndex] = useState<CourseIndex | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState<CoursesProgress>(emptyCoursesProgress);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    const stored = loadCoursesProgress().progress;
    loadIndex().then(
      (idx) => {
        if (!live) return;
        setIndex(idx);
        setProgress(stored);
        setNow(Date.now());
      },
      (e: unknown) => {
        if (live) setError(e instanceof CourseLoadError ? e.message : "Something went wrong loading the courses.");
      },
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  const games = useImportedGames();
  const [matches, setMatches] = useState<CourseMatch[]>([]);
  // Only courses whose setup starts one of his games are loaded to check the full rule (his first two moves).
  useEffect(() => {
    if (!index || !games?.played.length) return;
    let live = true;
    const candidates = candidateCourses(index.courses, games.played);
    void Promise.all(candidates.map((c) => loadCourse(c.id).catch(() => null))).then((courses) => {
      if (live) setMatches(matchCourses(courses.filter((c): c is Course => c !== null), games.played));
    });
    return () => {
      live = false;
    };
  }, [index, games]);
  const own = useMemo(
    () => (games ? (["white", "black"] as const).map((c) => buildPersonalCourse(games.played, c)).filter((c): c is Course => c !== null) : []),
    [games],
  );

  const head = (
    <header>
      <h1>Opening courses</h1>
      <p className="cr-muted">Learn an opening one line at a time, then keep it fresh with practice, drills and a race against the clock.</p>
    </header>
  );

  if (!index)
    return (
      <section className="cr-page">
        {head}
        {error ? (
          <div className="cr-card" role="alert">
            <p>{error}</p>
            <div className="cr-actions">
              <button className="btn" onClick={() => { setError(""); setAttempt((a) => a + 1); }}>Try again</button>
            </div>
          </div>
        ) : (
          <p className="cr-muted" role="status">Loading courses…</p>
        )}
      </section>
    );

  const groups = [
    { side: "white" as const, title: "Play as White" },
    { side: "black" as const, title: "Play as Black" },
  ].map((g) => ({ ...g, courses: index.courses.filter((c) => c.side === g.side) }));

  return (
    <section className="cr-page">
      {head}
      {games && <FromYourGames index={index} games={games.played} matches={matches} own={own} />}
      {index.courses.length === 0 && <p className="cr-muted">No courses are available yet.</p>}
      {groups.map((g) =>
        g.courses.length ? (
          <section key={g.side} className="cr-group" aria-labelledby={`cr-${g.side}`}>
            <h2 id={`cr-${g.side}`}>{g.title}</h2>
            <ul className="cr-courses">
              {g.courses.map((c) => (
                <CourseCard key={c.id} course={c} progress={progress} now={now} played={matches.some((m) => m.id === c.id)} />
              ))}
            </ul>
          </section>
        ) : null,
      )}
      {index.source && <p className="cr-credit">{index.source}</p>}
    </section>
  );
}

/** The courses the learner already plays (from his imported games), and the two built from his own moves. */
function FromYourGames({ index, games, matches, own }: { index: CourseIndex; games: { color: string; points: number }[]; matches: CourseMatch[]; own: Course[] }) {
  if (!games.length)
    return (
      <p className="cr-muted cr-small">
        <Link className="cr-link" href="/games/insights">Connect your chess.com account</Link> to see which of these openings you already play.
      </p>
    );
  if (!matches.length && !own.length) return null;
  const name = (id: string) => index.courses.find((c) => c.id === id)?.name ?? id;
  return (
    <section className="cr-strip" aria-labelledby="cr-yours">
      <div>
        <h2 id="cr-yours">From your games</h2>
        <p className="cr-muted cr-small">From your imported chess.com games. Score counts a win as 1 and a draw as half.</p>
      </div>
      <ul className="cr-strip-list">
        {matches.map((m) => (
          <li key={m.id}>
            <Link className="cr-strip-item" href={`/courses/${m.id}`}>
              <strong>{name(m.id)}</strong>
              <span>{plural(m.games, "game")} · {m.score}% score</span>
            </Link>
          </li>
        ))}
        {own.map((c) => {
          const mine = games.filter((g) => g.color === c.side);
          return (
            <li key={c.id}>
              <Link className="cr-strip-item is-own" href={`/courses/${c.id}`}>
                <strong>{c.name}</strong>
                <span>{plural(c.lines.length, "line")} from {plural(mine.length, "game")} · {scorePct(mine.reduce((a, g) => a + g.points, 0), mine.length)}% score</span>
                <span>{PERSONAL_BLURB}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
