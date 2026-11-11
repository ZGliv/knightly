/* eslint-disable @typescript-eslint/no-unused-expressions -- Browser verification. */
async page => {
const fixtures=[{"id": "ladder-mate", "side": "white", "stage": "guided", "moves": ["Ra8#"], "goal": "Use the rooks together to checkmate on the back rank."}, {"id": "ladder-mate", "side": "white", "stage": "transfer", "moves": ["Ra7", "Rb8#"], "goal": "Cut the king off on the seventh rank before delivering mate."}, {"id": "ladder-mate", "side": "black", "stage": "guided", "moves": ["Ra1#"], "goal": "Use the rooks together to checkmate on the back rank."}, {"id": "ladder-mate", "side": "black", "stage": "transfer", "moves": ["Ra2", "Rb1#"], "goal": "Cut the king off on the seventh rank before delivering mate."}, {"id": "break-pin", "side": "white", "stage": "guided", "moves": ["Be3"], "goal": "Put your bishop between the rook and knight to release the knight from its pin."}, {"id": "break-pin", "side": "white", "stage": "transfer", "moves": ["Bd3"], "goal": "Interpose your bishop above the pinned knight."}, {"id": "break-pin", "side": "black", "stage": "guided", "moves": ["Be6"], "goal": "Put your bishop between the rook and knight to release the knight from its pin."}, {"id": "break-pin", "side": "black", "stage": "transfer", "moves": ["Bd6"], "goal": "Interpose your bishop above the pinned knight."}, {"id": "trap-knight", "side": "white", "stage": "guided", "moves": ["b3"], "goal": "Attack the rim knight while controlling all four escape squares."}, {"id": "trap-knight", "side": "white", "stage": "transfer", "moves": ["g3", "gxh4"], "goal": "Trap the knight by attacking it with your g-pawn."}, {"id": "trap-knight", "side": "black", "stage": "guided", "moves": ["b6"], "goal": "Attack the rim knight while controlling all four escape squares."}, {"id": "trap-knight", "side": "black", "stage": "transfer", "moves": ["g6", "gxh5"], "goal": "Trap the knight by attacking it with your g-pawn."}, {"id": "attract-king", "side": "white", "stage": "guided", "moves": ["Rh8+"], "goal": "Draw the king toward a checking knight fork."}, {"id": "attract-king", "side": "white", "stage": "transfer", "moves": ["Ra8+", "Nc7+", "Nxe8"], "goal": "Offer a rook with check to bring the king onto a fork square."}, {"id": "attract-king", "side": "black", "stage": "guided", "moves": ["Rh1+"], "goal": "Draw the king toward a checking knight fork."}, {"id": "attract-king", "side": "black", "stage": "transfer", "moves": ["Ra1+", "Nc2+", "Nxe1"], "goal": "Offer a rook with check to bring the king onto a fork square."}, {"id": "rook-pawn-corner", "side": "white", "stage": "guided", "moves": ["Ka1"], "goal": "Reach the promotion corner in front of the enemy rook pawn."}, {"id": "rook-pawn-corner", "side": "white", "stage": "transfer", "moves": ["Kh1"], "goal": "Occupy the rook pawn\u2019s promotion corner."}, {"id": "rook-pawn-corner", "side": "black", "stage": "guided", "moves": ["Ka8"], "goal": "Reach the promotion corner in front of the enemy rook pawn."}, {"id": "rook-pawn-corner", "side": "black", "stage": "transfer", "moves": ["Kh8"], "goal": "Occupy the rook pawn\u2019s promotion corner."}, {"id": "bishop-stops-pawn", "side": "white", "stage": "guided", "moves": ["Bc3"], "goal": "Control a1 before the pawn promotes."}, {"id": "bishop-stops-pawn", "side": "white", "stage": "transfer", "moves": ["Be4", "Bxb1"], "goal": "Control the promotion square from a safe diagonal."}, {"id": "bishop-stops-pawn", "side": "black", "stage": "guided", "moves": ["Bc6"], "goal": "Control a8 before the pawn promotes."}, {"id": "bishop-stops-pawn", "side": "black", "stage": "transfer", "moves": ["Be5", "Bxb8"], "goal": "Control the promotion square from a safe diagonal."}],base='http://localhost:3050',errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=(v,m)=>{if(!v)throw Error(m)},button=name=>page.getByRole('button',{name,exact:true});
await page.goto(base+'/learn');await page.evaluate(()=>localStorage.clear());let completed=0;
for(const f of fixtures){
 await page.setViewportSize({width:f.side==='white'?375:390,height:844});
 await page.goto(`${base}/learn/foundations?lesson=${f.id}&stage=${f.stage}&color=${f.side}`);await page.getByLabel('Practice move').waitFor();
 check(await page.locator('.lesson-mobile-goal').innerText()===f.goal,'wrong lesson goal '+f.id);
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('buddymine_practice_v1')||'{"attempts":[]}').attempts.length);
 for(const [index,move] of f.moves.entries()){
   await page.getByLabel('Practice move').fill(move);await button('Try move').click();
   if(index<f.moves.length-1)await page.getByText(`Your move ${index+2} of ${f.moves.length}`,{exact:true}).waitFor();
 }
 await page.getByText('You solved this position without help.',{exact:true}).waitFor();
 const history=await page.evaluate(()=>JSON.parse(localStorage.getItem('buddymine_practice_v1')).attempts);check(history.length===before+1,'missing/duplicate save');check(history.at(-1).lessonId===f.id,'wrong saved lesson');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow');completed++;
 if(f.id==='attract-king'&&f.stage==='transfer')await page.screenshot({path:`output/playwright/knightly-adaptive-oct28/combination-${f.side}.png`,fullPage:true});
}
// Read a guide on the roadmap and follow one of its lesson links.
await page.goto(base+'/learn?lesson=isolated-pawn-blockade');await page.locator('[data-lesson="isolated-pawn-blockade"] .roadmap-start').waitFor();
await page.getByText('Explore Pawn chains, levers and weak squares',{exact:true}).click();
await page.getByText('Before moving on',{exact:true}).waitFor();
check((await page.locator('.roadmap-reason[open]').innerText()).includes('isolated'),'guide text absent');
await page.screenshot({path:'output/playwright/knightly-adaptive-oct28/area-guide-mobile.png',fullPage:true});
await page.locator('.roadmap-reason[open]').getByRole('link',{name:'Fix a pawn target',exact:true}).click();
await page.locator('[data-lesson="fix-pawn-weakness"] .roadmap-start').waitFor();
// Reading the area explanation while practicing is assistance, not an independent result.
await page.goto(base+'/learn/foundations?lesson=king-captures-checker&stage=transfer&color=white');await page.getByLabel('Practice move').waitFor();
await page.locator('.lesson-principle > summary').click();await page.getByText('Explore Checks and king safety',{exact:true}).click();
await page.getByText('Before moving on',{exact:true}).waitFor();
await page.locator('.lesson-principle > summary').click();
await page.getByLabel('Practice move').fill('Kxa1');await button('Try move').click();await page.getByText('You found it with support.',{exact:true}).waitFor();
// Phone and desktop chapter sizes come from the expanded curriculum.
await page.goto(base+'/learn');await page.locator('.roadmap-stops').waitFor();
for(const [name,count] of [['Basics',25],['Intermediate',33],['Advanced',34]]){
 await page.getByRole('button',{name:new RegExp('^'+name+' ')}).click();check(await page.locator('.roadmap-node').count()===count,'chapter count '+name);
}
for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'roadmap overflow '+width);await page.screenshot({path:`output/playwright/knightly-adaptive-oct28/roadmap-${width}.png`});}
await page.goto(base+'/study');await page.getByLabel('Search library').fill('Pawn chains, levers');await page.getByRole('link',{name:/Pawn chains, levers/}).first().click();await page.getByRole('link',{name:/Blockade an isolated pawn/}).waitFor();
check(!errors.length,errors.join('\n'));return{completed,representativeLessonsBothColors:true,completeLines:true,areaGuideNavigation:true,guideCountsAsSupport:true,unevenChapters:[25,33,34],errors};
};
