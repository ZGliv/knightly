"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconArrowLeft, IconPlayerSkipForward } from "@tabler/icons-react";
import { GameRetry } from "@/components/learning/GameRetry";
import { colorName } from "@/lib/chess/player";
import type { Decision, DecisionAnalysis, RetryAttempt } from "@/lib/learning/coach/model";
import type { InsightsSnapshot } from "@/lib/insights/pipeline";
import { leakToDecision, rankPuzzles } from "@/lib/insights/puzzles";
import { CATEGORY_COPY } from "@/lib/insights/report";
import type { ImportedGame, Leak } from "@/lib/insights/types";
import {
  gameDate,
  opponentOf,
  percent,
  plural,
  practiceQueue,
  readSetAside,
  writeSetAside,
  type PracticeFilter,
} from "@/components/insights/shared";

interface Current {
  leak: Leak;
  game: ImportedGame | null;
  decision: Decision | null;
  problem: string | null;
}

function setUp(leak: Leak, games: ImportedGame[]): Current {
  const game = games.find((item) => item.id === leak.gameId) ?? null;
  if (!game) return { leak, game, decision: null, problem: "The game for this position is no longer stored." };
  try {
    return { leak, game, decision: leakToDecision(leak, game), problem: null };
  } catch (e) {
    return { leak, game, decision: null, problem: e instanceof Error ? e.message : "This position could not be set up." };
  }
}

function reasonFor(leak: Leak, opponentName: string | null, date: string | null) {
  const from = opponentName ? ` against ${opponentName}${date ? ` on ${date}` : ""}` : "";
  return `In your game${from}, ${leak.playedSan} took your winning chances from ${percent(leak.winBefore)} to ${percent(leak.winAfter)}. ${CATEGORY_COPY[leak.category].meaning}`;
}

export function Practice({
  snapshot,
  filter,
  startId,
  onAttempt,
  onBusy,
  onClose,
  onShowAll,
}: {
  snapshot: InsightsSnapshot;
  filter: PracticeFilter | null;
  /** A specific position to open first ("Try this position"). */
  startId: string | null;
  onAttempt: (attempt: RetryAttempt) => void;
  onBusy: (busy: boolean) => void;
  onClose: () => void;
  onShowAll: () => void;
}) {
  const [setAside, setSetAside] = useState(readSetAside);
  const pool = useMemo(() => {
    const ids = filter ? new Set(filter.ids) : null;
    return snapshot.leaks.filter((leak) => (!ids || ids.has(leak.id)) && !setAside.has(leak.id));
  }, [snapshot.leaks, filter, setAside]);
  const [now, setNow] = useState(() => Date.now());
  const [seen, setSeen] = useState<string[]>([]);
  // The puzzle is fixed when it is chosen, so a snapshot reload never restarts a puzzle in progress.
  const [current, setCurrent] = useState<Current | null>(() => {
    const id = startId ?? rankPuzzles(pool, snapshot.attempts, Date.now())[0]?.id;
    const leak = id ? snapshot.leaks.find((item) => item.id === id) : undefined;
    return leak ? setUp(leak, snapshot.games) : null;
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const currentId = current?.leak.id ?? null;
  const remaining = useMemo(
    () => rankPuzzles(pool, snapshot.attempts, now).filter((leak) => leak.id !== currentId && !seen.includes(leak.id)),
    [pool, snapshot.attempts, now, currentId, seen],
  );

  // Positions ready outside this set, counted as the report's "Start practising" button counts them.
  const allReady = useMemo(
    () => (filter ? practiceQueue(snapshot.leaks, snapshot.attempts, setAside, now).length : 0),
    [filter, snapshot.leaks, snapshot.attempts, setAside, now],
  );

  function next() {
    const at = Date.now();
    const done = currentId ? [...seen, currentId] : seen;
    const upcoming = rankPuzzles(pool, snapshot.attempts, at).find((item) => !done.includes(item.id));
    setNow(at);
    setSeen(done);
    setCurrent(upcoming ? setUp(upcoming, snapshot.games) : null);
    headingRef.current?.focus();
  }

  const onAnalysis = useCallback((analysis: DecisionAnalysis) => {
    if (analysis.teachable) return;
    setSetAside((prior) => {
      const updated = new Set(prior).add(analysis.source.id);
      writeSetAside(updated);
      return updated;
    });
  }, []);

  const leak = current?.leak ?? null;
  const game = current?.game ?? null;
  const opponent = game ? opponentOf(game) : null;
  const date = game ? gameDate(game.endTime) : null;
  const reason = leak ? reasonFor(leak, opponent?.name ?? null, date) : "";

  return (
    <section className="insights-practice" aria-labelledby="insights-practice-title">
      <div className="insights-practice-head">
        <div>
          <p className="eyebrow">Fix your mistakes</p>
          <h2 id="insights-practice-title" ref={headingRef} tabIndex={-1}>
            {filter ? filter.label : "Positions from your games"}
          </h2>
          <p>
            Find a better move than the one you played. {remaining.length
              ? `${plural(remaining.length, "more position")} in this set after this one.`
              : leak
                ? "This is the last position in this set for now."
                : ""}
          </p>
        </div>
        <button type="button" className="btn secondary" onClick={onClose}>
          <IconArrowLeft size={15} aria-hidden="true" />
          Back to the report
        </button>
      </div>

      {leak && (
        <p className="insights-practice-context">
          <span>{leak.severity === "blunder" ? "Blunder" : "Mistake"}</span>
          <span>{CATEGORY_COPY[leak.category].label}</span>
          <span>As {colorName(leak.userColor)}</span>
          {opponent && <span>vs {opponent.name}</span>}
          {date && <span>{date}</span>}
        </p>
      )}

      {current?.decision && game ? (
        <div className="insights-practice-board">
          <GameRetry
            key={current.decision.id}
            source={current.decision}
            reason={reason}
            onAnalysis={onAnalysis}
            onAttempt={onAttempt}
            onBusy={onBusy}
            onNext={next}
            importedFrom={{ site: "chess.com", url: game.url }}
          />
        </div>
      ) : current?.problem ? (
        <div className="insights-card">
          <p className="insights-error" role="alert">
            {current.problem} Skip to the next position.
          </p>
        </div>
      ) : (
        <div className="insights-card insights-practice-done">
          <h3>That is every position in this set for now</h3>
          <p>
            Positions you solve without help come back for review after a day, then after three and
            seven days. Positions you have not solved yet stay in the queue.
          </p>
          <div className="insights-actions">
            <button type="button" className="btn" onClick={onClose}>
              Back to the report
            </button>
            {filter && allReady > 0 && (
              <button type="button" className="btn secondary" onClick={onShowAll}>
                Practise all your mistakes
              </button>
            )}
          </div>
        </div>
      )}

      {leak && (
        <div className="insights-actions">
          <button type="button" className="btn secondary" onClick={next}>
            <IconPlayerSkipForward size={15} aria-hidden="true" />
            {remaining.length ? "Skip to the next position" : "Finish this set"}
          </button>
        </div>
      )}
    </section>
  );
}
