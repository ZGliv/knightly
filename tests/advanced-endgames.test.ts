import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { ADVANCED_ENDGAMES } from '../lib/learning/advanced-endgames';
import { sequencePosition } from '../lib/learning/sequences';
import { followThroughPosition, followThroughWalkthrough, practiceLines, selectPracticeLine } from '../lib/learning/follow-through';
import { solvesLesson } from '../lib/learning/curriculum';
import { parseAttempts, type Attempt } from '../lib/learning/progress';
import { courseProgress } from '../lib/learning/path';
import outcomes from './fixtures/advanced-endgame-outcomes.json';

// Recorded Syzygy results are independent evidence of the authored lines' outcomes.
const tablebase = outcomes.positions as Record<string, string>;
const key = (fen:string) => fen.split(' ').slice(0,4).join(' ');
for (const lesson of ADVANCED_ENDGAMES) test(`${lesson.id}: full technique, both boards and colors, reaches its stated outcome`, () => {
 for(const stage of ['guided','transfer'] as const) for(const color of ['white','black'] as const) {
  const base=sequencePosition(lesson,stage,color);
  for(const line of practiceLines(base)) {
   const p={...base,...line}, b=new Chess(p.fen);
   const reference=sequencePosition(lesson,stage,'white');
   const whiteLine=practiceLines(reference).find(l=>l.id===line.id)!;
   const evidence=new Chess(reference.fen);
   const expected=(ply:number)=>lesson.id==='philidor-defense'?'draw':ply%2?'loss':'win';
   assert.equal(tablebase[key(evidence.fen())],expected(0));
   for(let step=0;step<=p.followThrough.length;step++) {
    const decision=followThroughPosition(p,step);
    assert.equal(b.fen(),new Chess(decision.fen).fen());
    assert.equal(b.isGameOver(),false,`${lesson.id}: stopped before technique finished`);
    const move=b.move(decision.answers[0]);assert.equal(move.san,decision.answers[0]);
    assert.ok(solvesLesson(decision,move.from,move.to,move.promotion).correct);
    evidence.move(step===0?reference.answers[0]:whiteLine.followThrough[step-1].answers[0]);
    assert.equal(tablebase[key(evidence.fen())],expected(step*2+1),`${lesson.id}: learner threw away result`);
    if(step<p.followThrough.length) {
     assert.ok(!b.isGameOver());
     assert.equal(b.move(p.followThrough[step].reply).san,p.followThrough[step].reply);
     evidence.move(whiteLine.followThrough[step].reply);
     assert.equal(tablebase[key(evidence.fen())],expected(step*2+2),`${lesson.id}: cooperative mistake required`);
    }
   }
   assert.equal(followThroughWalkthrough(p).fen,b.fen());
   if(lesson.id.includes('mate-conversion'))assert.ok(b.isCheckmate());
   else if(lesson.id==='philidor-defense') {
    if(line.id==='line-1')assert.ok(b.isThreefoldRepetition());
    else {assert.equal(b.findPiece({type:'p',color:color==='white'?'b':'w'}).length,0);assert.ok(!b.isInsufficientMaterial());}
   } else assert.ok(b.findPiece({type:'q',color:color==='white'?'w':'b'}).length===1);
  }
 }
});

test('Lucena really blocks a check with a protected bridge; Philidor changes strategy only after the pawn advance',()=>{
 for(const side of ['white','black'] as const){
  const get=(id:string)=>sequencePosition(ADVANCED_ENDGAMES.find(l=>l.id===id)!,'guided',side);
  const p=get('lucena-bridge'),before=new Chess(followThroughPosition(p,6).fen);
  assert.ok(before.isCheck());const move=before.move(p.followThrough![5].answers[0]);
  assert.equal(move.piece,'r');assert.ok(!before.isCheckmate());
  assert.ok(before.attackers(move.to,move.color).some(s=>before.get(s)?.type==='k'));
  const phil=get('philidor-defense');const pivot=new Chess(followThroughPosition(phil,2).fen);
  assert.ok(pivot.findPiece({type:'p',color:side==='white'?'b':'w'}).some(s=>s[1]===(side==='white'?'3':'6')));
  pivot.move(phil.followThrough![1].answers[0]);assert.ok(pivot.findPiece({type:'r',color:side==='white'?'w':'b'}).some(s=>s[1]===(side==='white'?'8':'1')));
 }
});
test('triangulation reaches the identical arrangement with the other side to move before gaining entry',()=>{
 const p=ADVANCED_ENDGAMES.find(l=>l.id==='triangulation-conversion')!;const b=new Chess(p.fen);
 const moves=[p.answers[0],...p.followThrough!.flatMap(s=>[s.reply,s.answers[0]])];
 moves.slice(0,9).forEach(m=>b.move(m));assert.equal(b.fen().split(' ')[0],p.fen.split(' ')[0]);assert.equal(b.turn(),'b');
 assert.equal(tablebase[key(p.fen)],'win');assert.equal(tablebase[key(b.fen())],'loss');
});
const attempt=(stage:'guided'|'transfer',lineId='line-1'):Attempt=>({id:'long',lessonId:'rook-mate-conversion',stage,positionId:stage==='guided'?'guided':'transfer-1',lineId,movesRequired:12,movesCompleted:12,at:new Date().toISOString(),hints:0,misses:0,outcome:'independent'});
const parse=(a:Attempt)=>parseAttempts(JSON.stringify({version:1,attempts:[a]}));
test('long guided and independent lines persist, while partial work cannot claim completion',()=>{
 for(const stage of ['guided','transfer'] as const){
  const a=attempt(stage);assert.deepEqual(parse(a),[a]);
  assert.throws(()=>parse({...a,movesCompleted:11}));
  assert.equal(parse({...a,movesCompleted:11,outcome:'not-yet'}).length,1);
  assert.throws(()=>parse({...a,movesRequired:13,movesCompleted:13}));
  assert.throws(()=>parse({...a,lineId:'unknown'}));
 }
 assert.ok(!courseProgress([attempt('guided')]).independent.has('rook-mate-conversion'));
 assert.ok(courseProgress([attempt('transfer')]).independent.has('rook-mate-conversion'));
});
test('guided and transfer reply rotations use separate histories and retain complete line identity',()=>{
 const p=ADVANCED_ENDGAMES.find(l=>l.id==='lucena-bridge')!;
 const a:Attempt={...attempt('guided'),lessonId:p.id,movesRequired:9,movesCompleted:9};
 assert.equal(selectPracticeLine(p,'guided',[a]).lineId,'line-2');
 assert.equal(selectPracticeLine({...p,...p.independent},'transfer-1',[a]).lineId,'line-1');
 assert.equal(parse(a).length,1);
 assert.equal(parse({...a,lineId:'line-2',movesRequired:8,movesCompleted:8}).length,1);
});

test('mirrored instructional file names follow the actual board, including Black practice',()=>{
 for(const side of ['white','black'] as const){
  const get=(id:string)=>sequencePosition(ADVANCED_ENDGAMES.find(l=>l.id===id)!,'transfer',side);
  assert.ok(get('rook-mate-conversion').goal.includes('e-file'));
  assert.ok(get('queen-mate-conversion').followThrough![0].goal.includes('c-file'));
  assert.ok(get('philidor-defense').followThrough![2].goal.includes('c-file'));
  assert.ok(get('philidor-defense').goal.includes('your third rank'));
 }
});
