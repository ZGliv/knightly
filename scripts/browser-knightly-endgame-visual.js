/* eslint-disable @typescript-eslint/no-unused-expressions -- Browser verification. */
async page => {
 const base='http://localhost:3050',errors=[];page.on('pageerror',e=>errors.push(e.message));
 const check=(v,m)=>{if(!v)throw Error(m)};
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});
  await page.goto(base+'/learn/foundations?lesson=rook-mate-conversion&stage=guided&color=black');
  await page.getByLabel('Practice move').waitFor();await page.evaluate(()=>window.scrollTo(0,0));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  check(await page.getByRole('heading',{name:'Rook and king: finish the job',exact:true}).count()===1,'duplicated lesson');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow');
  await page.screenshot({path:`output/playwright/knightly-adaptive-oct28/lesson-fresh-${width}.png`});
 }
 await page.goto(base+'/learn?lesson=philidor-defense');await page.locator('[data-lesson="philidor-defense"] .roadmap-start').waitFor();
 await page.screenshot({path:'output/playwright/knightly-adaptive-oct28/advanced-roadmap.png'});
 check(!errors.length,errors.join('\n'));return {singleLesson:true,widths:[320,390,1440],errors};
};
