import type { Sequence } from "./sequences";

export const COURSE_SEQUENCES: Sequence[] = [
  {
    id: "pawn-capture",
    title: "Pawns capture diagonally",
    phase: "middlegame",
    level: 1,
    principle:
      "A pawn moves forward into an empty square, but captures one square diagonally forward. Trace the capture before touching the piece.",
    fen: "7k/8/8/3r4/4P3/8/8/6K1 w - - 0 20",
    answers: ["exd5"],
    goal: "Capture the rook with your pawn.",
    hints: [
      "Your pawn does not capture straight ahead.",
      "The pawn on e4 can take d5.",
    ],
    explanation:
      "exd5 moves diagonally and removes the rook. The pawn now continues forward along the d-file.",
    transfer:
      "Before every pawn move, distinguish its empty advance squares from its capture squares.",
    independent: {
      fen: "7k/8/8/3r4/2P5/8/8/6K1 w - - 0 20",
      answers: ["cxd5"],
      goal: "Use the pawn to capture the rook.",
      hints: [
        "The pawn’s capture goes one rank forward.",
        "Look from c4 to d5.",
      ],
      explanation:
        "cxd5 captures toward the center. Pawn captures can go left or right; ordinary pawn advances cannot.",
    },
  },
  {
    id: "escape-check",
    title: "Find the safe king square",
    phase: "middlegame",
    level: 1,
    principle:
      "When a check cannot be captured or blocked, move the king. The destination must be outside every enemy attack, not merely away from the checking piece.",
    fen: "6k1/8/8/8/8/8/5PP1/4r1K1 w - - 0 20",
    answers: ["Kh2"],
    goal: "Escape the rook check with your king.",
    hints: [
      "The rook controls the first rank.",
      "h2 is empty and outside the rook’s line.",
    ],
    explanation:
      "Kh2 is the only legal escape. f1 and h1 are attacked along the rank; your pawns occupy f2 and g2.",
    transfer:
      "After spotting check, verify the whole destination square rather than only the checker.",
    independent: {
      fen: "6k1/8/8/8/8/8/PP6/1K3r2 w - - 0 20",
      answers: ["Kc2"],
      goal: "Find the king’s only legal reply to check.",
      hints: [
        "Staying on the first rank does not escape the rook.",
        "c2 is available.",
      ],
      explanation:
        "Kc2 leaves the checking rank. a2 and b2 are occupied, while a1 and c1 remain attacked.",
    },
  },
  {
    id: "defend-piece",
    title: "Give a piece a defender",
    phase: "middlegame",
    level: 1,
    principle:
      "A piece under attack may be defended instead of moved. Ask what would recapture the attacker, and check that adding a defender does not expose your king.",
    fen: "7k/8/8/5b2/4N3/8/5P2/6K1 w - - 0 20",
    answers: ["f3"],
    goal: "Use a pawn to defend your attacked knight.",
    hints: ["The bishop on f5 attacks e4.", "f3 makes the pawn protect e4."],
    explanation:
      "After f3, Bxe4 can be answered by fxe4. You have made a recapture possible; the knight still needs to be watched.",
    transfer:
      "When a piece is attacked, compare moving it, defending it and creating a stronger forcing threat.",
    independent: {
      fen: "7k/8/8/2b5/3N4/8/2P5/6K1 w - - 0 20",
      answers: ["c3"],
      goal: "Defend the knight with a pawn move.",
      hints: [
        "The c-pawn can guard a square on the d-file.",
        "c3 protects d4.",
      ],
      explanation:
        "After c3, Bxd4 can be answered by cxd4. A defended piece can still be attacked again, so count all the attackers.",
    },
  },
  {
    id: "recapture",
    title: "Finish the exchange",
    phase: "middlegame",
    level: 1,
    principle:
      "A capture is often only half of an exchange. Before replying elsewhere, check whether a legal recapture restores material and improves your position.",
    fen: "7k/8/8/3n4/4P3/8/8/6K1 w - - 0 20",
    answers: ["exd5"],
    goal: "Recapture the knight with your pawn.",
    hints: [
      "Your pawn attacks a square diagonally ahead.",
      "e4 can capture d5.",
    ],
    explanation:
      "exd5 removes the knight and keeps the pawn. The exercise begins just after the opponent’s capture; count the resulting material before planning further.",
    transfer:
      "After an opponent captures, examine recaptures before making an unrelated move.",
    independent: {
      fen: "7k/8/8/3b4/2P5/8/8/6K1 w - - 0 20",
      answers: ["cxd5"],
      goal: "Recapture the bishop with your pawn.",
      hints: [
        "A capture can change which file your pawn occupies.",
        "c4 can take d5.",
      ],
      explanation:
        "cxd5 recaptures toward the center. Do not assume every recapture is best in a full game; check for forcing moves first.",
    },
  },
  {
    id: "develop-bishop",
    title: "Bring a bishop into play",
    phase: "opening",
    level: 1,
    principle:
      "Once a central pawn clears a bishop’s diagonal, develop the bishop to an active square. Development and king safety usually matter more than moving the same piece repeatedly.",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    answers: ["Bc4"],
    goal: "Develop the kingside bishop toward f7.",
    hints: [
      "The e-pawn has opened a diagonal from f1.",
      "Bc4 places the bishop on the diagonal to f7.",
    ],
    explanation:
      "Bc4 develops a piece, watches f7 and clears f1 for castling. It is one sound developing choice, not a forced move.",
    transfer:
      "Connect each opening move to a useful square and the pieces it releases.",
    independent: {
      fen: "rnbqkb1r/ppp2ppp/4pn2/3p4/3P4/4PN2/PPP2PPP/RNBQKB1R w KQkq - 0 4",
      answers: ["Bd3"],
      goal: "Develop the kingside bishop toward h7.",
      hints: [
        "The bishop can travel along the cleared diagonal.",
        "Bd3 points at h7.",
      ],
      explanation:
        "Bd3 develops the bishop and clears the castling path. It does not by itself justify a sacrifice on h7.",
    },
  },
  {
    id: "connect-rooks",
    title: "Let the rooks see each other",
    phase: "opening",
    level: 2,
    principle:
      "After the minor pieces develop and the king castles, a queen move can connect the rooks. Connected rooks can coordinate, but the queen’s new square must also be safe.",
    fen: "7k/p6p/8/8/8/8/P6P/R2Q1RK1 w - - 0 20",
    answers: ["Qd2"],
    goal: "Move the queen one square forward to connect the rooks.",
    hints: [
      "The queen is the only piece between the rooks.",
      "d2 clears the first rank.",
    ],
    explanation:
      "Qd2 clears the line from a1 to f1. In a real opening, also check whether the queen helps defend the center.",
    transfer:
      "When development is nearly complete, look for a useful queen square that joins your rooks.",
    independent: {
      fen: "7k/p6p/8/8/8/8/P6P/2KR1Q1R w - - 0 20",
      answers: ["Qf2"],
      goal: "Connect the rooks with the queen’s shortest forward move.",
      hints: [
        "The rooks share the first rank but the queen blocks their view.",
        "f2 clears that line.",
      ],
      explanation:
        "Qf2 connects the rooks on d1 and h1. This is a coordination exercise, not a claim that every connected-rook position is better.",
    },
  },
  {
    id: "open-file",
    title: "Put a rook on an open file",
    phase: "middlegame",
    level: 2,
    principle:
      "An open file has no pawns of either color. A rook on that file may enter the opponent’s position; check entry squares and enemy rooks before committing.",
    fen: "7k/ppp1pppp/8/8/8/8/PPP1PPPP/R5K1 w - - 0 20",
    answers: ["Rd1"],
    goal: "Move your rook onto the only open file.",
    hints: ["Compare the files with no pawns on them.", "The d-file is open."],
    explanation:
      "Rd1 uses the pawn-free d-file. Occupying the file is the first step; a safe entry square is the next question.",
    transfer:
      "Scan pawn structure for files that let your rooks cross the board.",
    independent: {
      fen: "7k/pppp1ppp/8/8/8/8/PPPP1PPP/R5K1 w - - 0 20",
      answers: ["Re1"],
      goal: "Use the only open file for your rook.",
      hints: ["Both e-pawns are absent.", "Re1 places the rook on the e-file."],
      explanation:
        "Re1 activates the rook along the open e-file. Do not invade automatically if the entry square is defended.",
    },
  },
  {
    id: "seventh-rank",
    title: "Reach the seventh rank",
    phase: "middlegame",
    level: 2,
    principle:
      "A rook on the seventh rank can attack pawns from the side and restrict a king. Entry is useful only if the rook can remain safe or gain something concrete.",
    fen: "6k1/1pp4p/8/8/8/8/8/R5K1 w - - 0 20",
    answers: ["Ra7"],
    goal: "Bring the rook to the seventh rank to attack b7.",
    hints: [
      "The a-file is clear.",
      "Ra7 attacks the nearest pawn from the side.",
    ],
    explanation:
      "Ra7 attacks b7 and starts to restrict Black’s seventh rank. Check Black’s defenses before assuming the pawn will fall.",
    transfer:
      "An open file is a route; the seventh rank is one possible destination.",
    independent: {
      fen: "1k6/p4pp1/8/8/8/8/8/6KR w - - 0 20",
      answers: ["Rh7"],
      goal: "Enter the seventh rank and attack g7.",
      hints: ["The h-file is clear.", "Rh7 attacks g7 horizontally."],
      explanation:
        "Rh7 creates pressure on g7 from the side. A rook’s activity depends on concrete entry squares, not just its rank number.",
    },
  },
  {
    id: "knight-outpost",
    title: "Find a supported outpost",
    phase: "middlegame",
    level: 2,
    principle:
      "A knight is comfortable on a central square supported by a pawn and unavailable to an enemy pawn attack. Check exchanges and tactical threats before settling there.",
    fen: "6k1/p4p1p/8/8/3P4/5N2/8/6K1 w - - 0 20",
    answers: ["Ne5"],
    goal: "Place the knight on the central square supported by d4.",
    hints: ["The d4 pawn controls e5.", "Ne5 reaches that supported square."],
    explanation:
      "Ne5 is supported by d4, and Black has no d- or f-pawn that can chase it from e5. Other pieces can still challenge it.",
    transfer: "Use pawn control to choose where your knight belongs.",
    independent: {
      fen: "6k1/p1p4p/8/8/4P3/2N5/8/6K1 w - - 0 20",
      answers: ["Nd5"],
      goal: "Place the knight on a central outpost supported by e4.",
      hints: ["The e4 pawn protects d5.", "Nd5 uses that protection."],
      explanation:
        "Nd5 is supported by e4. Black has no c- or e-pawn able to challenge d5 in this position; an outpost is still not an invulnerable square.",
    },
  },
  {
    id: "queen-fork",
    title: "Check and attack a rook",
    phase: "middlegame",
    level: 2,
    principle:
      "A queen can make a double attack along different lines. A checking fork gains a tempo, but first make sure the queen cannot be captured.",
    fen: "r5k1/8/8/8/8/8/8/3Q2K1 w - - 0 20",
    answers: ["Qd5+"],
    goal: "Check the king and attack the rook with one queen move.",
    hints: [
      "From the center, the queen can use a diagonal and another diagonal.",
      "d5 sees g8 and a8.",
    ],
    explanation:
      "Qd5+ checks along d5–e6–f7–g8 and attacks a8 along d5–c6–b7–a8. Check the king’s reply before collecting the rook.",
    transfer:
      "Before a queen move, trace checks and loose targets from the same landing square.",
    independent: {
      fen: "1k5r/8/8/8/8/8/8/4Q1K1 w - - 0 20",
      answers: ["Qe5+"],
      goal: "Find a queen check that also attacks the rook.",
      hints: [
        "Look for two diagonals from the queen’s landing square.",
        "e5 sees b8 and h8.",
      ],
      explanation:
        "Qe5+ forks the king on b8 and rook on h8. The queen must stay safe throughout the continuation.",
    },
  },
  {
    id: "discovered-attack",
    title: "Move a blocker with tempo",
    phase: "middlegame",
    level: 2,
    principle:
      "Moving one piece can uncover an attack by another. A forcing move by the departing piece can prevent the opponent from rescuing the exposed target.",
    fen: "8/4q3/8/7k/4B3/8/8/4R1K1 w - - 0 20",
    answers: ["Bf3+"],
    goal: "Move the bishop with check to uncover the rook’s attack on the queen.",
    hints: [
      "The bishop blocks the e-file.",
      "Bf3 checks h5 along the diagonal.",
    ],
    explanation:
      "Bf3+ checks h5 and uncovers the rook’s attack on e7. After the king responds, inspect Rxe7. A discovered attack works best when the departing piece creates a forcing threat.",
    transfer:
      "Look for a useful move by a piece that stands in front of a rook, bishop or queen.",
    independent: {
      fen: "8/3q4/8/k7/3B4/8/8/3R2K1 w - - 0 20",
      answers: ["Bc3+"],
      goal: "Uncover the rook’s attack while checking with your bishop.",
      hints: [
        "The bishop must leave the d-file with tempo.",
        "Bc3 checks a5 along the diagonal.",
      ],
      explanation:
        "Bc3+ checks a5 and opens the rook’s line to d7. Check the legal king reply before taking the queen.",
    },
  },
  {
    id: "remove-defender",
    title: "Remove a queen’s defender",
    phase: "middlegame",
    level: 2,
    principle:
      "Before attacking a valuable piece, identify what protects it. Removing that defender can create a threat; the opponent may choose to save the valuable piece instead of recapturing.",
    fen: "6k1/1p6/2n5/1B2q3/8/5N2/8/6K1 w - - 0 20",
    answers: ["Bxc6"],
    goal: "Capture the knight that protects the queen on e5.",
    hints: ["The knight on c6 protects e5.", "Bxc6 removes that defender."],
    explanation:
      "After Bxc6, Nxe5 is a threat. Black can move the queen; if Black instead plays bxc6, Nxe5 wins the queen. The queen is threatened, not trapped.",
    transfer:
      "Ask which defender makes a promising capture fail, then examine forcing ways to remove it.",
    independent: {
      fen: "6k1/6p1/5n2/3q2B1/8/2N5/8/6K1 w - - 0 20",
      answers: ["Bxf6"],
      goal: "Remove the defender of the queen on d5.",
      hints: ["The f6 knight protects d5.", "Bxf6 removes the knight."],
      explanation:
        "Bxf6 threatens Nxd5. Black can save the queen, while gxf6 would allow the knight to capture it.",
    },
  },
  {
    id: "forcing-first",
    title: "Check forcing moves before retreating",
    phase: "middlegame",
    level: 2,
    principle:
      "An attacked piece does not always need to move immediately. First examine checks and mating threats; only a concrete forcing result justifies ignoring the attack.",
    fen: "r1bqkbnr/pppp1ppp/8/n3p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    answers: ["Qxf7#"],
    goal: "Your bishop is attacked. Look for a move that ends the game.",
    hints: [
      "The bishop’s diagonal to f7 is still open.",
      "Qxf7 is protected by the bishop.",
    ],
    explanation:
      "Qxf7# ends the game before Black can take the bishop on c4. This works because every king escape is covered or occupied.",
    transfer: "Compare checks before reacting automatically to an attack.",
    independent: {
      fen: "r1bqkbnr/1ppp1ppp/p7/n3p2Q/4P3/1B6/PPPP1PPP/RNB1K1NR w KQkq - 2 5",
      answers: ["Qxf7#"],
      goal: "The knight attacks your bishop. Find a stronger forcing reply.",
      hints: [
        "The bishop still protects f7 from b3.",
        "Qxf7 delivers a protected check.",
      ],
      explanation:
        "Qxf7# ignores the bishop attack for a concrete reason: checkmate. Without mate or another verified forcing gain, leaving a piece attacked can simply lose it.",
    },
    checkmate: true,
  },
  {
    id: "smothered-mate",
    title: "Recognize a smothered king",
    phase: "middlegame",
    level: 2,
    principle:
      "A knight can mate a king trapped by its own pieces. The knight’s jump matters because a rook, queen or bishop could be blocked along a line.",
    fen: "6rk/6pp/8/4N3/8/8/8/K7 w - - 0 20",
    answers: ["Nf7#"],
    goal: "Deliver a knight mate against the boxed-in king.",
    hints: [
      "Black’s rook and pawns occupy all the escape squares.",
      "Nf7 checks h8.",
    ],
    explanation:
      "Nf7# checks the king on h8. g8, g7 and h7 are occupied by Black’s own pieces, and the knight cannot be captured.",
    transfer:
      "When a king is boxed in, inspect knight checks even if other checking lines are blocked.",
    independent: {
      fen: "kr6/pp6/8/3N4/8/8/8/7K w - - 0 20",
      answers: ["Nc7#"],
      goal: "Use the knight to mate the king trapped in the other corner.",
      hints: ["Look for a knight square attacking a8.", "Nc7 checks a8."],
      explanation:
        "Nc7# works because b8, a7 and b7 are occupied. Count the actual escapes rather than assuming that every knight check is smothered mate.",
    },
    checkmate: true,
  },
  {
    id: "anastasia-mate",
    title: "Coordinate rook and knight",
    phase: "middlegame",
    level: 2,
    principle:
      "A knight can cover the king’s sideways escapes while a rook delivers a file check. Anastasia’s pattern uses the defender’s own pawn to close the remaining square.",
    fen: "8/4N1pk/8/8/8/8/K7/R7 w - - 0 20",
    answers: ["Rh1#"],
    goal: "Mate with a rook move along the first rank.",
    hints: [
      "The knight controls g6 and g8; the pawn occupies g7.",
      "Rh1 checks up the h-file.",
    ],
    explanation:
      "Rh1# covers h6, h7 and h8. The knight covers g6 and g8, while Black’s pawn blocks g7.",
    transfer:
      "Assign every escape square to a piece before declaring a mating pattern.",
    independent: {
      fen: "8/kp1N4/8/8/8/8/7K/7R w - - 0 20",
      answers: ["Ra1#"],
      goal: "Use the same rook-and-knight pattern on the a-file.",
      hints: ["The knight covers b6 and b8.", "Ra1 checks along the a-file."],
      explanation:
        "Ra1# leaves no escape: the rook owns the a-file, the knight covers b6 and b8, and Black’s pawn occupies b7.",
    },
    checkmate: true,
  },
  {
    id: "arabian-mate",
    title: "Protect the mating rook with a knight",
    phase: "middlegame",
    level: 2,
    principle:
      "In the Arabian mating pattern, a knight protects the rook next to the king and covers the king’s other escape. The rook controls the remaining rank or file.",
    fen: "7k/1R6/5N2/8/8/8/8/K7 w - - 0 20",
    answers: ["Rh7#"],
    goal: "Mate with a rook protected by your knight.",
    hints: [
      "The knight protects h7 and attacks g8.",
      "Rh7 checks from the seventh rank.",
    ],
    explanation:
      "Rh7# is protected by Nf6. The rook covers g7; the knight covers g8; the king cannot capture h7.",
    transfer:
      "Check whether a nearby knight can protect a rook’s mating entry square.",
    independent: {
      fen: "k7/6R1/2N5/8/8/8/8/7K w - - 0 20",
      answers: ["Ra7#"],
      goal: "Find the protected rook mate in the opposite corner.",
      hints: [
        "The knight protects a7 and attacks b8.",
        "Ra7 is supported by Nc6.",
      ],
      explanation:
        "Ra7# covers b7, while the knight covers b8 and protects the rook. Both pieces are necessary.",
    },
    checkmate: true,
  },
  {
    id: "rook-underpromotion",
    title: "Promote without stalemating",
    phase: "endgame",
    level: 2,
    principle:
      "A queen is not always the right promotion. If it removes every legal move without giving check, a rook promotion may keep the game alive.",
    fen: "8/1P6/8/8/8/8/5K2/7k w - - 0 20",
    answers: ["b8=R"],
    goal: "Promote while leaving the enemy king a legal move.",
    hints: [
      "A queen on b8 would also control h2 diagonally.",
      "Promoting to a rook leaves h2 available.",
    ],
    explanation:
      "b8=R avoids stalemate: Black can play Kh2. b8=Q would cover h2 while your king covers g1 and g2, leaving Black no legal move and no check.",
    transfer:
      "Before promoting, check whether the opponent has a legal reply and whether the king is in check.",
    independent: {
      fen: "8/6P1/8/8/8/8/2K5/k7 w - - 0 20",
      answers: ["g8=R"],
      goal: "Choose a promotion that avoids an immediate draw.",
      hints: [
        "A queen on g8 would control a2.",
        "A rook on g8 does not control a2.",
      ],
      explanation:
        "g8=R leaves Ka2 available. g8=Q stalemates because your king already covers b1 and b2.",
    },
  },
  {
    id: "pawn-square",
    title: "Step into the pawn’s square",
    phase: "endgame",
    level: 2,
    principle:
      "The square rule helps estimate whether a king can catch an unsupported pawn: count promotion moves, then compare the king’s route. Captures, checks and a pawn’s initial double step can change the count.",
    fen: "7k/8/8/p7/8/5K2/8/8 w - - 0 20",
    answers: ["Ke2", "Ke3", "Ke4"],
    goal: "Step inside the square of the a-pawn.",
    hints: [
      "The pawn needs four advances to promote.",
      "The e-file is the near edge of its square.",
    ],
    explanation:
      "Ke2, Ke3 or Ke4 enters the square in time. The king can then approach the promotion square as the pawn advances; Black’s distant king cannot help here.",
    transfer:
      "Count both the pawn’s moves and the king’s route before giving up a pawn race.",
    independent: {
      fen: "k7/8/8/1p6/6K1/8/8/8 w - - 0 20",
      answers: ["Kf3", "Kf4", "Kf5"],
      goal: "Enter the square of the b-pawn before it runs.",
      hints: ["The pawn needs four advances from b5.", "Reach the f-file."],
      explanation:
        "Kf3, Kf4 or Kf5 enters the pawn’s square. Continue toward b1 while watching for any king interference.",
    },
  },
  {
    id: "create-passer",
    title: "Create a passed pawn",
    phase: "endgame",
    level: 2,
    principle:
      "A passed pawn has no enemy pawn ahead of it on its own or either neighboring file. A capture can remove the last pawn that could block or challenge it.",
    fen: "7k/8/4p3/3P4/8/8/8/K7 w - - 0 20",
    answers: ["dxe6"],
    goal: "Capture to create a passed pawn.",
    hints: [
      "The enemy e-pawn is the only pawn that can challenge yours.",
      "dxe6 removes it.",
    ],
    explanation:
      "dxe6 leaves a passed e-pawn: there are no opposing pawns ahead on the d-, e- or f-files. Promotion still depends on the kings.",
    transfer: "After pawn exchanges, recheck which pawns have become passed.",
    independent: {
      fen: "7k/8/2p5/1P6/8/8/8/7K w - - 0 20",
      answers: ["bxc6"],
      goal: "Make a passed pawn by capturing the adjacent pawn.",
      hints: [
        "Compare the pawn structure after the capture.",
        "bxc6 creates a c-pawn.",
      ],
      explanation:
        "After bxc6, no enemy pawn can block or challenge the c-pawn. A passed pawn is a useful asset, not an automatic win.",
    },
  },
  {
    id: "pawn-breakthrough",
    title: "Break through a pawn chain",
    phase: "endgame",
    level: 2,
    principle:
      "Connected pawns can sometimes sacrifice themselves to create a passer. Calculate both capture branches; a breakthrough depends on the exact pawn ranks and the kings’ distance.",
    fen: "7k/ppp5/8/PPP5/8/8/8/7K w - - 0 20",
    answers: ["b6"],
    goal: "Start the pawn breakthrough with the middle pawn.",
    hints: [
      "The middle pawn can lure either outside pawn away.",
      "Try b6, then examine both captures.",
    ],
    explanation:
      "After b6 axb6, c6 bxc6 leaves a6–a7–a8. After b6 cxb6, a6 bxa6 leaves c6–c7–c8. The distant king cannot stop the resulting passer in those lines.",
    transfer:
      "Before a pawn sacrifice, calculate which pawn survives each possible recapture.",
    independent: {
      fen: "k7/5ppp/8/5PPP/8/8/8/K7 w - - 0 20",
      answers: ["g6"],
      goal: "Start a breakthrough on the kingside.",
      hints: [
        "Offer the middle pawn first.",
        "g6 creates two capture branches.",
      ],
      explanation:
        "After g6 fxg6, h6 gxh6 clears f6–f7–f8. After g6 hxg6, f6 gxf6 clears h6–h7–h8. Check the branches rather than memorizing one sacrifice.",
    },
  },
  {
    id: "rook-cutoff",
    title: "Cut the king off with a rook",
    phase: "endgame",
    level: 2,
    principle:
      "A rook can make a rank or file unavailable to the enemy king. Cutting the king off may support your own king or passer without giving check immediately.",
    fen: "8/6p1/4k3/8/6P1/8/6K1/R7 w - - 0 20",
    answers: ["Ra5"],
    goal: "Use the fifth rank to stop the king approaching your side.",
    hints: [
      "The rook can form a barrier across a rank.",
      "Ra5 controls every square on the fifth rank.",
    ],
    explanation:
      "Ra5 prevents the king on e6 from stepping onto the fifth rank. This is a restriction, not a check or a proof that the ending is won.",
    transfer: "Use a rook to restrict the enemy king, not only to give checks.",
    independent: {
      fen: "8/1p6/3k4/8/1P6/8/1K6/7R w - - 0 20",
      answers: ["Rh5"],
      goal: "Cut the enemy king off along the fifth rank.",
      hints: [
        "Look for a rank just below the opposing king.",
        "Rh5 creates the barrier.",
      ],
      explanation:
        "Rh5 restricts the king’s approach. Keep checking whether the rook can maintain its distance while your king improves.",
    },
  },
  {
    id: "rook-distance",
    title: "Give checks from a distance",
    phase: "endgame",
    level: 2,
    principle:
      "A rook checking from far away can force the king to spend moves approaching it. Check the distance and safe retreat squares instead of giving checks right next to the king.",
    fen: "8/8/8/4k3/4p3/8/8/R5K1 w - - 0 20",
    answers: ["Ra5+"],
    goal: "Give a distant horizontal rook check.",
    hints: [
      "Put the rook on the king’s rank while keeping several files between them.",
      "Ra5 checks e5.",
    ],
    explanation:
      "Ra5+ checks along the fifth rank from four files away. The king must respond, but this exercise alone does not establish a drawn ending.",
    transfer:
      "In rook endings, look for checking distance and a safe route away from the king.",
    independent: {
      fen: "8/8/8/3k4/3p4/8/8/6KR w - - 0 20",
      answers: ["Rh5+"],
      goal: "Check the king from the far side.",
      hints: [
        "Use the fifth rank without approaching the king.",
        "Rh5 checks d5.",
      ],
      explanation:
        "Rh5+ keeps the rook far from the king. Follow-up checking squares and the pawn’s support matter more than repeating checks automatically.",
    },
  },
  {
    id: "defend-mate",
    title: "Interrupt a mating diagonal",
    phase: "middlegame",
    level: 2,
    principle:
      "When a queen and bishop cooperate against your king, a pawn move can block the bishop’s support. Verify that the threatened queen capture is no longer protected.",
    fen: "7k/8/3b4/8/7q/8/5PPP/5RK1 w - - 0 20",
    answers: ["g3"],
    goal: "Block the bishop’s support of the threatened queen capture on h2.",
    hints: [
      "Trace the bishop’s diagonal from d6 to h2.",
      "g3 interrupts that diagonal.",
    ],
    explanation:
      "g3 blocks the bishop on d6. Qxh2+ would now leave the queen unprotected, allowing Kxh2. This answers the immediate mating idea; keep watching the queen.",
    transfer:
      "When defending a mating threat, identify which piece makes the queen’s entry safe.",
    independent: {
      fen: "7k/5b2/8/8/q7/8/PPP5/1KR5 w - - 0 20",
      answers: ["b3"],
      goal: "Block the bishop that supports a queen capture on a2.",
      hints: ["Trace f7–e6–d5–c4–b3–a2.", "b3 breaks the line."],
      explanation:
        "b3 cuts the bishop off from a2. Qxa2+ would no longer be protected, so Kxa2 is legal.",
    },
  },
  {
    id: "trade-queens",
    title: "Simplify a material advantage",
    phase: "endgame",
    level: 2,
    principle:
      "When ahead in material, exchanging queens can reduce attacking chances. Count the resulting material and pawn ending first; simplification is a choice, not a universal rule.",
    fen: "6k1/8/4p3/3q4/8/8/8/R2Q2K1 w - - 0 20",
    answers: ["Qxd5"],
    goal: "Offer an equal queen exchange while keeping your extra rook.",
    hints: [
      "The queens face each other on the d-file.",
      "Qxd5 can be answered by exd5.",
    ],
    explanation:
      "After Qxd5 exd5, both queens are gone and your extra rook remains. You have reduced immediate queen threats without giving back the material advantage.",
    transfer:
      "When ahead, compare the position after a queen exchange rather than trading automatically.",
    independent: {
      fen: "6k1/8/3p4/4q3/8/8/8/4Q1KR w - - 0 20",
      answers: ["Qxe5"],
      goal: "Exchange queens while retaining your rook advantage.",
      hints: [
        "Compare what is left after the pawn recaptures.",
        "Qxe5 dxe5 removes both queens.",
      ],
      explanation:
        "Qxe5 dxe5 leaves rook versus pawn with both kings. Check the resulting ending before choosing a trade in a more complex position.",
    },
  },
];
