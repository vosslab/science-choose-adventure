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
- The event deck (`EVENT_DECK`) in [src/content.ts](../src/content.ts) holds four extreme-gated
  event cards (one per stat: `event_cash_1`, `event_curiosity_1`, `event_care_1`,
  `event_credibility_1`). Each card's `probes` field names the stat that gates it; the scheduler
  injects an eligible event card only while that stat exceeds `STAT_NORMAL_MAX`. All event prompts
  pass the `LEAK_TERM_DENYLIST`.
- [src/content_validation.ts](../src/content_validation.ts) is the executable source for the
  content completeness rules.

### Conditional effects and branch links

`Effect` in [src/content.ts](../src/content.ts) carries two optional fields for conditional
behavior:

- `whenStatAtLeast?: { stat: StatId; value: number }` -- satisfied when the named stat is at
  or above the threshold in the pre-effect stats snapshot.
- `then?: { direction?: EffectDirection; magnitude?: EffectMagnitude }` -- the alternate fields
  swapped in when the condition holds; any omitted field falls back to the base. The target stat
  never changes under any resolution.

Resolution is order-independent: each effect is evaluated against the pre-effect stats snapshot
(the original `stats` argument to `applyChoiceEffects`), so an earlier effect in the same choice
can never change how a later condition evaluates.

`Choice` in [src/content.ts](../src/content.ts) carries an optional `unlocks?: CardId` field.
When the choice is picked, the engine enqueues that card id into `pendingCardIds` so the
four-priority draw scheduler shows the follow-up card before the next weighted draw. The enqueue
dedupes and skips already-asked ids, so a branch card never double-queues or replays.

### Draw scheduler and cooldown

The four-priority draw order in `drawNextCard` is:

1. A pending branch card from `pendingCardIds` (deterministic, no RNG consumed).
2. A seeded event card from `EVENT_DECK` only while some stat exceeds `STAT_NORMAL_MAX`.
3. A leader flavor card on the `FLAVOR_EVERY` cadence.
4. A weighted core draw excluding cards asked within `COOLDOWN_WINDOW = RUN_LENGTH` draws.

With `COOLDOWN_WINDOW = RUN_LENGTH` the cooldown window spans the entire run, reproducing the
prior "no repeated core card" behavior exactly. Lowering the window (or growing the deck past
run length) allows older cards to return.

## Outcome model

Scientists are divided into two match pools by the `kind` field on each entry in
`SCIENTIST_CONFIG` in [src/config.ts](../src/config.ts):

- `kind: "celebrated"` -- the five resemblance targets for an honest run (Doudna, Franklin,
  Curie, Fleming, Kariko).
- `kind: "disgraced"` -- nine cautionary cases reached only through the downfall branch
  (Wakefield, Hwang, He Jiankui, Strobel, Purdue/Sackler, Schon, Stapel, Macchiarini,
  Obokata).

Each disgraced entry also carries a `caseType` field that names the failure category:

| `caseType` | Meaning |
| --- | --- |
| `fraud` | Deliberate misrepresentation of data or findings (e.g., Wakefield) |
| `fabrication` | Invented or manipulated data (e.g., Hwang, Schon, Stapel, Obokata) |
| `reckless-human-research` | Unauthorized or unsafe human experimentation (e.g., He Jiankui) |
| `patient-harm` | Experimental procedures resulting in patient deaths (e.g., Macchiarini) |
| `profit-harm` | Prioritizing revenue over documented safety risks (e.g., Purdue/Sackler) |
| `regulatory-violation` | Unauthorized release or deployment of engineered organisms (e.g., Strobel) |
| `none` | Celebrated entries; no misconduct category applies |

The `caseType` field is part of `SCIENTIST_CONFIG` and is typed as `CaseType` in
[src/config.ts](../src/config.ts). Celebrated entries use `caseType: "none"`.

### Downfall branch

At the end of a run, the engine routes to the disgraced pool when either condition holds:

- `stats.credibility <= DISGRACE_FLOOR` (exported constant `DISGRACE_FLOOR = 20` from
  [src/config.ts](../src/config.ts)) -- integrity collapse.
- any stat exceeds `STAT_NORMAL_MAX` (100) -- an extreme stat (see Stat range below).

When either is true the result is matched against the disgraced pool and `tone` is set to
`"disgraced"`; otherwise the result is matched against the celebrated pool and `tone` is
`"celebrated"`. The two pools are ranked separately so a disgraced case is reachable only
through this branch. For an extreme run, the raw over-ceiling value pulls the match toward
the disgraced case sharing that extreme (extreme cash toward the profit-harm case, and so on).

The `tone` field appears on the `GameState` result phase (see Save data below) and drives
the reveal headline and theme color in [src/ui_renderer.ts](../src/ui_renderer.ts).

### Stat range and the extreme band

Stats start at `STARTING_STAT_VALUE` (50) and are floored at 0 with no upper cap. The
normal ceiling is `STAT_NORMAL_MAX` (100), which fills all `STAT_STEP_COUNT` (10) meter
steps. Values above 100 enter the extreme band and keep climbing without limit: `statStep`
returns steps above `STAT_STEP_COUNT` and the meter grows one extra gold segment per step,
sizing its grid columns to the live step count so the segments stay on one row. Reaching the
extreme band is what triggers the downfall branch above. Resemblance ranking for non-extreme
runs is unchanged, since those runs never exceed 100.

