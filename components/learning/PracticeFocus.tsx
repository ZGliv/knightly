import Link from "next/link";
import { isPlayerPly } from "@/lib/chess/player";
import type { SavedGame } from "@/types/game";
import { getPhaseForPly } from "@/lib/utils/phase";
import { PHASE_PROMPTS } from "@/lib/learning/progress";
import { PHASE_LABELS } from "@/lib/learning/curriculum";

export function PracticeFocus({ game }: { game: SavedGame }) {
  const pieceCount = (game.fenFinal.split(" ")[0].match(/[prnbqk]/gi) ?? []).length;
  const phase = getPhaseForPly(game.moves.length + 1, pieceCount);
  const ownMoves = game.moves.filter((move) => isPlayerPly(move.ply, game.playerColor));
  const candidate = [...ownMoves].reverse().find((move) => (move.cpLoss ?? 0) >= 100) ?? ownMoves.at(-1);
  return <section className="panel space-y-3 border-emerald-400/20">
    <p className="text-xs font-medium uppercase tracking-widest text-emerald-300">Before your next move · {PHASE_LABELS[phase]}</p>
    <h2 className="text-lg font-semibold">Give yourself one thing to look for.</h2>
    <p className="text-sm leading-6 text-zinc-300">{PHASE_PROMPTS[phase]}</p>
    {candidate ? <><Link href={`/learn?game=${game.id}&ply=${candidate.ply}`} className="btn secondary">Revisit your {candidate.san} decision</Link><p className="text-xs leading-5 text-zinc-400">Go back to the exact position before move {Math.ceil(candidate.ply / 2)}. The coach rechecks it, lets you try another move, and remembers how much help you needed. Your full game stays saved.</p></> : <p className="text-xs leading-5 text-zinc-400">After you play, revisit your own decisions with the coach. No preset puzzle required.</p>}
  </section>;
}
