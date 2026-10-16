import type { PhaseBreakdown } from "@/types/game";
export function PhaseStrengthCard({
  phaseStrength,
}: {
  phaseStrength: PhaseBreakdown;
}) {
  return (
    <section className="panel">
      <h2 className="font-semibold">Review coverage</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Analyzed moves with centipawn comparisons. No score is inferred for
        unplayed phases.
      </p>
      <dl className="mt-4 space-y-3">
        {Object.entries(phaseStrength).map(([phase, value]) => (
          <div key={phase} className="flex justify-between gap-4 text-sm">
            <dt className="capitalize text-zinc-300">{phase}</dt>
            <dd>
              {value === null
                ? "No analyzed moves"
                : `${value} move${value === 1 ? "" : "s"}`}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
