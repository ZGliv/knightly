export interface LearningArea {
  id: string; title: string; lessons: string[]; overview: string[]; mistakes: string[]; checkpoints: string[]; nextDepth: string;
}

export const LEARNING_AREAS: LearningArea[] = [
  {
    "id": "opening-plans",
    "title": "Opening plans",
    "lessons": [
      "claim-center",
      "develop-knight",
      "develop-bishop",
      "free-bishop",
      "fianchetto",
      "castle-king",
      "castle-long",
      "central-break",
      "develop-tempo"
    ],
    "overview": [
      "Start by giving your pieces useful jobs. Central pawns claim space and open diagonals; knights and bishops influence the center; castling connects king safety with rook activity. These jobs support each other, but an immediate threat can change the order.",
      "After each opponent move, ask what it attacks, what it leaves undefended and which central break it prepares. Develop with a threat when possible. A queen chase is useful if it improves a piece; repeated pawn pushes can leave weaknesses after the queen escapes.",
      "Before opening the center, compare development and king safety. If your king is still exposed, a pawn exchange may help the opponent’s rooks. If you are ready, a central break needs a plan for pawn captures and piece recaptures. The opening studies show example move orders; understand the resulting structure rather than treating their moves as mandatory."
    ],
    "mistakes": [
      "Memorizing a line without noticing a changed opponent move.",
      "Moving the same piece repeatedly while other pieces have no role."
    ],
    "checkpoints": [
      "Explain what each developing move improves.",
      "Meet a central capture with a planned recapture.",
      "Reach a playable middlegame after an unfamiliar but sensible opponent move."
    ],
    "nextDepth": "Expand one White opening and one defense against e4 and d4; review the middlegames they produce."
  },
  {
    "id": "king-safety",
    "title": "Checks and king safety",
    "lessons": [
      "capture-checker",
      "block-check",
      "escape-check",
      "en-passant-check",
      "knight-interpose",
      "escape-square",
      "king-captures-checker",
      "knight-check-response",
      "double-check-response"
    ],
    "overview": [
      "Begin with the immediate question: is your king in check? Against a sliding piece, compare capturing the checker, blocking the line and moving the king. A knight check cannot be blocked. Against double check, look for a king move that escapes both attacks.",
      "King captures need a fresh attack scan. The captured piece may be protected, or removing it may uncover a rook, bishop or queen behind it. A king may never move into check, even if taking the piece would win material.",
      "Safety is also preventive. An escape square can remove a back-rank problem, but the pawn move may weaken a diagonal or need support. Before castling, verify rights, occupied squares and attacks on the king’s route. After castling, your king still needs defenders and a response to the opponent’s threats."
    ],
    "mistakes": [
      "Trying to block a knight check or answer only one half of double check.",
      "Assuming a checking piece can be captured because the destination looks empty behind it."
    ],
    "checkpoints": [
      "Identify every checking piece before moving.",
      "Compare legal captures, blocks and king escapes.",
      "Explain why a proposed escape square is safe after the move."
    ],
    "nextDepth": "Practice defensive decisions from your own games, including threats that are not checks yet."
  },
  {
    "id": "checkmating",
    "title": "Building and finishing mating nets",
    "lessons": [
      "back-rank",
      "mating-net",
      "queen-finish",
      "rook-finish",
      "smothered-mate",
      "anastasia-mate",
      "arabian-mate",
      "ladder-mate",
      "avoid-stalemate",
      "rook-mate-conversion",
      "queen-mate-conversion"
    ],
    "overview": [
      "Mate requires check and no legal answer. For every candidate, inspect king escapes, captures of the checking piece and possible blocks. Named mating patterns help you recognize shapes; they do not replace this verification.",
      "Give each attacking piece a job. A rook controls a rank or file, a bishop or knight covers an escape, and a king can support the final checking piece in an ending. Before delivering a close queen check, verify that the queen is protected. With two rooks, one can form a fence while the other checks.",
      "In a winning ending, keep the enemy king constrained without removing all legal moves when it is not in check. Quiet queen moves can accidentally stalemate. Check the actual resulting position, not just the attractive shape of the mating net. Learning a mate-in-one is the starting point; practice arranging the pieces so that finish becomes possible."
    ],
    "mistakes": [
      "Calling a move mate without checking captures and blocks.",
      "Using a quiet queen move that traps the king but does not check it."
    ],
    "checkpoints": [
      "Account for every legal response to a mating move.",
      "Use a supporting piece instead of leaving the checking piece undefended.",
      "Finish full rook-and-king and queen-and-king mating lines without stalemate."
    ],
    "nextDepth": "Practice unrestricted conversions against unfamiliar king replies, and mate with two bishops or bishop and knight."
  },
  {
    "id": "double-attacks",
    "title": "Forks and double threats",
    "lessons": [
      "knight-jump",
      "knight-fork",
      "pawn-fork",
      "queen-fork",
      "bishop-fork",
      "rook-fork"
    ],
    "overview": [
      "A double attack creates two problems in one move. A checking fork is especially forcing because the king must respond before the second target can be saved. Knights, pawns, bishops, rooks and queens can all create forks, but their target geometry differs.",
      "Do not stop at seeing two attacked pieces. Can the forking piece be captured? Is one target able to answer the check while protecting the other? Is the landing square defended? Compare the value of what you gain with what you give up.",
      "After the opponent responds, scan again. A king move may turn the next capture into check, or may expose a new defense. The follow-through exercises require you to collect the second target, rather than award success for the first threatening move. In your games, loose pieces often make double attacks possible several moves before the final tactic."
    ],
    "mistakes": [
      "Counting a fork whose attacking piece can be taken for free.",
      "Finding the first check and forgetting to collect the second target."
    ],
    "checkpoints": [
      "Name both targets and show how the piece attacks each.",
      "Verify the landing square and possible captures.",
      "Complete the tactic after more than one king reply."
    ],
    "nextDepth": "Practice non-checking double threats and defensive counterattacks in fuller positions."
  },
  {
    "id": "pins-and-lines",
    "title": "Pins, skewers and opened lines",
    "lessons": [
      "absolute-pin",
      "skewer",
      "discovered-attack",
      "double-check",
      "exploit-pin",
      "break-pin"
    ],
    "overview": [
      "A pin restricts a piece because moving it would expose something more valuable behind it. An absolute pin exposes the king and forbids the move; a relative pin exposes another piece and may be ignored if a stronger tactic exists.",
      "When counting defenders, ask whether each defender can legally move. A knight may appear to guard a pawn while being pinned to its king. Conversely, breaking a pin can restore a defender that looked unavailable a move ago. Interposing another piece transfers the blocking job; it does not make that new blocker free to move.",
      "A skewer puts the valuable front piece under attack and collects the piece behind after it moves. A discovered attack removes your own blocker. Trace the entire line before and after each move, then check whether the opponent can capture, block or create a stronger threat elsewhere."
    ],
    "mistakes": [
      "Treating a relative pin as if moving the piece were illegal.",
      "Releasing one blocker while forgetting that another piece must keep shielding the king."
    ],
    "checkpoints": [
      "Distinguish legal restriction from a material warning.",
      "Exploit a pinned defender without exposing your own king.",
      "Break a pin and verify that the formerly pinned piece can now move."
    ],
    "nextDepth": "Study combined pins, overloaded defenders and tactics where a relative pin can be ignored."
  },
  {
    "id": "piece-activity",
    "title": "Piece activity and coordination",
    "lessons": [
      "connect-rooks",
      "open-file",
      "rook-lift",
      "seventh-rank",
      "knight-outpost",
      "bishop-retreat",
      "trap-knight",
      "double-rooks",
      "free-bad-bishop"
    ],
    "overview": [
      "A useful piece influences a relevant square, attacks a target, protects a weakness or supports a break. When there is no immediate tactic, identify your least useful piece and give it a route to a better job.",
      "Rooks often work on open files, but an open file without an entry square may offer little. Doubling prepares pressure; a rook lift changes wings; the seventh rank attacks pawns from behind. Before moving a rook, check which defensive duty it leaves behind.",
      "Knights need secure squares and safe retreats. Pawns can drive a knight away or trap it if every exit is covered. Bishops need diagonals outside restrictive pawn chains; moving one pawn may open only the first part of a route. Piece activity is a comparison between plans, not a command to move toward the opponent on every turn."
    ],
    "mistakes": [
      "Occupying an open file without an invasion square or target.",
      "Calling a piece trapped before checking every retreat and capture."
    ],
    "checkpoints": [
      "Explain the job of your least active piece.",
      "Coordinate two pieces toward the same concrete target.",
      "Verify all exits before committing to a trapping pawn move."
    ],
    "nextDepth": "Compare good knights with restricted bishops in complete middlegame positions."
  },
  {
    "id": "pawn-structures",
    "title": "Pawn chains, levers and weak squares",
    "lessons": [
      "pawn-capture",
      "en-passant",
      "pawn-chain",
      "isolated-pawn-blockade",
      "attack-pawn-base",
      "fix-pawn-weakness"
    ],
    "overview": [
      "Pawn moves change the position permanently: pawns do not retreat. Read the structure before choosing a piece plan. A chain is supported diagonally; its base has no pawn behind it giving the same support. A pawn lever challenges the structure and may open files.",
      "An isolated pawn has no friendly pawn on an adjacent file. A knight in front can block its advance without being chased by those missing neighboring pawns, but enemy pieces may still exchange or dislodge it. A fixed pawn can become a target, while fixing it may also freeze your own pawn and concede useful squares.",
      "For every pawn push, ask which squares lose protection, which diagonals open and which captures become possible. The same lever can be strong with a safe king and dangerous with an exposed one. Learn the structural reason, then calculate the immediate response before applying it."
    ],
    "mistakes": [
      "Treating an isolated pawn as automatically losing.",
      "Making a useful-looking pawn break without examining the new king exposure."
    ],
    "checkpoints": [
      "Identify chain bases, isolated pawns and candidate levers.",
      "Choose a blockading square and explain why it is stable.",
      "Name the squares weakened by your intended pawn move."
    ],
    "nextDepth": "Explore doubled and backward pawns, hanging pawns, minority attacks and the plans on both sides of each structure."
  },
  {
    "id": "defence",
    "title": "Defence and exchanging attackers",
    "lessons": [
      "defend-piece",
      "defend-mate",
      "remove-defender",
      "defensive-trade"
    ],
    "overview": [
      "A defensive move starts with identifying the actual threat. Is the opponent threatening mate, material, a fork or a positional gain? A direct defense, a trade, a counterattack and moving the target can all be candidates.",
      "Count attackers and defenders, but do not treat the count as the whole calculation. Pins can make defenders unavailable; exchanges change the order of captures; a defender may be responsible for two separate weaknesses. Look at the resulting position after the expected trade.",
      "When under pressure, exchanging the most active attacker may reduce the opponent’s options. Check the recapture and what your own exchanged piece was defending. Defensive practice also includes refusing an attractive capture when it permits mate. A successful defense may aim for an equal or drawable position rather than an immediate advantage."
    ],
    "mistakes": [
      "Defending the attacked piece while overlooking a mating threat.",
      "Trading the only defender of a different critical square."
    ],
    "checkpoints": [
      "State the opponent’s threat in one concrete sentence.",
      "Compare at least two defensive methods.",
      "Verify king safety and remaining defenders after an exchange."
    ],
    "nextDepth": "Add counterattacking defenses, perpetual-check resources and defensive sacrifices from real games."
  },
  {
    "id": "calculation",
    "title": "Calculating the whole idea",
    "lessons": [
      "loose-queen",
      "recapture",
      "exchange-value",
      "forcing-first",
      "trade-queens",
      "intermediate-check",
      "attract-king"
    ],
    "overview": [
      "Start with the opponent’s threat, then inspect checks, captures and direct threats for both sides. Forcing moves narrow the reply set, but a check is not automatically good. A sacrifice needs a continuation that justifies the material invested.",
      "Calculate one candidate to a useful stopping point: the exchanges have settled, the immediate checks are answered, or the tactical gain is clear. Count both sides’ losses. Before recapturing automatically, look for a stronger forcing move; sometimes mate matters more than recovering a queen.",
      "When the opponent has a choice, compare the meaningful defenses separately. Keep the position after each reply distinct so you do not borrow a tactic from the wrong branch. The authored lines train selected responses; in a real game, your job is to search for the strongest resistance yourself. Review where your calculation ended too early, not only which first move was wrong."
    ],
    "mistakes": [
      "Stopping a line just before the opponent’s recapture.",
      "Assuming the opponent will accept a sacrifice or choose the reply you hoped for."
    ],
    "checkpoints": [
      "Calculate an exchange through its final recapture.",
      "Explain the material and king-safety result of a short combination.",
      "Change your continuation when the opponent chooses a different reply."
    ],
    "nextDepth": "Practice longer candidate-move comparisons with quiet defenses and multiple acceptable plans."
  },
  {
    "id": "pawn-endings",
    "title": "King and pawn endings",
    "lessons": [
      "active-king",
      "opposition",
      "pawn-square",
      "create-passer",
      "pawn-breakthrough",
      "promote-pawn",
      "capture-promotion",
      "outside-passer",
      "king-before-pawn",
      "rook-pawn-corner",
      "key-square-conversion",
      "triangulation-conversion"
    ],
    "overview": [
      "With few pieces left, king activity and tempi become concrete. Count how many moves a pawn needs to promote and whether the enemy king can enter its path. A starting two-square pawn move changes the race; captures and checks can change the move order.",
      "Opposition helps one king make the other yield, but spare pawn moves can transfer the obligation to move. A king in front of a passer can escort it and control entry squares. An outside passer can distract the enemy king from another wing, but only a full count shows whether the distraction wins enough time.",
      "Rook pawns are special because the edge removes escape squares. A defending king in the promotion corner may hold positions that a central pawn would win. Before simplifying into a pawn ending, examine whose king is active, who moves, where the pawn promotes and whether either side has a useful waiting move.",
      "Key squares turn king activity into a concrete promotion plan. The longer exercises follow the king’s entry all the way to promotion. Triangulation uses a longer king route to hand over the move in a constrained position; compare the placement before and after, then exploit the entry it creates."
    ],
    "mistakes": [
      "Applying the square rule without accounting for a two-square first move.",
      "Assuming opposition or an extra pawn always means a win."
    ],
    "checkpoints": [
      "Count a simple promotion race from either side.",
      "Retake opposition after the opposing king changes file.",
      "Recognize the rook-pawn corner exception before exchanging the last pieces.",
      "Escort a pawn from a key square to promotion, and explain what the triangulation changes."
    ],
    "nextDepth": "Extend to corresponding squares, reserve pawn tempi, distant opposition and pawn races with promotion checks."
  },
  {
    "id": "minor-endings",
    "title": "Minor pieces, promotion and drawing resources",
    "lessons": [
      "blockade-passer",
      "knight-promotion",
      "rook-underpromotion",
      "stalemate-resource",
      "bishop-stops-pawn",
      "knight-blockade"
    ],
    "overview": [
      "A bishop can stop a passer from a long diagonal; a knight can sit directly in front of it. First identify the promotion square and the piece’s route to controlling it. Then check whether the enemy king can interrupt that route or capture the blockader.",
      "Promotion choice depends on the resulting position. A knight may promote with a fork; a rook may avoid a queen’s stalemate. Do not assume every underpromotion wins: some teaching positions demonstrate a tactical gain that still leaves insufficient mating material.",
      "When losing, inspect checks, captures and sacrifices that change the result. Stalemate requires no legal move and no check; leaving even one pawn move ruins the idea. Draw mechanisms have precise conditions. In over-the-board rules, some draws require a claim, while dead positions and stalemate end the game immediately."
    ],
    "mistakes": [
      "Controlling a square beside the promotion square instead of the promotion square itself.",
      "Calling a tactical material gain a won game when no mating material remains."
    ],
    "checkpoints": [
      "Stop a promotion and capture the newly promoted piece when appropriate.",
      "Explain why a specific underpromotion is useful.",
      "Verify every legal move before claiming a stalemate resource."
    ],
    "nextDepth": "Study bishop versus knight, wrong-colored rook-pawn endings and defensive fortresses in fuller positions."
  },
  {
    "id": "rook-endings",
    "title": "Rook activity and passed pawns",
    "lessons": [
      "rook-support",
      "rook-cutoff",
      "rook-distance",
      "rook-behind-enemy",
      "rook-check-from-side",
      "lucena-bridge",
      "philidor-defense"
    ],
    "overview": [
      "Rook endings combine checking distance, king activity and pawn support. A rook behind a friendly passer continues protecting it as it advances. Behind an enemy passer, it can attack along the pawn’s file. These are useful starting plans, not rules that override an immediate tactic.",
      "Side checks can keep a king exposed while the rook stays out of reach. Count the files between rook and king and identify possible shelter. A checking rook too close to the king may be attacked with tempo, losing the time needed to stop the pawn.",
      "Cutting off the king can give a passer room, but the cut-off must survive the king’s approach. In Lucena, prepare a rook bridge before walking the king through checks. In Philidor, hold the third rank until the pawn advances, then switch to distant checks from behind. The complete lines include promotion, a claimable repetition, and a defender abandoning the pawn."
    ],
    "mistakes": [
      "Placing a rook behind a pawn without checking an immediate promotion or mating threat.",
      "Repeating side checks after the king has found shelter."
    ],
    "checkpoints": [
      "Choose between supporting, blockading and attacking a passer.",
      "Keep safe checking distance from the enemy king.",
      "Follow a pawn advance for several moves while maintaining rook support.",
      "Build a Lucena bridge and promote against both rook choices.",
      "Switch from the Philidor barrier to rear checks, and react when the pawn loses its defender."
    ],
    "nextDepth": "Extend to short-side defense, the Vancura defense, rook-pawn exceptions and connected passed pawns. These selected lines do not cover every legal defense."
  }
];

export function areaForLesson(id: string) { return LEARNING_AREAS.find(area => area.lessons.includes(id)); }
