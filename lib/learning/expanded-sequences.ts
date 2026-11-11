import type { Sequence } from "./sequences";
import { STARTER_LESSONS } from "./starter-lessons";

const starterPractice: Record<
  string,
  Pick<Sequence, "principle" | "independent">
> = {
  "claim-center": {
    principle:
      "A central pawn move claims space and opens a diagonal for a bishop. Connect the pawn move to the piece it helps.",
    independent: {
      fen: "rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 2 2",
      answers: ["d4", "e4"],
      goal: "Your knights have developed. Occupy the center with a two-square pawn move.",
      hints: [
        "The d- and e-pawns still have room to advance.",
        "Either d4 or e4 occupies a central square.",
      ],
      explanation:
        "d4 or e4 occupies the center and opens a bishop’s diagonal. The move order changed; the purpose stayed the same. Black can challenge the pawn, so keep developing.",
    },
  },
  "develop-knight": {
    principle:
      "Develop a piece toward useful squares. When development also attacks the center, your opponent has another problem to consider.",
    independent: {
      fen: "rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/5N2/PP2PPPP/RNBQKB1R w KQkq - 0 4",
      answers: ["Nc3"],
      goal: "Develop your remaining knight and add pressure to d5.",
      hints: [
        "The b1 knight is still on its starting square.",
        "Nc3 develops while attacking d5.",
      ],
      explanation:
        "Nc3 brings the queenside knight into play and adds pressure to d5. The earlier example used Nf3 against e5; this one applies the same idea on the other side.",
    },
  },
  "castle-king": {
    principle:
      "Clear the squares between king and rook, then check that the king’s starting, crossing and landing squares are safe.",
    independent: {
      fen: "rnbqk2r/ppp2ppp/3bpn2/3p4/3P4/3BPN2/PPP2PPP/RNBQK2R w KQkq - 2 5",
      answers: ["O-O"],
      goal: "Complete kingside castling in this queen-pawn opening.",
      hints: [
        "The kingside knight and bishop have cleared the way.",
        "Move the king from e1 to g1.",
      ],
      explanation:
        "O-O moves both pieces legally. Your king is not in check, f1 and g1 are safe, and neither king nor rook has moved. The pawn structure is different, but the castling conditions are unchanged.",
    },
  },
  "loose-queen": {
    principle:
      "Scan captures before committing to a plan. Trace the whole line to a loose piece, including blockers and possible recaptures.",
    independent: {
      fen: "6k1/p6p/8/3q4/8/8/P5BP/6K1 w - - 0 24",
      answers: ["Bxd5+"],
      goal: "Win the undefended queen with a diagonal capture.",
      hints: ["The bishop has a long diagonal.", "Follow g2–f3–e4–d5."],
      explanation:
        "Bxd5+ wins the queen and checks the king on g8. Nothing blocks the diagonal and Black cannot recapture the bishop immediately.",
    },
  },
  "back-rank": {
    principle:
      "A king boxed in by its own pawns can be mated along its back rank. Check every escape before deciding that a check is mate.",
    independent: {
      fen: "1k6/ppp5/8/8/8/8/5PPP/3R2K1 w - - 0 25",
      answers: ["Rd8#"],
      goal: "Find the back-rank mate against a king on the queenside.",
      hints: [
        "The pawns on a7, b7 and c7 close the king’s escape route.",
        "Rd8 checks across the eighth rank.",
      ],
      explanation:
        "Rd8 is mate: the rook covers a8, b8 and c8; the king’s own pawns occupy a7, b7 and c7. The pattern also occurs after queenside castling.",
    },
  },
  "knight-fork": {
    principle:
      "A checking fork forces the king to respond before the second target can be saved. Verify both targets from the landing square.",
    independent: {
      fen: "3k1r2/8/8/8/3N4/8/8/6K1 w - - 0 26",
      answers: ["Ne6+"],
      goal: "Fork the king and rook with a knight check.",
      hints: [
        "Look for a square that attacks both d8 and f8.",
        "Ne6+ reaches both targets.",
      ],
      explanation:
        "Ne6+ attacks the king on d8 and rook on f8. After a king move, inspect Nxf8. The checking tempo makes the double threat useful.",
    },
  },
  "promote-pawn": {
    principle:
      "A pawn reaching the last rank must promote. Choose the piece by looking at checks, captures and stalemate in the resulting position.",
    independent: {
      fen: "k7/6P1/8/8/8/8/8/7K w - - 0 48",
      answers: ["g8=Q+"],
      goal: "Promote the g-pawn to a queen with check.",
      hints: [
        "The pawn is one step from the last rank.",
        "Move g7 to g8 with Queen selected.",
      ],
      explanation:
        "g8=Q+ creates a queen that checks along the eighth rank. The black king cannot capture it; this position is not stalemate because the king is in check.",
    },
  },
  "queen-finish": {
    principle:
      "Use your king to protect the queen and take away escape squares. Check is essential: a trapped king without check is stalemate.",
    independent: {
      fen: "k7/8/1QK5/8/8/8/8/8 w - - 0 45",
      answers: ["Qb7#"],
      goal: "Coordinate your king and queen to give mate in one.",
      hints: [
        "Your king protects b7.",
        "Qb7 checks the corner king and covers its remaining squares.",
      ],
      explanation:
        "Qb7 is protected by Kc6. The queen checks a8 and covers a7 and b8; Black has no legal reply.",
    },
  },
  "rook-finish": {
    principle:
      "The rook gives the check while your king covers the neighboring file. Keep both pieces doing different jobs.",
    independent: {
      fen: "k7/2K5/8/8/8/8/8/7R w - - 0 48",
      answers: ["Ra1#"],
      goal: "Give mate with the rook against the king on the a-file.",
      hints: ["Your king controls b8 and b7.", "Ra1 checks the a-file."],
      explanation:
        "Ra1 covers the whole a-file. Kc7 removes b8 and b7, so the king has no escape. This is the same coordination on another edge.",
    },
  },
};
export const STARTER_SEQUENCES: Sequence[] = STARTER_LESSONS.map((lesson) => ({
  ...lesson,
  ...starterPractice[lesson.id],
}));

