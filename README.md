# Knightly

Live: https://play-knightly.vercel.app . This is the sole public app address.

**Play a game. Study an idea. Make your next move count.**

A browser-first chess practice app. Play White or Black against real Stockfish 18, save each move, return to an unfinished game, replay decisions, and import games from PGN. No account, cloud database, AI API key, or paid service is required.

## Three places to go

- **Play**: both-color Stockfish games with Chess.com’s Neo pieces and green board, tap/drag moves, captured pieces, material balance, replayable history, optional coaching and approximate Elo difficulty.
- **Learn**: an illustrated lesson trail through Basics, Intermediate and Advanced, using real independent-practice progress and recommendations from your games. All chapters remain open.
- **Study**: a searchable library of 92 concepts in 36 collections and 24 openings with 48 example lines. Each concept has a guided decision and one or more transfer positions, in either color; 60 established concepts retain three rotating boards. Progress counts distinct ideas, uses the latest independent/supported/not-yet attempt, and never claims mastery. A Basics → Intermediate → Advanced course stays fully accessible.

The renamed app keeps every `buddymine_*` browser key and the legacy `BuddyMine` JSON backup discriminator. No migration or data rewrite is needed. `/learn`, `/learn/foundations`, `/games` and review links remain valid; `/` opens Play. Historical PGN headers stay unchanged. Export and backup controls were removed at the user’s request; internal previous-snapshot preservation and legacy parsers remain. Coach feedback remains deterministic and grounded in engine/legal-move evidence; no conversational AI or taunting persona is implied.

## Run

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`predev` and `prebuild` copy the pinned Stockfish 18.0.5 lite single-thread worker, WASM and GPL license from the installed package into `public/engine`. No runtime CDN or cross-origin isolation is needed. Production: `pnpm build && pnpm start`.

## Core loop

- Legal drag and tap in Play; notation remains available in lesson exercises. Selectable promotion piece, castling, en passant, checkmate and draws through chess.js.
- Every move is stored before analysis. An interrupted engine turn can be continued after reload. Engine load/search errors fail within a bound and provide retry.
- Approximate opponent Elo presets run from 400 to 2400. At every opponent level, the separate Maia-3 5M worker samples a learned human-move policy conditioned on the selected Lichess rating, with real position history and legal-move masking. It does not add random blunders or rerank with Stockfish. Stockfish is reserved for hints, analysis and review. These are not certified match or Chess.com ratings. The first human-model load transfers about 34 MB of same-origin assets; inference runs locally. Model errors stop the opponent turn with retry support, without a stronger-engine fallback. Legacy saves retain their original skill metadata; skill-only games resume with Maia at an explicitly shown 800 rather than inventing an Elo conversion. Full-strength coaching resets the worker strength on every request. Each evaluation uses a 500 ms search; estimates may change with deeper searches and are not Elo or accuracy ratings.
- Game replay, per-player-move reanalysis, measured review coverage and suggestions grounded in search output. No invented strategic explanations or scores for unplayed phases.
- Autosaved library and PGN import. Export and backup UI is removed. A previous browser snapshot remains available for recovery; unreadable data is never silently replaced.
- Legacy local game histories are retained under `buddymine_games_v1`. Legacy prose is marked unverified. Old unauthenticated cloud endpoints return 410 and no service-role client exists.

## Coaching from your games

**Learn → Practice from your games** reconstructs exact before-move positions from your saved games and imported PGNs. The main product loop is game → bounded Stockfish scan → original decision → another legal move → engine-checked feedback → next recommendation. The foundation path has 92 concepts. Game feedback links to relevant authored sequences; immediate mates take priority over generic capture labels.

- Up to 12 player decisions per scan, newest first, within a stable window of 200 decisions across the ten latest games. Scanning has progress and cancellation; completed decisions are preserved. No source game is modified.
- Each candidate is freshly rechecked before practice. A drop of at least 1.00 in the search evaluation or a lost/allowed mating line can become a retry. The engine's own preferred original move is never flagged due to numerical disagreement.
- Retries accept alternative legal moves within 0.50 of the reference estimate. Following the engine's preferred move is accepted for ordinary numerical search disagreement; conflicting mate evidence stays ungraded with a reachable recheck action. Forced mate and terminal results are handled separately.
- Full UCI move history is passed to Stockfish, and the legal board is replayed for repetition, draws and terminal checks. Search budgets remain 500 ms with existing worker timeouts; stale asynchronous results are ignored and cancellation terminates the worker.
- Feedback names concrete legal consequences (for example, a knight capturing your queen) from the searched move. Original and engine lines can be stepped through on the board. This does not invent strategic explanations or claim a searched line is forced unless mate is reported.
- Retry evidence links game ID, ply, exact before-FEN, original move, attempted move, assistance, outcome and evaluation. New decisions are preferred; after support, a different decision in the same observable context receives priority. Supported/unresolved positions return after 15 minutes. Independent replays return after 1, 3 and 7 days as successes are spaced at least a day apart. Same-day repetitions do not increase the interval; older retained evidence is not discarded. These are product scheduling rules, not validated memory or ability models.

