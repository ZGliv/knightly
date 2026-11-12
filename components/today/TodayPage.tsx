"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IconArrowRight, IconCheck, IconFlame, IconTarget } from "@tabler/icons-react";
import { practiceQueue, readSetAside } from "@/components/insights/shared";
import { loadSnapshot } from "@/lib/insights/pipeline";
import { MIN_ANALYSED_FOR_HEADLINES } from "@/lib/insights/report";
import { openInsightsStore } from "@/lib/insights/store";
import { guessesOn, loadRecord } from "@/lib/masters/storage";
import { loadRepertoire } from "@/lib/openings/storage";
import { loadProgress } from "@/lib/puzzles/storage";
import { listGamesLocal } from "@/lib/storage/local-games";
import { localDay } from "@/lib/today/day";
import { recommendFor, type Recommendation } from "@/lib/today/focus";
import { buildSession, stepsDone, STREAK_STEPS, type SessionInput, type Step } from "@/lib/today/session";
import { loadTodayRecord, markDay, saveTodayRecord, streakLength } from "@/lib/today/streak";

type Focus =
  | { kind: "unlinked" }
  | { kind: "waiting"; analysed: number; needed: number }
  | { kind: "no-pattern"; analysed: number }
  | { kind: "headline"; title: string; advice: string; recommendation: Recommendation };

interface Day {
  dateLabel: string;
  steps: Step[];
  streak: number;
  focus: Focus;
}

/** Your leaks data for the session and the focus card. Null leaks when no account is linked. */
async function readInsights(now: number): Promise<{ leaks: SessionInput["leaks"]; focus: Focus }> {
  try {
    const store = await openInsightsStore();
    try {
      const snapshot = await loadSnapshot(store);
      if (!snapshot.meta) return { leaks: null, focus: { kind: "unlinked" } };
      const { report } = snapshot;
      const top = report.headlines[0];
      const focus: Focus = top
        ? { kind: "headline", title: top.title, advice: top.advice, recommendation: recommendFor(top.key) }
        : report.analysed < MIN_ANALYSED_FOR_HEADLINES
          ? { kind: "waiting", analysed: report.analysed, needed: MIN_ANALYSED_FOR_HEADLINES }
          : { kind: "no-pattern", analysed: report.analysed };
      return {
        leaks: {
          ready: practiceQueue(snapshot.leaks, snapshot.attempts, readSetAside(), now).length,
          pending: snapshot.pending,
          attempts: snapshot.attempts,
        },
        focus,
      };
    } finally {
      store.close();
    }
  } catch {
    // No IndexedDB (private mode, old browser): treat as not linked; Your leaks explains the problem.
    return { leaks: null, focus: { kind: "unlinked" } };
  }
}

function playedGames(): SessionInput["playedGames"] {
  try {
    return listGamesLocal();
  } catch {
    // An unreadable library is reported (with recovery tools) on Your games.
    return [];
  }
}

async function readDay(): Promise<Day> {
  const now = Date.now();
  const today = localDay(now);
  const insights = await readInsights(now);
  const repertoire = loadRepertoire();
  const steps = buildSession(
    {
      puzzleAttempts: loadProgress().progress.attempts,
      leaks: insights.leaks,
      repertoire: { prepared: Object.keys(repertoire.moves).length, reviews: Object.values(repertoire.reviews).flat() },
      masterGuessesToday: guessesOn(loadRecord(), today),
      playedGames: playedGames(),
    },
    now,
  );
  let record = loadTodayRecord();
  if (stepsDone(steps) >= STREAK_STEPS) {
    const marked = markDay(record, today);
    if (marked !== record) saveTodayRecord(marked);
    record = marked;
  }
  return {
    dateLabel: new Date(now).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }),
    steps,
    streak: streakLength(record, today),
    focus: insights.focus,
  };
}

