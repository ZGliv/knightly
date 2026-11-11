import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { CURRICULUM_EXPANSION } from '../lib/learning/curriculum-expansion';
import { LEARNING_AREAS } from '../lib/learning/areas';
import { SEQUENCES, sequencePosition } from '../lib/learning/sequences';
import { practiceLines, followThroughPosition, followThroughWalkthrough } from '../lib/learning/follow-through';
import { parseAttempts } from '../lib/learning/progress';

test('area guides cover every lesson exactly once and contain actionable depth',()=>{
 assert.deepEqual(LEARNING_AREAS.flatMap(a=>a.lessons).sort(),SEQUENCES.map(l=>l.id).sort());
 for(const a of LEARNING_AREAS){assert.ok(a.overview.join(' ').length>700);assert.ok(a.checkpoints.length>=3);assert.ok(a.nextDepth.length>20);}
});
for(const lesson of CURRICULUM_EXPANSION)test(`${lesson.id}: new decisions and complete continuations work in both colors`,()=>{
 for(const side of ['white','black'] as const)for(const stage of ['guided','transfer'] as const){
  const e=sequencePosition(lesson,stage,side),board=new Chess(e.fen),wasCheck=board.isCheck();
  assert.equal(board.isGameOver(),false);const moved=board.move(e.answers[0]);assert.equal(moved.san,e.answers[0]);
  if(['king-captures-checker','knight-check-response','double-check-response'].includes(lesson.id)){
   assert.ok(wasCheck);const king=board.findPiece({type:'k',color:moved.color})[0];assert.equal(board.isAttacked(king,moved.color==='w'?'b':'w'),false);
  }
  if(['avoid-stalemate','intermediate-check'].includes(lesson.id))assert.ok(board.isCheckmate());
  if(lesson.id==='avoid-stalemate'){
   const alt=new Chess(e.fen);const move=stage==='guided'?(side==='white'?'Qg6':'Qg3'):(side==='white'?'Qb6':'Qb3');alt.move(move);assert.ok(alt.isStalemate());
  }
  if(lesson.id==='bishop-stops-pawn'){
   const target=stage==='guided'?(side==='white'?'a1':'a8'):(side==='white'?'b1':'b8');
   assert.equal(new Chess(e.fen).isAttacked(target,moved.color),false);assert.equal(board.isAttacked(target,moved.color),true);
  }
  if(lesson.id==='trap-knight'){
   const knights=board.moves({verbose:true}).filter(m=>m.piece==='n');assert.ok(knights.length>0);
   for(const m of knights){const b=new Chess(board.fen());b.move(m);assert.ok(b.isAttacked(m.to,moved.color),`safe escape ${m.san}`);}
  }
  if(lesson.id==='exploit-pin')assert.equal(board.moves({verbose:true}).filter(m=>m.piece==='n').length,0);
  if(lesson.id==='break-pin'){
   const fields=board.fen().split(' ');fields[1]=moved.color;const own=new Chess(fields.join(' '));assert.ok(own.moves({verbose:true}).some(m=>m.piece==='n'));
  }
  for(const line of practiceLines(e)){
   const variant={...e,...line};const c=new Chess(variant.fen);c.move(variant.answers[0]);
   for(const [i,s] of line.followThrough.entries()){
    assert.equal(c.isGameOver(),false);assert.equal(c.move(s.reply).san,s.reply);
    const decision=followThroughPosition(variant,i+1);assert.equal(c.fen(),new Chess(decision.fen).fen());
    assert.equal(c.move(s.answers[0]).san,s.answers[0]);
   }
   assert.equal(followThroughWalkthrough(variant).fen,c.fen());
   if(lesson.id==='ladder-mate')assert.ok(c.isCheckmate());
   assert.equal(parseAttempts(JSON.stringify({version:1,attempts:[{id:'qa',lessonId:lesson.id,stage,positionId:stage==='transfer'?'transfer-1':'guided',lineId:line.id,movesRequired:line.followThrough.length+1,movesCompleted:line.followThrough.length+1,at:new Date().toISOString(),outcome:'independent',hints:0,misses:0}]})).length,1);
  }
 }
});
