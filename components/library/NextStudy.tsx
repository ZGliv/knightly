import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { PositionPreview } from "./PositionPreview";
import { SEQUENCES, sequencePosition } from "@/lib/learning/sequences";
import type { recommendStudy } from "@/lib/learning/recommendations";
export function NextStudy({
  recommendation,
  href,
}: {
  recommendation: ReturnType<typeof recommendStudy>;
  href: string;
}) {
  const params = new URLSearchParams(href.split("?")[1]);
  const color = params.get("color") === "black" ? "black" : "white";
  const sequence = SEQUENCES.find((lesson) => lesson.id === recommendation.lesson.id)!;
  const position = sequencePosition(sequence, params.get("stage") === "transfer" ? "transfer" : "guided", color);
  return (
    <section className="next-study" aria-label="Recommended next study">
      <div className="next-study-copy">
        <h2>{recommendation.lesson.title}</h2>
        <span className="recommendation-context">{recommendation.kind}</span>
        <p>{recommendation.reason}</p>
        <div className="next-study-actions">
          <Link href={href} className="btn">
            Study this next <IconArrowRight size={16} />
          </Link>
          {recommendation.source && (
            <Link
              className="subtle-link"
              href={`/learn?game=${recommendation.source.gameId}&ply=${recommendation.source.ply}`}
            >
              See your game decision
            </Link>
          )}
        </div>
      </div>
      <div className="next-study-board">
        <PositionPreview
          fen={recommendation.source?.fenBefore ?? position.fen}
          color={recommendation.source?.playerColor ?? color}
        />
        <span>
          {recommendation.source
            ? `Your position · move ${Math.ceil(recommendation.source.ply / 2)}`
            : `${color === "white" ? "White" : "Black"} to move · Lesson preview`}
        </span>
      </div>
    </section>
  );
}
