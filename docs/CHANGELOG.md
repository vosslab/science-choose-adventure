# Changelog

## 2026-06-30

### Additions and New Features

- Added a prominent "Play it now in your browser" link to README.md pointing to the live GitHub
  Pages instance at https://vosslab.github.io/science-choose-adventure/. Placed immediately after
  the first paragraph (the GitHub About description paragraph) and before the Quick start section,
  per the repo rule that the first paragraph must remain pure prose.

### Behavior or Interface Changes

- L3: Event-card origin is now threaded through the draw result instead of re-derived by a
  renderer-side rescan. `drawNextCard` in `src/engine.ts` sets `isEvent: true` once, on the
  event-injection branch (the same branch that calls `eligibleEventCard`); its return type gains
  an optional `readonly isEvent?: boolean`. `runVisibleCard` now reads `drawn.isEvent` to set the
  run `VisibleCard.isEvent` field, replacing the prior `isEventCard(drawn.card.id)` EVENT_DECK
  rescan at visible-card construction. `src/ui_renderer.ts` is unchanged: it still reads
  `visibleCard.isEvent`; only the upstream data source moved. The duplicated classification path
  is gone, so the run-card "Rare event" affordance can no longer drift from the draw decision.

### Fixes and Maintenance

- M2: Added a pool-membership guard at the public `signatureDistance` entry point in
  `src/selection.ts`. The z-score normalizers are derived from the supplied `pool`, so scoring a
  scientist absent from that pool normalized against the wrong reference distribution and silently
  returned a misleading distance. The guard now throws an `Error` naming the id and the pool when
  the scientist is not a member. It runs once at the public boundary, never inside the
  per-scientist normalizer loop, so `rankSignatures` (which only ever passes pool members through
  `signatureDistanceWithNormalizers`) is unaffected and pays no per-iteration cost. Correct-pool
  ranking results are byte-for-byte unchanged.

### Removals and Deprecations

- L3: Removed the now-dead `isEventCard(id)` helper from `src/engine.ts`. Its only caller was the
  renderer-facing rescan that L3 replaced with the draw-result `isEvent` flag; the selection
  eligibility path (`eligibleEventCard`) filters `EVENT_DECK` directly and never used it.

### Developer Tests and Notes

- Added two tests to `tests/test_engine_flow.mjs`: test s asserts `signatureDistance` throws when a
  `disgracedIds()[0]` scientist is scored against the `celebratedIds()` pool (and that a
  correct-pool call returns a finite number); test t forces an event draw via an extreme-band state
  (cash past `STAT_NORMAL_MAX`) and asserts the resulting visible card carries `isEvent === true`,
  while a normal-range fresh state's visible card does not. Ids come from the exported
  `celebratedIds()`/`disgracedIds()` helpers, not hardcoded names. All checks pass: `npm run check`
  reports "PASS: 5 checks passed." (including the engine.ts and selection.ts determinism static
  tests), 21 node tests pass, `npm run build` builds `dist/`, and `npm run test:playwright` reports
  "3 passed".

## 2026-06-29

### Additions and New Features

- screenshot-docs: Captured three browser screenshots from the built `dist/` via Playwright
  and added a managed "## Screenshots" section to `README.md` (begin/end sentinels) embedding
  `docs/screenshots/start_screen.png`, `docs/screenshots/run_card.png`, and
  `docs/screenshots/result_reveal.png`. All three screenshots were re-captured at 1280x720
  (16:9) after the hybrid-reveal ("between X and Y" headline) and event-card styling landed;
  slugs are stable so a re-run overwrites in place.

