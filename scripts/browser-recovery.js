/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI function. */
async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const check = (v, m) => {
    if (!v) throw Error(m);
  };
  const state = () =>
    page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await page.goto("http://localhost:3025/play");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      JSON.parse(window.render_game_to_text()).engine === "ready",
  );
  await page.getByLabel("Move notation").fill("e4");
  await page.getByRole("button", { name: "Play move", exact: true }).click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).ply === 1,
  );
  await page.reload();
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      JSON.parse(window.render_game_to_text()).engine === "ready",
  );
  check((await state()).ply === 1, "Pending player move lost on reload");
  await page.getByRole("button", { name: "Continue engine turn" }).click();
  await page.waitForFunction(
    () =>
      JSON.parse(window.render_game_to_text()).ply === 2 &&
      !JSON.parse(window.render_game_to_text()).busy,
  );
  const savedFen = (await state()).fen;
  await page.route("**/engine/stockfish-18-lite-single.js", (r) => r.abort());
  await page.reload();
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      JSON.parse(window.render_game_to_text()).engine === "error",
  );
  check(
    (await state()).fen === savedFen,
    "Engine load error changed saved board",
  );
  await page.unroute("**/engine/stockfish-18-lite-single.js");
  await page.getByRole("button", { name: "Retry engine" }).click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).engine === "ready",
  );
  check((await state()).fen === savedFen, "Engine retry changed board");
  // A concurrent tab's newer record must survive a move from this stale tab.
  await page.evaluate(() => {
    const g = JSON.parse(localStorage.getItem("buddymine_games_v1"));
    g[0].updatedAt = "2099-01-01T00:00:00.000Z";
    localStorage.setItem("buddymine_games_v1", JSON.stringify(g));
  });
  const legal = (await state()).legalMoves[0];
  await page.getByLabel("Move notation").fill(legal);
  await page.getByRole("button", { name: "Play move", exact: true }).click();
  await page.waitForFunction(
    () => !JSON.parse(window.render_game_to_text()).saved,
  );
  check(
    (await page.evaluate(
      () => JSON.parse(localStorage.getItem("buddymine_games_v1"))[0].fenFinal,
    )) === savedFen,
    "Stale tab overwrote newer game",
  );
  check(!(await state()).busy, "Stale-save failure still launched engine");
  await page.reload();
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      JSON.parse(window.render_game_to_text()).engine === "ready",
  );
  // The running engine remains usable without a network; no external AI request is needed.
  await page.context().setOffline(true);
  await page.getByLabel("Move notation").fill((await state()).legalMoves[0]);
  await page.getByRole("button", { name: "Play move", exact: true }).click();
  await page.waitForFunction(
    () =>
      JSON.parse(window.render_game_to_text()).ply === 4 &&
      !JSON.parse(window.render_game_to_text()).busy,
  );
  await page.context().setOffline(false);
  check((await state()).saved, "Offline in-page play did not save");
  return {
    checks:
      "interrupted-move reload/resume, blocked-worker error/retry, concurrent-write preservation, in-page offline real-engine play",
    errors,
  };
};