export function TodayPage() {
  const [day, setDay] = useState<Day | null>(null);

  useEffect(() => {
    let live = true;
    void readDay().then((d) => {
      if (live) setDay(d);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!day)
    return (
      <section className="today-page">
        <h1>Today</h1>
        <p className="today-muted" role="status">Loading your session…</p>
      </section>
    );

  const done = stepsDone(day.steps);
  const toStreak = Math.max(0, STREAK_STEPS - done);
  return (
    <section className="today-page">
      <header className="today-head">
        <div>
          <p className="today-date">{day.dateLabel}</p>
          <h1>Today</h1>
          <p className="today-muted">
            Five short steps, in order. Finish {STREAK_STEPS} to keep your streak going.
          </p>
        </div>
        <p className="today-streak">
          <IconFlame size={22} stroke={1.7} aria-hidden />
          <strong>{day.streak}</strong>
          <span>day streak</span>
        </p>
      </header>

      <div className="today-summary">
        <p>
          <strong>{done} of {day.steps.length}</strong> done today
          {toStreak > 0
            ? ` · ${toStreak} more for today to count towards your streak`
            : " · today counts towards your streak"}
        </p>
        <div className="today-bar" aria-hidden>
          <span style={{ width: `${(done / day.steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="today-layout">
        <ol className="today-steps" aria-label="Today's session">
          {day.steps.map((step, i) => (
            <li key={step.id} className={step.complete ? "is-done" : ""}>
              <span className="today-marker" aria-hidden>
                {step.complete ? <IconCheck size={16} stroke={2.4} /> : i + 1}
              </span>
              <div className="today-step-body">
                <h2>
                  {step.title}
                  {step.complete && <span className="sr-only"> (done)</span>}
                </h2>
                <p>{step.reason}</p>
                {step.goal > 1 && (
                  <div className="today-step-progress">
                    <div className="today-bar is-small" aria-hidden>
                      <span style={{ width: `${Math.min(1, step.done / step.goal) * 100}%` }} />
                    </div>
                    <span>
                      {Math.min(step.done, step.goal)} of {step.goal} today
                    </span>
                  </div>
                )}
              </div>
              <Link href={step.href} className={`btn ${step.complete ? "secondary" : ""} today-go`}>
                {step.complete ? "Do more" : step.action}
                <IconArrowRight size={15} aria-hidden />
              </Link>
            </li>
          ))}
        </ol>

        <aside className="today-focus" aria-labelledby="today-focus-title">
          <p className="today-eyebrow">
            <IconTarget size={15} stroke={1.8} aria-hidden /> Your focus
          </p>
          <FocusCard focus={day.focus} />
        </aside>
      </div>
    </section>
  );
}

function FocusCard({ focus }: { focus: Focus }) {
  if (focus.kind === "headline")
    return (
      <>
        <h2 id="today-focus-title">{focus.title}</h2>
        <p>{focus.advice}</p>
        <div className="today-recommendation">
          <p>{focus.recommendation.text}</p>
          {focus.recommendation.href && (
            <Link href={focus.recommendation.href} className="btn">
              {focus.recommendation.action}
              <IconArrowRight size={15} aria-hidden />
            </Link>
          )}
        </div>
        <Link href="/games/insights" className="subtle-link">
          See all your leaks
        </Link>
      </>
    );
  if (focus.kind === "unlinked")
    return (
      <>
        <h2 id="today-focus-title">Find your biggest leak</h2>
        <p>
          Link your chess.com account and Knightly analyses your recent games, then shows here the one kind of
          mistake costing you the most, with what to practise.
        </p>
        <Link href="/games/insights" className="btn">
          Link chess.com <IconArrowRight size={15} aria-hidden />
        </Link>
      </>
    );
  if (focus.kind === "waiting")
    return (
      <>
        <h2 id="today-focus-title">Your games are being analysed</h2>
        <p>
          {focus.analysed} of the {focus.needed} games needed are analysed. Analysis runs while Your leaks is open;
          your focus shows here once it has enough.
        </p>
        <Link href="/games/insights" className="btn">
          Open Your leaks <IconArrowRight size={15} aria-hidden />
        </Link>
      </>
    );
  return (
    <>
      <h2 id="today-focus-title">No single leak stands out</h2>
      <p>
        Across {focus.analysed} analysed games no one kind of mistake costs you clearly more than the rest. Keep
        practising the positions in Your leaks.
      </p>
      <Link href="/games/insights" className="btn">
        Open Your leaks <IconArrowRight size={15} aria-hidden />
      </Link>
    </>
  );
}