- WP-6 (WS6): Added conditional effects. `Effect` in `src/content.ts` gains two optional
  fields: `whenStatAtLeast?: { stat: StatId; value: number }` (a minimal at-least threshold
  on one stat) and `then?: { direction?: EffectDirection; magnitude?: EffectMagnitude }`
  (the alternate swapped in when the condition holds; omitted fields fall back to the base).
  Added exported types `EffectCondition`, `EffectSwap`, and an exported sibling helper
  `conditionalEffect(...)` so card authors (WS8) can build conditional effects ergonomically.
  In `src/engine.ts`, `applyChoiceEffects` now resolves each effect through new
  `resolveEffect(effect, preEffectStats)`, evaluating the condition against the pre-effect
  stats snapshot (the original `stats` argument), so an earlier effect in the same choice
  can never change how a later effect's condition resolves -- resolution is order-independent
  and deterministic. The target stat is never swapped and every magnitude is a nonzero delta,
  so a probed stat is affected under every resolution; the probe-subset rule stays decidable
  from the static `stat` fields alone (WS9). Floor-at-0/no-cap behavior via `floorStat` is
  unchanged; existing unconditional cards behave identically. All 5 checks pass.

- WP-2 (WS2): Added optional `weights?: Record<StatId, number>` field to the
  `SCIENTIST_SIGNATURE` entry type in `src/config.ts`. No entry carries weights yet
  (WS5 fills those in); the field is purely a type seam. Added exported helper
  `signatureWeights(id: ScientistId): Record<StatId, number>` that returns the entry's
  `weights` when present, otherwise returns a uniform default of 1 for every `StatId`
  built dynamically from `STAT_IDS` so it stays in sync if stats change. All 5 checks
  pass; no ranking behavior changes since every call returns all 1s.

- Patch 1: Extended `SCIENTIST_IDS` in `src/config.ts` with 9 disgraced cautionary
  cases: `andrew_wakefield`, `hwang_woosuk`, `he_jiankui`, `gary_strobel`,
  `purdue_sackler`, `jan_hendrik_schon`, `diederik_stapel`, `paolo_macchiarini`,
  `haruko_obokata`. Each entry in `SCIENTIST_CONFIG` carries two new fields:
  `kind: "celebrated" | "disgraced"` (the match pool) and `caseType` (the
  six-value misconduct taxonomy: `fraud`, `fabrication`, `reckless-human-research`,
  `patient-harm`, `profit-harm`, `regulatory-violation`, or `none` for celebrated
  entries). Added `export const DISGRACE_FLOOR = 20` as the credibility threshold
  for the downfall branch.
- Patch 2: Added downfall branch in `src/engine.ts`: `celebratedIds()` and
  `disgracedIds()` pool helpers; `rankSignatures` now accepts an optional pool
  argument; `toResultState` computes `downfall = stats.credibility <= DISGRACE_FLOOR`,
  picks the matching pool, and sets `tone: "celebrated" | "disgraced"` on the result
  `GameState` and `VisibleCard`. Added `downfallExplanation()` variant that frames
  decisive stats as "cratered" or "ran hot" (words only, no digits).
  Mid-run flavor injection continues to rank within the celebrated pool only,
  preserving the blind run -- disgraced cases are never surfaced before the reveal.
- Patch 3: Finalized all 9 disgraced-pool entries in `SCIENTIST_SIGNATURE`
  and `SCIENTIST_THEME` in `src/config.ts`. Replaced placeholder rationales with
  one-line, ASCII-only, educational rationales grounded in documented public records
  for each case (Wakefield, Hwang, He Jiankui, Strobel, Purdue/Sackler, Schon,
  Stapel, Macchiarini, Obokata). All values remain as tuned in Patch 1; minimum
  pairwise Euclidean distance across all 14 signatures is gary_strobel vs
  haruko_obokata at 22.56 (above the 20-point FLAVOR_MIN_MARGIN floor).
- Patch 4: Added flavor cards (>=1 per disgraced id) to `FLAVOR_POOL` in
  `src/content.ts`; prompts do not name or identify the scientist per the leak-term
  rule. Added `SCIENTIST_SOURCE_NOTES` blocks per disgraced id using real https
  source links (Wikipedia, Lancet retraction, PMC articles, NYT/AP for Strobel).
- Patch 5: Extended `LEAK_TERM_DENYLIST` in `src/content_validation.ts` with the
  disgraced names and identifying terms (wakefield, hwang, jiankui, strobel,
  sackler, oxycontin, schon, stapel, macchiarini, obokata, mmr, autism, stap)
  so flavor prompts cannot identify any disgraced case.
