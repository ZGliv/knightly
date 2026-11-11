/* eslint-disable @typescript-eslint/no-unused-expressions -- Isolated browser fault-injection payload. */
async (page) => {
  const base = "http://localhost:3038";
  await page.goto(base + "/games");
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.getByText("Bring a game from PGN", {exact:true}).click();
  await page.getByLabel("PGN to import").fill("1. e4 e5 2. Ba6 bxa6 *");
  await page.getByRole("button",{name:"Import PGN",exact:true}).click();
  await page.getByText(/PGN imported/).waitFor();
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem("buddymine_games_v1"))[0].id);
  await page.addInitScript(() => {
    const RealWorker = window.Worker;
    window.Worker = class extends RealWorker {
      searches = 0;
      postMessage(message, ...rest) {
        if (typeof message === "string" && message.startsWith("go ")) this.searches++;
        return super.postMessage(message, ...rest);
      }
      set onmessage(handler) {
        super.onmessage = (event) => {
          let data = event.data;
          if (this.searches === 3 && typeof data === "string" && data.startsWith("info ") && /score (cp|mate) -?\d+/.test(data)) {
            data = data.replace(/score (cp|mate) -?\d+/, "score mate 2");
          }
          handler(new MessageEvent("message", { data }));
        };
      }
    };
  });
  const url = base + `/learn?game=${id}&ply=3`;
  await page.goto(url);
  await page.getByLabel("Your retry move").waitFor({timeout:30000});
  const best = await page.evaluate(() => JSON.parse(localStorage.getItem("buddymine_game_coach_v1")).analyses[0].bestUci);
  await page.getByLabel("Your retry move").fill(best);
  await page.getByRole("button",{name:"Check move",exact:true}).click();
  await page.getByText(/this attempt is ungraded/).waitFor({timeout:30000});
  const attempts = await page.evaluate(() => JSON.parse(localStorage.getItem("buddymine_game_coach_v1")).attempts.length);
  if (attempts) throw Error("Ungraded disagreement wrote an outcome");
  await page.getByRole("button",{name:"Retry coach engine",exact:true}).click();
  await page.getByLabel("Your retry move").waitFor({timeout:30000});
  if (await page.getByText(/this attempt is ungraded/).count()) throw Error("Uncertainty did not clear on restart");
  await page.route("**/engine/stockfish-18-lite-single.js", (route) => route.abort());
  await page.goto(url);
  await page.getByRole("button",{name:"Retry coach engine",exact:true}).waitFor({timeout:25000});
  await page.unroute("**/engine/stockfish-18-lite-single.js");
  await page.getByRole("button",{name:"Retry coach engine",exact:true}).click();
  await page.getByLabel("Your retry move").waitFor({timeout:30000});
  return {checks:"Injected conflicting mate: no grade, visible recheck, reset clears uncertainty. Blocked worker load: visible error and successful restart.",attempts};
}
