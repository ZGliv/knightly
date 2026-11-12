"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { StockfishClient } from "@/lib/engine/stockfish-client";
import { winPercent } from "@/lib/insights/winprob";
import { whiteEvaluation } from "@/lib/learning/coach/model";
import { AUTO_PLY, fullName, guessCount, opponentName, type MasterGame } from "@/lib/masters/games";
import {
  COMPARE_NODES,
  MAX_POINTS_PER_MOVE,
  VERDICT_TEXT,
  formatLine,
  scoreOf,
  tally,
  toUci,
  uciLineToSan,
  verdictForGap,
  type Verdict,
} from "@/lib/masters/grade";
import { STRUCTURES } from "@/lib/masters/structure";
import { recordFinish, recordGuess, saveRecord, type MastersRecord } from "@/lib/masters/storage";
import { localDay } from "@/lib/today/day";

const OPENING_DELAY = 450;
const REPLY_DELAY = 750;

interface Feedback {
  ply: number;
  fenBefore: string;
  proUci: string;
  proSan: string;
  /** Null when the user asked to see the move. */
  userUci: string | null;
  userSan: string | null;
  verdict: Verdict | null;
  proWin: number | null;
  userWin: number | null;
  lineUci: string[];
  lineSan: string[];
  error: string | null;
}

type CoachState = { ply: number; status: "loading" | "done" | "error"; text: string };

interface Props {
  game: MasterGame;
  record: MastersRecord;
  coachAvailable: boolean;
  onRecord: (record: MastersRecord) => void;
  onBack: () => void;
  onRestart: () => void;
}

