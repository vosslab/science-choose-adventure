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
