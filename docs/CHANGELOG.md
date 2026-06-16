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

- Restored the dead choice-effect pipeline so the Reigns-style meter glow fires
  again. The run `VisibleCard` in `src/engine.ts` now carries a direction-only
  `choiceEffects: [left, right]` (new `ChoiceEffectView` type, magnitude
  dropped), sourced from the same `drawNextCard(state)` draw that `runChoice()`
  commits, so the previewed glow always matches the applied effect.
  `currentChoicesWithEffects()` in `src/ui_renderer.ts` now fills each
  `ChoiceView.effects` from `choiceEffects` instead of `[]`, so
  `effectsToData()` encodes real `stat:direction` strings into
  `card.dataset.left`/`right` (drag glow via `parseSideEffects`) and
  `previewEffects` lights meters on hover/focus. Dropped the now-unused
  `renderEffectTags` and its on-button text so the run layout is unchanged
  (still magnitude hint only, no per-stat tag text). The glow exposes only stat
  up/down, never scientist identity.
- Fixed the drag answer banner overlapping the prompt by pinning it to the card
  top and dimming the prompt while a side is held; capped drag travel so the
  card stays on screen.
- Tightened card vertical padding and gap in `src/style.css` so the card hugs
  its text content; reduced `.card` padding and `.card__body` gap to keep the
  prompt, choice buttons, and rationale compact on all viewports.
- Removed dead `|| entry.band === "high"` arm from `isStrainArray` in
  `src/storage.ts`; `StrainLine` declares `band: "low"` and `strainLines()`
  only emits "low", so high-band strain no longer exists in the model. Updated
  the surrounding comment to state that the guard accepts well-shaped low-band
  strain entries and that high-band strain is not a valid save value.
- Patch: Removed orphaned `.card__title` CSS rule (no emitter in src); changed
  `font-weight: 850` to `font-weight: 900` in `.card__edge` and
  `.choice-button__label` (850 is out of the valid CSS range and browsers
  clamp it); collapsed `margin: 0 0 0 0` to `margin: 0` in `.rationale__reason`.
- Removed module-level mutable `let coreCardCounter` from `src/content.ts`;
  `coreCard()` now takes an explicit `n: number` (1-based) first parameter and
  each of the 21 call sites passes its literal index. Generated ids are
  unchanged (core_1..core_21). Eliminates non-deterministic re-import risk.
- Renamed `PROLOGUE_THEME` to `NEUTRAL_THEME` in `src/config.ts` and updated
  the importer in `src/ui_renderer.ts`; changed the `motif` value from
  "Sorting the career route" to "Your choices reveal the shape of a career" to
  suit the blind-run phase where no sorting is implied.
- Removed `export` from `LOW_BAD_STEP` and `LOW_WARN_STEP` in `src/config.ts`;
  both constants are only used inside `lowRisk()` in the same file and were
  never imported elsewhere.
- Deleted the module-level `STAT_ORDER` constant from `src/ui_renderer.ts`
  (duplicate of `STAT_IDS` from config.ts); replaced its single use in
  `renderStats()` with `STAT_IDS` directly.

### Decisions and Failures

- Decided against SolidJS for the rewrite. The single-card UI re-renders
  cheaply, the appeal gap was animation and CSS rather than state management,
  and a Solid build step would work against the single-file export goal.

### Developer Tests and Notes

- Added five comment-only edits to `src/engine.ts` (no logic changes): clarified
  the mulberry32 bit-mix steps, the matchExplanation graft, the weightedPick
  caller-guard note, the choose() result-phase defensive-fallback comment, and the
  StrainLine band field note (band is always "low" in the current model).
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
- Pruned 8 per-field content-contract tests from `tests/test_content_contracts.mjs`
  that were subsumed by the `validateContent()` integration check; the 5 remaining
  tests cover the full contract surface without redundant field-level assertions.

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
- Reworked the four-C meters to an asymmetric color model matching the no-lose design:
  steps 1-2 red (low/bad), steps 3-4 amber (getting low), steps 5-10 neutral-to-good
  (high reads as a strength, never a warning). Previously high values were flagged amber
  like a failure.
- Replaced the single "Care help" glossary toggle with hover tooltips (title + aria-label)
  on all four stat meters, each defining its stat.
- Strain/low-pressure texture now surfaces only for stats running low; high stats never
  trigger the texture.

### Fixes and Maintenance

- Fixed excess run-phase whitespace: the card now sizes to its content instead of
  reserving a tall fixed-height box with vertically centered short content; removed the
  forced card min-height and the centering void.
- Added intent comments to parseSideEffects, inner drag closures (clearGlow,
  setGlow, setEdgeOpacity, resetCardVisuals, finishDrag), and event listener
  blocks in src/input_controller.ts.
- Added commit-closure intent comment in src/main.ts.

### Removals and Deprecations

- Removed `PROLOGUE_CARDS`, `SCIENTIST_PATHS`, and `GAME_CONTENT` from `src/content.ts`.
- Removed `LOW/HIGH_COLLAPSE_VALUE`, `ENDING_TYPES`, `ENDING_TYPE_LABELS`, and
  `ARC_BEATS` from `src/config.ts`.
- Removed `prologueChoice`, `pathChoice`, `chooseScientist`, `collapseReason`,
  `selectEndingType`, and `routeScores` from `src/engine.ts`.
- Removed the stability warning banner and its "about to break the run" / "drifting
  toward an edge" wording; removed the legend's "too high"/"ends the run" language;
  all were collapse-era artifacts inconsistent with the no-lose model.
- Removed `DANGER_THRESHOLD_HIGH` and the high-band `EXTREME_BAND_TEXTURE` entries;
  `LOW_PRESSURE_TEXTURE` replaces them (low-only).

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
- Adopted the principle that low is the only concerning direction for all four Cs while
  high is positive, per user direction and the "fix the design, not the symptom" core
  philosophy; the danger subsystem was removed rather than recolored.

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
- Replaced hardcoded count literals in game_smoke.spec.ts with constants from
  src/config: `.stat__meter` uses `STAT_IDS.length`, ranking items use
  `SCIENTIST_IDS.length`.
- Added Playwright assertion that `.stat__segment` count equals
  `STAT_IDS.length * STAT_STEP_COUNT` (covers the 4x10 meter-segment criterion).
- Doc fixes: updated low-only strain wording in docs, added meter-color and tooltip
  notes, rewrote NEWS entries in past tense, updated FILE_FORMATS to document band as
  low-only, and cleaned up README prose.
