import { ADVANCED_ENDGAMES } from "./advanced-endgames";
import { FOLLOW_THROUGH, REPLY_VARIANTS } from "./follow-through";
import { CURRICULUM_EXPANSION } from "./curriculum-expansion";
import { DEEPER_SEQUENCES } from "./deeper-content";
import { EXTRA_PRACTICE } from "./practice-positions";
import { COURSE_SEQUENCES } from "./course-content";
import { STARTER_SEQUENCES, EXTRA_SEQUENCES } from "./expanded-sequences";
import type { Lesson } from "./curriculum";

export type PracticeStage = "guided" | "transfer";
export interface Sequence extends Lesson {
  principle: string;
  independent: Pick<
    Lesson,
    "fen" | "answers" | "goal" | "hints" | "explanation"
  > & Pick<Lesson, "followThrough" | "replyVariants">;
}

export const SEQUENCES: Sequence[] = [
  ...STARTER_SEQUENCES,
  {
    id: "mating-net",
    phase: "middlegame",
    level: 1,
    title: "Check every escape",
    principle:
      "For a mating move, the king must be in check with no safe escape, capture or block. Count the opponent’s replies instead of stopping when you see a check.",
    goal: "Deliver checkmate with your rook, using the opponent’s pawns to close the escape squares.",
    fen: "7k/6pp/8/8/8/8/5PPP/1R4K1 w - - 0 25",
    answers: ["Rb8#"],
    checkmate: true,
    hints: [
      "The enemy king cannot use its own pawns’ squares.",
      "Rb8 checks along the back rank and covers g8.",
    ],
    explanation:
      "Rb8 is mate: the rook covers g8 and h8, the pawns occupy g7 and h7, and Black has no capture or block. Every response is accounted for.",
    transfer:
      "For each candidate check, name the king’s escapes, possible captures and possible blocks.",
    independent: {
      fen: "k7/2Q5/1K6/8/8/8/7P/8 w - - 0 40",
      answers: ["Qb7#"],
      goal: "Find a check that leaves no legal reply. This time your king can help.",
      hints: [
        "A checking queen next to the king needs protection.",
        "Your king protects b7; the queen can use that square.",
      ],
      explanation:
        "Qb7 is mate. Your king protects the queen, while the queen covers a7, a8 and b8. This mating net uses a supporting king rather than the opponent’s pawns.",
    },
  },
  {
    id: "central-break",
    phase: "opening",
    level: 2,
    title: "Challenge the center",
    principle:
      "Development prepares pawn breaks. Before opening the center, check which pieces can use the new lines and how the opponent can capture.",
    goal: "Challenge the e5 pawn with your d-pawn, opening the center for your developed pieces.",
    fen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    answers: ["d4"],
    hints: [
      "A pawn can challenge another pawn without capturing it immediately.",
      "Advance d2 to d4 and consider ...exd4.",
    ],
    explanation:
      "d4 attacks e5 and opens the c1 bishop’s diagonal. Black can capture on d4; opening the center creates work for both sides, not a free pawn.",
    transfer:
      "Before a pawn break, name the opponent’s capture and your planned reply.",
    independent: {
      fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
      answers: ["d4"],
      goal: "Choose a central pawn break that directly challenges Black’s advanced pawn.",
      hints: [
        "Compare pawn moves that attack e5.",
        "The d-pawn can advance two squares.",
      ],
      explanation:
        "d4 is the Scotch opening’s central challenge. After ...exd4, Nxd4 develops an already active knight into the center. This is a plan, not the only playable move.",
    },
  },
  {
    id: "capture-checker",
    phase: "middlegame",
    level: 1,
    title: "Can you take the checker?",
    principle:
      "When checked, consider capturing the checking piece before moving away. A king may capture only if the destination is not attacked.",
    goal: "Escape check by capturing the undefended queen with your king.",
    fen: "7k/p6p/8/8/8/8/P3q2P/4K3 w - - 0 20",
    answers: ["Kxe2"],
    hints: [
      "The checking piece is next to your king. Is it protected?",
      "The queen on e2 has no defender; try Kxe2.",
    ],
    explanation:
      "Kxe2 removes the checking queen. None of Black’s remaining pieces attacks e2, so the king can safely capture.",
    transfer:
      "When in check, compare capture, block and king move; verify every landing square.",
    independent: {
      fen: "k7/pp6/8/8/8/8/P6q/6K1 w - - 0 28",
      answers: ["Kxh2"],
      goal: "Find a safe response to check that wins material.",
      hints: [
        "Check whether the attacking piece is defended.",
        "Your king can capture on h2.",
      ],
      explanation:
        "Kxh2 is safe: neither the distant king nor the pawns attacks h2. Moving away would miss a queen.",
    },
  },
  {
    id: "block-check",
    phase: "middlegame",
    level: 1,
    title: "Put something in the way",
    principle:
      "A rook, bishop or queen checks along a line. A piece can sometimes block that line. Knight checks and adjacent checks cannot be blocked.",
    goal: "Block the rook’s check with your bishop.",
    fen: "k3r3/p6p/8/8/8/8/P6P/4KB2 w - - 0 22",
    answers: ["Be2"],
    hints: [
      "Look at the open e-file between rook and king.",
      "The bishop on f1 can block on e2.",
    ],
    explanation:
      "Be2 puts the bishop between e8 and e1. The king protects e2, so ...Rxe2+ can be met by Kxe2.",
    transfer:
      "Trace the checking line and compare all legal blocks with captures and king moves.",
    independent: {
      fen: "2r4k/p6p/8/8/8/1P6/P6P/2K2B2 w - - 0 25",
      answers: ["Bc4"],
      goal: "Answer the check by interposing your bishop.",
      hints: [
        "Trace the rook’s file down to your king.",
        "The diagonal from f1 meets that file at c4.",
      ],
      explanation:
        "Bc4 blocks the c-file. The b3 pawn protects the bishop on c4. It solves the immediate check; it does not mean the resulting endgame is won. Always continue checking threats after a defensive move.",
    },
  },
  {
    id: "exchange-value",
    phase: "middlegame",
    level: 2,
    title: "Count the whole exchange",
    principle:
      "A defended piece can still be worth capturing. Count what you gain and what you lose after the recapture, using approximate piece values.",
    goal: "Trade your rook for the queen, even though a pawn can recapture.",
    fen: "6k1/p6p/4p3/3q4/8/8/P6P/3R2K1 w - - 0 24",
    answers: ["Rxd5"],
    hints: [
      "A queen is usually worth more than a rook.",
      "Rxd5 gains a queen; ...exd5 gives back a rook.",
    ],
    explanation:
      "After Rxd5 exd5 you gained a queen (about 9) for a rook (about 5). A recapture does not automatically make an exchange bad.",
    transfer:
      "Before capturing, calculate the opponent’s recapture and count both sides’ losses.",
    independent: {
      fen: "7k/p5r1/8/8/8/8/PB5P/6K1 w - - 0 30",
      answers: ["Bxg7+"],
      goal: "Choose a capture that gains more material than it gives up after the recapture.",
      hints: [
        "Compare bishop and rook values.",
        "The bishop can take g7; the king can then recapture.",
      ],
      explanation:
        "Bxg7+ Kxg7 exchanges a bishop (about 3) for a rook (about 5). The king’s recapture was part of the calculation.",
    },
  },
  {
    id: "opposition",
    phase: "endgame",
    level: 2,
    title: "Make the other king yield",
    principle:
      "Kings facing each other with one square between cannot move toward each other. With the opponent to move, you hold direct opposition; pawn moves can change who must yield.",
    goal: "Advance your king to take direct opposition.",
    fen: "8/7p/4k3/8/8/4K3/P7/8 w - - 0 40",
    answers: ["Ke4"],
    hints: [
      "Leave one empty square between the kings on the same file.",
      "Ke4 leaves e5 between your king and e6.",
    ],
    explanation:
      "After Ke4 the kings face each other across e5, and Black is to move. Black may still use a pawn move: opposition is a tool, not an automatic win.",
    transfer:
      "In king-and-pawn endings, count spare pawn moves as well as king moves.",
    independent: {
      fen: "8/7p/8/2k5/8/8/2K4P/8 w - - 0 42",
      answers: ["Kc3"],
      goal: "Place the kings in direct opposition with the opponent to move.",
      hints: [
        "Look for one empty square between the kings.",
        "Kc3 leaves c4 between c3 and c5.",
      ],
      explanation:
        "Kc3 takes opposition on a different file. A pawn tempo can still change the situation; do not infer a forced win from the shape alone.",
    },
  },
  {
    id: "rook-support",
    phase: "endgame",
    level: 1,
    title: "Support from behind",
    principle:
      "A rook behind a passed pawn can support its advance along the file. Check for immediate threats first; this is a useful plan, not an exceptionless rule.",
    goal: "Place the rook behind your passed e-pawn.",
    fen: "6k1/7p/8/4P3/8/8/8/R5K1 w - - 0 40",
    answers: ["Re1"],
    hints: [
      "The rook needs the same file as the pawn.",
      "Move the rook from a1 to e1.",
    ],
    explanation:
      "Re1 supports the e-pawn from behind. As the pawn advances, the rook keeps protecting it along the file.",
    transfer:
      "Identify passed pawns and ask whether your rook can support their advance safely.",
    independent: {
      fen: "6k1/5p2/8/1P6/8/8/7R/6K1 w - - 0 45",
      answers: ["Rb2"],
      goal: "Improve your rook so it supports the passed pawn from behind.",
      hints: [
        "Find the passed pawn’s file.",
        "Rb2 puts the rook behind the b-pawn.",
      ],
      explanation:
        "Rb2 supports b5 and its later advance. The rook can keep its distance while the pawn gains space.",
    },
  },
  ...EXTRA_SEQUENCES,
  ...COURSE_SEQUENCES,
  ...DEEPER_SEQUENCES,
  ...CURRICULUM_EXPANSION,
  ...ADVANCED_ENDGAMES,
];

