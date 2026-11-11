import { Chess } from "chess.js";
import type { Attempt } from "./progress";
import type { Lesson, PracticeLine } from "./curriculum";

/** Authored example replies, not claims that every reply is forced or optimal. */
export const FOLLOW_THROUGH: Record<string, Pick<Lesson, "followThrough" | "explanation">> = {
  "knight-fork": {
    followThrough: [{ reply: "Kd7", answers: ["Nxf8+"], goal: "The king escaped the check. Collect the other target of your fork.", hints: ["The rook is still on f8.", "Your knight on e6 can capture f8 with check."] }],
    explanation: "Ne6+ forks the king and rook. In this line the king moves to d7, so Nxf8+ collects the rook. Finding the fork was only the first half of the tactic. This stripped-down board is then a draw: a lone knight and king cannot mate a lone king.",
  },
  "pawn-fork": {
    followThrough: [{ reply: "Kd6", answers: ["bxa6"], goal: "The king has moved. Win the rook with the pawn that made the fork.", hints: ["Your b5 pawn still attacks a6.", "Play bxa6 to capture the rook."] }],
    explanation: "b5+ checks the king while attacking the rook on a6. After the example reply Kd6, bxa6 completes the fork and leaves a passed pawn.",
  },
  skewer: {
    followThrough: [{ reply: "Ke6", answers: ["Bxe8"], goal: "The king has left the diagonal. Capture the valuable piece behind it.", hints: ["Trace the diagonal from g6 through f7 to e8.", "Bxe8 wins the queen revealed by the king’s move."] }],
    explanation: "Bg6+ forces the king to leave the diagonal. After Ke6, Bxe8 wins the queen behind it. Follow the opened line all the way to the second target.",
  },
  "knight-promotion": {
    followThrough: [{ reply: "Ke6", answers: ["Nxa6"], goal: "Your new knight checked the king. Now use its fork to win the rook.", hints: ["The knight on b8 attacks a6 as well as d7.", "Nxa6 captures the rook."] }],
    explanation: "b8=N+ promotes with a checking fork. After Ke6, Nxa6 wins the rook. The knight was chosen for the immediate double threat, rather than simply for promotion value. This stripped-down board is then a draw: a lone knight and king cannot mate a lone king.",
  },
  "central-break": {
    followThrough: [{ reply: "exd4", answers: ["Nxd4"], goal: "The opponent accepted the pawn break. Recapture with your developed knight.", hints: ["Count the pawn just lost on d4 and look for an active recapture.", "Nxd4 restores the pawn balance and centralizes the knight."] }],
    explanation: "d4 challenges the center. In this example exd4 is met by Nxd4: the knight recaptures and occupies a central square. A break is a plan for the exchange that follows, not just a pawn push.",
  },
  "escape-square": {
    followThrough: [{ reply: "Rd1+", answers: ["Ka2"], goal: "The rook gives a back-rank check. Use the escape square you just made.", hints: ["Your a-pawn moved off a2, giving the king an exit.", "Ka2 steps off the first rank and out of check."] }],
    explanation: "a3 makes room on a2. After the example check Rd1+, Ka2 uses that space to escape. Making an escape square helps only when it is actually safe for your king.",
  },
  "rook-support": {
    followThrough: [
      { reply: "Kg7", answers: ["b6"], goal: "Your rook is behind the passer. Advance the pawn while keeping that support.", hints: ["The b-file is clear between rook and pawn.", "b6 advances safely and stays protected by Rb2."] },
      { reply: "Kf6", answers: ["b7"], goal: "Keep the passed pawn moving toward promotion, with the rook still behind it.", hints: ["The enemy king on f6 cannot reach b7.", "b7 brings the pawn one square from promotion."] },
    ],
    explanation: "Rb2 supports b5 from behind. Against Kg7 and Kf6 in this example, b6 and b7 keep the pawn protected as it advances. These are sample replies, not a claim that every defense follows this line.",
  },
  opposition: {
    followThrough: [{ reply: "Kd5", answers: ["Kd3"], goal: "The opposing king shifted one file. Take direct opposition again.", hints: ["Leave one square between the kings on the d-file.", "Kd3 leaves d4 between d3 and d5, with the other king to move."] }],
    explanation: "Kc3 takes direct opposition. After the sample reply Kd5, Kd3 restores the same relationship on the d-file. This practices the geometry; spare pawn moves still matter, and opposition alone is not a forced win.",
  },
};

/** Reconstruct the authored decision so retries never discard earlier correct moves. */
export function followThroughPosition(lesson: Lesson, step: number): Lesson {
  if (step === 0) return lesson;
  const chess = new Chess(lesson.fen);
  for (let index = 0; index < step; index++) {
    chess.move(index === 0 ? lesson.answers[0] : lesson.followThrough![index - 1].answers[0]);
    chess.move(lesson.followThrough![index].reply);
  }
  const decision = lesson.followThrough![step - 1];
  return { ...lesson, ...decision, fen: chess.fen(), checkmate: false };
}

export function followThroughWalkthrough(lesson: Lesson) {
  const chess = new Chess(lesson.fen);
  const moves: string[] = [];
  moves.push(chess.move(lesson.answers[0]).san);
  for (const step of lesson.followThrough ?? []) {
    moves.push(chess.move(step.reply).san);
    moves.push(chess.move(step.answers[0]).san);
  }
  return { fen: chess.fen(), moves };
}


