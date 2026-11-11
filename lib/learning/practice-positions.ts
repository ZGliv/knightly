import type { Lesson } from "./curriculum";

// Static reviewed practice positions. Tactical pairs include file-reflected pattern practice;
// opening/castling pairs use legal move orders. IDs are stable by array position.
export const EXTRA_PRACTICE: Record<string, Pick<Lesson, "fen" | "answers" | "goal" | "hints" | "explanation">[]> = {
  "loose-queen": [
    {
      "fen": "7k/7p/8/5q2/3N4/8/P7/6K1 w - - 0 20",
      "answers": [
        "Nxf5"
      ],
      "goal": "Capture the undefended queen with your knight.",
      "hints": [
        "The knight can jump over intervening squares.",
        "Consider Nxf5."
      ],
      "explanation": "Nxf5 wins the queen with a jump rather than a line-piece capture. Check the landing square for possible recaptures."
    },
    {
      "fen": "k7/p7/8/2q5/4N3/8/7P/1K6 w - - 0 1",
      "answers": [
        "Nxc5"
      ],
      "goal": "Capture the undefended queen with your knight.",
      "hints": [
        "The knight can jump over intervening squares.",
        "Consider Nxc5."
      ],
      "explanation": "Nxc5 wins the queen with a jump rather than a line-piece capture. Check the landing square for possible recaptures."
    }
  ],
  "back-rank": [
    {
      "fen": "5k2/4ppp1/8/8/8/8/1R6/7K w - - 0 20",
      "answers": [
        "Rb8#"
      ],
      "goal": "Find a rook mate along the back rank.",
      "hints": [
        "Check every neighboring square of the king.",
        "Consider Rb8#."
      ],
      "explanation": "Rb8 checks across the eighth rank. The pawns close e7, f7 and g7, and the rook covers the remaining king squares."
    },
    {
      "fen": "2k5/1ppp4/8/8/8/8/6R1/K7 w - - 0 1",
      "answers": [
        "Rg8#"
      ],
      "goal": "Find a rook mate along the back rank.",
      "hints": [
        "Check every neighboring square of the king.",
        "Consider Rg8#."
      ],
      "explanation": "Rg8 checks across the eighth rank. The pawns close d7, c7 and b7, and the rook covers the remaining king squares."
    }
  ],
  "knight-fork": [
    {
      "fen": "8/2k1r3/8/8/8/2N5/8/6K1 w - - 0 20",
      "answers": [
        "Nd5+"
      ],
      "goal": "Give a knight check that also attacks the rook.",
      "hints": [
        "Trace both knight attacks from the landing square.",
        "Consider Nd5+."
      ],
      "explanation": "Nd5+ forks c7 and e7. The king must answer the check before the rook can be saved."
    },
    {
      "fen": "8/3r1k2/8/8/8/5N2/8/1K6 w - - 0 1",
      "answers": [
        "Ne5+"
      ],
      "goal": "Give a knight check that also attacks the rook.",
      "hints": [
        "Trace both knight attacks from the landing square.",
        "Consider Ne5+."
      ],
      "explanation": "Ne5+ forks f7 and d7. The king must answer the check before the rook can be saved."
    }
  ],
  "promote-pawn": [
    {
      "fen": "8/3P3k/8/8/8/8/P7/K7 w - - 0 20",
      "answers": [
        "d8=Q"
      ],
      "goal": "Promote the central pawn to a queen.",
      "hints": [
        "Check the promotion square and the selected piece.",
        "Consider d8=Q."
      ],
      "explanation": "d8=Q creates a queen without check. Promotion does not have to be a checking move; Black still has legal moves."
    },
    {
      "fen": "8/k3P3/8/8/8/8/7P/7K w - - 0 1",
      "answers": [
        "e8=Q"
      ],
      "goal": "Promote the central pawn to a queen.",
      "hints": [
        "Check the promotion square and the selected piece.",
        "Consider e8=Q."
      ],
      "explanation": "e8=Q creates a queen without check. Promotion does not have to be a checking move; Black still has legal moves."
    }
  ],
  "queen-finish": [
    {
      "fen": "4k3/Q7/4K3/8/8/8/8/8 w - - 0 20",
      "answers": [
        "Qe7#"
      ],
      "goal": "Coordinate king and queen for mate in one.",
      "hints": [
        "Place the queen next to the enemy king on a protected square.",
        "Consider Qe7#."
      ],
      "explanation": "Qe7 is protected by Ke6. The queen covers the eighth-rank escapes and the king protects the checking piece."
    },
    {
      "fen": "3k4/7Q/3K4/8/8/8/8/8 w - - 0 1",
      "answers": [
        "Qd7#"
      ],
      "goal": "Coordinate king and queen for mate in one.",
      "hints": [
        "Place the queen next to the enemy king on a protected square.",
        "Consider Qd7#."
      ],
      "explanation": "Qd7 is protected by Kd6. The queen covers the eighth-rank escapes and the king protects the checking piece."
    }
  ],
  "rook-finish": [
    {
      "fen": "3k4/8/3K4/8/8/8/7R/8 w - - 0 20",
      "answers": [
        "Rh8#"
      ],
      "goal": "Use the rook and king to finish on the back rank.",
      "hints": [
        "Your king already controls the rank below the enemy king.",
        "Consider Rh8#."
      ],
      "explanation": "Rh8 checks along the eighth rank. Kd6 controls c7, d7 and e7, leaving no escape."
    },
    {
      "fen": "4k3/8/4K3/8/8/8/R7/8 w - - 0 1",
      "answers": [
        "Ra8#"
      ],
      "goal": "Use the rook and king to finish on the back rank.",
      "hints": [
        "Your king already controls the rank below the enemy king.",
        "Consider Ra8#."
      ],
      "explanation": "Ra8 checks along the eighth rank. Ke6 controls f7, e7 and d7, leaving no escape."
    }
  ],
  "mating-net": [
    {
      "fen": "7k/3Q3p/5K2/8/8/8/8/8 w - - 0 20",
      "answers": [
        "Qg7#"
      ],
      "goal": "Find the protected queen check that closes every escape.",
      "hints": [
        "A queen beside the king must have protection.",
        "Consider Qg7#."
      ],
      "explanation": "Qg7# is protected by Kf6. The queen covers g8 and h7 as well as checking h8."
    },
    {
      "fen": "k7/p3Q3/2K5/8/8/8/8/8 w - - 0 1",
      "answers": [
        "Qb7#"
      ],
      "goal": "Find the protected queen check that closes every escape.",
      "hints": [
        "A queen beside the king must have protection.",
        "Consider Qb7#."
      ],
      "explanation": "Qb7# is protected by Kc6. The queen covers b8 and a7 as well as checking a8."
    }
  ],
  "capture-checker": [
    {
      "fen": "7k/7p/8/8/8/8/P1r5/2K5 w - - 0 20",
      "answers": [
        "Kxc2"
      ],
      "goal": "Escape check by taking the undefended rook.",
      "hints": [
        "Check whether the checking piece is protected before moving away.",
        "Consider Kxc2."
      ],
      "explanation": "Kxc2 removes the checking rook. The distant king and pawn do not defend c2."
    },
    {
      "fen": "k7/p7/8/8/8/8/5r1P/5K2 w - - 0 1",
      "answers": [
        "Kxf2"
      ],
      "goal": "Escape check by taking the undefended rook.",
      "hints": [
        "Check whether the checking piece is protected before moving away.",
        "Consider Kxf2."
      ],
      "explanation": "Kxf2 removes the checking rook. The distant king and pawn do not defend f2."
    }
  ],
  "block-check": [
    {
      "fen": "3r3k/8/8/8/8/2P5/P7/3K2B1 w - - 0 20",
      "answers": [
        "Bd4+"
      ],
      "goal": "Block the rook check with a bishop protected by your pawn.",
      "hints": [
        "Follow the bishop diagonal until it meets the checking file.",
        "Consider Bd4+."
      ],
      "explanation": "Bd4+ interrupts the d-file. The c3 pawn protects the bishop, so Rxd4 can be answered by cxd4."
    },
    {
      "fen": "k3r3/8/8/8/8/5P2/7P/1B2K3 w - - 0 1",
      "answers": [
        "Be4+"
      ],
      "goal": "Block the rook check with a bishop protected by your pawn.",
      "hints": [
        "Follow the bishop diagonal until it meets the checking file.",
        "Consider Be4+."
      ],
      "explanation": "Be4+ interrupts the e-file. The f3 pawn protects the bishop, so Rxe4 can be answered by fxe4."
    }
  ],
  "exchange-value": [
    {
      "fen": "7k/8/5p2/4r3/8/8/PB6/6K1 w - - 0 20",
      "answers": [
        "Bxe5"
      ],
      "goal": "Exchange your bishop for the rook, allowing a pawn recapture.",
      "hints": [
        "The rook on e5 is more valuable than the bishop.",
        "Consider Bxe5."
      ],
      "explanation": "Bxe5 fxe5 gives up a bishop for a rook. Calculate the recapture before comparing the material values."
    },
    {
      "fen": "k7/8/2p5/3r4/8/8/6BP/1K6 w - - 0 1",
      "answers": [
        "Bxd5"
      ],
      "goal": "Exchange your bishop for the rook, allowing a pawn recapture.",
      "hints": [
        "The rook on d5 is more valuable than the bishop.",
        "Consider Bxd5."
      ],
      "explanation": "Bxd5 cxd5 gives up a bishop for a rook. Calculate the recapture before comparing the material values."
    }
  ],
  "opposition": [
    {
      "fen": "8/p7/5k2/8/8/5K2/P7/8 w - - 0 20",
      "answers": [
        "Kf4"
      ],
      "goal": "Take direct opposition with the enemy king to move.",
      "hints": [
        "Find the square two ranks from the opposing king.",
        "Consider Kf4."
      ],
      "explanation": "Kf4 leaves f5 between the kings and gives Black the move. Pawn tempos can still change the situation."
    },
    {
      "fen": "8/7p/2k5/8/8/2K5/7P/8 w - - 0 1",
      "answers": [
        "Kc4"
      ],
      "goal": "Take direct opposition with the enemy king to move.",
      "hints": [
        "Find the square two ranks from the opposing king.",
        "Consider Kc4."
      ],
      "explanation": "Kc4 leaves c5 between the kings and gives Black the move. Pawn tempos can still change the situation."
    }
  ],
  "rook-support": [
    {
      "fen": "7k/7p/2P5/8/8/7R/8/6K1 w - - 0 20",
      "answers": [
        "Rc3"
      ],
      "goal": "Place the rook behind the passed c-pawn.",
      "hints": [
        "Find a rook square on the pawn’s file behind it.",
        "Consider Rc3."
      ],
      "explanation": "Rc3 supports c6 and can stay on the c-file as the pawn advances."
    },
    {
      "fen": "k7/p7/5P2/8/8/R7/8/1K6 w - - 0 1",
      "answers": [
        "Rf3"
      ],
      "goal": "Place the rook behind the passed f-pawn.",
      "hints": [
        "Find a rook square on the pawn’s file behind it.",
        "Consider Rf3."
      ],
      "explanation": "Rf3 supports f6 and can stay on the f-file as the pawn advances."
    }
  ],
  "absolute-pin": [
    {
      "fen": "2k5/8/2n5/8/8/8/P7/R5K1 w - - 0 20",
      "answers": [
        "Rc1"
      ],
      "goal": "Pin the knight to the king with your rook.",
      "hints": [
        "Read the pieces along the c-file from bottom to top.",
        "Consider Rc1."
      ],
      "explanation": "Rc1 lines up rook, knight and king on the c-file. The knight cannot move without exposing check."
    },
    {
      "fen": "5k2/8/5n2/8/8/8/7P/1K5R w - - 0 1",
      "answers": [
        "Rf1"
      ],
      "goal": "Pin the knight to the king with your rook.",
      "hints": [
        "Read the pieces along the f-file from bottom to top.",
        "Consider Rf1."
      ],
      "explanation": "Rf1 lines up rook, knight and king on the f-file. The knight cannot move without exposing check."
    }
  ],
  "skewer": [
    {
      "fen": "2q5/8/2k5/8/8/R7/8/7K w - - 0 20",
      "answers": [
        "Rc3+"
      ],
      "goal": "Check along the file to expose the queen behind the king.",
      "hints": [
        "Find a checking line through the king to the queen.",
        "Consider Rc3+."
      ],
      "explanation": "Rc3+ forces the king away from the c-file. The queen on c8 remains available to the rook after the king moves."
    },
    {
      "fen": "5q2/8/5k2/8/8/7R/8/K7 w - - 0 1",
      "answers": [
        "Rf3+"
      ],
      "goal": "Check along the file to expose the queen behind the king.",
      "hints": [
        "Find a checking line through the king to the queen.",
        "Consider Rf3+."
      ],
      "explanation": "Rf3+ forces the king away from the f-file. The queen on f8 remains available to the rook after the king moves."
    }
  ],
  "double-check": [
    {
      "fen": "5k2/8/8/8/8/8/5B2/5R1K w - - 0 20",
      "answers": [
        "Bc5+"
      ],
      "goal": "Give bishop check while uncovering the rook’s check.",
      "hints": [
        "The bishop must leave the f-file with check.",
        "Consider Bc5+."
      ],
      "explanation": "Bc5+ checks along c5–d6–e7–f8 and uncovers the rook on f1. A king move must escape both attacks."
    },
    {
      "fen": "2k5/8/8/8/8/8/2B5/K1R5 w - - 0 1",
      "answers": [
        "Bf5+"
      ],
      "goal": "Give bishop check while uncovering the rook’s check.",
      "hints": [
        "The bishop must leave the c-file with check.",
        "Consider Bf5+."
      ],
      "explanation": "Bf5+ checks along f5–e6–d7–c8 and uncovers the rook on c1. A king move must escape both attacks."
    }
  ],
  "pawn-fork": [
    {
      "fen": "8/8/2r1k3/8/3PP3/8/8/7K w - - 0 20",
      "answers": [
        "d5+"
      ],
      "goal": "Advance a protected pawn to fork the king and rook.",
      "hints": [
        "The e4 pawn protects d5.",
        "Consider d5+."
      ],
      "explanation": "d5+ forks the king on e6 and rook on c6. The e4 pawn protects the checking pawn so the king cannot capture it."
    },
    {
      "fen": "8/8/3k1r2/8/3PP3/8/8/K7 w - - 0 1",
      "answers": [
        "e5+"
      ],
      "goal": "Advance a protected pawn to fork the king and rook.",
      "hints": [
        "The d4 pawn protects e5.",
        "Consider e5+."
      ],
      "explanation": "e5+ forks the king on d6 and rook on f6. The d4 pawn protects the checking pawn so the king cannot capture it."
    }
  ],
  "escape-square": [
    {
      "fen": "r5k1/8/8/8/8/8/6PP/R6K w - - 0 20",
      "answers": [
        "h3"
      ],
      "goal": "Move the h-pawn one square to give your corner king an exit.",
      "hints": [
        "The king needs an empty safe square off the first rank.",
        "Consider h3."
      ],
      "explanation": "h3 clears h2. After a back-rank check the king can use that square if it remains unattacked."
    },
    {
      "fen": "1k5r/8/8/8/8/8/PP6/K6R w - - 0 1",
      "answers": [
        "a3"
      ],
      "goal": "Move the a-pawn one square to give your corner king an exit.",
      "hints": [
        "The king needs an empty safe square off the first rank.",
        "Consider a3."
      ],
      "explanation": "a3 clears a2. After a back-rank check the king can use that square if it remains unattacked."
    }
  ],
  "active-king": [
    {
      "fen": "k7/p7/8/5P2/8/4K3/8/8 w - - 0 20",
      "answers": [
        "Ke4",
        "Kf4"
      ],
      "goal": "Bring the king forward to protect the pawn directly.",
      "hints": [
        "Find safe fourth-rank squares adjacent to f5.",
        "Consider Ke4."
      ],
      "explanation": "Ke4 or Kf4 puts the king next to f5. The enemy king is too far away to attack either destination."
    },
    {
      "fen": "7k/7p/8/2P5/8/3K4/8/8 w - - 0 1",
      "answers": [
        "Kd4",
        "Kc4"
      ],
      "goal": "Bring the king forward to protect the pawn directly.",
      "hints": [
        "Find safe fourth-rank squares adjacent to c5.",
        "Consider Kd4."
      ],
      "explanation": "Kd4 or Kc4 puts the king next to c5. The enemy king is too far away to attack either destination."
    }
  ],
  "blockade-passer": [
    {
      "fen": "7k/8/8/8/8/8/3p4/K5R1 w - - 0 20",
      "answers": [
        "Rd1"
      ],
      "goal": "Block the pawn on its promotion square.",
      "hints": [
        "The pawn’s next forward square is d1.",
        "Consider Rd1."
      ],
      "explanation": "Rd1 occupies d1. The pawn cannot move forward onto an occupied square and cannot capture straight ahead."
    },
    {
      "fen": "k7/8/8/8/8/8/4p3/1R5K w - - 0 1",
      "answers": [
        "Re1"
      ],
      "goal": "Block the pawn on its promotion square.",
      "hints": [
        "The pawn’s next forward square is e1.",
        "Consider Re1."
      ],
      "explanation": "Re1 occupies e1. The pawn cannot move forward onto an occupied square and cannot capture straight ahead."
    }
  ],
  "knight-promotion": [
    {
      "fen": "8/3P1k2/2r5/8/8/8/8/K7 w - - 0 20",
      "answers": [
        "d8=N+"
      ],
      "goal": "Underpromote with check to fork king and rook.",
      "hints": [
        "A queen does not have the knight’s attack pattern.",
        "Consider d8=N+."
      ],
      "explanation": "d8=N+ attacks f7 and c6. The king must respond before the rook can move."
    },
    {
      "fen": "8/2k1P3/5r2/8/8/8/8/7K w - - 0 1",
      "answers": [
        "e8=N+"
      ],
      "goal": "Underpromote with check to fork king and rook.",
      "hints": [
        "A queen does not have the knight’s attack pattern.",
        "Consider e8=N+."
      ],
      "explanation": "e8=N+ attacks c7 and f6. The king must respond before the rook can move."
    }
  ],
  "pawn-capture": [
    {
      "fen": "7k/8/4r3/5P2/8/8/P7/6K1 w - - 0 20",
      "answers": [
        "fxe6"
      ],
      "goal": "Capture the rook with a diagonal pawn move.",
      "hints": [
        "Pawns capture diagonally, not straight ahead.",
        "Consider fxe6."
      ],
      "explanation": "fxe6 moves the pawn one rank forward and one file sideways, removing the rook."
    },
    {
      "fen": "k7/8/3r4/2P5/8/8/7P/1K6 w - - 0 1",
      "answers": [
        "cxd6"
      ],
      "goal": "Capture the rook with a diagonal pawn move.",
      "hints": [
        "Pawns capture diagonally, not straight ahead.",
        "Consider cxd6."
      ],
      "explanation": "cxd6 moves the pawn one rank forward and one file sideways, removing the rook."
    }
  ],
  "escape-check": [
    {
      "fen": "7k/8/8/8/8/8/2PP4/r2K4 w - - 0 20",
      "answers": [
        "Ke2"
      ],
      "goal": "Find the king’s only legal escape from the rook check.",
      "hints": [
        "Look off the first rank for an empty destination.",
        "Consider Ke2."
      ],
      "explanation": "Ke2 leaves the checking rank. c2 and d2 are occupied, while the first rank remains attacked."
    },
    {
      "fen": "k7/8/8/8/8/8/4PP2/4K2r w - - 0 1",
      "answers": [
        "Kd2"
      ],
      "goal": "Find the king’s only legal escape from the rook check.",
      "hints": [
        "Look off the first rank for an empty destination.",
        "Consider Kd2."
      ],
      "explanation": "Kd2 leaves the checking rank. f2 and e2 are occupied, while the first rank remains attacked."
    }
  ],
  "defend-piece": [
    {
      "fen": "7k/8/8/6b1/5N2/8/6P1/6K1 w - - 0 20",
      "answers": [
        "g3"
      ],
      "goal": "Use a pawn to defend the attacked knight.",
      "hints": [
        "Find a pawn move that creates a diagonal defender of f4.",
        "Consider g3."
      ],
      "explanation": "g3 protects f4. After Bxf4, gxf4 recaptures the bishop."
    },
    {
      "fen": "k7/8/8/1b6/2N5/8/1P6/1K6 w - - 0 1",
      "answers": [
        "b3"
      ],
      "goal": "Use a pawn to defend the attacked knight.",
      "hints": [
        "Find a pawn move that creates a diagonal defender of c4.",
        "Consider b3."
      ],
      "explanation": "b3 protects c4. After Bxc4, bxc4 recaptures the bishop."
    }
  ],
  "recapture": [
    {
      "fen": "7k/8/8/6r1/5P2/8/P7/6K1 w - - 0 20",
      "answers": [
        "fxg5"
      ],
      "goal": "Recapture the rook with your pawn.",
      "hints": [
        "Trace the pawn’s two capture squares.",
        "Consider fxg5."
      ],
      "explanation": "fxg5 removes the rook and shifts your pawn to the g-file. Check for stronger forcing moves before choosing a recapture in a full game."
    },
    {
      "fen": "k7/8/8/1r6/2P5/8/7P/1K6 w - - 0 1",
      "answers": [
        "cxb5"
      ],
      "goal": "Recapture the rook with your pawn.",
      "hints": [
        "Trace the pawn’s two capture squares.",
        "Consider cxb5."
      ],
      "explanation": "cxb5 removes the rook and shifts your pawn to the b-file. Check for stronger forcing moves before choosing a recapture in a full game."
    }
  ],
  "connect-rooks": [
    {
      "fen": "7k/8/8/8/8/8/P6P/1R2QRK1 w - - 0 20",
      "answers": [
        "Qe2"
      ],
      "goal": "Move the queen one square forward to connect your rooks.",
      "hints": [
        "The queen is the only blocker between the rooks.",
        "Consider Qe2."
      ],
      "explanation": "Qe2 clears the first-rank line between b1 and f1. Connected rooks can protect each other."
    },
    {
      "fen": "k7/8/8/8/8/8/P6P/1KRQ2R1 w - - 0 1",
      "answers": [
        "Qd2"
      ],
      "goal": "Move the queen one square forward to connect your rooks.",
      "hints": [
        "The queen is the only blocker between the rooks.",
        "Consider Qd2."
      ],
      "explanation": "Qd2 clears the first-rank line between g1 and c1. Connected rooks can protect each other."
    }
  ],
  "open-file": [
    {
      "fen": "7k/pp1ppppp/8/8/8/8/PP1PPPPP/R5K1 w - - 0 20",
      "answers": [
        "Rc1"
      ],
      "goal": "Put the rook on the only open file.",
      "hints": [
        "Compare every file’s pawn occupants.",
        "Consider Rc1."
      ],
      "explanation": "Rc1 uses the c-file, which has no pawns from either side. Verify entry squares before invading."
    },
    {
      "fen": "k7/ppppp1pp/8/8/8/8/PPPPP1PP/1K5R w - - 0 1",
      "answers": [
        "Rf1"
      ],
      "goal": "Put the rook on the only open file.",
      "hints": [
        "Compare every file’s pawn occupants.",
        "Consider Rf1."
      ],
      "explanation": "Rf1 uses the f-file, which has no pawns from either side. Verify entry squares before invading."
    }
  ],
  "seventh-rank": [
    {
      "fen": "7k/3pp2p/8/8/8/8/8/2R3K1 w - - 0 20",
      "answers": [
        "Rc7"
      ],
      "goal": "Enter the seventh rank to attack d7 from the side.",
      "hints": [
        "Use the clear c-file to reach the pawns’ rank.",
        "Consider Rc7."
      ],
      "explanation": "Rc7 attacks d7 horizontally. The c-file is clear and the rook is not capturable by the distant king."
    },
    {
      "fen": "k7/p2pp3/8/8/8/8/8/1K3R2 w - - 0 1",
      "answers": [
        "Rf7"
      ],
      "goal": "Enter the seventh rank to attack e7 from the side.",
      "hints": [
        "Use the clear f-file to reach the pawns’ rank.",
        "Consider Rf7."
      ],
      "explanation": "Rf7 attacks e7 horizontally. The f-file is clear and the rook is not capturable by the distant king."
    }
  ],
  "knight-outpost": [
    {
      "fen": "7k/p6p/8/8/4P3/4N3/8/6K1 w - - 0 20",
      "answers": [
        "Nd5"
      ],
      "goal": "Put the knight on the central outpost protected by e4.",
      "hints": [
        "Find a knight jump to a square defended by your pawn.",
        "Consider Nd5."
      ],
      "explanation": "Nd5 is supported by e4. Neither remaining enemy pawn can challenge this central square."
    },
    {
      "fen": "k7/p6p/8/8/3P4/3N4/8/1K6 w - - 0 1",
      "answers": [
        "Ne5"
      ],
      "goal": "Put the knight on the central outpost protected by d4.",
      "hints": [
        "Find a knight jump to a square defended by your pawn.",
        "Consider Ne5."
      ],
      "explanation": "Ne5 is supported by d4. Neither remaining enemy pawn can challenge this central square."
    }
  ],
  "queen-fork": [
    {
      "fen": "1r3k2/8/8/8/8/8/8/3Q3K w - - 0 20",
      "answers": [
        "Qd6+"
      ],
      "goal": "Check the king and attack the rook with one queen move.",
      "hints": [
        "d6 sees b8 and f8 on separate diagonals.",
        "Consider Qd6+."
      ],
      "explanation": "Qd6+ forks Kf8 and Rb8. The king must answer the check, leaving the rook attacked."
    },
    {
      "fen": "2k3r1/8/8/8/8/8/8/K3Q3 w - - 0 1",
      "answers": [
        "Qe6+"
      ],
      "goal": "Check the king and attack the rook with one queen move.",
      "hints": [
        "e6 sees g8 and c8 on separate diagonals.",
        "Consider Qe6+."
      ],
      "explanation": "Qe6+ forks Kc8 and Rg8. The king must answer the check, leaving the rook attacked."
    }
  ],
  "discovered-attack": [
    {
      "fen": "7k/5q2/8/8/5B2/8/8/5RK1 w - - 0 20",
      "answers": [
        "Be5+"
      ],
      "goal": "Move the bishop with check to uncover the rook’s attack.",
      "hints": [
        "The moving piece can check while the piece behind it attacks the queen.",
        "Consider Be5+."
      ],
      "explanation": "Be5+ checks h8 and clears the f-file toward the queen on f7. Black must answer the check before you take the queen."
    },
    {
      "fen": "k7/2q5/8/8/2B5/8/8/1KR5 w - - 0 1",
      "answers": [
        "Bd5+"
      ],
      "goal": "Move the bishop with check to uncover the rook’s attack.",
      "hints": [
        "The moving piece can check while the piece behind it attacks the queen.",
        "Consider Bd5+."
      ],
      "explanation": "Bd5+ checks a8 and clears the c-file toward the queen on c7. Black must answer the check before you take the queen."
    }
  ],
  "remove-defender": [
    {
      "fen": "7k/2p5/3n4/2B2q2/8/6N1/8/6K1 w - - 0 20",
      "answers": [
        "Bxd6"
      ],
      "goal": "Remove the knight that protects the queen.",
      "hints": [
        "Trace the knight’s protection of f5.",
        "Consider Bxd6."
      ],
      "explanation": "Bxd6 removes the defender of f5 and threatens Nxf5. Black can move the queen, so the threat is not a forced queen win."
    },
    {
      "fen": "k7/5p2/4n3/2q2B2/8/1N6/8/1K6 w - - 0 1",
      "answers": [
        "Bxe6"
      ],
      "goal": "Remove the knight that protects the queen.",
      "hints": [
        "Trace the knight’s protection of c5.",
        "Consider Bxe6."
      ],
      "explanation": "Bxe6 removes the defender of c5 and threatens Nxc5. Black can move the queen, so the threat is not a forced queen win."
    }
  ],
  "smothered-mate": [
    {
      "fen": "6rk/6pp/3N4/8/8/8/8/K7 w - - 0 20",
      "answers": [
        "Nf7#"
      ],
      "goal": "Mate the boxed-in king with a knight jump.",
      "hints": [
        "The knight starts on a different square; find its checking destination.",
        "Consider Nf7#."
      ],
      "explanation": "Nf7# checks h8. g8, g7 and h7 are occupied by the king’s own pieces."
    },
    {
      "fen": "kr6/pp6/4N3/8/8/8/8/7K w - - 0 1",
      "answers": [
        "Nc7#"
      ],
      "goal": "Mate the boxed-in king with a knight jump.",
      "hints": [
        "The knight starts on a different square; find its checking destination.",
        "Consider Nc7#."
      ],
      "explanation": "Nc7# checks a8. b8, b7 and a7 are occupied by the king’s own pieces."
    }
  ],
  "anastasia-mate": [
    {
      "fen": "8/4N1pk/8/8/8/1R6/8/K7 w - - 0 20",
      "answers": [
        "Rh3#"
      ],
      "goal": "Coordinate rook and knight for mate on the edge.",
      "hints": [
        "The rook must reach the king’s file from the third rank.",
        "Consider Rh3#."
      ],
      "explanation": "Rh3# controls the h-file. Ne7 controls g6 and g8, while g7 is blocked by Black’s pawn."
    },
    {
      "fen": "8/kp1N4/8/8/8/6R1/8/7K w - - 0 1",
      "answers": [
        "Ra3#"
      ],
      "goal": "Coordinate rook and knight for mate on the edge.",
      "hints": [
        "The rook must reach the king’s file from the third rank.",
        "Consider Ra3#."
      ],
      "explanation": "Ra3# controls the a-file. Nd7 controls b6 and b8, while b7 is blocked by Black’s pawn."
    }
  ],
  "arabian-mate": [
    {
      "fen": "7k/3R4/5N2/8/8/8/8/K7 w - - 0 20",
      "answers": [
        "Rh7#"
      ],
      "goal": "Find the rook mate supported by the knight.",
      "hints": [
        "The rook needs a protected checking square beside the king.",
        "Consider Rh7#."
      ],
      "explanation": "Rh7# is protected by Nf6. The knight also covers g8 and the rook controls g7."
    },
    {
      "fen": "k7/4R3/2N5/8/8/8/8/7K w - - 0 1",
      "answers": [
        "Ra7#"
      ],
      "goal": "Find the rook mate supported by the knight.",
      "hints": [
        "The rook needs a protected checking square beside the king.",
        "Consider Ra7#."
      ],
      "explanation": "Ra7# is protected by Nc6. The knight also covers b8 and the rook controls b7."
    }
  ],
  "rook-underpromotion": [
    {
      "fen": "1n6/2P5/8/8/8/8/5K2/7k w - - 0 20",
      "answers": [
        "cxb8=R"
      ],
      "goal": "Capture and promote to a rook, avoiding stalemate.",
      "hints": [
        "After the knight disappears, h2 is Black’s only possible king square.",
        "Consider cxb8=R."
      ],
      "explanation": "cxb8=R leaves Kh2 available. cxb8=Q would control h2 while Kf2 covers g1 and g2, causing stalemate. The knight is removed by the capture."
    },
    {
      "fen": "6n1/5P2/8/8/8/8/2K5/k7 w - - 0 1",
      "answers": [
        "fxg8=R"
      ],
      "goal": "Capture and promote to a rook, avoiding stalemate.",
      "hints": [
        "After the knight disappears, a2 is Black’s only possible king square.",
        "Consider fxg8=R."
      ],
      "explanation": "fxg8=R leaves Ka2 available. fxg8=Q would control a2 while Kc2 covers b1 and b2, causing stalemate. The knight is removed by the capture."
    }
  ],
  "pawn-square": [
    {
      "fen": "k7/8/8/1p6/8/6K1/8/8 w - - 0 20",
      "answers": [
        "Kf2",
        "Kf3",
        "Kf4"
      ],
      "goal": "Enter the square of the running b-pawn.",
      "hints": [
        "The far boundary of the pawn’s square is the f-file.",
        "Consider Kf2."
      ],
      "explanation": "The b5 pawn needs four advances to promote. Reaching the f-file enters its square; keep approaching b1 without losing time."
    },
    {
      "fen": "7k/8/8/6p1/8/1K6/8/8 w - - 0 1",
      "answers": [
        "Kc2",
        "Kc3",
        "Kc4"
      ],
      "goal": "Enter the square of the running g-pawn.",
      "hints": [
        "The far boundary of the pawn’s square is the c-file.",
        "Consider Kc2."
      ],
      "explanation": "The g5 pawn needs four advances to promote. Reaching the c-file enters its square; keep approaching g1 without losing time."
    }
  ],
  "create-passer": [
    {
      "fen": "7k/8/5p2/4P3/8/8/P7/K7 w - - 0 20",
      "answers": [
        "exf6"
      ],
      "goal": "Capture to create a passed pawn on a new file.",
      "hints": [
        "Compare the remaining enemy pawns after the capture.",
        "Consider exf6."
      ],
      "explanation": "exf6 leaves no enemy pawn on the f-file or adjacent files to block or capture the passer."
    },
    {
      "fen": "k7/8/2p5/3P4/8/8/7P/7K w - - 0 1",
      "answers": [
        "dxc6"
      ],
      "goal": "Capture to create a passed pawn on a new file.",
      "hints": [
        "Compare the remaining enemy pawns after the capture.",
        "Consider dxc6."
      ],
      "explanation": "dxc6 leaves no enemy pawn on the c-file or adjacent files to block or capture the passer."
    }
  ],
  "pawn-breakthrough": [
    {
      "fen": "7k/1ppp4/8/1PPP4/8/8/8/7K w - - 0 20",
      "answers": [
        "c6"
      ],
      "goal": "Start the three-pawn breakthrough with the middle pawn.",
      "hints": [
        "Offer the central pawn before the wing pawn.",
        "Consider c6."
      ],
      "explanation": "After c6 bxc6, d6 cxd6 frees the b-pawn. After c6 dxc6, b6 cxb6 frees the d-pawn. Calculate both branches."
    },
    {
      "fen": "k7/4ppp1/8/4PPP1/8/8/8/K7 w - - 0 1",
      "answers": [
        "f6"
      ],
      "goal": "Start the three-pawn breakthrough with the middle pawn.",
      "hints": [
        "Offer the central pawn before the wing pawn.",
        "Consider f6."
      ],
      "explanation": "After f6 bxf6, e6 fxe6 frees the g-pawn. After f6 dxf6, g6 fxg6 frees the e-pawn. Calculate both branches."
    }
  ],
  "rook-cutoff": [
    {
      "fen": "8/6p1/3k4/8/6P1/8/6K1/7R w - - 0 20",
      "answers": [
        "Rh5"
      ],
      "goal": "Cut the king off along the fifth rank.",
      "hints": [
        "Place the rook one rank below the opposing king.",
        "Consider Rh5."
      ],
      "explanation": "Rh5 controls the fifth rank from a distance, limiting the king’s approach toward your side."
    },
    {
      "fen": "8/1p6/4k3/8/1P6/8/1K6/R7 w - - 0 1",
      "answers": [
        "Ra5"
      ],
      "goal": "Cut the king off along the fifth rank.",
      "hints": [
        "Place the rook one rank below the opposing king.",
        "Consider Ra5."
      ],
      "explanation": "Ra5 controls the fifth rank from a distance, limiting the king’s approach toward your side."
    }
  ],
  "rook-distance": [
    {
      "fen": "8/8/5k2/5p2/8/8/R7/6K1 w - - 0 20",
      "answers": [
        "Ra6+"
      ],
      "goal": "Give a distant horizontal check to the king.",
      "hints": [
        "Match the king’s rank while keeping your rook far away.",
        "Consider Ra6+."
      ],
      "explanation": "Ra6+ checks f6 from five files away. The distance gives the rook room to keep checking or switch tasks."
    },
    {
      "fen": "8/8/2k5/2p5/8/8/7R/1K6 w - - 0 1",
      "answers": [
        "Rh6+"
      ],
      "goal": "Give a distant horizontal check to the king.",
      "hints": [
        "Match the king’s rank while keeping your rook far away.",
        "Consider Rh6+."
      ],
      "explanation": "Rh6+ checks c6 from five files away. The distance gives the rook room to keep checking or switch tasks."
    }
  ],
  "defend-mate": [
    {
      "fen": "7k/2b5/8/8/8/7q/5PPP/5RK1 w - - 0 20",
      "answers": [
        "g3"
      ],
      "goal": "Interrupt the bishop’s support of the threatened capture on h2.",
      "hints": [
        "Trace the bishop’s diagonal all the way to h2.",
        "Consider g3."
      ],
      "explanation": "g3 cuts c7–d6–e5–f4–g3–h2. The queen could then be captured by Kxh2 if it took h2 without protection."
    },
    {
      "fen": "k7/5b2/8/8/8/q7/PPP5/1KR5 w - - 0 1",
      "answers": [
        "b3"
      ],
      "goal": "Interrupt the bishop’s support of the threatened capture on a2.",
      "hints": [
        "Trace the bishop’s diagonal all the way to a2.",
        "Consider b3."
      ],
      "explanation": "b3 cuts f7–e6–d5–c4–b3–a2. The queen could then be captured by Kxa2 if it took a2 without protection."
    }
  ],
  "trade-queens": [
    {
      "fen": "6k1/8/3p4/2q5/8/8/8/2Q3KR w - - 0 20",
      "answers": [
        "Qxc5"
      ],
      "goal": "Exchange queens while keeping your extra rook.",
      "hints": [
        "Compare the material after the pawn recaptures.",
        "Consider Qxc5."
      ],
      "explanation": "Qxc5 dxc5 removes both queens and leaves your rook against a pawn. Always evaluate the resulting ending before trading."
    },
    {
      "fen": "1k6/8/4p3/5q2/8/8/8/RK3Q2 w - - 0 1",
      "answers": [
        "Qxf5"
      ],
      "goal": "Exchange queens while keeping your extra rook.",
      "hints": [
        "Compare the material after the pawn recaptures.",
        "Consider Qxf5."
      ],
      "explanation": "Qxf5 exf5 removes both queens and leaves your rook against a pawn. Always evaluate the resulting ending before trading."
    }
  ],
  "en-passant": [
    {
      "fen": "7k/8/8/4pP2/8/8/P7/6K1 w - e6 0 20",
      "answers": [
        "fxe6"
      ],
      "goal": "Black just played e7–e5. Capture en passant now.",
      "hints": [
        "Capture as though the pawn had stopped on e6.",
        "Consider fxe6."
      ],
      "explanation": "fxe6 removes the pawn from e5 and lands on e6. The right exists only immediately after the two-square advance."
    },
    {
      "fen": "k7/8/8/2Pp4/8/8/7P/1K6 w - d6 0 1",
      "answers": [
        "cxd6"
      ],
      "goal": "Black just played d7–d5. Capture en passant now.",
      "hints": [
        "Capture as though the pawn had stopped on d6.",
        "Consider cxd6."
      ],
      "explanation": "cxd6 removes the pawn from d5 and lands on d6. The right exists only immediately after the two-square advance."
    }
  ],
  "knight-jump": [
    {
      "fen": "7k/8/8/1P1r4/PNP5/8/8/6K1 w - - 0 20",
      "answers": [
        "Nxd5"
      ],
      "goal": "Jump through the crowded position to capture the rook.",
      "hints": [
        "Look at the knight’s L-shaped destinations, not intervening squares.",
        "Consider Nxd5."
      ],
      "explanation": "Nxd5 crosses the blocked neighborhood without needing a clear path. Only the destination and king safety determine legality."
    },
    {
      "fen": "k7/8/8/4r1P1/5PNP/8/8/1K6 w - - 0 1",
      "answers": [
        "Nxe5"
      ],
      "goal": "Jump through the crowded position to capture the rook.",
      "hints": [
        "Look at the knight’s L-shaped destinations, not intervening squares.",
        "Consider Nxe5."
      ],
      "explanation": "Nxe5 crosses the blocked neighborhood without needing a clear path. Only the destination and king safety determine legality."
    }
  ],
  "free-bishop": [
    {
      "fen": "7k/8/8/8/8/P1P5/1B4P1/6K1 w - - 0 20",
      "answers": [
        "c4+"
      ],
      "goal": "Open the bishop’s diagonal toward d4.",
      "hints": [
        "The c3 pawn is the blocker you can move.",
        "Consider c4+."
      ],
      "explanation": "c4+ clears c3, releasing the bishop along b2–c3–d4. The pawn itself moves straight forward."
    },
    {
      "fen": "k7/8/8/8/8/5P1P/1P4B1/1K6 w - - 0 1",
      "answers": [
        "f4+"
      ],
      "goal": "Open the bishop’s diagonal toward e4.",
      "hints": [
        "The f3 pawn is the blocker you can move.",
        "Consider f4+."
      ],
      "explanation": "f4+ clears f3, releasing the bishop along g2–f3–e4. The pawn itself moves straight forward."
    }
  ],
  "fianchetto": [
    {
      "fen": "rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/6P1/PP2PP1P/RNBQKBNR w KQkq - 1 4",
      "answers": [
        "Bg2"
      ],
      "goal": "Complete the kingside fianchetto in a full opening position.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider Bg2."
      ],
      "explanation": "Bg2 puts the bishop on the long diagonal. Central pawn exchanges can later change its scope."
    },
    {
      "fen": "rnbqkb1r/ppp2ppp/4pn2/3p4/8/1P2PN2/P1PP1PPP/RNBQKB1R w KQkq - 0 4",
      "answers": [
        "Bb2"
      ],
      "goal": "Complete the queenside fianchetto behind the b-pawn.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider Bb2."
      ],
      "explanation": "Bb2 develops toward g7 and h8. Finish development and watch which central pawns block the diagonal."
    }
  ],
  "rook-lift": [
    {
      "fen": "6k1/p7/8/4P3/8/8/5P1P/4R1K1 w - - 0 20",
      "answers": [
        "Re3"
      ],
      "goal": "Lift the rook to the third rank for a sideways transfer.",
      "hints": [
        "The rook can leave the back rank through the cleared e-file.",
        "Consider Re3."
      ],
      "explanation": "Re3 uses the space behind your advanced e-pawn. From there the rook can transfer if the third rank stays clear."
    },
    {
      "fen": "1k6/7p/8/3P4/8/8/P1P5/1K1R4 w - - 0 1",
      "answers": [
        "Rd3"
      ],
      "goal": "Lift the rook to the third rank for a sideways transfer.",
      "hints": [
        "The rook can leave the back rank through the cleared d-file.",
        "Consider Rd3."
      ],
      "explanation": "Rd3 uses the space behind your advanced d-pawn. From there the rook can transfer if the third rank stays clear."
    }
  ],
  "pawn-chain": [
    {
      "fen": "7k/8/5n2/3P4/2P5/8/1P6/6K1 w - - 0 20",
      "answers": [
        "b3"
      ],
      "goal": "Reinforce the base of the c4–d5 pawn chain.",
      "hints": [
        "Find the pawn not yet supported by another pawn.",
        "Consider b3."
      ],
      "explanation": "b3 protects c4, which in turn protects d5. Supporting the base makes a recapture possible if c4 is taken."
    },
    {
      "fen": "k7/8/2n5/4P3/5P2/8/6P1/1K6 w - - 0 1",
      "answers": [
        "g3"
      ],
      "goal": "Reinforce the base of the f4–e5 pawn chain.",
      "hints": [
        "Find the pawn not yet supported by another pawn.",
        "Consider g3."
      ],
      "explanation": "g3 protects f4, which in turn protects e5. Supporting the base makes a recapture possible if f4 is taken."
    }
  ],
  "bishop-retreat": [
    {
      "fen": "7k/8/2p5/1p6/2B5/8/3P4/6K1 w - - 0 20",
      "answers": [
        "Bb3"
      ],
      "goal": "Retreat the attacked bishop along its diagonal to b3.",
      "hints": [
        "The b5 pawn attacks c4; b3 is a safe retreat.",
        "Consider Bb3."
      ],
      "explanation": "Bb3 escapes the b5 pawn while retaining the diagonal toward f7. Check for another pawn chase before assuming the bishop is secure."
    },
    {
      "fen": "k7/8/5p2/6p1/5B2/8/4P3/1K6 w - - 0 1",
      "answers": [
        "Bg3"
      ],
      "goal": "Retreat the attacked bishop along its diagonal to g3.",
      "hints": [
        "The g5 pawn attacks f4; g3 is a safe retreat.",
        "Consider Bg3."
      ],
      "explanation": "Bg3 escapes the g5 pawn while retaining the diagonal toward c7. Check for another pawn chase before assuming the bishop is secure."
    }
  ],
  "capture-promotion": [
    {
      "fen": "5r2/4P2k/8/8/8/8/P7/K7 w - - 0 20",
      "answers": [
        "exf8=Q"
      ],
      "goal": "Capture the rook and promote to a queen.",
      "hints": [
        "The pawn can capture diagonally onto f8.",
        "Consider exf8=Q."
      ],
      "explanation": "exf8=Q combines a diagonal capture with promotion. This queen does not give check, but wins material without stalemate."
    },
    {
      "fen": "2r5/k2P4/8/8/8/8/7P/7K w - - 0 1",
      "answers": [
        "dxc8=Q"
      ],
      "goal": "Capture the rook and promote to a queen.",
      "hints": [
        "The pawn can capture diagonally onto c8.",
        "Consider dxc8=Q."
      ],
      "explanation": "dxc8=Q combines a diagonal capture with promotion. This queen does not give check, but wins material without stalemate."
    }
  ],
  "en-passant-check": [
    {
      "fen": "7k/7p/8/4pP2/5K2/8/8/8 w - e6 0 20",
      "answers": [
        "fxe6"
      ],
      "goal": "Answer Black’s e7–e5+ by taking the checking pawn en passant.",
      "hints": [
        "The checking pawn is removed from e5, not from your destination.",
        "Consider fxe6."
      ],
      "explanation": "fxe6 removes e5, the pawn checking f4. The resulting board leaves the king safe."
    },
    {
      "fen": "k7/p7/8/2Pp4/2K5/8/8/8 w - d6 0 1",
      "answers": [
        "cxd6"
      ],
      "goal": "Answer Black’s d7–d5+ by taking the checking pawn en passant.",
      "hints": [
        "The checking pawn is removed from d5, not from your destination.",
        "Consider cxd6."
      ],
      "explanation": "cxd6 removes d5, the pawn checking c4. The resulting board leaves the king safe."
    }
  ],
  "knight-interpose": [
    {
      "fen": "k3r3/8/8/8/8/8/P1N5/4K3 w - - 0 20",
      "answers": [
        "Ne3"
      ],
      "goal": "Block the checking e-file with your knight.",
      "hints": [
        "Find a knight jump onto the checking line.",
        "Consider Ne3."
      ],
      "explanation": "Ne3 puts a piece between the rook and king. Calculate a possible capture of the blocker after solving the immediate check."
    },
    {
      "fen": "3r3k/8/8/8/8/8/5N1P/3K4 w - - 0 1",
      "answers": [
        "Nd3"
      ],
      "goal": "Block the checking d-file with your knight.",
      "hints": [
        "Find a knight jump onto the checking line.",
        "Consider Nd3."
      ],
      "explanation": "Nd3 puts a piece between the rook and king. Calculate a possible capture of the blocker after solving the immediate check."
    }
  ],
  "stalemate-resource": [
    {
      "fen": "7k/8/8/8/6Q1/8/5q2/7K w - - 0 20",
      "answers": [
        "Qg7+"
      ],
      "goal": "Force your queen to be captured so the resulting position is stalemate.",
      "hints": [
        "The queen starts farther away, but the forcing destination must seal every escape.",
        "Consider Qg7+."
      ],
      "explanation": "Qg7+ forces Kxg7. White then has no legal move and is not in check: f2 covers g1, g2 and h2."
    },
    {
      "fen": "k7/8/8/8/1Q6/8/2q5/K7 w - - 0 1",
      "answers": [
        "Qb7+"
      ],
      "goal": "Force your queen to be captured so the resulting position is stalemate.",
      "hints": [
        "The queen starts farther away, but the forcing destination must seal every escape.",
        "Consider Qb7+."
      ],
      "explanation": "Qb7+ forces Kxb7. White then has no legal move and is not in check: c2 covers b1, b2 and a2."
    }
  ],
  "claim-center": [
    {
      "fen": "rnbqkb1r/ppp1pppp/5n2/3p4/8/6P1/PPPPPPBP/RNBQK1NR w KQkq - 2 3",
      "answers": [
        "e4",
        "d4"
      ],
      "goal": "Occupy the center with a two-square central pawn move.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider e4."
      ],
      "explanation": "e4 or d4 takes central space after a fianchetto. Black may exchange or attack that pawn; keep developing."
    },
    {
      "fen": "rnbqkbnr/pppp1ppp/8/4p3/8/2N5/PPPPPPPP/R1BQKBNR w KQkq - 0 2",
      "answers": [
        "d4",
        "e4"
      ],
      "goal": "Use a central pawn to claim space after developing the queenside knight.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider d4."
      ],
      "explanation": "d4 challenges e5 while e4 occupies the center beside it. Both meet the exercise’s goal; compare Black’s reply."
    }
  ],
  "develop-knight": [
    {
      "fen": "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3",
      "answers": [
        "Nf3"
      ],
      "goal": "Develop your kingside knight with an attack on e5.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider Nf3."
      ],
      "explanation": "Nf3 develops and attacks e5. The bishop has moved first this time; development order can vary without changing the principle."
    },
    {
      "fen": "rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/6P1/PP2PP1P/RNBQKBNR w KQkq - 1 4",
      "answers": [
        "Nc3"
      ],
      "goal": "Develop the queenside knight and add pressure to d5.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider Nc3."
      ],
      "explanation": "Nc3 brings the knight toward the center and attacks d5. Keep the king’s safety in mind before resolving the central tension."
    }
  ],
  "castle-king": [
    {
      "fen": "r1bqkbnr/pp2pppp/2np4/2p5/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4",
      "answers": [
        "O-O"
      ],
      "goal": "Castle kingside in this Sicilian position.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider O-O."
      ],
      "explanation": "O-O is legal because f1 and g1 are clear and safe. The asymmetric center does not change the castling rules."
    },
    {
      "fen": "rnbq1rk1/ppppppbp/5np1/8/3P4/5NP1/PPP1PPBP/RNBQK2R w KQ - 3 5",
      "answers": [
        "O-O"
      ],
      "goal": "Complete castling behind your fianchettoed bishop.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider O-O."
      ],
      "explanation": "The bishop is on g2 rather than c4 or d3. The king still moves from e1 to g1 and the rook from h1 to f1."
    }
  ],
  "develop-bishop": [
    {
      "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4",
      "answers": [
        "Bc4"
      ],
      "goal": "Develop the bishop toward f7 after both knights have entered play.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider Bc4."
      ],
      "explanation": "Bc4 activates the bishop and clears f1. Black has developed efficiently too, so do not assume an immediate attack is winning."
    },
    {
      "fen": "rnbqkb1r/pp3ppp/2p1pn2/3p4/2PP4/4PN2/PP3PPP/RNBQKB1R w KQkq - 0 5",
      "answers": [
        "Bd3"
      ],
      "goal": "Develop the kingside bishop toward h7 in this central pawn structure.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider Bd3."
      ],
      "explanation": "Bd3 places the bishop on the diagonal to h7 and prepares castling. The c- and d-pawn tension must still be considered."
    }
  ],
  "central-break": [
    {
      "fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 6 5",
      "answers": [
        "d4"
      ],
      "goal": "Challenge e5 with your d-pawn after castling.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider d4."
      ],
      "explanation": "d4 opens the center and challenges e5. Calculate the exchanges on d4 rather than treating the pawn break as a free gain."
    },
    {
      "fen": "rnbq1rk1/ppp2ppp/3bpn2/3p4/3P4/3BPN2/PPP2PPP/RNBQ1RK1 w - - 4 6",
      "answers": [
        "c4"
      ],
      "goal": "Challenge the d5 pawn from the side with a pawn break.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider c4."
      ],
      "explanation": "c4 attacks d5 and creates central tension. A pawn break need not be made by a d- or e-pawn."
    }
  ],
  "castle-long": [
    {
      "fen": "r1bq1rk1/ppp2ppp/2np1n2/2b5/3NP3/2N1B3/PPPQ1PPP/R3KB1R w KQ - 0 8",
      "answers": [
        "O-O-O"
      ],
      "goal": "Castle queenside after clearing the queen and both minor pieces from the route.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider O-O-O."
      ],
      "explanation": "O-O-O brings the rook to d1. Both kings have castled on opposite wings; future pawn attacks must be calculated, not assumed."
    },
    {
      "fen": "rnbq1rk1/ppp1bppp/4pn2/3p4/3P1B2/2N1P3/PPPQ1PPP/R3KBNR w KQ - 1 6",
      "answers": [
        "O-O-O"
      ],
      "goal": "Use your queenside castling right in this queen-pawn setup.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider O-O-O."
      ],
      "explanation": "The b1, c1 and d1 squares are clear. e1, d1 and c1 are safe, so the king may castle toward the a1 rook."
    }
  ],
  "forcing-first": [
    {
      "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
      "answers": [
        "Qxf7#"
      ],
      "goal": "Your queen is attacked. Find a move that ends the game.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider Qxf7#."
      ],
      "explanation": "Qxf7# answers the queen attack with mate. Bc4 protects the queen and the king has no legal reply."
    },
    {
      "fen": "r1bqkbnr/ppp2ppp/3p4/n3p2Q/2B1P3/2N5/PPPP1PPP/R1B1K1NR w KQkq - 2 5",
      "answers": [
        "Qxf7#"
      ],
      "goal": "The knight attacks your bishop. Check for a stronger forcing reply.",
      "hints": [
        "Read the changed move order and inspect the relevant piece routes.",
        "Consider Qxf7#."
      ],
      "explanation": "Qxf7# takes the mating opportunity before retreating. The knight attack has not removed the bishop’s support of f7."
    }
  ]
};
