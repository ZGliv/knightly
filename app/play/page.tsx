/*
 * File: app/play/page.tsx
 * Description: Hosts the main gameplay experience with board interaction, live coaching, and save/review actions.
 * Functions:
 * - PlayPage: Coordinates gameplay hooks, engine setup, and post-game save flow.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { GameControls } from "@/components/chess/GameControls";
import { MoveList } from "@/components/chess/MoveList";
import { CoachPanel } from "@/components/coach/CoachPanel";
import { useChessGame } from "@/hooks/useChessGame";
import { useCoach } from "@/hooks/useCoach";
import { useEngine } from "@/hooks/useEngine";
import { openingCoachTip } from "@/lib/coach/explainer";
import { getClientId, saveGameLocal } from "@/lib/storage/local-games";
import type { SavedGame } from "@/types/game";

export default function PlayPage() {
  const router = useRouter();
  const [playerLabel] = useState("You");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedGameId, setSavedGameId] = useState<string | null>(null);
  const coach = useCoach();
  const engine = useEngine();

  const game = useChessGame({
    analyzePosition: engine.analyzePosition,
    onCoachMessage: coach.pushMessage,
  });

  useEffect(() => {
    // This keeps engine difficulty synchronized with the selected slider value.
    if (engine.ready) {
      void engine.setSkillLevel(game.engineLevel);
    }
  }, [engine, game.engineLevel]);

  const canSave = useMemo(() => game.isGameOver && !saveBusy, [game, saveBusy]);

  async function handleSaveReview() {
    if (!game.isGameOver) return;
    setSaveBusy(true);
    setSaveError(null);

    try {
      const payload = game.getReviewPayload();
      const id = crypto.randomUUID();
      const savedGame: SavedGame = {
        id,
        clientId: getClientId(),
        createdAt: new Date().toISOString(),
        playerColor: game.playerColor,
        engineLevel: game.engineLevel,
        result: payload.result,
        openingName: payload.openingName,
        pgn: payload.pgn,
        fenFinal: payload.fenFinal,
        moves: payload.moves,
        summary: payload.summary,
      };

      // This saves locally first to guarantee MVP persistence without backend dependency.
      saveGameLocal(savedGame);

      // This optionally writes to cloud API when enabled and configured.
      if (process.env.NEXT_PUBLIC_ENABLE_CLOUD_SAVE === "true") {
        await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(savedGame),
        });
      }

      setSavedGameId(id);
    } catch {
      setSaveError("Could not save game review. Please try again.");
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
        <h1 className="text-xl font-semibold text-zinc-100">Play vs Coach Engine</h1>
        <p className="text-sm text-zinc-400">
          Drag pieces on the board. You are White in this MVP build.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(360px,620px)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <ChessBoard
            fen={game.fen}
            playerColor={game.playerColor}
            activeColor={game.activeColor}
            canInteract={game.canInteract}
            isMoveLegal={game.isMoveLegal}
            getLegalTargets={game.getLegalTargets}
            onMove={game.playPlayerMove}
          />
          <GameControls
            thinking={game.thinking}
            engineLevel={game.engineLevel}
            onEngineLevelChange={game.setEngineLevel}
            onReset={() => {
              game.resetGame();
              coach.clear();
              setSavedGameId(null);
              setSaveError(null);
            }}
          />
        </div>

        <div className="space-y-4">
          <CoachPanel
            messages={coach.messages}
            openingName={game.openingName}
            openingTip={openingCoachTip(game.openingName)}
            playerLabel={playerLabel}
          />
          <MoveList moves={game.moves} />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canSave}
            onClick={() => void handleSaveReview()}
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition enabled:hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            {saveBusy ? "Saving..." : "Save & Generate Review"}
          </button>
          {savedGameId ? (
            <button
              type="button"
              onClick={() => router.push(`/review/${savedGameId}`)}
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
            >
              Open Review
            </button>
          ) : null}
          {game.error ? <p className="text-sm text-red-300">{game.error}</p> : null}
          {saveError ? <p className="text-sm text-red-300">{saveError}</p> : null}
          {engine.failed ? (
            <p className="text-sm text-yellow-300">
              Engine failed to load. Check network access and refresh.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
