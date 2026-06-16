# File formats

This repo has two practical data surfaces: TypeScript-authored runtime content and browser
local-storage saves.

## Runtime content

- Runtime cards live in [src/content.ts](../src/content.ts).
- Scientist path drafts live in [data/science_career_paths/](../data/science_career_paths/) and
  inform the TypeScript content.
- The neutral core deck (`CORE_DECK`) holds scientist-agnostic career dilemmas, each tagged with
  `probes` (the stats the card is thematically about).
- The flavor pool (`FLAVOR_POOL`) holds scientist-keyed cards injected only after an internal
  leader emerges; flavor prompts must not name or identify the scientist.
- Per-scientist source notes live in `SCIENTIST_SOURCE_NOTES` in [src/content.ts](../src/content.ts).
- [src/content_validation.ts](../src/content_validation.ts) is the executable source for the
  content completeness rules.

## Scientist signatures

Each scientist has a hand-authored signature in `SCIENTIST_SIGNATURE` in
[src/config.ts](../src/config.ts). The signature structure is:

```
{
  values: Record<StatId, number>,   // 0-100 target value per stat
  rationale: Record<StatId, string> // one-line reason per stat (why high/medium/low)
}
```

`values` entries must be in [0, 100]. All five signatures must be pairwise distinct by at
least `FLAVOR_MIN_MARGIN` (enforced by content validation). The `rationale` strings appear
on the result screen to explain the match.

## Save data

- Browser save data is stored in `localStorage` under the key `science_career_survival:v2`.
- [src/storage.ts](../src/storage.ts) owns the versioned save-file boundary.
- Old v1 saves (key `science_career_survival:v1`) are not read; unrecognized or missing
  saves start a fresh run.

The save envelope is:

```
{
  version: 2,
  state: GameState
}
```

`GameState` is a tagged union:

```
{ phase: "run";
  stats: Record<StatId, number>;
  seed: number;
  answeredCount: number;
  askedIds: readonly string[];
  lastEffectMagnitude: string | undefined;
  strain: readonly { stat: StatId; band: "low" | "high"; line: string }[];
  unlockedExtras: readonly string[] }
|
{ phase: "result";
  stats: Record<StatId, number>;
  scientistId: ScientistId;
  ranking: readonly { scientistId: ScientistId; distance: number }[];
  explanation: string;
  seed: number;
  answeredCount: number;
  askedIds: readonly string[];
  lastEffectMagnitude: string | undefined;
  strain: readonly { stat: StatId; band: "low" | "high"; line: string }[];
  unlockedExtras: readonly string[] }
```

The `run` phase holds the live stat vector, a seeded RNG seed, the list of already-asked
card IDs to avoid repeats, the current soft-tension texture lines (`strain`), and the set
of unlocked extras (`unlockedExtras`). `lastEffectMagnitude` is `undefined` until the first
choice is made, then a label string such as `"small"` or `"large"`.

The `result` phase carries all the same fields as `run` (stats, seed, answeredCount,
askedIds, lastEffectMagnitude, strain, unlockedExtras) plus the matched scientist ID, the
full resemblance ranking (used to render the ordered name list without raw distances), and
the plain-language explanation string.

`strain` entries each have a `stat` (one of the four `StatId` values), a `band` (`"low"` or
`"high"`), and a `line` string (the texture sentence). The `unlockedExtras` array holds
opaque token strings; the only token produced at present is `"{scientistId}:source_notes"`,
added when the run transitions to the result phase.

- The game exposes Restart and Reset controls so a player or tester can start a new run or
  clear saved progress entirely.

## Known gaps

- Document a stable exported JSON format only if content moves out of TypeScript source.
