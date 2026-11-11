// SPDX-License-Identifier: AGPL-3.0-or-later
// Standalone Maia-3 engine. Protocol: {id, fens, legalMoves, elo}; returns {id, move}.
import * as ort from './ort.wasm.min.mjs';
import {historyTokens,chooseMove} from './policy.mjs';
ort.env.wasm.numThreads=1;
ort.env.wasm.wasmPaths=new URL('./',import.meta.url).href;
let session;
let queue=Promise.resolve();
self.onmessage=({data})=>{
 queue=queue.then(async()=>{
  try {
   if(!session) {
    self.postMessage({id:data.id,status:'loading'});
    session=await ort.InferenceSession.create(new URL('./maia3-5m-v1.onnx',import.meta.url).href,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
   }
   if(!Number.isInteger(data.elo)||data.elo<400||data.elo>3190)throw Error('Unsupported human-style rating');
   self.postMessage({id:data.id,status:'thinking'});
   const elo=new ort.Tensor('float32',new Float32Array([data.elo]),[1]);
   const output=await session.run({tokens:new ort.Tensor('float32',historyTokens(data.fens),[1,64,96]),self_elo:elo,opponent_elo:elo});
   const move=chooseMove(output.policy.data,data.legalMoves,data.fens.at(-1).split(' ')[1]==='b');
   Object.values(output).forEach(tensor=>tensor.dispose());
   self.postMessage({id:data.id,move});
  }catch(error){self.postMessage({id:data.id,error:error instanceof Error?error.message:'Human-style engine failed'});}
 });
};
