/* eslint-disable @typescript-eslint/no-unused-expressions -- Browser verification entry. */
async (page) => {
 const base='http://localhost:3050', errors=[];
 page.on('pageerror', e=>errors.push(e.message));
 const check=(value,message)=>{if(!value)throw Error(message)};
 const shot=async name=>{
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflow');
  await page.waitForFunction(()=>[...document.querySelectorAll('.library-page img')].filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).every(i=>i.complete&&i.naturalWidth>0));
  await page.screenshot({path:'output/playwright/knightly-adaptive-oct28/'+name+'.png', animations:'disabled'});
 };
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:900});
  await page.goto(base+'/study');
  await page.locator('.next-study').waitFor();
  await shot('path-'+width);
  await page.locator('.course-stage').first().scrollIntoViewIfNeeded();
  check(await page.locator('.course-stage[open] .course-lesson-board .position-preview').count()===16,'Missing lesson boards');
  const first=page.locator('.course-stage[open] .course-lesson').first();
  const href=await first.getAttribute('href');check(href.includes('lesson='),'Broken lesson link');
  await shot('course-'+width);
  await first.focus();await page.keyboard.press('Enter');await page.getByLabel('Practice move').waitFor();
  await page.goto(base+'/study?view=browse');
  await page.getByRole('heading',{name:'Explore the library',exact:true}).waitFor();
  check(await page.locator('.study-card').count()===12,'Initial library shelf');
  check(await page.locator('.cover-openings').count()===6,'Opening shelf missing');
  await shot('browse-'+width);
  if(width===390){
   await page.getByRole('button',{name:'Use light theme',exact:true}).click();await shot('browse-light-mobile');
   await page.getByRole('button',{name:'Use dark theme',exact:true}).click();
  }
 }
 await page.goto(base+'/games');
 check(await page.locator('a[href*="buddymine.vercel.app"]').count()===0,'Old address link remains');
 check(!errors.length,errors.join('\n'));
 return {widths:[1440,768,390,320],lessonBoards:true,keyboardLesson:true,imagesLoaded:true,openingShelf:true,lightAndDark:true,errors};
};
