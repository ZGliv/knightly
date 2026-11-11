"use client";
import type { GameSummary } from "@/types/game";
export function ReviewSummaryCard({ summary }: { summary: GameSummary }) {
  return (
    <section className="review-summary">
      <h2>Decisions to review</h2>
      {summary.keyMistakes.length ? (
        <div>
          {summary.keyMistakes.map((mistake) => (
            <article key={mistake.ply}>
              <span className="small-label">
                Move {Math.ceil(mistake.ply / 2)}{" "}
                {mistake.ply % 2 ? "White" : "Black"}
              </span>
              <h3>
                {mistake.san}
                <small>{mistake.classification}</small>
              </h3>
              <p>{mistake.coachText}</p>
            </article>
          ))}
        </div>
      ) : (
        <p>Analyze your moves to find decisions worth another look.</p>
      )}
      {summary.recurringWeaknesses.length > 0 && (
        <details>
          <summary>Observed patterns</summary>
          {summary.recurringWeaknesses.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </details>
      )}
      <details>
        <summary>Practice suggestions</summary>
        {summary.recommendations.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </details>
    </section>
  );
}
