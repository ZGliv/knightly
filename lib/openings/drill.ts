import { revisitSchedule } from "@/lib/learning/schedule";
import { playUci, type RepertoireData, type RepertoireMove } from "./repertoire";
import { positionKey, TREE_PLIES, turnOf, type MoveStat, type OpeningTree } from "./tree";

/**
 * Whether a prepared position is due for practice. Never-drilled positions are due; after that the
 * shared revisit schedule applies: a wrong answer brings it back in 15 minutes, right answers on
 * separate days space it out to 1, 3 and then 7 days.
 */
export function isDue(data: RepertoireData, key: string, now: number): boolean {
  return revisitSchedule(data.reviews[key] ?? [], now).due;
}

/** When a prepared position next comes up, in Unix milliseconds. */
export function dueAt(data: RepertoireData, key: string, now: number): number {
  return revisitSchedule(data.reviews[key] ?? [], now).dueAt;
}

/**
 * Prepared positions the drill can actually reach: the repertoire move on the player's turns and
 * replies real opponents played (from the imported games) on theirs, within the first 12 moves.
 */
export function drillableKeys(tree: OpeningTree, data: RepertoireData): Set<string> {
  const color = tree.color;
  const found = new Set<string>();
  const visited = new Set<string>();
  const stack: { key: string; fen: string; ply: number }[] = [{ key: tree.rootKey, fen: tree.nodes[tree.rootKey].fen, ply: 0 }];
  while (stack.length) {
    const { key, fen, ply } = stack.pop()!;
    if (visited.has(key) || ply >= TREE_PLIES) continue;
    visited.add(key);
    if (turnOf(fen) === color) {
      const chosen = data.moves[key];
      if (!chosen) continue;
      found.add(key);
      const next = playUci(fen, chosen.uci);
      if (next) stack.push({ key: positionKey(next.fen), fen: next.fen, ply: ply + 1 });
    } else {
      for (const reply of tree.nodes[key]?.moves ?? [])
        stack.push({ key: reply.childKey, fen: reply.childFen, ply: ply + 1 });
    }
  }
  return found;
}

export function dueKeys(tree: OpeningTree, data: RepertoireData, now: number): Set<string> {
  return new Set([...drillableKeys(tree, data)].filter((key) => isDue(data, key, now)));
}

/** True when a due position can be reached from this one by the drill. */
function leadsToDue(tree: OpeningTree, data: RepertoireData, key: string, fen: string, due: Set<string>): boolean {
  const visited = new Set<string>();
  const stack = [{ key, fen }];
  while (stack.length) {
    const current = stack.pop()!;
    if (visited.has(current.key)) continue;
    visited.add(current.key);
    if (due.has(current.key)) return true;
    if (turnOf(current.fen) === tree.color) {
      const chosen = data.moves[current.key];
      const next = chosen && playUci(current.fen, chosen.uci);
      if (next) stack.push({ key: positionKey(next.fen), fen: next.fen });
    } else {
      for (const reply of tree.nodes[current.key]?.moves ?? []) stack.push({ key: reply.childKey, fen: reply.childFen });
    }
  }
  return false;
}

/**
 * The opponent's reply in a drill, chosen in proportion to how often real opponents played it
 * against this player. Replies that lead to a position due for practice are preferred, so due
 * positions come up first. Null when the player's games have no reply here.
 */
export function pickReply(
  tree: OpeningTree,
  data: RepertoireData,
  fen: string,
  due: Set<string>,
  random: () => number = Math.random,
): MoveStat | null {
  const replies = tree.nodes[positionKey(fen)]?.moves ?? [];
  if (!replies.length) return null;
  const towardDue = due.size ? replies.filter((r) => leadsToDue(tree, data, r.childKey, r.childFen, due)) : [];
  return weightedPick(towardDue.length ? towardDue : replies, random);
}

export function weightedPick(replies: MoveStat[], random: () => number): MoveStat {
  const total = replies.reduce((sum, r) => sum + r.count, 0);
  let roll = Math.min(Math.max(random(), 0), 0.999999) * total;
  for (const reply of replies) {
    roll -= reply.count;
    if (roll < 0) return reply;
  }
  return replies[replies.length - 1];
}

export type DrillStep =
  /** The player must play their prepared move. */
  | { kind: "answer"; fen: string; key: string; expected: RepertoireMove }
  /** The player is to move and has nothing prepared here. */
  | { kind: "unprepared"; fen: string; key: string }
  /** The opponent replies with this move. */
  | { kind: "reply"; fen: string; move: MoveStat }
  /** The line is over: the opening stage is done, or the player's games have no reply here. */
  | { kind: "end"; fen: string; reason: "depth" | "no-games" };

/** What happens next in a drill from `fen`, reached after `ply` plies. */
export function nextStep(
  tree: OpeningTree,
  data: RepertoireData,
  fen: string,
  ply: number,
  due: Set<string>,
  random: () => number = Math.random,
): DrillStep {
  if (ply >= TREE_PLIES) return { kind: "end", fen, reason: "depth" };
  const key = positionKey(fen);
  if (turnOf(fen) === tree.color) {
    const expected = data.moves[key];
    return expected ? { kind: "answer", fen, key, expected } : { kind: "unprepared", fen, key };
  }
  const move = pickReply(tree, data, fen, due, random);
  return move ? { kind: "reply", fen, move } : { kind: "end", fen, reason: "no-games" };
}

/** Whether the move played matches the prepared one. */
export function isRightAnswer(expected: RepertoireMove, uci: string): boolean {
  // A pawn reaching the last rank without a piece chosen counts as a queen, as on the board.
  const normal = (m: string) => (m.length === 4 && expected.uci.length === 5 ? m + "q" : m);
  return normal(uci) === expected.uci;
}

/** Plain-English wait until a position comes back. */
export function untilText(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
