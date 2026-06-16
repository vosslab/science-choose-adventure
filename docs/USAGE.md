# Usage

Science Career Survival is a static TypeScript browser game. It builds to
`dist/` and runs locally from the generated files.

## Play loop

The game presents 12 anonymous career dilemmas drawn from a shared question
pool. No scientist is named or hinted during the run. Your choices shift four
career stats and build a profile that is compared against hand-authored
signatures at the end.

The interface accepts:

- Mobile swipe left or right.
- Touch, click, or button activation.
- Left arrow or `A` for the left choice.
- Right arrow or `D` for the right choice.

Progress is shown as "Question k of 12" above the card. The four stat meters
update after each answer.

## The four Cs

The four stats model career pressure rather than simple success points:

- Credibility: trust from peers, institutions, and the public.
- Curiosity: willingness to follow hard questions and evidence.
- Cash: resources, patronage, institutions, and practical support.
- Care: attention to people, consequences, safety, and personal cost.

Stats start at 50 and clamp between 0 and 100. Each meter has 10 visible steps.
There is no win or lose condition; no stat threshold ends the run.

Meter color follows a pressure model: steps 1-2 display in red (low), steps 3-4
in amber (getting low), and steps 5-10 in a neutral-to-strong range. A high stat
is treated as a strength, never a warning. Each stat meter carries a hover
tooltip with that stat's definition.

## Soft texture wording

When a stat runs low the game surfaces a short texture line below the meters,
for example "the lab is fraying for lack of funds". This describes career strain
without threatening the run. The same stat pressures are reflected in the end
reveal explanation.

## End reveal

After the 12th answer the game reveals which scientist your career profile most
resembles. The result screen shows:

- "You most resemble {name}" as the headline.
- A plain-language explanation of the match based on the two or three most
  decisive stats (for example "curiosity and care stayed high while cash stayed
  low").
- Per-stat rationale for the matched scientist (why each C is high, medium, or
  low for that scientist).
- An ordered name ranking of all five scientists (no raw numeric distances).
- Unlocked source notes for the matched scientist (the engine adds a
  `"{scientistId}:source_notes"` token to `unlockedExtras` when the run transitions to the
  result phase, which the UI reads to reveal that scientist's source notes).

## Restart and reset

Use the Restart button on the result screen to start a new run; the previous
result is replaced in the saved state.

Use the Reset button or clear `localStorage` in the browser developer tools to
remove the save entirely and start fresh.

Browser developer tools can also remove the `science_career_survival:v2` entry
directly from the Application > Local Storage panel.

## Source material

The folder [data/science_career_paths/](../data/science_career_paths/) contains
local path drafts and source material for content work. Treat that folder as the
working source-reference area for this repo; do not describe it as public
documentation unless the project intentionally makes that claim elsewhere.

Runtime game content is authored in TypeScript. The source drafts inform the
cards and source notes, but the browser does not load Markdown draft files at
runtime.

## Card authoring

The neutral core deck and scientist flavor pool follow this content standard:

- Use historically inspired career pressure, not strict biography.
- Keep satire aimed at institutions, incentives, committees, funding systems,
  media pressure, and career absurdity.
- Make specific historical claims only when source notes cover them.
- Keep every card to exactly two choices.
- Give each choice at least one stat effect.
- Tag each card with `probes` (the stats the card is thematically about); every
  probed stat must appear in at least one of the card's choice effects.
- Core deck cards must not name or identify any scientist.
- Flavor pool cards must not use instantly identifying terms such as mRNA,
  radium, Photo 51, mold plate, or penicillin.
- Include 3 to 5 source notes per scientist.

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
