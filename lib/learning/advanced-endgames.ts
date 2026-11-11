import type { Sequence } from "./sequences";

// Authored full techniques, verified against six-piece Syzygy outcomes.
// Transfer boards reflect files; both player colors are supported by lessonForSide.
export const ADVANCED_ENDGAMES: Sequence[] = [
  {
    "id": "lucena-bridge",
    "title": "Lucena: build the bridge",
    "phase": "endgame",
    "level": 2,
    "principle": "With a non-rook pawn one step from promotion, your king needs shelter from rook checks. Drive the enemy king away, prepare a rook on your fourth rank, then bring the king out and interpose that rook under its protection.",
    "transfer": "Recognize the king cut-off and bridge square before starting the king walk. These are selected defensive lines, not every possible rook check.",
    "fen": "2K5/2P1k3/8/8/8/8/r7/3R4 w - - 0 1",
    "answers": [
      "Re1+"
    ],
    "goal": "Cut the defending king farther away with a check on the e-file.",
    "hints": [
      "The king must leave e7 before your rook can build shelter.",
      "Play Re1+."
    ],
    "explanation": "You cut the king off, prepared the rook on your fourth rank, walked out through the checks and blocked on c4. After the rook exchange, your pawn promotes. This is the Lucena bridge technique; the exercise ends at a winning queen position, not checkmate.",
    "followThrough": [
      {
        "reply": "Kf7",
        "answers": [
          "Re4"
        ],
        "goal": "Prepare the bridge: lift your rook to your fourth rank.",
        "hints": [
          "Keep the e-file cut-off while putting the rook where it can later block checks.",
          "Play Re4."
        ]
      },
      {
        "reply": "Ra1",
        "answers": [
          "Kd7"
        ],
        "goal": "Step out beside your pawn, toward d7.",
        "hints": [
          "The defending king on f7 cannot attack d7.",
          "Play Kd7."
        ]
      },
      {
        "reply": "Rd1+",
        "answers": [
          "Kc6"
        ],
        "goal": "Answer the file check by moving to c6, still protecting the pawn.",
        "hints": [
          "Your king on c6 protects c7 and invites a check on the c-file.",
          "Play Kc6."
        ]
      },
      {
        "reply": "Rc1+",
        "answers": [
          "Kd6"
        ],
        "goal": "Cross to d6 while keeping your pawn protected.",
        "hints": [
          "The pawn on c7 remains within your king’s reach.",
          "Play Kd6."
        ]
      },
      {
        "reply": "Rd1+",
        "answers": [
          "Kc5"
        ],
        "goal": "Approach your bridge square by stepping to c5.",
        "hints": [
          "From c5 your king can protect a rook placed on c4.",
          "Play Kc5."
        ]
      },
      {
        "reply": "Rc1+",
        "answers": [
          "Rc4"
        ],
        "goal": "Build the bridge: block the check with your rook on c4.",
        "hints": [
          "Your king protects c4. The checking rook cannot win this blocker for free.",
          "Play Rc4."
        ]
      },
      {
        "reply": "Rxc4+",
        "answers": [
          "Kxc4"
        ],
        "goal": "The opponent exchanged rooks. Recapture with your king.",
        "hints": [
          "Kxc4 removes the last checking piece.",
          "Play Kxc4."
        ]
      },
      {
        "reply": "Ke6",
        "answers": [
          "c8=Q+"
        ],
        "goal": "Complete the conversion by promoting your pawn to a queen.",
        "hints": [
          "The enemy king is too far away to capture on c8.",
          "Play c8=Q+."
        ]
      }
    ],
    "replyVariants": [
      {
        "id": "line-2",
        "followThrough": [
          {
            "reply": "Kf7",
            "answers": [
              "Re4"
            ],
            "goal": "Prepare the bridge: lift your rook to your fourth rank.",
            "hints": [
              "Keep the e-file cut-off while putting the rook where it can later block checks.",
              "Play Re4."
            ]
          },
          {
            "reply": "Ra1",
            "answers": [
              "Kd7"
            ],
            "goal": "Step out beside your pawn, toward d7.",
            "hints": [
              "The defending king on f7 cannot attack d7.",
              "Play Kd7."
            ]
          },
          {
            "reply": "Rd1+",
            "answers": [
              "Kc6"
            ],
            "goal": "Answer the file check by moving to c6, still protecting the pawn.",
            "hints": [
              "Your king on c6 protects c7 and invites a check on the c-file.",
              "Play Kc6."
            ]
          },
          {
            "reply": "Rc1+",
            "answers": [
              "Kd6"
            ],
            "goal": "Cross to d6 while keeping your pawn protected.",
            "hints": [
              "The pawn on c7 remains within your king’s reach.",
              "Play Kd6."
            ]
          },
          {
            "reply": "Rd1+",
            "answers": [
              "Kc5"
            ],
            "goal": "Approach your bridge square by stepping to c5.",
            "hints": [
              "From c5 your king can protect a rook placed on c4.",
              "Play Kc5."
            ]
          },
          {
            "reply": "Rc1+",
            "answers": [
              "Rc4"
            ],
            "goal": "Build the bridge: block the check with your rook on c4.",
            "hints": [
              "Your king protects c4. The checking rook cannot win this blocker for free.",
              "Play Rc4."
            ]
          },
          {
            "reply": "Rb1",
            "answers": [
              "c8=Q"
            ],
            "goal": "The rook declined the exchange. Promote while your bridge stops the checks.",
            "hints": [
              "Your rook on c4 still shields the king along the c-file.",
              "Play c8=Q."
            ]
          }
        ],
        "explanation": "The defender kept the rook instead of exchanging on c4. Your bridge still gives the king shelter, so the pawn promotes. You have reached a winning queen-and-rook versus rook position; further conversion is outside this exercise."
      }
    ],
    "independent": {
      "fen": "5K2/3k1P2/8/8/8/8/7r/4R3 w - - 0 1",
      "answers": [
        "Rd1+"
      ],
      "goal": "Cut the defending king farther away with a check on the d-file.",
      "hints": [
        "The king must leave d7 before your rook can build shelter.",
        "Play Rd1+."
      ],
      "explanation": "You cut the king off, prepared the rook on your fourth rank, walked out through the checks and blocked on f4. After the rook exchange, your pawn promotes. This is the Lucena bridge technique; the exercise ends at a winning queen position, not checkmate.",
      "followThrough": [
        {
          "reply": "Kc7",
          "answers": [
            "Rd4"
          ],
          "goal": "Prepare the bridge: lift your rook to your fourth rank.",
          "hints": [
            "Keep the d-file cut-off while putting the rook where it can later block checks.",
            "Play Rd4."
          ]
        },
        {
          "reply": "Rh1",
          "answers": [
            "Ke7"
          ],
          "goal": "Step out beside your pawn, toward e7.",
          "hints": [
            "The defending king on c7 cannot attack e7.",
            "Play Ke7."
          ]
        },
        {
          "reply": "Re1+",
          "answers": [
            "Kf6"
          ],
          "goal": "Answer the file check by moving to f6, still protecting the pawn.",
          "hints": [
            "Your king on f6 protects f7 and invites a check on the f-file.",
            "Play Kf6."
          ]
        },
        {
          "reply": "Rf1+",
          "answers": [
            "Ke6"
          ],
          "goal": "Cross to e6 while keeping your pawn protected.",
          "hints": [
            "The pawn on f7 remains within your king’s reach.",
            "Play Ke6."
          ]
        },
        {
          "reply": "Re1+",
          "answers": [
            "Kf5"
          ],
          "goal": "Approach your bridge square by stepping to f5.",
          "hints": [
            "From f5 your king can protect a rook placed on f4.",
            "Play Kf5."
          ]
        },
        {
          "reply": "Rf1+",
          "answers": [
            "Rf4"
          ],
          "goal": "Build the bridge: block the check with your rook on f4.",
          "hints": [
            "Your king protects f4. The checking rook cannot win this blocker for free.",
            "Play Rf4."
          ]
        },
        {
          "reply": "Rxf4+",
          "answers": [
            "Kxf4"
          ],
          "goal": "The opponent exchanged rooks. Recapture with your king.",
          "hints": [
            "Kxf4 removes the last checking piece.",
            "Play Kxf4."
          ]
        },
        {
          "reply": "Kd6",
          "answers": [
            "f8=Q+"
          ],
          "goal": "Complete the conversion by promoting your pawn to a queen.",
          "hints": [
            "The enemy king is too far away to capture on f8.",
            "Play f8=Q+."
          ]
        }
      ],
      "replyVariants": [
        {
          "id": "line-2",
          "followThrough": [
            {
              "reply": "Kc7",
              "answers": [
                "Rd4"
              ],
              "goal": "Prepare the bridge: lift your rook to your fourth rank.",
              "hints": [
                "Keep the d-file cut-off while putting the rook where it can later block checks.",
                "Play Rd4."
              ]
            },
            {
              "reply": "Rh1",
              "answers": [
                "Ke7"
              ],
              "goal": "Step out beside your pawn, toward e7.",
              "hints": [
                "The defending king on c7 cannot attack e7.",
                "Play Ke7."
              ]
            },
            {
              "reply": "Re1+",
              "answers": [
                "Kf6"
              ],
              "goal": "Answer the file check by moving to f6, still protecting the pawn.",
              "hints": [
                "Your king on f6 protects f7 and invites a check on the f-file.",
                "Play Kf6."
              ]
            },
            {
              "reply": "Rf1+",
              "answers": [
                "Ke6"
              ],
              "goal": "Cross to e6 while keeping your pawn protected.",
              "hints": [
                "The pawn on f7 remains within your king’s reach.",
                "Play Ke6."
              ]
            },
            {
              "reply": "Re1+",
              "answers": [
                "Kf5"
              ],
              "goal": "Approach your bridge square by stepping to f5.",
              "hints": [
                "From f5 your king can protect a rook placed on f4.",
                "Play Kf5."
              ]
            },
            {
              "reply": "Rf1+",
              "answers": [
                "Rf4"
              ],
              "goal": "Build the bridge: block the check with your rook on f4.",
              "hints": [
                "Your king protects f4. The checking rook cannot win this blocker for free.",
                "Play Rf4."
              ]
            },
            {
              "reply": "Rg1",
              "answers": [
                "f8=Q"
              ],
              "goal": "The rook declined the exchange. Promote while your bridge stops the checks.",
              "hints": [
                "Your rook on f4 still shields the king along the f-file.",
                "Play f8=Q."
              ]
            }
          ],
          "explanation": "The defender kept the rook instead of exchanging on f4. Your bridge still gives the king shelter, so the pawn promotes. You have reached a winning queen-and-rook versus rook position; further conversion is outside this exercise."
        }
      ]
    }
  },
  {
    "id": "philidor-defense",
    "title": "Philidor: hold the draw",
    "phase": "endgame",
    "level": 2,
    "principle": "Keep your king in front of the pawn and your rook on your third rank to deny the attacking king entry. When the pawn reaches that rank, retreat the rook behind the king and check from a distance.",
    "transfer": "Recognize when the pawn advance changes your job from holding a barrier to checking from behind.",
    "fen": "8/8/8/4p3/5k2/1R6/r7/4K3 w - - 0 1",
    "answers": [
      "Rc3"
    ],
    "goal": "Keep the barrier: move your rook along your third rank to c3.",
    "hints": [
      "Your king blocks the pawn’s file; the rook keeps the enemy king off your third rank.",
      "Play Rc3."
    ],
    "explanation": "You held the barrier on your third rank until the pawn advanced, then checked from behind. This particular defense reaches a third occurrence with the same side to move, so a draw can be claimed. Other king replies need fresh checks; repetition is not forced against every choice.",
    "followThrough": [
      {
        "reply": "e4",
        "answers": [
          "Rb3"
        ],
        "goal": "Hold your third rank again with Rb3 while the pawn advances.",
        "hints": [
          "Do not abandon the barrier while the enemy king could still step forward.",
          "Play Rb3."
        ]
      },
      {
        "reply": "e3",
        "answers": [
          "Rb8"
        ],
        "goal": "The pawn reached your third rank. Switch your rook behind the enemy king, to b8.",
        "hints": [
          "Now the pawn itself takes away shelter. Prepare checks from the back.",
          "Play Rb8."
        ]
      },
      {
        "reply": "Kf3",
        "answers": [
          "Rf8+"
        ],
        "goal": "Check the exposed king along the f-file.",
        "hints": [
          "Rf8+ keeps checking distance and prevents the king from settling in front of the pawn.",
          "Play Rf8+."
        ]
      },
      {
        "reply": "Ke4",
        "answers": [
          "Re8+"
        ],
        "goal": "Follow the king to the e-file with another distant check.",
        "hints": [
          "Re8+ checks on the new file while the pawn has no forward shelter to offer.",
          "Play Re8+."
        ]
      },
      {
        "reply": "Kf3",
        "answers": [
          "Rf8+"
        ],
        "goal": "Return to the f-file and keep checking.",
        "hints": [
          "The king returned to f3; match its file with Rf8+.",
          "Play Rf8+."
        ]
      },
      {
        "reply": "Ke4",
        "answers": [
          "Re8+"
        ],
        "goal": "Check on the e-file again.",
        "hints": [
          "The same king move calls for the same distant check.",
          "Play Re8+."
        ]
      },
      {
        "reply": "Kf3",
        "answers": [
          "Rf8+"
        ],
        "goal": "Give the final f-file check to reach the third occurrence.",
        "hints": [
          "The position after Rf8+ has already appeared twice in this line.",
          "Play Rf8+."
        ]
      }
    ],
    "replyVariants": [
      {
        "id": "line-2",
        "followThrough": [
          {
            "reply": "e4",
            "answers": [
              "Rb3"
            ],
            "goal": "Hold your third rank again with Rb3 while the pawn advances.",
            "hints": [
              "Do not abandon the barrier while the enemy king could still step forward.",
              "Play Rb3."
            ]
          },
          {
            "reply": "e3",
            "answers": [
              "Rb8"
            ],
            "goal": "The pawn reached your third rank. Switch your rook behind the enemy king, to b8.",
            "hints": [
              "Now the pawn itself takes away shelter. Prepare checks from the back.",
              "Play Rb8."
            ]
          },
          {
            "reply": "Kf3",
            "answers": [
              "Rf8+"
            ],
            "goal": "Check the exposed king along the f-file.",
            "hints": [
              "Rf8+ keeps checking distance and prevents the king from settling in front of the pawn.",
              "Play Rf8+."
            ]
          },
          {
            "reply": "Kg4",
            "answers": [
              "Re8"
            ],
            "goal": "The king abandoned its pawn. Attack the pawn along the e-file.",
            "hints": [
              "Re8 attacks the pawn on e3 without moving your king away from the blockade.",
              "Play Re8."
            ]
          },
          {
            "reply": "Kg5",
            "answers": [
              "Rxe3"
            ],
            "goal": "Remove the abandoned pawn and neutralize the promotion threat.",
            "hints": [
              "The king on g5 no longer protects e3; capture with your rook.",
              "Play Rxe3."
            ]
          }
        ],
        "explanation": "The king ran away from the checks and abandoned its pawn. You attacked it from behind and captured it. The resulting rook versus rook position is drawn with correct play; it is not an automatic insufficient-material draw."
      }
    ],
    "independent": {
      "fen": "8/8/8/3p4/2k5/6R1/7r/3K4 w - - 0 1",
      "answers": [
        "Rf3"
      ],
      "goal": "Keep the barrier: move your rook along your third rank to f3.",
      "hints": [
        "Your king blocks the pawn’s file; the rook keeps the enemy king off your third rank.",
        "Play Rf3."
      ],
      "explanation": "You held the barrier on your third rank until the pawn advanced, then checked from behind. This particular defense reaches a third occurrence with the same side to move, so a draw can be claimed. Other king replies need fresh checks; repetition is not forced against every choice.",
      "followThrough": [
        {
          "reply": "d4",
          "answers": [
            "Rg3"
          ],
          "goal": "Hold your third rank again with Rg3 while the pawn advances.",
          "hints": [
            "Do not abandon the barrier while the enemy king could still step forward.",
            "Play Rg3."
          ]
        },
        {
          "reply": "d3",
          "answers": [
            "Rg8"
          ],
          "goal": "The pawn reached your third rank. Switch your rook behind the enemy king, to g8.",
          "hints": [
            "Now the pawn itself takes away shelter. Prepare checks from the back.",
            "Play Rg8."
          ]
        },
        {
          "reply": "Kc3",
          "answers": [
            "Rc8+"
          ],
          "goal": "Check the exposed king along the c-file.",
          "hints": [
            "Rc8+ keeps checking distance and prevents the king from settling in front of the pawn.",
            "Play Rc8+."
          ]
        },
        {
          "reply": "Kd4",
          "answers": [
            "Rd8+"
          ],
          "goal": "Follow the king to the d-file with another distant check.",
          "hints": [
            "Rd8+ checks on the new file while the pawn has no forward shelter to offer.",
            "Play Rd8+."
          ]
        },
        {
          "reply": "Kc3",
          "answers": [
            "Rc8+"
          ],
          "goal": "Return to the c-file and keep checking.",
          "hints": [
            "The king returned to c3; match its file with Rc8+.",
            "Play Rc8+."
          ]
        },
        {
          "reply": "Kd4",
          "answers": [
            "Rd8+"
          ],
          "goal": "Check on the d-file again.",
          "hints": [
            "The same king move calls for the same distant check.",
            "Play Rd8+."
          ]
        },
        {
          "reply": "Kc3",
          "answers": [
            "Rc8+"
          ],
          "goal": "Give the final c-file check to reach the third occurrence.",
          "hints": [
            "The position after Rc8+ has already appeared twice in this line.",
            "Play Rc8+."
          ]
        }
      ],
      "replyVariants": [
        {
          "id": "line-2",
          "followThrough": [
            {
              "reply": "d4",
              "answers": [
                "Rg3"
              ],
              "goal": "Hold your third rank again with Rg3 while the pawn advances.",
              "hints": [
                "Do not abandon the barrier while the enemy king could still step forward.",
                "Play Rg3."
              ]
            },
            {
              "reply": "d3",
              "answers": [
                "Rg8"
              ],
              "goal": "The pawn reached your third rank. Switch your rook behind the enemy king, to g8.",
              "hints": [
                "Now the pawn itself takes away shelter. Prepare checks from the back.",
                "Play Rg8."
              ]
            },
            {
              "reply": "Kc3",
              "answers": [
                "Rc8+"
              ],
              "goal": "Check the exposed king along the c-file.",
              "hints": [
                "Rc8+ keeps checking distance and prevents the king from settling in front of the pawn.",
                "Play Rc8+."
              ]
            },
            {
              "reply": "Kb4",
              "answers": [
                "Rd8"
              ],
              "goal": "The king abandoned its pawn. Attack the pawn along the d-file.",
              "hints": [
                "Rd8 attacks the pawn on d3 without moving your king away from the blockade.",
                "Play Rd8."
              ]
            },
            {
              "reply": "Kb5",
              "answers": [
                "Rxd3"
              ],
              "goal": "Remove the abandoned pawn and neutralize the promotion threat.",
              "hints": [
                "The king on b5 no longer protects d3; capture with your rook.",
                "Play Rxd3."
              ]
            }
          ],
          "explanation": "The king ran away from the checks and abandoned its pawn. You attacked it from behind and captured it. The resulting rook versus rook position is drawn with correct play; it is not an automatic insufficient-material draw."
        }
      ]
    }
  },
  {
    "id": "rook-mate-conversion",
    "title": "Rook and king: finish the job",
    "phase": "endgame",
    "level": 2,
    "principle": "A rook needs its king’s help. Restrict the enemy king, bring your king closer, tighten the box, and use a waiting move when checking would release it. The final check must leave no escape.",
    "transfer": "Name the rank or file your rook seals and the squares your king controls. This line is one winning route; the exercise asks for a specific technique, not the only winning move.",
    "fen": "8/8/3k4/8/5K2/8/8/R7 w - - 0 1",
    "answers": [
      "Rd1+"
    ],
    "goal": "Check on the d-file to push the king toward the edge.",
    "hints": [
      "Rd1+ cuts through d6 and starts restricting the king’s space.",
      "Play Rd1+."
    ],
    "explanation": "You used rook cut-offs, king support, a smaller box and a waiting move before delivering checkmate. A rook alone cannot seal every escape: the king on b6 does the final supporting work.",
    "followThrough": [
      {
        "reply": "Kc5",
        "answers": [
          "Ke4"
        ],
        "goal": "Bring your king one step closer on e4.",
        "hints": [
          "Keep the rook’s cut-off while your king joins the conversion.",
          "Play Ke4."
        ]
      },
      {
        "reply": "Kb4",
        "answers": [
          "Rc1"
        ],
        "goal": "Seal the c-file with your rook.",
        "hints": [
          "Rc1 prevents the king from crossing toward your king.",
          "Play Rc1."
        ]
      },
      {
        "reply": "Kb5",
        "answers": [
          "Kd4"
        ],
        "goal": "Bring your king to d4 behind the rook’s fence.",
        "hints": [
          "Your king helps take away the next rank without exposing the rook.",
          "Play Kd4."
        ]
      },
      {
        "reply": "Kb6",
        "answers": [
          "Rc5"
        ],
        "goal": "Shrink the box with Rc5.",
        "hints": [
          "Your king protects c5, and the rook seals the rank through c5.",
          "Play Rc5."
        ]
      },
      {
        "reply": "Ka6",
        "answers": [
          "Kc4"
        ],
        "goal": "Bring your king to c4, supporting the rook from behind.",
        "hints": [
          "The enemy king on a6 cannot cross the rook’s barrier across c5.",
          "Play Kc4."
        ]
      },
      {
        "reply": "Kb6",
        "answers": [
          "Kb4"
        ],
        "goal": "Approach on b4 while keeping your rook protected.",
        "hints": [
          "Your king is ready to support the next fence on b5.",
          "Play Kb4."
        ]
      },
      {
        "reply": "Ka6",
        "answers": [
          "Rb5"
        ],
        "goal": "Tighten the box with Rb5.",
        "hints": [
          "The king on b4 protects b5, so the rook stays safe.",
          "Play Rb5."
        ]
      },
      {
        "reply": "Ka7",
        "answers": [
          "Ka5"
        ],
        "goal": "Move your king to a5 to take more space.",
        "hints": [
          "From a5 your king controls a6 and b6.",
          "Play Ka5."
        ]
      },
      {
        "reply": "Ka8",
        "answers": [
          "Kb6"
        ],
        "goal": "Move to b6 to control a7, b7 and c7.",
        "hints": [
          "Your king covers a7, b7 and c7.",
          "Play Kb6."
        ]
      },
      {
        "reply": "Kb8",
        "answers": [
          "Rc5"
        ],
        "goal": "Make a waiting rook move to c5, preserving the fence.",
        "hints": [
          "The enemy king on b8 must return toward a8; checking now is unnecessary.",
          "Play Rc5."
        ]
      },
      {
        "reply": "Ka8",
        "answers": [
          "Rc8#"
        ],
        "goal": "Finish with a check along the enemy back rank.",
        "hints": [
          "Rc8# checks the king on a8; your king covers the escape squares a7 and b7.",
          "Play Rc8#."
        ]
      }
    ],
    "independent": {
      "fen": "8/8/4k3/8/2K5/8/8/7R w - - 0 1",
      "answers": [
        "Re1+"
      ],
      "goal": "Check on the e-file to push the king toward the edge.",
      "hints": [
        "Re1+ cuts through e6 and starts restricting the king’s space.",
        "Play Re1+."
      ],
      "explanation": "You used rook cut-offs, king support, a smaller box and a waiting move before delivering checkmate. A rook alone cannot seal every escape: the king on g6 does the final supporting work.",
      "followThrough": [
        {
          "reply": "Kf5",
          "answers": [
            "Kd4"
          ],
          "goal": "Bring your king one step closer on d4.",
          "hints": [
            "Keep the rook’s cut-off while your king joins the conversion.",
            "Play Kd4."
          ]
        },
        {
          "reply": "Kg4",
          "answers": [
            "Rf1"
          ],
          "goal": "Seal the f-file with your rook.",
          "hints": [
            "Rf1 prevents the king from crossing toward your king.",
            "Play Rf1."
          ]
        },
        {
          "reply": "Kg5",
          "answers": [
            "Ke4"
          ],
          "goal": "Bring your king to e4 behind the rook’s fence.",
          "hints": [
            "Your king helps take away the next rank without exposing the rook.",
            "Play Ke4."
          ]
        },
        {
          "reply": "Kg6",
          "answers": [
            "Rf5"
          ],
          "goal": "Shrink the box with Rf5.",
          "hints": [
            "Your king protects f5, and the rook seals the rank through f5.",
            "Play Rf5."
          ]
        },
        {
          "reply": "Kh6",
          "answers": [
            "Kf4"
          ],
          "goal": "Bring your king to f4, supporting the rook from behind.",
          "hints": [
            "The enemy king on h6 cannot cross the rook’s barrier across f5.",
            "Play Kf4."
          ]
        },
        {
          "reply": "Kg6",
          "answers": [
            "Kg4"
          ],
          "goal": "Approach on g4 while keeping your rook protected.",
          "hints": [
            "Your king is ready to support the next fence on g5.",
            "Play Kg4."
          ]
        },
        {
          "reply": "Kh6",
          "answers": [
            "Rg5"
          ],
          "goal": "Tighten the box with Rg5.",
          "hints": [
            "The king on g4 protects g5, so the rook stays safe.",
            "Play Rg5."
          ]
        },
        {
          "reply": "Kh7",
          "answers": [
            "Kh5"
          ],
          "goal": "Move your king to h5 to take more space.",
          "hints": [
            "From h5 your king controls h6 and g6.",
            "Play Kh5."
          ]
        },
        {
          "reply": "Kh8",
          "answers": [
            "Kg6"
          ],
          "goal": "Move to g6 to control h7, g7 and f7.",
          "hints": [
            "Your king covers h7, g7 and f7.",
            "Play Kg6."
          ]
        },
        {
          "reply": "Kg8",
          "answers": [
            "Rf5"
          ],
          "goal": "Make a waiting rook move to f5, preserving the fence.",
          "hints": [
            "The enemy king on g8 must return toward h8; checking now is unnecessary.",
            "Play Rf5."
          ]
        },
        {
          "reply": "Kh8",
          "answers": [
            "Rf8#"
          ],
          "goal": "Finish with a check along the enemy back rank.",
          "hints": [
            "Rf8# checks the king on h8; your king covers the escape squares h7 and g7.",
            "Play Rf8#."
          ]
        }
      ]
    }
  },
  {
    "id": "queen-mate-conversion",
    "title": "Queen and king: convert safely",
    "phase": "endgame",
    "level": 2,
    "principle": "Use the queen to restrict the enemy king and bring your king close enough to support mate. Check for a legal enemy move after every quiet move so a won ending does not become stalemate.",
    "transfer": "Constrain first, support second, finish with a protected check. The requested moves demonstrate one route; other winning moves can exist.",
    "fen": "8/8/5k2/8/8/2K5/8/1Q6 w - - 0 1",
    "answers": [
      "Kd4"
    ],
    "goal": "Activate your king on d4 before tightening the net.",
    "hints": [
      "The enemy king is distant enough for your king to step forward.",
      "Play Kd4."
    ],
    "explanation": "You brought the king closer, restricted the defender and preserved legal moves until the final check. Qb5# is protected by your king. The ending is actual checkmate, not merely a queen move that looks threatening.",
    "followThrough": [
      {
        "reply": "Ke6",
        "answers": [
          "Qf1"
        ],
        "goal": "Place your queen on f1 to take away the f-file.",
        "hints": [
          "This keeps the enemy king on one side of the board while your king controls the center.",
          "Play Qf1."
        ]
      },
      {
        "reply": "Kd6",
        "answers": [
          "Qf6+"
        ],
        "goal": "Check on f6 and cut off the rank through f6.",
        "hints": [
          "Qf6+ forces the king back while keeping the queen out of reach.",
          "Play Qf6+."
        ]
      },
      {
        "reply": "Kc7",
        "answers": [
          "Kc5"
        ],
        "goal": "Bring your king to c5 to help close the net.",
        "hints": [
          "The queen holds the rank through f6; your king can safely approach.",
          "Play Kc5."
        ]
      },
      {
        "reply": "Kb7",
        "answers": [
          "Qe7+"
        ],
        "goal": "Check along the rank through b7 with Qe7+.",
        "hints": [
          "The queen and king now work together to push the defender to the edge.",
          "Play Qe7+."
        ]
      },
      {
        "reply": "Ka6",
        "answers": [
          "Qd7"
        ],
        "goal": "Play Qd7 to limit the king while leaving it a legal move.",
        "hints": [
          "The king can still move to a5. This quiet move is not stalemate.",
          "Play Qd7."
        ]
      },
      {
        "reply": "Ka5",
        "answers": [
          "Qb5#"
        ],
        "goal": "Deliver a protected queen mate beside the king.",
        "hints": [
          "Your king on c5 protects b5; Qb5# covers the remaining escapes.",
          "Play Qb5#."
        ]
      }
    ],
    "independent": {
      "fen": "8/8/2k5/8/8/5K2/8/6Q1 w - - 0 1",
      "answers": [
        "Ke4"
      ],
      "goal": "Activate your king on e4 before tightening the net.",
      "hints": [
        "The enemy king is distant enough for your king to step forward.",
        "Play Ke4."
      ],
      "explanation": "You brought the king closer, restricted the defender and preserved legal moves until the final check. Qg5# is protected by your king. The ending is actual checkmate, not merely a queen move that looks threatening.",
      "followThrough": [
        {
          "reply": "Kd6",
          "answers": [
            "Qc1"
          ],
          "goal": "Place your queen on c1 to take away the c-file.",
          "hints": [
            "This keeps the enemy king on one side of the board while your king controls the center.",
            "Play Qc1."
          ]
        },
        {
          "reply": "Ke6",
          "answers": [
            "Qc6+"
          ],
          "goal": "Check on c6 and cut off the rank through c6.",
          "hints": [
            "Qc6+ forces the king back while keeping the queen out of reach.",
            "Play Qc6+."
          ]
        },
        {
          "reply": "Kf7",
          "answers": [
            "Kf5"
          ],
          "goal": "Bring your king to f5 to help close the net.",
          "hints": [
            "The queen holds the rank through c6; your king can safely approach.",
            "Play Kf5."
          ]
        },
        {
          "reply": "Kg7",
          "answers": [
            "Qd7+"
          ],
          "goal": "Check along the rank through g7 with Qd7+.",
          "hints": [
            "The queen and king now work together to push the defender to the edge.",
            "Play Qd7+."
          ]
        },
        {
          "reply": "Kh6",
          "answers": [
            "Qe7"
          ],
          "goal": "Play Qe7 to limit the king while leaving it a legal move.",
          "hints": [
            "The king can still move to h5. This quiet move is not stalemate.",
            "Play Qe7."
          ]
        },
        {
          "reply": "Kh5",
          "answers": [
            "Qg5#"
          ],
          "goal": "Deliver a protected queen mate beside the king.",
          "hints": [
            "Your king on f5 protects g5; Qg5# covers the remaining escapes.",
            "Play Qg5#."
          ]
        }
      ]
    }
  },
  {
    "id": "key-square-conversion",
    "title": "Key squares: escort to promotion",
    "phase": "endgame",
    "level": 2,
    "principle": "For a non-rook pawn on your fourth rank, the three squares two ranks ahead are key squares. Reaching one with your king secures the promotion route with correct play. Keep the king ahead until it is safe to advance.",
    "transfer": "Reach a key square, keep the pawn protected and clear its promotion square before pushing.",
    "fen": "4k3/8/8/4K3/4P3/8/8/8 w - - 0 1",
    "answers": [
      "Kf6"
    ],
    "goal": "Reach the key square f6 with your king.",
    "hints": [
      "For the pawn on e4, d6, e6 and f6 are the key squares.",
      "Play Kf6."
    ],
    "explanation": "You reached a key square, used opposition to gain entry, and kept your king ahead until the pawn could advance safely. Promotion completes this technique; the resulting queen still needs to deliver mate in a game.",
    "followThrough": [
      {
        "reply": "Kd7",
        "answers": [
          "e5"
        ],
        "goal": "Advance the pawn now that your king has secured entry.",
        "hints": [
          "e5 puts the pawn directly under your king’s protection.",
          "Play e5."
        ]
      },
      {
        "reply": "Ke8",
        "answers": [
          "Ke6"
        ],
        "goal": "Take opposition on e6 when the defender returns to e8.",
        "hints": [
          "Your king stays in front of the pawn; do not rush it into a blockade.",
          "Play Ke6."
        ]
      },
      {
        "reply": "Kd8",
        "answers": [
          "Kf7"
        ],
        "goal": "Step to f7 to control the promotion square.",
        "hints": [
          "The enemy king moved to d8, leaving f7 safe.",
          "Play Kf7."
        ]
      },
      {
        "reply": "Kc7",
        "answers": [
          "e6"
        ],
        "goal": "Advance the pawn to e6 while your king guards its route.",
        "hints": [
          "From f7 your king protects e6, e7 and e8.",
          "Play e6."
        ]
      },
      {
        "reply": "Kb6",
        "answers": [
          "e7"
        ],
        "goal": "Bring the pawn to e7 under king protection.",
        "hints": [
          "The distant defender cannot catch the pawn.",
          "Play e7."
        ]
      },
      {
        "reply": "Kc5",
        "answers": [
          "e8=Q"
        ],
        "goal": "Promote to a queen on the square your king controls.",
        "hints": [
          "The king on f7 protects e8.",
          "Play e8=Q."
        ]
      }
    ],
    "independent": {
      "fen": "3k4/8/8/3K4/3P4/8/8/8 w - - 0 1",
      "answers": [
        "Kc6"
      ],
      "goal": "Reach the key square c6 with your king.",
      "hints": [
        "For the pawn on d4, e6, d6 and c6 are the key squares.",
        "Play Kc6."
      ],
      "explanation": "You reached a key square, used opposition to gain entry, and kept your king ahead until the pawn could advance safely. Promotion completes this technique; the resulting queen still needs to deliver mate in a game.",
      "followThrough": [
        {
          "reply": "Ke7",
          "answers": [
            "d5"
          ],
          "goal": "Advance the pawn now that your king has secured entry.",
          "hints": [
            "d5 puts the pawn directly under your king’s protection.",
            "Play d5."
          ]
        },
        {
          "reply": "Kd8",
          "answers": [
            "Kd6"
          ],
          "goal": "Take opposition on d6 when the defender returns to d8.",
          "hints": [
            "Your king stays in front of the pawn; do not rush it into a blockade.",
            "Play Kd6."
          ]
        },
        {
          "reply": "Ke8",
          "answers": [
            "Kc7"
          ],
          "goal": "Step to c7 to control the promotion square.",
          "hints": [
            "The enemy king moved to e8, leaving c7 safe.",
            "Play Kc7."
          ]
        },
        {
          "reply": "Kf7",
          "answers": [
            "d6"
          ],
          "goal": "Advance the pawn to d6 while your king guards its route.",
          "hints": [
            "From c7 your king protects d6, d7 and d8.",
            "Play d6."
          ]
        },
        {
          "reply": "Kg6",
          "answers": [
            "d7"
          ],
          "goal": "Bring the pawn to d7 under king protection.",
          "hints": [
            "The distant defender cannot catch the pawn.",
            "Play d7."
          ]
        },
        {
          "reply": "Kf5",
          "answers": [
            "d8=Q"
          ],
          "goal": "Promote to a queen on the square your king controls.",
          "hints": [
            "The king on c7 protects d8.",
            "Play d8=Q."
          ]
        }
      ]
    }
  },
  {
    "id": "triangulation-conversion",
    "title": "Triangulation: lose a move, win entry",
    "phase": "endgame",
    "level": 2,
    "principle": "When a king can use a three-square route and its opponent cannot mirror it, returning to the same arrangement can hand over the move. This changes who must give ground. The pawn structure must prevent a useful enemy waiting move.",
    "transfer": "Compare the same position with the other side to move. A triangle is useful only when that change creates an entry.",
    "fen": "8/5k2/5P1p/5K1P/8/8/8/8 w - - 0 1",
    "answers": [
      "Ke5"
    ],
    "goal": "Step to e5 to begin the waiting maneuver.",
    "hints": [
      "Keep f6 protected while making room for a triangular king route.",
      "Play Ke5."
    ],
    "explanation": "The triangular route changed whose turn it was without changing the key arrangement. The defender yielded, your king entered, and you removed the blocker before promoting. The triangle matters because it gains entry; returning to a square alone is not progress.",
    "followThrough": [
      {
        "reply": "Kf8",
        "answers": [
          "Kf4"
        ],
        "goal": "Take the long route through f4.",
        "hints": [
          "The defender has less freedom: its king must stay near the promotion square.",
          "Play Kf4."
        ]
      },
      {
        "reply": "Ke8",
        "answers": [
          "Ke4"
        ],
        "goal": "Continue the triangle through e4.",
        "hints": [
          "Returning via e4 uses an extra tempo compared with moving straight back.",
          "Play Ke4."
        ]
      },
      {
        "reply": "Kf8",
        "answers": [
          "Ke5"
        ],
        "goal": "Return to e5 and complete the triangle.",
        "hints": [
          "The kings are back on e5 and f8, but now the defender must move.",
          "Play Ke5."
        ]
      },
      {
        "reply": "Kf7",
        "answers": [
          "Kf5"
        ],
        "goal": "Return to f5: the original arrangement now has the opponent to move.",
        "hints": [
          "The extra tempo makes the king leave f7 before you choose your entry.",
          "Play Kf5."
        ]
      },
      {
        "reply": "Kf8",
        "answers": [
          "Kg6"
        ],
        "goal": "Use the entry square g6 after the defender retreats.",
        "hints": [
          "From g6 you protect f6 and attack the pawn on h6.",
          "Play Kg6."
        ]
      },
      {
        "reply": "Ke8",
        "answers": [
          "Kxh6"
        ],
        "goal": "Capture the blocking pawn on h6.",
        "hints": [
          "The defender cannot protect h6 from e8.",
          "Play Kxh6."
        ]
      },
      {
        "reply": "Kf7",
        "answers": [
          "Kg5"
        ],
        "goal": "Return to g5 to support both pawns.",
        "hints": [
          "Keep f6 safe while clearing the h-pawn’s path.",
          "Play Kg5."
        ]
      },
      {
        "reply": "Kf8",
        "answers": [
          "h6"
        ],
        "goal": "Advance the h-pawn to h6.",
        "hints": [
          "Your king protects h6; the other pawn restricts the defender.",
          "Play h6."
        ]
      },
      {
        "reply": "Kg8",
        "answers": [
          "Kf5"
        ],
        "goal": "Step to f5 while retaining control of f6.",
        "hints": [
          "Give the h-pawn room without abandoning the pawn that shuts off g7.",
          "Play Kf5."
        ]
      },
      {
        "reply": "Kf7",
        "answers": [
          "h7"
        ],
        "goal": "Advance the outside pawn to h7.",
        "hints": [
          "The king on f7 cannot reach h8 in time.",
          "Play h7."
        ]
      },
      {
        "reply": "Ke8",
        "answers": [
          "h8=Q+"
        ],
        "goal": "Complete the conversion by promoting with check.",
        "hints": [
          "The king moved to e8; h8=Q+ finishes the pawn’s journey.",
          "Play h8=Q+."
        ]
      }
    ],
    "independent": {
      "fen": "8/2k5/p1P5/P1K5/8/8/8/8 w - - 0 1",
      "answers": [
        "Kd5"
      ],
      "goal": "Step to d5 to begin the waiting maneuver.",
      "hints": [
        "Keep c6 protected while making room for a triangular king route.",
        "Play Kd5."
      ],
      "explanation": "The triangular route changed whose turn it was without changing the key arrangement. The defender yielded, your king entered, and you removed the blocker before promoting. The triangle matters because it gains entry; returning to a square alone is not progress.",
      "followThrough": [
        {
          "reply": "Kc8",
          "answers": [
            "Kc4"
          ],
          "goal": "Take the long route through c4.",
          "hints": [
            "The defender has less freedom: its king must stay near the promotion square.",
            "Play Kc4."
          ]
        },
        {
          "reply": "Kd8",
          "answers": [
            "Kd4"
          ],
          "goal": "Continue the triangle through d4.",
          "hints": [
            "Returning via d4 uses an extra tempo compared with moving straight back.",
            "Play Kd4."
          ]
        },
        {
          "reply": "Kc8",
          "answers": [
            "Kd5"
          ],
          "goal": "Return to d5 and complete the triangle.",
          "hints": [
            "The kings are back on d5 and c8, but now the defender must move.",
            "Play Kd5."
          ]
        },
        {
          "reply": "Kc7",
          "answers": [
            "Kc5"
          ],
          "goal": "Return to c5: the original arrangement now has the opponent to move.",
          "hints": [
            "The extra tempo makes the king leave c7 before you choose your entry.",
            "Play Kc5."
          ]
        },
        {
          "reply": "Kc8",
          "answers": [
            "Kb6"
          ],
          "goal": "Use the entry square b6 after the defender retreats.",
          "hints": [
            "From b6 you protect c6 and attack the pawn on a6.",
            "Play Kb6."
          ]
        },
        {
          "reply": "Kd8",
          "answers": [
            "Kxa6"
          ],
          "goal": "Capture the blocking pawn on a6.",
          "hints": [
            "The defender cannot protect a6 from d8.",
            "Play Kxa6."
          ]
        },
        {
          "reply": "Kc7",
          "answers": [
            "Kb5"
          ],
          "goal": "Return to b5 to support both pawns.",
          "hints": [
            "Keep c6 safe while clearing the h-pawn’s path.",
            "Play Kb5."
          ]
        },
        {
          "reply": "Kc8",
          "answers": [
            "a6"
          ],
          "goal": "Advance the h-pawn to a6.",
          "hints": [
            "Your king protects a6; the other pawn restricts the defender.",
            "Play a6."
          ]
        },
        {
          "reply": "Kb8",
          "answers": [
            "Kc5"
          ],
          "goal": "Step to c5 while retaining control of c6.",
          "hints": [
            "Give the h-pawn room without abandoning the pawn that shuts off b7.",
            "Play Kc5."
          ]
        },
        {
          "reply": "Kc7",
          "answers": [
            "a7"
          ],
          "goal": "Advance the outside pawn to a7.",
          "hints": [
            "The king on c7 cannot reach a8 in time.",
            "Play a7."
          ]
        },
        {
          "reply": "Kd8",
          "answers": [
            "a8=Q+"
          ],
          "goal": "Complete the conversion by promoting with check.",
          "hints": [
            "The king moved to d8; a8=Q+ finishes the pawn’s journey.",
            "Play a8=Q+."
          ]
        }
      ]
    }
  }
];
