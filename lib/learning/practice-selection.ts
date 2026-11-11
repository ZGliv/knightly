import { practicePositions, type Sequence } from './sequences';
import { revisitSchedule } from './schedule';
import type { Attempt } from './progress';

/** Colors share a position identity: flipping a board is not a new unseen exercise. */
export function selectPracticePosition(lesson: Sequence, attempts: Attempt[], now = Date.now()) {
  const pool = practicePositions(lesson).map(position => {
    const history = attempts.filter(a => a.lessonId === lesson.id && a.stage === 'transfer' &&
      (a.positionId ?? 'transfer-1') === position.positionId && Date.parse(a.at) <= now)
      .sort((a,b) => Date.parse(a.at)-Date.parse(b.at));
    const last = history.at(-1);
    return { position, last, schedule: revisitSchedule(history, now) };
  });
  // Return to supported/not-yet boards when due, then introduce unseen boards.
  const needingHelp = pool.filter(p => p.last && p.last.outcome !== 'independent' && p.schedule.due)
    .sort((a,b) => a.schedule.dueAt-b.schedule.dueAt)[0];
  if (needingHelp) return needingHelp.position;
  const unseen = pool.find(p => !p.last);
  if (unseen) return unseen.position;
  return [...pool].sort((a,b) => Date.parse(a.last!.at)-Date.parse(b.last!.at))[0].position;
}
