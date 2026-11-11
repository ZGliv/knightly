import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {MaiaClient} from '../lib/engine/maia-client';
class WorkerStub {
 static last:WorkerStub;
 messages:Record<string,unknown>[]=[];
 ended=false;
 onmessage:((event:{data:Record<string,unknown>})=>void)|null=null;
 onerror:(()=>void)|null=null;
 onmessageerror:(()=>void)|null=null;
 constructor(){WorkerStub.last=this;}
 postMessage(message:Record<string,unknown>){this.messages.push(message);}
 terminate(){this.ended=true;}
 emit(data:Record<string,unknown>){this.onmessage?.({data});}
}
Object.assign(globalThis,{Worker:WorkerStub});
test('Maia receives real history and a rules-checked move list; no scores are fabricated',async()=>{
 const statuses:string[]=[];const client=new MaiaClient(s=>statuses.push(s));const worker=WorkerStub.last;
 const board=new Chess();board.move('e4');
 const response=client.analyzePosition(board.fen(),800,['e2e4']);
 const message=worker.messages[0];assert.equal((message.fens as string[]).length,2);
 assert.equal((message.fens as string[])[1],board.fen());
 assert.deepEqual(message.legalMoves,board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??'')));
 worker.emit({id:1,status:'loading'});worker.emit({id:1,status:'thinking'});worker.emit({id:1,move:'e7e5'});
 assert.deepEqual(await response,{bestMove:'e7e5',scoreCp:null,mateIn:null,depth:0,pv:['e7e5']});
 assert.deepEqual(statuses,['loading','thinking','idle']);client.terminate();
});
test('mismatched history cannot send a wrong position to the model',async()=>{
 const client=new MaiaClient();await assert.rejects(client.analyzePosition(new Chess().fen(),800,['e2e4']),/does not match/);
 assert.equal(WorkerStub.last.messages.length,0);client.terminate();
});
test('invalid model move rejects all queued requests with no random fallback',async()=>{
 const client=new MaiaClient();const worker=WorkerStub.last;
 const first=client.analyzePosition(new Chess().fen(),800),second=client.analyzePosition(new Chess().fen(),600);
 const checks=[assert.rejects(first,/could not choose/),assert.rejects(second,/could not choose/)];
 worker.emit({id:1,move:'e2e5'});await Promise.all(checks);assert(worker.ended);
});
test('worker faults and session disposal reject work instead of applying late moves',async()=>{
 for(const fault of ['load','dispose']){
  const client=new MaiaClient(),worker=WorkerStub.last;
  const pending=client.analyzePosition(new Chess().fen(),800);
  const rejected=assert.rejects(pending,fault==='load'?/could not load/:/session ended/);
  if(fault==='load')worker.onerror!();else client.terminate();
  worker.emit({id:1,move:'e2e4'});await rejected;assert(worker.ended);
 }
});

test('invalid targets fail before reaching the model',async()=>{
 const client=new MaiaClient();
 for(const elo of [NaN,399,3191,800.5]) await assert.rejects(client.analyzePosition(new Chess().fen(),elo),/supported opponent rating/);
 assert.equal(WorkerStub.last.messages.length,0);client.terminate();
});