**Both player colors.** New games choose White or Black; Black starts with an automatic White engine move. PGN import explicitly confirms your side with header names shown. Library side correction changes coaching ownership without changing the legal game. Legacy records without color default to White; explicit Black backups are preserved. Cached coach evaluations remain absolute White scores for compatibility, while loss and UI scores are relative to your selected side. Old coach evidence defaults White and does not leak into Black decisions. The separate `buddymine_game_coach_v1` store retains the latest 200 analyses / 500 attempts. Corrupt data is preserved, and new practice can continue in memory.

A rough local playing-level estimate comes from completed unassisted results against known, unchanged engine settings. It is not calibrated to a human rating pool. No mastery, causal weakness or validated ZPD is inferred. Observable contexts group responses to check, captures, checking moves and other choices; they are not cognitive diagnoses. Repeating a known answer is not fresh transfer evidence. Wider curriculum and durable cross-device coaching history remain future work.

Source protocol reference: [Stockfish UCI documentation](https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html).

## Optional foundation exercises

Open **Study** for 92 concepts across openings, middlegames and endgames. Teaching sequences cover fundamentals, tactical patterns, check escapes, exchanges and endgame techniques. Each has an explanation, guided decision and a separate board for independent practice. All positions support either color. Tap, drag or enter notation; ask for two progressively stronger hints, show a worked solution, or set a position aside. Attempts distinguish independent success, success with hints/retries, and not yet. Revealing an answer never counts as independent success.

Practice guidance uses the latest five attempts within 14 days. Two distinct independent solves in a phase unlock its further step; a supported or not-yet result returns to foundations. Repeated solves of one position cannot unlock a step alone. These are guided practice outcomes, not mastery, Elo, or a validated zone-of-proximal-development estimate. The prompts still name a goal; separate-position success is modest evidence, not mastery. Broader decision trees and a larger bank of unfamiliar positions remain future work. Study prioritizes due revisits and preserves the latest practice side and source-game link.

The optional Play coaching panel offers a piece-first hint, a reveal, a legal best line, position-based planning checks and selected-move analysis with a practice link. Learn uses analyzed player moves from the last ten saved games to suggest a phase, requiring at least three analyzed moves in that phase. Short-search evaluation drops and move/material phase heuristics suggest a starting point; they do not identify why a mistake happened. General study positions are not claimed to match a particular game mistake.

The latest 500 completed or set-aside practice attempts are stored separately under `buddymine_practice_v1`. Corrupt history is preserved; storage failure falls back to the current session. Optional stage, player-color and source-game fields preserve legacy attempts while distinguishing guided decisions from different-position practice. An unfinished exercise is not resumed after reload. Existing games remain untouched when learning.

## Privacy and limits

Game records stay in localStorage for this origin. Browser clearing, private browsing and device loss can erase them. Export/backup controls have been removed; cross-device sync is not implemented. Running games can continue offline once the page/worker has loaded, but a fully offline reload/install is not implemented. Both colors are supported from the standard starting position. The library holds up to 1,000 games; individual PGN imports accept up to 200 KB. Imported player/event names are preserved. A PGN is a move record, not a backup of coach annotations.

Local save conflicts are rejected if another tab updated the same game. The unsaved in-memory board remains visible until reload; reload to continue from the saved copy. This is a personal practice tool, not a multiplayer or tournament service. No human learner-outcome evaluation has been conducted.

## Verification

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm audit --prod
```

The 74-test Node suite covers legal histories/results, both player colors, legacy migrations, special moves/draws, storage recovery, backup merging, side-relative score/mate conventions, and worker request/error handling. `scripts/browser-*.js` are Playwright CLI function payloads. The original game flows use port 3025; `browser-learning.js` covers the optional foundations on port 3037. `browser-game-coach.js` exercises imported PGN → real Stockfish scan → exact retry → assistance → source-linked persistence, cancellation and corrupt-data preservation on port 3038. `browser-both-colors.js` verifies actual Black play, White play regression, explicit PGN player confirmation, Black scan/retry/mate, persistence and review. `browser-color-correction.js` verifies ownership changes and Black tap-to-move. `browser-coach-faults.js` injects contradictory mate evidence and blocks worker loading to check ungraded/retry recovery; they are not a claim of live end-to-end deployment testing.

## Deployment

Use the existing `buddymine-chess-coach` Vercel project (`prj_C4TCrvaizDmqzyy6KQ1XWcAo9HCF`) and production origin `https://play-knightly.vercel.app`. No environment variables are required. Keep default deployment protection. `.vercelignore` excludes QA artifacts, historical SQL and local environment files. The original archived prototype remains untouched in its original directory.

