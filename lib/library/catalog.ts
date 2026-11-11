import { ADVANCED_ENDGAMES } from "@/lib/learning/advanced-endgames";
import { CURRICULUM_EXPANSION } from "@/lib/learning/curriculum-expansion";
import { LEARNING_AREAS } from "@/lib/learning/areas";
import { DEEPER_OPENINGS } from "./deeper-openings";
import { OPENING_COVERS } from "./opening-covers";
import { Chess } from "chess.js";
import { EXTRA_OPENINGS, OPENING_VARIATIONS } from "./opening-content";
import { LESSONS } from "@/lib/learning/curriculum";

export interface OpeningLine {
  id: string;
  title: string;
  description: string;
  moves: string[];
  notes: string[];
}
export interface OpeningStudy {
  lineName?: string;
  variations?: OpeningLine[];
  id: string;
  title: string;
  side: "White" | "Black";
  description: string;
  moves: string[];
  notes: string[];
  themes: string[];
}
const BASE_OPENINGS: OpeningStudy[] = [
  {
    id: "italian-game",
    title: "Italian Game",
    side: "White",
    description: "Develop toward the center, then decide when to play d4.",
    moves: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "c3",
      "Nf6",
      "d3",
      "d6",
      "O-O",
    ],
    themes: ["Development", "Central breaks", "King safety"],
    notes: [
      "e4 takes space and opens the bishop’s diagonal.",
      "Black meets your pawn in the center.",
      "Nf3 develops with an attack on e5.",
      "Nc6 develops and defends e5.",
      "Bc4 points toward f7 and clears the king’s path to castle.",
      "Black also develops toward the center.",
      "c3 prepares d4. That central break needs support.",
      "Black develops and puts pressure on e4.",
      "d3 protects e4 while keeping the center stable.",
      "Black supports the e5 pawn.",
      "Castling completes the first phase. Next, finish development and prepare d4.",
    ],
  },
  {
    id: "queens-gambit",
    title: "Queen’s Gambit",
    side: "White",
    description:
      "Challenge Black’s center with the c-pawn, then develop behind it.",
    moves: [
      "d4",
      "d5",
      "c4",
      "e6",
      "Nc3",
      "Nf6",
      "Bg5",
      "Be7",
      "e3",
      "O-O",
      "Nf3",
    ],
    themes: ["Pawn tension", "Development", "Space"],
    notes: [
      "d4 claims a central square.",
      "Black does the same.",
      "c4 challenges d5 from the side. If Black captures, you can work to regain the pawn.",
      "e6 defends d5 and opens the bishop’s diagonal.",
      "Nc3 adds another attacker to d5.",
      "Black develops a knight and contests e4.",
      "Bg5 pins the knight to the queen for the moment.",
      "Be7 breaks the pin against the queen.",
      "e3 opens your light-squared bishop.",
      "Black gets the king safe.",
      "Nf3 develops the last knight. Finish development before starting an attack.",
    ],
  },
  {
    id: "london-system",
    title: "London System",
    side: "White",
    description:
      "Build a stable center without forgetting what your opponent is doing.",
    moves: [
      "d4",
      "d5",
      "Bf4",
      "Nf6",
      "e3",
      "e6",
      "Nf3",
      "Bd6",
      "Bg3",
      "O-O",
      "Bd3",
    ],
    themes: ["Piece placement", "Pawn structure", "Development"],
    notes: [
      "Claim a central square.",
      "Black stakes out the center.",
      "Develop the bishop before e3 closes its diagonal.",
      "Black brings a knight toward the center.",
      "e3 supports d4 and opens the other bishop.",
      "Black prepares to develop the dark-squared bishop.",
      "Nf3 supports d4 and clears a square for castling.",
      "Black challenges the active bishop.",
      "Bg3 keeps your bishop. Exchanging on d6 is also possible.",
      "Black castles. Compare your king safety.",
      "Bd3 develops toward the kingside. Castle next when it is safe.",
    ],
  },
  {
    id: "scotch-game",
    title: "Scotch Game",
    side: "White",
    description: "Open the center early and develop with tempo.",
    moves: ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4", "Nf6", "Nc3"],
    themes: ["Central breaks", "Open lines", "Development"],
    notes: [
      "Claim space.",
      "Black matches the central pawn.",
      "Develop and attack e5.",
      "Black defends e5.",
      "d4 challenges the center before developing a bishop.",
      "Black releases the pawn tension.",
      "The knight recaptures in the center. Check how Black can challenge it.",
      "Black develops with an attack on e4.",
      "Nc3 develops and defends e4. Now decide where your bishops belong.",
    ],
  },
  {
    id: "caro-kann",
    title: "Caro–Kann Defense",
    side: "Black",
    description:
      "Prepare d5 with c6 and give the light-squared bishop a route out.",
    moves: ["e4", "c6", "d4", "d5", "e5", "Bf5", "Nf3", "e6", "Be2", "Nd7"],
    themes: ["Pawn chains", "Bishop development", "Central breaks"],
    notes: [
      "White starts with central space.",
      "c6 prepares d5, supported by a pawn.",
      "White builds a broad center.",
      "d5 challenges e4.",
      "White advances and gains space, but the pawn chain gives you targets.",
      "Develop the bishop outside the pawn chain before e6.",
      "White develops a knight.",
      "e6 supports d5 and opens your dark-squared bishop.",
      "White prepares to castle.",
      "Nd7 develops and supports a later ...c5 or ...f6 break. Time the break to the position.",
    ],
  },
  {
    id: "sicilian-defense",
    title: "Sicilian Defense",
    side: "Black",
    description:
      "Trade a wing pawn for a central pawn and play an unbalanced position.",
    moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
    themes: ["Asymmetry", "Open files", "Central control"],
    notes: [
      "White claims the center.",
      "c5 controls d4 from the flank.",
      "White prepares d4.",
      "d6 supports the e5 square and opens the bishop.",
      "White opens the center.",
      "You trade the c-pawn for White’s d-pawn.",
      "White recaptures with an active knight.",
      "Nf6 develops and attacks e4.",
      "White develops and defends e4.",
      "a6 prevents a piece landing on b5. This is the Najdorf setup; do not copy ...a6 when the center needs an immediate response.",
    ],
  },
  {
    id: "french-defense",
    title: "French Defense",
    side: "Black",
    description:
      "Challenge the base of a pawn chain instead of pushing against its head.",
    moves: ["e4", "e6", "d4", "d5", "e5", "c5", "c3", "Nc6", "Nf3", "Qb6"],
    themes: ["Pawn chains", "Counterplay", "Pressure on d4"],
    notes: [
      "White takes central space.",
      "e6 prepares d5.",
      "White builds a second central pawn.",
      "d5 challenges the center.",
      "White closes the center with e5.",
      "c5 attacks the base of White’s pawn chain on d4.",
      "White reinforces d4.",
      "Nc6 adds pressure to d4.",
      "White develops and defends the center.",
      "Qb6 attacks d4 and b2. Keep developing; pressure is useful only if your pieces can join in.",
    ],
  },
  {
    id: "queens-gambit-declined",
    title: "Queen’s Gambit Declined",
    side: "Black",
    description:
      "Keep a foothold in the center and solve your bishop’s development.",
    moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Nf3", "Be7", "Bg5", "O-O"],
    themes: ["Central stability", "Development", "King safety"],
    notes: [
      "White claims d4.",
      "Meet the pawn in the center.",
      "White challenges d5 with the c-pawn.",
      "e6 reinforces d5, but limits the c8 bishop for now.",
      "White develops toward the center.",
      "Develop a knight and support d5.",
      "White develops another piece.",
      "Be7 clears the path for castling.",
      "White pins the knight against the queen.",
      "Castle, then look for ...c5 or ...b6 to help your position. The c8 bishop still needs a plan.",
    ],
  },
];
export const OPENINGS: OpeningStudy[] = [
  ...BASE_OPENINGS,
  ...EXTRA_OPENINGS,
  ...DEEPER_OPENINGS,
].map((study) => ({
  ...study,
  variations: OPENING_VARIATIONS[study.id] ?? study.variations ?? [],
}));

