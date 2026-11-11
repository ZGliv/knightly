import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { DEEPER_SEQUENCES } from '../lib/learning/deeper-content';
import { sequencePosition } from '../lib/learning/sequences';

test('new special-move exercises actually exercise their advertised rule in both colors', () => {
  for (const lesson of DEEPER_SEQUENCES) for (const side of ['white','black'] as const) for (const stage of ['guided','transfer'] as const) {
    const position = sequencePosition(lesson,stage,side);
    const board = new Chess(position.fen);
    const wasCheck = board.isCheck();
    const move = board.move(position.answers[0]);
    if (lesson.id.startsWith('en-passant')) { assert.ok(move.flags.includes('e')); assert.equal(move.captured,'p'); }
    if (lesson.id === 'en-passant-check' || lesson.id === 'knight-interpose') {
      assert.ok(wasCheck);
      const king = board.findPiece({type:'k',color:side==='white'?'w':'b'})[0];
      assert.equal(board.isAttacked(king,side==='white'?'b':'w'),false);
    }
    if (lesson.id === 'castle-long') assert.ok(move.flags.includes('q'));
    if (lesson.id === 'capture-promotion') {assert.equal(move.promotion,'q');assert.equal(move.captured,'r');}
    if (lesson.id === 'knight-jump') {assert.equal(move.piece,'n');assert.equal(move.captured,'r');}
    if (lesson.id === 'stalemate-resource') {
      assert.ok(board.isCheck());
      const replies = board.moves(); assert.equal(replies.length,1);
      board.move(replies[0]);assert.ok(board.isStalemate());
    }
  }
});
test('en passant opportunities expire after an intervening move', () => {
  const lesson=DEEPER_SEQUENCES.find(l=>l.id==='en-passant')!;
  const board=new Chess(lesson.fen); board.move('Kf1'); board.move('Kg8');
  assert.ok(!board.moves({verbose:true}).some(move=>move.flags.includes('e')));
});