export function GuessTheMove({ game, record, coachAvailable, onRecord, onBack, onRestart }: Props) {
  // Every position and move of the game, worked out once.
  const positions = useMemo(() => {
    const chess = new Chess();
    const fens = [chess.fen()];
    const uci: string[] = [];
    for (const san of game.moves) {
      uci.push(toUci(chess.move(san)));
      fens.push(chess.fen());
    }
    return { fens, uci };
  }, [game]);

  const total = game.moves.length;
  const proTurnAt = (ply: number) => (ply % 2 === 0 ? "white" : "black") === game.proSide;
  const [ply, setPly] = useState(0);
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [checking, setChecking] = useState(false);
  const [preview, setPreview] = useState<{ fen: string; move: string } | null>(null);
  const [coach, setCoach] = useState<CoachState | null>(null);
  const engine = useRef<StockfishClient | null>(null);
  const token = useRef(0);
  const saved = useRef(false);
  // The newest record, so a guess saved while the engine was thinking is not lost by the next save.
  const latest = useRef(record);
  useEffect(() => {
    latest.current = record;
  }, [record]);

  const done = ply >= total;
  const needsAuto = !done && !checking && (ply < AUTO_PLY || !proTurnAt(ply));
  const userTurn = !done && !checking && !needsAuto;
  const asked = guessCount(game);
  const answered = verdicts.length;
  const score = scoreOf(verdicts);

  // One engine for this game; it is stopped when the player leaves.
  useEffect(() => {
    const current = token;
    return () => {
      current.current++;
      engine.current?.terminate();
      engine.current = null;
    };
  }, []);

  // Opening moves and the opponent's replies play themselves.
  useEffect(() => {
    if (!needsAuto) return;
    const timer = setTimeout(() => setPly((p) => p + 1), ply < AUTO_PLY ? OPENING_DELAY : REPLY_DELAY);
    return () => clearTimeout(timer);
  }, [needsAuto, ply]);

  // Saves the finished game once.
  useEffect(() => {
    if (!done || saved.current) return;
    saved.current = true;
    const next = recordFinish(
      latest.current,
      game.id,
      { score, max: asked * MAX_POINTS_PER_MOVE, tally: tally(verdicts) },
      new Date().toISOString(),
    );
    latest.current = next;
    saveRecord(next);
    queueMicrotask(() => onRecord(next));
  }, [done, game.id, score, asked, verdicts, onRecord]);

  const client = () => (engine.current ??= new StockfishClient());

  async function judge(userUci: string | null) {
    const at = ply;
    const id = ++token.current;
    const fenBefore = positions.fens[at];
    const proUci = positions.uci[at];
    const proSan = game.moves[at];
    const matched = userUci === proUci;
    const userChess = new Chess(fenBefore);
    const userSan = userUci
      ? userChess.move({ from: userUci.slice(0, 2), to: userUci.slice(2, 4), promotion: userUci[4] }).san
      : null;
    setChecking(true);
    setCoach(null);
    setPreview(userUci && !matched ? { fen: userChess.fen(), move: userUci } : null);
    setFeedback({
      ply: at,
      fenBefore,
      proUci,
      proSan,
      userUci,
      userSan,
      verdict: matched ? "matched" : userUci ? null : "shown",
      proWin: null,
      userWin: null,
      lineUci: [],
      lineSan: [],
      error: null,
    });
    try {
      const history = positions.uci.slice(0, at);
      const proChess = new Chess(positions.fens[at + 1]);
      const proResult = await client().analyzePosition(proChess.fen(), 20, [...history, proUci], {
        nodes: COMPARE_NODES,
      });
      const proWin = winPercent(whiteEvaluation(proChess, proResult), game.proSide);
      let userWin: number | null = null;
      if (userUci && !matched) {
        const userResult = await client().analyzePosition(userChess.fen(), 20, [...history, userUci], {
          nodes: COMPARE_NODES,
        });
        userWin = winPercent(whiteEvaluation(userChess, userResult), game.proSide);
      }
      if (id !== token.current) return;
      const verdict: Verdict = matched ? "matched" : userUci ? verdictForGap(proWin, userWin!) : "shown";
      setVerdicts((v) => [...v, verdict]);
      if (userUci) {
        // Counted per day for the daily session on /today.
        const counted = recordGuess(latest.current, localDay(Date.now()));
        latest.current = counted;
        saveRecord(counted);
        onRecord(counted);
      }
      setFeedback((f) =>
        f && {
          ...f,
          verdict,
          proWin,
          userWin,
          lineUci: proResult.pv.slice(0, 8),
          lineSan: uciLineToSan(proChess.fen(), proResult.pv, 8),
        },
      );
      setPreview(null);
      setChecking(false);
      setPly(at + 1);
    } catch {
      if (id !== token.current) return;
      engine.current?.terminate();
      engine.current = null;
      setPreview(null);
      setChecking(false);
      setFeedback((f) =>
        f && { ...f, verdict: null, error: "The engine stopped before it could compare the moves." },
      );
    }
  }

  async function onMove(from: string, to: string, promotion?: string) {
    if (!userTurn) return false;
    const chess = new Chess(positions.fens[ply]);
    let move;
    try {
      move = chess.move({ from, to, promotion });
    } catch {
      return false;
    }
    void judge(toUci(move));
    return true;
  }

  async function explain(f: Feedback) {
    setCoach({ ply: f.ply, status: "loading", text: "" });
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fen: f.fenBefore,
          proMove: f.proUci,
          userMove: f.userUci ?? f.proUci,
          proWin: f.proWin,
          userWin: f.userWin ?? f.proWin,
          proLine: f.lineUci.slice(0, f.lineSan.length),
          tags: game.tags,
          white: fullName(game.white),
          black: fullName(game.black),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { explanation?: string; error?: string };
      setCoach((c) =>
        c?.ply === f.ply
          ? res.ok && data.explanation
            ? { ply: f.ply, status: "done", text: data.explanation }
            : { ply: f.ply, status: "error", text: data.error ?? "The coach is unavailable right now." }
          : c,
      );
    } catch {
      setCoach((c) => (c?.ply === f.ply ? { ply: f.ply, status: "error", text: "The coach could not be reached." } : c));
    }
  }

  const chessNow = useMemo(() => new Chess(positions.fens[Math.min(ply, total)]), [positions, ply, total]);
  const boardFen = preview?.fen ?? positions.fens[Math.min(ply, total)];
  const lastMove = preview?.move ?? (ply > 0 ? positions.uci[ply - 1] : undefined);
  const turnColor = chessNow.turn() === "w" ? "white" : "black";
  const targets = (square: string) =>
    chessNow.moves({ square: square as Square, verbose: true }).map((m) => m.to as string);
  const group = game.tags.length ? game.tags.map((t) => STRUCTURES[t].name).join(" · ") : STRUCTURES.mixed.name;
  const moveNo = Math.floor(ply / 2) + 1;
  const counts = tally(verdicts);
  const max = asked * MAX_POINTS_PER_MOVE;
  const best = record.games[game.id]?.best;

  let status: string;
  if (done) status = "Game over";
  else if (checking) status = "Comparing with the game move…";
  else if (ply < AUTO_PLY) status = `Playing the opening… move ${moveNo} of 8`;
  else if (needsAuto) status = `${fullName(opponentName(game))} is replying…`;
  else status = `Your move as ${game.proSide === "white" ? "White" : "Black"}: what did ${game.pro.split(" ")[0]} play here?`;

  return (
    <section className="masters-play">
      <div className="masters-play-top">
        <button type="button" className="masters-link" onClick={onBack}>
          ← All games
        </button>
        <p className="masters-play-title">
          <strong>
            {fullName(game.white)} – {fullName(game.black)}
          </strong>
          <span>
            {game.event} · {game.opening || "Opening not recorded"}
          </span>
          <span>{group}</span>
        </p>
      </div>

      <div className="masters-play-grid">
        <div className="masters-board">
          <ChessBoard
            fen={boardFen}
            playerColor={game.proSide}
            activeColor={turnColor}
            orientation={game.proSide}
            canInteract={userTurn}
            isMoveLegal={(from, to) => userTurn && targets(from).includes(to)}
            getLegalTargets={targets}
            lastMove={lastMove}
            onMove={onMove}
          />
        </div>

        <aside className="masters-panel" aria-live="polite">
          <div className="masters-score">
            <div>
              <span className="masters-score-label">Score</span>
              <strong>
                {score} <small>/ {answered * MAX_POINTS_PER_MOVE}</small>
              </strong>
            </div>
            <div>
              <span className="masters-score-label">Moves guessed</span>
              <strong>
                {answered} <small>/ {asked}</small>
              </strong>
            </div>
          </div>

          <p className="masters-status">{status}</p>

          {userTurn && (
            <button type="button" className="masters-button ghost" onClick={() => void judge(null)}>
              Show me the move
            </button>
          )}

          {feedback && (
            <FeedbackCard
              feedback={feedback}
              pro={game.pro}
              coachAvailable={coachAvailable}
              coach={coach?.ply === feedback.ply ? coach : null}
              onExplain={() => void explain(feedback)}
              onRetry={() => void judge(feedback.userUci)}
              busy={checking}
            />
          )}

          {done && (
            <div className="masters-summary">
              <h2>Game complete</h2>
              <p className="masters-summary-score">
                {score} / {max} points
                {best !== undefined && <span> · best {Math.max(best, score)}</span>}
              </p>
              <dl>
                <div>
                  <dt>Matched</dt>
                  <dd>{counts.matched}</dd>
                </div>
                <div>
                  <dt>As good</dt>
                  <dd>{counts.asGood}</dd>
                </div>
                <div>
                  <dt>Playable</dt>
                  <dd>{counts.playable}</dd>
                </div>
                <div>
                  <dt>Worse</dt>
                  <dd>{counts.worse}</dd>
                </div>
              </dl>
              {counts.shown > 0 && <p className="masters-muted">{counts.shown} shown without a guess.</p>}
              <div className="masters-actions">
                <button type="button" className="masters-button" onClick={onRestart}>
                  Play again
                </button>
                <button type="button" className="masters-button ghost" onClick={onBack}>
                  Choose another game
                </button>
              </div>
            </div>
          )}

          <p className="masters-muted masters-scoring">
            Scoring: the pro&apos;s move 3, as good 2, playable 1. Moves are compared by Stockfish at a fixed{" "}
            {COMPARE_NODES.toLocaleString("en-US")} nodes.
          </p>
        </aside>
      </div>
    </section>
  );
}

