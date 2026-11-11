/* eslint-disable @typescript-eslint/no-unused-expressions -- Browser inspection. */
async page => {
 const base='http://localhost:3050';
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:960});await page.goto(base+'/study');await page.locator('.study-card').first().waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.study-card img')].filter(i=>i.getBoundingClientRect().top<innerHeight).every(i=>i.complete&&i.naturalWidth>0));
  await page.screenshot({path:`output/playwright/knightly-adaptive-oct28/study-${width}.png`});
 }
 await page.getByRole('button',{name:/^Endgames/}).click();await page.screenshot({path:'output/playwright/knightly-adaptive-oct28/endgames-mobile.png'});
 await page.goto(base+'/study/course-rook-endings');await page.locator('.collection-lessons').waitFor();await page.screenshot({path:'output/playwright/knightly-adaptive-oct28/collection-mobile.png',fullPage:true});
 return {inspected:true};
};
