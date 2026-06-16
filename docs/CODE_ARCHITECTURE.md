# Code architecture

## Overview

Science Career Survival is a static TypeScript browser game. The app builds from
[src/main.ts](../src/main.ts) into `dist/` with
[build_github_pages.sh](../build_github_pages.sh), then GitHub Pages serves the generated files.

The runtime is fully client-side. Game content, engine rules, input handling, rendering, and
local-storage persistence all live under [src/](../src/).

## Major components

- [src/config.ts](../src/config.ts): source-of-truth tables for the four Cs, scientists, arc beats,
  ending types, and magnitude labels.
- [src/brands.ts](../src/brands.ts): branded identifiers for cards and saved data boundaries.
- [src/content.ts](../src/content.ts): prologue cards and the five launch scientist paths.
- [src/content_validation.ts](../src/content_validation.ts): content completeness checks for paths,
  source notes, endings, contribution-specific cards, and route coverage.
- [src/engine.ts](../src/engine.ts): pure game-state transitions for prologue choices, career cards,
  endings, restarts, and stat collapse.
- [src/storage.ts](../src/storage.ts): versioned local-storage load, save, and reset helpers.
- [src/input_controller.ts](../src/input_controller.ts): swipe, keyboard, and button input wiring.
- [src/ui_renderer.ts](../src/ui_renderer.ts): DOM rendering for the game shell, stats, cards,
  endings, source notes, and controls.

## Data flow

- [src/main.ts](../src/main.ts) loads saved state through [src/storage.ts](../src/storage.ts) or
  creates a fresh state through [src/engine.ts](../src/engine.ts).
- [src/ui_renderer.ts](../src/ui_renderer.ts) renders the current card and controls.
- [src/input_controller.ts](../src/input_controller.ts) maps swipe and keyboard input to the same
  choice handlers used by the rendered buttons.
- [src/engine.ts](../src/engine.ts) applies the chosen option, updates four-C stats, checks high and
  low collapse conditions, and returns the next immutable state shape.
- [src/storage.ts](../src/storage.ts) persists the current state in browser `localStorage`.

## Testing and verification

- [check_codebase.sh](../check_codebase.sh) runs TypeScript checks, ESLint, Prettier check, and Node
  tests under [tests/](../tests/).
- [tests/test_content_contracts.mjs](../tests/test_content_contracts.mjs) checks launch content and
  prologue route coverage.
- [tests/test_engine_flow.mjs](../tests/test_engine_flow.mjs) checks engine behavior and visible
  choice metadata.
- [tests/playwright/game_smoke.spec.ts](../tests/playwright/game_smoke.spec.ts) builds a local
  browser smoke over `dist/` and covers buttons, keyboard input, restart, and the desktop
  text-selection regression.

## Extension points

- Add or change scientist content in [src/content.ts](../src/content.ts), then run
  `npm run check`.
- Add new validation rules in [src/content_validation.ts](../src/content_validation.ts).
- Add new player input modes in [src/input_controller.ts](../src/input_controller.ts), keeping
  buttons and keyboard behavior equivalent.
- Add visual changes in [src/style.css](../src/style.css) and verify with Playwright.

## Known gaps

- Add dedicated tests for touch swipe gestures on real mobile devices.
- Add broader visual screenshots if the UI grows beyond the current one-card layout.
