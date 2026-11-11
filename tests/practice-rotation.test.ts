import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {ADVANCED_ENDGAMES} from '../lib/learning/advanced-endgames';
import {CURRICULUM_EXPANSION} from '../lib/learning/curriculum-expansion';
import {SEQUENCES,practicePositions,sequencePosition} from '../lib/learning/sequences';
import {solvesLesson} from '../lib/learning/curriculum';
import {selectPracticePosition} from '../lib/learning/practice-selection';
import {parseAttempts,type Attempt} from '../lib/learning/progress';
import {courseProgress} from '../lib/learning/path';

test('every lesson has distinct transfer boards with valid answers in both colors',()=>{
 for(const lesson of SEQUENCES){
  const positions=practicePositions(lesson);assert.ok(positions.length >= 1,lesson.id);
  if(![...CURRICULUM_EXPANSION,...ADVANCED_ENDGAMES].some(l=>l.id===lesson.id))assert.equal(positions.length,3,`legacy boards: ${lesson.id}`);
  assert.equal(new Set([lesson.fen,...positions.map(p=>p.fen)].map(f=>f.split(' ')[0])).size,positions.length+1,lesson.id);
  for(const p of positions)for(const side of ['white','black'] as const){
   const exercise=sequencePosition(lesson,'transfer',side,p.positionId),board=new Chess(exercise.fen);
   assert.equal(board.turn(),side[0]);assert.ok(!board.isGameOver());
   const f=exercise.fen.split(' ');f[1]=side==='white'?'b':'w';f[3]='-';assert.ok(!new Chess(f.join(' ')).isCheck(),lesson.id);
   for(const answer of exercise.answers){const b=new Chess(exercise.fen);const move=b.move(answer);assert.equal(move.san,answer);assert.ok(solvesLesson(exercise,move.from,move.to,move.promotion).correct);}
  }
 }
});
test('added tactical boards preserve mate, fork, check evasion, promotion and draw mechanisms',()=>{
 const mates=['back-rank','queen-finish','rook-finish','mating-net','forcing-first','smothered-mate','anastasia-mate','arabian-mate'];
 for(const lesson of SEQUENCES)for(const p of practicePositions(lesson).slice(1))for(const side of ['white','black'] as const){
  const e=sequencePosition(lesson,'transfer',side,p.positionId),b=new Chess(e.fen);const checked=b.isCheck();const m=b.move(e.answers[0]);
  if(mates.includes(lesson.id))assert.ok(b.isCheckmate(),lesson.id);
  if(['capture-checker','block-check','escape-check','knight-interpose','en-passant-check'].includes(lesson.id)){
   assert.ok(checked,lesson.id);assert.ok(!b.isAttacked(b.findPiece({type:'k',color:m.color})[0],m.color==='w'?'b':'w'));
  }
  if(lesson.id==='stalemate-resource'){const replies=b.moves();assert.equal(replies.length,1);b.move(replies[0]);assert.ok(b.isStalemate());}
  if(lesson.id==='rook-underpromotion'){
   assert.equal(m.promotion,'r');assert.ok(!b.isGameOver());const q=new Chess(e.fen);q.move({from:m.from,to:m.to,promotion:'q'});assert.ok(q.isStalemate());
  }
  if(lesson.id.startsWith('en-passant'))assert.ok(m.flags.includes('e'));
  if(lesson.id==='capture-promotion'){assert.equal(m.captured,'r');assert.equal(m.promotion,'q');}
  if(['knight-fork','pawn-fork','knight-promotion','queen-fork'].includes(lesson.id)){
   assert.ok(b.isCheck());assert.ok(b.findPiece({type:'r',color:m.color==='w'?'b':'w'}).some(s=>b.attackers(s,m.color).includes(m.to)),lesson.id);
  }
  if(lesson.id==='double-check'){assert.equal(b.attackers(b.findPiece({type:'k',color:m.color==='w'?'b':'w'})[0],m.color).length,2);assert.ok(b.moves({verbose:true}).every(m=>m.piece==='k'));}
  if(lesson.id==='absolute-pin')assert.equal(b.moves({square:b.findPiece({type:'n',color:m.color==='w'?'b':'w'})[0]}).length,0);
  if(lesson.id==='skewer')for(const reply of b.moves()){const c=new Chess(b.fen());c.move(reply);assert.ok(c.moves({verbose:true}).some(m=>m.captured==='q'));}
 }
});
const lesson=SEQUENCES.find(l=>l.id==='claim-center')!,now=Date.UTC(2026,9,29);
const a=(positionId:string|undefined,at:number,outcome:Attempt['outcome']='independent'):Attempt=>({id:String(at),lessonId:lesson.id,positionId,stage:'transfer',playerColor:'white',at:new Date(at).toISOString(),hints:outcome==='supported'?1:0,misses:0,outcome});
test('selection rotates unseen positions across colors and treats legacy transfer as the original board',()=>{
 assert.equal(selectPracticePosition(lesson,[],now).positionId,'transfer-1');
 const history=[a(undefined,now-1000)];assert.equal(selectPracticePosition(lesson,history,now).positionId,'transfer-2');
 history.push({...a('transfer-2',now-500),playerColor:'black'});assert.equal(selectPracticePosition(lesson,history,now).positionId,'transfer-3');
 history.push(a('transfer-3',now));assert.equal(selectPracticePosition(lesson,history,now).positionId,'transfer-1');
 assert.equal(selectPracticePosition(lesson,history,now).positionId,selectPracticePosition(lesson,[...history].reverse(),now).positionId);
});
test('help returns when due, guided/future attempts do not consume unseen boards',()=>{
 assert.equal(selectPracticePosition(lesson,[a('transfer-1',now-1000,'supported')],now).positionId,'transfer-2');
 assert.equal(selectPracticePosition(lesson,[a('transfer-1',now-16*60000,'supported')],now).positionId,'transfer-1');
 assert.equal(selectPracticePosition(lesson,[{...a('guided',now),stage:'guided'},a('transfer-1',now+1000)],now).positionId,'transfer-1');
});
test('position history is additive, validates IDs and retains old lesson completion',()=>{
 const legacy=a(undefined,now-1000),fresh=a('transfer-2',now);
 const history=parseAttempts(JSON.stringify({version:1,attempts:[legacy,fresh]}));assert.deepEqual(history,JSON.parse(JSON.stringify([legacy,fresh])));
 assert.ok(courseProgress([legacy],now).independent.has(lesson.id));
 assert.ok(courseProgress(history,now).independent.has(lesson.id));
 assert.ok(courseProgress([legacy,a('transfer-2',now,'not-yet')],now).independent.has(lesson.id));
 assert.ok(!courseProgress([legacy,a('transfer-1',now,'not-yet')],now).independent.has(lesson.id));
 assert.throws(()=>parseAttempts(JSON.stringify({version:1,attempts:[{...fresh,positionId:'made-up'}]})));
 assert.throws(()=>parseAttempts(JSON.stringify({version:1,attempts:[{...fresh,stage:'guided'}]})));
});
