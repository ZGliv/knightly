/*
 * File: components/chess/GameControls.tsx
 * Description: Displays primary gameplay controls such as difficulty selection and game reset.
 * Functions:
 * - GameControls: Renders and wires game control UI actions.
 */

"use client";

interface GameControlsProps {
  thinking: boolean;
  engineLevel: number;
  onEngineLevelChange: (level: number) => void;
  onReset: () => void;
}

export function GameControls({
  thinking,
  engineLevel,
  onEngineLevelChange,
  onReset,
}: GameControlsProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-300">
        Controls
      </h3>
      <div className="space-y-4">
        {/* This sets a human-friendly engine strength slider for MVP difficulty control. */}
        <label className="block text-sm text-zinc-200">
          Engine Level: <span className="font-semibold">{engineLevel}</span>
          <input
            className="mt-2 w-full accent-indigo-400"
            type="range"
            min={1}
            max={20}
            value={engineLevel}
            onChange={(event) => onEngineLevelChange(Number(event.target.value))}
          />
        </label>

        <button
          type="button"
          onClick={onReset}
          className="w-full rounded-md bg-zinc-700 px-3 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-600"
        >
          New Game
        </button>

        <p className="text-xs text-zinc-400">
          {thinking ? "Engine is thinking..." : "Your turn."}
        </p>
      </div>
    </div>
  );
}
