/* eslint-disable @typescript-eslint/no-unused-expressions -- Browser verification entry. */
async (page) => {
 const base='http://localhost:3050',errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const check=(v,m)=>{if(!v)throw Error(m)};
 const ready=()=>page.locator('.roadmap-stops').waitFor();
 const shot=async(name)=>{
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflow');
  await page.waitForFunction(()=>[...document.querySelectorAll('.learning-roadmap img')].filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).every(i=>i.complete&&i.naturalWidth>0));
  await page.screenshot({path:'output/playwright/knightly-adaptive-oct28/'+name+'.png',animations:'disabled'});
 };
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/learn');await page.evaluate(()=>localStorage.clear());await page.reload();await ready();
 check(await page.getByRole('navigation',{name:'Primary'}).getByRole('link').allTextContents().then(t=>t.join(',')==='Play,Learn,Study'),'Navigation');
 check(await page.locator('.roadmap-node').count()===25,'Basics lessons');
 for(const chapter of ['Intermediate','Advanced','Basics']){
  await page.getByRole('button',{name:new RegExp('^'+chapter+' ')}).click();
  check(await page.locator('.roadmap-node').count()===({Basics:25,Intermediate:33,Advanced:34}[chapter]),chapter+' missing lessons');
 }
 await shot('first-visit-mobile');
 for(const side of ['white','black']){
  await page.goto(base+'/learn/foundations?lesson=claim-center&color='+side);
  await page.getByLabel('Practice move').fill(side==='white'?'e4':'e5');
  await page.getByRole('button',{name:'Try move',exact:true}).click();
  await page.getByRole('button',{name:'Try a different position',exact:true}).click();
  await page.getByLabel('Practice move').fill(side==='white'?'d4':'d5');
  await page.getByRole('button',{name:'Try move',exact:true}).click();
  await page.getByText('You solved this position without help.',{exact:true}).waitFor();
  await page.getByRole('link',{name:'Learning path',exact:true}).click();await ready();
  check(await page.locator('[data-lesson="claim-center"]').getAttribute('class').then(c=>c.includes('is-complete')),'Completion absent');
  await page.locator('[data-lesson="claim-center"] .roadmap-node').click();
  check(await page.locator('[data-lesson="claim-center"] .roadmap-side').innerText().then(t=>t.startsWith(side==='white'?'White':'Black')),'Color lost');
  const href=await page.locator('[data-lesson="claim-center"] .roadmap-start').getAttribute('href');check(href.includes('stage=transfer')&&href.includes('color='+side),'Transfer provenance lost');
  await page.reload();await ready();check(await page.locator('[data-lesson="claim-center"]').getAttribute('class').then(c=>c.includes('is-complete')),'Progress lost on reload');
 }
 await page.goto(base+'/study');await page.getByLabel('Search library').waitFor();
 await page.locator('.study-card').first().waitFor();check(await page.locator('.study-card').count()===9,'Study phase shelves missing');
 await page.getByLabel('Search library').fill('sicilian');check(await page.locator('.study-card').count()===1,'Search');
 await page.goto(base+'/study?view=path');await page.waitForURL('**/learn');await ready();
 // Same illustrative state as selected mock; isolated test storage only.
 await page.evaluate(()=>{localStorage.clear();localStorage.setItem('buddymine_practice_v1',JSON.stringify({version:1,attempts:[{id:'visual-first-solve',lessonId:'pawn-capture',stage:'transfer',outcome:'independent',hints:0,misses:0,playerColor:'white',at:new Date().toISOString()}]}))});
 for(const width of [390,320,768,1440]){
  await page.setViewportSize({width,height:844});await page.goto(base+'/learn');await ready();await shot('trail-'+width);
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Use light theme',exact:true}).click();await shot('trail-light-mobile');
 await page.getByRole('button',{name:'Use dark theme',exact:true}).click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-lesson="develop-knight"] .roadmap-node').focus();await page.keyboard.press('Enter');check(await page.locator('[data-lesson="develop-knight"]').getAttribute('class').then(c=>c.includes('is-current')),'Keyboard select');
 await page.goto(base+'/learn/games');await page.getByRole('heading',{name:'Game practice',exact:true}).waitFor();
 await page.goto(base+'/learn');await ready();
 await page.evaluate(()=>localStorage.setItem('buddymine_practice_v1','malformed'));await page.reload();await page.locator('.roadmap-alert').waitFor();check(await page.evaluate(()=>localStorage.getItem('buddymine_practice_v1'))==='malformed','Malformed progress overwritten');
 await page.evaluate(()=>localStorage.removeItem('buddymine_practice_v1'));await page.reload();await ready();
 check(!errors.length,errors.join('\n'));
 return {navigation:true,all92Stops:true,whiteBlackGuidedTransfer:true,persistedProgress:true,sidePreserved:true,legacyLinks:true,studySearch:true,widths:[320,390,768,1440],keyboard:true,malformedPreserved:true,errors};
};
