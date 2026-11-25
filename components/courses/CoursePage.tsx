"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { replayLine, type LineStep } from "@/lib/courses/line";
import { CourseLoadError, loadCourse } from "@/lib/courses/load";
import { courseProgress, emptyCoursesProgress, withCourse } from "@/lib/courses/progress";
import { loadCoursesProgress, saveCoursesProgress } from "@/lib/courses/storage";
import type { Course, CourseProgress, CoursesProgress } from "@/lib/courses/types";
import { modeById, modesFor } from "./modes";
import { YourGamesPanel } from "./YourGamesPanel";

/** One opening course: header, mode tabs and the active mode. The mode comes from ?mode=. */
export function CoursePage({ id }: { id: string }) {
  const params = useSearchParams();
  const requestedMode = params.get("mode");
  const requestedLine = params.get("line");
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<CourseLoadError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [all, setAll] = useState<CoursesProgress>(emptyCoursesProgress);
  const [ready, setReady] = useState(false);
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    let live = true;
    const stored = loadCoursesProgress();
    loadCourse(id).then(
      (c) => {
        if (!live) return;
        setCourse(c);
        setAll(stored.progress);
        setStorageOk(stored.available);
        setReady(true);
        document.title = `${c.name} | Knightly`;
      },
      (e: unknown) => {
        if (live) setError(e instanceof CourseLoadError ? e : new CourseLoadError("Something went wrong loading this course."));
      },
    );
    return () => {
      live = false;
    };
  }, [id, attempt]);

  // Progress is saved after every change once it has been loaded.
  useEffect(() => {
    if (ready && !saveCoursesProgress(all)) queueMicrotask(() => setStorageOk(false));
  }, [all, ready]);

  const steps = useMemo(() => new Map<string, LineStep[]>(course?.lines.map((l) => [l.id, replayLine(l.moves)]) ?? []), [course]);

  if (!course)
    return (
      <section className="cr-page">
        <Link className="cr-back" href="/courses"><IconArrowLeft size={16} /> All courses</Link>
        {error ? (
          <div className="cr-card cr-empty" role="alert">
            <h1>{error.notFound ? "Course not found" : "Couldn’t load this course"}</h1>
            <p className="cr-muted">{error.message}</p>
            {!error.notFound && (
              <div className="cr-actions">
                <button className="btn" onClick={() => { setError(null); setAttempt((a) => a + 1); }}>Try again</button>
              </div>
            )}
          </div>
        ) : (
          <p className="cr-muted" role="status">Loading course…</p>
        )}
      </section>
    );

  const progress = courseProgress(all, course.id);
  const update = (change: (p: CourseProgress) => CourseProgress) =>
    setAll((prev) => withCourse(prev, course.id, change(courseProgress(prev, course.id))));
  const hrefFor = (m: string) => `/courses/${course.id}?mode=${m}`;
  const learned = course.lines.filter((l) => progress.learned.includes(l.id)).length;
  const total = course.lines.length;
  const mode = modeById(requestedMode, course);
  const Mode = mode.Component;

  return (
    <section className="cr-page cr-course-page">
      <header className="cr-top">
        <Link className="cr-top-back" href="/courses" aria-label="All courses"><IconArrowLeft size={18} /></Link>
        <h1>{course.name}</h1>
        <span className="cr-top-meta" aria-label={`You play ${course.side}. ${learned} of ${total} lines learned`}>
          <span className={`cr-side-dot is-${course.side}`} aria-hidden />
          {course.side === "white" ? "White" : "Black"} · <strong>{learned}</strong>/{total}<span className="cr-top-wide"> learned</span>
        </span>
      </header>
      <nav className="cr-modes" aria-label="Training mode">
        {modesFor(course).map((m) => (
          <Link key={m.id} href={hrefFor(m.id)} replace scroll={false} aria-current={m.id === mode.id ? "page" : undefined} title={m.blurb}>
            {m.label}
          </Link>
        ))}
      </nav>
      {ready && <Mode key={`${mode.id}-${requestedLine ?? ""}`} course={course} steps={steps} progress={progress} update={update} hrefFor={hrefFor} />}
      {!storageOk && <p className="cr-note" role="status">This browser isn’t saving progress, so your learned lines reset when you leave.</p>}
      <details className="cr-card cr-about">
        <summary><h2>About this course</h2></summary>
        <p className="cr-muted">{course.blurb}</p>
        <p className="cr-define">
          A <strong>line</strong> is one sequence of moves from the start of the game. You play your side’s moves; the board plays your opponent’s.
        </p>
        <p className="cr-define"><strong>{mode.label}:</strong> {mode.blurb}</p>
        <div className="cr-meter" aria-hidden>
          <div className="cr-bar"><span style={{ width: `${total ? (learned / total) * 100 : 0}%` }} /></div>
        </div>
      </details>
      {ready && <YourGamesPanel course={course} steps={steps} learnHref={(lineId) => `${hrefFor("learn")}&line=${encodeURIComponent(lineId)}`} />}
    </section>
  );
}
