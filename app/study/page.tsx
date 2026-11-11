"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  IconArrowRight,
  IconBookmark,
  IconSearch,
  IconChessKnight,
  IconLayoutGrid,
  IconList,
  IconX,
} from "@tabler/icons-react";
import { StudyCard } from "@/components/library/StudyCard";
import {
  STUDY_TOPICS,
  STUDY_SHELVES,
  matchesStudyTopic,
  topicCount,
  browseHref,
  readBrowseState,
  type StudyTopic,
  type BrowseState,
} from "@/lib/library/browse";
import { PositionPreview } from "@/components/library/PositionPreview";
import {
  COLLECTIONS,
  OPENINGS,
  readSavedItems,
  toggleSavedItem,
} from "@/lib/library/catalog";
import { recommendStudy } from "@/lib/learning/recommendations";
import type { SavedGame } from "@/types/game";
import type { CoachData } from "@/lib/learning/coach/model";
import { LESSONS } from "@/lib/learning/curriculum";
import { readAttempts, type Attempt } from "@/lib/learning/progress";
import { CONCEPTS, outcomeLabel, studyProgress } from "@/lib/learning/study";
import { listGamesLocal } from "@/lib/storage/local-games";
import { readCoach } from "@/lib/learning/coach/storage";

export default function StudyPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [gameRecords, setGameRecords] = useState<SavedGame[]>([]);
  const [coachData, setCoachData] = useState<CoachData>();
  const [saved, setSaved] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [historyAvailable, setHistoryAvailable] = useState(true);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [browse, setBrowse] = useState(() => readBrowseState(""));
  const { view, category, query, openingSide, layout, showAll } = browse;
  function updateBrowse(change: Partial<BrowseState>) {
    const next = { ...browse, ...change };
    setBrowse(next);
    // Write on the interaction, never from a mount effect: Back may restore a cached page.
    window.history.replaceState(null, "", browseHref(next));
  }
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      const messages: string[] = [];
      try {
        setAttempts(readAttempts());
      } catch {
        setHistoryAvailable(false);
        messages.push(
          "Practice history is unavailable and has been preserved. You can still explore the course.",
        );
      }
      try {
        setSaved(readSavedItems());
      } catch (error) {
        messages.push((error as Error).message);
      }
      try {
        const library = listGamesLocal();
        setGameRecords(library);
        setCoachData(readCoach());
      } catch {
        messages.push(
          "Game history needs attention. Open Your games for recovery tools.",
        );
      }
      const requested = new URLSearchParams(location.search).get("view");
      if (requested === "path") {
        location.replace("/learn");
        return;
      }
      setBrowse(readBrowseState(location.search));
      setErrors(messages);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  const returnTo = browseHref(browse);
  function chooseTopic(topic: StudyTopic) {
    updateBrowse({ category: topic, showAll: false });
    requestAnimationFrame(() =>
      document
        .getElementById("study-results")
        ?.scrollIntoView({ block: "start", behavior: "instant" }),
    );
  }
  const progress = studyProgress(attempts, now);
  const recommendation = useMemo(
    () => recommendStudy(gameRecords, attempts, coachData, now),
    [gameRecords, attempts, coachData, now],
  );
  function bookmark(id: string) {
    try {
      setSaved(toggleSavedItem(id));
    } catch (error) {
      setErrors((prior) => [...prior, (error as Error).message]);
    }
  }
  function lessonLink(id: string) {
    const last = progress.latest.get(id);
    const source =
      recommendation.lesson.id === id ? recommendation.source : undefined;
    const stage =
      progress.transfer.has(id) ||
      (last?.stage === "guided" && last.outcome !== "not-yet");
    const gameId = source?.gameId ?? last?.sourceGameId;
    return `/learn/foundations?lesson=${id}${stage ? "&stage=transfer" : ""}&color=${source?.playerColor ?? last?.playerColor ?? "white"}${gameId ? `&game=${encodeURIComponent(gameId)}` : ""}`;
  }
  const normalized = query.trim().toLowerCase();
  const collections = COLLECTIONS.filter(
    (item) =>
      matchesStudyTopic(item, category) &&
      (view !== "saved" || saved.includes(item.id)) &&
      `${item.title} ${item.description} ${item.category} ${item.takeaways.join(" ")} ${item.lessonIds.map((id) => `${id} ${LESSONS.find((l) => l.id === id)?.title}`).join(" ")}`
        .toLowerCase()
        .includes(normalized),
  );
  const openings = OPENINGS.filter(
    (item) =>
      (category === "All topics" || category === "Openings") &&
      (category !== "Openings" ||
        openingSide === "all" ||
        item.side === openingSide) &&
      (view !== "saved" || saved.includes(item.id)) &&
      `${item.title} ${item.description} ${item.side} ${item.themes.join(" ")}`
        .toLowerCase()
        .includes(normalized),
  );
  const itemCount = collections.length + openings.length;
  const compactCatalog =
    view === "browse" && category === "All topics" && !normalized && !showAll;
  const renderCard = (
    item: (typeof COLLECTIONS)[number] | (typeof OPENINGS)[number],
  ) => (
    <StudyCard
      key={item.id}
      item={item}
      saved={saved.includes(item.id)}
      onBookmark={bookmark}
      returnTo={returnTo}
      done={
        "lessonIds" in item
          ? item.lessonIds.filter((id) => progress.latest.has(id)).length
          : 0
      }
    />
  );
  return (
    <section className="library-page study-shelves">
      <header className="page-heading">
        <div>
          <h1>Study</h1>
          <p>Openings, middlegames and endings. Pick an idea to work on.</p>
        </div>
        <Link href="/learn" className="subtle-link">
          Learning path
          <IconArrowRight size={16} />
        </Link>
      </header>
      {errors.map((error, i) => (
        <p role="alert" className="panel mb-4 text-sm" key={i}>
          {error}
        </p>
      ))}
      <div className="library-tabs" role="group" aria-label="Library view">
        {[
          ["browse", "Browse library"],
          ["practice", "My practice"],
          ["saved", "Saved"],
        ].map(([id, title]) => (
          <button
            key={id}
            aria-pressed={view === id}
            onClick={() => updateBrowse({ view: id as typeof view })}
          >
            {title}
            {id === "saved" && saved.length > 0 && <span>{saved.length}</span>}
            {id === "practice" && progress.due.length > 0 && (
              <span>{progress.due.length} due</span>
            )}
          </button>
        ))}
      </div>
      {view !== "practice" ? (
        <>
          <div className="library-toolbar">
            <label className="library-search">
              <IconSearch size={18} />
              <input
                aria-label="Search library"
                placeholder="Search topics, openings, or ideas"
                value={query}
                maxLength={200}
                onChange={(event) =>
                  updateBrowse({ query: event.target.value })
                }
              />
              {query && (
                <button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => updateBrowse({ query: "" })}
                >
                  <IconX size={16} />
                </button>
              )}
            </label>
            <div className="segmented" aria-label="Library layout">
              <button
                aria-label="Grid view"
                aria-pressed={layout === "grid"}
                onClick={() => updateBrowse({ layout: "grid" })}
              >
                <IconLayoutGrid size={17} />
              </button>
              <button
                aria-label="List view"
                aria-pressed={layout === "list"}
                onClick={() => updateBrowse({ layout: "list" })}
              >
                <IconList size={17} />
              </button>
            </div>
          </div>
          <div className="catalog-layout">
            <aside className="catalog-sidebar">
              <h2>Topics</h2>
              <div role="group" aria-label="Filter by topic">
                {STUDY_TOPICS.map((item) => (
                  <button
                    key={item}
                    aria-pressed={category === item}
                    onClick={() => updateBrowse({ category: item })}
                  >
                    <span>{item}</span>
                    <span>{topicCount(item)}</span>
                  </button>
                ))}
              </div>
              {category === "Openings" && (
                <label className="opening-color-filter">
                  Opening color
                  <select
                    className="field"
                    aria-label="Opening color"
                    value={openingSide}
                    onChange={(event) =>
                      updateBrowse({
                        openingSide: event.target
                          .value as BrowseState["openingSide"],
                      })
                    }
                  >
                    <option value="all">Both colors</option>
                    <option value="White">Play as White</option>
                    <option value="Black">Play as Black</option>
                  </select>
                </label>
              )}
            </aside>
            <div className="catalog-content" id="study-results">
              <div className="catalog-result-heading">
                <h2>
                  {view === "saved"
                    ? "Your saved studies"
                    : category === "All topics"
                      ? compactCatalog
                        ? "Explore the library"
                        : "All studies"
                      : category}
                </h2>
                <span aria-live="polite">
                  {itemCount} {itemCount === 1 ? "study" : "studies"}
                </span>
              </div>
              {!ready ? (
                <p role="status" className="panel">
                  Loading your library…
                </p>
              ) : !itemCount ? (
                <div className="empty-state">
                  <IconBookmark size={28} />
                  <h2>
                    {view === "saved" && !query
                      ? "Keep a study for later"
                      : "No matching studies"}
                  </h2>
                  <p>
                    {view === "saved" && !query
                      ? "Use the bookmark on a collection or opening to add it here."
                      : "Try another search or choose a different topic."}
                  </p>
                  <button
                    className="btn secondary"
                    onClick={() => {
                      updateBrowse({
                        view: "browse",
                        query: "",
                        category: "All topics",
                      });
                    }}
                  >
                    Browse all studies
                  </button>
                </div>
              ) : compactCatalog ? (
                <>
                  <div className="study-shelf-list">
                    {STUDY_SHELVES.map((shelf) => (
                      <section
                        className="study-shelf"
                        aria-label={shelf.title}
                        key={shelf.title}
                      >
                        <header className="study-shelf-heading">
                          <div>
                            <h3>{shelf.title}</h3>
                            <p>{shelf.description}</p>
                          </div>
                          <button
                            onClick={() => chooseTopic(shelf.title)}
                            aria-label={`View all ${shelf.title.toLowerCase()}`}
                          >
                            View all <IconArrowRight size={16} />
                          </button>
                        </header>
                        <div
                          className={`catalog-grid ${layout === "list" ? "catalog-list" : ""}`}
                        >
                          {shelf.ids.map((id) =>
                            renderCard(
                              [...COLLECTIONS, ...OPENINGS].find(
                                (item) => item.id === id,
                              )!,
                            ),
                          )}
                        </div>
                      </section>
                    ))}
                  </div>
                  <button
                    className="btn secondary catalog-more"
                    onClick={() => updateBrowse({ showAll: true })}
                  >
                    Browse all {itemCount} studies <IconArrowRight size={16} />
                  </button>
                </>
              ) : (
                <div
                  className={`catalog-grid ${layout === "list" ? "catalog-list" : ""}`}
                >
                  {collections.map(renderCard)}
                  {openings.map(renderCard)}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="practice-overview">
          <div className="study-practice-links">
            <Link href="/learn/games">
              Practice from your games <IconArrowRight size={16} />
            </Link>
            <Link href="/games">
              Your games <IconArrowRight size={16} />
            </Link>
          </div>
          <section className="practice-next">
            <PositionPreview fen={progress.next.fen} />
            <div>
              <span className="small-label">
                {progress.due.length ? "Scheduled revisit" : "Next lesson"}
              </span>
              <h2>{CONCEPTS[progress.next.id].title}</h2>
              <p>{CONCEPTS[progress.next.id].principle}</p>
              <Link className="btn" href={lessonLink(progress.next.id)}>
                {progress.due.length ? "Revisit lesson" : "Continue studying"}
                <IconArrowRight size={16} />
              </Link>
            </div>
          </section>
          <div className="practice-summary">
            <span>
              {historyAvailable ? progress.practiced : "?"}
              <small>of {LESSONS.length} ideas tried</small>
            </span>
            <span>
              {historyAvailable ? progress.independent : "?"}
              <small>latest solve without help</small>
            </span>
            <span>
              {historyAvailable ? progress.due.length : "?"}
              <small>ready to revisit</small>
            </span>
          </div>
          <div className="section-heading">
            <h2>Your lessons</h2>
            <span className="small-label">Latest attempts</span>
          </div>
          <div className="lesson-history">
            {LESSONS.map((lesson) => {
              const last = progress.latest.get(lesson.id);
              return (
                <Link href={lessonLink(lesson.id)} key={lesson.id}>
                  <span className="lesson-history-icon">
                    <IconChessKnight size={23} stroke={1.4} />
                  </span>
                  <div>
                    <h3>{CONCEPTS[lesson.id].title}</h3>
                    <p>
                      {outcomeLabel(last)}
                      {progress.transfer.has(lesson.id)
                        ? ` · Different position: ${outcomeLabel(progress.transfer.get(lesson.id))}`
                        : ""}
                      {progress.due.some((item) => item.lesson.id === lesson.id)
                        ? " · Revisit due"
                        : ""}
                    </p>
                  </div>
                  <IconArrowRight size={17} />
                </Link>
              );
            })}
          </div>
          <p className="practice-footnote">
            Progress is saved in this browser. Hints count as support. Revisits
            start after 15 minutes with support, or a day after an independent
            solve.
          </p>
        </div>
      )}
    </section>
  );
}
