"use client";
import { useEffect, useRef } from "react";
import type { ClassifiedMove } from "@/types/game";
import { moveLabel } from "@/lib/chess/player";
export function MoveList({
  moves,
  selectedPly,
  onSelect,
  showGrades = false,
}: {
  moves: ClassifiedMove[];
  selectedPly: number;
  onSelect: (ply: number) => void;
  showGrades?: boolean;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = scroll.current;
    if (!container) return;
    function revealSelected() {
      const active = container!.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!active) return;
      const row = active.parentElement!;
      const horizontal = getComputedStyle(container!).display === "flex";
      const viewport = container!.getBoundingClientRect();
      const bounds = row.getBoundingClientRect();
      if (horizontal) {
        if (bounds.left < viewport.left) container!.scrollLeft += bounds.left - viewport.left;
        else if (bounds.right > viewport.right) container!.scrollLeft += bounds.right - viewport.right;
      } else {
        if (bounds.top < viewport.top) container!.scrollTop += bounds.top - viewport.top;
        else if (bounds.bottom > viewport.bottom) container!.scrollTop += bounds.bottom - viewport.bottom;
      }
    }
    revealSelected();
    const observer = new ResizeObserver(revealSelected);
    observer.observe(container);
    return () => observer.disconnect();
  }, [selectedPly, moves.length]);
  const rows = [];
  for (let i = 0; i < moves.length; i += 2)
    rows.push({ number: i / 2 + 1, white: moves[i], black: moves[i + 1] });
  return (
    <div className="move-list">
      <div className="move-list-labels">
        <span />
        <span>White</span>
        <span>Black</span>
      </div>
      {!rows.length ? (
        <div className="move-list-empty">
          <p>No moves yet</p>
          <span>Tap a piece, then a square.</span>
        </div>
      ) : (
        <div className="move-list-scroll" ref={scroll}>
          {rows.map((row) => (
            <div className="move-row" key={row.number}>
              <span>{row.number}.</span>
              {[row.white, row.black].map((move, index) =>
                move ? (
                  <button
                    key={index}
                    aria-label={`${moveLabel(move.ply)} ${move.san}`}
                    aria-pressed={selectedPly === move.ply}
                    onClick={() => onSelect(move.ply)}
                  >
                    <strong>{move.san}</strong>
                    {showGrades &&
                      move.classification &&
                      ["inaccuracy", "mistake", "blunder"].includes(
                        move.classification,
                      ) && (
                        <span
                          className={`move-grade grade-${move.classification}`}
                          title={move.classification}
                        >
                          {move.classification === "blunder" ? "??" : "?!"}
                        </span>
                      )}
                  </button>
                ) : (
                  <span key={index} />
                ),
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
