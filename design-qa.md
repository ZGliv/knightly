# Knightly lesson trail — design QA, October 28

final result: passed

Approved direction: the first illustrated winding roadmap, refined to Play / Learn / Study. Existing curriculum, progress rules, board identity and game evidence remain authoritative.

Compared the selected rendered mock with the working 390px screen side by side. Inspected 320px and 1440px screenshots separately, plus light-theme and keyboard/reduced-motion states. Evidence: output/playwright/knightly-roadmap/{local-final,final-layout}/ and comparison-1.png, comparison-2.png.

Resolved P2 issues: wrapped header action; excessive mobile header/chapter spacing; landscape starting below the visible area; an oversized active board; desktop landscape placement and card density. Recaptured after corrections. No open P0/P1/P2 findings.

The implementation intentionally uses legal square 8×8 diagrams, actual lesson instructions, actual completion states and the existing theme control. It does not reproduce the generated mock's distorted board or illustrative progress. Landscape/path are generated raster assets; buttons, focus states and chapter selectors are real accessible controls. Completion requires an unassisted different-position solve. All chapters remain open.

Visual craft: coherent charcoal/olive landscape, consistent lime actions and readable foregrounds. Task clarity: one expanded stop and primary lesson action. Useful depth: 48 concepts, recommendations, guided and transfer positions, source-game links and separate searchable Study catalog. Distinctiveness: the selected chess trail rather than a generic dashboard. Interaction: chapter selection, keyboard activation, reload, both player colors and responsive overflow checks pass.

Browser tests cover White and Black guided → transfer → persisted completion, legacy links, all 48 stops, recurring-game recommendations, notes/bookmarks, opening recall, and game-data preservation. Viewports: 320, 390, 768, 1440px; game-learning regressions also cover 375px. Phone testing is browser emulation, not physical-device testing. No page or console errors in completed local checks.

## Lesson continuation — October 28

final result: passed

Extended the approved trail world into guided lessons and different-position practice using the same landscape asset, charcoal panels, lime progress markers and familiar board. Compared running before/after screens at 320/390/768/1440px. Removed redundant pre-board navigation from lesson routes; phase/side choices remain in Options. Clear two-step progress, objective, turn state, highlighted successful move, hint/retry feedback and a focused completion panel replace the notebook layout. Desktop board width is bounded; mobile result scrolling exposes the next action, and new positions reset to the top. Motion respects reduced-motion settings.

Actual touch tests cover White and Black wrong moves, supported solves, independent transfer, walkthrough, explanation-as-help, return-to-roadmap completion, options and light-theme shell. Existing actual-game and adaptive browser regressions pass; 83 unit tests, lint and production build pass. Screenshots and results: output/playwright/knightly-lessons/. No new data schema, content claims or progression rules. Existing keyboard notation remains as a secondary control. Native mobile devices were not tested.

## Practice variety — October 28

Existing lesson and roadmap layout retained. Added position-aware selection behind the same controls; the existing “Try a different position” action is also available after a transfer result. Inspected White/Black mobile results and exercised all 360 transfer/color combinations. Existing roadmap checks passed 320/390/768/1440px, keyboard navigation and legacy links. No layout/style changes. Per-position history is additive; the original transfer board keeps a stable identity. New tactical setups include mirrored pattern practice rather than claiming every board is an unrelated concept. Evidence: output/playwright/knightly-practice-rotation/.

## Follow-through practice — October 28

No CSS, asset, navigation or layout changes. Reused turn status for move X of Y and board caption for the played line. Reviewed mobile completion screenshot: approved roadmap background, board proportions, typography and existing actions retained. Checks at 375/390px, plus a 320px result state, show no horizontal overflow. Replies are authored sample continuations; they are not engine-selected or exhaustive. Full line, wrong move, step hint, walkthrough, reload and side-switch flows exercised in an isolated browser.

## October 28 — alternate opponent replies

Each of the eight follow-through positions has two authored reply lines (16 lines / 32 color-specific versions). The original line remains; alternate replies change the next decision in opposition, the central exchange and creating another king exit with tempo, while other variations ask the learner to confirm the same tactic still works. Central-break line-2 requires three learner moves. Replies are authored examples, not engine-selected best defenses or exhaustive branching play. No CSS, assets or layout changes.

Selection within the chosen board favors unseen lines, then the least recently attempted line, sharing history across White and Black. It freezes at mount; a reload with unchanged history restarts the same selected line. Optional lineId preserves version-1 attempts, treating prior multi-move records as line-1 and leaving older single-move records unchanged. Hints, walkthroughs, explanations and move counts use the selected line. Independent course evidence is retained per board and line; difficulty with another reply does not erase it. Lesson-level scheduling and board rotation remain unchanged.

111 tests, lint, TypeScript/build and whitespace pass. New tests verify both-color legality, canonical SAN, actual captures and protection, distinct replies, unseen/least-recent selection, legacy/future data and line identity/length validation. Browser checks cover all 32 line/color versions, step-specific hints, wrong remembered answers, walkthroughs, reload stability, touch underpromotion, preserved progress and actual-game regression. Evidence: output/playwright/knightly-replies/.

