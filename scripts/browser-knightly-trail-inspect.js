/* eslint-disable @typescript-eslint/no-unused-expressions -- Visual measurement. */
async page => {
 await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:3050/learn?lesson=claim-center');await page.locator('.roadmap-stops').waitFor();
 return page.evaluate(()=>Object.fromEntries(['.roadmap-heading','.roadmap-chapters','.roadmap-ground','.roadmap-stop.is-current','.roadmap-stop.is-current .roadmap-stop-content','.roadmap-stop.is-current .roadmap-stop-title','.roadmap-stop.is-current h2','.roadmap-lesson-detail>.position-preview','.roadmap-side','.roadmap-goal','.roadmap-start'].map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return[s,{top:r.top,height:r.height,padding:c.padding,margin:c.margin,font:c.fontSize,line:c.lineHeight}]})));
};
