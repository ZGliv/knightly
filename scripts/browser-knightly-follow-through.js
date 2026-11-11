/* eslint-disable @typescript-eslint/no-unused-expressions -- Browser verification. */
async page => {
  const base='http://localhost:3050', errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  const check=(v,m)=>{if(!v)throw Error(m)};
  const button=name=>page.getByRole('button',{name,exact:true});
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('buddymine_practice_v1')||'{"attempts":[]}').attempts);
  const lines={
    'knight-fork':[['Ne6+','Nxf8+'],['Ne3+','Nxf1+']],
    'pawn-fork':[['b5+','bxa6'],['b4+','bxa3']],
    skewer:[['Bg6+','Bxe8'],['Bg3+','Bxe1']],
    'knight-promotion':[['b8=N+','Nxa6'],['b1=N+','Nxa3']],
    'central-break':[['d4','Nxd4'],['d5','Nxd5']],
    'escape-square':[['a3','Ka2'],['a6','Ka7']],
    'rook-support':[['Rb2','b6','b7'],['Rb7','b3','b2']],
    opposition:[['Kc3','Kd3'],['Kc6','Kd6']],
  };
  await page.goto(base+'/learn');await page.evaluate(()=>localStorage.clear());
  let completed=0;
  for(const [id,colors] of Object.entries(lines))for(const [sideIndex,side] of ['white','black'].entries()){
    await page.setViewportSize({width:side==='white'?375:390,height:844});
    await page.evaluate(()=>localStorage.removeItem('buddymine_practice_v1'));
    await page.goto(`${base}/learn/foundations?lesson=${id}&stage=transfer&color=${side}`);
    await page.getByLabel('Practice move').waitFor();
    for(const [i,move] of colors[sideIndex].entries()){
      if(id==='knight-promotion'&&i===0){
        await page.getByText('Board controls',{exact:true}).click();
        await page.getByLabel('Promotion piece').selectOption('n');
        await page.locator(`[data-square="${side==='white'?'b7':'b2'}"]`).tap();
        await page.locator(`[data-square="${side==='white'?'b8':'b1'}"]`).tap();
      }else{await page.getByLabel('Practice move').fill(move);await button('Try move').click();}

      if(i<colors[sideIndex].length-1){
        check((await read()).length===0,id+' saved before follow-through');
        await page.getByText(`Your move ${i+2} of ${colors[sideIndex].length}`,{exact:true}).waitFor();
      }
    }
    await page.getByText('You solved this position without help.',{exact:true}).waitFor();
    const attempts=await read();check(attempts.length===1&&attempts[0].movesCompleted===colors[sideIndex].length&&attempts[0].movesRequired===colors[sideIndex].length,id+' incorrect completion');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow');completed++;
    if(id==='rook-support')await page.screenshot({path:`output/playwright/knightly-adaptive-oct28/follow-through-${side}.png`,fullPage:true});
    await button('Try a different position').click();await page.getByLabel('Practice move').waitFor();
    check(await page.getByText('Your turn',{exact:true}).count()===1,'next board not reset');
  }
  // Wrong second moves stay on the current board. A later hint applies to that step.
  await page.evaluate(()=>localStorage.removeItem('buddymine_practice_v1'));
  await page.goto(base+'/learn/foundations?lesson=knight-fork&stage=transfer&color=white');
  await page.locator('[data-square="d4"]').tap();await page.locator('[data-square="e6"]').tap();
  await page.getByText('Your move 2 of 2',{exact:true}).waitFor();
  await page.getByLabel('Practice move').fill('Nc5+');await button('Try move').click();
  check((await read()).length===0,'wrong move saved success');
  await button('Give me a hint').click();check((await page.locator('.lesson-hint').innerText()).includes('f8'),'wrong step hint');
  await page.locator('[data-square="e6"]').tap();await page.locator('[data-square="f8"]').tap();
  await page.getByText('You found it with support.',{exact:true}).waitFor();
  check((await read())[0].misses===1,'miss not retained');
  // Partial work never turns into an independent completion on reload or walkthrough.
  await page.evaluate(()=>localStorage.removeItem('buddymine_practice_v1'));
  await page.goto(base+'/learn/foundations?lesson=rook-support&stage=transfer&color=black');
  await page.getByLabel('Practice move').fill('Rb7');await button('Try move').click();
  await page.getByText('Your move 2 of 3',{exact:true}).waitFor();await page.reload();
  await page.getByText('Your move 1 of 3',{exact:true}).waitFor();check((await read()).length===0,'reload counted partial line');
  await page.getByLabel('Practice move').fill('Rb7');await button('Try move').click();await page.getByText('Your move 2 of 3',{exact:true}).waitFor();
  await button('Show me how').click();await page.getByText('An idea to revisit.',{exact:true}).waitFor();
  check((await read())[0].outcome==='not-yet'&&(await read())[0].movesCompleted===1,'walkthrough completed line');
  check((await page.locator('.lesson-board-caption').innerText()).includes('b2'),'walkthrough missing final move');
  // Changing side while a reply is pending must cancel the old reply.
  await page.evaluate(()=>localStorage.removeItem('buddymine_practice_v1'));
  await page.goto(base+'/learn/foundations?lesson=rook-support&stage=transfer&color=white');
  await page.getByLabel('Lesson options').click();
  await page.getByLabel('Practice move').fill('Rb2');await button('Try move').click();
  await page.getByLabel('Practice side').selectOption('black');
  await page.getByText('Your move 1 of 3',{exact:true}).waitFor();
  await page.waitForTimeout(800);check((await page.locator('.lesson-turn').innerText()).includes('Black'),'stale reply changed side');
  check((await read()).length===0,'side change saved partial line');
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'output/playwright/knightly-adaptive-oct28/follow-through-desktop.png',fullPage:true});
  await button('Set aside').click();check((await read())[0].movesCompleted===0,'set aside completion');
  await page.setViewportSize({width:320,height:740});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320px overflow');
  await page.screenshot({path:'output/playwright/knightly-adaptive-oct28/follow-through-320.png',fullPage:true});
  check(!errors.length,errors.join('\n'));
  return {completed,whiteBlack:true,lateHint:true,lateWrongMove:true,touchFollowThrough:true,reloadRestartsUnfinished:true,walkthroughNotYet:true,sideChangeCancelsReply:true,errors};
};
