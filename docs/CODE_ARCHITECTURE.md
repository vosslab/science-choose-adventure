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
  and the `LEAK_TERM_DENYLIST` that keeps scientist identities out of run-phase cards.
- [src/engine.ts](../src/engine.ts): pure game-state transitions for the blind run and result
  phase; seeded RNG (mulberry32); weighted draw with `FLAVOR_POOL` injection; `rankSignatures`
  (Euclidean distance over all five `SCIENTIST_SIGNATURE` vectors); `matchExplanation`
  (plain-language rationale from most decisive stats); and stat clamp to [0, 100] with no
  collapse condition.
- [src/storage.ts](../src/storage.ts): v2 versioned local-storage load, save, and reset helpers.
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
- [src/engine.ts](../src/engine.ts) applies the chosen option, updates four-C stats (clamped
  0-100), advances the draw sequence (injecting a flavor card when the internal leader clears
  `FLAVOR_MIN_MARGIN`), and returns the next immutable state shape. When the run is complete,
  `rankSignatures` compares the final stat profile to all five `SCIENTIST_SIGNATURE` vectors
  and `matchExplanation` builds the plain-language result.
- [src/storage.ts](../src/storage.ts) persists the current state in browser `localStorage`.

## Testing and verification

- [check_codebase.sh](../check_codebase.sh) runs TypeScript checks, ESLint, Prettier check, and Node
  tests under [tests/](../tests/).
- [tests/test_content_contracts.mjs](../tests/test_content_contracts.mjs) checks core-deck floor,
  probed-stat coverage, flavor coverage, signature distinctness, and the leak-term denylist.
- [tests/test_engine_flow.mjs](../tests/test_engine_flow.mjs) checks seeded run completion,
  byte-stable determinism, stat clamping, divergence, and absence of `Math.random` in
  [src/engine.ts](../src/engine.ts).
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
