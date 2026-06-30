# Code architecture

## Overview

Science Career Survival is a static TypeScript browser game. The app builds from
[src/main.ts](../src/main.ts) into `dist/` with
[build_github_pages.sh](../build_github_pages.sh), then GitHub Pages serves the generated files.

The runtime is fully client-side. Game content, engine rules, input handling, rendering, and
local-storage persistence all live under [src/](../src/).

## Major components

- [src/config.ts](../src/config.ts): source-of-truth tables for the four Cs, scientists,
  `SCIENTIST_SIGNATURE` hand-authored 4C vectors, `RUN_LENGTH` and `FLAVOR_*` draw constants,
  `EXTREME_BAND_TEXTURE` strain wording, and magnitude labels.
- [src/brands.ts](../src/brands.ts): branded identifiers for cards and saved data boundaries.
- [src/content.ts](../src/content.ts): `CORE_DECK` of neutral career dilemmas, `FLAVOR_POOL`
  of disguised scientist-keyed cards, and `SCIENTIST_SOURCE_NOTES` for end-reveal unlocks.
- [src/content_validation.ts](../src/content_validation.ts): content completeness checks
  including core-deck floor, probed-stat coverage, flavor coverage, signature distinctness,
  the `LEAK_TERM_DENYLIST` that keeps scientist identities out of run-phase cards, branch-target
  existence (every `Choice.unlocks` id resolves to a real card), and event-deck probe and
  leak-term rules.
- [src/selection.ts](../src/selection.ts): resemblance metric; `signatureDistance` computes a
  blended score combining per-axis z-score normalization (population mean and stddev of the
  active pool), per-scientist axis weights from `signatureWeights()`, and a cosine-similarity
  term (`COSINE_BLEND_WEIGHT = 0.25`); `rankSignatures` sorts one pool by ascending blended
  score with `SCIENTIST_IDS` tie-break; `celebratedIds()` and `disgracedIds()` pool helpers.
  Re-exported from `src/engine.ts` for backward compatibility.
- [src/engine.ts](../src/engine.ts): pure game-state transitions for the blind run and result
  phase; seeded RNG (mulberry32); four-priority draw scheduler (`drawNextCard`: pending branch
  queue, extreme-gated event cards, flavor injection, weighted core draw with cooldown);
  conditional-effect resolver (`resolveEffect`); `matchExplanation` / `downfallExplanation`
  (plain-language rationale from most decisive stats); trajectory signal from `statHistory`
  (peak timing and volatility); margin-hybrid result (`blended`, `secondaryScientistId`,
  `trajectoryNote`); a stat floor at 0 with no upper cap; and `toResultState` downfall routing
  when credibility drops to `DISGRACE_FLOOR` or any stat exceeds `STAT_NORMAL_MAX`. Re-exports
  `rankSignatures` and `signatureDistance` from `src/selection.ts`.
- [src/storage.ts](../src/storage.ts): v4 versioned local-storage load, save, and reset helpers.
- [src/input_controller.ts](../src/input_controller.ts): swipe, keyboard, and button input wiring.
- [src/ui_renderer.ts](../src/ui_renderer.ts): DOM rendering for the blind run phase (cards,
  stats, strain texture) and the result reveal screen (match headline, explanation, per-C
  rationale, ordered name ranking, source notes, and controls).

## Data flow

- [src/main.ts](../src/main.ts) loads saved state through [src/storage.ts](../src/storage.ts) or
  creates a fresh state through [src/engine.ts](../src/engine.ts).
- [src/ui_renderer.ts](../src/ui_renderer.ts) renders the current card during the run phase, or
  the result reveal screen once all `RUN_LENGTH` questions are answered.
- [src/input_controller.ts](../src/input_controller.ts) maps swipe and keyboard input to the same
  choice handlers used by the rendered buttons.
- [src/engine.ts](../src/engine.ts) applies the chosen option (resolving any conditional effects
  against the pre-effect stats snapshot, then enqueuing `Choice.unlocks` into `pendingCardIds`
  when present), updates four-C stats (floored at 0, no upper cap), appends a 4C snapshot to
  `statHistory`, and advances the draw sequence through the four-priority scheduler (pending
  branch card, extreme-gated event card, flavor injection, weighted core draw with cooldown).
  When the run is complete, `toResultState` picks the celebrated or disgraced pool (downfall on
  credibility collapse or any extreme stat), `rankSignatures` in `src/selection.ts` ranks the
  pool by blended normalized + weighted + cosine distance, the trajectory signal reads
  `statHistory` to produce a `trajectoryNote` and margin shift, the hybrid decision compares the
  top-two scores against the effective margin, and `matchExplanation` / `downfallExplanation`
  builds the plain-language result.
- [src/storage.ts](../src/storage.ts) persists the current state in browser `localStorage`.

## Testing and verification

- [check_codebase.sh](../check_codebase.sh) runs TypeScript checks, ESLint, Prettier check, and Node
  tests under [tests/](../tests/).
- [tests/test_content_contracts.mjs](../tests/test_content_contracts.mjs) checks core-deck floor,
  probed-stat coverage, flavor coverage, signature distinctness, and the leak-term denylist.
- [tests/test_engine_flow.mjs](../tests/test_engine_flow.mjs) checks seeded run completion,
  byte-stable determinism, stat clamping, divergence, absence of `Math.random` in
  [src/engine.ts](../src/engine.ts), and advanced-selection + variable-choices features:
  normalized/weighted ranking, hybrid result fields, trajectory note, conditional effects,
  branch follow-up card, and event-card gating.
- [tests/playwright/game_smoke.spec.ts](../tests/playwright/game_smoke.spec.ts) builds a local
  browser smoke over `dist/` and covers the blind run loop, absence of scientist names mid-run,
  and the result reveal screen after the final answer.

## Extension points

- Add or change neutral cards in [src/content.ts](../src/content.ts), then run `npm run check`.
- Add new validation rules in [src/content_validation.ts](../src/content_validation.ts).
- Add new player input modes in [src/input_controller.ts](../src/input_controller.ts), keeping
  buttons and keyboard behavior equivalent.
- Add visual changes in [src/style.css](../src/style.css) and verify with Playwright.

## Known gaps

- Add dedicated tests for touch swipe gestures on real mobile devices.
- Add broader visual screenshots covering the run phase and the result reveal screen.
