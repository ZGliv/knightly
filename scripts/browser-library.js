/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI function. */
async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const check = (v, m) => {
    if (!v) throw Error(m);
  };
  await page.goto("http://localhost:3025/games");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByText("Bring a game from PGN", { exact: true }).click();
  await page.getByLabel("PGN to import").fill("1. e5 *");
  await page.getByRole("button", { name: "Import PGN", exact: true }).click();
  await page.locator("main").getByRole("alert").waitFor();
  await page.getByLabel("PGN to import").fill("1. f3 e5 2. g4 Qh4# 0-1");
  await page.getByRole("button", { name: "Import PGN", exact: true }).click();
  await page
    .getByText("PGN imported. Open its replay to analyze individual moves.")
    .waitFor();
  await page
    .getByRole("link", { name: "Replay & review", exact: true })
    .click();
  await page.getByRole("button", { name: "1. f3", exact: true }).click();
  await page
    .getByRole("button", { name: "Analyze this move", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Analyze this move", exact: true })
    .waitFor();
  check(
    (await page.getByText(/short search estimates/).count()) > 0,
    "Imported move was not analyzed",
  );
  await page.reload();
  await page.getByRole("button", { name: "1. f3", exact: true }).click();
  check(
    (await page.getByText(/short search estimates/).count()) > 0,
    "Analysis was not saved",
  );
  await page.getByRole("button", { name: "Last", exact: true }).click();
  await page.waitForTimeout(250);
  check(
    (await page.getByText(/2… Qh4#/).count()) > 0,
    "Checkmate replay failed",
  );
  const pgnDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PGN", exact: true }).click();
  await (await pgnDownload).saveAs("output/overnight-mvp/exported-game.pgn");
  await page.getByRole("link", { name: "Back to library" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export all games", exact: true })
    .click();
  await (await downloadPromise).saveAs("output/overnight-mvp/game-backup.json");
  const backup = await page.evaluate(() =>
    localStorage.getItem("buddymine_games_v1"),
  );
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page
    .getByLabel("Import game backup")
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(backup),
    });
  await page
    .getByText("1 game imported. Existing games were preserved.")
    .waitFor();
  await page
    .getByLabel("Import game backup")
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(backup),
    });
  await page
    .getByText("0 games imported. Existing games were preserved.")
    .waitFor();
  await page.setViewportSize({ width: 375, height: 812 });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Library mobile overflow",
  );
  await page.screenshot({
    path: "output/overnight-mvp/library-375.png",
    fullPage: true,
  });
  return {
    checks:
      "illegal-PGN rejection/retry, checkmate import, selected-move real analysis, analysis reload, PGN/JSON downloads, portable backup import, duplicate merge, 375 layout",
    errors,
  };
};
