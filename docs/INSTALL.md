# Install

Install means preparing the local TypeScript toolchain so the static browser game can be checked,
built, and served from `dist/`.

## Requirements

- Node.js and npm on `PATH`.
- npm dependencies from [package.json](../package.json).
- Python 3.12 through `source source_me.sh && python3` for repo hygiene tests.

## Install steps

Install npm dependencies:

```bash
npm install
```

Install Playwright browser support when browser tests are missing a local Chromium:

```bash
npm run setup:playwright
```

## Verify install

Run the repo check:

```bash
npm run check
```

The expected success summary is:

```text
PASS: 5 checks passed.
```

## Known gaps

- Verify the minimum supported Node.js version for this project if deployment targets change.
