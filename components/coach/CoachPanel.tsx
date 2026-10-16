/*
 * File: components/coach/CoachPanel.tsx
 * Description: Displays live coaching insights and the most recent move guidance in readable language.
 * Functions:
 * - CoachPanel: Renders the coach message feed and current highlight.
 */

"use client";

import type { CoachMessage } from "@/hooks/useCoach";

interface CoachPanelProps {
  messages: CoachMessage[];
  openingName: string;
  openingTip: string;
  playerLabel: string;
}

function classificationColor(classification: string) {
  if (classification === "best") return "text-emerald-300";
  if (classification === "good") return "text-green-300";
  if (classification === "inaccuracy") return "text-yellow-300";
  if (classification === "mistake") return "text-orange-300";
  if (classification === "blunder") return "text-red-300";
  return "text-zinc-300";
}

function speakerLabel(kind: CoachMessage["kind"]) {
  if (kind === "player-feedback") return "AI Coach";
  return "Engine";
}

export function CoachPanel({
  messages,
  openingName,
  openingTip,
  playerLabel,
}: CoachPanelProps) {
  const latestPlayerFeedback =
    messages.find((message) => message.kind === "player-feedback") ?? null;
  const latestOpponentPlan =
    messages.find((message) => message.kind === "opponent-plan") ?? null;

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-300">
          Coach
        </h3>
        <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-200">
          Live
        </span>
      </div>

      <div className="space-y-3">
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Session</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="rounded bg-indigo-500/20 px-2 py-1 text-indigo-200">
              AI Coach
            </span>
            <span className="text-zinc-500">vs</span>
            <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-200">
              {playerLabel}
            </span>
          </div>
        </div>

        <div className="rounded-md border border-indigo-500/20 bg-indigo-950/20 p-3">
          <p className="text-xs uppercase tracking-wide text-indigo-300">Opening</p>
          <p className="mt-1 text-sm font-medium text-zinc-100">{openingName}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300">{openingTip}</p>
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Coach Note</p>
          <p className="mt-2 text-sm text-zinc-100">
            {latestPlayerFeedback?.text ??
              "Make your first move and I will evaluate your decision quality in real time."}
          </p>
          {latestPlayerFeedback?.classification ? (
            <p
              className={`mt-2 text-xs font-semibold uppercase tracking-wide ${classificationColor(
                latestPlayerFeedback.classification,
              )}`}
            >
              {latestPlayerFeedback.classification}
            </p>
          ) : null}
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Engine Intent
          </p>
          <p className="mt-2 text-sm text-zinc-100">
            {latestOpponentPlan?.text ??
              "After each engine move, this panel explains what strategic idea it is pursuing."}
          </p>
        </div>

        <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className="rounded-md border border-zinc-800 bg-zinc-950 p-2"
            >
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>Move {Math.ceil(message.ply / 2)}</span>
                <span>·</span>
                <span>{speakerLabel(message.kind)}</span>
                {message.classification ? (
                  <>
                    <span>·</span>
                    <span
                      className={`font-semibold uppercase ${classificationColor(
                        message.classification,
                      )}`}
                    >
                      {message.classification}
                    </span>
                  </>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-zinc-200">{message.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
