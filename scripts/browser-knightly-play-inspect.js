/* eslint-disable @typescript-eslint/no-unused-expressions -- Browser QA entry. */
async (page) => {
 await page.setViewportSize({width:390,height:760});
 await page.goto('http://localhost:3050/play');
 await page.waitForFunction(()=>window.render_game_to_text && JSON.parse(window.render_game_to_text()).engine==='ready');
 await page.screenshot({path:'output/playwright/knightly-adaptive-oct28/play.png',fullPage:true,caret:"initial"});
 await page.goto('http://localhost:3050/study/italian-game');
 await page.getByRole('heading', {name:'Italian Game',exact:true}).waitFor();
 await page.screenshot({path:'output/playwright/knightly-adaptive-oct28/study.png',fullPage:true,caret:"initial"});
 return {inspected:true};
}
