// SPDX-License-Identifier: AGPL-3.0-or-later
// Maia-3 input/output adapter. Based on CSSLab/maia3 dataset.py and models.py.
// This standalone worker engine's complete source is served in this directory.
const PIECES = 'pnbrqk';
export function tokenize(fen) {
  const [placement, turn] = fen.split(' ');
  const tokens = new Float32Array(64 * 12);
  const ranks = placement.split('/');
  if (ranks.length !== 8 || !['w','b'].includes(turn)) throw Error('Invalid position');
  ranks.forEach((rank, index) => {
    let file = 0;
    for (const piece of rank) {
      if (/^[1-8]$/.test(piece)) { file += Number(piece); continue; }
      const type = PIECES.indexOf(piece.toLowerCase());
      if (type < 0 || file >= 8) throw Error('Invalid piece');
      const white = piece === piece.toUpperCase();
      const own = turn === 'w' ? white : !white;
      const square = (turn === 'w' ? 7-index : index) * 8 + file++;
      tokens[square * 12 + type + (own ? 0 : 6)] = 1;
    }
    if (file !== 8) throw Error('Invalid rank');
  });
  return tokens;
}
export function historyTokens(fens) {
  if (!fens.length) throw Error('Missing position history');
  // Match the reference UCI history: each historical position is oriented to its
  // own side to move, oldest first, padding with the earliest available position.
  const history = fens.slice(-8).map(tokenize);
  while (history.length < 8) history.unshift(history[0]);
  const tokens = new Float32Array(64 * 96);
  for (let sq=0; sq<64; sq++) for (let h=0; h<8; h++)
    tokens.set(history[h].subarray(sq*12,sq*12+12),sq*96+h*12);
  return tokens;
}
export function policyIndex(uci, black) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw Error('Invalid move');
  const file = i => uci.charCodeAt(i)-97;
  const rank = i => black ? 8-Number(uci[i]) : Number(uci[i])-1;
  if (uci.length === 5) {
    if (rank(1)!==6 || rank(3)!==7) throw Error('Invalid promotion');
    return 4096+(file(0)*8+file(2))*4+'qrbn'.indexOf(uci[4]);
  }
  return (rank(1)*8+file(0))*64+rank(3)*8+file(2);
}
export function chooseMove(logits, legalMoves, black, random=Math.random) {
  if (!legalMoves.length) throw Error('No legal moves');
  const values = legalMoves.map(move=>Number(logits[policyIndex(move,black)]));
  if (values.some(value=>!Number.isFinite(value))) throw Error('Invalid policy output');
  const max = Math.max(...values);
  const weights = values.map(value=>Math.exp(value-max));
  const total = weights.reduce((a,b)=>a+b,0);
  // Sample the learned human distribution, with temperature 1 and no engine
  // reranking, rejection of human mistakes, or added random-blunder branch.
  let sample=Math.max(0,Math.min(1,random()))*total;
  for(let i=0;i<legalMoves.length;i++) {
    sample-=weights[i];
    if(sample<=0) return legalMoves[i];
  }
  return legalMoves.at(-1);
}
