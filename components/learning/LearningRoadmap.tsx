"use client";
import Link from "next/link";
import { areaForLesson } from "@/lib/learning/areas";
import { AreaGuide } from "./AreaGuide";
import { selectPracticePosition } from "@/lib/learning/practice-selection";
import { OPENINGS } from "@/lib/library/catalog";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { IconArrowRight, IconCheck, IconChevronDown } from "@tabler/icons-react";
import { PositionPreview } from "@/components/library/PositionPreview";
import { COURSE_STAGES, PREREQUISITES } from "@/lib/learning/path";
import { recommendStudy } from "@/lib/learning/recommendations";
import { SEQUENCES, sequencePosition } from "@/lib/learning/sequences";
import { readAttempts, type Attempt } from "@/lib/learning/progress";
import { listGamesLocal } from "@/lib/storage/local-games";
import { readCoach } from "@/lib/learning/coach/storage";
import type { CoachData } from "@/lib/learning/coach/model";
import type { SavedGame } from "@/types/game";

function pieceFor(id: string) {
  if (/knight|fork/.test(id)) return "wN";
  if (/bishop|pin|skewer/.test(id)) return "wB";
  if (/rook|file|rank/.test(id)) return "wR";
  if (/queen|mate|finish/.test(id)) return "wQ";
  if (/king|check|castle|opposition/.test(id)) return "wK";
  return "wP";
}
export function LearningRoadmap() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [games, setGames] = useState<SavedGame[]>([]);
  const [coach, setCoach] = useState<CoachData>();
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [chapter, setChapter] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const refresh = () => {
      const messages: string[] = [];
      try { setAttempts(readAttempts()); } catch { messages.push("Your practice history could not be read. It has been preserved; you can still explore every lesson."); }
      try { setGames(listGamesLocal()); setCoach(readCoach()); } catch { messages.push("Your game history is unavailable. Your course is still open, and saved data has been preserved."); }
      setErrors(messages); setNow(Date.now()); setReady(true);
    };
    queueMicrotask(() => {
      const params = new URLSearchParams(location.search);
      const chapterId = params.get("chapter"), lessonId = params.get("lesson");
      if (COURSE_STAGES.some(s => s.id === chapterId)) setChapter(chapterId);
      if (SEQUENCES.some(s => s.id === lessonId)) {
        setSelected(lessonId);
        setChapter(COURSE_STAGES.find(s => s.lessons.some(l => l === lessonId))!.id);
      }
      refresh();
    });
    const timer = setInterval(refresh, 60000);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("storage", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  const recommendation = useMemo(() => recommendStudy(games, attempts, coach, now), [games, attempts, coach, now]);
  const progress = recommendation.progress;
  const stage = progress.stages.find(s => s.id === chapter) ?? progress.stages.find(s => s.lessons.some(l => l === recommendation.lesson.id))!;
  const selectedId = selected && stage.lessons.some(l => l === selected) ? selected : stage.lessons.some(l => l === recommendation.lesson.id) ? recommendation.lesson.id : stage.lessons.find(id => !progress.independent.has(id)) ?? stage.lessons[0];
  function selectLesson(id: string, chapterId: string = stage.id) {
    setSelected(id); setChapter(chapterId);
    history.replaceState(null, "", `/learn?chapter=${chapterId}&lesson=${id}`);
    requestAnimationFrame(() => {
      const stop = document.querySelector(`[data-lesson="${id}"]`);
      if (stop && stop.getBoundingClientRect().top < 60) stop.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }
  function chooseChapter(id: string) {
    const next = progress.stages.find(s => s.id === id)!;
    selectLesson(next.lessons.some(l => l === recommendation.lesson.id) ? recommendation.lesson.id : next.lessons.find(l => !progress.independent.has(l)) ?? next.lessons[0], id);
  }
  if (!ready) return <section className="roadmap-loading" role="status">Opening your learning path…</section>;
  return <section className="learning-roadmap">
    <header className="roadmap-heading">
      <h1>Rules refresher</h1><p>{SEQUENCES.length} lessons and {OPENINGS.length} opening studies.</p>
      <Link href="/study">Browse studies <IconArrowRight size={16} /></Link>
    </header>
    {errors.map(message => <p className="roadmap-alert" role="alert" key={message}>{message}</p>)}
    <div className="roadmap-chapters" role="group" aria-label="Learning chapter">
      {progress.stages.map(s => <button key={s.id} aria-pressed={stage.id === s.id} onClick={() => chooseChapter(s.id)}>
        <strong>{s.title}</strong><span>{s.independent} of {s.lessons.length} practiced</span>
      </button>)}
    </div>
    <div className="roadmap-ground">
      <ol className="roadmap-stops" aria-label={`${stage.title} lessons`}>
        {stage.lessons.map((id, index) => {
          const lesson = SEQUENCES.find(s => s.id === id)!;
          const area = areaForLesson(id);
          const last = progress.latest.get(id), done = progress.independent.has(id), active = selectedId === id;
          const recommended = recommendation.lesson.id === id;
          const source = recommended ? recommendation.source : undefined;
          const color = source?.playerColor ?? last?.playerColor ?? "white";
          const transfer = progress.transfer.has(id) || (last?.stage === "guided" && last.outcome !== "not-yet");
          const position = sequencePosition(lesson, transfer ? "transfer" : "guided", color, transfer ? selectPracticePosition(lesson, attempts, now).positionId : undefined);
          const params = new URLSearchParams({ lesson: id, color });
          if (transfer) params.set("stage", "transfer");
          if (source?.gameId ?? last?.sourceGameId) params.set("game", (source?.gameId ?? last?.sourceGameId)!);
          const prereqs = (PREREQUISITES[id] ?? []).filter(p => !progress.independent.has(p));
          const outcome = done ? "Different board solved without help" : transfer ? "Ready for a different board" : last ? "Keep practicing" : "Not tried yet";
          return <li key={id} className={`roadmap-stop ${active ? "is-current" : ""} ${done ? "is-complete" : ""}`} data-lesson={id}>
            <button className="roadmap-node" aria-label={`${lesson.title}: ${outcome}`} aria-expanded={active} aria-controls={`stop-${id}`} onClick={() => selectLesson(id)}>
              {done ? <IconCheck size={30} stroke={2.5} /> : <Image src={`/pieces/neo/${pieceFor(id)}.png`} width={48} height={48} alt="" unoptimized />}
            </button>
            <article className="roadmap-stop-content" id={`stop-${id}`}>
              <button className="roadmap-stop-title" aria-expanded={active} onClick={() => selectLesson(id)}>
                <span className="roadmap-order">{String(index + 1).padStart(2, "0")}</span>
                <h2>{lesson.title}</h2>
                {!active && <PositionPreview fen={position.fen} color={color} />}
              </button>
              {active && <div className="roadmap-lesson-detail">
                <PositionPreview fen={position.fen} color={color} />
                <p className="roadmap-side">{color === "white" ? "White" : "Black"} to move · {transfer ? "Different position" : "Guided lesson"}</p>
                <p className="roadmap-goal">{position.goal}</p>
                <Link className="btn roadmap-start" href={`/learn/foundations?${params}`}>
                  {done ? "Practice again" : transfer ? "Try a different position" : "Start lesson"}<IconArrowRight size={18} />
                </Link>
                {area && <details className="roadmap-reason"><summary>Explore {area.title}<IconChevronDown size={14}/></summary><AreaGuide areaId={area.id}/></details>}
                {(recommended && recommendation.kind !== "Next in your course" || prereqs.length > 0) && <details className="roadmap-reason">
                  <summary>{recommended && recommendation.kind !== "Next in your course" ? recommendation.kind : "Builds on earlier ideas"}<IconChevronDown size={14} /></summary>
                  {recommended && <p>{recommendation.reason}</p>}
                  {source && <Link href={`/learn?game=${encodeURIComponent(source.gameId)}&ply=${source.ply}`}>See your game decision</Link>}
                  {prereqs.length > 0 && <p>Useful first: {prereqs.map((p,i) => <span key={p}>{i > 0 ? " · " : ""}<button onClick={() => selectLesson(p, progress.stages.find(s => s.lessons.some(l => l === p))!.id)}>{SEQUENCES.find(l => l.id === p)!.title}</button></span>)}. You can still try this lesson now.</p>}
                </details>}
              </div>}
            </article>
          </li>;
        })}
      </ol>
      <footer className="roadmap-footer">
        <p>{stage.independent} of {stage.lessons.length} solved on a different board without help.</p>
        <p>Every chapter stays open. Revisit ideas as you play.</p>
        <Link href="/learn/games">Practice from your games <IconArrowRight size={16} /></Link>
      </footer>
    </div>
  </section>;
}