/** Reflect ranks and swap colors: legal chess symmetry, including pawn direction. */
export function lessonForSide(
  lesson: Lesson,
  color: "white" | "black",
): Lesson {
  if (color === "white") return lesson;
  const parts = lesson.fen.split(" ");
  parts[0] = parts[0]
    .split("/")
    .reverse()
    .join("/")
    .replace(/[a-z]/gi, (c) =>
      c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase(),
    );
  parts[1] = parts[1] === "w" ? "b" : "w";
  parts[2] = parts[2].replace(/[a-z]/gi, (c) =>
    c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase(),
  );
  if (parts[3] !== "-") parts[3] = parts[3][0] + (9 - Number(parts[3][1]));
  const reflect = (text: string) =>
    text.replace(
      /White|Black|white|black|[a-h][1-8]/g,
      (value) =>
        ({ White: "Black", Black: "White", white: "black", black: "white" })[
          value
        ] ?? value[0] + (9 - Number(value[1])),
    );
  return {
    ...lesson,
    fen: parts.join(" "),
    answers: lesson.answers.map(reflect),
    goal: reflect(lesson.goal),
    hints: lesson.hints.map(reflect) as [string, string],
    explanation: reflect(lesson.explanation),
    transfer: reflect(lesson.transfer),
    replyVariants: lesson.replyVariants?.map(line => ({
      ...line, explanation: reflect(line.explanation),
      followThrough: line.followThrough.map(step => ({
        reply: reflect(step.reply), answers: step.answers.map(reflect),
        goal: reflect(step.goal), hints: step.hints.map(reflect) as [string, string],
      })),
    })),
    followThrough: lesson.followThrough?.map(step => ({
      reply: reflect(step.reply), answers: step.answers.map(reflect),
      goal: reflect(step.goal), hints: step.hints.map(reflect) as [string, string],
    })),
  };
}
export function sequencePosition(
  lesson: Lesson,
  stage: PracticeStage,
  color: "white" | "black",
  positionId = "transfer-1",
) {
  const sequence = SEQUENCES.find((item) => item.id === lesson.id);
  return lessonForSide(
    stage === "transfer" && sequence
      ? { ...lesson, ...(practicePositions(sequence).find(p => p.positionId === positionId) ?? practicePositions(sequence)[0]) }
      : lesson,
    color,
  );
}

/** Stable IDs preserve the original transfer board and all historical attempts. */
export function practicePositions(sequence: Sequence) {
  return [sequence.independent, ...(EXTRA_PRACTICE[sequence.id] ?? [])].map((position, index) => ({
    ...position, positionId: `transfer-${index + 1}`,
    ...(index === 0 && FOLLOW_THROUGH[sequence.id] ? { ...FOLLOW_THROUGH[sequence.id], replyVariants: REPLY_VARIANTS[sequence.id] } : {}),
  }));
}
