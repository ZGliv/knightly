"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconRefresh, IconTarget, IconUserCircle } from "@tabler/icons-react";
import { useInsights, type ConnectOptions } from "@/hooks/useInsights";
import type { RetryAttempt } from "@/lib/learning/coach/model";
import { ActivityPanel } from "@/components/insights/ActivityPanel";
import { ConnectForm } from "@/components/insights/ConnectForm";
import { Practice } from "@/components/insights/Practice";
import { Report } from "@/components/insights/Report";
import {
  listTimeClasses,
  plural,
  practiceQueue,
  readSetAside,
  writeSetAside,
  type PracticeFilter,
} from "@/components/insights/shared";

interface PracticeSession {
  filter: PracticeFilter | null;
  startId: string | null;
  /** Remounts the practice view when a new set is chosen. */
  key: number;
}

/** GameRetry reports when its engine is busy; this page has nothing to block meanwhile. */
const ignoreBusy = () => {};

export function InsightsPage() {
  const insights = useInsights();
  const { snapshot, importState, analysisState, startAnalysis, stopAnalysis, recordAttempt } = insights;
  const [practice, setPractice] = useState<PracticeSession | null>(null);
  const [readyCount, setReadyCount] = useState<number | null>(null);
  const [setAside, setSetAside] = useState<ReadonlySet<string>>(() => new Set());
  // The time readyCount was worked out at; the report's practice buttons count what is due then.
  const [now, setNow] = useState<number | null>(null);
  const [resumeAfterPractice, setResumeAfterPractice] = useState(false);
  const sessionKey = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // The control that opened practice; focus goes back to it when practice closes.
  const returnFocus = useRef<HTMLElement | null>(null);

  // Once an account is linked, every visit checks chess.com for new games and carries on analysing
  // by itself. Once per page load; a name typed into the form this visit has just been imported.
  const synced = useRef(false);
  const linked = !!snapshot?.meta;
  const { refresh } = insights;
  useEffect(() => {
    if (synced.current || !linked) return;
    synced.current = true;
    // When chess.com cannot be reached, the games already here are still analysed.
    void refresh().then((ok) => {
      if (!ok) startAnalysis();
    });
  }, [linked, refresh, startAnalysis]);

  // A puzzle runs its own engine; background analysis waits so the device stays responsive.
  useEffect(() => {
    if (practice && analysisState.running) {
      stopAnalysis();
      queueMicrotask(() => setResumeAfterPractice(true));
    }
  }, [practice, analysisState.running, stopAnalysis]);

  // How many puzzles are due now. Worked out after render because it depends on the clock and on
  // the positions Practice set aside, which change without any attempt being recorded; so it is
  // worked out again whenever practice opens or closes, and every minute so solved positions
  // that fall due again show up on a page left open.
  const leaks = snapshot?.leaks;
  const attempts = snapshot?.attempts;
  const refreshDue = useCallback(() => {
    if (!leaks || !attempts) return;
    const aside = readSetAside();
    const at = Date.now();
    setSetAside(aside);
    setNow(at);
    setReadyCount(practiceQueue(leaks, attempts, aside, at).length);
  }, [leaks, attempts]);
  useEffect(() => {
    queueMicrotask(refreshDue);
    const timer = setInterval(refreshDue, 60_000);
    return () => clearInterval(timer);
  }, [refreshDue, practice]);

  // Back from practice: the report was only hidden, so focus returns to the button that opened it,
  // unless that button is gone or now disabled (closePractice has already counted what is due).
  useEffect(() => {
    if (practice) return;
    const target = returnFocus.current;
    returnFocus.current = null;
    if (!target) return;
    if (target.isConnected && !target.closest("[hidden]") && !target.matches(":disabled")) target.focus();
    else {
      headingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    }
  }, [practice]);

  const openPractice = useCallback((filter: PracticeFilter | null, startId: string | null = null) => {
    // Opening another set from inside practice keeps the original way back.
    if (!returnFocus.current) {
      const active = document.activeElement;
      returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : headingRef.current;
    }
    sessionKey.current++;
    setPractice({ filter, startId, key: sessionKey.current });
    window.scrollTo({ top: 0 });
  }, []);

  const closePractice = useCallback(() => {
    setPractice(null);
    // In the same render, so the report's buttons are already up to date when focus returns.
    refreshDue();
    if (resumeAfterPractice) {
      setResumeAfterPractice(false);
      startAnalysis();
    }
  }, [refreshDue, resumeAfterPractice, startAnalysis]);

  const onAttempt = useCallback(
    (attempt: RetryAttempt) => {
      void recordAttempt(attempt);
    },
    [recordAttempt],
  );

  const connect = (username: string, options: ConnectOptions) => {
    const known = snapshot?.meta?.username;
    if (
      known &&
      known.toLowerCase() !== username.toLowerCase() &&
      (snapshot?.games.length ?? 0) > 0 &&
      !confirm(
        `Switch to ${username}? This deletes ${known}'s ${plural(snapshot?.games.length ?? 0, "imported game")}, their analysis and your practice history from this browser.`,
      )
    )
      return;
    synced.current = true;
    void insights.connect(username, options);
  };

  const disconnect = async () => {
    const name = snapshot?.meta?.username ?? "this player";
    if (
      !confirm(
        `Delete ${name}'s ${plural(snapshot?.games.length ?? 0, "imported game")}, their analysis and your practice history from this browser? This cannot be undone.`,
      )
    )
      return;
    setResumeAfterPractice(false);
    setPractice(null);
    if (await insights.disconnect()) writeSetAside(new Set());
    // The button that was used is gone with the report; start again from the page heading.
    headingRef.current?.focus();
  };

  const meta = snapshot?.meta ?? null;
  const ready = insights.status === "ready" && snapshot;

  return (
    <section className="insights-page">
      <header className="page-heading insights-heading">
        <div>
          <p className="eyebrow">Your games · chess.com</p>
          <h1 ref={headingRef} tabIndex={-1}>
            Your leaks
          </h1>
          <p>
            {ready && meta
              ? `${meta.username} · ${plural(snapshot.games.length, "recent game")} (${listTimeClasses(meta.timeClasses)})`
              : "Find out where your own games slip away, from your recent chess.com games."}
          </p>
        </div>
      </header>

      {!insights.saved && insights.storageNote && (
        <p className="insights-callout" role="note">
          {insights.storageNote}
        </p>
      )}
      {insights.error && insights.status !== "error" && (
        <p className="insights-error" role="alert">
          {insights.error}
        </p>
      )}

      {insights.status === "loading" && (
        <p className="insights-empty" role="status">
          Opening your saved insights…
        </p>
      )}

      {insights.status === "error" && (
        <div className="insights-card" role="alert">
          <p className="insights-error">{insights.error}</p>
          <p className="insights-footnote">Reload the page to try again.</p>
        </div>
      )}

      {insights.status === "empty" && (
        <>
          <ConnectForm
            previous={importState.running ? null : meta}
            running={importState.running}
            error={importState.error}
            onSubmit={connect}
          />
          {importState.running && (
            <ActivityPanel
              importState={importState}
              analysisState={analysisState}
              pending={0}
              gamesTotal={0}
              practising={false}
              resumesAfterPractice={false}
              onCancelImport={insights.cancelImport}
              onPause={stopAnalysis}
              onResume={startAnalysis}
            />
          )}
        </>
      )}

      {ready && (
        <>
          <ActivityPanel
            importState={importState}
            analysisState={analysisState}
            pending={snapshot.pending}
            gamesTotal={snapshot.games.length}
            practising={!!practice}
            resumesAfterPractice={resumeAfterPractice}
            onCancelImport={insights.cancelImport}
            onPause={() => {
              setResumeAfterPractice(false);
              stopAnalysis();
            }}
            onResume={startAnalysis}
          />
          {!importState.running && importState.error && (
            <p className="insights-error" role="alert">
              {importState.error} Your games already imported are unchanged.
            </p>
          )}
          {!importState.running && importState.result && !practice && (
            <p className="insights-callout" role="status">
              {importState.result.added
                ? `Added ${plural(importState.result.added, "new game")}.`
                : "No new games since the last import."}
              {importState.result.skipped
                ? ` ${plural(importState.result.skipped, "game")} could not be used, such as Chess960 or games started from a set-up position.`
                : ""}
            </p>
          )}
          {snapshot.unreadable > 0 && !practice && (
            <p className="insights-callout">
              {plural(snapshot.unreadable, "game is", "games are")} left out of the report because
              {snapshot.unreadable === 1 ? " its" : " their"} saved analysis could not be read.
            </p>
          )}

          {practice && (
            <Practice
              key={practice.key}
              snapshot={snapshot}
              filter={practice.filter}
              startId={practice.startId}
              onAttempt={onAttempt}
              onBusy={ignoreBusy}
              onClose={closePractice}
              onShowAll={() => openPractice(null)}
            />
          )}
          {/* Only hidden during practice, so open sections and focus are still there on the way back.
              display: contents keeps the page grid's spacing; the hidden attribute still wins. */}
          <div hidden={!!practice} style={{ display: "contents" }}>
            {snapshot.leaks.length > 0 && (
              <section className="insights-practice-entry" aria-labelledby="insights-fix">
                <div>
                  <h2 id="insights-fix">Fix your mistakes</h2>
                  <p>
                    {readyCount === null
                      ? "Positions from your games, biggest mistakes first. Find the move you missed."
                      : readyCount
                        ? `${plural(readyCount, "position")} from your games ${readyCount === 1 ? "is" : "are"} ready to practise, biggest mistakes first. Find the move you missed.`
                        : "Nothing is due right now. Positions you solve without help come back for review after a day, then after three and seven days."}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn"
                  disabled={readyCount === 0}
                  onClick={() => openPractice(null)}
                >
                  <IconTarget size={16} aria-hidden="true" />
                  Start practising
                </button>
              </section>
            )}
            <Report
              snapshot={snapshot}
              setAside={setAside}
              now={now}
              onPractise={(filter) => openPractice(filter)}
              onTry={(leakId) => openPractice(null, leakId)}
            />
            <footer className="insights-footer">
              <div className="insights-actions">
                <button
                  type="button"
                  className="btn secondary"
                  disabled={importState.running}
                  onClick={() => void insights.refresh()}
                >
                  <IconRefresh size={15} aria-hidden="true" />
                  Check for new games
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={importState.running}
                  onClick={() => void disconnect()}
                >
                  <IconUserCircle size={15} aria-hidden="true" />
                  Use a different account
                </button>
              </div>
              <p>
                How these numbers are made: every position in every game is checked once by
                Stockfish 18, searching a fixed 150,000 positions per move, so the results are the
                same on any device. Mistakes are measured as the change in your winning chances.
                This is a quick scan, not a deep analysis, and a longer search may disagree about
                some moves. Games come from chess.com&rsquo;s public archive and stay in this
                browser.
              </p>
            </footer>
          </div>
        </>
      )}
    </section>
  );
}