- Extreme stat band: any 4C stat can now be driven past the normal ceiling
  (`STAT_NORMAL_MAX = 100`) with no upper cap. `clampStat` now only floors at 0;
  `statStep` returns steps above `STAT_STEP_COUNT` without limit. The meter grows one
  extra gold segment per extreme step (`stat__segment--extreme` in `src/style.css`) and
  `renderStats` sizes the meter grid columns to the live step count so segments stay on
  one row.

- WS1 (Patch 1): Extracted `signatureDistance` and `rankSignatures` from `src/engine.ts`
  to a new `src/selection.ts` module; `src/engine.ts` re-exports both for backward
  compatibility. Added `statHistory: readonly StatValues[]` (initial 4C vector at index 0,
  one post-card snapshot per answered card) and `pendingCardIds: readonly CardId[]`
  (branch draw queue, initialized empty) to both phases of `GameState`. Both fields are
  carried through all state transitions without loss.
- WS3 (Patch 3): Upgraded the resemblance metric in `src/selection.ts` from raw Euclidean
  to a normalized + weighted + cosine blend. Per-axis z-score normalization uses the active
  pool's population mean and standard deviation so an axis with naturally wider spread does
  not dominate. Per-scientist `signatureWeights()` multiply each squared axis term. A
  cosine-similarity term (`COSINE_BLEND_WEIGHT = 0.25`) on the raw vectors is added as a
  shape nudge. Zero-variance axes contribute nothing. A run exactly on a signature still
  ranks that scientist first; the `SCIENTIST_IDS` tie-break and no-`Math.random` contract
  are preserved.
- WS4 (Patch 4): Added margin-hybrid result and trajectory signal. `HYBRID_MARGIN = 0.4`
  (on the blended z-score + cosine scale): when the top-two resemblance scores differ by
  less than the effective margin, the result carries `blended: true`, `secondaryScientistId`,
  and the headline reads "You land between X and Y." (celebrated) or "Your choices echo both
  the X and Y cases." (disgraced). The leader (`ranking[0]`) is never changed.
  `trajectorySignal()` reads `statHistory` to derive peak stat + timing (early vs late) and
  volatility (total path movement vs net displacement); produces a digit-free `trajectoryNote`
  on every result and applies a bounded margin shift: a decisive (early, steady) run tightens
  the hybrid window; an indecisive (late surge or swinging) run widens it.
- WS5 (Patch 5): Filled in per-scientist `weights` in `SCIENTIST_SIGNATURE` for all 14
  entries (5 celebrated + 9 disgraced), emphasizing each scientist's defining Cs (for
  example, Purdue/Sackler cash-dominant at 2.5, He Jiankui curiosity-dominant at 2.5).
- WS7 (Patch 7): Extended the draw scheduler (`drawNextCard`) with a four-priority system:
  (1) a pending branch card from `pendingCardIds` (deterministic, no RNG consumed); (2) a
  seeded event card from `EVENT_DECK` only while some stat exceeds `STAT_NORMAL_MAX`;
  (3) a leader flavor card on the `FLAVOR_EVERY` cadence; (4) a weighted core draw
  excluding cards asked within `COOLDOWN_WINDOW = RUN_LENGTH` draws. Behavior is
  byte-identical to prior when `EVENT_DECK` is empty and `pendingCardIds` is empty.
- WS8 (Patch 8): Enlarged `CORE_DECK` past the >= 18 card floor enforced by content
  validation. Added `EVENT_DECK` of four extreme-gated event cards (`event_cash_1`,
  `event_curiosity_1`, `event_care_1`, `event_credibility_1`); each probes the same stat
  it is gated on; all prompts pass the `LEAK_TERM_DENYLIST`. Added one branch link:
  core_27 choice A carries `unlocks: core_28`, so the follow-up card appears
  deterministically on the next draw.
