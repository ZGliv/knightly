"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Chess, type Square } from "chess.js";
import { IconArrowRight, IconFlag, IconPlayerPlay, IconRefresh } from "@tabler/icons-react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { useEngine } from "@/hooks/useEngine";
import { arenaElo, arenaStatus, buildBook, chooseBookReply, lineToLearn, orList, walkBook } from "@/lib/courses/arena";
import { lineLabels, moveLabel } from "@/lib/courses/line";
import { averageRating } from "@/lib/courses/personal";
import { estimateLevel, readAssistedGames, readTraining } from "@/lib/learning/adaptive-rating";
import { buildTree, positionKey, START_FEN } from "@/lib/openings/tree";
import { listGamesLocal } from "@/lib/storage/local-games";
import type { ModeProps } from "./modeTypes";
import { useImportedGames } from "./useImportedGames";

const REPLY_DELAY = 500;
const START_KEY = positionKey(START_FEN);

type Played = { san: string; uci: string; key: string };
type Phase = "ready" | "playing" | "over";
type Opponent = { elo: number; source: string };

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function replay(moves: Played[]): Chess {
  const chess = new Chess();
  for (const m of moves) chess.move(m.san);
  return chess;
}

/** Appends a UCI move; null when it is illegal. */
function push(moves: Played[], uci: string): Played[] | null {
  const chess = replay(moves);
  try {
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" });
    return [...moves, { san: move.san, uci: move.from + move.to + (move.promotion ?? ""), key: positionKey(move.after) }];
  } catch {
    return null;
  }
}

/** Reads Play's difficulty settings; call from event handlers only. */
function chooseOpponent(importedRating: number | null): Opponent {
  let manual: number | null = null;
  let estimated: number | null = null;
  try {
    const settings = readTraining();
    if (settings.mode === "manual") manual = settings.manualElo ?? null;
    else {
      const level = estimateLevel(listGamesLocal(), readAssistedGames(), settings.seed);
      if (level.evidence.length) estimated = level.opponent;
    }
  } catch {
    // Unreadable settings: fall through to the next source.
  }
  const elo = arenaElo({ manual, estimated, imported: importedRating });
  const source =
    manual !== null ? "the difficulty you chose on Play"
    : estimated !== null ? "your results on Play"
    : importedRating !== null ? "your chess.com rating"
    : "a typical club player";
  return { elo, source };
}

function resultText(chess: Chess, side: "white" | "black"): string | null {
  if (chess.isCheckmate()) return (chess.turn() === "w" ? "black" : "white") === side ? "You won by checkmate." : "You lost by checkmate.";
  if (chess.isStalemate()) return "Draw by stalemate (the side to move has no legal move but is not in check).";
  if (chess.isThreefoldRepetition()) return "Draw by repetition.";
  if (chess.isInsufficientMaterial()) return "Draw: neither side has enough pieces left to checkmate.";
  if (chess.isDraw()) return "Draw by the 50-move rule.";
  return null;
}

/**
 * Plays the opening as a real game. While both sides follow the course the opponent picks among
 * the course's replies (weighted like the learner's real opponents); once either side leaves it,
 * the same human-like engine opponent as Play takes over at the learner's level.
 */