export const REPLY_VARIANTS: Record<string, PracticeLine[]> = {
  "knight-fork": [{ id: "line-2", followThrough: [
    { reply: "Ke7", answers: ["Nxf8"], goal: "The king went to e7. Check whether your fork still wins the rook.", hints: ["Moving the king did not save the rook on f8.", "Nxf8 collects the rook; this time it is not check."] },
  ], explanation: "Ne6+ Ke7 leaves the rook on f8 attacked, so Nxf8 completes the fork. Unlike the other reply, this capture is not check. The remaining king and knight versus king is a draw by insufficient material." }],
  "pawn-fork": [{ id: "line-2", followThrough: [
    { reply: "Kb7", answers: ["bxa6+"], goal: "The king moved behind the rook. Complete the pawn fork and notice the new check.", hints: ["Your b5 pawn can still capture a6.", "bxa6+ wins the rook and checks the king on b7."] },
  ], explanation: "After b5+ Kb7, bxa6+ wins the rook with check. The pawn now attacks b7: inspect the resulting position rather than repeating the old move notation." }],
  skewer: [{ id: "line-2", followThrough: [
    { reply: "Kg7", answers: ["Bxe8"], goal: "The king chose the other side. Follow the opened diagonal to win the queen.", hints: ["The king no longer blocks g6–f7–e8.", "Bxe8 still captures the queen."] },
  ], explanation: "Bg6+ Kg7 is a different king escape, but the same diagonal opens. Bxe8 wins the queen. Reacting sometimes means confirming that the original tactic still works." }],
  "knight-promotion": [{ id: "line-2", followThrough: [
    { reply: "Kc7", answers: ["Nxa6+"], goal: "The king moved toward the rook. Can your promoted knight capture with another check?", hints: ["A knight on a6 attacks the king’s new square, c7.", "Capture the rook on a6 with your knight."] },
  ], explanation: "b8=N+ makes the checking fork. After the king’s different escape, capture the rook on a6. The final lone knight and king versus king is a draw by insufficient material." }],
  "central-break": [{ id: "line-2", followThrough: [
    { reply: "Nxd4", answers: ["Nxd4"], goal: "This time a knight took your central pawn. Remove it with your developed knight.", hints: ["The knight on d4 can be captured by your f3 knight.", "Nxd4 exchanges the active knights; watch for the pawn’s recapture."] },
    { reply: "exd4", answers: ["Qxd4"], goal: "The pawn recaptured your knight. Finish the exchange without leaving material behind.", hints: ["The d-file between your queen and d4 is now open.", "Qxd4 recovers the pawn and completes the exchange."] },
  ], explanation: "d4 Nxd4 Nxd4 exd4 Qxd4 trades the central pawns and a pair of knights. When the opponent captures with a different piece, calculate the entire exchange again. This is an example continuation, not a complete opening repertoire." }],
  "escape-square": [{ id: "line-2", followThrough: [
    { reply: "Rd4", answers: ["c3"], goal: "The rook left the back rank. Attack it with a pawn while opening another exit for your king.", hints: ["A pawn on c3 would attack the rook on d4 and vacate c2.", "c3 gains a tempo against the rook and makes c2 available to your king."] },
  ], explanation: "After a3 Rd4, c3 attacks the rook while opening c2 as another king exit. React to the rook’s new square instead of automatically playing Ka2. Before using either escape square, check whether the opponent controls it." }],
  "rook-support": [{ id: "line-2", followThrough: [
    { reply: "f5", answers: ["b6"], goal: "The opponent starts pawn counterplay. Continue advancing your supported passer.", hints: ["The f-pawn cannot stop your b-pawn directly.", "b6 keeps the passed pawn protected by the rook on b2."] },
    { reply: "f4", answers: ["b7"], goal: "The other pawn advances again. Bring yours one move from promotion.", hints: ["Your pawn is closer to promotion, and b7 is safe.", "b7 stays supported by Rb2 and threatens to promote next move."] },
  ], explanation: "Rb2 f5 b6 f4 b7 follows a different defense: a pawn race instead of king movement. The rook keeps supporting the passer. Always check the opposing pawn’s threats rather than assuming every race is safe." }],
  opposition: [{ id: "line-2", followThrough: [
    { reply: "Kb5", answers: ["Kb3"], goal: "The opposing king moved left instead of right. Re-establish direct opposition on its new file.", hints: ["Match the king’s b-file, leaving b4 between the kings.", "Kb3 takes direct opposition to the king on b5."] },
  ], explanation: "Kc3 Kb5 calls for Kb3, not the Kd3 move from the other line. Follow the opposing king’s file. This trains opposition geometry, not a forced win; spare pawn moves still matter." }],
};

export function practiceLines(lesson: Lesson): PracticeLine[] {
  return lesson.followThrough ? [
    { id: "line-1", followThrough: lesson.followThrough, explanation: lesson.explanation },
    ...(lesson.replyVariants ?? []),
  ] : [];
}

/** Freeze selection at exercise start. History is shared across colors and never rewritten. */
export function selectPracticeLine(lesson: Lesson, positionId: string, attempts: Attempt[], now = Date.now()) {
  const lines = practiceLines(lesson);
  const lastSeen = (id: string) => Math.max(-1, ...attempts.filter(a =>
    a.lessonId === lesson.id && a.stage === (positionId === "guided" ? "guided" : "transfer") &&
    (a.positionId ?? (a.stage === "guided" ? "guided" : "transfer-1")) === positionId && a.movesRequired !== undefined &&
    (a.lineId ?? "line-1") === id && Date.parse(a.at) <= now,
  ).map(a => Date.parse(a.at)));
  const selected = [...lines].sort((a,b) => lastSeen(a.id) - lastSeen(b.id))[0];
  return selected ? { lesson: { ...lesson, followThrough: selected.followThrough, explanation: selected.explanation }, lineId: selected.id } : { lesson, lineId: undefined };
}
