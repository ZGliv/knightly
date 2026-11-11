/* eslint-disable @typescript-eslint/no-unused-expressions -- CLI browser verification function. */
async(page)=>{
  const errors=[];page.on("pageerror",error=>errors.push(error.message));const check=(v,m)=>{if(!v)throw Error(m);};
  const button=name=>page.getByRole("button",{name,exact:true});
  await page.addInitScript(()=>{window.confirm=()=>true;});await page.goto("http://localhost:3044/games");
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.getByText("Bring a game from PGN",{exact:true}).click();
  await page.getByLabel("PGN to import").fill('[Event "Archive finished"]\n\n1. f3 e5 2. g4 Qh4# 0-1');await page.getByLabel("Your side in imported game").selectOption("white");await button("Import PGN").click();await page.getByText(/PGN imported/).waitFor();
  await page.getByLabel("PGN to import").fill('[Event "Archive active"]\n\n1. e4 e5 2. Nf3 Nc6 *');await page.getByLabel("Your side in imported game").selectOption("black");await button("Import PGN").click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem("buddymine_games_v1")).length===2);
  const original=await page.evaluate(()=>localStorage.getItem("buddymine_games_v1"));
  await button("Finished").click();check(await page.locator(".archive-game").count()===1,"Finished filter");check(await page.locator(".archive-result").textContent()==="Loss0-1","Learner result perspective");
  await button("In progress").click();check(await page.locator(".archive-game").count()===1,"Active filter");await button("All games").click();
  await page.getByLabel("Search saved games").fill("Archive finished");check(await page.locator(".archive-game").count()===1,"PGN header search");await page.getByLabel("Search saved games").fill("");
  await page.getByLabel("Sort games").selectOption("oldest");check((await page.locator(".archive-result").first().textContent()).includes("Loss"),"Oldest sort");
  await page.getByLabel("Sort games").selectOption("newest");check((await page.locator(".archive-result").first().textContent()).includes("In progress"),"Newest sort");
  await page.getByText("Backup & recovery",{exact:true}).click();const download=page.waitForEvent("download");await button("Export all games").click();await(await download).saveAs("output/playwright/knightly-redesign-oct27/archive-backup.json");
  await page.getByLabel("Import game backup").setInputFiles({name:"broken.json",mimeType:"application/json",buffer:Buffer.from("{broken")});await page.getByRole("alert").waitFor();
  check(await page.evaluate(()=>localStorage.getItem("buddymine_games_v1"))===original,"Malformed import changed games");
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:"output/playwright/knightly-redesign-oct27/archive-populated-desktop.png",fullPage:true,caret:"initial"});
  await page.setViewportSize({width:375,height:812});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"Archive overflow");await page.screenshot({path:"output/playwright/knightly-redesign-oct27/archive-populated-mobile.png",fullPage:true,caret:"initial"});
  check(!errors.length,errors.join("\n"));await page.evaluate(result=>{window.__archiveQA=result;},{checks:"finished/active filters, White result perspective, search, oldest/newest sort, backup download, malformed import atomicity, phone overflow",errors});return {errors,savedGames:2};
}
