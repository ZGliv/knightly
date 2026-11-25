import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { MIN_LINES_FOR_GAMES } from "./modeTypes";

/** Shown by Drill and Time when fewer than three lines are learned. */
export function GamesGate({ title, learned, learnHref }: { title: string; learned: number; learnHref: string }) {
  const short = MIN_LINES_FOR_GAMES - learned;
  return (
    <div className="cr-card cr-empty">
      <h2>{title} unlocks at {MIN_LINES_FOR_GAMES} learned lines</h2>
      <p className="cr-muted">
        It mixes your learned lines in random order, so it needs a few to choose from. You’ve learned {learned} so far, {short} more to go.
      </p>
      <div className="cr-actions">
        <Link className="btn" href={learnHref}>Learn a line <IconArrowRight size={16} /></Link>
      </div>
    </div>
  );
}