See [STOCKFISH_NOTICE.md](STOCKFISH_NOTICE.md) for engine license and corresponding source.

## Brand assets

The original vector master is `public/brand/knightly.svg`. Run `node scripts/generate-icons.mjs` to regenerate the SVG favicon, multi-size ICO, opaque 180px Safari touch icon and 192/512px manifest icons. The home-screen tile leaves safe padding for platform masks. Metadata and `/manifest.webmanifest` use the existing origin and `/play` entry point; this adds home-screen presentation, not offline caching or cross-device storage.

## Interface and library

Primary navigation is Play / Learn / Study. Play is the game board, Learn is the illustrated roadmap, and Study is a reference library organized into Openings, Middlegames and Endgames. The first view shows three selected studies per area; topic filters, search and Browse all expose all 36 collections and 24 opening studies. `/study?view=practice` shows lesson history and scheduled revisits. `/study/[collection]` opens a collection or opening explorer. Search, topic, side, layout and view are carried in the URL so reload, browser Back and the Library return link preserve browsing context.

Compact mobile board previews keep each study readable without filling the screen. All topic filters are visible; phase filters include relevant collections even when their original category differs. Collection difficulty labels derive from the actual Learn chapters. Game practice and Your games remain available from My practice.

Opening explorers provide authored legal examples with per-move notes, board flipping, arrow-key navigation, and a recall mode for either side. Recall checks the authored line, not engine quality or mastery. Existing guided and transfer practice still uses the original grading and persistence model. Bookmarks (`knightly_library_saved_v1`), study notes (`knightly_library_notes_v1`) and theme (`knightly_theme_v1`) are separate additive browser stores.

Verification scripts: `scripts/browser-knightly-learning.js`, `scripts/browser-knightly-library.js`, and `scripts/browser-knightly-archive.js`. They are isolated QA-browser scripts and may clear that browser's test-origin storage. Evidence lives under `output/playwright/knightly-redesign-oct27/` and `knightly-redesign-hosted-oct27/`.

### Dark theme and expanded library (October 27)

Knightly now defaults to a charcoal dark theme with green boards; an explicit saved light preference still wins. The approved Play / Learn / Study navigation and all legacy game, learning and review URLs and storage keys are preserved.

The library contains 92 concepts in 36 collections. All 92 concepts have an explanation, guided decision, hints and transfer practice; 60 retain three transfer boards and 32 newer concepts have one (304 exercise slots, 608 color-specific versions). New topics include pins, skewers, double check, pawn forks, escape squares, king activity, pawn blockades and knight underpromotion. These are authored, goal-directed decisions, not proof of mastery or a complete course.

Twenty-four opening studies cover twelve White and twelve Black choices, with two explained example lines each. The explorer supports line selection, legal move playback, recall, hints, board flipping, notes and bookmarks. Line recall is separate from independent lesson success. Search and opening-color filters cover the entire catalog; the initial browse view shows nine selected studies in three phase shelves with explicit controls to browse each topic or the entire catalog.

Static diagram FENs are precomputed to avoid replaying moves while loading the library. `tests/library.test.ts` checks the cached covers against actual chess.js replay. `tests/expanded-content.test.ts` verifies tactical consequences in addition to legality. `scripts/browser-knightly-content.js` exercises every alternate opening and the expanded curriculum on phone widths in an isolated test browser. It complements the full real-game flow in `scripts/browser-knightly-learning.js`.

### Play controls and familiar board (October 27)

All interactive boards and library diagrams use the locally served Chess.com Neo pieces, with sources recorded in `public/pieces/neo/sources.json`. The green board uses #769656 and #eeeed2. Piece/source attribution and Stockfish license/source links are on `/about`; the footer is removed.

Captured pieces are derived from legal move history; material balance is calculated from the pieces currently on the displayed board (pawn 1, knight/bishop 3, rook 5, queen 9). Promotions and en passant are included correctly. History replay changes only the displayed board. Return to Live to play.

