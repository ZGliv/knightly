/* eslint-disable @typescript-eslint/no-unused-expressions -- Browser QA entry. */
async page => {
 await page.goto('http://localhost:3050/play');
 await page.waitForFunction(()=>window.render_game_to_text && JSON.parse(window.render_game_to_text()).engine==='ready');
 return await page.evaluate(()=>new Promise((resolve,reject)=>{
  const worker=new Worker('/engine/maia/worker.mjs',{type:'module'});const start=performance.now();
  const timeout=setTimeout(()=>{worker.terminate();reject(Error('model timeout'))},60000);
  worker.onerror=e=>{clearTimeout(timeout);worker.terminate();reject(Error(e.message))};
  worker.onmessage=({data})=>{
   if(data.error){clearTimeout(timeout);worker.terminate();reject(Error(data.error))}
   if(data.move){clearTimeout(timeout);worker.terminate();resolve({move:data.move,ms:performance.now()-start})}
  };
  worker.postMessage({id:1,elo:800,fens:['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'],legalMoves:['e2e4','d2d4','g1f3','b1c3','c2c4','a2a3']});
 }));
}
