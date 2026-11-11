/* eslint-disable @typescript-eslint/no-unused-expressions -- Isolated browser verification. */
async (page) => {
  const base = "http://localhost:3044";
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  const check = (value, message) => { if (!value) throw Error(message); };
  const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const button = name => page.getByRole("button", { name, exact: true });
  const stored = key => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const shot = async name => {
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + " overflow");
    await page.screenshot({path:`output/playwright/knightly-play-oct27/${name}.png`,fullPage:true,caret:"initial"});
  };
  const ready = () => page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).engine === "ready" && !JSON.parse(window.render_game_to_text()).busy);
  await page.addInitScript(() => { window.confirm = () => true; });
  await page.goto(base + "/play"); await page.evaluate(() => localStorage.clear()); await page.reload(); await ready();
  check(await page.locator("footer").count() === 0, "footer remains");
  check(await page.getByLabel("Move notation", {exact:true}).count() === 0, "move entry remains");
  const results = [];
  for (const color of ["white", "black"]) {
    await page.setViewportSize({width:color === "white" ? 375 : 390,height:844});
    await page.goto(base + "/play"); await ready();
    const elo = color === "white" ? "600" : "1600";
    await page.getByLabel("Opponent approximate Elo").selectOption(elo);
    await page.getByLabel("New game color").selectOption(color); await button("New game").click();
    await page.waitForFunction(side => {const s=JSON.parse(window.render_game_to_text());return s.playerColor===side && s.turn===side[0] && !s.busy}, color);
    let s = await state(); check(s.opponentElo===Number(elo), "new game lost Elo");
    const a8=await page.locator('[data-square="a8"]').boundingBox(),h1=await page.locator('[data-square="h1"]').boundingBox();
    check(color === "white" ? a8.y<h1.y&&a8.x<h1.x : a8.y>h1.y&&a8.x>h1.x, "orientation");
    check(await page.locator('[data-square] img[src*="/pieces/neo/"]').count() === 32, "Neo pieces missing");
    const desired = color === "white" ? "e2e4" : "e7e5";
    const move = s.legalUci.includes(desired) ? desired : s.legalUci[0];
    const before = s.ply;
    await page.locator(`[data-square="${move.slice(0,2)}"]`).tap(); await page.locator(`[data-square="${move.slice(2,4)}"]`).tap();
    await page.waitForFunction(ply=>{const s=JSON.parse(window.render_game_to_text());return s.ply===ply+2&&!s.busy},before);
    s=await state(); check(!s.error,"move failed");
    if (!s.coaching) await button("Show coaching").click();
    await button("Get a hint").click(); await button("Show the move").waitFor();
    check(await page.locator('.chessboard-frame svg path[marker-end]').count()===0,"hint arrow revealed early");
    check(await page.locator('.suggested-move').count()===0,"hint revealed answer early");
    await button("Show the move").click(); await page.locator('.suggested-move').waitFor();
    await page.locator('.chessboard-frame svg path[marker-end]').waitFor({state:'attached'});
    await button("Best line").click(); await page.locator('.engine-line').waitFor();
    check((await page.locator('.engine-line').innerText()).length>3,"empty best line");
    await button("Plan").click(); await page.locator('.chessboard-frame svg path[marker-end]').waitFor({state:"detached"}); check(await page.locator('.position-ideas li').count()>0,"plan empty");
    await button("Move analysis").click(); await button("Analyze move").click();
    await page.waitForFunction(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='Analyze move');return b&&!b.disabled});
    await shot(color + "-coaching");
    const raw = await page.evaluate(()=>localStorage.getItem("buddymine_games_v1"));
    await button("Starting position").click();
    check((await state()).viewedPly===0,"starting replay");
    await page.locator('[data-square="e2"]').click(); await page.locator('[data-square="e4"]').click();
    check((await state()).viewedPly===0,"history allowed play");
    await button("Next move").click(); check((await state()).viewedPly===1,"next replay");
    await button("Back to live").click(); check((await state()).live,"live restore");
    check(await page.evaluate(()=>localStorage.getItem("buddymine_games_v1"))===raw,"replay or coach mutated game");
    await button("Hide coaching").click(); await page.reload(); await ready();
    check(!(await state()).coaching,"toggle preference failed");
    check((await state()).opponentElo===Number(elo),"difficulty reload failed");
    await shot(color + "-play");
    results.push({color,elo:Number(elo),boardTap:true,engineReply:true,hints:true,bestLine:true,plan:true,moveAnalysis:true,replayUnchanged:true});
  }
  // A real PGN gives deterministic capture/replay assertions without changing any user storage.
  await page.goto(base+"/games");
  check(await page.getByRole('button',{name:/export|backup/i}).count()===0,"archive export remains");
  await page.getByText("Bring a game from PGN",{exact:true}).click();
  await page.getByLabel("PGN to import").fill('[Event "Capture QA"]\n\n1. e4 d5 2. exd5 Qxd5 3. Nc3 Qe6+ *');
  await page.getByLabel("Your side in imported game").selectOption("white");await button("Import PGN").click();await page.getByText(/PGN imported/).waitFor();
  const game=(await stored("buddymine_games_v1")).find(g=>g.pgn.includes("Capture QA"));
  const original=JSON.stringify(game);
  // Use the actual resume link in the imported row.
  const resume=page.getByRole('link',{name:'Resume',exact:true}); await resume.first().click(); await ready();
  check((await state()).gameId===game.id,"resumed wrong game");
  check(await page.getByLabel("Opponent approximate Elo").inputValue()==="legacy","legacy difficulty changed");
  check(JSON.stringify((await state()).captured)==='{"w":["p"],"b":["p"]}',"capture ledger");
  await button("2. exd5").click();
  check((await state()).material.w===1&&(await state()).material.b===-1,"material +/- wrong");
  await page.getByLabel("White captured 1 pawn. Material +1.",{exact:true}).waitFor();
  await shot("capture-history");
  await button("Back to live").click();check((await state()).material.w===0,"exchange balance wrong");
  check(JSON.stringify((await stored("buddymine_games_v1")).find(g=>g.id===game.id))===original,"legacy source changed by replay");
  await page.goto(base+`/review/${game.id}`);
  check(await page.getByRole('button',{name:/export|backup/i}).count()===0,"review export remains");
  check(await page.locator('[data-square] img[src*="/pieces/neo/"]').count()>0,"review pieces wrong");
  check(errors.length===0,errors.join('\n'));
  return {results,captures:true,material:true,legacyPreserved:true,exportsRemoved:true,errors};
}
