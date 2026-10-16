/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI evaluates this function expression. */
async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("http://localhost:3025/play");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      JSON.parse(window.render_game_to_text()).engine === "ready",
  );
  const state = () =>
    page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const check = (v, m) => {
    if (!v) throw Error(m);
  };
  await page.locator('[data-square="e2"]').click();
  await page.locator('[data-square="e5"]').click();
  check((await state()).ply === 0, "Illegal tap changed board");
  await page.locator('[data-square="e2"]').click();
  await page.locator('[data-square="e4"]').click();
  await page.waitForFunction(
    () =>
      JSON.parse(window.render_game_to_text()).ply === 2 &&
      !JSON.parse(window.render_game_to_text()).busy,
    { timeout: 30000 },
  );
  const first = await state();
  check(first.turn === "w" && first.saved, "Engine did not reply/save");
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem("buddymine_games_v1"))[0],
  );
  check(
    stored.moves[0].coachText && Number.isFinite(stored.moves[0].cpLoss),
    "No real engine feedback",
  );
  await page.reload();
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      JSON.parse(window.render_game_to_text()).ply === 2,
  );
  check((await state()).fen === first.fen, "Reload changed position");
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).engine === "ready",
  );
  const legal = (await state()).legalMoves[0];
  await page.getByLabel("Move notation").fill(legal);
  await page.getByRole("button", { name: "Play move", exact: true }).click();
  await page.waitForFunction(
    () =>
      JSON.parse(window.render_game_to_text()).ply === 4 &&
      !JSON.parse(window.render_game_to_text()).busy,
    { timeout: 30000 },
  );
  await page.waitForTimeout(250);
  await page.screenshot({
    path: "output/overnight-mvp/play-1440.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Play mobile overflow",
  );
  await page.waitForTimeout(250);
  await page.screenshot({
    path: "output/overnight-mvp/play-375.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Review game", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  check(
    await page.getByText("1. e4 · 1 / 4 plies").isVisible(),
    "Replay failed",
  );
  await page.getByRole("button", { name: "Last", exact: true }).click();
  check(await page.getByText(/4 \/ 4 plies/).isVisible(), "Replay last failed");
  await page.getByRole("button", { name: "First", exact: true }).click();
  check(
    await page.getByText(/Starting position/).isVisible(),
    "Replay reset failed",
  );
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Review mobile overflow",
  );
  await page.waitForTimeout(250);
  await page.screenshot({
    path: "output/overnight-mvp/review-375.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: "output/overnight-mvp/review-1440.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Back to library" }).click();
  await page.getByRole("link", { name: "Resume", exact: true }).click();
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      JSON.parse(window.render_game_to_text()).ply === 4,
  );
  return {
    checks:
      "legal tap, real engine, saved/reloaded board, notation, 375/1440 layouts, replay, resume",
    first,
    errors,
  };
};
