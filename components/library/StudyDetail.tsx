"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBookmark,
  IconBookmarkFilled,
  IconChevronLeft,
  IconChevronRight,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconCheck,
  IconRepeat,
  IconRefresh,
} from "@tabler/icons-react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { PositionPreview } from "./PositionPreview";
import {
  COLLECTIONS,
  OPENINGS,
  openingPositions,
  openingLines,
  type OpeningLine,
  readSavedItems,
  toggleSavedItem,
  type OpeningStudy,
} from "@/lib/library/catalog";
import { LESSONS } from "@/lib/learning/curriculum";
import { CONCEPTS, outcomeLabel, studyProgress } from "@/lib/learning/study";
import { readAttempts, type Attempt } from "@/lib/learning/progress";

import { browseHref, readBrowseState } from "@/lib/library/browse";

const NOTES_KEY = "knightly_library_notes_v1";
export function StudyDetail({ id }: { id: string }) {
  const collection = COLLECTIONS.find((item) => item.id === id),
    opening = OPENINGS.find((item) => item.id === id);
  const item = collection ?? opening!;
  const [libraryHref, setLibraryHref] = useState("/study");
  const [saved, setSaved] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [note, setNote] = useState("");
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    queueMicrotask(() => {
      setLibraryHref(browseHref(readBrowseState(new URLSearchParams(location.search).get("library") ?? "")));
      try {
        setSaved(readSavedItems().includes(id));
        setAttempts(readAttempts());
        const notes = JSON.parse(localStorage.getItem(NOTES_KEY) ?? "{}");
        if (
          !notes ||
          Array.isArray(notes) ||
          typeof notes !== "object" ||
          Object.values(notes).some((value) => typeof value !== "string")
        )
          throw Error("Notes could not be read. Existing data is unchanged.");
        setNote(notes[id] ?? "");
      } catch (e) {
        setError((e as Error).message);
      }
      setLoadedId(id);
    });
  }, [id]);
  const progress = studyProgress(attempts);
  function saveNote() {
    try {
      const prior = JSON.parse(localStorage.getItem(NOTES_KEY) ?? "{}");
      if (
        !prior ||
        Array.isArray(prior) ||
        typeof prior !== "object" ||
        Object.values(prior).some((value) => typeof value !== "string")
      )
        throw Error("Notes could not be read. Existing data is unchanged.");
      localStorage.setItem(NOTES_KEY, JSON.stringify({ ...prior, [id]: note }));
      setNotice("Note saved in this browser.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="study-detail">
      <Link className="subtle-link mb-6" href={libraryHref}>
        <IconArrowLeft size={16} />
        Library
      </Link>
      <header className="page-heading">
        <div>
          <span className="small-label mb-2">
            {collection
              ? `${collection.category} collection`
              : `Opening study · Play as ${opening!.side}`}
          </span>
          <h1>{item.title}</h1>
          <p>{item.description}</p>
        </div>
        <button
          className="icon-button study-bookmark"
          aria-label={saved ? "Unsave study" : "Save study"}
          title={saved ? "Unsave study" : "Save study"}
          aria-pressed={saved}
          onClick={() => {
            try {
              setSaved(toggleSavedItem(id).includes(id));
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          {saved ? (
            <IconBookmarkFilled size={17} />
          ) : (
            <IconBookmark size={17} />
          )}
        </button>
      </header>
      {error && (
        <p role="alert" className="panel mb-5">
          {error}
        </p>
      )}
      {opening ? (
        <OpeningExplorer key={opening.id} opening={opening} />
      ) : (
        <div className="collection-layout">
          <div>
            <div className="collection-intro">
              <PositionPreview fen={collection!.fen} />
              <div>
                <h2>What you’ll work on</h2>
                <p>{collection!.detail}</p>
                <ul>
                  {collection!.takeaways.map((text) => (
                    <li key={text}>
                      <IconCheck size={16} />
                      {text}
                    </li>
                  ))}
                </ul>
                <Link
                  className="btn"
                  href={`/learn/foundations?lesson=${collection!.lessonIds.find((lesson) => !progress.latest.has(lesson)) ?? collection!.lessonIds[0]}`}
                >
                  Start collection
                  <IconArrowRight size={16} />
                </Link>
              </div>
            </div>
            <div className="section-heading mt-8">
              <h2>Lessons</h2>
              <p>
                {
                  collection!.lessonIds.filter((lesson) =>
                    progress.latest.has(lesson),
                  ).length
                }{" "}
                of {collection!.lessonIds.length} tried
              </p>
            </div>
            <ol className="collection-lessons">
              {collection!.lessonIds.map((lessonId, index) => {
                const lesson = LESSONS.find((l) => l.id === lessonId)!;
                return (
                  <li key={lessonId}>
                    <Link
                      href={`/learn/foundations?lesson=${lessonId}&color=${progress.latest.get(lessonId)?.playerColor ?? "white"}${progress.transfer.has(lessonId) ? "&stage=transfer" : ""}`}
                    >
                      <span>{index + 1}</span>
                      <div>
                        <h3>{CONCEPTS[lessonId].title}</h3>
                        <p>{outcomeLabel(progress.latest.get(lessonId))}</p>
                      </div>
                      <PositionPreview fen={lesson.fen} />
                      <IconArrowRight size={18} />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
          <aside className="collection-aside">
            <h2>How to use this collection</h2>
            <p>
              Read the idea, make your decision, then try the different position
              when one is offered.
            </p>
            <p>
              Use a hint when you need one. Your next practice visit will
              remember the support you used.
            </p>
            <Link href="/learn" className="subtle-link">
              Practice from your games
              <IconArrowRight size={16} />
            </Link>
          </aside>
        </div>
      )}
      <section className="study-notes">
        <div>
          <h2>Your notes</h2>
          <p>Keep a plan or a question to bring to your next game.</p>
        </div>
        <div>
          <textarea
            aria-label="Your study notes"
            disabled={loadedId !== id}
            value={note}
            maxLength={5000}
            placeholder="For example: finish development before pushing another pawn…"
            onChange={(event) => {
              setNote(event.target.value);
              setNotice("");
            }}
          />
          <div className="flex items-center gap-4 mt-3">
            <button className="btn secondary" onClick={saveNote} disabled={loadedId !== id}>
              Save note
            </button>
            {notice && <p role="status">{notice}</p>}
          </div>
        </div>
      </section>
      <div className="section-heading mt-10">
        <h2>Keep exploring</h2>
        <Link href="/study" className="subtle-link">
          Browse library
          <IconArrowRight size={16} />
        </Link>
      </div>
      <div className="related-studies">
        {COLLECTIONS.filter((c) => c.id !== id)
          .slice(0, 3)
          .map((c) => (
            <Link key={c.id} href={`/study/${c.id}`}>
              <PositionPreview fen={c.fen} />
              <div>
                <span className="small-label">{c.category}</span>
                <h3>{c.title}</h3>
                <p>{c.lessonIds.length} lessons</p>
              </div>
              <IconArrowRight size={17} />
            </Link>
          ))}
      </div>
    </section>
  );
}
function OpeningExplorer({ opening }: { opening: OpeningStudy }) {
  const lines = openingLines(opening);
  const [lineId, setLineId] = useState("main");
  const line = lines.find((item) => item.id === lineId) ?? lines[0];
  return (
    <>
      <OpeningLineExplorer key={line.id} opening={opening} line={line} />
      {lines.length > 1 && (
        <button className="subtle-link opening-next-example" onClick={() => {
          const next = lines[(lines.findIndex((item) => item.id === line.id) + 1) % lines.length];
          setLineId(next.id);
        }}>
          Next example: {lines[(lines.findIndex((item) => item.id === line.id) + 1) % lines.length].title}
          <IconArrowRight size={16} />
        </button>
      )}
    </>
  );
}
function OpeningLineExplorer({
  opening,
  line,
}: {
  opening: OpeningStudy;
  line: OpeningLine;
}) {
  const positions = useMemo(() => openingPositions(line), [line]);
  const side = opening.side === "White" ? "white" : "black";
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"read" | "practice">("read");
  const [orientation, setOrientation] = useState<"white" | "black">(side);
  const [boardVersion, setBoardVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [notation, setNotation] = useState("");
  const [help, setHelp] = useState(false);
  const board = new Chess(positions[step]);
  const done = step === line.moves.length;
  const targets = (from: string) =>
    board
      .moves({ square: from as Square, verbose: true })
      .map((move) => move.to);
  function startPractice() {
    setMode("practice");
    setStep(side === "black" ? 1 : 0);
    setMessage("");
    setHelp(false);
    setNotation("");
  }
  async function move(from: string, to: string, promotion = "q") {
    if (mode !== "practice" || done) return false;
    const candidate = new Chess(positions[step]);
    let san: string;
    try {
      san = candidate.move({ from, to, promotion }).san;
    } catch {
      return false;
    }
    if (san !== line.moves[step]) {
      setBoardVersion((value) => value + 1);
      setMessage(
        `${san} is legal, but this example continues with a different move. Try again or reveal it.`,
      );
      return false;
    }
    let next = step + 1;
    if (next < line.moves.length) next++;
    setStep(next);
    setHelp(false);
    setMessage(
      next === line.moves.length
        ? "Example line completed. Try it again, or return to the explanation."
        : `${san} follows the line. Your opponent’s reply is on the board.`,
    );
    return true;
  }
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (
        mode !== "read" ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (event.target as HTMLElement).tagName,
        )
      )
        return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setStep((value) => Math.min(line.moves.length, value + 1));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setStep((value) => Math.max(0, value - 1));
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [mode, line.moves.length]);
  return (
    <div className="opening-layout">
      <div className="opening-board-column">
        <div className="board-player">
          <span>{orientation === "white" ? "Black" : "White"}</span>
          <span>
            {mode === "practice" ? "Example reply" : "Opening position"}
          </span>
        </div>
        <ChessBoard
          key={`${opening.id}-${mode}-${step}-${boardVersion}`}
          fen={positions[step]}
          playerColor={side}
          orientation={orientation}
          activeColor={board.turn() === "w" ? "white" : "black"}
          canInteract={mode === "practice" && !done}
          getLegalTargets={targets}
          isMoveLegal={(from, to) => targets(from).includes(to as Square)}
          onMove={move}
        />
        <div className="board-navigation">
          <button
            className="icon-button"
            aria-label="First position"
            disabled={mode === "practice" || step === 0}
            onClick={() => setStep(0)}
          >
            <IconPlayerSkipBack size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Previous position"
            disabled={mode === "practice" || step === 0}
            onClick={() => setStep((value) => value - 1)}
          >
            <IconChevronLeft size={20} />
          </button>
          <span>
            {step === 0
              ? "Starting position"
              : `${Math.ceil(step / 2)}${step % 2 ? "." : "…"} ${line.moves[step - 1]}`}
          </span>
          <button
            className="icon-button"
            aria-label="Next position"
            disabled={mode === "practice" || done}
            onClick={() => setStep((value) => value + 1)}
          >
            <IconChevronRight size={20} />
          </button>
          <button
            className="icon-button"
            aria-label="Last position"
            disabled={mode === "practice" || done}
            onClick={() => setStep(line.moves.length)}
          >
            <IconPlayerSkipForward size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Flip board"
            onClick={() =>
              setOrientation((value) => (value === "white" ? "black" : "white"))
            }
          >
            <IconRefresh size={18} />
          </button>
        </div>
        {mode === "practice" && !done && (
          <form
            className="flex gap-2 mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              const candidate = board
                .moves({ verbose: true })
                .find(
                  (m) =>
                    m.san.toLowerCase() === notation.trim().toLowerCase() ||
                    m.from + m.to === notation.trim().toLowerCase(),
                );
              if (candidate) {
                void move(candidate.from, candidate.to, candidate.promotion);
                setNotation("");
              } else setMessage("Enter a legal move or use the board.");
            }}
          >
            <input
              className="field flex-1 min-w-0"
              aria-label="Opening practice move"
              placeholder="Your move"
              value={notation}
              onChange={(event) => setNotation(event.target.value)}
            />
            <button className="btn">Check move</button>
          </form>
        )}
      </div>
      <div className="opening-instruction">
        <div className="segmented">
          <button
            aria-pressed={mode === "read"}
            onClick={() => {
              setMode("read");
              setMessage("");
            }}
          >
            Explore line
          </button>
          <button aria-pressed={mode === "practice"} onClick={startPractice}>
            Recall line
          </button>
        </div>
        <h2>
          {mode === "practice"
            ? done
              ? "Line complete"
              : `${opening.side} to move`
            : step
              ? line.moves[step - 1]
              : "Start with the position"}
        </h2>
        <p>
          {mode === "practice"
            ? "Recall the moves in this example. Other legal moves may also be playable; this checks the example only."
            : step
              ? line.notes[step - 1]
              : line.description + " Step through the moves to see the plan."}
        </p>
        {mode === "read" ? (
          <>
            <div className="opening-moves" aria-label="Opening move list">
              {line.moves.map((san, index) => (
                <button
                  key={index}
                  aria-pressed={step === index + 1}
                  onClick={() => setStep(index + 1)}
                >
                  {index % 2 === 0 && <span>{Math.floor(index / 2) + 1}.</span>}
                  {san}
                </button>
              ))}
            </div>
            <p className="opening-hint">Use the arrow keys or select a move.</p>
            <div className="theme-tags">
              {opening.themes.map((theme) => (
                <span key={theme}>{theme}</span>
              ))}
            </div>
            <button className="btn mt-7" onClick={startPractice}>
              Recall this line
              <IconRepeat size={16} />
            </button>
          </>
        ) : (
          <div className="opening-practice-actions">
            {message && (
              <p role="status" className="practice-feedback">
                {message}
              </p>
            )}
            {!done ? (
              <>
                <button className="btn secondary" onClick={() => setHelp(true)}>
                  Reveal next move
                </button>
                {help && (
                  <p className="practice-feedback">
                    The example continues with {line.moves[step]}.
                  </p>
                )}
              </>
            ) : (
              <button className="btn" onClick={startPractice}>
                Try again
              </button>
            )}
            <button
              className="subtle-link block"
              onClick={() => {
                setMode("read");
                setStep(0);
                setMessage("");
              }}
            >
              Back to explanation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
