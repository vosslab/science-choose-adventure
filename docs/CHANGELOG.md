# Changelog

## 2026-06-16

### Additions and New Features

- Added the initial Science Career Survival static TypeScript game with five
  career paths, four stats, prologue routing, source-note unlocks, and
  swipe/button/keyboard input.
- Added typed content validation, deterministic engine tests, and a Playwright
  smoke test for the built browser game.
- Patch: Added project docset pages for install, architecture, file structure,
  file formats, troubleshooting, roadmap, todo, news, related projects, and
  release history.
- Added a Reigns-style drag mechanic: the card follows pointer (mouse and
  touch), tilts, lights the affected meters, flies off on commit, and springs
  back under the threshold.
- Added per-path color themes with motif lines, a deck-depth card stack,
  distinct teal (left) and rust (right) choice colors, and a self-demonstrating
  nudge on the first card.
- Added an always-visible run stability readout and a steady-zone legend so
  players can tell whether the run is going well.
- Added per-choice effect tags on the buttons (which pressures move and which
  direction, magnitude still hidden), plus hover, focus, and drag meter
  previews.

### Behavior or Interface Changes

- Replaced template README and usage docs with game-specific build, run, and
  testing instructions.
- Patch: Expanded the README with the science career survival premise, five
  launch paths, four Cs, mobile swipe support, keyboard support, and quick start
  commands.
- Patch: Rewrote the usage guide with the play loop, source-note and card
  authoring standards, local storage progression behavior, reset behavior, and
  build, serve, and test commands.
- Patch: Fixed desktop mouse text selection so dragging across question text no
  longer submits a left or right answer.
- Patch: Trimmed AGENTS.md into a short pointer file for repo rules and commands.
- Patch: Changed the four-C meters from coarse three-segment bands to 10-step
  visible meters while keeping exact engine values hidden.
- Replaced desktop text selection on the card with the drag mechanic; the card
  is now a non-selectable draggable surface.
- Tightened the mobile layout (compact four-across meters, smaller title,
  shorter card) so the card and colored answers stay near the top of the view.

### Fixes and Maintenance

- Fixed the drag answer banner overlapping the prompt by pinning it to the card
  top and dimming the prompt while a side is held; capped drag travel so the
  card stays on screen.

### Decisions and Failures

- Decided against SolidJS for the rewrite. The single-card UI re-renders
  cheaply, the appeal gap was animation and CSS rather than state management,
  and a Solid build step would work against the single-file export goal.

### Developer Tests and Notes

- The launch content is grounded in `data/science_career_paths/` drafts for
  Jennifer Doudna, Rosalind Franklin, Marie Curie, Alexander Fleming, and
  Katalin Kariko.
- Patch: Documented `data/science_career_paths/` as repo source material without
  presenting it as public documentation.
- Patch: Added a Playwright regression covering desktop text selection without
  accidental choice submission.
- Patch: Added Playwright coverage for the 10-step four-C meter display.
- Rewrote the desktop Playwright test: a plain card click does not choose, while
  a horizontal card drag does.

## 2026-06-15

### Additions and New Features

- Added `SCIENTIST_SIGNATURE` to `src/config.ts`: hand-authored 4C target vectors (0-100)
  for all five scientists (Doudna, Franklin, Curie, Fleming, Kariko), each paired with a
  per-stat rationale (why each C is high, medium, or low) grounded in `data/` drafts.
- Added `CORE_DECK` of 21 neutral career dilemmas to `src/content.ts`; each card carries a
  `probes` field tagging the stats the card is thematically about.
- Added `FLAVOR_POOL` of four scientist-keyed cards per scientist to `src/content.ts`;
  flavor prompts are rewritten to remove identifying nouns and pass the `LEAK_TERM_DENYLIST`.
- Added `SCIENTIST_SOURCE_NOTES` to `src/content.ts` for end-reveal unlocks.
- Added `EXTREME_BAND_TEXTURE` wording to `src/config.ts`; stat strain surfaces
  descriptive texture lines (not fail warnings) during the run.
