"use client";
import { useMemo, useState, type ReactNode } from "react";
import { IconTarget } from "@tabler/icons-react";
import { PositionPreview } from "@/components/library/PositionPreview";
import { colorName } from "@/lib/chess/player";
import { CATEGORY_COPY } from "@/lib/insights/report";
import type { InsightsSnapshot } from "@/lib/insights/pipeline";
import type { ImportedGame, Leak, OpeningStats, RecordCount, TimeClass } from "@/lib/insights/types";
import type { GamePhase } from "@/lib/utils/phase";
import type { PlayerColor } from "@/types/game";
import {
  Bar,
  ExternalGameLink,
  MIN_OPENING_GAMES,
  TIME_CLASS_LABEL,
  TIME_CLASS_ORDER,
  clockText,
  gameDate,
  openingVerdict,
  opponentOf,
  percent,
  plural,
  practiceQueue,
  shareOf,
  sharesOf,
  type PracticeFilter,
} from "@/components/insights/shared";

const PHASES: { phase: GamePhase; label: string }[] = [
  { phase: "opening", label: "Opening" },
  { phase: "middlegame", label: "Middlegame" },
  { phase: "endgame", label: "Endgame" },
];
const MIN_FOR_HEADLINES = 5;
const EXAMPLES_PER_CATEGORY = 3;
/** Openings listed per colour before the rest fold away; tables are sorted by games played. */
const VISIBLE_OPENINGS = 5;

export function Report({
  snapshot,
  setAside,
  now,
  onPractise,
  onTry,
}: {
  snapshot: InsightsSnapshot;
  /** Positions Practice set aside; they are never offered, so practice sets leave them out. */
  setAside: ReadonlySet<string>;
  /** When the page last checked what is due; practice sets then hold only what Practice offers now. */
  now: number | null;
  onPractise: (filter: PracticeFilter) => void;
  onTry: (leakId: string) => void;
}) {
  const { report, games, leaks } = snapshot;
  const gamesById = useMemo(() => new Map(games.map((game) => [game.id, game])), [games]);
  const leaksById = useMemo(() => new Map(leaks.map((leak) => [leak.id, leak])), [leaks]);
  // Analysed games with at least one move of the user's: only these give a reading after the opening.
  const measuredIds = useMemo(
    () =>
      new Set(
        snapshot.assessments
          .filter((assessment) => assessment.moves.length > 0)
          .map((assessment) => assessment.gameId),
      ),
    [snapshot.assessments],
  );
  // Positions solved without help are left out until they are due again, as Practice does.
  const practiceIds = (ids: string[]) => {
    if (now === null) return ids.filter((id) => !setAside.has(id));
    const wanted = new Set(ids);
    return practiceQueue(
      leaks.filter((leak) => wanted.has(leak.id)),
      snapshot.attempts,
      setAside,
      now,
    ).map((leak) => leak.id);
  };
  const analysed = report.analysed;
  const dailyOnly = games.length > 0 && games.every((game) => game.timeClass === "daily");

  return (
    <div className="insights-report">
      <div className="insights-basis">
        <p>
          {analysed < report.games ? (
            <>
              Based on <strong>{analysed}</strong> of {plural(report.games, "game")} so far.
              {analysed === 0 && " The engine sections appear as soon as the first game is analysed."}
            </>
          ) : (
            <>
              Based on all {plural(report.games, "game")}
              {report.from !== null && report.to !== null
                ? `, played between ${gameDate(report.from)} and ${gameDate(report.to)}`
                : ""}
              .
            </>
          )}
        </p>
        <details className="insights-glossary">
          <summary>How to read these numbers</summary>
          <p>
            <strong>Winning chances</strong> are the engine&rsquo;s estimate, from 0 to 100, of how
            likely you are to win from a position: 50 is level, 85 or more is a clearly winning
            position and 15 or less a clearly losing one.
          </p>
          <p>
            A move that costs you 10 points of winning chances or more counts as a{" "}
            <strong>mistake</strong>, and 15 points or more as a <strong>blunder</strong>. Smaller
            slips are left out, and so is the engine&rsquo;s own first choice. The scale is steepest
            around 50, so the same slip costs more points in a balanced position than in one that is
            already decided. Moves that still leave you at 90 or more are not counted, and neither are
            moves made when you were already under 10, unless they let your opponent force checkmate.
          </p>
        </details>
      </div>

      <Headlines
        analysed={analysed}
        report={report}
        practiceIds={practiceIds}
        onPractise={onPractise}
      />

      <RecordSection report={report} />

      {analysed > 0 && (
        <>
          <PhaseSection report={report} />
          <CategorySection
            snapshot={snapshot}
            practiceIds={practiceIds}
            leaksById={leaksById}
            gamesById={gamesById}
            onTry={onTry}
            onPractise={onPractise}
          />
          {!dailyOnly && <ClockSection report={report} games={games} />}
          <ConversionSection report={report} gamesById={gamesById} />
        </>
      )}

      <OpeningSection openings={report.openings} games={games} measuredIds={measuredIds} />
    </div>
  );
}