export const EXTRA_SEQUENCES: Sequence[] = [
  {
    id: "absolute-pin",
    phase: "middlegame",
    level: 2,
    title: "Pin a piece to the king",
    principle:
      "A piece between an enemy line-piece and its king cannot move off that line. This is an absolute pin. A pin restricts movement; it does not always win material.",
    goal: "Develop your bishop to b5, pinning the knight to its king.",
    fen: "4k3/3n3p/8/8/8/8/P6P/5BK1 w - - 0 20",
    answers: ["Bb5"],
    hints: [
      "Trace a diagonal through the knight on d7 to the king on e8.",
      "The bishop can reach b5 from f1.",
    ],
    explanation:
      "Bb5 lines up bishop, knight and king. Moving the knight off that diagonal would expose check, so those knight moves are illegal.",
    transfer:
      "Look beyond an attacked piece. Is its king behind it on the same line?",
    independent: {
      fen: "4k3/p6p/8/4b3/8/8/P6P/R5K1 w - - 0 24",
      answers: ["Re1"],
      goal: "Use the rook to pin the bishop to its king.",
      hints: [
        "The bishop and king share the e-file.",
        "Re1 puts a rook on that file.",
      ],
      explanation:
        "Re1 pins the bishop on e5 to Ke8. A bishop cannot stay on the e-file by moving, so it cannot move while the pin remains.",
    },
  },
  {
    id: "skewer",
    phase: "middlegame",
    level: 2,
    title: "Look through the king",
    principle:
      "A skewer attacks a valuable piece with another target behind it. When the first target is the king, it must escape check, exposing the piece behind.",
    goal: "Check on the e-file to expose the queen behind the king.",
    fen: "4q3/8/4k3/8/8/8/8/R5K1 w - - 0 30",
    answers: ["Re1+"],
    hints: [
      "The king on e6 is in front of its queen on e8.",
      "Re1+ forces the king off the file.",
    ],
    explanation:
      "Re1+ skewers Ke6 and Qe8. The king must leave the file, after which the rook can capture the queen on e8.",
    transfer: "When you see a check, look behind the king for a second target.",
    independent: {
      fen: "4q3/5k2/8/7P/8/8/8/KB6 w - - 0 32",
      answers: ["Bg6+"],
      goal: "Find a bishop check that exposes the queen behind the king.",
      hints: [
        "The queen on e8 and king on f7 share a diagonal.",
        "Bg6+ checks along g6–f7–e8.",
      ],
      explanation:
        "Bg6+ makes the king leave the diagonal; h5 protects the bishop from capture. The bishop then has a line to the queen on e8. The pin kept a front piece still; this skewer forces it to move.",
    },
  },
  {
    id: "double-check",
    phase: "middlegame",
    level: 2,
    title: "Give check with two pieces",
    principle:
      "Moving a piece can uncover a rook’s check while giving a second check. Against double check, capturing or blocking just one attacker is not enough: the king must move.",
    goal: "Move the bishop to b5, giving check and uncovering the rook’s check.",
    fen: "4k3/8/8/8/8/8/4B3/4R1K1 w - - 0 28",
    answers: ["Bb5+"],
    hints: [
      "The bishop on e2 currently blocks the rook.",
      "From b5, the bishop also attacks e8.",
    ],
    explanation:
      "Bb5+ checks along the diagonal and opens the e-file for the rook. Both pieces attack Ke8, so Black must move the king.",
    transfer:
      "Before moving a piece that blocks a line, inspect what your rook or bishop will see behind it.",
    independent: {
      fen: "3k4/8/8/8/8/8/3B4/3R2K1 w - - 0 29",
      answers: ["Bg5+"],
      goal: "Uncover a rook check while giving a bishop check on another diagonal.",
      hints: [
        "The bishop is blocking the d-file.",
        "Bg5 checks along g5–f6–e7–d8.",
      ],
      explanation:
        "Bg5+ opens the d-file and checks along the diagonal. The king must leave the attack of both pieces.",
    },
  },
  {
    id: "pawn-fork",
    phase: "middlegame",
    level: 1,
    title: "Make a pawn fork",
    principle:
      "Pawns attack diagonally. A single advance can attack two pieces at once; a check makes the opponent address the king first.",
    goal: "Advance the e-pawn to fork the king and rook.",
    fen: "8/8/8/3r1k2/8/4PP2/8/6K1 w - - 0 30",
    answers: ["e4+"],
    hints: [
      "Your pawn will attack d5 and f5 from e4.",
      "e4+ is a checking pawn fork.",
    ],
    explanation:
      "e4+ attacks Kf5 and Rd5; f3 protects the forking pawn. The king must respond, leaving the rook attacked by the pawn.",
    transfer:
      "Scan pawn advances as well as piece moves when looking for double attacks.",
    independent: {
      fen: "8/8/r1k5/8/1PP5/8/8/7K w - - 0 34",
      answers: ["b5+"],
      goal: "Find the checking pawn advance that attacks a second piece.",
      hints: ["From b5, the pawn attacks a6 and c6.", "Advance b4 to b5."],
      explanation:
        "b5+ forks Kc6 and Ra6; c4 protects the pawn on b5. The same two diagonal attacks work far from the center.",
    },
  },
  {
    id: "escape-square",
    phase: "middlegame",
    level: 1,
    title: "Leave your king an exit",
    principle:
      "A safe pawn move can give a castled king a flight square. First check that the new square is not attacked and that making the pawn move ignores no urgent threat.",
    goal: "Move the h-pawn one square to give your king an exit on h2.",
    fen: "4r1k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 24",
    answers: ["h3"],
    hints: [
      "The king needs a safe square off the first rank.",
      "h3 vacates h2.",
    ],
    explanation:
      "h3 opens h2. If Black checks along the first rank, Kh2 is an escape in this position. Always verify whether an enemy piece controls the proposed exit.",
    transfer:
      "Before a back-rank tactic appears, notice whether your king has a safe flight square.",
    independent: {
      fen: "3r2k1/6pp/8/8/8/8/PPP5/1K5R w - - 0 26",
      answers: ["a3"],
      goal: "Create a flight square for the queenside king by moving its rook-pawn one square.",
      hints: [
        "The a-pawn occupies a potential exit.",
        "a3 makes a2 available.",
      ],
      explanation:
        "a3 opens a2 for Kb1. Against ...Rd1+, Ka2 escapes. King safety has the same logic on either wing.",
    },
  },
  {
    id: "active-king",
    phase: "endgame",
    level: 1,
    title: "Bring the king into play",
    principle:
      "With queens off the board and few immediate threats, the king can defend pawns and help them advance. Check the destination for attacks before centralizing.",
    goal: "Bring your king to e4, where it directly protects the f4 pawn.",
    fen: "1k6/p7/8/8/5P2/3K4/8/8 w - - 0 42",
    answers: ["Ke4"],
    hints: [
      "The king can protect a neighboring pawn.",
      "e4 is safe and adjacent to f4.",
    ],
    explanation:
      "Ke4 improves the king and protects f4. This is a useful positional goal, not a claim that the pawn ending is a forced win.",
    transfer:
      "In a quiet endgame, ask which pawn needs your king and how the king can reach it safely.",
    independent: {
      fen: "7k/7p/8/8/P7/2K5/8/8 w - - 0 44",
      answers: ["Kb4"],
      goal: "Bring the king alongside the a-pawn to protect it.",
      hints: [
        "Find a safe king square adjacent to a4.",
        "Kb4 protects the pawn directly.",
      ],
      explanation:
        "Kb4 supports a4 and brings the king toward the pawn’s route. Continue comparing the enemy king’s approach and pawn tempos.",
    },
  },
  {
    id: "blockade-passer",
    phase: "endgame",
    level: 1,
    title: "Block the promotion square",
    principle:
      "A pawn cannot advance into an occupied square. A rook can stop an advanced passer by occupying its promotion square when that rook is safe there.",
    goal: "Put your rook on a1 to stop the a-pawn from promoting.",
    fen: "7k/8/8/8/8/8/p7/1R5K w - - 0 50",
    answers: ["Ra1"],
    hints: [
      "The pawn wants to move from a2 to a1.",
      "Ra1 occupies that destination.",
    ],
    explanation:
      "Ra1 stops ...a1=Q because a1 is occupied. The pawn cannot capture straight ahead. Your rook can capture a2 on a later move if the position permits.",
    transfer:
      "Against an advanced passer, identify its promotion square and safe ways to control or occupy it.",
    independent: {
      fen: "6k1/8/8/8/8/8/5p2/K6R w - - 0 52",
      answers: ["Rf1"],
      goal: "Block the black pawn’s promotion with the rook.",
      hints: ["The pawn’s destination is f1.", "Move the rook from h1 to f1."],
      explanation:
        "Rf1 occupies the promotion square safely. Black cannot move the pawn forward or capture the rook diagonally from f2.",
    },
  },
  {
    id: "knight-promotion",
    phase: "endgame",
    level: 2,
    title: "Promote with a fork",
    principle:
      "You do not have to choose a queen. A knight promotion can give a forcing check that a queen cannot. Compare the resulting attacks before choosing.",
    goal: "Promote to a knight with check, forking the king and rook.",
    fen: "8/4P1k1/3r4/8/8/8/8/K7 w - - 0 55",
    answers: ["e8=N+"],
    hints: [
      "A knight on e8 attacks g7 and d6.",
      "Choose Knight in the promotion control, then move e7 to e8.",
    ],
    explanation:
      "e8=N+ checks Kg7 and attacks Rd6. A queen on e8 would not give this check. This exercise practices the forcing fork, rather than claiming a queen promotion is always wrong.",
    transfer:
      "When promoting, inspect knight checks as well as queen checks, especially with nearby targets.",
    independent: {
      fen: "8/1P1k4/r7/8/8/8/8/7K w - - 0 56",
      answers: ["b8=N+"],
      goal: "Use an underpromotion to give a checking fork.",
      hints: [
        "A knight on b8 attacks d7 and a6.",
        "Promote b7 to a knight on b8.",
      ],
      explanation:
        "b8=N+ forks Kd7 and Ra6. The king must answer the check, leaving the rook attacked.",
    },
  },
];