export function openingLines(study: OpeningStudy): OpeningLine[] {
  return [
    {
      id: "main",
      title: study.lineName ?? "First example",
      description: study.description,
      moves: study.moves,
      notes: study.notes,
    },
    ...(study.variations ?? []),
  ];
}

export interface Collection {
  id: string;
  title: string;
  category: "Fundamentals" | "Tactics" | "Endgames" | "Openings";
  description: string;
  lessonIds: string[];
  fen: string;
  detail: string;
  takeaways: string[];
}
function lessonFen(id: string) {
  return LESSONS.find((lesson) => lesson.id === id)!.fen;
}
export const COLLECTIONS: Collection[] = [
  {
    id: "opening-essentials",
    title: "Opening essentials",
    category: "Fundamentals",
    description: "Control the center. Develop. Castle.",
    lessonIds: [
      "claim-center",
      "develop-knight",
      "castle-king",
      "central-break",
    ],
    fen: lessonFen("central-break"),
    detail:
      "Build a position in which your pieces have useful squares and your king can leave the center. These four decisions connect the first pawn move to a central break.",
    takeaways: [
      "Which pawn moves open a piece’s path",
      "How development creates threats",
      "When your position is ready for d4",
    ],
  },
  {
    id: "checks-and-replies",
    title: "Get out of check",
    category: "Fundamentals",
    description: "Capture, block, or move the king.",
    lessonIds: ["capture-checker", "block-check"],
    fen: lessonFen("block-check"),
    detail:
      "Being in check narrows your choices. Compare all three kinds of response, then verify that the resulting king square is safe.",
    takeaways: [
      "When the king can capture a checking piece",
      "How to trace a checking line",
      "Why some checks cannot be blocked",
    ],
  },
  {
    id: "hanging-pieces",
    title: "Stop leaving pieces behind",
    category: "Tactics",
    description: "Find loose pieces and count the exchange.",
    lessonIds: ["loose-queen", "exchange-value"],
    fen: lessonFen("loose-queen"),
    detail:
      "Start with the board’s immediate captures. A piece can be undefended, or defended but still worth taking. Count what both sides lose.",
    takeaways: [
      "A quick capture scan before each move",
      "The difference between defended and safe",
      "How to calculate a recapture",
    ],
  },
  {
    id: "double-attacks",
    title: "Two threats, one move",
    category: "Tactics",
    description: "Find checking forks with knights and pawns.",
    lessonIds: ["knight-fork", "pawn-fork"],
    fen: lessonFen("knight-fork"),
    detail:
      "A threat against the king forces a reply. Use that tempo to attack a second target and learn to recognize the knight’s reach.",
    takeaways: [
      "Shared knight-fork squares",
      "Why check makes a fork forcing",
      "Which target is left after the king moves",
    ],
  },
  {
    id: "mating-patterns",
    title: "Find the finish",
    category: "Tactics",
    description: "Read escape squares before giving check.",
    lessonIds: ["back-rank", "mating-net"],
    fen: lessonFen("mating-net"),
    detail:
      "A checking move is not enough. Account for every escape, capture and block, first with a rook and then in a different mating net.",
    takeaways: [
      "How pawns can trap their own king",
      "How a king supports a mating queen",
      "A complete checkmate checklist",
    ],
  },
  {
    id: "pawn-endings",
    title: "Make your king count",
    category: "Endgames",
    description: "Opposition, pawn races, and promotion.",
    lessonIds: [
      "promote-pawn",
      "opposition",
      "active-king",
      "knight-promotion",
    ],
    fen: lessonFen("opposition"),
    detail:
      "In a pawn ending, the king becomes an active piece. Look at promotion squares, king access and spare pawn moves before choosing a plan.",
    takeaways: [
      "How to take direct opposition",
      "Why a spare pawn move matters",
      "What changes after promotion",
    ],
  },
  {
    id: "rook-endings",
    title: "Rook and pawn technique",
    category: "Endgames",
    description: "Support the passer. Cut off the king.",
    lessonIds: ["rook-support", "rook-finish", "blockade-passer"],
    fen: lessonFen("rook-support"),
    detail:
      "Give your rook a clear job. Support a passed pawn from behind, or use it to cut off a king while your own king covers the escape squares.",
    takeaways: [
      "Where to put a rook behind a passed pawn",
      "How a king and rook divide the board",
      "The final mating position",
    ],
  },
  {
    id: "queen-endings",
    title: "Mate with king and queen",
    category: "Endgames",
    description: "Coordinate your pieces without stalemate.",
    lessonIds: ["queen-finish"],
    fen: lessonFen("queen-finish"),
    detail:
      "A queen needs the king’s help to finish reliably. Practice the final position, then check what makes it mate rather than stalemate.",
    takeaways: [
      "Protect the checking queen",
      "Cover the last escape squares",
      "Check that the king is actually in check",
    ],
  },
  {
    id: "lines-and-pins",
    title: "Read between the pieces",
    category: "Tactics",
    description: "Pins, skewers, and double checks.",
    lessonIds: ["absolute-pin", "skewer", "double-check"],
    fen: lessonFen("absolute-pin"),
    detail:
      "A rook or bishop sees along a line. Read the pieces in order: a king behind a piece creates a pin; a king in front can invite a skewer. Moving a blocker can uncover another check.",
    takeaways: [
      "Why an absolute pin limits legal moves",
      "How a check can expose a target behind the king",
      "Why double check forces a king move",
    ],
  },
  {
    id: "king-shelter",
    title: "A safe square for the king",
    category: "Fundamentals",
    description: "Create an exit before a back-rank check.",
    lessonIds: ["escape-square"],
    fen: lessonFen("escape-square"),
    detail:
      "Castling is a beginning, not the end of king safety. Notice whether your king has a safe escape square, and weigh a pawn move against the opponent’s immediate threats.",
    takeaways: [
      "When a pawn move creates a useful flight square",
      "How to verify that the exit is safe",
      "The same idea after queenside castling",
    ],
  },
  {
    id: "pawn-decisions",
    title: "Make every pawn move count",
    category: "Fundamentals",
    lessonIds: ["pawn-capture", "recapture", "create-passer"],
    description: "Captures, recaptures and passed pawns.",
    detail:
      "Understand what changes when a pawn captures: its file, its defenders and the pawns that can stop it.",
    takeaways: [
      "Read the principle",
      "Play a guided decision",
      "Try a different board without help",
    ],
    fen: lessonFen("pawn-capture"),
  },
  {
    id: "finish-development",
    title: "Finish developing your position",
    category: "Fundamentals",
    lessonIds: ["develop-bishop", "connect-rooks", "open-file"],
    description: "Bishops, connected rooks and open files.",
    detail:
      "Give each piece a useful job, then connect your rooks and find a route into the position.",
    takeaways: [
      "Read the principle",
      "Play a guided decision",
      "Try a different board without help",
    ],
    fen: lessonFen("develop-bishop"),
  },
  {
    id: "piece-activity",
    title: "Choose useful squares",
    category: "Tactics",
    lessonIds: ["seventh-rank", "knight-outpost", "rook-cutoff"],
    description: "Active rooks and supported knights.",
    detail:
      "Piece activity is concrete: a supported outpost, an entry rank or a barrier the enemy king cannot cross.",
    takeaways: [
      "Read the principle",
      "Play a guided decision",
      "Try a different board without help",
    ],
    fen: lessonFen("seventh-rank"),
  },
  {
    id: "connected-tactics",
    title: "Connect two tactical ideas",
    category: "Tactics",
    lessonIds: [
      "queen-fork",
      "discovered-attack",
      "remove-defender",
      "forcing-first",
    ],
    description: "Double attacks, discoveries and defenders.",
    detail:
      "Work backward from a target. Identify its defender, the lines that reach it and the forcing moves that earn time.",
    takeaways: [
      "Read the principle",
      "Play a guided decision",
      "Try a different board without help",
    ],
    fen: lessonFen("queen-fork"),
  },
  {
    id: "defensive-decisions",
    title: "Defend with a clear purpose",
    category: "Fundamentals",
    lessonIds: ["escape-check", "defend-piece", "defend-mate"],
    description: "Safe king moves and interrupted threats.",
    detail:
      "Compare a safe escape, a defender and a blocked line. Name the threat before choosing the defense.",
    takeaways: [
      "Read the principle",
      "Play a guided decision",
      "Try a different board without help",
    ],
    fen: lessonFen("escape-check"),
  },
  {
    id: "named-mating-patterns",
    title: "Three coordinated mating patterns",
    category: "Tactics",
    lessonIds: ["smothered-mate", "anastasia-mate", "arabian-mate"],
    description: "Knights, rooks and escape squares.",
    detail:
      "Build each mate from the actual escape squares. Recognize smothered, Anastasia and Arabian mating patterns without skipping legal replies.",
    takeaways: [
      "Read the principle",
      "Play a guided decision",
      "Try a different board without help",
    ],
    fen: lessonFen("smothered-mate"),
  },
  {
    id: "pawn-calculation",
    title: "Calculate the pawn ending",
    category: "Endgames",
    lessonIds: ["pawn-square", "pawn-breakthrough", "rook-underpromotion"],
    description: "Pawn races, breakthroughs and promotion choices.",
    detail:
      "Count the moves to promotion, calculate capture branches and check stalemate before choosing the new piece.",
    takeaways: [
      "Read the principle",
      "Play a guided decision",
      "Try a different board without help",
    ],
    fen: lessonFen("pawn-square"),
  },
  {
    id: "practical-endings",
    title: "Make endings easier to handle",
    category: "Endgames",
    lessonIds: ["rook-distance", "trade-queens"],
    description: "Checking distance and sensible exchanges.",
    detail:
      "Use distant rook checks and compare the position after a queen trade. These decisions depend on the pieces that remain.",
    takeaways: [
      "Read the principle",
      "Play a guided decision",
      "Try a different board without help",
    ],
    fen: lessonFen("rook-distance"),
  },
{
  "id": "special-moves",
  "title": "Know the special moves",
  "category": "Fundamentals",
  "lessonIds": [
    "en-passant",
    "castle-long"
  ],
  "description": "En passant and queenside castling.",
  "detail": "Special moves change familiar rules. Learn the exact conditions, then check king safety in the resulting position.",
  "takeaways": [
    "The one-move window for en passant",
    "The king\u2019s route during long castling",
    "Why legal rights and safe squares both matter"
  ]
, "fen": lessonFen("en-passant") },
{
  "id": "piece-routes",
  "title": "Find a route for your pieces",
  "category": "Fundamentals",
  "lessonIds": [
    "knight-jump",
    "free-bishop"
  ],
  "description": "Jump over traffic or open a diagonal.",
  "detail": "A blocked position affects each piece differently. Knights jump; bishops need pawn moves to release their diagonals.",
  "takeaways": [
    "How knight destinations differ from paths",
    "Which pawn is blocking your bishop",
    "Connect a pawn move to a piece\u2019s next job"
  ]
, "fen": lessonFen("knight-jump") },
{
  "id": "wing-development",
  "title": "Develop beyond the center",
  "category": "Openings",
  "lessonIds": [
    "fianchetto",
    "bishop-retreat"
  ],
  "description": "Long diagonals and purposeful retreats.",
  "detail": "Active development is not always a move toward the opponent. A wing bishop or a safe retreat can preserve useful central influence.",
  "takeaways": [
    "Complete the fianchetto after its pawn move",
    "Preserve a bishop\u2019s diagonal under attack",
    "Recheck safe retreat squares"
  ]
, "fen": lessonFen("fianchetto") },
{
  "id": "piece-and-pawn-plans",
  "title": "Give your pieces a route and your pawns support",
  "category": "Fundamentals",
  "lessonIds": [
    "rook-lift",
    "pawn-chain"
  ],
  "description": "Rook transfers and connected pawn chains.",
  "detail": "Look past the next square: trace the rook\u2019s horizontal route and the pawns\u2019 diagonal defenders. A plan still needs to survive the opponent\u2019s reply.",
  "takeaways": [
    "Plan both legs of a rook lift",
    "Identify the base of a pawn chain",
    "Balance support against weakened king squares"
  ]
, "fen": lessonFen("rook-lift") },
{
  "id": "unusual-check-replies",
  "title": "Find the reply you almost missed",
  "category": "Tactics",
  "lessonIds": [
    "en-passant-check",
    "knight-interpose"
  ],
  "description": "Special captures and unexpected interpositions.",
  "detail": "Checks demand a legal answer, but that answer need not be a king move. Test captures and blocking squares against the whole board.",
  "takeaways": [
    "Remove a checking pawn en passant",
    "Jump onto a checking rook\u2019s line",
    "Distinguish a legal block from a safe blocker"
  ]
, "fen": lessonFen("en-passant-check") },
{
  "id": "last-rank-resources",
  "title": "Look for one last resource",
  "category": "Endgames",
  "lessonIds": [
    "capture-promotion",
    "stalemate-resource"
  ],
  "description": "Capture-promotions and a forcing draw.",
  "detail": "Late positions can turn on the precise destination of a pawn or the absence of a legal king move. Calculate the resulting board before judging the move.",
  "takeaways": [
    "Capture and promote in the same move",
    "Force the opponent to take your last mobile piece",
    "Verify no check and no legal moves for stalemate"
  ]
, "fen": lessonFen("capture-promotion") },

  ...LEARNING_AREAS.map(area => ({
    id: `course-${area.id}`, title: area.title,
    category: (area.id.includes("endings") ? "Endgames" : area.id === "opening-plans" ? "Openings" : ["king-safety","piece-activity","pawn-structures"].includes(area.id) ? "Fundamentals" : "Tactics") as Collection["category"],
    description: area.checkpoints[0], lessonIds: area.lessons.filter(id => [...CURRICULUM_EXPANSION, ...ADVANCED_ENDGAMES].some(lesson => lesson.id === id)),
    fen: lessonFen(area.lessons.find(id => [...CURRICULUM_EXPANSION, ...ADVANCED_ENDGAMES].some(lesson => lesson.id === id))!), detail: area.overview.join(" "), takeaways: area.checkpoints,
  })),

];
export function openingPositions(study: Pick<OpeningLine, "moves">) {
  const chess = new Chess();
  return [
    chess.fen(),
    ...study.moves.map((move) => {
      chess.move(move);
      return chess.fen();
    }),
  ];
}
export function openingFen(study: OpeningStudy) {
  return OPENING_COVERS[study.id] ?? openingPositions(study).at(-1)!;
}
export const LIBRARY_SAVED_KEY = "knightly_library_saved_v1";
export function readSavedItems(): string[] {
  const raw = localStorage.getItem(LIBRARY_SAVED_KEY);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (!Array.isArray(data) || data.some((item) => typeof item !== "string"))
    throw Error(
      "Saved study items could not be read. Existing data is unchanged.",
    );
  const valid = new Set([...COLLECTIONS, ...OPENINGS].map((item) => item.id));
  return [...new Set<string>(data.filter((item) => valid.has(item)))];
}
export function toggleSavedItem(id: string) {
  if (![...COLLECTIONS, ...OPENINGS].some((item) => item.id === id))
    throw Error("This study is not in the library.");
  const previous = readSavedItems();
  const next = previous.includes(id)
    ? previous.filter((item) => item !== id)
    : [...previous, id];
  localStorage.setItem(LIBRARY_SAVED_KEY, JSON.stringify(next));
  return next;
}
