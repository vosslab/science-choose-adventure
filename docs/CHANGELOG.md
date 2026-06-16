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

### Developer Tests and Notes

- The launch content is grounded in `data/science_career_paths/` drafts for
  Jennifer Doudna, Rosalind Franklin, Marie Curie, Alexander Fleming, and
  Katalin Kariko.
- Patch: Documented `data/science_career_paths/` as repo source material without
  presenting it as public documentation.
- Patch: Added a Playwright regression covering desktop text selection without
  accidental choice submission.
- Patch: Added Playwright coverage for the 10-step four-C meter display.
