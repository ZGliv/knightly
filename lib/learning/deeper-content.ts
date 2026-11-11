import type { Sequence } from "./sequences";

// Original focused teaching positions. Each paired board is a separate application.
export const DEEPER_SEQUENCES: Sequence[] = [
  {
    "id": "en-passant",
    "title": "Take the pawn in passing",
    "phase": "middlegame",
    "level": 1,
    "principle": "A pawn that has just advanced two squares may be captured as if it moved only one. This en passant opportunity lasts for your next move only; your king must still be safe.",
    "transfer": "When a pawn lands beside your fifth-rank pawn, check whether its last move created an en passant capture.",
    "fen": "7k/8/8/3pP3/8/8/8/6K1 w - d6 0 12",
    "answers": [
      "exd6"
    ],
    "goal": "Capture the pawn that just moved from d7 to d5.",
    "hints": [
      "The target square is empty; the captured pawn is beside yours.",
      "Move e5 to d6."
    ],
    "explanation": "exd6 removes the pawn on d5 and places yours on d6. Waiting a move would lose this special capture.",
    "independent": {
      "fen": "k7/7p/8/1pP5/8/8/8/1K6 w - b6 0 12",
      "answers": [
        "cxb6"
      ],
      "goal": "Black just played b7\u2013b5. Capture that pawn en passant.",
      "hints": [
        "Capture as though the pawn had stopped on b6.",
        "The c5 pawn can move diagonally to b6."
      ],
      "explanation": "cxb6 removes b5. The capture changes two files, so inspect any rook or bishop lines it opens."
    }
  },
  {
    "id": "castle-long",
    "title": "Castle toward the queenside",
    "phase": "opening",
    "level": 1,
    "principle": "Queenside castling moves the king two squares toward the rook and places the rook beside it. The king may not start in, cross through or finish in check; every square between the pieces must be empty.",
    "transfer": "Check castling rights and attacked squares. The rook may be attacked; the king\u2019s route may not.",
    "fen": "6k1/8/8/8/8/8/PPP2PPP/R3K2R w KQ - 0 12",
    "answers": [
      "O-O-O"
    ],
    "goal": "Castle queenside to bring your king to c1.",
    "hints": [
      "b1, c1 and d1 are clear.",
      "Move the king from e1 to c1; the rook goes to d1."
    ],
    "explanation": "O-O-O moves the king to c1 and rook to d1. The rook\u2019s original square is not part of the king\u2019s safety test.",
    "independent": {
      "fen": "6k1/8/8/8/8/5N2/PPP3PP/R3K3 w Q - 0 12",
      "answers": [
        "O-O-O"
      ],
      "goal": "Use the queenside castling right in this different setup.",
      "hints": [
        "The knight on f3 does not interfere with queenside castling.",
        "The king\u2019s destination is c1."
      ],
      "explanation": "The king crosses d1 and lands on c1; both squares are safe. Castling does not guarantee lasting safety\u2014watch the c-file and nearby pawn breaks."
    }
  },
  {
    "id": "knight-jump",
    "title": "Jump over the traffic",
    "phase": "middlegame",
    "level": 1,
    "principle": "Knights are the only pieces that jump over occupied squares. Only their destination matters; they cannot land on a friendly piece or expose their own king.",
    "transfer": "When lines are blocked, inspect knight jumps before deciding a target is unreachable.",
    "fen": "7k/8/8/8/2P1r3/1PNP4/8/6K1 w - - 0 12",
    "answers": [
      "Nxe4"
    ],
    "goal": "Jump over the crowded center and capture the rook.",
    "hints": [
      "A knight moves two squares in one direction and one sideways.",
      "From c3, e4 is a legal destination."
    ],
    "explanation": "Nxe4 captures the rook. The pawns between the squares do not block a knight\u2019s jump.",
    "independent": {
      "fen": "k7/8/8/8/3r1P2/4PNP1/8/1K6 w - - 0 12",
      "answers": [
        "Nxd4"
      ],
      "goal": "Use the knight to take the rook through the pawn traffic.",
      "hints": [
        "Look for an L-shaped move from f3.",
        "d4 is two files left and one rank forward."
      ],
      "explanation": "Nxd4 wins the rook without moving any blocking pawns. Still check whether the landing square has enemy defenders."
    }
  },
  {
    "id": "free-bishop",
    "title": "Open a door for your bishop",
    "phase": "opening",
    "level": 1,
    "principle": "A bishop needs a clear diagonal. A pawn move can develop your position by opening a route for a piece, even before that piece moves.",
    "transfer": "Before moving a pawn, name the diagonal or file it opens and the square it weakens.",
    "fen": "7k/8/8/8/8/8/PP1P2P1/2B3K1 w - - 0 12",
    "answers": [
      "d3",
      "d4"
    ],
    "goal": "Move the d-pawn to open the bishop\u2019s diagonal toward e3.",
    "hints": [
      "The pawn on d2 is blocking the c1 bishop.",
      "Either d3 or d4 clears d2."
    ],
    "explanation": "Moving the d-pawn clears c1\u2013d2\u2013e3. d4 also claims space; d3 keeps a shorter pawn chain. Both meet this exercise\u2019s goal.",
    "independent": {
      "fen": "k7/8/8/8/8/8/1P2P1PP/1K3B2 w - - 0 12",
      "answers": [
        "e3",
        "e4"
      ],
      "goal": "Open the f1 bishop\u2019s diagonal toward d3.",
      "hints": [
        "The bishop cannot pass through its own e2 pawn.",
        "Advance that pawn to e3 or e4."
      ],
      "explanation": "The e-pawn move releases the f1 bishop. Choose its eventual square by looking at the opponent\u2019s threats, not only the newly open path."
    }
  },
  {
    "id": "fianchetto",
    "title": "Put the bishop on the long diagonal",
    "phase": "opening",
    "level": 2,
    "principle": "A fianchetto develops a bishop behind a pawn advanced one square from its starting position. It influences the center from the wing, but its diagonal can still be blocked.",
    "transfer": "Pair the pawn move with bishop development; a hole in the pawn shelter is not useful by itself.",
    "fen": "4k3/8/8/8/8/6P1/5P1P/1N2KB2 w - - 0 12",
    "answers": [
      "Bg2"
    ],
    "goal": "Complete the kingside fianchetto.",
    "hints": [
      "The g-pawn has already cleared g2.",
      "Develop the bishop from f1 to g2."
    ],
    "explanation": "Bg2 places the bishop on the long diagonal toward a8. Its central influence depends on which pawns later occupy that diagonal.",
    "independent": {
      "fen": "4k3/8/8/8/8/1P6/P1P5/2B1K1N1 w - - 0 12",
      "answers": [
        "Bb2"
      ],
      "goal": "Complete the queenside fianchetto.",
      "hints": [
        "The b-pawn has cleared the bishop\u2019s destination.",
        "c1\u2013b2 is the first step onto the long diagonal."
      ],
      "explanation": "Bb2 aims toward h8 through the center. A friendly pawn on d4 would block that line, so coordinate your central setup with the bishop."
    }
  },
  {
    "id": "rook-lift",
    "title": "Bring a rook across the board",
    "phase": "middlegame",
    "level": 2,
    "principle": "A rook can leave its back rank to travel sideways along a clear rank. This rook lift takes time; check immediate threats before starting a transfer.",
    "transfer": "Plan both legs of a rook lift and verify the intended rank is clear.",
    "fen": "6k1/8/8/8/P3P3/8/5P1P/R5K1 w - - 0 12",
    "answers": [
      "Ra3"
    ],
    "goal": "Lift the rook to the third rank, ready to travel toward the kingside.",
    "hints": [
      "The a-pawn has cleared a2 and a3.",
      "Ra3 starts the lift."
    ],
    "explanation": "Ra3 gives the rook access to the third rank. A later Rg3 is possible if the rank remains clear, but the opponent gets a move first.",
    "independent": {
      "fen": "1k6/8/8/8/3P3P/8/1PP5/1K5R w - - 0 12",
      "answers": [
        "Rh3"
      ],
      "goal": "Lift the rook to the third rank before a sideways transfer.",
      "hints": [
        "h2 and h3 are empty.",
        "Rh3 reaches the intended rank."
      ],
      "explanation": "Rh3 makes a later sideways rook move possible. It is a route, not a forced attack; reassess after the opponent replies."
    }
  },
  {
    "id": "pawn-chain",
    "title": "Support the base of a pawn chain",
    "phase": "middlegame",
    "level": 2,
    "principle": "Pawns defend diagonally forward. A supporting pawn can protect the base of a chain, making an enemy capture answerable by a recapture.",
    "transfer": "Identify the base\u2014the pawn not protected by another pawn\u2014before reinforcing a chain.",
    "fen": "7k/8/5n2/4P3/3P4/8/2P5/6K1 w - - 0 12",
    "answers": [
      "c3"
    ],
    "goal": "Use the c-pawn to support the base of your d4\u2013e5 pawn chain.",
    "hints": [
      "d4 already protects e5, but d4 needs support.",
      "c3 makes the c-pawn defend d4."
    ],
    "explanation": "After c3, c3 protects d4 and d4 protects e5. This is mutual coordination along a chain, not a guarantee against several attackers.",
    "independent": {
      "fen": "k7/8/2n5/3P4/4P3/8/5P2/1K6 w - - 0 12",
      "answers": [
        "f3"
      ],
      "goal": "Support the base of the e4\u2013d5 chain with your f-pawn.",
      "hints": [
        "e4 supports d5; reinforce e4.",
        "f3 attacks e4 diagonally."
      ],
      "explanation": "f3 protects e4 so that a capture there can be recaptured. In a full game, also weigh the king squares weakened by an f-pawn move."
    }
  },
  {
    "id": "bishop-retreat",
    "title": "Save the bishop and its diagonal",
    "phase": "middlegame",
    "level": 2,
    "principle": "A retreat can preserve a useful bishop. Follow its diagonal to a safe square rather than treating every backward move as a loss of purpose.",
    "transfer": "When a pawn attacks your bishop, compare safe retreats and check the destination for other attackers.",
    "fen": "6k1/1p6/p7/1B6/8/4P3/3P4/6K1 w - - 0 12",
    "answers": [
      "Ba4"
    ],
    "goal": "Retreat the attacked bishop along its current diagonal toward a4.",
    "hints": [
      "The a6 pawn attacks b5.",
      "a4 is empty and not attacked."
    ],
    "explanation": "Ba4 saves the bishop while retaining the diagonal toward e8. Moving backward can keep pressure alive.",
    "independent": {
      "fen": "1k6/6p1/7p/6B1/8/3P4/4P3/1K6 w - - 0 12",
      "answers": [
        "Bh4"
      ],
      "goal": "Keep the bishop\u2019s diagonal by retreating toward h4.",
      "hints": [
        "h6 attacks g5.",
        "Bh4 steps away from the pawn attack."
      ],
      "explanation": "Bh4 preserves the bishop and its diagonal toward d8. Continue to watch for a second pawn advance that might gain more space."
    }
  },
  {
    "id": "capture-promotion",
    "title": "Capture into a new queen",
    "phase": "endgame",
    "level": 2,
    "principle": "A pawn can promote by capturing diagonally on the last rank. The capture and promotion happen in the same move; choose the new piece after checking the resulting position.",
    "transfer": "On the seventh rank, inspect both forward promotions and capture-promotions.",
    "fen": "r6k/1P5p/8/8/8/8/8/6K1 w - - 0 12",
    "answers": [
      "bxa8=Q+"
    ],
    "goal": "Capture the rook and promote to a queen.",
    "hints": [
      "The pawn captures diagonally onto a8.",
      "Choose a queen for bxa8=Q."
    ],
    "explanation": "bxa8=Q removes the rook and creates a queen. The pawn could not capture a rook directly in front of it.",
    "independent": {
      "fen": "k6r/p5P1/8/8/8/8/8/1K6 w - - 0 12",
      "answers": [
        "gxh8=Q+"
      ],
      "goal": "Capture the rook with promotion to a queen.",
      "hints": [
        "From g7 the capture destination is h8.",
        "Promote as part of gxh8=Q."
      ],
      "explanation": "gxh8=Q wins the rook and promotes in one move. Check whether promotion gives check and whether the opponent can capture the new piece."
    }
  },
  {
    "id": "en-passant-check",
    "title": "Escape check en passant",
    "phase": "middlegame",
    "level": 2,
    "principle": "En passant may remove a pawn that is giving check. It is legal only if the resulting board leaves your king safe; removing two pawns from a rank can expose other attacks.",
    "transfer": "When checked by a just-advanced pawn, consider en passant and then recheck every line to your king.",
    "fen": "7k/7p/8/3pP3/4K3/8/8/8 w - d6 0 12",
    "answers": [
      "exd6"
    ],
    "goal": "Black just played d7\u2013d5+, checking your king. Remove the checker en passant.",
    "hints": [
      "The pawn on d5 checks e4.",
      "e5xd6 removes d5 even though you land on d6."
    ],
    "explanation": "exd6 removes the checking pawn and leaves the king on e4 safe. En passant is subject to exactly the same king-safety rule as other replies.",
    "independent": {
      "fen": "k7/p7/8/1pP5/2K5/8/8/8 w - b6 0 12",
      "answers": [
        "cxb6"
      ],
      "goal": "Answer the check from b7\u2013b5 by capturing en passant.",
      "hints": [
        "The checking pawn attacks c4 from b5.",
        "cxb6 removes that pawn."
      ],
      "explanation": "cxb6 gets out of check without moving the king. In other positions an opened rook or bishop line could make this capture illegal."
    }
  },
  {
    "id": "knight-interpose",
    "title": "Block a check with a knight",
    "phase": "middlegame",
    "level": 2,
    "principle": "A line check can sometimes be blocked by a knight jump. Choose a destination on the checking line, then verify that the blocker is not exposing another check.",
    "transfer": "For a rook, bishop or queen check, inspect interpositions as well as captures and king moves.",
    "fen": "k5r1/8/8/8/8/8/P3N3/6K1 w - - 0 12",
    "answers": [
      "Ng3"
    ],
    "goal": "Block the rook\u2019s g-file check with your knight.",
    "hints": [
      "The knight must land between g8 and g1.",
      "e2\u2013g3 reaches the checking line."
    ],
    "explanation": "Ng3 interposes on the g-file. The rook may capture the blocker, so a legal defense is not automatically a material-saving defense.",
    "independent": {
      "fen": "1r5k/8/8/8/8/8/3N3P/1K6 w - - 0 12",
      "answers": [
        "Nb3"
      ],
      "goal": "Interpose the knight on the b-file to answer check.",
      "hints": [
        "A move off the checking line would leave your king exposed.",
        "d2\u2013b3 blocks the rook."
      ],
      "explanation": "Nb3 stops the check. After any interposition, calculate whether the opponent can capture the blocking piece."
    }
  },
  {
    "id": "stalemate-resource",
    "title": "Find a stalemate escape",
    "phase": "endgame",
    "level": 2,
    "principle": "When you are losing, a forcing sacrifice can sometimes leave your king with no legal move and no check. That is stalemate, a draw\u2014not checkmate. Verify every remaining legal move.",
    "transfer": "Before resigning a bare-king ending, inspect forcing checks that might remove your last mobile piece.",
    "fen": "7k/8/6Q1/8/8/8/5q2/7K w - - 0 12",
    "answers": [
      "Qg7+"
    ],
    "goal": "Offer your queen with check so the only reply leaves a stalemate.",
    "hints": [
      "After your queen disappears, f2 controls g1, g2 and h2.",
      "Qg7+ forces Kxg7."
    ],
    "explanation": "Qg7+ leaves Black only Kxg7. Then your h1 king is not checked, but g1, g2 and h2 are attacked: stalemate. This exact geometry matters.",
    "independent": {
      "fen": "k7/8/1Q6/8/8/8/2q5/K7 w - - 0 12",
      "answers": [
        "Qb7+"
      ],
      "goal": "Force the capture of your last piece and reach stalemate.",
      "hints": [
        "The black queen covers a2, b2 and b1.",
        "Qb7+ forces Kxb7."
      ],
      "explanation": "After Qb7+ Kxb7, White has no legal move and is not in check. The draw depends on the king having no extra pawn or piece move."
    }
  }
];
