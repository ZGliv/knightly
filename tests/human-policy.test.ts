import {test} from 'node:test';
import assert from 'node:assert/strict';
import fixtures from './fixtures/maia-policy.json';
import {historyTokens, policyIndex, chooseMove} from '../public/engine/maia/policy.mjs';
import {humanOpponent,opponentName,recordedOpponentName,hasHumanPolicy} from '../lib/engine/strength';
for(const fixture of fixtures) test(`Maia ${fixture.name}: matches reference history and all legal move indices`,()=>{
 const actual=historyTokens(fixture.fens);
 const indexes=Array.from(actual).flatMap((value,index)=>value===1?[index]:[]);
 assert.deepEqual(indexes,fixture.nonzeroTokens);
 const black=fixture.fens.at(-1)!.split(' ')[1]==='b';
 assert.deepEqual(fixture.legal.map(move=>policyIndex(move,black)),fixture.indices);
 const logits=new Float32Array(4352).fill(-100);
 fixture.indices.forEach((index,i)=>logits[index]=Math.log(fixture.probabilities['800'][i]));
 for(let n=0;n<100;n++) assert(fixture.legal.includes(chooseMove(logits,fixture.legal,black,()=>n/100)));
});
test('learned legal distribution is sampled without random legal-move injection',()=>{
 const logits=new Float32Array(4352).fill(-100);
 logits[policyIndex('e2e4',false)]=Math.log(.9);
 logits[policyIndex('d2d4',false)]=Math.log(.1);
 assert.equal(chooseMove(logits,['e2e4','d2d4'],false,()=>.89),'e2e4');
 assert.equal(chooseMove(logits,['e2e4','d2d4'],false,()=>.91),'d2d4');
 assert.throws(()=>chooseMove([],['e2e4'],false),/Invalid policy/);
});
test('low targets use Maia while native and historical names stay honest',()=>{
 assert(humanOpponent(800));assert(humanOpponent(1400));assert(!humanOpponent(undefined));
 assert.equal(opponentName(),'Maia');
 assert.equal(recordedOpponentName({engineElo:800}),'Stockfish');
 assert.equal(recordedOpponentName({engineElo:800,training:{policy:'maia3-5m-v1'}}),'Maia');
});

test('v1 high-level Stockfish identities stay intact; v1 Maia history still counts',()=>{
 for(const elo of [1400,2400,3190]){
  assert.equal(recordedOpponentName({engineElo:elo,training:{policy:'maia3-5m-v1'}}),'Stockfish');
  assert.equal(recordedOpponentName({engineElo:elo,training:{policy:'maia3-5m-v2'}}),'Maia');
 }
 assert(hasHumanPolicy({engineElo:800,training:{policy:'maia3-5m-v1'}}));
});
