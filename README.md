# Science Career Survival

Science Career Survival is a static TypeScript browser game where players steer historically inspired science careers through pressure, discovery, institutions, and personal cost.

## Quick start

```bash
npm install
npm run check
npm run build
npm run serve
```

`npm run serve` prints a local URL for the built game in `dist/`.

## Game overview

The game starts with a career-sorting prologue, then launches one of five science
career paths:

- Jennifer Doudna
- Rosalind Franklin
- Marie Curie
- Alexander Fleming
- Katalin Kariko

Each run asks the player to survive without letting any of the four Cs collapse
or dominate the career:

- Credibility: whether the field trusts the work.
- Curiosity: whether the questions stay alive and evidence-based.
- Cash: whether the work has enough resources without being captured by them.
- Care: whether people, consequences, and caution stay visible.

The interface supports mobile swipe, touch or click buttons, and keyboard input.
Use left arrow or `A` for the left choice, and right arrow or `D` for the right
choice.

## Documentation

Launch content uses `data/science_career_paths/` as source material for path
drafts and source-note coverage. Runtime cards live in TypeScript source.

- [docs/INSTALL.md](docs/INSTALL.md)
- [docs/USAGE.md](docs/USAGE.md)
- [docs/CODE_ARCHITECTURE.md](docs/CODE_ARCHITECTURE.md)
- [docs/FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md)
- [docs/FILE_FORMATS.md](docs/FILE_FORMATS.md)
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- [docs/TYPESCRIPT_STYLE.md](docs/TYPESCRIPT_STYLE.md)
- [docs/CHANGELOG.md](docs/CHANGELOG.md)
