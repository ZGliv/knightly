/* eslint-disable @typescript-eslint/no-unused-expressions -- Browser verification. */
async page => {
 const base='http://localhost:3050',errors=[];page.on('pageerror',e=>errors.push(e.message));
 const check=(v,m)=>{if(!v)throw Error(m)},button=name=>page.getByRole('button',{name,exact:true});
 const shot=async name=>{await page.waitForFunction(()=>[...document.querySelectorAll('main img')].filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).every(i=>i.complete&&i.naturalWidth>0));check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+name);await page.screenshot({path:`output/playwright/knightly-adaptive-oct28/${name}.png`,animations:'disabled'});};
 await page.goto(base+'/study');await page.evaluate(()=>localStorage.clear());
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:960});await page.goto(base+'/study');await page.locator('.study-card').first().waitFor();
  check(await page.locator('.study-shelf').count()===3,'missing phase shelves');check(await page.locator('.study-card').count()===9,'missing curated studies');
  check(await page.locator('.study-nav-wrap').count()===0,'duplicate navigation');
  for(const name of ['All topics','Openings','Middlegames','Endgames','Tactics','Fundamentals']){
   const b=await page.getByRole('group',{name:'Filter by topic'}).getByRole('button',{name:new RegExp('^'+name)}).boundingBox();check(b&&b.x>=0&&b.x+b.width<=width,'hidden topic '+name);check(b.height>=44,'small topic target');
  }
  await shot('study-'+width);
  if(width===390){await page.getByRole('region',{name:'Endgames',exact:true}).scrollIntoViewIfNeeded();await shot('endgame-shelf-mobile');await button('Use light theme').click();await page.evaluate(()=>scrollTo(0,0));await shot('study-light-mobile');await button('Use dark theme').click();}
 }
 // Search, save, open, take notes, and return to the same library context.
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/study');await page.getByLabel('Search library').fill('lucena');
 await page.getByRole('heading',{name:'Rook activity and passed pawns',exact:true}).waitFor();check(await page.locator('.study-card').count()===1,'search should find Lucena collection');
 check((await page.locator('.study-card-bottom').innerText()).includes('Advanced'),'advanced collection mislabeled');
 await button('List view').click();await button('Save Rook activity and passed pawns').click();await page.getByRole('button',{name:/^Saved/}).click();
 await page.reload();await page.getByRole('heading',{name:'Your saved studies',exact:true}).waitFor();check(await page.getByLabel('Search library').inputValue()==='lucena','search reset on reload');check(await button('List view').getAttribute('aria-pressed')==='true','layout reset');
 await page.getByRole('heading',{name:'Rook activity and passed pawns',exact:true}).click();await page.getByRole('heading',{name:'Lessons',exact:true}).waitFor();
 await page.evaluate(()=>localStorage.setItem('knightly_library_notes_v1',JSON.stringify({'italian-game':'Keep this existing note.'})));
 await page.getByLabel('Your study notes').fill('Build the bridge before moving the king.');await button('Save note').click();await page.getByText('Note saved in this browser.',{exact:true}).waitFor();
 await page.reload();await page.waitForFunction(()=>document.querySelector('[aria-label="Your study notes"]')?.value==='Build the bridge before moving the king.');
 check(await page.evaluate(()=>JSON.parse(localStorage.getItem('knightly_library_notes_v1'))['italian-game'])==='Keep this existing note.','overwrote another note');
 await page.getByRole('link',{name:'Library',exact:true}).click();await page.getByRole('heading',{name:'Your saved studies',exact:true}).waitFor();check(await page.getByLabel('Search library').inputValue()==='lucena','return lost search');
 await shot('saved-search-mobile');
 await page.getByLabel('Search library').fill('no such topic');await page.getByRole('heading',{name:'No matching studies',exact:true}).waitFor();await button('Browse all studies').click();
 await button('Grid view').click();await page.getByRole('button',{name:'Browse all 60 studies',exact:true}).click();check(await page.locator('.study-card').count()===60,'not all studies accessible');
 await page.goto(base+'/study');await page.getByRole('button',{name:'View all endgames',exact:true}).click();await page.getByRole('heading',{name:'Endgames',exact:true}).waitFor();check(await page.locator('.study-card').count()===12,'endgame phase misses mating collections');
 await page.getByRole('heading',{name:'Building and finishing mating nets',exact:true}).click();await page.getByRole('heading',{name:'Lessons',exact:true}).waitFor();await page.goBack();await page.getByRole('heading',{name:'Endgames',exact:true}).waitFor();check(page.url().includes('topic=Endgames'),'back lost category');
 // Opening exploration and recall still work in both colors from the filtered library.
 for(const f of [{side:'Black',id:'caro-kann',name:'Caro–Kann Defense',moves:['c6','d5','Bf5','e6','Nd7']},{side:'White',id:'italian-game',name:'Italian Game',moves:['e4','Nf3','Bc4','c3','d3','O-O']}]){
  await page.goto(base+'/study?topic=Openings');await page.getByLabel('Opening color').selectOption(f.side);
  check(await page.locator('.study-card-topline').getByText('Play as '+(f.side==='Black'?'White':'Black'),{exact:true}).count()===0,'side filter failed');
  const card=page.locator(`[data-study-id="${f.id}"]`);await card.locator('.study-card-title').focus();await page.keyboard.press('Enter');
  await button('Next position').waitFor();await button('Next position').click();await button('Last position').click();await button('Recall this line').click();await page.getByLabel('Opening practice move').waitFor();
  const a8=await page.locator('[data-square="a8"]').boundingBox(),h1=await page.locator('[data-square="h1"]').boundingBox();check(f.side==='White'?a8.x<h1.x&&a8.y<h1.y:a8.x>h1.x&&a8.y>h1.y,'wrong board orientation');
  for(const move of f.moves){await page.getByLabel('Opening practice move').fill(move);await button('Check move').click();}
  await page.getByRole('heading',{name:'Line complete',exact:true}).waitFor();await shot('opening-'+f.side.toLowerCase());
  await page.getByRole('link',{name:'Library',exact:true}).click();await page.getByLabel('Opening color').waitFor();check(await page.getByLabel('Opening color').inputValue()===f.side,'return lost opening side');
 }
 await button('My practice').click();await page.getByRole('link',{name:'Practice from your games',exact:true}).waitFor();await page.getByRole('link',{name:'Your games',exact:true}).waitFor();check(await page.locator('.lesson-history > a').count()===92,'missing lesson history');
 await page.reload();await page.getByRole('heading',{name:'Your lessons',exact:true}).waitFor();
 await page.goto(base+'/study?view=path');await page.locator('.learning-roadmap').waitFor();check(page.url().includes('/learn'),'legacy path broken');
 check(!errors.length,errors.join('\n'));return{phaseShelves:true,all60StudiesReachable:true,visibleMobileTopics:true,widths:[1440,768,390,320],lightAndDark:true,correctLevelLabels:true,searchSavedReload:true,detailReturnContext:true,backNavigation:true,notesPreserved:true,keyboardOpeningNavigation:true,whiteBlackRecall:true,practiceLinks:true,legacyPath:true,errors};
};
