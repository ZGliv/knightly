import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { LESSONS, solvesLesson } from '../lib/learning/curriculum';
import { sequencePosition } from '../lib/learning/sequences';
import { FOLLOW_THROUGH, followThroughPosition, followThroughWalkthrough, practiceLines, selectPracticeLine } from '../lib/learning/follow-through';
import { courseProgress } from '../lib/learning/path';
import { parseAttempts, type Attempt } from '../lib/learning/progress';

for (const id of Object.keys(FOLLOW_THROUGH)) test(`${id}: full follow-through stays legal and teaches its consequence in both colors`, () => {
  for (const color of ['white','black'] as const) {
    const lesson=sequencePosition(LESSONS.find(l=>l.id===id)!, 'transfer', color);
    const chess=new Chess(lesson.fen);
    const required=1+lesson.followThrough!.length;
    for(let step=0;step<required;step++) {
      const decision=followThroughPosition(lesson,step);
      assert.equal(chess.fen(),new Chess(decision.fen).fen());
      assert.equal(chess.turn(),color==='white'?'w':'b');
      assert.equal(chess.isGameOver(),false);
      const move=chess.move(decision.answers[0]);
      assert.equal(solvesLesson(decision,move.from,move.to,move.promotion).correct,true);
      if(step<required-1) {
        assert.equal(chess.isGameOver(),false);
        const reply=chess.move(lesson.followThrough![step].reply);
        assert.equal(reply.san,lesson.followThrough![step].reply);
      } else {
        if(['knight-fork','pawn-fork','knight-promotion'].includes(id))assert.equal(move.captured,'r');
        if(id==='skewer')assert.equal(move.captured,'q');
        if(id==='central-break')assert.equal(move.captured,'p');
        if(id==='escape-square')assert.equal(chess.isCheck(),false);
        if(id==='rook-support')assert.equal(move.to,color==='white'?'b7':'b2');
        if(id==='opposition')assert.equal(move.to,color==='white'?'d3':'d6');
      }
    }
    assert.equal(followThroughWalkthrough(lesson).fen,chess.fen());
    assert.equal(followThroughWalkthrough(lesson).moves.length,required*2-1);
    if(['knight-fork','knight-promotion'].includes(id))assert.equal(chess.isInsufficientMaterial(),true);
  }
});
test('guided and the other practice boards retain single-decision behavior',()=>{
  for(const id of Object.keys(FOLLOW_THROUGH))for(const side of ['white','black'] as const){
    const lesson=LESSONS.find(l=>l.id===id)!;
    assert.equal(sequencePosition(lesson,'guided',side).followThrough,undefined);
    for(const position of ['transfer-2','transfer-3'])assert.equal(sequencePosition(lesson,'transfer',side,position).followThrough,undefined);
  }
});
test('partial line records cannot claim supported or independent completion; old attempts remain readable',()=>{
  const attempt={id:'qa',lessonId:'knight-fork',stage:'transfer',positionId:'transfer-1',at:new Date().toISOString(),outcome:'independent',hints:0,misses:0};
  const parse=(extra:object)=>parseAttempts(JSON.stringify({version:1,attempts:[{...attempt,...extra}]}));
  assert.equal(parse({}).length,1);
  assert.equal(parse({movesCompleted:2,movesRequired:2}).length,1);
  assert.equal(parse({movesCompleted:1,movesRequired:2,outcome:'not-yet'}).length,1);
  for(const outcome of ['independent','supported'])assert.throws(()=>parse({movesCompleted:1,movesRequired:2,outcome}));
  assert.throws(()=>parse({movesCompleted:3,movesRequired:2}));
  assert.throws(()=>parse({movesCompleted:1}));
});

for (const id of Object.keys(FOLLOW_THROUGH)) test(`${id}: alternate reply line is canonical, legal and distinct in both colors`,()=>{
  for(const side of ['white','black'] as const){
    const base=sequencePosition(LESSONS.find(l=>l.id===id)!, 'transfer', side);
    const lines=practiceLines(base);
    assert.equal(lines.length,2);
    assert.notEqual(lines[0].followThrough[0].reply,lines[1].followThrough[0].reply);
    const lesson={...base,...lines[1]}; const board=new Chess(lesson.fen);
    for(let step=0;step<=lesson.followThrough.length;step++){
      const decision=followThroughPosition(lesson,step);
      assert.equal(board.fen(),new Chess(decision.fen).fen());
      assert.equal(board.isGameOver(),false);
      const move=board.move(decision.answers[0]);assert.equal(move.san,decision.answers[0]);
      if(step<lesson.followThrough.length){
        assert.equal(board.isGameOver(),false);
        const reply=board.move(lesson.followThrough[step].reply);assert.equal(reply.san,lesson.followThrough[step].reply);
      }else{
        if(['knight-fork','pawn-fork','knight-promotion'].includes(id))assert.equal(move.captured,'r');
        if(id==='skewer')assert.equal(move.captured,'q');
        if(id==='central-break'){assert.equal(move.captured,'p');assert.equal(move.piece,'q');}
        if(id==='escape-square')assert.ok(board.attackers(side==='white'?'d4':'d5',side==='white'?'w':'b').includes(side==='white'?'c3':'c6'));
        if(id==='opposition')assert.equal(move.to,side==='white'?'b3':'b6');
      }
    }
    assert.equal(followThroughWalkthrough(lesson).fen,board.fen());
  }
});

test('reply selection shares colors, favors unseen then least recent and ignores future/unrelated attempts',()=>{
  const lesson=sequencePosition(LESSONS.find(l=>l.id==='opposition')!, 'transfer', 'black');
  const now=Date.now();
  const a:Attempt={id:'old-line',lessonId:'opposition',stage:'transfer',positionId:'transfer-1',at:new Date(now-10000).toISOString(),outcome:'independent',hints:0,misses:0,movesRequired:2,movesCompleted:2,playerColor:'white'};
  assert.equal(selectPracticeLine(lesson,'transfer-1',[]).lineId,'line-1');
  assert.equal(selectPracticeLine(lesson,'transfer-1',[a]).lineId,'line-2');
  assert.equal(selectPracticeLine(lesson,'transfer-1',[{...a,movesRequired:undefined,movesCompleted:undefined}]).lineId,'line-1');
  assert.equal(selectPracticeLine(lesson,'transfer-1',[{...a,at:new Date(now+100000).toISOString()}],now).lineId,'line-1');
  const b:Attempt={...a,id:'new-line',lineId:'line-2',outcome:'supported',hints:1,at:new Date(now-1000).toISOString()};
  assert.equal(selectPracticeLine(lesson,'transfer-1',[b,a]).lineId,'line-1');
  assert.equal(courseProgress([a,b]).independent.has('opposition'),true);
});

test('stored reply IDs and lengths are validated while legacy records remain readable',()=>{
  const a={id:'test',lessonId:'central-break',stage:'transfer',positionId:'transfer-1',at:new Date().toISOString(),outcome:'independent',hints:0,misses:0,movesRequired:3,movesCompleted:3,lineId:'line-2'};
  const parse=(extra:object)=>parseAttempts(JSON.stringify({version:1,attempts:[{...a,...extra}]}));
  assert.equal(parse({}).length,1);
  for(const extra of [{lineId:'unknown'},{movesRequired:2,movesCompleted:2},{positionId:'transfer-2'},{stage:'guided',positionId:'guided'}])assert.throws(()=>parse(extra));
});
