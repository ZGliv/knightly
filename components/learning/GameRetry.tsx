"use client";
import { markGameAssisted } from "@/lib/learning/adaptive-rating";
import { getGameLocal } from "@/lib/storage/local-games";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { colorName, moveLabel } from "@/lib/chess/player";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { useEngine } from "@/hooks/useEngine";
import {
  teachingForAnalysis,
  applyUci,
  decisionBoard,
  evaluationLabel,
  inspectDecision,
  inspectRetry,
  moveConsequence,
  retryHint,
  uci,
  type Decision,
  type DecisionAnalysis,
  type RetryAttempt,
} from "@/lib/learning/coach/model";

type Props = {
  source: Decision;
  reason: string;
  onAnalysis: (value: DecisionAnalysis) => void;
  onAttempt: (value: RetryAttempt) => void;
  onBusy: (busy: boolean) => void;
  onNext: () => void;
  /** For games imported from another site: links there instead of the in-app review. */
  importedFrom?: { site: string; url: string };
};
export function GameRetry({
  source,
  reason,
  onAnalysis,
  onAttempt,
  onBusy,
  onNext,
  importedFrom,
}: Props) {
  const engine = useEngine();
  const [analysis, setAnalysis] = useState<DecisionAnalysis | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [fen, setFen] = useState(source.fenBefore);
  const [notation, setNotation] = useState("");
  const [hints, setHints] = useState(0);
  const [misses, setMisses] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [reply, setReply] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  // Keyed per decision, so this only says whether this visit saved an attempt.
  const [recorded, setRecorded] = useState(false);
  const [boardVersion, setBoardVersion] = useState(0);
  const [lineIndex, setLineIndex] = useState(-1);
  const [view, setView] = useState<"retry" | "original" | "better">("retry");
  const token = useRef(0);
  const flight = useRef(false);
  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);
  useEffect(() => {
    if (engine.status !== "ready") {
      if (engine.status === "error")
        queueMicrotask(() => {
          setBusy(false);
          flight.current = false;
        });
      return;
    }
    const current = ++token.current;
    flight.current = true;
    queueMicrotask(() => {
      setBusy(true);
      setError("");
      setFeedback("");
      setReply([]);
    });
    Promise.resolve().then(() => {
      if (getGameLocal(source.gameId)?.result === "*") markGameAssisted(source.gameId);
      return inspectDecision(source, engine.analyze, () => current === token.current);
    })
      .then((result) => {
        if (current !== token.current) return;
        setAnalysis(result);
        onAnalysis(result);
        setFen(source.fenBefore);
        setDone(false);
        setShowComparison(!result.teachable);
        setView("retry");
        if (!result.teachable)
          setFeedback(
            "This fresh search no longer shows a clear improvement to practice here. We’ve removed it from the retry queue. Choose another decision instead of chasing search noise.",
          );
      })
      .catch((e) => {
        if (current === token.current) setError((e as Error).message);
      })
      .finally(() => {
        if (current === token.current) {
          flight.current = false;
          setBusy(false);
        }
      });
    // Invalidate the latest retry too, not only the initial analysis request.
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Invalidate the current flight, including retries started after setup.
      token.current++;
    };
  }, [engine.status, engine.analyze, source, onAnalysis]);
  const canPlay =
    !busy &&
    !error &&
    engine.status === "ready" &&
    !!analysis?.teachable &&
    !done &&
    view === "retry";
  const chess = new Chess(fen);
  const targets = (from: string) =>
    chess.moves({ square: from as Square, verbose: true }).map((m) => m.to);
  function record(
    outcome: RetryAttempt["outcome"],
    triedSan: string,
    triedUci: string,
    loss: number | null,
    evaluation: RetryAttempt["evaluation"],
    usedHints = hints,
    usedMisses = misses,
  ) {
    setRecorded(true);
    onAttempt({
      id: crypto.randomUUID(),
      decisionId: source.id,
      gameId: source.gameId,
      playerColor: source.playerColor,
      ply: source.ply,
      fenBefore: source.fenBefore,
      playedUci: source.playedUci,
      at: new Date().toISOString(),
      triedSan,
      triedUci,
      hints: usedHints,
      misses: usedMisses,
      outcome,
      loss,
      evaluation,
    });
  }
  async function move(from: string, to: string, promotion = "q") {
    if (!canPlay || !analysis || flight.current) return false;
    let moveUci: string;
    try {
      moveUci = uci(decisionBoard(source).move({ from, to, promotion }));
    } catch {
      setFeedback(
        "That move isn’t legal. Tap your piece to see legal destinations.",
      );
      return false;
    }
    flight.current = true;
    const current = ++token.current;
    setBusy(true);
    setError("");
    setFeedback("Checking your move and the opponent’s strongest reply…");
    try {
      const result = await inspectRetry(analysis, moveUci, engine.analyze);
      if (token.current !== current) return false;
      setReply(result.line);
      if (result.uncertain) {
        setFeedback(
          "The searches disagree about a forced mate, so this attempt is ungraded.",
        );
        setError(
          "Recheck the reference position before trying again. No result has been recorded for this disagreement.",
        );
        return false;
      }
      if (result.accepted) {
        setFen(result.fen);
        setDone(true);
        setShowComparison(true);
        setFeedback(
          `${moveConsequence(source.fenBefore, moveUci, source.playerColor)} ${result.referenceMatch ? "You found the engine’s move." : "Your move works as an alternative."}`,
        );
        record(
          hints || misses ? "supported" : "independent",
          result.san,
          moveUci,
          result.loss,
          result.evaluation,
        );
        return true;
      }
      const nextMisses = misses + 1;
      setMisses(nextMisses);
      setBoardVersion((v) => v + 1);
      setFeedback(
        `${result.line[0] ? moveConsequence(result.fen, result.line[0], source.playerColor) + " " : "This move misses a stronger continuation. "}The board is reset so you can try another move.`,
      );
      record(
        "not-yet",
        result.san,
        moveUci,
        result.loss,
        result.evaluation,
        hints,
        nextMisses,
      );
      return false;
    } catch (e) {
      if (token.current === current) {
        setError((e as Error).message);
        setFeedback(
          "The engine could not finish this attempt. No result was recorded.",
        );
      }
      return false;
    } finally {
      if (token.current === current) {
        flight.current = false;
        setBusy(false);
      }
    }
  }
  function walkthrough() {
    if (!analysis || busy || done || flight.current) return;
    setHints(3);
    setDone(true);
    setShowComparison(true);
    setView("better");
    setLineIndex(0);
    const board = decisionBoard(source);
    applyUci(board, analysis.bestUci);
    setFen(board.fen());
    setFeedback(
      `The engine suggests ${analysis.bestSan}. Step through its line and compare it with what happened after ${source.playedSan}. This walkthrough is recorded as not yet.`,
    );
    record("not-yet", analysis.bestSan, analysis.bestUci, null, null, 3);
  }
  function showLine(mode: "original" | "better", index = 0) {
    if (!analysis) return;
    const board = decisionBoard(source);
    if (mode === "original") {
      applyUci(board, source.playedUci);
      analysis.playedLine.slice(0, index).forEach((san) => board.move(san));
    } else
      analysis.bestLine.slice(0, index + 1).forEach((san) => board.move(san));
    setFen(board.fen());
    setView(mode);
    setLineIndex(index);
    setBoardVersion((v) => v + 1);
  }
  const lineLength =
    view === "original"
      ? (analysis?.playedLine.length ?? 0) + 1
      : (analysis?.bestLine.length ?? 0);
  return (
    <section className="space-y-3 md:space-y-4">
      <div>
        <p className="text-xs font-medium text-emerald-300">
          Your game · move {moveLabel(source.ply)} ·{" "}
          {colorName(source.playerColor)} to move
        </p>
        <h2 className="mt-2 text-xl font-semibold md:text-2xl">
          You played {source.playedSan}. Try a different move.
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Choose a stronger move.
        </p>
        <p className="mt-2 hidden text-xs leading-5 text-zinc-400 md:block">
          {reason}
        </p>
      </div>
      <ChessBoard
        key={`${source.id}-${boardVersion}-${view}`}
        fen={fen}
        playerColor={source.playerColor}
        activeColor={chess.turn() === "w" ? "white" : "black"}
        canInteract={canPlay}
        getLegalTargets={targets}
        isMoveLegal={(from, to) =>
          canPlay && targets(from).includes(to as Square)
        }
        onMove={move}
      />
      {busy && (
        <p role="status" className="text-sm text-emerald-300">
          {analysis
            ? "Checking your choice…"
            : engine.status === "loading"
              ? "Loading Stockfish…"
              : "Rechecking the decision from your game…"}
        </p>
      )}
      {(error || engine.error) && (
        <div role="alert" className="panel space-y-3 text-sm text-amber-200">
          <p>{error || engine.error}</p>
          <button className="btn secondary" onClick={engine.restart}>
            Retry coach engine
          </button>
        </div>
      )}
      {canPlay && (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const board = decisionBoard(source);
            const candidate = board
              .moves({ verbose: true })
              .find(
                (m) =>
                  m.san.toLowerCase() === notation.trim().toLowerCase() ||
                  uci(m) === notation.trim().toLowerCase(),
              );
            if (!candidate) {
              setFeedback(
                "Enter a legal SAN move or coordinates, such as Nf3 or g1f3.",
              );
              return;
            }
            setNotation("");
            void move(candidate.from, candidate.to, candidate.promotion);
          }}
        >
          <input
            className="field min-w-0 flex-1"
            aria-label="Your retry move"
            placeholder="Or type your move"
            value={notation}
            onChange={(event) => setNotation(event.target.value)}
          />
          <button className="btn secondary">Check move</button>
        </form>
      )}
      <div aria-live="polite" className="space-y-3">
        {feedback && (
          <p className="text-sm leading-6 text-zinc-200">{feedback}</p>
        )}
        {hints > 0 && !done && analysis && (
          <div className="panel border-amber-400/25">
            <p className="text-xs font-semibold text-amber-200">
              Help step {hints} of 2
            </p>
            <p className="mt-2 text-sm leading-6">
              {retryHint(analysis, hints)}
            </p>
          </div>
        )}
        {reply.length > 0 && !done && (
          <p className="text-xs leading-5 text-zinc-400">
            Engine continuation after your try: {reply.join(" → ")}. This is one
            searched line, not a forced sequence unless mate is reported.
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {canPlay && (
          <>
            <button
              className="btn secondary"
              disabled={hints >= 2}
              onClick={() => setHints((value) => Math.min(2, value + 1))}
            >
              {hints ? "More help" : "A small hint"}
            </button>
            <button className="btn secondary" onClick={walkthrough}>
              Walk me through it
            </button>
          </>
        )}
        {(done || (analysis && !analysis.teachable)) && (
          <button className="btn" disabled={busy} onClick={onNext}>
            Next decision
          </button>
        )}
        {canPlay && (
          <button
            className="btn secondary"
            onClick={() => {
              record("not-yet", "", "", null, null);
              setDone(true);
              setShowComparison(true);
              setFeedback(
                "Set aside for now. It will stay in your practice history as not yet.",
              );
            }}
          >
            Set aside
          </button>
        )}
      </div>
      {showComparison && analysis && (
        <section className="panel space-y-4 border-emerald-400/25">
          <h3 className="font-semibold">What changes on the board?</h3>
          <p className="text-sm leading-6 text-zinc-300">
            {teachingForAnalysis(analysis).principle}
          </p>
          <Link
            className="inline-block text-sm text-emerald-300 underline"
            // An imported game is not in the saved-game library, so the lesson cannot lead back to it.
            href={`/learn/foundations?lesson=${teachingForAnalysis(analysis).lesson}&color=${source.playerColor}${importedFrom ? "" : `&game=${encodeURIComponent(source.gameId)}`}`}
          >
            Study this idea
          </Link>
          {recorded && (
            <p className="text-xs leading-5 text-zinc-400">
              {importedFrom
                ? "Attempt recorded."
                : "Attempt saved. Revisit in 15 minutes with support, or at least a day after an independent solve."}
            </p>
          )}
          <div className="space-y-3 text-sm leading-6">
            <p>
              <strong>Your game: {source.playedSan}.</strong>{" "}
              {analysis.playedLine[0]
                ? moveConsequence(
                    source.fenAfter,
                    analysis.playedLine[0],
                    source.playerColor,
                  )
                : moveConsequence(
                    source.fenBefore,
                    source.playedUci,
                    source.playerColor,
                  )}{" "}
              Evaluation {evaluationLabel(analysis.before, source.playerColor)}{" "}
              → {evaluationLabel(analysis.after, source.playerColor)}.
              {analysis.playedLine[0]
                ? ` Stockfish’s reply is ${analysis.playedLine[0]}.`
                : ""}
            </p>
            <p>
              <strong>Engine idea: {analysis.bestSan}.</strong>{" "}
              {moveConsequence(
                source.fenBefore,
                analysis.bestUci,
                source.playerColor,
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn secondary"
              onClick={() => showLine("original")}
            >
              Show original move
            </button>
            <button
              className="btn secondary"
              onClick={() => showLine("better")}
            >
              Show engine line
            </button>
          </div>
          {view !== "retry" && (
            <div className="space-y-2">
              <p className="text-sm text-emerald-200">
                {view === "original"
                  ? [source.playedSan, ...analysis.playedLine]
                      .slice(0, lineIndex + 1)
                      .join(" → ")
                  : analysis.bestLine.slice(0, lineIndex + 1).join(" → ")}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn secondary"
                  disabled={lineIndex <= 0}
                  onClick={() => showLine(view, lineIndex - 1)}
                >
                  Previous in line
                </button>
                <button
                  className="btn secondary"
                  disabled={lineIndex + 1 >= lineLength}
                  onClick={() => showLine(view, lineIndex + 1)}
                >
                  Next in line
                </button>
              </div>
            </div>
          )}
          <details className="text-xs leading-5 text-zinc-400">
            <summary>Analysis details</summary>
            <p>
              Stockfish 18, 500 ms per search, minimum depth {analysis.depth}. A
              deeper search may change the evaluation.
            </p>
          </details>
        </section>
      )}
      <details className="text-xs leading-5 text-zinc-400">
        <summary className="cursor-pointer font-medium text-zinc-200">
          Why this decision?
        </summary>
        <p className="mt-2">{reason}</p>
        <p className="mt-2">
          {source.opening} · {new Date(source.date).toLocaleDateString()} · move{" "}
          {moveLabel(source.ply)} as {colorName(source.playerColor)} from your
          {importedFrom ? ` game on ${importedFrom.site}.` : " saved game."}
        </p>
        <p className="mt-2 break-all">
          Before-move position: {source.fenBefore}
        </p>
        {importedFrom ? (
          <a
            className="mt-2 inline-block underline"
            href={importedFrom.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the original game on {importedFrom.site}
          </a>
        ) : (
          <Link
            className="mt-2 inline-block underline"
            href={`/review/${source.gameId}`}
          >
            Open the original game
          </Link>
        )}
      </details>
    </section>
  );
}