### Leak-term rule for disgraced flavor cards

Disgraced flavor cards in `FLAVOR_POOL` in [src/content.ts](../src/content.ts) obey the
same leak-term denylist as celebrated cards: no prompt may name or identify the scientist
or case. The denylist in [src/content_validation.ts](../src/content_validation.ts) includes
the names and identifying terms for all nine disgraced cases.

## Scientist signatures

Each entry in `SCIENTIST_IDS` has a hand-authored signature in `SCIENTIST_SIGNATURE` in
[src/config.ts](../src/config.ts). The signature structure is:

```
{
  values: Record<StatId, number>,    // 0-100 target value per stat
  rationale: Record<StatId, string>, // one-line reason per stat (why high/medium/low)
  weights?: Record<StatId, number>   // optional per-axis emphasis; defaults to uniform 1 via signatureWeights()
}
```

`weights` amplify each scientist's defining Cs in the resemblance metric (for example, the
Purdue/Sackler entry is cash-dominant with a weight of 2.5; the He Jiankui entry is
curiosity-dominant with a weight of 2.5). All 14 entries carry explicit weights. When
`weights` is absent, `signatureWeights(id)` returns a uniform default of 1 for every `StatId`.

`values` entries must be in [0, 100]. All 14 signatures (5 celebrated + 9 disgraced) must
be pairwise distinct by at least `FLAVOR_MIN_MARGIN` (enforced by content validation). The
disgraced pool sits in the low-credibility region (max credibility 45) while the celebrated
pool has credibility >= 75, so cross-pool collision is structurally impossible. The
`rationale` strings appear on the result screen to explain the match.

## Save data

- Browser save data is stored in `localStorage` under the key `science_career_survival:v4`.
- [src/storage.ts](../src/storage.ts) owns the versioned save-file boundary.
- Old v1, v2, and v3 saves are not read; unrecognized or missing saves start a fresh run.
  No migration is performed: v3 and earlier are silently discarded. The tolerant garbage-blob
  parse behavior is unchanged for malformed data.

The save envelope is:

```
{
  version: 4,
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
  strain: readonly { stat: StatId; band: "low"; line: string }[];
  unlockedExtras: readonly string[];
  statHistory: readonly Record<StatId, number>[];
  pendingCardIds: readonly string[] }
|
{ phase: "result";
  stats: Record<StatId, number>;
  scientistId: ScientistId;
  tone: "celebrated" | "disgraced";
  ranking: readonly { scientistId: ScientistId; distance: number }[];
  explanation: string;
  seed: number;
  answeredCount: number;
  askedIds: readonly string[];
  lastEffectMagnitude: string | undefined;
  strain: readonly { stat: StatId; band: "low"; line: string }[];
  unlockedExtras: readonly string[];
  statHistory: readonly Record<StatId, number>[];
  pendingCardIds: readonly string[];
  blended?: boolean;
  secondaryScientistId?: ScientistId;
  trajectoryNote?: string }
```

The `run` phase holds the live stat vector, a seeded RNG seed, the list of already-asked
card IDs to avoid repeats, the current soft-tension texture lines (`strain`), the set of
unlocked extras (`unlockedExtras`), the per-card stat history (`statHistory`), and the branch
draw queue (`pendingCardIds`). `lastEffectMagnitude` is `undefined` until the first choice is
made, then a label string such as `"small"` or `"large"`.

`statHistory` follows the convention: index 0 is the initial 4C vector (before any card is
answered) and each subsequent index i is the 4C snapshot taken right after the i-th card is
answered. After `answeredCount` cards the array has `answeredCount + 1` entries. This is the
persisted record the trajectory signal reads to derive peak timing and volatility so a mid-run
reload reproduces the same `trajectoryNote`.

`pendingCardIds` holds card ids that a choice has unlocked (via `Choice.unlocks`) but the run
has not yet shown. The draw scheduler dequeues the first eligible pending id before the weighted
draw. The field is initialized empty and deduped on enqueue.

The `result` phase carries all the same fields as `run` plus: the matched scientist ID; the
full resemblance ranking (used to render the ordered name list without raw distances); the
plain-language explanation string; and three optional hybrid-result fields: `blended` (true
when the top-two blended scores fell within the effective margin), `secondaryScientistId`
(the runner-up when blended), and `trajectoryNote` (the digit-free peak-timing + volatility
sentence). All three optional fields are absent for non-hybrid results and older storage shapes.

`strain` entries each have a `stat` (one of the four `StatId` values), a `band` (`"low"`;
high-band strain was removed in an earlier revision), and a `line` string (the texture
sentence). The `unlockedExtras` array holds opaque token strings; the only token produced at
present is `"{scientistId}:source_notes"`, added when the run transitions to the result phase.

- The game exposes Restart and Reset controls so a player or tester can start a new run or
  clear saved progress entirely.

## Known gaps

- Document a stable exported JSON format only if content moves out of TypeScript source.
