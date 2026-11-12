"use client";
import { useId, useState, type FormEvent } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import type { InsightsMeta, TimeClass } from "@/lib/insights/types";
import { TIME_CLASS_LABEL, TIME_CLASS_ORDER, listTimeClasses } from "@/components/insights/shared";

const GAME_COUNTS = [25, 50, 100] as const;
const DEFAULT_CLASSES: TimeClass[] = ["rapid", "blitz"];
const TIME_CLASS_HINT: Record<TimeClass, string> = {
  rapid: "10 minutes or more",
  blitz: "3 to 9 minutes",
  bullet: "under 3 minutes",
  daily: "a day or more per move",
};

export function ConnectForm({
  previous,
  running,
  error,
  onSubmit,
}: {
  /** Settings of the last import, when one was made but found nothing. */
  previous: InsightsMeta | null;
  running: boolean;
  error: string | null;
  onSubmit: (username: string, options: { max: number; timeClasses: TimeClass[] }) => void;
}) {
  const id = useId();
  const [username, setUsername] = useState(previous?.username ?? "");
  const [max, setMax] = useState<number>(
    previous && (GAME_COUNTS as readonly number[]).includes(previous.max) ? previous.max : 50,
  );
  const [classes, setClasses] = useState<TimeClass[]>(previous?.timeClasses ?? DEFAULT_CLASSES);
  const [localError, setLocalError] = useState<string | null>(null);
  const shownError = localError ?? error;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (running) return;
    const name = username.trim();
    if (!name) {
      setLocalError("Enter your chess.com username.");
      return;
    }
    if (!classes.length) {
      setLocalError("Choose at least one kind of game to import.");
      return;
    }
    setLocalError(null);
    onSubmit(name, { max, timeClasses: TIME_CLASS_ORDER.filter((value) => classes.includes(value)) });
  }

  return (
    <form className="insights-connect panel" onSubmit={submit} noValidate>
      <div className="insights-connect-copy">
        <h2>See where your games slip away</h2>
        <p>
          Enter your chess.com username. This page fetches your recent games straight from
          chess.com&rsquo;s public game archive, then the Stockfish chess engine checks every
          position on this device. You get a short report on where you lose: in which part of
          the game, in which openings, with what kind of mistake, and on the clock. Your worst
          moments become positions you can practise.
        </p>
        <ul>
          <li>Your games stay in this browser. There is no account and nothing is uploaded.</li>
          <li>
            Analysis runs on this device and takes several minutes for 50 games, longer on a
            phone. The report fills in as games finish, and you can pause at any time.
          </li>
          <li>
            You only do this once. Each time you open this page it checks chess.com for new games
            and analyses them.
          </li>
        </ul>
      </div>

      {previous && !running && !error && (
        <p className="insights-callout" role="status">
          No {listTimeClasses(previous.timeClasses)} games were found for {previous.username}.
          Try including other kinds of games, or check the spelling of the username.
        </p>
      )}

      <div className="insights-field">
        <label htmlFor={`${id}-user`}>chess.com username</label>
        <input
          id={`${id}-user`}
          className="field"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            setLocalError(null);
          }}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={40}
          placeholder="Your username"
          aria-invalid={shownError ? true : undefined}
          aria-describedby={shownError ? `${id}-error` : undefined}
          disabled={running}
        />
      </div>

      <fieldset className="insights-field" disabled={running}>
        <legend>How many recent games</legend>
        <div className="insights-choices">
          {GAME_COUNTS.map((count) => (
            <label key={count} className="insights-choice">
              <input
                type="radio"
                name={`${id}-max`}
                value={count}
                checked={max === count}
                onChange={() => setMax(count)}
              />
              <span>{count}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="insights-field" disabled={running}>
        <legend>Which games</legend>
        <div className="insights-choices">
          {TIME_CLASS_ORDER.map((value) => (
            <label key={value} className="insights-choice">
              <input
                type="checkbox"
                checked={classes.includes(value)}
                onChange={(event) => {
                  setLocalError(null);
                  setClasses((prior) =>
                    event.target.checked ? [...prior, value] : prior.filter((item) => item !== value),
                  );
                }}
              />
              <span>
                {TIME_CLASS_LABEL[value]}
                <small>{TIME_CLASS_HINT[value]}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {shownError && (
        <p id={`${id}-error`} className="insights-error" role="alert">
          {shownError}
        </p>
      )}

      <button className="btn insights-connect-submit" disabled={running}>
        {running ? "Importing…" : "Import my games"}
        {!running && <IconArrowRight size={16} aria-hidden="true" />}
      </button>
    </form>
  );
}