- WS9 (Patch 9): Extended `validateContent()` in `src/content_validation.ts` to cover:
  probe-subset holds on conditional-effect cards (target stat never changes under any
  resolution); every `Choice.unlocks` id resolves to a real `CORE_DECK` or `EVENT_DECK`
  card; event-deck prompts pass the `LEAK_TERM_DENYLIST`; each event-deck card probes at
  least one stat that can enter the extreme band.

### Behavior or Interface Changes

- The outcome model now has two match pools. A final `credibility <= DISGRACE_FLOOR`
  routes the run to the disgraced pool (tone: `"disgraced"`), else the celebrated pool
  (tone: `"celebrated"`). The two pools are ranked separately; no disgraced case ever
  appears in a celebrated reveal, and no celebrated scientist appears in a downfall reveal.
- Patch 6: Downfall reveal in `src/ui_renderer.ts` renders a case-echo headline
  ("Your choices echo the {name} case") and applies the disgraced-pool dark theme
  from `SCIENTIST_THEME`. Celebrated reveals keep the existing "You most resemble"
  headline. Disgraced source notes and rationale sections display on the same
  result screen as celebrated ones.
- Patch 7: Storage key bumped from `science_career_survival:v2` to
  `science_career_survival:v3` to carry the new `tone` field on the result phase.
  Old v1/v2 saves are silently discarded (no migration); the tolerant garbage-blob
  parse behavior is unchanged.
- Extreme stat downfall trigger: the disgraced "jail" branch in `toResultState` now
  fires when `credibility <= DISGRACE_FLOOR` OR any stat exceeds `STAT_NORMAL_MAX`.
  Pushing any 4C stat into the extreme band routes the run to the disgraced pool;
  the raw extreme value pulls the match toward the case sharing that extreme (extreme
  cash toward the profit-harm case, extreme curiosity toward the reckless-research
  case). Resemblance for non-extreme runs is byte-identical to before, since those
  runs never exceeded 100.
- WS1 (Patch 1): Storage version bumped from v3 to v4 (`STORAGE_KEY` changed to
  `science_career_survival:v4`, `version: 4`). Old v3 saves are discarded on load with
  no migration. The tolerant garbage-blob parse behavior is unchanged for malformed data.
- WS10 (Patch 10): Result reveal renders a hybrid "between X and Y" headline when
  `blended` is true; the blend partner is highlighted in the ranking list with a "blend"
  tag. The trajectory note sentence (`trajectoryNote`) appears below the explanation on
  every result screen. Event-origin cards display a neutral "Rare event" affordance
  (`data-event="true"` on the card element, styled distinctly in `src/style.css`).
- Extracted the inline trajectory-shift fraction to a named constant and simplified the
  `choice()` unlocks construction in `src/content.ts` (no behavior change); axis
  normalizers are computed once per ranking call in `src/selection.ts` (pure
  de-duplication, identical results).
- Exported `checkBranchTargets` and `checkEventCoverage` from
  `src/content_validation.ts` (now parameterized) so their rejection paths are
  unit-testable; `validateContent()` behavior is unchanged.

### Fixes and Maintenance

- Corrected gary_strobel's theme motif from "Samples taken without leave"
  (which implied unauthorized sample collection) to "Released into the field
  before the permits arrived." -- accurately framing the case as an unauthorized
  field release of an engineered organism, per the plan framing rule.
- Patch 8: Updated `docs/FILE_FORMATS.md` to document the two-pool outcome model,
  `kind` and `caseType` fields, `DISGRACE_FLOOR`, the downfall branch, the
  leak-term rule for disgraced flavor prompts, all 14 signatures in
  `SCIENTIST_SIGNATURE`, and the v3 save envelope with `tone` in the result phase.
- Removed planning-scaffolding tokens and corrected stale "future work" comments
  across `src/engine.ts`, `src/content.ts`, `src/config.ts`,
  `src/content_validation.ts`, and `src/selection.ts` so comments describe current
  behavior.
- Corrected stale `EVENT_DECK` "empty" comments in `src/engine.ts` (the event deck
  now has cards).
