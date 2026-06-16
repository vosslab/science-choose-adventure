# File formats

This repo has two practical data surfaces: TypeScript-authored runtime content and browser
local-storage saves.

## Runtime content

- Runtime cards live in [src/content.ts](../src/content.ts).
- Scientist path drafts live in [data/science_career_paths/](../data/science_career_paths/) and
  inform the TypeScript content.
- Each launch path includes cards, motifs, endings, source notes, and sensitive-claim markers.
- [src/content_validation.ts](../src/content_validation.ts) is the executable source for the
  content completeness rules.

## Save data

- Browser save data is stored in `localStorage`.
- [src/storage.ts](../src/storage.ts) owns the versioned save-file boundary.
- Saved data includes the current game phase, route scores, stats, current path progress, and
  unlocked extras.
- The game exposes reset controls so a player or tester can clear saved progress.

## Known gaps

- Document a stable exported JSON format only if content moves out of TypeScript source.