export function ArenaMode({ course, steps, hrefFor }: ModeProps) {
  const side = course.side;
  const engine = useEngine();
  const games = useImportedGames();
  const book = useMemo(() => buildBook(course, steps), [course, steps]);
  const tree = useMemo(() => (games?.raw.length ? buildTree(games.raw, side, 40) : null), [games, side]);
  const [phase, setPhase] = useState<Phase>("ready");
  const [moves, setMoves] = useState<Played[]>([]);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const token = useRef(0);
  const movesRef = useRef<Played[]>([]);
  const opponentRef = useRef<Opponent | null>(null);

  const chess = useMemo(() => replay(moves), [moves]);
  const keys = useMemo(() => [START_KEY, ...moves.map((m) => m.key)], [moves]);
  const sans = moves.map((m) => m.san);
  const walk = walkBook(book, keys, sans, side);
  const myTurn = (chess.turn() === "w") === (side === "white");
  const over = phase === "over" || chess.isGameOver();

  function commit(next: Played[]) {
    movesRef.current = next;
    setMoves(next);
    if (replay(next).isGameOver()) setPhase("over");
  }

  async function respond(list: Played[], ticket: number) {
    const position = replay(list);
    if (position.isGameOver()) return;
    const listKeys = [START_KEY, ...list.map((m) => m.key)];
    const state = walkBook(book, listKeys, list.map((m) => m.san), side);
    setThinking(true);
    setError("");
    try {
      if (!state.leave) {
        await wait(REPLY_DELAY);
        if (ticket !== token.current) return;
        const key = listKeys.at(-1)!;
        const reply = chooseBookReply(book.get(key)!, tree?.nodes[key]);
        commit(push(list, reply.uci)!);
        return;
      }
      const result = await engine.analyze(position.fen(), { elo: opponentRef.current?.elo ?? arenaElo({ manual: null, estimated: null, imported: null }) }, list.map((m) => m.uci));
      if (ticket !== token.current) return;
      const next = push(list, result.bestMove);
      if (!next) throw new Error("The opponent suggested a move that isn’t legal here.");
      commit(next);
    } catch (e) {
      if (ticket === token.current) setError((e as Error).message || "The opponent couldn’t move.");
    } finally {
      if (ticket === token.current) setThinking(false);
    }
  }

  function start() {
    const ticket = ++token.current;
    const picked = chooseOpponent(averageRating(games?.played.filter((g) => g.color === side) ?? []));
    opponentRef.current = picked;
    setOpponent(picked);
    movesRef.current = [];
    setMoves([]);
    setError("");
    setThinking(false);
    setPhase("playing");
    if (side === "black") void respond([], ticket);
  }

  function end() {
    token.current++;
    setThinking(false);
    setPhase("over");
  }

  const canPlay = phase === "playing" && !over && myTurn && !thinking;
  const targets = (from: string) => chess.moves({ square: from as Square, verbose: true }).map((m) => m.to);

  async function move(from: string, to: string, promotion?: string) {
    if (!canPlay) return false;
    const next = push(movesRef.current, from + to + (promotion ?? ""));
    if (!next) return false;
    commit(next);
    if (!replay(next).isGameOver()) void respond(next, token.current);
    return true;
  }

  if (phase === "ready")
    return (
      <div className="cr-card cr-empty">
        <h2>Play this opening as a real game</h2>
        <p className="cr-muted">
          You play {side === "white" ? "White" : "Black"} from the first move. While you both stay in the course, your opponent picks one of the course’s replies
          {tree ? ", choosing the ones your own opponents play most often" : ""}. Once either of you leaves the course, a computer opponent at your level takes over and the game goes on to a result.
        </p>
        <div className="cr-actions">
          <button className="btn" onClick={start} disabled={games === null}>
            <IconPlayerPlay size={16} /> Start a game
          </button>
        </div>
      </div>
    );

  const lastLeave = walk.leave;
  const status = arenaStatus(walk);
  const yourBookMoves = sans.slice(0, walk.bookPlies).filter((_, i) => (i % 2 === 0) === (side === "white")).length;
  const learnId = lineToLearn(book, walk, keys);
  const learnLine = learnId ? course.lines.find((l) => l.id === learnId) : null;
  const outOfBook = lastLeave !== null;
  const opponentTurn = phase === "playing" && !over && !myTurn;

  const leaveSummary = !lastLeave
    ? "The game never left the course."
    : lastLeave.by === "end"
      ? `You both followed the course to its last move, ${moveLabel(lastLeave.ply - 1, sans[lastLeave.ply - 1])}.`
      : lastLeave.by === "you"
        ? `You left the course with ${moveLabel(lastLeave.ply, lastLeave.played!)}. The course plays ${orList(lastLeave.course.map((m) => m.san))} there.`
        : `Your opponent left the course with ${moveLabel(lastLeave.ply, lastLeave.played!)}.`;

  let prompt: string;
  if (error) prompt = error;
  else if (opponentTurn)
    prompt = thinking
      ? outOfBook && engine.humanStatus === "loading" ? "Loading your opponent. The first time takes a moment…" : "Your opponent is thinking…"
      : "Your opponent’s turn.";
  else prompt = "Your move.";

  return (
    <div className="cr-runner">
      <div className="cr-board">
        <ChessBoard
          fen={chess.fen()}
          playerColor={side}
          activeColor={chess.turn() === "w" ? "white" : "black"}
          canInteract={canPlay}
          getLegalTargets={targets}
          isMoveLegal={(from, to) => canPlay && targets(from).includes(to as Square)}
          lastMove={moves.at(-1)?.uci}
          onMove={move}
        />
        <ol className="cr-moves" aria-label="Moves so far">
          {moves.map((m, i) => (
            <li key={i} className={(i % 2 === 0) === (side === "white") ? "is-mine" : ""}>
              {i % 2 === 0 && <span>{i / 2 + 1}.</span>}
              {m.san}
            </li>
          ))}
        </ol>
      </div>
      <aside className="cr-side">
        {over ? (
          <section className="cr-card cr-summary" aria-labelledby="cr-arena-summary" role="status">
            <h2 id="cr-arena-summary">Game summary</h2>
            <p><strong>{resultText(chess, side) ?? "You ended the game before a result."}</strong></p>
            <p>
              The game lasted {Math.ceil(moves.length / 2)} move{Math.ceil(moves.length / 2) === 1 ? "" : "s"}. You played {yourBookMoves} of your moves from the course.
            </p>
            <p>{leaveSummary}</p>
            <div className="cr-actions">
              {learnLine && (
                <Link className="btn" href={`${hrefFor("learn")}&line=${encodeURIComponent(learnLine.id)}`}>
                  Learn this line: {lineLabels(course.lines).get(learnLine.id) ?? learnLine.name} <IconArrowRight size={16} />
                </Link>
              )}
              <button className="btn secondary" onClick={start}>
                <IconPlayerPlay size={16} /> Play again
              </button>
            </div>
          </section>
        ) : (
          <>
            <p className="cr-status">{status}</p>
            <p className="cr-muted cr-small">
              {outOfBook
                ? `Opponent: a human-like engine at about ${opponent?.elo} Elo, set from ${opponent?.source}.`
                : "Opponent: the course’s replies."}
            </p>
            <div className={`cr-coach${error ? " is-mistake" : ""}`} role="status" aria-live="polite">
              <p className="cr-coach-prompt">{prompt}</p>
            </div>
            <div className="cr-actions">
              <button className="btn secondary" onClick={end}>
                <IconFlag size={16} /> End game
              </button>
              {error && opponentTurn && (
                engine.status === "ready" ? (
                  <button className="btn" onClick={() => void respond(movesRef.current, token.current)}>
                    <IconRefresh size={16} /> Try the opponent’s move again
                  </button>
                ) : (
                  <button className="btn" onClick={engine.restart} disabled={engine.status === "loading"}>
                    <IconRefresh size={16} /> Restart the engine
                  </button>
                )
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
