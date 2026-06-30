# Science Career Survival

A static TypeScript browser game where your choices across 12 career dilemmas reveal which historically inspired scientist (or, on a downfall, which cautionary case) your career style most resembles, built on a shared, scientist-neutral deck.

## Quick start

```bash
npm install
./check_codebase.sh   # typecheck, lint, format, node unit tests
./run_web_server.sh   # build dist/ and serve locally (auto-opens browser)
```

The `npm run` equivalents (`npm run check`, `npm run build`, `npm run serve`) are also available.

## Game overview

This is a pilot of the resemblance redesign. You answer 12 career-dilemma questions
drawn blind from a shared neutral deck. Some questions carry a disguised scientist
flavor, but the deck is otherwise undifferentiated -- you never choose a scientist
up front and there are no scientist-specific paths.

Your choices shift four career stats across the run:

- Credibility
- Curiosity
- Cash
- Care

Stats are floored at 0 with no upper cap. Low stats add soft "strain" texture to
the wording. Pushing a stat past 100 sends it into an extreme band: the meter grows
extra gold segments, and the extreme reroutes your ending toward a cautionary case.

At the end, the game routes to one of two reveal pools. An honest run compares your
final stat profile to hand-authored signatures for five celebrated scientists and
reveals which one you most resemble:

- Jennifer Doudna
- Rosalind Franklin
- Marie Curie
- Alexander Fleming
- Katalin Kariko

A downfall -- credibility collapsing to the floor, or any stat pushed to an extreme --
instead routes to one of nine cautionary science and biotech cases, revealing which
case your choices echo. The reveal includes a plain-language explanation, a per-stat
rationale for the match, an ordered ranking of the matched pool against your profile,
and unlocked source notes about the matched outcome.

The interface supports mobile swipe, touch or click buttons, and keyboard input.
Use left arrow or `A` for the left choice, and right arrow or `D` for the right
choice.

## Shell scripts

| Script | What it does |
| --- | --- |
| `./run_web_server.sh` | Builds `dist/` then serves it locally on a random port (8000-8999); auto-opens the browser when running interactively |
| `./build_github_pages.sh` | Wipes and rebuilds the `dist/` GitHub Pages artifact (type-checks, bundles via esbuild, copies static assets) |
| `./check_codebase.sh` | Runs typecheck, ESLint (zero warnings), Prettier check, and Node unit tests; no build step |

## Documentation

Launch content uses `data/science_career_paths/` as source material for
scientist signatures and source notes. Runtime cards live in TypeScript source.

- [docs/INSTALL.md](docs/INSTALL.md)
- [docs/USAGE.md](docs/USAGE.md)
- [docs/CODE_ARCHITECTURE.md](docs/CODE_ARCHITECTURE.md)
- [docs/FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md)
- [docs/FILE_FORMATS.md](docs/FILE_FORMATS.md)
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- [docs/TYPESCRIPT_STYLE.md](docs/TYPESCRIPT_STYLE.md)
- [docs/CHANGELOG.md](docs/CHANGELOG.md)
