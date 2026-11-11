/* eslint-disable @typescript-eslint/no-unused-expressions -- Browser verification. */
async page => {
 const base='http://localhost:3050', errors=[]; page.on('pageerror',e=>errors.push(e.message));
 const check=(v,m)=>{if(!v)throw Error(m)}, button=name=>page.getByRole('button',{name,exact:true});
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('buddymine_practice_v1')||'{"attempts":[]}').attempts);
 const lines={
  'knight-fork':[['Ne6+','Nxf8'],['Ne3+','Nxf1']],
  'pawn-fork':[['b5+','bxa6+'],['b4+','bxa3+']],
  skewer:[['Bg6+','Bxe8'],['Bg3+','Bxe1']],
  'knight-promotion':[['b8=N+','Nxa6+'],['b1=N+','Nxa3+']],
  'central-break':[['d4','Nxd4','Qxd4'],['d5','Nxd5','Qxd5']],
  'escape-square':[['a3','c3'],['a6','c6']],
  'rook-support':[['Rb2','b6','b7'],['Rb7','b3','b2']],
  opposition:[['Kc3','Kb3'],['Kc6','Kb6']],
 };
 await page.goto(base+'/learn'); await page.evaluate(()=>localStorage.clear()); let completed=0;
 const seed=async id=>page.evaluate(id=>{
   const prior={id:'legacy-line',lessonId:id,stage:'transfer',positionId:'transfer-1',at:new Date(Date.now()-100000).toISOString(),outcome:'independent',hints:0,misses:0,movesRequired:id==='rook-support'?3:2,movesCompleted:id==='rook-support'?3:2};
   const newer=['transfer-2','transfer-3'].map((positionId,i)=>({...prior,id:'board-'+i,positionId,at:new Date(Date.now()-10000+i).toISOString(),movesRequired:undefined,movesCompleted:undefined}));
   localStorage.setItem('buddymine_practice_v1',JSON.stringify({version:1,attempts:[prior,...newer]}));
 },id);
 for(const [id,colors] of Object.entries(lines))for(const [sideIndex,side] of ['white','black'].entries()){
   await page.setViewportSize({width:side==='white'?375:390,height:844});await seed(id);
   await page.goto(`${base}/learn/foundations?lesson=${id}&stage=transfer&color=${side}`);await page.getByLabel('Practice move').waitFor();
   await page.reload();await page.getByLabel('Practice move').waitFor();
   for(const [index,move] of colors[sideIndex].entries()){
     if(index===0&&id==='knight-promotion'){
       await page.getByText('Board controls',{exact:true}).click();await page.getByLabel('Promotion piece').selectOption('n');
       await page.locator(`[data-square="${side==='white'?'b7':'b2'}"]`).tap();await page.locator(`[data-square="${side==='white'?'b8':'b1'}"]`).tap();
     }else{await page.getByLabel('Practice move').fill(move);await button('Try move').click();}
     if(index<colors[sideIndex].length-1){check((await read()).length===3,'saved partial line');await page.getByText(`Your move ${index+2} of ${colors[sideIndex].length}`,{exact:true}).waitFor();}
   }
   await page.getByText('You solved this position without help.',{exact:true}).waitFor();const attempts=await read();
   check(attempts.length===4&&attempts[0].id==='legacy-line'&&attempts[3].lineId==='line-2'&&attempts[3].movesRequired===colors[sideIndex].length,'wrong variation history');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow');completed++;
   if(id==='central-break')await page.screenshot({path:`output/playwright/knightly-adaptive-oct28/alternate-${side}.png`,fullPage:true});
 }
 // A memorized answer to the old opposition reply must not finish the new line.
 await seed('opposition');await page.goto(base+'/learn/foundations?lesson=opposition&stage=transfer&color=white');
 await page.getByLabel('Practice move').fill('Kc3');await button('Try move').click();await page.getByText('Your move 2 of 2',{exact:true}).waitFor();
 await page.getByLabel('Practice move').fill('Kd3');await button('Try move').click();check((await read()).length===3,'old answer accepted for new reply');
 await button('Give me a hint').click();check((await page.locator('.lesson-hint').innerText()).includes('b-file'),'hint from wrong line');
 await page.getByLabel('Practice move').fill('Kb3');await button('Try move').click();await page.getByText('You found it with support.',{exact:true}).waitFor();
 await page.getByRole('link',{name:'Learning path',exact:true}).click();await page.locator('[data-lesson="opposition"]').waitFor();
 check((await page.locator('[data-lesson="opposition"]').getAttribute('class')).includes('is-complete'),'alternate support erased prior completion');
 // Walkthrough uses the selected line, including its longer exchange.
 await seed('central-break');await page.goto(base+'/learn/foundations?lesson=central-break&stage=transfer&color=black');
 await page.getByLabel('Practice move').fill('d5');await button('Try move').click();await page.getByText('Your move 2 of 3',{exact:true}).waitFor();
 await button('Show me how').click();await page.getByText('An idea to revisit.',{exact:true}).waitFor();
 check((await page.locator('.lesson-board-caption').innerText()).includes('Qxd5'),'wrong walkthrough line');
 check((await read()).at(-1).lineId==='line-2'&&(await read()).at(-1).outcome==='not-yet','walkthrough counted success');
 await page.setViewportSize({width:320,height:740});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320 overflow');
 check(!errors.length,errors.join('\n'));return {completed,alternateRepliesBothColors:true,reloadStable:true,legacyLineRecognized:true,crossColorHistory:true,oldAnswerRejected:true,branchHints:true,branchWalkthrough:true,completionPreserved:true,errors};
};