function FeedbackCard({
  feedback: f,
  pro,
  coachAvailable,
  coach,
  onExplain,
  onRetry,
  busy,
}: {
  feedback: Feedback;
  pro: string;
  coachAvailable: boolean;
  coach: CoachState | null;
  onExplain: () => void;
  onRetry: () => void;
  busy: boolean;
}) {
  const tone = f.verdict === "matched" || f.verdict === "as-good" ? "good" : f.verdict === "playable" ? "ok" : f.verdict ? "bad" : "";
  const line = f.lineSan.length ? formatLine(f.fenBefore, [f.proSan, ...f.lineSan]) : null;
  return (
    <div className={`masters-feedback ${tone}`}>
      <p className="masters-verdict">{f.verdict ? VERDICT_TEXT[f.verdict] : f.error ? "Not scored yet" : "Checking…"}</p>
      <p>
        {pro.split(" ")[0]} played <strong>{f.proSan}</strong>
        {f.userSan && f.verdict !== "matched" && (
          <>
            ; you played <strong>{f.userSan}</strong>
          </>
        )}
        .
      </p>
      {f.proWin !== null && (
        <p className="masters-muted">
          Winning chances after the game move {Math.round(f.proWin)}%
          {f.userWin !== null && <> · after yours {Math.round(f.userWin)}%</>}
        </p>
      )}
      {line && (
        <p className="masters-line">
          <span>Engine line</span> {line}
        </p>
      )}
      {f.error && (
        <p className="masters-error" role="alert">
          {f.error}{" "}
          <button type="button" className="masters-link" onClick={onRetry} disabled={busy}>
            Try again
          </button>
        </p>
      )}
      {coachAvailable && f.verdict && !f.error && (
        <div className="masters-coach">
          {!coach && (
            <button type="button" className="masters-button ghost small" onClick={onExplain}>
              Why this move?
            </button>
          )}
          {coach?.status === "loading" && <p className="masters-muted">Asking the coach…</p>}
          {coach?.status === "done" && <p>{coach.text}</p>}
          {coach?.status === "error" && (
            <p className="masters-error">
              {coach.text}{" "}
              <button type="button" className="masters-link" onClick={onExplain}>
                Try again
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