## Curriculum depth expansion

Retained the selected landscape, boards, type, colors and lesson arrangement. Topic guides reuse existing roadmap/lesson disclosures, keeping Start lesson as the primary action. New guide links return to the selected roadmap lesson; reading a guide during transfer is assistance. No CSS/assets changed. Reviewed phone roadmap and Black three-move combination render; tested 320/390/1440px widths and 375/390px lesson flows without overflow. React checklist reviewed: static content, stable IDs, native keyboard-operable disclosures, no new fetch waterfall or effects, no added dependencies.

## Full endgame lines

Kept the approved landscape, board, colors, type, layout and controls. Long lines reuse the current turn counter, move history, step hints and completion panel. Reviewed Lucena promotion and Philidor draw results as White and Black on phone widths; the 12-move triangulation walkthrough wraps at 320px without horizontal overflow. File-name prompts now follow mirrored boards and rank descriptions use the learner’s side. No CSS/assets changed. Fresh desktop and hosted checks are included in the release evidence under output/playwright/knightly-endgames/.

React review: the only lesson-view change is truthful static caption copy for lines with/without reply variants. Stable exercise identity, canceled pending replies and existing effects remain intact. New content and prerequisites are static; no dependency, client fetch or additional timer. Unit tests cover full chess outcomes and saved-history behavior; browser tests cover actual touch moves, promotions, late support and persistence.

## Study shelves — October 29

Polished the existing Study library using the focused Impeccable workflow. Direct project context and the running site were used after the skill context launcher could not execute. The connected in-app browser also failed at startup; one isolated reusable browser handled all QA without touching user storage. No new broad aesthetic workflow or concept round: this was refinement of the approved dark chess identity.

Compared the live mixed catalog with the implemented Openings/Middlegames/Endgames shelves at 1440 and 390px. Smaller real board previews and horizontal mobile cards make more studies visible; all phase/topic controls fit at 320px. Removed the extra navigation row on Study, kept search/saved/practice controls, and made Learning path a quieter secondary link. The desktop sidebar remains familiar; the shelf headings give it a clearer organization. Reviewed the 320/390/768/1440px renders, light and dark themes, selected bookmarks, filtered results, collection return and both-color opening recall. Existing Play/Learn identity is retained.

React review: one static card component serves both shelves and filtered results; all entry IDs remain stable. Browse state is one object and changes the address only during an interaction, avoiding a URL-writing mount effect. Returning from a study validates known query fields and stays within /study. No new fetch, dependency, storage key, theme or motion effect. Browser Back verification waits for the detail navigation to finish; side-filter verification inspects study cards rather than hidden select options. Evidence: output/playwright/knightly-study-polish/.

## October 29 — Play finish and phone fit / Study controls

Preserved the approved visual identity. Reviewed the new result dialog and Play at phone widths (375×667, 390×760, 430×932), a 320×568 scrolling fallback, and desktop 1440×1000 in dark/light themes. The board, player status, replay controls and recent move strip share the initial phone viewport at the tested standard sizes. The short fallback preserves a usable board and permits page scrolling. These are emulated browser viewports, not physical iPhone Safari checks. Coaching and optional summaries expand below the core game surface.

Exercised White/Black player checkmates, actual Stockfish-delivered checkmate, Black rematch/opening response, resignation, played threefold repetition, review navigation, Escape/close, modal focus containment, move replay, opening alternate-example recall and bookmark persistence. The native dialog supplies modal background inertness; browser-chrome Tab focus is permitted and is not a background-app focus leak. Verified another saved game’s PGN, moves, final position and timestamp remain unchanged. Existing storage normalization can change JSON property order, so preservation checks compare the data fields rather than string key order. A preliminary inspector screenshot caused a caret-style hydration warning; normal screenshots use caret:initial and completed runs have no console/page errors.

Evidence: output/playwright/knightly-play-finish/. Local and hosted results and screenshots are recorded there; release identity is recorded in the main Knightly plan.

## October 29 — Maia lower-difficulty play

No layout or theme redesign. Verified the existing phone Play surface with the Maia opponent label, explicit initial model-loading message, preserved move history/captures and unchanged coaching controls. The rating note identifies Lichess model conditioning rather than a verified Chess.com match rating. Stockfish remains named in coaching and historical results; Maia's learned probabilities are never displayed as engine centipawn evaluations. Evidence: output/playwright/knightly-human/. All device-size checks are emulated Chromium, not physical iPhone Safari tests.

## October 29 — Maia at every difficulty

Kept the existing layout and styling. Mobile White 1600 and Black 2400 flows exercise Maia replies, board orientation, move history and the separate Stockfish best-line control. Reviewed the hosted Black 2400 screenshot: the opponent identity, board, material balance and recent moves retain the compact phone composition. Old skill-only games display an explicit 800 resume default rather than inventing a skill-to-Elo mapping. Finished historical Stockfish records keep their identity. Device checks use emulated Chromium, not physical iPhone Safari. Evidence: output/playwright/knightly-all-levels/. Release status and exact checks are recorded in the Knightly plan.
