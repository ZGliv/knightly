import type { OpeningLine, OpeningStudy } from "./catalog";

// Original teaching notes. Each line is an illustrative continuation, not an exhaustive repertoire.
function line(
  id: string,
  title: string,
  description: string,
  text: string,
): OpeningLine {
  const entries = text
    .trim()
    .split("\n")
    .map((row) => row.split("|"));
  return {
    id,
    title,
    description,
    moves: entries.map((row) => row[0]),
    notes: entries.map((row) => row[1]),
  };
}
function study(
  id: string,
  title: string,
  side: "White" | "Black",
  themes: string[],
  main: OpeningLine,
): OpeningStudy {
  return {
    id,
    title,
    side,
    themes,
    description: main.description,
    moves: main.moves,
    notes: main.notes,
    lineName: main.title,
  };
}
export const EXTRA_OPENINGS: OpeningStudy[] = [
  study(
    "ruy-lopez",
    "Ruy Lopez",
    "White",
    ["Central pressure", "Bishop pair", "Development"],
    line(
      "main",
      "Keep the bishop",
      "Pressure the knight that defends e5, then build a lasting center.",
      `e4|Occupy the center and release the bishop.
e5|Black meets your central pawn.
Nf3|Develop with an attack on e5.
Nc6|Black develops and defends the pawn.
Bb5|Attack the knight that defends e5. Taking e5 immediately can still invite tactics.
a6|Black asks your bishop to decide.
Ba4|Keep the bishop and maintain pressure on c6.
Nf6|Black develops with an attack on e4.
O-O|Move the king to safety before opening the position further.
Be7|Black clears the way to castle.
Re1|Defend e4 with a rook and prepare further development.`,
    ),
  ),
  study(
    "english-opening",
    "English Opening",
    "White",
    ["Flank control", "Fianchetto", "Flexible center"],
    line(
      "main",
      "Against ...e5",
      "Control the center from the side and develop the bishop on the long diagonal.",
      `c4|Control d5 with a wing pawn while keeping your central pawns flexible.
e5|Black takes the central space you left available.
Nc3|Develop and add control of d5.
Nf6|Black develops toward the center.
g3|Prepare to place the bishop on g2.
d5|Black challenges the center before you play a central pawn.
cxd5|Exchange the c-pawn for Black’s d-pawn.
Nxd5|Black recaptures with a knight.
Bg2|The bishop develops along the long diagonal.
Nb6|Black moves the knight away from exchanges on d5.
Nf3|Develop toward the center and prepare castling.`,
    ),
  ),
  study(
    "reti-opening",
    "Réti Opening",
    "White",
    ["Flexible move orders", "Central tension", "Fianchetto"],
    line(
      "main",
      "Challenge with c4",
      "Develop first, then challenge a pawn center from the flank.",
      `Nf3|Develop a knight without committing a central pawn.
d5|Black claims central space.
c4|Challenge d5 from the side.
e6|Black reinforces the center.
g3|Prepare a bishop on g2.
Nf6|Black develops and controls e4.
Bg2|Aim the bishop down the long diagonal.
Be7|Black prepares castling.
O-O|Secure your king before changing the center.
O-O|Both kings are now castled.
b3|Prepare Bb2. Watch for Black’s central breaks as you develop.`,
    ),
  ),
  study(
    "four-knights",
    "Four Knights Game",
    "White",
    ["Development", "Symmetry", "Central breaks"],
    line(
      "main",
      "Spanish setup",
      "Develop both knights, then choose how to challenge the center.",
      `e4|Take space and open the bishop.
e5|Black matches the central pawn.
Nf3|Develop and attack e5.
Nc6|Black defends e5 with a developing move.
Nc3|Develop the other knight and defend e4.
Nf6|All four knights are now developed.
Bb5|Pressure the knight on c6.
Bb4|Black creates similar pressure on c3.
O-O|Your king gets safe before the center opens.
O-O|Black castles too.
d3|Support e4 and release the c1 bishop.`,
    ),
  ),
  study(
    "scandinavian-defense",
    "Scandinavian Defense",
    "Black",
    ["Central challenge", "Queen safety", "Development"],
    line(
      "main",
      "Queen to a5",
      "Challenge e4 immediately, then find a safe square for your queen.",
      `e4|White opens with central space.
d5|Challenge e4 at once.
exd5|White exchanges the e-pawn for your d-pawn.
Qxd5|Recover the pawn with the queen.
Nc3|White develops while attacking your queen.
Qa5|Move out of the attack and keep pressure on the diagonal.
d4|White builds a central pawn presence.
Nf6|Develop and contest e4.
Nf3|White develops and supports d4.
c6|Prepare a retreat on c7 for the queen and support d5.`,
    ),
  ),
  study(
    "pirc-defense",
    "Pirc Defense",
    "Black",
    ["Fianchetto", "Counterplay", "Central breaks"],
    line(
      "main",
      "Classical setup",
      "Let White build a center, then prepare to challenge it with your pieces and pawns.",
      `e4|White occupies the center.
d6|Control e5 and open your bishop’s diagonal.
d4|White builds a broad center.
Nf6|Develop with pressure on e4.
Nc3|White defends e4 with a developing move.
g6|Prepare the bishop for g7.
Nf3|White develops without committing another central pawn.
Bg7|Place the bishop on the long diagonal.
Be2|White clears the path to castle.
O-O|Get the king safe. Next consider a well-timed ...e5 or ...c5.`,
    ),
  ),
  study(
    "kings-indian",
    "King’s Indian Defense",
    "Black",
    ["Fianchetto", "Pawn chains", "Counterplay"],
    line(
      "main",
      "Classical center",
      "Develop behind a fianchetto and challenge White’s broad pawn center.",
      `d4|White claims central space.
Nf6|Control e4 with a knight.
c4|White expands on the queenside.
g6|Prepare the bishop on g7.
Nc3|White supports a possible e4 advance.
Bg7|Develop along the long diagonal.
e4|White builds the broad center you will challenge.
d6|Support a later ...e5 and keep the center under observation.
Nf3|White develops and defends the center.
O-O|Secure your king.
Be2|White prepares to castle.
e5|Challenge d4. If the center closes, the direction of the pawn chains will shape each side’s plans.`,
    ),
  ),
  study(
    "slav-defense",
    "Slav Defense",
    "Black",
    ["Solid center", "Bishop development", "Pawn tension"],
    line(
      "main",
      "Develop outside the chain",
      "Support d5 with the c-pawn and preserve a route for the light-squared bishop.",
      `d4|White takes central space.
d5|Meet White in the center.
c4|White challenges your d-pawn.
c6|Reinforce d5 without closing the c8 bishop’s diagonal.
Nf3|White develops and supports d4.
Nf6|Develop and control e4.
Nc3|White adds pressure to d5.
dxc4|Release the tension and open d5 for your pieces; the extra pawn is temporary here.
a4|White prevents ...b5 from supporting c4.
Bf5|Develop the light-squared bishop before playing ...e6.`,
    ),
  ),
];
export const OPENING_VARIATIONS: Record<string, OpeningLine[]> = {
  "italian-game": [
    line(
      "two-knights",
      "Against the Two Knights",
      "Black develops a knight instead of the bishop. Keep e4 defended as you finish development.",
      `e4|Claim central space.
e5|Black meets you in the center.
Nf3|Develop and attack e5.
Nc6|Black defends e5.
Bc4|Develop toward f7.
Nf6|Black attacks e4 before developing the bishop.
d3|Defend e4 and open the c1 bishop.
Bc5|Black develops toward f2.
c3|Prepare d4 for later, when your pieces support it.
d6|Black reinforces e5.
O-O|Castle and finish bringing your pieces into play.`,
    ),
  ],
  "queens-gambit": [
    line(
      "accepted",
      "When Black accepts",
      "Recover the pawn through development instead of rushing to hold the center.",
      `d4|Occupy the center.
d5|Black meets your pawn.
c4|Challenge d5.
dxc4|Black accepts the gambit and leaves the d-file.
Nf3|Develop and prevent an easy ...e5.
Nf6|Black develops toward the center.
e3|Open a path for your bishop to recover c4.
e6|Black prepares development.
Bxc4|Recover the pawn with a developing move.
c5|Black challenges d4 from the flank.
O-O|Get your king safe before resolving the central tension.`,
    ),
  ],
  "london-system": [
    line(
      "c5-pressure",
      "Meet ...c5 pressure",
      "Respond to pressure on d4 and b2 instead of repeating a setup automatically.",
      `d4|Claim central space.
Nf6|Black develops and controls e4.
Nf3|Support d4 and develop.
d5|Black occupies the center.
Bf4|Develop the bishop outside the future pawn chain.
c5|Black challenges d4 immediately.
e3|Support the center and open the other bishop.
Nc6|Black increases pressure on d4.
c3|Reinforce the d-pawn.
Qb6|Black attacks b2 as well as d4.
Qb3|Offer a queen exchange and defend b2. Notice how Black’s threat changed your plan.`,
    ),
  ],
  "scotch-game": [
    line(
      "bishop-pressure",
      "Against ...Bc5",
      "Develop while protecting the advanced knight and watching pressure on f2.",
      `e4|Take central space.
e5|Black matches your pawn.
Nf3|Develop with a threat against e5.
Nc6|Black defends e5.
d4|Open the center early.
exd4|Black captures in the center.
Nxd4|Recapture with a knight.
Bc5|Black attacks the knight on d4.
Be3|Develop and defend d4.
Qf6|Black adds pressure to d4 and f2.
c3|Support the knight and hold the center. Keep king safety in mind.`,
    ),
  ],
  "caro-kann": [
    line(
      "exchange",
      "Exchange structure",
      "White exchanges instead of advancing. Develop to the new open lines.",
      `e4|White claims space.
c6|Prepare ...d5.
d4|White builds a broad center.
d5|Challenge e4.
exd5|White releases the central tension.
cxd5|Recapture with the c-pawn and preserve a central pawn.
Bd3|White develops toward your kingside.
Nc6|Develop and put pressure on d4.
c3|White reinforces d4.
Nf6|Develop the second knight. Plan a square for the c8 bishop before ...e6.`,
    ),
  ],
  "sicilian-defense": [
    line(
      "closed",
      "When White keeps it closed",
      "White delays d4 and develops a fianchetto. Adjust your setup to that choice.",
      `e4|White takes central space.
c5|Control d4 from the wing.
Nc3|White develops without preparing an immediate d4.
Nc6|Develop toward the center.
g3|White prepares Bg2.
g6|Prepare your own bishop on the long diagonal.
Bg2|White completes the fianchetto.
Bg7|Your bishop also develops on the long diagonal.
d3|White keeps the center closed for now.
d6|Support e5 and release the c8 bishop. Choose the next break from the actual position.`,
    ),
  ],
  "french-defense": [
    line(
      "exchange",
      "Exchange variation",
      "An open e-file replaces the closed pawn chain. Develop actively in the symmetrical center.",
      `e4|White takes space.
e6|Prepare ...d5.
d4|White occupies another central square.
d5|Challenge the center.
exd5|White chooses an exchange rather than advancing e5.
exd5|Recapture and open the e-file.
Nf3|White develops toward the center.
Nf6|Develop and control e4.
Bd3|White develops a bishop toward the kingside.
Bd6|Develop your bishop too. The center is symmetrical, but future choices need not be.`,
    ),
  ],
  "queens-gambit-declined": [
    line(
      "exchange",
      "Exchange structure",
      "White trades on d5. Understand the new pawn structure before choosing your piece squares.",
      `d4|White takes central space.
d5|Meet the pawn.
c4|White challenges your center.
e6|Reinforce d5.
Nc3|White develops with pressure on d5.
Nf6|Develop and defend d5.
cxd5|White exchanges the c-pawn for your d-pawn.
exd5|Recapture, opening the c8 bishop’s diagonal.
Bg5|White pins the knight to your queen.
Be7|Develop and break the pin against the queen. Castle next when safe.`,
    ),
  ],
  "ruy-lopez": [
    line(
      "exchange",
      "Exchange on c6",
      "Trade bishop for knight and study what the changed pawn structure gives each side.",
      `e4|Take central space.
e5|Black meets your pawn.
Nf3|Develop and attack e5.
Nc6|Black defends e5.
Bb5|Attack the defending knight.
a6|Black asks your bishop to decide.
Bxc6|Exchange bishop for knight, changing Black’s structure.
dxc6|Black accepts doubled c-pawns and opens bishop lines.
O-O|Castle. Capturing e5 without calculation can allow counterplay against e4.
f6|Black reinforces e5.
d4|Challenge the center while development is still in progress.`,
    ),
  ],
  "english-opening": [
    line(
      "symmetrical",
      "Symmetrical English",
      "Both c-pawns advance. Develop smoothly and watch for a central break.",
      `c4|Control d5 from the flank.
c5|Black mirrors your wing-pawn approach.
Nc3|Develop and add central control.
Nc6|Black develops in the same way.
g3|Prepare your bishop’s long diagonal.
g6|Black prepares a fianchetto too.
Bg2|Develop the bishop.
Bg7|Black completes the matching setup.
Nf3|Prepare to castle and increase central control.
Nf6|Black develops the other knight.
O-O|Get the king safe. Symmetry can change as soon as one side chooses d4 or ...d5.`,
    ),
  ],
  "reti-opening": [
    line(
      "advance",
      "Against ...d4",
      "Black advances into space. Attack that center with a supported pawn break.",
      `Nf3|Develop flexibly.
d5|Black occupies the center.
c4|Challenge d5.
d4|Black gains space rather than exchanging.
e3|Challenge the advanced d4 pawn.
Nc6|Black develops and supports the central pawn.
exd4|Exchange your e-pawn for the advanced d-pawn.
Nxd4|Black recaptures with the knight.
Nxd4|Exchange that centralized knight.
Qxd4|Black recaptures with the queen.
Nc3|Develop with an attack on the exposed queen.`,
    ),
  ],
  "four-knights": [
    line(
      "scotch",
      "Scotch Four Knights",
      "Open the center with d4 after developing both knights.",
      `e4|Claim central space.
e5|Black meets you.
Nf3|Develop and attack e5.
Nc6|Black defends e5.
Nc3|Develop and defend e4.
Nf6|Black attacks e4.
d4|Challenge the center directly.
exd4|Black exchanges the central pawn.
Nxd4|Recapture with an active knight.
Bb4|Black pins Nc3 to your king.
Nxc6|Exchange the other knight. Keep the pin on c3 in mind when choosing the next move.`,
    ),
  ],
  "scandinavian-defense": [
    line(
      "queen-home",
      "Bring the queen home",
      "Return the queen to safety and develop before launching another attack.",
      `e4|White takes space.
d5|Challenge the center immediately.
exd5|White captures your d-pawn.
Qxd5|Recover the pawn.
Nc3|White develops with tempo against your queen.
Qd8|Return the queen to safety. You have spent time, so prioritize development now.
d4|White takes central space.
Nf6|Develop and control e4.
Nf3|White supports the center.
c6|Control d5 and prepare a solid center for your pieces.`,
    ),
  ],
  "pirc-defense": [
    line(
      "austrian",
      "Against the f-pawn advance",
      "White adds f4 to a large center. Castle and prepare counterplay without ignoring the space advantage.",
      `e4|White takes central space.
d6|Control e5 and prepare development.
d4|White builds a broad center.
Nf6|Attack e4 with a developing move.
Nc3|White defends e4.
g6|Prepare your fianchetto.
f4|White gains more space and prepares a kingside initiative.
Bg7|Develop along the long diagonal.
Nf3|White develops and supports e5.
O-O|Get the king safe. White’s center is powerful; your next break needs calculation.`,
    ),
  ],
  "kings-indian": [
    line(
      "fianchetto",
      "Against White’s fianchetto",
      "White chooses a quieter bishop setup. Develop and challenge the center when ready.",
      `d4|White takes central space.
Nf6|Control e4.
c4|White expands the center.
g6|Prepare Bg7.
Nf3|White develops and supports d4.
Bg7|Complete your fianchetto.
g3|White prepares a bishop on g2.
O-O|Castle before challenging the center.
Bg2|White completes the fianchetto.
d6|Prepare ...e5 and support the central dark squares.
O-O|White castles too.
Nbd7|Develop the remaining knight, adding support for ...e5.`,
    ),
  ],
  "slav-defense": [
    line(
      "exchange",
      "Exchange Slav",
      "White exchanges on d5. Keep your pieces active in the symmetrical pawn structure.",
      `d4|White occupies the center.
d5|Meet the pawn.
c4|White challenges d5.
c6|Support the center.
cxd5|White exchanges the c-pawn for your d-pawn.
cxd5|Recapture with the c-pawn, creating symmetry.
Nc3|White develops toward the center.
Nf6|Develop and defend d5.
Bf4|White brings the bishop outside the future pawn chain.
Nc6|Develop and put pressure on d4. Your light-squared bishop still has an open diagonal.`,
    ),
  ],
};
