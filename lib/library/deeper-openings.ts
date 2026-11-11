import type { OpeningLine, OpeningStudy } from './catalog';

// Original annotations to illustrative legal continuations, not an exhaustive repertoire.
function line(id: string, title: string, description: string, text: string): OpeningLine {
  const rows = text.trim().split('\n').map(row => row.split('|'));
  return { id, title, description, moves: rows.map(row => row[0]), notes: rows.map(row => row[1]) };
}
function study(id: string, title: string, side: 'White' | 'Black', themes: string[], main: OpeningLine, alternative: OpeningLine): OpeningStudy {
  return { id, title, side, themes, description: main.description, lineName: main.title, moves: main.moves, notes: main.notes, variations: [alternative] };
}
export const DEEPER_OPENINGS: OpeningStudy[] = [
  study('vienna-game', 'Vienna Game', 'White', ['Development', 'Central control', 'Move order'],
    line('main', 'Develop before choosing a break', 'Support e4 with Nc3 and build a playable center before committing the f-pawn.', `e4|Occupy the center and release the bishop.
e5|Black establishes an equal central foothold.
Nc3|Defend e4 while keeping the f-pawn free.
Nf6|Black attacks e4 and develops a piece.
Bc4|Aim at f7 and clear a castling square.
Nc6|Black reinforces e5 and develops.
d3|Support e4 and open the c1 bishop.
Bc5|Black develops actively toward f2.
Nf3|Develop the second knight and prepare castling.
d6|Black supports the center.
O-O|Secure the king; next decide how to develop c1 and challenge the center.`),
    line('fianchetto', 'A quieter bishop setup', 'Develop the bishop on g2 and retain flexibility in the center.', `e4|Claim central space.
e5|Black meets the pawn.
Nc3|Protect e4 with a developing move.
Nc6|Black protects e5 the same way.
g3|Prepare a fianchetto rather than Bc4.
Nf6|Black develops and attacks e4.
Bg2|Develop on the long diagonal; the e4 pawn currently limits its reach.
Bc5|Black develops toward the kingside.
d3|Support the center and release the other bishop.
d6|Black consolidates e5.
Nge2|Develop without blocking the g2 bishop with a knight on f3.`)),
  study('bishops-opening', 'Bishop’s Opening', 'White', ['Development', 'King safety', 'Flexible knights'],
    line('main', 'Build a quiet center', 'Develop the bishop first, then support the center and bring the knights into play.', `e4|Take space and open the bishop.
e5|Black contests the center.
Bc4|Develop the bishop toward f7 before choosing a knight square.
Nf6|Black attacks e4.
d3|Defend e4 and open the c1 bishop.
Bc5|Black develops with a similar plan.
Nf3|Develop and prepare castling.
d6|Black supports e5.
O-O|Get the king safe before beginning pawn breaks.
O-O|Black also castles.
Nc3|Complete knight development; the d4 break is a future idea, not an automatic next move.`),
    line('central-challenge', 'Meet an early central challenge', 'Respond to Black’s d-pawn break while developing with a threat.', `e4|Occupy the center.
e5|Black answers symmetrically.
Bc4|Develop the bishop actively.
Nf6|Black attacks e4.
d3|Protect the central pawn.
c6|Black prepares d5.
Nf3|Develop and watch the coming break.
d5|Black attacks both the bishop and the e4 pawn.
exd5|Resolve the central contact by capturing on d5.
cxd5|Black recaptures and gains a central pawn pair.
Bb5+|Retreat with check, making Black answer before the bishop is attacked again.
Bd7|Black blocks the check and offers a bishop exchange.`)),
  study('catalan-opening', 'Catalan Opening', 'White', ['Fianchetto', 'Pawn tension', 'Long diagonal'],
    line('main', 'Develop behind the central tension', 'Combine d4 and c4 with a kingside fianchetto; the bishop’s diagonal shapes your plans.', `d4|Claim a central square.
Nf6|Black develops and controls e4.
c4|Contest d5 with the c-pawn.
e6|Black prepares a d5 center.
g3|Plan to develop the bishop on g2.
d5|Black occupies the center.
Bg2|Put the bishop on the long diagonal.
Be7|Black clears a castling square.
Nf3|Develop and prepare king safety.
O-O|Black castles.
O-O|Castle before resolving the central pawn tension.`),
    line('open-center', 'When Black takes on c4', 'Answer the capture with development and pressure, rather than assuming the pawn is lost forever.', `d4|Take the center.
Nf6|Black develops toward e4.
c4|Challenge the center from the side.
e6|Black prepares d5.
g3|Prepare the bishop’s long diagonal.
d5|Black creates central tension.
Bg2|Develop the bishop.
dxc4|Black takes the c-pawn; the d-file and long diagonal change.
Nf3|Develop while keeping plans to recover c4.
a6|Black prepares queenside expansion with b5.
O-O|Secure the king before chasing the pawn.
Nc6|Black develops and adds central control.
Qa4|Attack c4 with the queen; recovery still depends on Black’s reply.`)),
  study('colle-system', 'Colle System', 'White', ['Central breaks', 'Development', 'Pawn support'],
    line('main', 'Prepare the e4 break', 'Build a compact center, develop behind it, then use e4 to release your pieces.', `d4|Take central space.
d5|Black mirrors the central pawn.
Nf3|Develop and control e5.
Nf6|Black develops toward e4.
e3|Support d4 and open the f1 bishop; the c1 bishop is temporarily restricted.
e6|Black builds a solid center.
Bd3|Develop toward the kingside.
c5|Black challenges d4.
c3|Support d4 and keep the central structure.
Nc6|Black adds pressure to d4.
Nbd2|Prepare e4 with another defender.
Bd6|Black develops actively.
O-O|Get the king safe before opening the center.
O-O|Black castles.
e4|The prepared break challenges d5 and releases the c1 bishop.`),
    line('queenside-bishop', 'Develop the other bishop early', 'Use a queenside fianchetto so both bishops participate before the central break.', `d4|Claim a central square.
d5|Black occupies d5.
Nf3|Develop the kingside knight.
Nf6|Black matches development.
e3|Support the center.
e6|Black does the same.
Bd3|Place the bishop on an active diagonal.
c5|Black challenges d4.
b3|Prepare Bb2 instead of c3.
Nc6|Black increases central pressure.
Bb2|Develop the c1 bishop; d4 currently blocks part of its diagonal.
Bd6|Black completes bishop development.
O-O|Castle, then choose a central response based on Black’s next move.`)),
  study('petrov-defense', 'Petrov Defense', 'Black', ['Counterattack', 'Central symmetry', 'Development'],
    line('main', 'Attack the attacking pawn', 'Meet Nf3 by attacking e4, then use the correct recapture order to keep the center sound.', `e4|White takes the center.
e5|Meet White’s pawn directly.
Nf3|White attacks e5.
Nf6|Counterattack e4 rather than defending e5.
Nxe5|White takes the pawn.
d6|Attack the advanced knight before recovering e4.
Nf3|White retreats to a useful square.
Nxe4|Now recover the central pawn.
d4|White builds a center and opens the bishop.
d5|Support your knight and contest the center.
Bd3|White develops toward your kingside.
Be7|Develop and prepare to castle.`),
    line('early-d4', 'Answer the early d4', 'Resolve the center with piece activity when White expands instead of taking e5.', `e4|White occupies the center.
e5|Take your share of central space.
Nf3|White attacks e5.
Nf6|Attack e4 in return.
d4|White opens the center immediately.
Nxe4|Capture the e-pawn while attacking central squares.
Bd3|White develops with pressure on the knight.
d5|Support the knight on e4.
Nxe5|White captures your e5 pawn.
Nd7|Develop and offer an exchange of the advanced knights.
Nxd7|White chooses the exchange.
Bxd7|Recapture with development; finish king safety before starting a new attack.`)),
  study('alekhine-defense', 'Alekhine Defense', 'Black', ['Space', 'Pawn targets', 'Knight routes'],
    line('main', 'Challenge the advanced center', 'Invite pawn advances, then attack their base; the extra space is a real benefit for White.', `e4|White occupies the center.
Nf6|Attack e4 immediately with a knight.
e5|White gains space by attacking your knight.
Nd5|Keep the knight centralized.
d4|White builds a broad center.
d6|Challenge the advanced e5 pawn.
Nf3|White develops and supports the center.
Bg4|Develop with a pin against the queen.
Be2|White breaks the pin.
e6|Support the central structure and release the f8 bishop.
O-O|White castles.
Be7|Prepare your own king safety; do not leave development unfinished while chasing pawns.`),
    line('exchange', 'After the central exchange', 'Recapture toward the center and develop naturally against White’s space.', `e4|White claims central space.
Nf6|Attack the e-pawn.
e5|White pushes your knight back.
Nd5|Use the central outpost temporarily.
d4|White reinforces the center.
d6|Challenge e5.
c4|White gains more space by attacking the knight.
Nb6|Retreat while keeping central influence.
exd6|White resolves the e5 tension.
exd6|Recapture with the e-pawn and open your bishop.
Nc3|White develops behind the broad center.
Be7|Develop and prepare castling; later challenge the center with c5 or another suitable break.`)),
  study('dutch-defense', 'Dutch Defense', 'Black', ['Asymmetry', 'Fianchetto', 'King safety'],
    line('main', 'Build the kingside fianchetto', 'Use f5 to contest e4 while developing quickly enough to protect the weakened king squares.', `d4|White occupies the center.
f5|Control e4 but open lines near your king.
g3|White prepares a long-diagonal bishop.
Nf6|Develop and reinforce e4.
Bg2|White develops toward your queenside.
g6|Prepare your own fianchetto.
Nf3|White develops and supports d4.
Bg7|Develop the bishop behind the g-pawn.
O-O|White castles.
O-O|Complete your king safety.
c4|White expands in the center.
d6|Support a future e5 break; calculate it rather than playing it automatically.`),
    line('solid-center', 'A classical central setup', 'Support the center with e6 and develop the bishop to e7 instead of fianchettoing.', `d4|White takes space.
f5|Contest e4 with a pawn.
g3|White prepares Bg2.
Nf6|Develop toward the center.
Bg2|White occupies the long diagonal.
e6|Support f5 and open the bishop.
Nf3|White develops.
Be7|Clear the way to castle.
O-O|White secures the king.
O-O|Castle before moving more kingside pawns.
c4|White challenges central space.
d6|Prepare e5 and keep the center flexible.`)),
  study('nimzo-indian', 'Nimzo-Indian Defense', 'Black', ['Pins', 'Pawn structure', 'Bishop pair'],
    line('main', 'Pressure the queenside knight', 'Pin the c3 knight and decide whether structural damage is worth giving up your bishop.', `d4|White claims central space.
Nf6|Develop and control e4.
c4|White increases central control.
e6|Prepare to develop the bishop.
Nc3|White supports e4.
Bb4|Pin the knight to the king and discourage e4.
e3|White opens the bishop and supports d4.
O-O|Secure the king before choosing a central break.
Bd3|White develops actively.
d5|Contest the center directly.
Nf3|White develops the other knight.
c5|Increase pressure on d4 and create central tension.`),
    line('queen-support', 'When the queen supports c3', 'White prepares to recapture on c3 without doubled pawns; answer with development and central play.', `d4|White takes the center.
Nf6|Control e4 with a developing move.
c4|White contests d5.
e6|Open the bishop’s diagonal.
Nc3|White prepares a larger center.
Bb4|Pin the knight before e4 can be played freely.
Qc2|White supports c3 with the queen.
O-O|Castle while White spends a move on the queen.
a3|White asks your bishop to decide.
Bxc3+|Give up the bishop to remove the knight with check.
Qxc3|White recaptures without doubled pawns but has moved the queen again.
b6|Prepare Bb7 to contest the center; White keeps the bishop pair.`)),
];
