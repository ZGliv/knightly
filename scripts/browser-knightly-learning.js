/* eslint-disable @typescript-eslint/no-unused-expressions -- CLI browser verification function. */
async (page) => {
  const base = "http://localhost:3044";
  const errors = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => { window.confirm = () => true; });
  const check = (value, message) => { if (!value) throw new Error(message); };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const stored = (key) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
  const oriented = async (color) => {
    const a8 = await page.locator('[data-square="a8"]').boundingBox();
    const h1 = await page.locator('[data-square="h1"]').boundingBox();
    check(color === "white" ? a8.x < h1.x && a8.y < h1.y : a8.x > h1.x && a8.y > h1.y, `${color} orientation`);
  };
  const phone = async (name) => {
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} overflow`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `output/playwright/knightly-redesign-oct27/${name}.png`, fullPage: true, caret: "initial" });
  };
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(base + "/study"); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.getByRole("heading", { name: "Study", exact: true }).waitFor();
  const results = [];
  for (const color of ["white", "black"]) {
    await page.setViewportSize({ width: color === "white" ? 375 : 390, height: 844 });
    await page.goto(base + "/play");
    await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).engine === "ready");
    await page.getByLabel("New game color").selectOption(color); await button("New game").click();
    await page.waitForFunction((side) => { const s = JSON.parse(window.render_game_to_text()); return s.playerColor === side && s.turn === side[0] && !s.busy; }, color);
    await oriented(color);
    const state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const desired = color === "white" ? "e2e4" : "e7e5";
    const move = state.legalUci.includes(desired) ? desired : state.legalUci[0];
    await page.locator(`[data-square="${move.slice(0, 2)}"]`).click();
    await page.locator(`[data-square="${move.slice(2, 4)}"]`).click();
    await page.waitForFunction((ply) => { const s = JSON.parse(window.render_game_to_text()); return s.ply === ply + 2 && !s.busy; }, state.ply);
    await phone(`${color}-live-play`);
    await page.goto(base + "/games"); await page.getByText("Bring a game from PGN", { exact: true }).click();
    const pgn = color === "white" ? '[Event "White learning QA"]\n\n1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxe5+ Nxe5 *' : '[Event "Black learning QA"]\n\n1. f3 e5 2. g4 Nf6 3. e4 *';
    await page.getByLabel("PGN to import").fill(pgn); await page.getByLabel("Your side in imported game").selectOption(color); await button("Import PGN").click();
    await page.getByText(/PGN imported/).waitFor();
    const game = (await stored("buddymine_games_v1")).find((g) => g.pgn.includes(color === "white" ? "White learning QA" : "Black learning QA"));
    const original = JSON.stringify(game);
    await page.goto(base + `/learn?game=${game.id}`);
    const count = color === "white" ? 4 : 2;
    const scan = button(`Scan ${count} decisions`); await scan.waitFor();
    await page.waitForFunction((name) => [...document.querySelectorAll("button")].some((b) => b.textContent === name && !b.disabled), `Scan ${count} decisions`);
    await scan.click(); await page.getByText(`${count} of ${count} decisions checked · 0 still available`).waitFor({ timeout: 30000 });
    await page.getByRole("heading", { name: "Patterns worth practicing" }).waitFor();
    const ply = color === "white" ? 7 : 4;
    const analysis = (await stored("buddymine_game_coach_v1")).analyses.find((a) => a.source.gameId === game.id && a.source.ply === ply);
    check(analysis.teachable && analysis.source.playerColor === color, "wrong source analysis");
    await page.goto(base + `/learn?game=${game.id}&ply=${ply}`);
    await page.getByLabel("Your retry move").waitFor({ timeout: 30000 }); await oriented(color);
    await page.getByLabel("Your retry move").fill(color === "white" ? "Qxe5+" : "Nf6"); await button("Check move").click();
    await page.getByText(/The board is reset so you can try another move/).waitFor({ timeout: 30000 });
    await button("A small hint").click(); await page.getByLabel("Your retry move").fill(color === "white" ? "Qxf7#" : "Qh4#"); await button("Check move").click();
    await page.getByRole("heading", { name: "What changes on the board?" }).waitFor();
    check((await stored("buddymine_game_coach_v1")).attempts.at(-1).outcome === "supported", "retry lost support");
    await phone(`${color}-game-feedback`);
    await page.getByRole("link", { name: "Study this idea", exact: true }).first().click();
    await page.getByLabel("Practice move").waitFor(); await oriented(color);
    check(await page.getByLabel("Practice side").inputValue() === color, "bridge lost player side");
    // Both immediate mates lead to mating-net teaching, including the capturing mate.
    await button("Give me a hint").click();
    await page.getByLabel("Practice move").fill(color === "white" ? "Rb8#" : "Rb1#"); await button("Try move").click();
    await page.getByText("You found it with support.", { exact: true }).waitFor();
    await button("Try a different position").click();
    await page.getByLabel("Practice move").waitFor(); await oriented(color);
    check(await page.getByText(/Hint 1 of 2/).count() === 0, "transfer hints not reset");
    await phone(`${color}-different-position`);
    await page.getByLabel("Practice move").fill(color === "white" ? "Qb7#" : "Qg2#"); await button("Try move").click();
    await page.getByText("You solved this position without help.", { exact: true }).waitFor();
    const attempts = (await stored("buddymine_practice_v1")).attempts;
    check(attempts.at(-2).stage === "guided" && attempts.at(-2).outcome === "supported", "guided result missing");
    check(attempts.at(-1).stage === "transfer" && attempts.at(-1).outcome === "independent" && attempts.at(-1).playerColor === color, "different position result missing");
    await page.getByRole("link", { name: "My practice", exact: true }).click();
    await page.getByText(/Different position: Solved independently/).first().waitFor(); await page.reload();
    await page.getByText(/Different position: Solved independently/).first().waitFor(); await phone(`${color}-study-progress`);
    check(JSON.stringify((await stored("buddymine_games_v1")).find((g) => g.id === game.id)) === original, "source game mutated");
    await page.goto(base + `/review/${game.id}`); await page.getByRole("button", { name: color === "white" ? "4. Qxe5+" : "2… Nf6", exact: true }).click(); await oriented(color);
    await page.getByRole("link", { name: "Retry this decision", exact: true }).click(); await page.getByLabel("Your retry move").waitFor({ timeout: 30000 });
    results.push({ color, source: game.id, retry: "supported", differentPosition: "independent", savedGameUnchanged: true });
  }
  check(errors.length === 0, errors.join("\n"));
  await page.evaluate((result) => { window.__knightlyQA = result; }, { results, errors });
  console.log(JSON.stringify({ results, errors }));
  return { results, errors };
}
