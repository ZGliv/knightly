# BuddyMine Chess Coach

**Understand your moves. Improve your game.**

A browser-first chess practice app. Play White against real Stockfish 18, save each move, return to an unfinished game, replay decisions, and move games between devices with PGN or JSON backups. No account, cloud database, AI API key, or paid service is required.

## Run

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`predev` and `prebuild` copy the pinned Stockfish 18.0.5 lite single-thread worker, WASM and GPL license from the installed package into `public/engine`. No runtime CDN or cross-origin isolation is needed. Production: `pnpm build && pnpm start`.

## Core loop

- Legal drag, tap and SAN/coordinate input; selectable promotion piece, castling, en passant, checkmate and draws through chess.js.
- Every move is stored before analysis. An interrupted Black turn can be continued after reload. Engine load/search errors fail within a bound and provide retry.
- Opponent skill 1–20 is independent of full-strength coaching. Each evaluation uses a 500 ms search; estimates may change with deeper searches and are not Elo or accuracy ratings.
- Game replay, per-White-move reanalysis, measured review coverage and suggestions grounded in search output. No invented strategic explanations or scores for unplayed phases.
- Autosaved library, PGN import/export and versioned JSON backup/import. Imports merge unknown IDs, never replace a same-ID local record. A previous browser snapshot and raw download support recovery; unreadable data is never silently replaced.
- Legacy local game histories are retained under `buddymine_games_v1`. Legacy prose is marked unverified. Old unauthenticated cloud endpoints return 410 and no service-role client exists.

## Privacy and limits

Game records stay in localStorage for this origin. Browser clearing, private browsing and device loss can erase them: use **Games → Export all games**. Running games can continue offline once the page/worker has loaded, but a fully offline reload/install is not implemented. Only White and standard starting positions are supported. Backups accept up to 1,000 games / 8 MB; individual PGNs up to 200 KB. Imported player/event names are preserved. A PGN is a move record, not a backup of coach annotations.

Local save conflicts are rejected if another tab updated the same game. The unsaved in-memory board remains exportable; reload to continue from the saved copy. This is a personal practice tool, not a multiplayer or tournament service. No human learner-outcome evaluation has been conducted.

## Verification

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm audit --prod
```

The Node suite tests legal history and results, special moves/draws, storage recovery, backup merging, analysis sign conventions and worker request/error handling. `scripts/browser-*.js` are Playwright CLI function payloads exercised against a local production build on port 3025; they are not a claim of live end-to-end deployment testing.

## Deployment

Use the existing `buddymine-chess-coach` Vercel project once created. No environment variables are required. Keep default deployment protection. `.vercelignore` excludes QA artifacts, historical SQL and local environment files. The original archived prototype remains untouched in its original directory.

See [STOCKFISH_NOTICE.md](STOCKFISH_NOTICE.md) for engine license and corresponding source.