- Fixed a stale storage version reference in `docs/CODE_ARCHITECTURE.md` (v3 to v4).
- Updated the screenshot note in this changelog to reflect that all three screenshots
  were re-captured at 1280x720 after the hybrid reveal and event-card styling landed.

### Removals and Deprecations

- Dropped the unused `signatureDistance` re-export from `src/engine.ts`; it is
  exported from `src/selection.ts` where it is used.

### Developer Tests and Notes

- Patch 8: Added two deterministic tests to `tests/test_engine_flow.mjs`:
  (h) a credibility-flooring strategy (always pick the choice with the most
  `credibility: down` effects per `currentVisibleCard`) drives a full run to
  `tone === "disgraced"` with a disgraced-pool match; the flooring run crossed
  DISGRACE_FLOOR (credibility reached 0 by card 5 of 12), confirming the downfall
  branch is reachable with the current deck and DISGRACE_FLOOR=20;
  (i) the always-0 run stays above DISGRACE_FLOOR (credibility=90) and reaches
  `tone === "celebrated"` with a celebrated-pool match.
  Both new tests also assert the explanation is non-empty and digit-free,
  extending the existing digit-free contract to the downfall tone.
  All 10 engine-flow tests and all 5 content-contract tests pass; npm run check
  returns PASS on all 5 steps (typecheck, typecheck:lint, lint, format:check,
  test:node).
- Added two extreme-band tests to `tests/test_engine_flow.mjs`: (j) `statStep`
  climbs above `STAT_STEP_COUNT` past the normal ceiling and caps at
  `EXTREME_STEP_COUNT` (never overflowing past `STAT_MAX_VALUE`); (k) a greedy
  stat-pushing strategy drives some stat past `STAT_NORMAL_MAX` and reaches
  `tone === "disgraced"` with a disgraced-pool match -- confirming the extreme-stat
  downfall path is reachable through normal play. Test d's clamp range updated from
  `[0, 100]` to `[0, STAT_MAX_VALUE]`. All 12 engine-flow tests pass; npm run check
  still PASS on all 5 steps and `npm run build` succeeds.
- WS11 (Patch 11): Added six new tests to `tests/test_engine_flow.mjs` covering all
  eight advanced-selection + variable-choices features: (l) normalized/weighted metric
  ranks differently from raw Euclidean at a known stats point; (m) result state carries
  a digit-free `trajectoryNote` and a boolean `blended` field; (n) `signatureDistance`
  gap is sub-unit near the midpoint of two celebrated signatures, confirming the hybrid
  mechanism is reachable with the current weights; (o) `trajectoryNote` contains
  peak-timing words and differs by run strategy; (p) conditional effect on `core_25`
  choice A fires `"medium"` care when `cash >= 50` and `"small"` otherwise; (q) choosing
  `core_27` choice A enqueues `core_28`, which appears in `askedIds` on the next draw;
  (r) event card ids never appear in a normal-range run, and an extreme state draws one
  immediately. All 19 engine-flow tests and all content-contract tests pass; `npm run
  check` returns PASS on all 5 steps.
- WS12 (Patch 12): Updated `docs/FILE_FORMATS.md` with v4 save format, `statHistory`,
  `pendingCardIds`, per-scientist `weights`, hybrid result fields (`blended`,
  `secondaryScientistId`, `trajectoryNote`), conditional effects, branch links,
  `EVENT_DECK`, and cooldown. Updated `docs/CODE_ARCHITECTURE.md` to document
  `src/selection.ts`. Updated `README.md` with richer-matching and variable-choices
  overview. Reconciled all Patches 1-12 into this changelog block.
- Added loud-failure guards so card-id-forced tests fail instead of silently skipping
  on a rename; made the hybrid-margin test derive scientists from the celebrated pool
  with a relative gap assertion; extended the determinism static check to also scan
  `src/selection.ts`; added negative-fixture tests asserting `branch_target_missing`,
  `event_deck_empty`, and `event_no_probes`.

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
