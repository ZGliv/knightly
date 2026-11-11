import { DEFAULT_POSITION } from "chess.js";
import type { Lesson } from "./curriculum";

export const STARTER_LESSONS: Lesson[] = [
  {
    id: "claim-center",
    phase: "opening",
    level: 1,
    title: "Claim some space",
    goal: "Move a central pawn two squares to claim space and open a path for a bishop.",
    fen: DEFAULT_POSITION,
    answers: ["e4", "d4"],
    hints: [
      "The four central squares are d4, e4, d5 and e5.",
      "Try the pawn on e2 or d2. It can advance two squares.",
    ],
    explanation:
      "e4 and d4 both occupy the center and open a diagonal for a bishop. This is one useful opening plan; other first moves are playable too.",
    transfer: "Before a pawn move, ask which piece it helps you develop.",
  },
  {
    id: "develop-knight",
    phase: "opening",
    level: 1,
    title: "Develop with a threat",
    goal: "Bring your kingside knight toward the center and attack Black’s e5 pawn.",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    answers: ["Nf3"],
    hints: [
      "Develop a piece that is still on its starting square.",
      "The knight on g1 can reach f3, where it attacks e5.",
    ],
    explanation:
      "Nf3 develops a piece, attacks e5 and clears g1 for castling. A move can improve your position and create a threat at the same time.",
    transfer: "Look for developing moves that make your opponent respond.",
  },
  {
    id: "castle-king",
    phase: "opening",
    level: 2,
    title: "Give your king a home",
    goal: "Castle kingside: move the king two squares toward the rook.",
    fen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    answers: ["O-O"],
    hints: [
      "Your kingside knight and bishop have already moved.",
      "Move the king from e1 to g1. The rook moves to f1 automatically.",
    ],
    explanation:
      "O-O moves the king away from the center and brings the rook toward the center. Castling is only legal when the king’s starting, crossing and landing squares are safe.",
    transfer:
      "Develop the pieces between king and rook, then check whether castling is safe.",
  },
  {
    id: "loose-queen",
    phase: "middlegame",
    level: 1,
    title: "Spot the loose piece",
    goal: "Win the undefended black queen in one move.",
    fen: "6k1/ppp2ppp/8/8/4q3/8/PPP2PPP/4R1K1 w - - 0 20",
    answers: ["Rxe4"],
    hints: [
      "Scan captures before choosing a quiet move.",
      "Your rook on e1 has an open line to the queen on e4.",
    ],
    explanation:
      "Rxe4 takes an undefended queen. Before you commit to a plan, check whether either side has left valuable material unprotected.",
    transfer:
      "After each opponent move, scan checks, captures and threats for both sides.",
  },
  {
    id: "back-rank",
    phase: "middlegame",
    level: 1,
    title: "Read the escape squares",
    goal: "Deliver checkmate in one move.",
    checkmate: true,
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 20",
    answers: ["Re8#"],
    hints: [
      "Black’s own pawns block the king’s escape toward the seventh rank.",
      "Use the rook to give check along the eighth rank.",
    ],
    explanation:
      "Re8 is checkmate: the rook covers the back rank, and Black’s pawns block the escape squares. Checking a king is stronger when it has nowhere to go.",
    transfer:
      "When a king is boxed in, inspect forcing checks before calculating quiet moves.",
  },
  {
    id: "knight-fork",
    phase: "middlegame",
    level: 2,
    title: "Make two threats",
    goal: "Give a knight check that also attacks Black’s rook.",
    fen: "1r3k2/8/8/4N3/8/8/8/6K1 w - - 0 20",
    answers: ["Nd7+"],
    hints: [
      "A knight can attack two pieces that are far apart.",
      "From d7, the knight attacks both f8 and b8.",
    ],
    explanation:
      "Nd7+ forks the king on f8 and rook on b8. Black must answer the check before addressing the threatened rook.",
    transfer:
      "When the king and another piece share a knight’s reach, look for a forcing fork.",
  },
  {
    id: "promote-pawn",
    phase: "endgame",
    level: 1,
    title: "Finish the pawn’s journey",
    goal: "Promote the a-pawn to a queen.",
    fen: "7k/P7/8/8/8/8/8/7K w - - 0 40",
    answers: ["a8=Q+"],
    hints: [
      "A pawn promotes when it reaches the farthest rank.",
      "Move a7 to a8 with Queen selected in the promotion control.",
    ],
    explanation:
      "a8=Q creates a queen and gives check. Promotion is a concrete endgame goal; always inspect the resulting position for stalemate or an immediate capture.",
    transfer:
      "Count the moves to promotion and the squares the opposing king can reach.",
  },
  {
    id: "queen-finish",
    phase: "endgame",
    level: 1,
    title: "Let your king help",
    goal: "Use your queen and king together to deliver checkmate in one.",
    checkmate: true,
    fen: "7k/8/5KQ1/8/8/8/8/8 w - - 0 40",
    answers: ["Qg7#"],
    hints: [
      "A queen next to the opposing king needs protection.",
      "Your king protects g7. Can your queen use that square?",
    ],
    explanation:
      "Qg7 is mate: the queen checks, your king protects her, and every escape is covered. Without the king’s support, the queen could be captured.",
    transfer:
      "Before declaring mate, check captures, blocks and all king escapes.",
  },
  {
    id: "rook-finish",
    phase: "endgame",
    level: 2,
    title: "Close the last file",
    goal: "Deliver checkmate in one with your rook.",
    checkmate: true,
    fen: "7k/5K2/8/8/8/8/8/R7 w - - 0 40",
    answers: ["Rh1#"],
    hints: [
      "Your king already covers g8 and g7.",
      "Use your rook to check along the h-file.",
    ],
    explanation:
      "Rh1 is mate. The rook covers the h-file while the king prevents an escape onto g8 or g7. The pieces divide the job of controlling squares.",
    transfer:
      "In rook endings, use the king to cover escapes while the rook cuts off a rank or file.",
  },
];
