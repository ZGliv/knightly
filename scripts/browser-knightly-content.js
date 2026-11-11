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
      path: `output/playwright/knightly-expanded-oct27/${name}.png`,
      fullPage: true,
      caret: "initial",
    });
  };
  const fixtures = [
    ["claim-center", "e4", "d4"],
    ["develop-knight", "Nf3", "Nc3"],
    ["castle-king", "O-O", "O-O"],
    ["absolute-pin", "Bb5", "Re1"],
    ["skewer", "Re1+", "Bg6+"],
    ["double-check", "Bb5+", "Bg5+"],
    ["pawn-fork", "e4+", "b5+"],
    ["escape-square", "h3", "a3"],
    ["active-king", "Ke4", "Kb4"],
    ["blockade-passer", "Ra1", "Rf1"],
    ["knight-promotion", "e8=N+", "b8=N+"],
  ];
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto(base + "/study");
  await button("Use light theme").waitFor();
  await page.locator(".study-card").first().waitFor();
  check(
    (await page.locator(".study-card").count()) === 12,
    "initial catalog batch",
  );
  await button("Show 14 more studies").click();
  check(
    (await page.locator(".study-card").count()) === 26,
    "expanded catalog missing studies",
  );
  check(
    await page.evaluate(
      () => document.documentElement.dataset.theme === "dark",
    ),
    "fresh browser must default dark",
  );
  await button("Use light theme").click();
  await page.reload();
  await button("Use dark theme").waitFor();
  await button("Use dark theme").click();
  await page.reload();
  await button("Use light theme").waitFor();
  checks.push(
    "Dark default; explicit light and dark preferences survive reload",
  );
  for (const side of ["white", "black"]) {
    await page.setViewportSize({
      width: side === "white" ? 375 : 390,
      height: 844,
    });
    const reflect = (text) =>
      side === "white"
        ? text
        : text.replace(
            /[a-h][1-8]/g,
            (square) => square[0] + (9 - Number(square[1])),
          );
    for (const [id, guided, transfer] of fixtures) {
      await page.goto(base + `/learn/foundations?lesson=${id}&color=${side}`);
      for (const [stage, answer] of [
        ["guided", guided],
        ["transfer", transfer],
      ]) {
        await page.getByLabel("Practice move").waitFor();
        check(
          (await page.getByLabel("Practice side").inputValue()) === side,
          id + " lost side",
        );
        if (id === "pawn-fork" || id === "knight-promotion") {
          const from =
            id === "pawn-fork"
              ? stage === "guided"
                ? "e3"
                : "b4"
              : stage === "guided"
                ? "e7"
                : "b7";
          const to =
            id === "pawn-fork"
              ? stage === "guided"
                ? "e4"
                : "b5"
              : stage === "guided"
                ? "e8"
                : "b8";
          if (id === "knight-promotion") {
            await page.getByText("Board controls", { exact: true }).click();
            await page.getByLabel("Promotion piece").selectOption("n");
          }
          await page.locator(`[data-square="${reflect(from)}"]`).click();
          await page.locator(`[data-square="${reflect(to)}"]`).click();
        } else {
          await page.getByLabel("Practice move").fill(reflect(answer));
          await button("Try move").click();
        }
        await page
          .getByText("You solved this position without help.", { exact: true })
          .waitFor();
        if (id === "knight-promotion" && stage === "transfer")
          await shot(side + "-underpromotion");
        if (stage === "guided")
          await button("Try a different position").click();
      }
    }
    checks.push(
      `${side}: all eight new concepts and three converted starter concepts, guided → different position; tap moves and knight promotion`,
    );
  }
  const attempts = await page.evaluate(
    () => JSON.parse(localStorage.getItem("buddymine_practice_v1")).attempts,
  );
  check(attempts.length === 44, "missing curriculum attempts");
  check(
    attempts.every((attempt) => attempt.outcome === "independent"),
    "unassisted attempts misrecorded",
  );
  for (const fixture of [
    ["ruy-lopez", "white"],
    ["english-opening", "white"],
    ["reti-opening", "white"],
    ["four-knights", "white"],
    ["scandinavian-defense", "black"],
    ["pirc-defense", "black"],
    ["kings-indian", "black"],
    ["slav-defense", "black"],
    ["italian-game", "white"],
    ["queens-gambit", "white"],
    ["london-system", "white"],
    ["scotch-game", "white"],
    ["caro-kann", "black"],
    ["sicilian-defense", "black"],
    ["french-defense", "black"],
    ["queens-gambit-declined", "black"],
  ]) {
    const [id, side] = fixture;
    await page.goto(base + "/study/" + id);
    await page
      .getByLabel("Opening line", { exact: true })
      .selectOption({ index: 1 });
    const moves = (
      await page.locator(".opening-moves button").allTextContents()
    ).map((text) => text.replace(/^\d+\./, "").trim());
    check(moves.length >= 9, "variation not loaded");
    await button("Last position").click();
    await button("Recall this line").click();
    await page
      .getByLabel("Opening practice move")
      .fill(side === "white" ? "a3" : "a6");
    await button("Check move").click();
    await page.getByText(/is legal, but this example continues/).waitFor();
    await button("Reveal next move").click();
    for (
      let index = side === "white" ? 0 : 1;
      index < moves.length;
      index += 2
    ) {
      await page.getByLabel("Opening practice move").fill(moves[index]);
      await button("Check move").click();
    }
    await page
      .getByRole("heading", { name: "Line complete", exact: true })
      .waitFor();
    if (id === "ruy-lopez" || id === "kings-indian")
      await shot(id + "-variation-complete");
    await page.getByLabel("Opening line", { exact: true }).selectOption("main");
    await page
      .getByRole("heading", { name: "Start with the position", exact: true })
      .waitFor();
    check(
      (await page.getByLabel("Opening practice move").count()) === 0,
      "line change kept stale recall state",
    );
  }
  check(
    (
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("buddymine_practice_v1")).attempts,
      )
    ).length === 44,
    "opening recall was misrepresented as lesson success",
  );
  checks.push(
    "All sixteen alternate opening lines: explore, wrong legal move, hint, recall, reset when switching line; no false lesson progress",
  );
  await page.goto(base + "/study");
  await page.getByRole("button", { name: /^Openings/ }).click();
  await page.getByLabel("Opening color", { exact: true }).selectOption("Black");
  check((await page.locator(".study-card").count()) === 8, "Black filter");
  await page.getByLabel("Opening color", { exact: true }).selectOption("White");
  check((await page.locator(".study-card").count()) === 8, "White filter");
  await shot("opening-filter-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/study");
  await page.locator(".study-card").first().waitFor();
  await shot("expanded-library-desktop");
  check(!errors.length, errors.join("\n"));
  return { checks, errors, lessonAttempts: 44, openingVariations: 16 };
};
