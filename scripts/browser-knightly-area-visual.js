/* eslint-disable @typescript-eslint/no-unused-expressions -- Browser verification. */
async page=>{
 const base='http://localhost:3050';
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/learn?lesson=isolated-pawn-blockade');
 await page.getByText('Explore Pawn chains, levers and weak squares',{exact:true}).click();
 const stop=page.locator('[data-lesson="isolated-pawn-blockade"]');await stop.screenshot({path:'output/playwright/knightly-adaptive-oct28/guide-card-mobile.png'});
 await page.setViewportSize({width:1440,height:950});await stop.screenshot({path:'output/playwright/knightly-adaptive-oct28/guide-card-desktop.png'});
 await page.goto(base+'/learn/foundations?lesson=ladder-mate&stage=transfer&color=white');await page.getByLabel('Practice move').waitFor();
 await page.setViewportSize({width:320,height:740});await page.locator('[data-square="a6"]').tap();await page.locator('[data-square="a7"]').tap();await page.getByText('Your move 2 of 2',{exact:true}).waitFor();
 await page.locator('[data-square="b1"]').tap();await page.locator('[data-square="b8"]').tap();await page.getByText('You solved this position without help.',{exact:true}).waitFor();
 if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('overflow at 320px');
 await page.screenshot({path:'output/playwright/knightly-adaptive-oct28/ladder-touch-320.png',fullPage:true});return{touchLadderMate:true,widths:[320,390,1440]};
};
