/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI function. */
async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const check = (v, m) => {
    if (!v) throw Error(m);
  };
  async function importAndResume(pgn) {
    await page.goto("http://localhost:3025/games");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByText("Bring a game from PGN", { exact: true }).click();
    await page.getByLabel("PGN to import").fill(pgn);
    await page.getByRole("button", { name: "Import PGN", exact: true }).click();
    await page.getByRole("link", { name: "Resume", exact: true }).click();
    await page.waitForFunction(
      () =>
        window.render_game_to_text &&
        JSON.parse(window.render_game_to_text()).engine === "ready",
    );
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await importAndResume("1. a4 h5 2. a5 h4 3. a6 h3 4. axb7 hxg2 *");
  await page.getByLabel("Promotion piece").selectOption("n");
  await page.locator('[data-square="b7"]').click();
  await page.locator('[data-square="a8"]').click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).ply >= 9,
  );
  check(
    (await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("buddymine_games_v1"))[0].moves[8].san,
    )) === "bxa8=N",
    "Mobile underpromotion failed",
  );
  await page.waitForFunction(
    () => !JSON.parse(window.render_game_to_text()).busy,
  );
  await importAndResume("1. e4 a6 2. e5 d5 *");
  await page.locator('[data-square="e5"]').click();
  await page.locator('[data-square="d6"]').click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).ply >= 5,
  );
  check(
    (await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("buddymine_games_v1"))[0].moves[4].san,
    )) === "exd6",
    "En passant failed",
  );
  await page.waitForFunction(
    () => !JSON.parse(window.render_game_to_text()).busy,
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await importAndResume("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *");
  const from = await page.locator('[data-square="e1"]').boundingBox();
  const to = await page.locator('[data-square="g1"]').boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).ply >= 7,
  );
  check(
    (await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("buddymine_games_v1"))[0].moves[6].san,
    )) === "O-O",
    "Drag castling failed",
  );
  await page.waitForFunction(
    () => !JSON.parse(window.render_game_to_text()).busy,
  );
  await page.screenshot({
    path: "output/overnight-mvp/castling-1440.png",
    fullPage: true,
  });
  await page.goto("http://localhost:3025/");
  await page.screenshot({
    path: "output/overnight-mvp/home-1440.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Home mobile overflow",
  );
  await page.screenshot({
    path: "output/overnight-mvp/home-375.png",
    fullPage: true,
  });
  return {
    checks:
      "mobile tap underpromotion, en passant, desktop drag castling, home 375/1440",
    errors,
  };
};
