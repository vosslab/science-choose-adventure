# Troubleshooting

This page lists issues supported by current repo scripts and tests.

## Build fails before app files exist

- `tsc` reports `TS18003` when the configured include pattern finds no TypeScript inputs.
- This should not happen after [src/main.ts](../src/main.ts) exists.
- Run `npm run check` to confirm the source tree is visible to TypeScript.

## Playwright browser missing

- Browser tests may fail if Playwright has not installed a browser binary.
- Run:

```bash
npm run setup:playwright
```

## Desktop text selection chooses a card

- The regression is covered by [tests/playwright/game_smoke.spec.ts](../tests/playwright/game_smoke.spec.ts).
- Run `npm run test:playwright` after changing [src/input_controller.ts](../src/input_controller.ts).

## Known gaps

- Add troubleshooting entries only after a failure has a reproduced command and fix.