`knightly_coaching_v1` stores the optional coaching toggle. Hints start with a piece; the exact move is revealed only on request. Planning suggestions are simple board checks, not a personalized strategic diagnosis. Best lines and move analysis use full-strength 500 ms engine searches. The optional `engineElo` game field is additive; old games and routes remain usable.

Current Play verification: `scripts/browser-knightly-play.js` covers both mobile colors, board taps/replies, approximate difficulty persistence, hidden/revealed hints, best line, plan, selected-move analysis, captured pieces, material changes, replay without changing saves, and removal of export/footer/notation controls. `browser-knightly-learning.js` now uses board taps for live play. Older historical scripts that expect removed export or move-entry controls describe earlier releases.

## Automatic level and course order (October 28)

Auto starts at 800 and adjusts the next game in steps of at most 50 from eligible results. Current games keep their difficulty; manual presets remain available. Imported/legacy games, coaching-assisted games, games with changed difficulty, duplicate histories and short non-mating games do not move the estimate. Additive `training` provenance on new engine games and separate `knightly_training_v1` / `knightly_assisted_games_v1` stores preserve older saves. The displayed range is a heuristic training guide, not a confidence interval.

Study combines validated own-move annotations and matching scanned analyses to select concrete board patterns. Recurrence needs at least two different positions in two games. It recommends prerequisites where appropriate, deprioritizes recently solved transfer exercises, and retains later revisits. The 92-concept path has 25 Basics, 33 Intermediate and 34 Advanced lessons, 304 guided/transfer slots and 608 color versions, alongside 24 opening studies with 48 example lines. Independent transfer drives progress; hints and repeated guided answers do not.

Practice now records a stable position ID. Old transfer attempts refer to the original board. Unseen boards come before recent repeats; due supported positions return for a revisit. Some tactical positions use reflected pattern geometry, while opening positions use different legal move orders. Practice mixes single decisions and complete authored lines; it does not certify exhaustive mastery.

Selected transfer positions now continue through two or three learner moves with authored opponent replies: knight fork, pawn fork, skewer, knight promotion, central break, escape square, rook support and opposition. Hints are specific to each decision; success requires the whole line. Unfinished lines restart on reload without recording success. Existing single-move history stays readable and is not relabeled as a completed line.

All eight follow-through positions now offer two opponent variations. Unseen replies come first, then least-recently attempted lines. Line identity is saved additively; hints and explanations follow the actual reply, and earlier independent progress is preserved when another variation needs help.

Learn now has 92 lessons in uneven chapters (25 Basics / 33 Intermediate / 34 Advanced), 12 area guides, and 304 guided/transfer exercise slots. Twenty concepts offer multi-move practice. The six newest endgame lessons add 16 complete guided/transfer lines (32 color-specific versions), each with 6–12 learner moves. Topic guides connect explanations, mistakes to watch for, readiness questions and further study; they do not claim exhaustive coverage or validated mastery. Existing storage and route IDs remain.

## Full endgame techniques

Lucena and Philidor include alternate rook/king replies, with the learner playing through promotion, a claimable repetition or removal of the pawn. Longer rook and queen conversions finish at checkmate. Key-square and triangulation exercises continue to promotion. All six lessons have complete guided lines, file-reflected transfer boards and both-color support. These are selected, goal-directed continuations, not unrestricted engine play or every possible defense. Each step has its own goal and hints; a late retry or hint still counts as support for the whole line. Unfinished work never records a solve.

All 16 new guided/transfer lines were checked at every ply against the Lichess Syzygy service; the offline outcome fixture supports regression tests. Theory references: [Lucena](https://www.chess.com/terms/lucena-position-chess), [Philidor](https://www.chess.com/terms/philidor-position-chess), and [triangulation study](https://lichess.org/study/R7hPVakb/Zw3ASx71). Instructional explanations are original. No tablebase network dependency is added to the app.


Maia implementation: `public/engine/maia/` is an independent AGPL-licensed browser engine with source and reproducible export instructions in `source.zip`. It uses pinned Maia-3 5M weights, a fixed-shape full-precision ONNX policy export, and ONNX Runtime Web 1.24.3 (MIT). `lib/engine/maia-client.ts` supplies legal moves and verifies all responses. Stockfish remains responsible for numeric analysis. New training records carry `policy: maia3-5m-v2`. Previous Maia results still count; previous Stockfish results remain saved but do not calibrate Maia. Resumed Stockfish games are marked changed after a successful Maia reply and excluded from rating estimates. Historical v1 records above 1320 remain labeled Stockfish.
