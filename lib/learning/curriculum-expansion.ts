import type { Sequence } from "./sequences";

// Original teaching positions; the amount of practice follows the topic.
export const CURRICULUM_EXPANSION: Sequence[] = [
  {
    "id": "king-captures-checker",
    "title": "Can your king take it?",
    "phase": "middlegame",
    "level": 1,
    "principle": "A king may capture a checking piece only if its destination is not attacked. Check every enemy line after removing the piece.",
    "transfer": "Before a king capture, remove the target mentally and inspect the destination.",
    "fen": "k7/8/8/8/8/8/5P2/6Kr w - - 0 30",
    "answers": [
      "Kxh1"
    ],
    "goal": "Capture the undefended checking rook with your king.",
    "hints": [
      "The enemy king on a8 cannot protect h1.",
      "Consider Kxh1."
    ],
    "explanation": "Kxh1 removes the rook. No enemy piece attacks h1, so the capture answers the check.",
    "independent": {
      "fen": "7k/8/8/8/8/8/6P1/rK6 w - - 0 30",
      "answers": [
        "Kxa1"
      ],
      "goal": "Answer the check by safely capturing the rook.",
      "hints": [
        "Inspect a1 after the rook is removed.",
        "Consider Kxa1."
      ],
      "explanation": "Kxa1 is legal because a1 has no enemy defender. A checking piece is not automatically immune to capture."
    }
  },
  {
    "id": "knight-check-response",
    "title": "A knight check cannot be blocked",
    "phase": "middlegame",
    "level": 1,
    "principle": "A knight jumps over intervening squares. Answer its check by capturing it or moving your king; interposing another piece does not stop it.",
    "transfer": "Identify the checking piece before searching for a block.",
    "fen": "k7/8/8/8/8/5n2/7P/6K1 w - - 0 30",
    "answers": [
      "Kh1"
    ],
    "goal": "Move your king out of the knight check to h1.",
    "hints": [
      "The knight on f3 attacks g1, but not h1.",
      "Consider Kh1."
    ],
    "explanation": "Kh1 escapes. Placing a piece between f3 and g1 would not stop a knight.",
    "independent": {
      "fen": "7k/8/8/8/8/8/P2n4/1K6 w - - 0 30",
      "answers": [
        "Ka1"
      ],
      "goal": "Escape the knight check toward a1.",
      "hints": [
        "The knight on d2 attacks b1, but not a1.",
        "Consider Ka1."
      ],
      "explanation": "Ka1 is outside the knight\u2019s attack. This position asks for a safe king move, not a block."
    }
  },
  {
    "id": "double-check-response",
    "title": "Escape both checks at once",
    "phase": "middlegame",
    "level": 1,
    "principle": "When two pieces give check together, capturing or blocking just one normally leaves the other check. Move the king to a square safe from both.",
    "transfer": "Count all checking pieces before choosing a response.",
    "fen": "k3r3/8/8/8/1b6/8/7P/4K3 w - - 0 30",
    "answers": [
      "Kf1"
    ],
    "goal": "Escape the rook and bishop checks with your king.",
    "hints": [
      "The e-file and b4\u2013e1 diagonal are both dangerous.",
      "Consider Kf1."
    ],
    "explanation": "Kf1 leaves both attacking lines. Capturing or blocking only one checker would not answer the other.",
    "independent": {
      "fen": "3r3k/8/8/8/6b1/8/P7/3K4 w - - 0 30",
      "answers": [
        "Kc1"
      ],
      "goal": "Move away from both checking lines.",
      "hints": [
        "The rook attacks the d-file; the bishop attacks g4\u2013d1.",
        "Consider Kc1."
      ],
      "explanation": "Kc1 escapes both lines. Always inspect the king\u2019s destination for a third attack."
    }
  },
  {
    "id": "ladder-mate",
    "title": "Finish with two rooks",
    "phase": "endgame",
    "level": 1,
    "principle": "Two rooks can take turns cutting off ranks and checking the king toward the edge. Keep the checking rook out of the king\u2019s reach.",
    "transfer": "Use one rook as a fence and the other as the checking piece.",
    "fen": "7k/1R6/8/8/8/8/8/R5K1 w - - 0 30",
    "answers": [
      "Ra8#"
    ],
    "goal": "Use the rooks together to checkmate on the back rank.",
    "hints": [
      "Rb7 cuts off the seventh rank.",
      "Consider Ra8#."
    ],
    "explanation": "Ra8 is mate: the checking rook covers the eighth rank and Rb7 closes the seventh.",
    "independent": {
      "fen": "7k/8/R7/8/8/8/8/1R4K1 w - - 0 30",
      "answers": [
        "Ra7"
      ],
      "goal": "Cut the king off on the seventh rank before delivering mate.",
      "hints": [
        "Use the a-rook as a fence; the b-rook will give the check.",
        "Consider Ra7."
      ],
      "explanation": "Ra7 Kg8 Rb8# uses one rook as a fence and the other to finish. The king cannot cross the seventh rank.",
      "followThrough": [
        {
          "reply": "Kg8",
          "answers": [
            "Rb8#"
          ],
          "goal": "The seventh rank is sealed. Deliver mate with your other rook.",
          "hints": [
            "Rb8 checks the entire back rank.",
            "Play Rb8#."
          ]
        }
      ]
    }
  },
  {
    "id": "avoid-stalemate",
    "title": "Check before you finish",
    "phase": "endgame",
    "level": 1,
    "principle": "A trapped king with no legal move is only checkmate if it is in check. A careless queen move can turn a won position into stalemate.",
    "transfer": "Before a quiet move in a won ending, name one legal enemy move.",
    "fen": "7k/8/5K2/6Q1/8/8/8/8 w - - 0 30",
    "answers": [
      "Qg7#"
    ],
    "goal": "Finish with checkmate instead of stalemating the king.",
    "hints": [
      "Compare Qg7+ with the tempting Qg6.",
      "Consider Qg7#."
    ],
    "explanation": "Qg7 is mate. Qg6 would leave the king on h8 with no move and no check: stalemate.",
    "independent": {
      "fen": "k7/8/2K5/8/1Q6/8/8/8 w - - 0 30",
      "answers": [
        "Qb7#"
      ],
      "goal": "Find a protected queen check that ends the game.",
      "hints": [
        "Your king protects b7. Qc7 would not check.",
        "Consider Qb7#."
      ],
      "explanation": "Qb7 is mate. Qb6 instead traps the king without giving check and draws by stalemate."
    }
  },
  {
    "id": "bishop-fork",
    "title": "Fork along two diagonals",
    "phase": "middlegame",
    "level": 1,
    "principle": "A bishop can attack valuable targets on different diagonals from one square. A checking fork buys time to collect the other target.",
    "transfer": "Trace both diagonals from each candidate landing square.",
    "fen": "4k3/8/r7/8/8/8/7P/5BK1 w - - 0 30",
    "answers": [
      "Bb5+"
    ],
    "goal": "Check the king and attack the rook with one bishop move.",
    "hints": [
      "From b5, one diagonal reaches e8 and the other reaches a6.",
      "Consider Bb5+."
    ],
    "explanation": "Bb5+ attacks both targets. The king must answer the check before the rook can move.",
    "independent": {
      "fen": "3k4/8/7r/8/8/8/P7/2B3K1 w - - 0 30",
      "answers": [
        "Bg5+"
      ],
      "goal": "Create a checking bishop fork.",
      "hints": [
        "The diagonals from g5 reach d8 and h6.",
        "Consider Bg5+."
      ],
      "explanation": "Bg5+ forks the king and rook. After the king moves, Bxh6 collects the rook.",
      "followThrough": [
        {
          "reply": "Kc7",
          "answers": [
            "Bxh6"
          ],
          "goal": "The king escaped. Collect the rook on the other diagonal.",
          "hints": [
            "Your bishop on g5 still attacks h6.",
            "Play Bxh6."
          ]
        }
      ]
    }
  },
  {
    "id": "rook-fork",
    "title": "Create a rook fork",
    "phase": "middlegame",
    "level": 1,
    "principle": "A rook can give check in one direction and attack a second target in the other. Verify that the destination is safe before counting the gain.",
    "transfer": "Search both the rank and file of a checking rook move.",
    "fen": "8/k6q/2K5/8/8/8/P7/3R4 w - - 0 30",
    "answers": [
      "Rd7+"
    ],
    "goal": "Check the king and attack the queen along the same rank.",
    "hints": [
      "Your king protects d7, so the queen cannot take the rook for free.",
      "Consider Rd7+."
    ],
    "explanation": "Rd7+ checks left along the rank and attacks the queen to the right. The protected rook makes this a useful double attack.",
    "independent": {
      "fen": "8/q6k/5K2/8/8/8/7P/4R3 w - - 0 30",
      "answers": [
        "Re7+"
      ],
      "goal": "Fork king and queen with a protected rook.",
      "hints": [
        "Your king on f6 protects e7.",
        "Consider Re7+."
      ],
      "explanation": "Re7+ creates two threats on the seventh rank. After the king\u2019s move, Rxa7 collects the queen.",
      "followThrough": [
        {
          "reply": "Kh8",
          "answers": [
            "Rxa7"
          ],
          "goal": "The king escaped. Take the queen on the other side of the rank.",
          "hints": [
            "The seventh rank is clear from e7 to a7.",
            "Play Rxa7."
          ]
        }
      ]
    }
  },
  {
    "id": "exploit-pin",
    "title": "Capture through a pinned defender",
    "phase": "middlegame",
    "level": 2,
    "principle": "An absolutely pinned piece cannot leave the line if doing so exposes its king. A target it appears to defend may therefore be available.",
    "transfer": "When counting defenders, check whether each defender can legally move.",
    "fen": "4k3/4n3/8/3p4/2B5/8/7P/4R1K1 w - - 0 30",
    "answers": [
      "Bxd5"
    ],
    "goal": "Capture the pawn whose knight defender is pinned.",
    "hints": [
      "The knight on e7 cannot leave the e-file without exposing its king.",
      "Consider Bxd5."
    ],
    "explanation": "Bxd5 takes the pawn. ...Nxd5 is illegal because Re1 would then check the king on e8.",
    "independent": {
      "fen": "3k4/3n4/8/4p3/5B2/8/P7/3R2K1 w - - 0 30",
      "answers": [
        "Bxe5"
      ],
      "goal": "Use the pinned knight to win a pawn.",
      "hints": [
        "The knight on d7 is pinned to d8 by your rook.",
        "Consider Bxe5."
      ],
      "explanation": "Bxe5 is safe from ...Nxe5: that move would uncover the rook\u2019s check against d8."
    }
  },
  {
    "id": "break-pin",
    "title": "Break the pin before moving",
    "phase": "middlegame",
    "level": 2,
    "principle": "You can neutralize a pin by moving the king, interposing another piece, challenging the pinning piece, or creating a forcing threat. Choose a method that is legal now.",
    "transfer": "Before using a pinned piece, make sure the pin has actually been removed.",
    "fen": "k3r3/8/8/8/8/8/4N2P/2B1K3 w - - 0 30",
    "answers": [
      "Be3"
    ],
    "goal": "Put your bishop between the rook and knight to release the knight from its pin.",
    "hints": [
      "The bishop can reach e3 from c1 through d2.",
      "Consider Be3."
    ],
    "explanation": "Be3 blocks the e-file above the knight. The knight can now leave e2 without exposing the king; the bishop has taken over the blocking job.",
    "independent": {
      "fen": "3r3k/8/8/8/8/8/P2N4/3K1B2 w - - 0 30",
      "answers": [
        "Bd3"
      ],
      "goal": "Interpose your bishop above the pinned knight.",
      "hints": [
        "The f1 bishop can reach d3 through e2.",
        "Consider Bd3."
      ],
      "explanation": "Bd3 blocks the rook\u2019s line above Nd2. A knight move no longer exposes Kd1, though the bishop itself must respect the pin."
    }
  },
  {
    "id": "trap-knight",
    "title": "Trap a knight on the rim",
    "phase": "middlegame",
    "level": 2,
    "principle": "A piece is trapped when all safe retreats disappear. Use pawn attacks to gain time, but check captures and counterchecks before assuming it is lost.",
    "transfer": "List the threatened piece\u2019s legal escape squares before making a trapping move.",
    "fen": "7k/8/8/2P5/nP6/8/1P1P4/2K5 w - - 0 30",
    "answers": [
      "b3"
    ],
    "goal": "Attack the rim knight while controlling all four escape squares.",
    "hints": [
      "Check b6, c5, c3 and b2 before pushing b3.",
      "Consider b3."
    ],
    "explanation": "b3 traps the knight: c5 is protected by b4, b6 by c5, c3 by d2 and b2 by your king. A pawn attack is useful only because the exits are covered.",
    "independent": {
      "fen": "k7/8/8/5P2/6Pn/8/4P1P1/5K2 w - - 0 30",
      "answers": [
        "g3"
      ],
      "goal": "Trap the knight by attacking it with your g-pawn.",
      "hints": [
        "The knight\u2019s exits are g6, f5, f3 and g2.",
        "Consider g3."
      ],
      "explanation": "g3 traps the knight. After the example king move, gxh4 collects it; all knight retreats would lose the knight to a defender.",
      "followThrough": [
        {
          "reply": "Ka7",
          "answers": [
            "gxh4"
          ],
          "goal": "The knight has no safe retreat. Capture it with the attacking pawn.",
          "hints": [
            "Your g3 pawn attacks h4.",
            "Play gxh4."
          ]
        }
      ]
    }
  },
  {
    "id": "develop-tempo",
    "title": "Develop with a threat",
    "phase": "opening",
    "level": 1,
    "principle": "A developing move that attacks the queen can improve your position while making the opponent spend a move. Do not chase the queen with weakening moves for their own sake.",
    "transfer": "Prefer useful development when it also gains a tempo.",
    "fen": "4k3/8/8/3q4/8/8/P3P3/1N2K3 w - - 0 30",
    "answers": [
      "Nc3"
    ],
    "goal": "Develop the queenside knight while attacking the queen.",
    "hints": [
      "A knight on c3 attacks d5.",
      "Consider Nc3."
    ],
    "explanation": "Nc3 brings a piece toward the center with a queen attack. The threat is a bonus to a useful developing move.",
    "independent": {
      "fen": "4k3/8/8/4q3/8/8/3PP2P/4K1N1 w - - 0 30",
      "answers": [
        "Nf3"
      ],
      "goal": "Develop with an attack on the queen.",
      "hints": [
        "A knight on f3 attacks e5.",
        "Consider Nf3."
      ],
      "explanation": "Nf3 develops and attacks e5. After the queen retreats, continue development instead of hunting it indefinitely."
    }
  },
  {
    "id": "double-rooks",
    "title": "Double on an open file",
    "phase": "middlegame",
    "level": 2,
    "principle": "Two rooks on the same open file can support an invasion. Prepare an entry square; doubling alone does not create a threat.",
    "transfer": "Identify an entry square and the opponent\u2019s challenge before doubling rooks.",
    "fen": "6k1/p6p/8/8/8/8/P2R2KP/7R w - - 0 30",
    "answers": [
      "Rhd1"
    ],
    "goal": "Place the second rook behind the first on the d-file.",
    "hints": [
      "The h1 rook has a clear route to d1.",
      "Consider Rhd1."
    ],
    "explanation": "Rhd1 doubles the rooks on the open d-file. Next inspect d7 or d8 and any opposing rook challenge.",
    "independent": {
      "fen": "6k1/p6p/8/8/8/4R3/P6P/R5K1 w - - 0 30",
      "answers": [
        "Rae1"
      ],
      "goal": "Double your rooks on the e-file.",
      "hints": [
        "The rook on a1 can support Re3 from behind.",
        "Consider Rae1."
      ],
      "explanation": "Rae1 connects the rooks along the e-file. This improves coordination; it does not by itself win material."
    }
  },
  {
    "id": "free-bad-bishop",
    "title": "Free a bishop behind its pawns",
    "phase": "middlegame",
    "level": 2,
    "principle": "A bishop blocked by its own central pawns needs a useful diagonal or a pawn break. Improve the least active piece before starting a plan that needs it.",
    "transfer": "Compare your bishop\u2019s available squares before and after a pawn move.",
    "fen": "6k1/7p/8/8/8/4P3/3P4/2B3K1 w - - 0 30",
    "answers": [
      "d4"
    ],
    "goal": "Open the bishop\u2019s diagonal while gaining central space.",
    "hints": [
      "The d2 pawn blocks the route from c1.",
      "Consider d4."
    ],
    "explanation": "d4 opens c1\u2013d2\u2013e3, though e3 still limits the long diagonal. Develop toward a useful square rather than stopping after the pawn push.",
    "independent": {
      "fen": "6k1/p7/8/8/8/3P4/4P3/5BK1 w - - 0 30",
      "answers": [
        "e4"
      ],
      "goal": "Release the bishop on f1 with a central pawn move.",
      "hints": [
        "The e2 pawn is the first blocker on the bishop\u2019s diagonal.",
        "Consider e4."
      ],
      "explanation": "e4 frees the route through e2. The pawn on d3 still shapes the bishop\u2019s choices; development is a plan, not just an empty square."
    }
  },
  {
    "id": "isolated-pawn-blockade",
    "title": "Blockade an isolated pawn",
    "phase": "middlegame",
    "level": 2,
    "principle": "A knight directly in front of an isolated pawn can block its advance while using a square that neighboring enemy pawns cannot attack. Still check piece exchanges and tactics.",
    "transfer": "Look for a stable blockading square before attacking an isolated pawn.",
    "fen": "3k4/p6p/8/3p4/8/5N2/P6P/6K1 w - - 0 30",
    "answers": [
      "Nd4"
    ],
    "goal": "Block the isolated d-pawn with your knight.",
    "hints": [
      "The d4 square is directly in front of Black\u2019s d5 pawn.",
      "Consider Nd4."
    ],
    "explanation": "Nd4 prevents ...d4. No neighboring black pawn can drive the knight away, though pieces may still challenge it.",
    "independent": {
      "fen": "3k4/p6p/8/4p3/8/2N5/P6P/6K1 w - - 0 30",
      "answers": [
        "Ne4"
      ],
      "goal": "Place a knight in front of the isolated e-pawn.",
      "hints": [
        "An isolated pawn has no friendly pawn on either neighboring file.",
        "Consider Ne4."
      ],
      "explanation": "Ne4 blockades e5. A good square still needs support when enemy pieces attack it."
    }
  },
  {
    "id": "attack-pawn-base",
    "title": "Attack the base of a chain",
    "phase": "middlegame",
    "level": 2,
    "principle": "The base of a pawn chain has no pawn behind it offering support. A pawn lever against that base can weaken the entire chain, but captures may open files for either side.",
    "transfer": "Find the base before choosing which pawn to challenge.",
    "fen": "6k1/7p/8/3p4/3Pp3/8/2P5/6K1 w - - 0 30",
    "answers": [
      "c4"
    ],
    "goal": "Challenge the base of the d5\u2013e4 pawn chain.",
    "hints": [
      "The d5 pawn supports e4; attack d5 with your c-pawn.",
      "Consider c4."
    ],
    "explanation": "c4 challenges the chain at its base. Black can capture, so calculate the resulting files and pawn structure.",
    "independent": {
      "fen": "6k1/p7/8/4p3/3pP3/8/5P2/6K1 w - - 0 30",
      "answers": [
        "f4"
      ],
      "goal": "Attack the base of the e5\u2013d4 chain.",
      "hints": [
        "The e5 pawn supports d4; f4 attacks e5.",
        "Consider f4."
      ],
      "explanation": "f4 attacks the base. It also opens lines near your king, so this is a structural idea to calculate, not a universal recommendation."
    }
  },
  {
    "id": "fix-pawn-weakness",
    "title": "Fix a pawn target",
    "phase": "middlegame",
    "level": 2,
    "principle": "A pawn can restrain an enemy pawn and make it a lasting target. Before fixing it, check whether you are also giving the opponent a useful outpost.",
    "transfer": "Decide whether the pawn should be blocked, exchanged or allowed to advance.",
    "fen": "6k1/7p/p7/8/P7/8/7P/6K1 w - - 0 30",
    "answers": [
      "a5"
    ],
    "goal": "Fix the pawn on a6 by stopping its advance.",
    "hints": [
      "A5 places your pawn immediately in front of a6.",
      "Consider a5."
    ],
    "explanation": "a5 stops ...a5 and fixes the a6 pawn. Your pawn is fixed too; choose which side can attack the targets more effectively.",
    "independent": {
      "fen": "6k1/p7/7p/8/7P/8/P7/6K1 w - - 0 30",
      "answers": [
        "h5"
      ],
      "goal": "Restrain the h6 pawn.",
      "hints": [
        "Block its forward square.",
        "Consider h5."
      ],
      "explanation": "h5 fixes h6. The opponent can still attack h5 with pieces or a neighboring pawn break."
    }
  },
  {
    "id": "defensive-trade",
    "title": "Trade the active attacker",
    "phase": "middlegame",
    "level": 2,
    "principle": "When under pressure, exchanging an active enemy piece can reduce threats. Count the recapture and avoid trading away the only defender of another weakness.",
    "transfer": "Ask which opposing piece creates the threats before offering a trade.",
    "fen": "6k1/7p/8/8/5r2/8/7P/5RK1 w - - 0 30",
    "answers": [
      "Rxf4"
    ],
    "goal": "Remove the active rook with your rook.",
    "hints": [
      "The f-file between f1 and f4 is clear.",
      "Consider Rxf4."
    ],
    "explanation": "Rxf4 removes the active enemy rook. Always check whether the opponent can recapture or create a new threat.",
    "independent": {
      "fen": "6k1/7p/8/6b1/8/8/P7/2B3K1 w - - 0 30",
      "answers": [
        "Bxg5"
      ],
      "goal": "Exchange the attacking bishop on its diagonal.",
      "hints": [
        "Trace c1\u2013d2\u2013e3\u2013f4\u2013g5.",
        "Consider Bxg5."
      ],
      "explanation": "Bxg5 removes the bishop. The position still needs a fresh threat scan after the trade."
    }
  },
  {
    "id": "intermediate-check",
    "title": "Mate before recapturing",
    "phase": "middlegame",
    "level": 2,
    "principle": "Before an automatic recapture, look for a forcing move that changes the result immediately. A verified checkmate takes precedence over recovering material.",
    "transfer": "Before recapturing, inspect checks and immediate mating threats.",
    "fen": "6k1/5ppp/8/8/8/8/1K6/3qR3 w - - 0 30",
    "answers": [
      "Re8#"
    ],
    "goal": "Your queen was just captured on d1. Find a stronger move than recapturing.",
    "hints": [
      "Check the back rank before automatically playing Rxd1.",
      "Consider Re8#."
    ],
    "explanation": "Re8 is mate. Recovering material with Rxd1 is less important than ending the game.",
    "independent": {
      "fen": "1k6/ppp5/8/8/8/8/6K1/3Rq3 w - - 0 30",
      "answers": [
        "Rd8#"
      ],
      "goal": "Ignore the offered recapture and deliver mate.",
      "hints": [
        "Rxe1 would recover the queen, but look for a back-rank check.",
        "Consider Rd8#."
      ],
      "explanation": "Rd8 is mate. Checks can override a recapture when the whole continuation is verified."
    }
  },
  {
    "id": "attract-king",
    "title": "Draw the king into a fork",
    "phase": "middlegame",
    "level": 2,
    "principle": "A forcing sacrifice can attract the king onto a tactical square. Count the entire continuation and examine alternatives before sacrificing.",
    "transfer": "Name the square you want the king to occupy, the forcing move that invites it, and the follow-up.",
    "fen": "3q2k1/8/8/6N1/8/8/P7/1K5R w - - 0 30",
    "answers": [
      "Rh8+"
    ],
    "goal": "Draw the king toward a checking knight fork.",
    "hints": [
      "If the king captures h8, Nf7+ will attack king and queen.",
      "Consider Rh8+."
    ],
    "explanation": "Rh8+ invites Kxh8, after which Nf7+ forks the king and queen. This is an example line: calculate the opponent\u2019s other legal replies before using a sacrifice in a game.",
    "independent": {
      "fen": "1k2q3/8/8/1N6/8/8/7P/R5K1 w - - 0 30",
      "answers": [
        "Ra8+"
      ],
      "goal": "Offer a rook with check to bring the king onto a fork square.",
      "hints": [
        "After Kxa8, a knight on c7 attacks a8 and e8.",
        "Consider Ra8+."
      ],
      "explanation": "Ra8+ Kxa8 Nc7+ Kb8 Nxe8 trades a rook for a queen in this line. The sacrifice works here because the following checks force the king to move before the queen can escape.",
      "followThrough": [
        {
          "reply": "Kxa8",
          "answers": [
            "Nc7+"
          ],
          "goal": "The king accepted the rook. Fork it and the queen with check.",
          "hints": [
            "A knight on c7 attacks both a8 and e8.",
            "Play Nc7+."
          ]
        },
        {
          "reply": "Kb8",
          "answers": [
            "Nxe8"
          ],
          "goal": "Complete the combination by collecting the queen.",
          "hints": [
            "Your knight on c7 still attacks e8.",
            "Play Nxe8."
          ]
        }
      ]
    }
  },
  {
    "id": "outside-passer",
    "title": "Use an outside passed pawn",
    "phase": "endgame",
    "level": 2,
    "principle": "A distant passed pawn can draw the enemy king away from the other wing. Count whether it can be stopped and whether your king gains enough time.",
    "transfer": "Compare the king\u2019s route to the passer with your king\u2019s route to the remaining pawns.",
    "fen": "8/6k1/6p1/8/P3K3/8/7P/8 w - - 0 30",
    "answers": [
      "a5"
    ],
    "goal": "Advance the outside passer to make it more urgent.",
    "hints": [
      "The a-pawn has no enemy pawn in front of it or on a neighboring file.",
      "Consider a5."
    ],
    "explanation": "a5 gains space on the far wing. It may distract the king later, but a full win still depends on both kings and the other pawns.",
    "independent": {
      "fen": "8/1k6/1p6/8/3K3P/8/P7/8 w - - 0 30",
      "answers": [
        "h5"
      ],
      "goal": "Push the distant passed pawn on the opposite wing.",
      "hints": [
        "The h-file is clear in front of the pawn.",
        "Consider h5."
      ],
      "explanation": "h5 makes progress far from the enemy king. Do not abandon useful king moves without counting the race."
    }
  },
  {
    "id": "king-before-pawn",
    "title": "Bring the king in front",
    "phase": "endgame",
    "level": 2,
    "principle": "A king in front of its passed pawn can control entry squares and escort it forward. Pushing the pawn too soon can deny your king useful squares.",
    "transfer": "In king-and-pawn endings, compare a king move with a pawn push before choosing.",
    "fen": "8/7p/4k3/8/8/4K3/4P3/8 w - - 0 30",
    "answers": [
      "Kd4"
    ],
    "goal": "Bring the king forward to support the pawn\u2019s future advance.",
    "hints": [
      "The pawn can wait while the king improves.",
      "Consider Kd4."
    ],
    "explanation": "Kd4 improves the king without blocking the e-pawn. This is a useful escorting move, not a claim that every king-and-pawn position is won.",
    "independent": {
      "fen": "8/p7/3k4/8/8/3K4/3P4/8 w - - 0 30",
      "answers": [
        "Ke4"
      ],
      "goal": "Advance your king beside the pawn\u2019s future route.",
      "hints": [
        "Compare the activity of Ke4 with an immediate pawn push.",
        "Consider Ke4."
      ],
      "explanation": "Ke4 brings the king forward. Continue checking opposition and spare pawn moves."
    }
  },
  {
    "id": "rook-pawn-corner",
    "title": "Reach the rook-pawn corner",
    "phase": "endgame",
    "level": 2,
    "principle": "A defending king in the promotion corner can often hold against a lone rook pawn because the attacking king cannot drive it out without stalemate.",
    "transfer": "Recognize rook pawns before applying central-pawn rules.",
    "fen": "8/8/8/8/8/p1k5/8/1K6 w - - 0 30",
    "answers": [
      "Ka1"
    ],
    "goal": "Reach the promotion corner in front of the enemy rook pawn.",
    "hints": [
      "Black\u2019s a-pawn promotes on a1.",
      "Consider Ka1."
    ],
    "explanation": "Ka1 reaches the drawing corner against this lone rook pawn. Rook-pawn endings are an exception to many rules for central pawns; do not leave the corner without checking the result.",
    "independent": {
      "fen": "8/8/8/8/8/5k1p/8/6K1 w - - 0 30",
      "answers": [
        "Kh1"
      ],
      "goal": "Occupy the rook pawn\u2019s promotion corner.",
      "hints": [
        "Black\u2019s h-pawn promotes on h1.",
        "Consider Kh1."
      ],
      "explanation": "Kh1 reaches the corner. The attacker cannot simply apply ordinary opposition rules to force the king out and promote a lone rook pawn."
    }
  },
  {
    "id": "bishop-stops-pawn",
    "title": "Stop promotion on the diagonal",
    "phase": "endgame",
    "level": 2,
    "principle": "A bishop can stop a pawn by controlling its promotion square from a safe diagonal. Watch for the enemy king driving it away or blocking its line.",
    "transfer": "Trace the diagonal to the promotion square before chasing the pawn.",
    "fen": "8/8/6k1/8/1B6/8/p6P/6K1 w - - 0 30",
    "answers": [
      "Bc3"
    ],
    "goal": "Control a1 before the pawn promotes.",
    "hints": [
      "The diagonal c3\u2013b2\u2013a1 reaches the promotion square.",
      "Consider Bc3."
    ],
    "explanation": "Bc3 controls a1. If Black promotes immediately, the bishop can capture the new piece.",
    "independent": {
      "fen": "8/5k2/2B5/8/8/8/1p5P/6K1 w - - 0 30",
      "answers": [
        "Be4"
      ],
      "goal": "Control the promotion square from a safe diagonal.",
      "hints": [
        "e4\u2013d3\u2013c2\u2013b1 reaches b1.",
        "Consider Be4."
      ],
      "explanation": "Be4 controls b1. The example promotion is met by Bxb1, removing the new queen.",
      "followThrough": [
        {
          "reply": "b1=Q+",
          "answers": [
            "Bxb1"
          ],
          "goal": "The pawn promoted. Capture the new queen along your prepared diagonal.",
          "hints": [
            "The route e4\u2013d3\u2013c2\u2013b1 is clear.",
            "Play Bxb1."
          ]
        }
      ]
    }
  },
  {
    "id": "knight-blockade",
    "title": "Stop a passer with a knight",
    "phase": "endgame",
    "level": 2,
    "principle": "A knight in front of a pawn can stop its advance while attacking squares around it. Check that the enemy king cannot simply capture or drive it away.",
    "transfer": "Place the blockader where the pawn cannot attack it.",
    "fen": "7k/8/8/3p4/8/5N2/P7/6K1 w - - 0 30",
    "answers": [
      "Nd4"
    ],
    "goal": "Block the passed pawn with a knight.",
    "hints": [
      "The d4 square is immediately in front of d5.",
      "Consider Nd4."
    ],
    "explanation": "Nd4 stops the pawn\u2019s advance. The pawn cannot capture the piece directly in front of it.",
    "independent": {
      "fen": "k7/8/8/4p3/8/2N5/7P/6K1 w - - 0 30",
      "answers": [
        "Ne4"
      ],
      "goal": "Block the passed e-pawn.",
      "hints": [
        "A knight on e4 stops ...e4.",
        "Consider Ne4."
      ],
      "explanation": "Ne4 blockades the pawn. Keeping the knight safe is the next part of the defensive job."
    }
  },
  {
    "id": "rook-behind-enemy",
    "title": "Get behind the enemy passer",
    "phase": "endgame",
    "level": 2,
    "principle": "A rook behind an enemy passed pawn attacks it along its file and can keep checking the king from a distance. Check whether the pawn is too close to promotion first.",
    "transfer": "Compare a passive blockade with active pressure from behind.",
    "fen": "R7/7k/8/8/3p4/8/7P/6K1 w - - 0 30",
    "answers": [
      "Rd8"
    ],
    "goal": "Place your rook behind Black\u2019s passed d-pawn.",
    "hints": [
      "Black\u2019s pawn travels toward d1; its rear is toward d8.",
      "Consider Rd8."
    ],
    "explanation": "Rd8 attacks d4 from behind. The rook can keep pressure as the pawn advances.",
    "independent": {
      "fen": "7R/k7/8/8/4p3/8/P7/6K1 w - - 0 30",
      "answers": [
        "Re8"
      ],
      "goal": "Attack the enemy passer from behind.",
      "hints": [
        "For a black pawn on e4, a rook on e8 is behind it.",
        "Consider Re8."
      ],
      "explanation": "Re8 puts the rook on the pawn\u2019s file. Keep enough checking distance from the king when it approaches."
    }
  },
  {
    "id": "rook-check-from-side",
    "title": "Check from the side",
    "phase": "endgame",
    "level": 2,
    "principle": "A rook can harass a king from the side while staying several files away. Side checks work only when the king has no shelter and the rook remains safe.",
    "transfer": "Check the distance and available shelter before starting a series of rook checks.",
    "fen": "8/8/8/4k3/R3p3/8/7P/6K1 w - - 0 30",
    "answers": [
      "Ra5+"
    ],
    "goal": "Give a distant side check.",
    "hints": [
      "From a5 the rook checks e5 across the rank.",
      "Consider Ra5+."
    ],
    "explanation": "Ra5+ checks from four files away. The king cannot capture the rook immediately, but may seek shelter.",
    "independent": {
      "fen": "8/8/8/8/3k4/3p3R/P7/6K1 w - - 0 30",
      "answers": [
        "Rh4+"
      ],
      "goal": "Check the king from the far side of the board.",
      "hints": [
        "The fourth rank is clear between h4 and d4.",
        "Consider Rh4+."
      ],
      "explanation": "Rh4+ keeps distance while checking. Reassess after the king moves instead of repeating checks automatically."
    }
  }
];
