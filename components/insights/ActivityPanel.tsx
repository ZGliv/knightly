"use client";
import { IconPlayerPause, IconPlayerPlay, IconX } from "@tabler/icons-react";
import type { AnalysisState, ImportState } from "@/hooks/useInsights";
import { analysisProgress, monthName, plural, timeLeftText } from "@/components/insights/shared";

/** Import and analysis progress, plus the offer to carry on analysing. Renders nothing when idle. */
export function ActivityPanel({
  importState,
  analysisState,
  pending,
  gamesTotal,
  practising,
  resumesAfterPractice,
  onCancelImport,
  onPause,
  onResume,
}: {
  importState: ImportState;
  analysisState: AnalysisState;
  /** Stored games still waiting for analysis. */
  pending: number;
  /** Every stored game, analysed or not, so progress reads as the whole import. */
  gamesTotal: number;
  practising: boolean;
  /** Analysis was stopped for practice and starts again when practice closes. */
  resumesAfterPractice: boolean;
  onCancelImport: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  if (importState.running) {
    return (
      <section className="insights-activity panel" aria-labelledby="insights-import-title">
        <div className="insights-activity-head">
          <div>
            <h2 id="insights-import-title">Fetching your games from chess.com</h2>
            <p role="status" aria-live="polite">
              {importState.month
                ? `Reading ${monthName(importState.month)} · ${plural(importState.found, "game")} found so far`
                : "Asking chess.com for your game archive…"}
            </p>
          </div>
          <button className="btn secondary" type="button" onClick={onCancelImport}>
            <IconX size={15} aria-hidden="true" />
            Cancel
          </button>
        </div>
        <span className="insights-progress insights-progress-indeterminate" aria-hidden="true">
          <span />
        </span>
      </section>
    );
  }

  const { running, done, total, failed, error, etaSeconds, workers } = analysisState;
  if (running) {
    // A run only covers the games still waiting when it started; show progress over the whole import.
    const { overall, analysed, finished, value } = analysisProgress(gamesTotal, pending, { total, done, failed });
    return (
      <section className="insights-activity panel" aria-labelledby="insights-analysis-title">
        <div className="insights-activity-head">
          <div>
            <h2 id="insights-analysis-title">Analysing your games</h2>
            <p role="status" aria-live="polite">
              {total ? `${analysed} of ${overall} games analysed` : "Starting the engine…"}
            </p>
          </div>
          <button className="btn secondary" type="button" onClick={onPause}>
            <IconPlayerPause size={15} aria-hidden="true" />
            Pause
          </button>
        </div>
        <div
          className="insights-progress"
          role="progressbar"
          aria-label="Games analysed"
          aria-valuemin={0}
          aria-valuemax={overall || 1}
          aria-valuenow={finished}
          aria-valuetext={`${analysed} of ${overall} games analysed`}
        >
          <span style={{ width: `${value}%` }} />
        </div>
        <p className="insights-activity-note">
          {timeLeftText(etaSeconds)} · {workers > 1 ? `${workers} engines` : "1 engine"} running on
          this device. The report below updates as each game finishes. Leaving this page pauses the
          analysis; it carries on by itself when you come back.
        </p>
      </section>
    );
  }

  const failedNote =
    failed > 0 && !error
      ? `${plural(failed, "game")} could not be analysed this time. ${failed === 1 ? "It" : "They"} will be tried again next time.`
      : null;

  if (pending > 0) {
    if (practising) {
      return resumesAfterPractice ? (
        <p className="insights-callout" role="status">
          Analysis is paused while you practise, so the puzzle engine has this device to itself.{" "}
          {plural(pending, "game")} still to analyse; it carries on when you go back to the report.
        </p>
      ) : (
        <p className="insights-callout" role="status">
          {plural(pending, "game")} still to analyse. Analysis is not running; press Continue
          analysing when you go back to the report.
        </p>
      );
    }
    return (
      <section className="insights-activity panel" aria-labelledby="insights-paused-title">
        <div className="insights-activity-head">
          <div>
            <h2 id="insights-paused-title">
              {plural(pending, "game")} waiting to be analysed
            </h2>
            <p>
              Analysis pauses when you leave this page or press Pause. Games already analysed are
              saved.
            </p>
          </div>
          <button className="btn" type="button" onClick={onResume}>
            <IconPlayerPlay size={15} aria-hidden="true" />
            Continue analysing
          </button>
        </div>
        {error && (
          <p className="insights-error" role="alert">
            {error}
          </p>
        )}
        {failedNote && <p className="insights-activity-note">{failedNote}</p>}
      </section>
    );
  }

  if (error || failedNote) {
    return (
      <p className={error ? "insights-error" : "insights-callout"} role={error ? "alert" : "status"}>
        {error ?? failedNote}
      </p>
    );
  }
  return null;
}