function SectionHeading({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div className="insights-section-head">
      <h2 id={id}>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

function Headlines({
  analysed,
  report,
  practiceIds,
  onPractise,
}: {
  analysed: number;
  report: InsightsSnapshot["report"];
  practiceIds: (ids: string[]) => string[];
  onPractise: (filter: PracticeFilter) => void;
}) {
  return (
    <section className="insights-section" aria-labelledby="insights-headlines">
      <SectionHeading id="insights-headlines" title="What costs you the most" />
      {analysed < MIN_FOR_HEADLINES ? (
        <p className="insights-empty">
          Your main leaks are picked out once at least {MIN_FOR_HEADLINES} games are analysed.{" "}
          {analysed === 0
            ? "None are finished yet."
            : `${plural(analysed, "game is", "games are")} finished so far.`}
        </p>
      ) : !report.headlines.length ? (
        <p className="insights-empty">
          No single problem stands out clearly in these games. The sections below still show where
          your mistakes happened.
        </p>
      ) : (
        <div className="insights-headlines">
          {report.headlines.map((headline, index) => {
            const ids = practiceIds(headline.leakIds);
            return (
              <article key={headline.key} className="insights-headline">
                <span className="insights-headline-rank" aria-hidden="true">
                  {index + 1}
                </span>
                <h3>{headline.title}</h3>
                <p>{headline.detail}</p>
                <p className="insights-advice">
                  <strong>What to try: </strong>
                  {headline.advice}
                </p>
                {ids.length > 0 && (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => onPractise({ label: headline.title, ids })}
                  >
                    <IconTarget size={15} aria-hidden="true" />
                    Practise these ({ids.length})
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RecordLine({ label, record }: { label: string; record: RecordCount }) {
  const win = shareOf(record.win, record.games);
  const draw = shareOf(record.draw, record.games);
  return (
    <div className="insights-record-row">
      <span className="insights-record-label">{label}</span>
      <span className="insights-record-numbers">
        <strong>{record.win}</strong> won · <strong>{record.draw}</strong> drawn ·{" "}
        <strong>{record.loss}</strong> lost
      </span>
      <span className="insights-record-bar" aria-hidden="true">
        <span className="win" style={{ width: `${win}%` }} />
        <span className="draw" style={{ width: `${draw}%` }} />
        <span className="loss" />
      </span>
    </div>
  );
}

function RecordSection({ report }: { report: InsightsSnapshot["report"] }) {
  const classes = TIME_CLASS_ORDER.filter((value) => report.byTimeClass[value]?.games);
  return (
    <section className="insights-section" aria-labelledby="insights-record">
      <SectionHeading id="insights-record" title="Your results">
        All {plural(report.games, "imported game")}, analysed or not.
      </SectionHeading>
      <div className="insights-card insights-record">
        <RecordLine label={`Overall · ${plural(report.record.games, "game")}`} record={report.record} />
        {(["white", "black"] as PlayerColor[])
          .filter((color) => report.byColor[color].games)
          .map((color) => (
            <RecordLine
              key={color}
              label={`As ${colorName(color)} · ${report.byColor[color].games}`}
              record={report.byColor[color]}
            />
          ))}
        {classes.length > 1 &&
          classes.map((value: TimeClass) => (
            <RecordLine
              key={value}
              label={`${TIME_CLASS_LABEL[value]} · ${report.byTimeClass[value]!.games}`}
              record={report.byTimeClass[value]!}
            />
          ))}
      </div>
    </section>
  );
}

function PhaseSection({ report }: { report: InsightsSnapshot["report"] }) {
  const highest = Math.max(...PHASES.map(({ phase }) => report.phases[phase].leaksPer100), 0);
  return (
    <section className="insights-section" aria-labelledby="insights-phases">
      <SectionHeading id="insights-phases" title="Where the mistakes happen">
        Mistakes and blunders for every 100 moves you played in each part of the game.
      </SectionHeading>
      <div className="insights-card insights-phases">
        {PHASES.map(({ phase, label }) => {
          const stats = report.phases[phase];
          const count = stats.mistakes + stats.blunders;
          return (
            <div className="insights-phase" key={phase}>
              <div className="insights-phase-top">
                <h3>{label}</h3>
                <span>
                  {stats.moves ? (
                    <>
                      <strong>{stats.leaksPer100}</strong> per 100 moves
                    </>
                  ) : (
                    "No moves yet"
                  )}
                </span>
              </div>
              <Bar value={highest ? (stats.leaksPer100 / highest) * 100 : 0} tone="warning" />
              <p>
                {plural(count, "mistake")} in {plural(stats.moves, "move")}
                {stats.blunders ? `, ${stats.blunders} of them ${stats.blunders === 1 ? "a blunder" : "blunders"}` : ""}
              </p>
            </div>
          );
        })}
        <p className="insights-footnote">
          The opening is your first 10 moves while at least 11 of the 14 knights, bishops, rooks and
          queens are still on the board. The endgame starts once 6 or fewer of them are left. The
          middlegame is everything in between.
        </p>
      </div>
    </section>
  );
}

function CategorySection({
  snapshot,
  practiceIds,
  leaksById,
  gamesById,
  onTry,
  onPractise,
}: {
  snapshot: InsightsSnapshot;
  practiceIds: (ids: string[]) => string[];
  leaksById: Map<string, Leak>;
  gamesById: Map<string, ImportedGame>;
  onTry: (leakId: string) => void;
  onPractise: (filter: PracticeFilter) => void;
}) {
  const { categories } = snapshot.report;
  // Rounded together so the shares add up to 100%.
  const shares = sharesOf(categories.map((category) => category.totalDrop));
  return (
    <section className="insights-section" aria-labelledby="insights-categories">
      <SectionHeading id="insights-categories" title="What kind of mistakes">
        Share of damage is how much of the winning chances you lost to mistakes went to each kind.
      </SectionHeading>
      {!categories.length ? (
        <p className="insights-empty">No mistakes or blunders found in the analysed games so far.</p>
      ) : (
        <div className="insights-card insights-categories">
          {categories.map((category, index) => {
            const copy = CATEGORY_COPY[category.category];
            const share = shares[index];
            const practisable = practiceIds(category.leakIds);
            const examples = category.leakIds
              .slice(0, EXAMPLES_PER_CATEGORY)
              .map((id) => leaksById.get(id))
              .filter((leak): leak is Leak => !!leak);
            return (
              <div className="insights-category" key={category.category}>
                <div className="insights-category-top">
                  <div>
                    <h3>{copy.label}</h3>
                    <p>{copy.meaning}</p>
                  </div>
                  <div className="insights-category-numbers">
                    {/* Every listed kind has at least one mistake, so a share that rounds to 0 is not nothing. */}
                    <strong>{share === 0 && category.totalDrop > 0 ? "<1" : share}%</strong>
                    <span>of the damage</span>
                  </div>
                </div>
                <Bar value={share} tone="warning" />
                <p className="insights-category-count">
                  {plural(category.count, "time")} in {plural(category.games, "game")}
                </p>
                {examples.length > 0 && (
                  <details className="insights-examples">
                    <summary>
                      Show the {examples.length === 1 ? "worst example" : `worst ${examples.length}`}
                    </summary>
                    <ul>
                      {examples.map((leak) => (
                        <LeakExample
                          key={leak.id}
                          leak={leak}
                          game={gamesById.get(leak.gameId)}
                          onTry={onTry}
                        />
                      ))}
                    </ul>
                    {practisable.length > 1 && (
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => onPractise({ label: copy.label, ids: practisable })}
                      >
                        <IconTarget size={15} aria-hidden="true" />
                        {practisable.length === category.count
                          ? `Practise all ${practisable.length}`
                          : `Practise the ${practisable.length} ready now`}
                      </button>
                    )}
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LeakExample({
  leak,
  game,
  onTry,
}: {
  leak: Leak;
  game: ImportedGame | undefined;
  onTry: (leakId: string) => void;
}) {
  const opponent = game ? opponentOf(game) : null;
  return (
    <li className="insights-example">
      <PositionPreview fen={leak.fenBefore} color={leak.userColor} className="insights-example-board" />
      <div className="insights-example-body">
        <span className="small-label">
          {leak.severity === "blunder" ? "Blunder" : "Mistake"} · move {leak.moveNumber} as{" "}
          {colorName(leak.userColor)}
          {opponent ? ` · vs ${opponent.name}` : ""}
          {game ? ` · ${gameDate(game.endTime)}` : ""}
        </span>
        <p className="insights-example-moves">
          You played <strong>{leak.playedSan}</strong>, better was <strong>{leak.bestSan}</strong>.
        </p>
        <p className="insights-example-detail">
          Winning chances {percent(leak.winBefore)} → {percent(leak.winAfter)}
          {leak.clockSec !== null ? ` · ${clockText(leak.clockSec)} on your clock` : ""}
        </p>
        <div className="insights-example-actions">
          <button type="button" className="btn secondary" onClick={() => onTry(leak.id)}>
            Try this position
          </button>
          {game && <ExternalGameLink url={game.url}>Game on chess.com</ExternalGameLink>}
        </div>
      </div>
    </li>
  );
}

function ClockSection({ report, games }: { report: InsightsSnapshot["report"]; games: ImportedGame[] }) {
  // Mistakes without a clock reading (daily games, games without clock data) can never count as either.
  const { clockedLeaks, inTimeTrouble, hasty, lostOnTime } = report.time;
  const losses = games.filter((game) => game.outcome === "loss").length;
  return (
    <section className="insights-section" aria-labelledby="insights-clock">
      <SectionHeading id="insights-clock" title="The clock" />
      <div className="insights-card insights-stats">
        <div className="insights-stat">
          <strong>{clockedLeaks ? `${shareOf(inTimeTrouble, clockedLeaks)}%` : "–"}</strong>
          <span>
            of your mistakes were made in time trouble
            {clockedLeaks ? ` (${inTimeTrouble} of ${plural(clockedLeaks, "mistake")} with clock readings)` : ""}
          </span>
        </div>
        <div className="insights-stat">
          <strong>{clockedLeaks ? `${shareOf(hasty, clockedLeaks)}%` : "–"}</strong>
          <span>
            were played almost instantly with plenty of time left
            {clockedLeaks ? ` (${hasty} of ${plural(clockedLeaks, "mistake")} with clock readings)` : ""}
          </span>
        </div>
        <div className="insights-stat">
          <strong>{lostOnTime}</strong>
          <span>
            {lostOnTime === 1 ? "game" : "games"} lost on time
            {losses ? ` out of ${plural(losses, "loss", "losses")}` : ""}
          </span>
        </div>
        <p className="insights-footnote">
          Time trouble means that before the move your clock showed a tenth of your starting time
          or less, or 10 seconds or less, whichever is more. Almost instantly means the move took 1%
          of your starting time or less, or 2 seconds or less, whichever is more; it counts only from
          move 9 on, and only when at least a third of your starting time, and at least 30 seconds,
          was still on your clock. A quick move with less time left than that, but not yet in time
          trouble, counts as neither. Mistakes in daily games and in games without clock data have no
          clock readings and are left out of both shares.
        </p>
      </div>
    </section>
  );
}

function ConversionSection({
  report,
  gamesById,
}: {
  report: InsightsSnapshot["report"];
  gamesById: Map<string, ImportedGame>;
}) {
  const { winning, converted, blownGameIds, losing, saved } = report.conversion;
  const blown = blownGameIds
    .map((id) => gamesById.get(id))
    .filter((game): game is ImportedGame => !!game);
  return (
    <section className="insights-section" aria-labelledby="insights-conversion">
      <SectionHeading id="insights-conversion" title="Winning positions">
        A game counts as clearly winning when you had 85 or more out of 100 winning chances in at
        least two positions where you were to move (the final position also counts as one). Clearly
        losing means 15 or less, judged the same way.
      </SectionHeading>
      <div className="insights-card">
        <div className="insights-stats">
          <div className="insights-stat">
            <strong>{winning ? `${converted} of ${winning}` : "–"}</strong>
            <span>
              {winning
                ? "games where you were clearly winning ended in a win"
                : "No analysed game counts as clearly winning yet"}
            </span>
          </div>
          <div className="insights-stat">
            <strong>{losing ? `${saved} of ${losing}` : "–"}</strong>
            <span>
              {losing
                ? "games where you were clearly losing were saved with a draw or a win"
                : "No analysed game counts as clearly losing yet"}
            </span>
          </div>
        </div>
        {blown.length > 0 && (
          <>
            <h3 className="insights-subhead">Wins that got away</h3>
            <ul className="insights-game-list">
              {blown.map((game) => {
                const opponent = opponentOf(game);
                return (
                  <li key={game.id}>
                    <span>
                      <strong>{game.outcome === "draw" ? "Drawn" : "Lost"}</strong> vs {opponent.name}
                      {opponent.rating ? ` (${opponent.rating})` : ""} as {colorName(game.userColor)}
                      <small>
                        {gameDate(game.endTime)} · {game.openingName}
                      </small>
                    </span>
                    <ExternalGameLink url={game.url}>View game</ExternalGameLink>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function OpeningSection({
  openings,
  games,
  measuredIds,
}: {
  openings: OpeningStats[];
  games: ImportedGame[];
  measuredIds: Set<string>;
}) {
  const measuredByGroup = useMemo(() => {
    const counts = new Map<string, number>();
    for (const game of games) {
      if (!measuredIds.has(game.id)) continue;
      const key = `${game.userColor}:${game.openingFamily}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [games, measuredIds]);
  return (
    <section className="insights-section" aria-labelledby="insights-openings">
      <SectionHeading id="insights-openings" title="Your openings">
        Score counts a win as 1 point and a draw as half, out of the games played. After the opening
        shows your winning chances as you were about to play move 13 as White or move 12 as Black
        (or at your last move in a shorter game), averaged over the analysed games. It appears once
        at least {MIN_OPENING_GAMES} games in that opening are analysed.
      </SectionHeading>
      <div className="insights-openings">
        {(["white", "black"] as PlayerColor[]).map((color) => {
          const rows = openings.filter((opening) => opening.color === color);
          return rows.length ? (
            <OpeningTable key={color} color={color} rows={rows} measuredByGroup={measuredByGroup} />
          ) : null;
        })}
      </div>
    </section>
  );
}

function OpeningTable({
  color,
  rows,
  measuredByGroup,
}: {
  color: PlayerColor;
  rows: OpeningStats[];
  measuredByGroup: Map<string, number>;
}) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? rows : rows.slice(0, VISIBLE_OPENINGS);
  return (
    <div className="insights-card">
      <table className="insights-table">
        <caption>As {colorName(color)}</caption>
        <thead>
          <tr>
            <th scope="col">Opening</th>
            <th scope="col">Score</th>
            <th scope="col">After the opening</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((opening) => {
            const few = opening.games < MIN_OPENING_GAMES;
            const measured = measuredByGroup.get(`${color}:${opening.family}`) ?? 0;
            return (
              <tr key={opening.family} className={few ? "insights-few" : undefined}>
                <th scope="row">
                  {opening.family}
                  <small>{plural(opening.games, "game")}</small>
                </th>
                <td>{percent(opening.score)}</td>
                <td>{openingVerdict(opening.games, measured, opening.winAfterOpening)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > VISIBLE_OPENINGS && (
        <button
          type="button"
          className="insights-text-button"
          aria-expanded={showAll}
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? "Show fewer openings" : `Show ${plural(rows.length - VISIBLE_OPENINGS, "more opening")}`}
        </button>
      )}
    </div>
  );
}
