"use client";
import { THEME_MIN_ATTEMPTS } from "@/lib/puzzles/progress";
import { FILTER_THEMES, THEMES, themeName } from "@/lib/puzzles/themes";

export type Mode = "all" | "theme" | "weak";

const MODES: { id: Mode; label: string }[] = [
  { id: "all", label: "Mixed" },
  { id: "theme", label: "By theme" },
  { id: "weak", label: "My weak spots" },
];

export function ThemePicker({ mode, theme, weak, disabled, onChange }: {
  mode: Mode;
  theme: string;
  weak: string[];
  disabled: boolean;
  onChange: (mode: Mode, theme: string) => void;
}) {
  return (
    <section className="pz-filter" aria-label="Puzzle type">
      <div className="pz-modes" role="radiogroup" aria-label="Which puzzles">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={mode === m.id}
            className={mode === m.id ? "is-active" : ""}
            disabled={disabled || (m.id === "weak" && !weak.length)}
            title={m.id === "weak" && !weak.length ? `Needs ${THEME_MIN_ATTEMPTS} attempts in a theme first` : undefined}
            onClick={() => onChange(m.id, theme)}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode === "theme" && (
        <div className="pz-theme-choice">
          <select className="field" aria-label="Theme" value={theme} disabled={disabled} onChange={(e) => onChange("theme", e.target.value)}>
            {FILTER_THEMES.map((t) => (
              <option key={t} value={t}>{themeName(t)}</option>
            ))}
          </select>
          <p>{THEMES[theme]?.blurb}</p>
        </div>
      )}
      {mode === "weak" && weak.length > 0 && (
        <p className="pz-muted pz-small">Practising your lowest success rates: {weak.map(themeName).join(", ")}.</p>
      )}
      {mode !== "weak" && !weak.length && (
        <p className="pz-muted pz-small">“My weak spots” unlocks once you’ve done {THEME_MIN_ATTEMPTS} puzzles in a theme.</p>
      )}
    </section>
  );
}
