# Usage

Science Career Survival is a static TypeScript browser game. It builds to
`dist/` and runs locally from the generated files.

## Play loop

The game opens with a career-sorting prologue. Each prologue choice adds routing
weight toward one of the five launch paths:

- Jennifer Doudna
- Rosalind Franklin
- Marie Curie
- Alexander Fleming
- Katalin Kariko

After routing, the player makes paired choices through that scientist's career
arc. Choices move one or more stats. A run ends with a legacy outcome when the
path completes, or with a collapse ending if a stat reaches either extreme.

The interface accepts:

- Mobile swipe left or right.
- Touch, click, or button activation.
- Left arrow or `A` for the left choice.
- Right arrow or `D` for the right choice.

## The four Cs

The four stats model career pressure rather than simple success points:

- Credibility: trust from peers, institutions, and the public.
- Curiosity: willingness to follow hard questions and evidence.
- Cash: resources, patronage, institutions, and practical support.
- Care: attention to people, consequences, safety, and personal cost.

Low and high extremes are both dangerous. The goal is not to maximize every stat;
the goal is to keep the career alive while making choices that fit the path.
Each visible meter has 10 steps, so players get more feedback than a simple
low/steady/high label without seeing the hidden 0-100 engine value.

## Progression and reset

The browser stores progress in `localStorage` under
`science_career_survival:v1`. The save stores the active phase, route scores,
stats, current path position, and unlocked extras.

Core launch paths are always available through the prologue. Completing a run can
unlock extras for that scientist, including source notes shown on ending screens.

Use the in-game restart control to clear the save slot and return to a fresh
prologue. Browser developer tools can also clear site data or remove the
`science_career_survival:v1` local storage entry.

## Source material

The folder [data/science_career_paths/](../data/science_career_paths/) contains
local path drafts and source material for content work. Treat that folder as the
working source-reference area for this repo; do not describe it as public
documentation unless the project intentionally makes that claim elsewhere.

Runtime game content is authored in TypeScript. The source drafts inform the
cards, motifs, endings, and source notes, but the browser does not load Markdown
draft files at runtime.

## Card authoring

Each playable path should follow the existing content standard:

- Use historically inspired pressure, not strict biography.
- Keep satire aimed at institutions, incentives, committees, funding systems,
  media pressure, and career absurdity.
- Make specific historical claims only when source notes cover them.
- Keep every card to exactly two choices.
- Give each choice at least one stat effect.
- Cover the arc beats: entry, pressure, breakthrough, translation, and legacy.
- Provide all ending types for each path.
- Include 3 to 5 source notes per path.
- Include at least 3 scientist-specific cards per path.
- Keep the four Cs in tension instead of making one obviously correct route.

Source notes should point to stable, reputable references and should support the
specific historical claims used in the cards. A source note is an unlockable
reader aid, not a citation for every fictionalized line.

## Build and serve

Install dependencies:

```bash
npm install
```

Run the full local check:

```bash
npm run check
```

Build the static site:

```bash
npm run build
```

Serve the built game:

```bash
npm run serve
```

The build writes `dist/index.html`, `dist/main.js`, `dist/style.css`, and
`dist/.nojekyll`.

## Tests

Run the browser smoke test after building:

```bash
npm run test:playwright
```

Run the Markdown link check through the repo Python environment:

```bash
source source_me.sh && python3 -m pytest tests/test_markdown_links.py
```
