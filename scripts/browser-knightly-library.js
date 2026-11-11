/* eslint-disable @typescript-eslint/no-unused-expressions -- CLI browser verification function. */
async (page) => {
  const base = "http://localhost:3044",
    errors = [],
    checks = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const shot = async (name) => {
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      name + " overflow",
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `output/playwright/knightly-redesign-oct27/${name}.png`,
      fullPage: true,
      caret: "initial",
    });
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/study");
  await button("Browse library").click();
  await page.getByLabel("Search library").fill("sicilian");
  check(
    (await page.locator(".study-card").count()) === 1,
    "Search did not isolate opening",
  );
  if (await button("Save Sicilian Defense").count())
    await button("Save Sicilian Defense").click();
  await page.getByRole("button", { name: /^Saved/ }).click();
  check(
    (await page.locator(".study-card").count()) === 1,
    "Saved view did not filter",
  );
  await page.reload();
  await page.getByRole("button", { name: /^Saved/ }).click();
  await page
    .getByRole("heading", { name: "Sicilian Defense", exact: true })
    .waitFor();
  await button("Browse library").click();
  await page.getByLabel("Search library").fill("");
  await page.getByRole("button", { name: /^Openings/ }).click();
  check(
    (await page.locator(".study-card").count()) === 30,
    "Opening topic count",
  );
  await button("List view").click();
  check(
    (await page.locator(".catalog-list").count()) === 1,
    "List view missing",
  );
  await shot("library-openings-list-desktop");
  await button("Grid view").click();
  await page.getByRole("button", { name: /^All topics/ }).click();
  await shot("library-desktop");
  await page.setViewportSize({ width: 375, height: 812 });
  await shot("library-mobile");
  await page.goto(base + "/study/opening-essentials");
  await page
    .getByRole("heading", { name: "Opening essentials", exact: true })
    .waitFor();
  check(
    (await page.locator(".collection-lessons li").count()) === 4,
    "Collection lessons missing",
  );
  await page
    .getByLabel("Your study notes")
    .fill("Develop the knight before moving the queen again.");
  await button("Save note").click();
  await page.getByText("Note saved in this browser.", { exact: true }).waitFor();
  await page.reload();
  await page.waitForFunction(() =>
    document
      .querySelector('[aria-label="Your study notes"]')
      ?.value.includes("Develop the knight"),
  );
  await shot("collection-mobile");
  checks.push(
    "Search, topic filters, list/grid, bookmark reload, real lesson links, note reload",
  );
  for (const fixture of [
    {
      id: "italian-game",
      moves: ["e4", "Nf3", "Bc4", "c3", "d3", "O-O"],
      side: "white",
    },
    { id: "caro-kann", moves: ["c6", "d5", "Bf5", "e6", "Nd7"], side: "black" },
  ]) {
    await page.goto(base + "/study/" + fixture.id);
    await button("Next position").waitFor();
    await button("Next position").click();
    await page
      .getByRole("button", { name: "e4", exact: false })
      .first()
      .waitFor();
    await button("Last position").click();
    await shot(fixture.side + "-opening-explore-mobile");
    await button("Recall this line").click();
    await page.getByLabel("Opening practice move").waitFor();
    const a8 = await page.locator('[data-square="a8"]').boundingBox(),
      h1 = await page.locator('[data-square="h1"]').boundingBox();
    check(
      fixture.side === "white"
        ? a8.x < h1.x && a8.y < h1.y
        : a8.x > h1.x && a8.y > h1.y,
      "Opening orientation",
    );
    await button("Flip board").click();
    await button("Flip board").click();
    for (const move of fixture.moves) {
      await page.getByLabel("Opening practice move").fill(move);
      await button("Check move").click();
    }
    await page
      .getByRole("heading", { name: "Line complete", exact: true })
      .waitFor();
    await shot(fixture.side + "-opening-recall-mobile");
    checks.push(fixture.side + " opening explore/recall, flip board");
  }
  await page.goto(base + "/study");
  if (await button("Use dark theme").count()) await button("Use dark theme").click();
  await shot("library-dark-mobile");
  await page.reload();
  await button("Use light theme").waitFor();
  await button("Use light theme").click();
  await button("Browse library").click();
  await page.getByLabel("Search library").fill("no such topic");
  await page.getByRole("heading", { name: "No matching studies" }).waitFor();
  await button("Browse all studies").click();
  await page.goto(base + "/games");
  await page.getByLabel("Search saved games").fill("no such game");
  await page
    .getByRole("heading", { name: /No matching games|No games saved yet/ })
    .waitFor();
  await shot("archive-mobile");
  await page.goto(base + "/play");
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      JSON.parse(window.render_game_to_text()).engine === "ready",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await shot("play-desktop");
  await page.setViewportSize({ width: 375, height: 812 });
  await shot("play-mobile");
  check(!errors.length, errors.join("\n"));
  await page.evaluate(
    (result) => {
      window.__libraryQA = result;
    },
    { checks, errors },
  );
  return { checks, errors };
};
