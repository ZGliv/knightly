/* eslint-disable @typescript-eslint/no-unused-expressions -- Browser QA. */
async page => {
 const base='http://localhost:3050', errors=[];page.on('pageerror',e=>errors.push(e.message));
 const check=(v,m)=>{if(!v)throw Error(m)};
 const shot=async name=>{check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflow');await page.screenshot({path:'output/playwright/knightly-adaptive-oct28/'+name+'.png',animations:'disabled'});};
 const open=async(side='white',stage='guided',lesson='claim-center')=>{await page.goto(`${base}/learn/foundations?lesson=${lesson}&color=${side}&stage=${stage}`);await page.getByLabel('Practice move').waitFor();};
 const tap=async(a,b)=>{await page.locator(`[data-square="${a}"]`).tap();await page.locator(`[data-square="${b}"]`).tap();};
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await open();await shot('lesson-'+width);}
 for(const side of ['white','black']){
  await page.setViewportSize({width:side==='white'?375:390,height:844});await open(side);
  await tap(side==='white'?'a2':'a7',side==='white'?'a3':'a6');await page.getByText(/is legal, but doesn’t meet/).waitFor();await shot(side+'-retry');
  await page.getByRole('button',{name:'Give me a hint',exact:true}).click();await page.getByText('Hint 1 of 2').waitFor();await shot(side+'-hint');
  await tap(side==='white'?'e2':'e7',side==='white'?'e4':'e5');await page.getByText('You found it with support.',{exact:true}).waitFor();await shot(side+'-supported');
  await page.getByRole('button',{name:'Try a different position',exact:true}).click();check(await page.evaluate(()=>scrollY)<20,'New board did not reset scroll');
  await tap(side==='white'?'d2':'d7',side==='white'?'d4':'d5');await page.getByText('You solved this position without help.',{exact:true}).waitFor();await shot(side+'-independent');
  await page.getByRole('link',{name:'Learning path',exact:true}).click();await page.locator('.roadmap-stops').waitFor();check(await page.locator('[data-lesson="claim-center"]').getAttribute('class').then(c=>c.includes('is-complete')),'Roadmap completion lost');
 }
 await open('black','transfer');await page.getByText('The idea · Claim some space',{exact:true}).click();await tap('d7','d5');await page.getByText('You found it with support.',{exact:true}).waitFor();
 await open();await page.getByRole('button',{name:'Show me how',exact:true}).click();await page.getByText('An idea to revisit.',{exact:true}).waitFor();await shot('walkthrough');
 await page.getByRole('button',{name:'Next position',exact:true}).click();await page.getByLabel('Practice move').waitFor();
 await page.getByLabel('Lesson options').click();await page.getByLabel('Practice side').selectOption('black');check(await page.locator('.lesson-turn').innerText().then(s=>s.includes('Black')),'Side option');
 await page.getByLabel('Use light theme').click();await shot('light-lesson');await page.getByLabel('Use dark theme').click();
 await page.emulateMedia({reducedMotion:'reduce'});await open('white','guided','rook-support');await shot('endgame-lesson');await page.emulateMedia({reducedMotion:'no-preference'});
 check(errors.length===0,errors.join('\n'));return {widths:[320,390,768,1440],whiteBlackTouch:true,retryHintSupported:true,independentTransfer:true,principleCountsAsHelp:true,walkthrough:true,options:true,theme:true,errors};
};