- Added `RUN_LENGTH`, `FLAVOR_EVERY`, `FLAVOR_MIN_MARGIN`, and draw-weight constants
  to `src/config.ts`.
- Added `rankSignatures` and `matchExplanation` helpers in `src/engine.ts`: deterministic
  Euclidean distance ranking of all five signatures, and a plain-language explanation
  built from the most decisive stats.
- Added seeded RNG (mulberry32) carried in game state; `Math.random` is absent from
  `src/engine.ts` (enforced by test guard in `tests/test_engine_flow.mjs`).
- Added `LEAK_TERM_DENYLIST` to `src/content_validation.ts` to enforce that no core or
  flavor prompt contains scientist-identifying terms.
- Added v2 save format: `localStorage` key `science_career_survival:v2`, envelope
  `{ version: 2, state: GameState }`, where `GameState` is a `run | result` union.
- Added result reveal screen in `src/ui_renderer.ts`: "You most resemble {name}" headline,
  plain-language match explanation, per-C rationale, ordered name ranking (no raw
  distances), unlocked source notes, and Restart/Reset controls.
- Added strain texture lines rendered below the stat meters during the run phase.
- Moved `deploy-pages.yml` to `.github/workflows/deploy-pages.yml` so the GitHub
  Actions workflow runs on push to main.

### Behavior or Interface Changes

- Replaced the prologue + scientist-lock + 12-path-specific-card + win/lose-collapse
  machine with a single blind run of 12 questions drawn from the neutral `CORE_DECK`
  (plus occasional `FLAVOR_POOL` injections after an internal leader emerges) followed
  by a deterministic end-reveal.
- Stats now clamp to [0, 100] with no collapse: no stat reaching an extreme ends the
  run. Extreme-band strain is surface-only texture, not a fail path.
- Scientist identity is end-only: no scientist name or identifying term appears in any
  run-phase DOM element.
- Run progress eyebrow shows "Question k of 12" (neutral, no scientist hint).
- Flavor cards injected only after a hidden internal leader clears `FLAVOR_MIN_MARGIN`;
  injection frequency capped by `FLAVOR_EVERY` to limit convergence.

### Removals and Deprecations

- Removed `PROLOGUE_CARDS`, `SCIENTIST_PATHS`, and `GAME_CONTENT` from `src/content.ts`.
- Removed `LOW/HIGH_COLLAPSE_VALUE`, `ENDING_TYPES`, `ENDING_TYPE_LABELS`, and
  `ARC_BEATS` from `src/config.ts`.
- Removed `prologueChoice`, `pathChoice`, `chooseScientist`, `collapseReason`,
  `selectEndingType`, and `routeScores` from `src/engine.ts`.

### Decisions and Failures

- Decided to remove the early scientist lock entirely rather than bolt a resemblance
  screen onto the existing path machine. The rejected alternative kept `routeScores`
  and `chooseScientist` and just relabeled the ending, which leaves two parallel
  notions of "which scientist" and hides an up-front commitment the design explicitly
  wants gone.
- Decided that the result ranking shows ordered names plus a plain-language explanation;
  raw Euclidean distances are not shown to the player by default.
- Decided that old v1 saves start fresh (no migration); the in-game state has no
  user data worth preserving across a model change.

### Developer Tests and Notes

- Rewrote `tests/test_engine_flow.mjs`: seeded run reaches `result`; same seed +
  choices is byte-stable; divergence fixture confirms different choice patterns yield
  different matches; stats clamp test shows run continues past 0/100; `Math.random`
  guard asserts it is absent from `src/engine.ts` source text.
- Rewrote `tests/test_content_contracts.mjs`: calls new `validateContent()`, checks
  core-deck floor, probed-stat coverage, probe-subset-of-effects, flavor coverage,
  signature distinctness and rationale, leak-term denylist, and malformed-save fallback.
- Updated `tests/playwright/game_smoke.spec.ts`: blind-run loop for `RUN_LENGTH`
  answers; asserts no scientist name appears mid-run; asserts "You most resemble" and a
  scientist name appear only after the final answer.
