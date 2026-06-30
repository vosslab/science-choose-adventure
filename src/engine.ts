import {
  DISGRACE_FLOOR,
  DRAW_WEIGHT_BASE,
  FLAVOR_EVERY,
  FLAVOR_MIN_MARGIN,
  LOW_PRESSURE_TEXTURE,
  MAGNITUDE_CONFIG,
  RUN_LENGTH,
  SCIENTIST_CONFIG,
  SCIENTIST_SIGNATURE,
  STARTING_STAT_VALUE,
  STAT_CONFIG,
  STAT_IDS,
  STAT_NORMAL_MAX,
  lowRisk,
  statBand,
  type EffectDirection,
  type EffectMagnitude,
  type ScientistId,
  type ScientistKind,
  type StatId,
} from "./config";
import {
  CORE_DECK,
  EVENT_DECK,
  FLAVOR_POOL,
  type CareerCard,
  type Choice,
  type Effect,
} from "./content";
import { type CardId } from "./brands";
import { celebratedIds, disgracedIds, rankSignatures } from "./selection";

// Re-export the ranking so existing callers (and tests that import rankSignatures from
// "../src/engine.ts") keep resolving to the same import path after the move to
// src/selection.ts. The path is unchanged; the metric itself now blends a weighted z-score
// distance with a cosine term rather than the earlier plain Euclidean distance. The body lives
// in src/selection.ts; this is a pure forwarding seam.
export { rankSignatures } from "./selection";

export type StatValues = Record<StatId, number>;

// One soft-tension texture line for a stat that is running low. Low is the only genuine
// pressure in the no-lose resemblance model, so strainLines only ever emits band "low";
// band is always "low" in the current model and the field exists only for storage-shape
// compatibility. Derived from stats on every render and never persisted as a separate source
// of truth.
export type StrainLine = {
  readonly stat: StatId;
  readonly band: "low";
  readonly line: string;
};

// One entry in the end-of-run resemblance ranking: a scientist and the raw Euclidean
// distance from the final 4C vector to that scientist's hand-authored signature. The
// distance is kept in state for tests and tie-break debugging; the UI shows names only.
export type RankingEntry = {
  readonly scientistId: ScientistId;
  readonly distance: number;
};

// statHistory convention: index 0 is the initial 4C vector (the stats before any card is
// answered), and each subsequent index i (i >= 1) is the 4C snapshot taken right after the
// i-th card is answered. So after answeredCount cards the array has answeredCount + 1
// entries. This is the persisted record a later trajectory lane reads to derive peak timing
// and volatility, so a mid-run reload reproduces the same result instead of recomputing.
//
// pendingCardIds is the deterministic branch/draw queue: card ids a choice has unlocked but
// the run has not yet shown. It starts empty. runChoice enqueues a choice's unlock target when
// it is not already asked or queued, and dequeues a card id once that card is committed, so the
// queue is a forced, seed-free branch path the scheduler peeks before drawing from the deck.
export type GameState =
  | {
      readonly phase: "run";
      readonly stats: StatValues;
      readonly seed: number;
      readonly answeredCount: number;
      readonly askedIds: readonly string[];
      readonly lastEffectMagnitude: string | undefined;
      readonly strain: readonly StrainLine[];
      readonly unlockedExtras: readonly string[];
      readonly statHistory: readonly StatValues[];
      readonly pendingCardIds: readonly CardId[];
    }
  | {
      readonly phase: "result";
      readonly stats: StatValues;
      readonly scientistId: ScientistId;
      // Which pool produced the match: "celebrated" for an honest run, "disgraced" for a
      // downfall run that bottomed out credibility. Drives the reveal headline and theme.
      readonly tone: ScientistKind;
      readonly ranking: readonly RankingEntry[];
      readonly explanation: string;
      readonly seed: number;
      readonly answeredCount: number;
      readonly askedIds: readonly string[];
      readonly lastEffectMagnitude: string | undefined;
      readonly strain: readonly StrainLine[];
      readonly unlockedExtras: readonly string[];
      readonly statHistory: readonly StatValues[];
      readonly pendingCardIds: readonly CardId[];
      // Hybrid-result fields, all optional so older saves and non-hybrid results stay valid
      // (the storage result guard tolerates missing/extra keys). blended is true when the
      // top-two resemblance scores fall within the (trajectory-shifted) HYBRID_MARGIN, in
      // which case secondaryScientistId names the runner-up the result blends toward. The
      // leader (scientistId) is always ranking[0]; these never change it. trajectoryNote is a
      // short, digit-free sentence describing the run's peak timing and volatility, always set
      // on a result and surfaced by the renderer.
      readonly blended?: boolean;
      readonly secondaryScientistId?: ScientistId;
      readonly trajectoryNote?: string;
    };

// Direction-only view of one choice's effect on a single stat. Magnitude is intentionally
// dropped here: the run UI lights affected meters up or down but never exposes effect size,
// keeping the no-magnitude rule of the run phase intact.
export type ChoiceEffectView = {
  readonly stat: StatId;
  readonly direction: EffectDirection;
};

export type VisibleCard =
  | {
      readonly kind: "run";
      readonly prompt: string;
      readonly choices: readonly [string, string];
      // Per-choice direction-only effects for the two choices, in [left, right] order. These
      // drive the Reigns-style meter glow during a drag and the hover/focus button preview.
      // Magnitude is omitted by design (see ChoiceEffectView).
      readonly choiceEffects: readonly [readonly ChoiceEffectView[], readonly ChoiceEffectView[]];
      readonly strain: readonly StrainLine[];
      // True only when the drawn card originated from EVENT_DECK (a rare extreme-gated event
      // card). Left absent for ordinary core cards so existing snapshots stay unchanged. The
      // renderer uses this as a neutral "rare event" affordance; it names no scientist.
      readonly isEvent?: boolean;
    }
  | {
      readonly kind: "result";
      readonly scientistId: ScientistId;
      readonly scientistName: string;
      // Mirrors GameState's result tone so the renderer can pick the celebrated or
      // downfall headline and theme without re-deriving the pool.
      readonly tone: ScientistKind;
      readonly headline: string;
      readonly explanation: string;
      readonly rationale: Record<StatId, string>;
      readonly ranking: readonly { readonly scientistId: ScientistId; readonly name: string }[];
      readonly strain: readonly StrainLine[];
      // Hybrid-reveal fields the renderer surfaces alongside the verbatim headline. blended
      // mirrors the result state's flag; when true, secondaryScientistId/secondaryScientistName
      // name the runner-up the headline already blends toward, so the renderer can style or link
      // the secondary without re-deriving it. trajectoryNote is the short digit-free run-shape
      // sentence (peak timing and volatility) the renderer shows under the explanation.
      readonly blended?: boolean;
      readonly secondaryScientistId?: ScientistId;
      readonly secondaryScientistName?: string;
      readonly trajectoryNote?: string;
    };

// Fixed default seed so the same choice sequence is byte-stable across runs. The engine
// uses no wall-clock or nondeterministic source; all variability flows from this seed
// advanced by mulberry32 on every draw, plus the player's choices. (Constant from the
// golden-ratio fractional bits, a common mulberry32 starting value.)
const DEFAULT_SEED = 0x9e3779b9;

// Per-stat emphasis ceiling so no single extreme stat can dominate the weighted draw.
// Added on top of DRAW_WEIGHT_BASE for cards that probe a stat the player is extreme in.
const STAT_EMPHASIS_CAP = 3;

// Cooldown window for the weighted core draw: a core card asked within the last
// COOLDOWN_WINDOW draws is held out of the candidate pool, so a recently-asked card is never
// redrawn inside the window. Set to RUN_LENGTH so the window spans the entire run. Because a
// run asks fewer than RUN_LENGTH cards before the reveal, the recent-window set always equals
// the full set of asked cards mid-run, which reproduces the prior "exclude every asked core
// card" behavior exactly -- the cooldown changes nothing today. It is the single deterministic
// knob for card reuse: lowering COOLDOWN_WINDOW (or growing the deck so the run cannot exhaust
// it) lets older cards return. The window is derived only from askedIds order, never wall-clock,
// so the draw stays fully seeded and reproducible.
const COOLDOWN_WINDOW = RUN_LENGTH;

// Hybrid blend window, measured on the BLENDED resemblance scale that rankSignatures now
// produces (weighted z-score distance + 0.25 * cosine distance), NOT raw 4C point distance.
// On that scale a pool's top-two scores typically differ by order 1 to 3, so a sub-half-unit
// gap means the run sits genuinely between two figures rather than clearly resembling one.
// When the top-two gap falls below this (after the small trajectory shift below), the result
// reports a secondary match and reads as a blend. Kept small so hybrids stay rare; tune up to
// blend more often, down to blend less.
const HYBRID_MARGIN = 0.4;

// How far a run's trajectory may shift the effective hybrid window, as a fraction of
// HYBRID_MARGIN. A decisive run (committed to one identity early and held steady) tightens the
// window so it blends less; an indecisive run (a late surge or sharp swings) widens it so it
// blends more. Bounded well under 1 so the shift only moves runs that already sit near the
// margin: a clear match (top-two gap far above HYBRID_MARGIN) can never become a blend, and the
// leader -- always ranking[0] -- is never changed by trajectory, so a clear match is never
// overturned. The shift only ever touches the blend flag and the named secondary.
// Fraction of HYBRID_MARGIN the trajectory shift may move the effective window (kept under 1).
const TRAJECTORY_SHIFT_FRACTION = 0.4;
const TRAJECTORY_MARGIN_SHIFT = HYBRID_MARGIN * TRAJECTORY_SHIFT_FRACTION;

// Volatility classifier knob: a run counts as volatile when its total path movement (the sum
// of per-card absolute stat deltas) exceeds this multiple of its net displacement (how far the
// final vector landed from the start). A scale-free ratio, so it needs no hard-coded magnitude
// numbers and stays correct if MAGNITUDE_CONFIG is retuned. Above ~1.5x net travel means the
// run wandered well beyond where it ended up.
const VOLATILITY_RATIO = 1.5;

// ============================================================================
// Seeded RNG (mulberry32)
// ============================================================================

// One mulberry32 step: takes an integer seed, returns the next float in [0, 1) and the
// advanced integer seed. Threading the integer seed through state keeps every draw
// reproducible without a hidden module-level generator.
function mulberry32(seed: number): { readonly value: number; readonly nextSeed: number } {
  // Advance the 32-bit state by the golden-ratio increment.
  let a = (seed + 0x6d2b79f5) | 0;
  let t = a;
  // Bit-mix the state through the standard mulberry32 nonlinear steps to produce a well-distributed float.
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  a = t | 0;
  const result = { value, nextSeed: a };
  return result;
}

// ============================================================================
// Stats
// ============================================================================

function initialStats(): StatValues {
  const stats = {
    credibility: STARTING_STAT_VALUE,
    curiosity: STARTING_STAT_VALUE,
    cash: STARTING_STAT_VALUE,
    care: STARTING_STAT_VALUE,
  };
  return stats;
}

// Floor a single stat at 0. There is no upper bound: a hard-pushed stat climbs without
// limit into the extreme band, and any value past the normal ceiling (STAT_NORMAL_MAX)
// routes the run to the disgraced downfall pool (see toResultState).
function floorStat(value: number): number {
  if (value < 0) {
    return 0;
  }
  return value;
}

// Resolve one effect's direction and magnitude against the pre-effect stats snapshot. When the
// effect carries a whenStatAtLeast condition that the snapshot satisfies (the named stat is at or
// above the threshold), swap in the alternate direction and/or magnitude from `then`; each field
// `then` omits keeps the effect's base value. The target stat is never swapped, so the effect
// always moves the same stat regardless of which resolution wins.
function resolveEffect(
  choiceEffect: Effect,
  preEffectStats: StatValues,
): { readonly direction: EffectDirection; readonly magnitude: EffectMagnitude } {
  const condition = choiceEffect.whenStatAtLeast;
  // Condition met: take the alternate, falling back to the base for any field `then` omits.
  if (condition !== undefined && preEffectStats[condition.stat] >= condition.value) {
    const swap = choiceEffect.then;
    const direction = swap?.direction ?? choiceEffect.direction;
    const magnitude = swap?.magnitude ?? choiceEffect.magnitude;
    const swapped = { direction, magnitude };
    return swapped;
  }
  // No condition, or condition not met: the base direction/magnitude apply unchanged.
  const base = { direction: choiceEffect.direction, magnitude: choiceEffect.magnitude };
  return base;
}

function applyChoiceEffects(stats: StatValues, choice: Choice): StatValues {
  const nextStats: StatValues = { ...stats };
  for (const choiceEffect of choice.effects) {
    // Resolve every effect against the pre-effect snapshot (the original `stats` argument, never
    // the running nextStats). An earlier effect in the same choice can therefore never change how
    // a later effect's condition evaluates, keeping resolution order-independent and deterministic.
    const resolved = resolveEffect(choiceEffect, stats);
    const config = MAGNITUDE_CONFIG[resolved.magnitude];
    const signedDelta = resolved.direction === "up" ? config.delta : -config.delta;
    // Floor after each effect so a stat can never go below 0. There is no upper cap:
    // extreme values are intentional and route the run to the disgraced downfall pool.
    nextStats[choiceEffect.stat] = floorStat(nextStats[choiceEffect.stat] + signedDelta);
  }
  return nextStats;
}

function visibleMagnitude(choice: Choice): string {
  let largestDelta = 0;
  let label: string = MAGNITUDE_CONFIG.small.label;
  for (const choiceEffect of choice.effects) {
    const config = MAGNITUDE_CONFIG[choiceEffect.magnitude];
    if (config.delta >= largestDelta) {
      largestDelta = config.delta;
      label = config.label;
    }
  }
  return label;
}

// ============================================================================
// Soft-tension texture
// ============================================================================

// Map every stat that is running low to its texture line. Derived fresh from stats each
// turn; stats from mid up yield no line, since high values are not a pressure. Order
// follows STAT_IDS for deterministic rendering.
function strainLines(stats: StatValues): readonly StrainLine[] {
  const lines: StrainLine[] = [];
  for (const statId of STAT_IDS) {
    // Only the low tiers (bad or warn) surface as strain; "ok" and high stats stay quiet.
    if (lowRisk(stats[statId]) !== "ok") {
      const line: StrainLine = { stat: statId, band: "low", line: LOW_PRESSURE_TEXTURE[statId] };
      lines.push(line);
    }
  }
  return lines;
}

// ============================================================================
// Explanation
// ============================================================================

// Order the 4C stats by how far they sit from the neutral 50 start (most-decisive first),
// then keep the two or three that genuinely lean off-neutral. Ties break by the fixed
// STAT_IDS order so any explanation built from this list is fully deterministic.
function decisiveStats(stats: StatValues): readonly StatId[] {
  const ordered: readonly StatId[] = [...STAT_IDS].sort((first, second) => {
    const firstSpread = Math.abs(stats[first] - STARTING_STAT_VALUE);
    const secondSpread = Math.abs(stats[second] - STARTING_STAT_VALUE);
    if (firstSpread !== secondSpread) {
      return secondSpread - firstSpread;
    }
    // Stable tie-break by STAT_IDS order keeps the ordering deterministic.
    return STAT_IDS.indexOf(first) - STAT_IDS.indexOf(second);
  });
  // Use three decisive Cs when the third still leans off-neutral, otherwise two.
  const thirdStat = ordered[2];
  const thirdSpread =
    thirdStat === undefined ? 0 : Math.abs(stats[thirdStat] - STARTING_STAT_VALUE);
  const decisiveCount = thirdSpread > 0 ? 3 : 2;
  const decisive = ordered.slice(0, decisiveCount);
  return decisive;
}

// Join short stat phrases into one capitalized sentence. The last phrase joins with " and ";
// any earlier phrases join with ", ". Shared by both explanation tones so separators and
// capitalization stay identical.
function joinDecisivePhrases(phrases: readonly string[]): string {
  const lastPhrase = phrases[phrases.length - 1] ?? "";
  const leadingPhrases = phrases.slice(0, -1);
  const joined =
    leadingPhrases.length === 0 ? lastPhrase : `${leadingPhrases.join(", ")} and ${lastPhrase}`;
  const firstPhrase = phrases[0] ?? "";
  const capitalizedFirst = firstPhrase.charAt(0).toUpperCase() + firstPhrase.slice(1);
  // Graft the capitalized first phrase onto the already-joined string so separators are not rebuilt.
  const restOfJoined =
    leadingPhrases.length === 0
      ? capitalizedFirst
      : `${capitalizedFirst}${joined.slice(firstPhrase.length)}`;
  const sentence = `${restOfJoined}.`;
  return sentence;
}

// Build a plain-language match sentence from the two or three most-decisive Cs, naming
// direction in words and never numbers. Used for the celebrated (honest-run) reveal.
function matchExplanation(stats: StatValues): string {
  const phrases: string[] = [];
  for (const statId of decisiveStats(stats)) {
    const label = STAT_CONFIG[statId].label.toLowerCase();
    const lean = stats[statId] >= STARTING_STAT_VALUE ? "stayed high" : "stayed low";
    phrases.push(`${label} ${lean}`);
  }
  const explanation = joinDecisivePhrases(phrases);
  return explanation;
}

// Build a plain-language downfall sentence from the two or three most-decisive Cs, framed
// as a cautionary collapse. A stat below neutral "cratered"; a stat above neutral "ran hot".
// Words only, no digits, so the engine-flow digit-free assertion holds for this tone too.
function downfallExplanation(stats: StatValues): string {
  const phrases: string[] = [];
  for (const statId of decisiveStats(stats)) {
    const label = STAT_CONFIG[statId].label.toLowerCase();
    const lean = stats[statId] >= STARTING_STAT_VALUE ? "ran hot" : "cratered";
    phrases.push(`${label} ${lean}`);
  }
  const explanation = joinDecisivePhrases(phrases);
  return explanation;
}

// ============================================================================
// Trajectory signal
// ============================================================================

// A deterministic summary of how a run unfolded, read from the persisted statHistory (one 4C
// snapshot per answered card, starting with the initial vector). Peak stat and timing answer
// "which C did the run commit to, and how early"; volatile answers "did it hold a line or
// swing". decisive folds both: an early, steady commitment. The signal carries no numbers; it
// is mapped to words for the note and to a small margin shift for the hybrid decision.
type TrajectorySignal = {
  readonly peakStat: StatId;
  readonly peakEarly: boolean;
  readonly volatile: boolean;
  readonly decisive: boolean;
};

// Reduce statHistory to a TrajectorySignal. peakStat is the C that reached the highest single
// value anywhere in the run (ties break by the fixed STAT_IDS order); peakEarly is true when
// that peak first occurs in the first half of the answered cards. volatile compares total path
// movement (summed per-card absolute deltas) against net displacement (start-to-finish travel):
// a path that wandered well past where it ended up is volatile. Every step is a pure function
// of the persisted history, so a mid-run reload reproduces the same signal.
function trajectorySignal(statHistory: readonly StatValues[]): TrajectorySignal {
  const lastIndex = statHistory.length - 1;
  // Find the stat with the largest value seen anywhere, and the earliest snapshot index at which
  // any stat reaches that overall maximum. STAT_IDS order is the deterministic tie-break.
  let peakStat: StatId = STAT_IDS[0];
  let peakValue = -Infinity;
  let peakIndex = 0;
  for (let index = 0; index < statHistory.length; index++) {
    const snapshot = statHistory[index];
    if (snapshot === undefined) {
      continue;
    }
    for (const statId of STAT_IDS) {
      const value = snapshot[statId];
      // Strict greater-than keeps the first stat (in STAT_IDS order) and the earliest snapshot
      // when values tie, so the choice is fully deterministic.
      if (value > peakValue) {
        peakValue = value;
        peakStat = statId;
        peakIndex = index;
      }
    }
  }
  // Early means the peak landed in the first half of the answered span. A run of length <= 1 has
  // no real span, so it counts as early (a flat, decisive baseline).
  const peakEarly = lastIndex <= 0 ? true : peakIndex <= lastIndex / 2;
  // Total path movement and net displacement, both scale-free sums of absolute stat deltas.
  let totalMovement = 0;
  for (let index = 1; index < statHistory.length; index++) {
    const previous = statHistory[index - 1];
    const current = statHistory[index];
    if (previous === undefined || current === undefined) {
      continue;
    }
    for (const statId of STAT_IDS) {
      totalMovement += Math.abs(current[statId] - previous[statId]);
    }
  }
  const first = statHistory[0];
  const last = statHistory[lastIndex];
  let netDisplacement = 0;
  if (first !== undefined && last !== undefined) {
    for (const statId of STAT_IDS) {
      netDisplacement += Math.abs(last[statId] - first[statId]);
    }
  }
  // Volatile when the run wandered well beyond its net travel. When it ended where it started
  // (zero net displacement) any movement at all reads as volatile (it went out and came back).
  const volatile =
    netDisplacement === 0 ? totalMovement > 0 : totalMovement > VOLATILITY_RATIO * netDisplacement;
  // Decisive: an early commitment that held steady. Its complement (a late surge or sharp swings)
  // is the indecisive, more-blendable shape.
  const decisive = peakEarly && !volatile;
  const signal: TrajectorySignal = { peakStat, peakEarly, volatile, decisive };
  return signal;
}

// Render the trajectory signal as one short, digit-free sentence for the reveal. Built from
// fixed word fragments so it never contains a numeral, keeping the digit-free reveal contract.
function trajectoryNoteText(signal: TrajectorySignal): string {
  const peakLabel = STAT_CONFIG[signal.peakStat].label.toLowerCase();
  const whenPart = signal.peakEarly ? "peaked early" : "surged late";
  const steadyPart = signal.volatile ? "amid sharp swings" : "and held steady";
  const note = `Your ${peakLabel} ${whenPart} ${steadyPart}.`;
  return note;
}

// Trajectory's bounded influence on the hybrid window: a decisive run tightens it (blends less),
// any other shape widens it (blends more). The magnitude is capped at TRAJECTORY_MARGIN_SHIFT so
// it can only move runs already near the margin -- never enough to blend a clear match, and never
// touching the leader.
function trajectoryMarginShift(signal: TrajectorySignal): number {
  if (signal.decisive) {
    return -TRAJECTORY_MARGIN_SHIFT;
  }
  return TRAJECTORY_MARGIN_SHIFT;
}

// ============================================================================
// Card draw
// ============================================================================

// Weight for one core card: a nonzero base plus a capped emphasis bump for each stat the
// card probes that the player currently sits extreme in. The cap keeps any one extreme
// stat from dominating draws, preserving replay variety across seeds.
function cardWeight(card: CareerCard, stats: StatValues): number {
  let weight = DRAW_WEIGHT_BASE;
  for (const statId of card.probes) {
    const band = statBand(stats[statId]);
    if (band === "low" || band === "high") {
      weight += 1;
    }
  }
  // Clamp the emphasis bump so a heavily-probed card cannot swamp the base weight.
  const maxWeight = DRAW_WEIGHT_BASE + STAT_EMPHASIS_CAP;
  if (weight > maxWeight) {
    return maxWeight;
  }
  return weight;
}

// Pick one eligible card by weight using a single RNG float. Returns the chosen card and
// the advanced seed. Eligibility (already-asked exclusion, leader flavor) is decided by
// the caller; this only does the weighted roll over the supplied candidate list.
function weightedPick(
  candidates: readonly CareerCard[],
  stats: StatValues,
  seed: number,
): { readonly card: CareerCard; readonly nextSeed: number } {
  let totalWeight = 0;
  for (const candidate of candidates) {
    totalWeight += cardWeight(candidate, stats);
  }
  const roll = mulberry32(seed);
  let target = roll.value * totalWeight;
  let chosen: CareerCard | undefined = undefined;
  for (const candidate of candidates) {
    chosen = candidate;
    target -= cardWeight(candidate, stats);
    if (target < 0) {
      break;
    }
  }
  // chosen is set on the first iteration; the loop only runs for a non-empty candidate
  // list. Callers return undefined before reaching here when the candidate list is empty,
  // so at least one candidate always exists. If floating-point slack leaves target >= 0,
  // chosen holds the last candidate, so a draw never returns nothing.
  if (chosen === undefined) {
    throw new Error("weightedPick called with an empty candidate list.");
  }
  const result = { card: chosen, nextSeed: roll.nextSeed };
  return result;
}

// True when one scientist leads the runner-up by at least FLAVOR_MIN_MARGIN in signature
// distance. The leader is the nearest scientist; the margin guards against an unstable
// front-runner so flavor only appears once an identity has genuinely emerged.
function flavorLeader(stats: StatValues): ScientistId | undefined {
  // Rank within the celebrated pool only: mid-run flavor surfaces an emerging celebrated
  // identity, never a disgraced one, so the blind run stays identical and the downfall pool
  // is reachable only at the end-of-run reveal.
  const ranking = rankSignatures(stats, celebratedIds());
  const leader = ranking[0];
  const runnerUp = ranking[1];
  if (leader === undefined || runnerUp === undefined) {
    return undefined;
  }
  const margin = runnerUp.distance - leader.distance;
  if (margin >= FLAVOR_MIN_MARGIN) {
    return leader.scientistId;
  }
  return undefined;
}

// Resolve a card id to its CareerCard. Branch targets (Choice.unlocks) and pending-queue
// entries point at real CORE_DECK or EVENT_DECK cards; this is the lookup the scheduler uses
// to turn a queued id back into a card. Linear search keeps it state-free over small decks.
function findCardById(id: CardId): CareerCard | undefined {
  for (const card of CORE_DECK) {
    if (card.id === id) {
      return card;
    }
  }
  for (const card of EVENT_DECK) {
    if (card.id === id) {
      return card;
    }
  }
  return undefined;
}

// Peek the first eligible pending (branch) card without consuming the queue. A pending id is
// eligible when it resolves to a real card and has not already been asked; unresolved or
// already-asked ids are skipped (the queue may outlive the cards it named). drawNextCard is a
// pure function of state, so it only peeks here; runChoice removes the consumed id from
// pendingCardIds when the card is actually committed. No RNG is consumed -- a branch card is a
// forced, deterministic pick, so the seed is unchanged.
function nextPendingCard(state: Extract<GameState, { phase: "run" }>): CareerCard | undefined {
  const askedSet = new Set(state.askedIds);
  for (const id of state.pendingCardIds) {
    const card = findCardById(id);
    if (card !== undefined && !askedSet.has(card.id)) {
      return card;
    }
  }
  return undefined;
}

// Seeded event-card injection. Only fires while the player is in the extreme band (some stat
// value strictly above STAT_NORMAL_MAX). An event card is eligible when one of its probed
// stats is the extreme one and the card has not already been asked, so each event fires at
// most once per run. When at least one eligible event card exists, it is chosen by the same
// weighted roll core cards use, advancing the seed. Returns undefined off-band or when
// EVENT_DECK has no eligible card for the extreme stat, leaving the rest of the scheduler intact.
function eligibleEventCard(
  state: Extract<GameState, { phase: "run" }>,
): { readonly card: CareerCard; readonly nextSeed: number } | undefined {
  const extreme = STAT_IDS.some((statId) => state.stats[statId] > STAT_NORMAL_MAX);
  if (!extreme) {
    return undefined;
  }
  const askedSet = new Set(state.askedIds);
  const candidates = EVENT_DECK.filter((card) => {
    if (askedSet.has(card.id)) {
      return false;
    }
    // Eligible only when one of the card's probed stats is itself in the extreme band.
    return card.probes.some((statId) => state.stats[statId] > STAT_NORMAL_MAX);
  });
  if (candidates.length === 0) {
    return undefined;
  }
  const picked = weightedPick(candidates, state.stats, state.seed);
  return picked;
}

// Decide the next card to show, in a fixed precedence order:
//   1. a pending branch card unlocked by an earlier choice (deterministic, no RNG);
//   2. else a seeded event card while some stat sits in the extreme band;
//   3. else a leader flavor card on the FLAVOR_EVERY cadence once a hidden leader has emerged;
//   4. else a weighted, not-recently-asked core card.
// Returns the card plus the advanced seed. With no unlocked branch cards and no stat in the
// extreme band, steps 1 and 2 are inert and the draw falls through to the normal flavor/core
// path.
//
// Exhaustion behavior: CORE_DECK is guaranteed >= 18 unique cards (enforced by content
// validation) against a RUN_LENGTH of 12, so the core pool cannot empty mid-run. Returns
// undefined only if the validated deck invariant is somehow violated, which the callers treat
// as a fatal error (see throw below).
function drawNextCard(
  state: Extract<GameState, { phase: "run" }>,
):
  | { readonly card: CareerCard; readonly nextSeed: number; readonly isEvent?: boolean }
  | undefined {
  // 1. Pending branch card: a forced, deterministic pick that bypasses the weighted draw.
  const pending = nextPendingCard(state);
  if (pending !== undefined) {
    const forced = { card: pending, nextSeed: state.seed };
    return forced;
  }
  // 2. Extreme-gated event injection (seeded). Draws only when a probe stat is in the extreme band
  // (> STAT_NORMAL_MAX); falls through otherwise. The event origin is recorded ONCE here as
  // isEvent: true so the renderer-facing path reads it from the draw result instead of
  // re-classifying the card id later. Only this branch sets the flag; every other branch leaves
  // it absent (treated as a non-event card).
  const event = eligibleEventCard(state);
  if (event !== undefined) {
    const eventDraw = { ...event, isEvent: true };
    return eventDraw;
  }
  // 3. Flavor injection cadence: attempt a leader flavor card every FLAVOR_EVERY draws.
  const askedSet = new Set(state.askedIds);
  const isFlavorTurn = state.answeredCount > 0 && state.answeredCount % FLAVOR_EVERY === 0;
  if (isFlavorTurn) {
    const leader = flavorLeader(state.stats);
    if (leader !== undefined) {
      const flavorCandidates = FLAVOR_POOL[leader].filter((card) => !askedSet.has(card.id));
      if (flavorCandidates.length > 0) {
        const picked = weightedPick(flavorCandidates, state.stats, state.seed);
        return picked;
      }
    }
  }
  // 4. Default path: weighted pick over core cards not asked within the cooldown window.
  // recentAsked is the tail of askedIds; with COOLDOWN_WINDOW == RUN_LENGTH it equals the full
  // asked set mid-run, so no core card repeats today (behavior-preserving).
  const recentAsked = new Set(state.askedIds.slice(-COOLDOWN_WINDOW));
  const coreCandidates = CORE_DECK.filter((card) => !recentAsked.has(card.id));
  if (coreCandidates.length === 0) {
    return undefined;
  }
  const picked = weightedPick(coreCandidates, state.stats, state.seed);
  return picked;
}

// ============================================================================
// Source-note unlock
// ============================================================================

// Add the matched scientist's source-notes token to the unlocked set (idempotent). The
// UI reads this token to reveal that scientist's source notes on the result screen.
function addUnlockedExtra(
  unlockedExtras: readonly string[],
  scientistId: ScientistId,
): readonly string[] {
  const extra = `${scientistId}:source_notes`;
  if (unlockedExtras.includes(extra)) {
    return unlockedExtras;
  }
  const nextExtras = [...unlockedExtras, extra];
  return nextExtras;
}

// ============================================================================
// State transitions
// ============================================================================

function initialRunState(): Extract<GameState, { phase: "run" }> {
  const stats = initialStats();
  const state: Extract<GameState, { phase: "run" }> = {
    phase: "run",
    stats,
    seed: DEFAULT_SEED,
    answeredCount: 0,
    askedIds: [],
    lastEffectMagnitude: undefined,
    strain: strainLines(stats),
    unlockedExtras: [],
    // statHistory starts with the initial vector at index 0 (see GameState convention).
    statHistory: [stats],
    // pendingCardIds starts empty; the draw scheduler lane will populate it later.
    pendingCardIds: [],
  };
  return state;
}

export function createInitialState(): GameState {
  const state = initialRunState();
  return state;
}

// Build the result state once the run reaches RUN_LENGTH answers: rank signatures, name
// the nearest scientist, write the plain-language explanation, and unlock its source notes.
function toResultState(
  state: Extract<GameState, { phase: "run" }>,
  answeredCount: number,
  askedIds: readonly string[],
  stats: StatValues,
  lastEffectMagnitude: string,
  seed: number,
  statHistory: readonly StatValues[],
  pendingCardIds: readonly CardId[],
): GameState {
  // Downfall when integrity collapses OR when any stat is driven into the extreme band.
  // A final credibility at or below DISGRACE_FLOOR, or any 4C stat pushed past the normal
  // ceiling (STAT_NORMAL_MAX), routes the match into the disgraced pool, else the
  // celebrated pool. Extreme hubris in any direction lands you in disgrace; the raw extreme
  // value then pulls the match toward the case that shares that extreme (extreme cash
  // toward the profit-harm case, extreme curiosity toward the reckless-research case, and
  // so on). The two pools are ranked separately so a disgraced figure is reachable only
  // through this branch.
  const extreme = STAT_IDS.some((statId) => stats[statId] > STAT_NORMAL_MAX);
  const downfall = stats.credibility <= DISGRACE_FLOOR || extreme;
  const tone: ScientistKind = downfall ? "disgraced" : "celebrated";
  const pool = downfall ? disgracedIds() : celebratedIds();
  const ranking = rankSignatures(stats, pool);
  const leader = ranking[0];
  if (leader === undefined) {
    throw new Error("Signature ranking is empty; no scientist to match.");
  }
  const scientistId = leader.scientistId;
  // Celebrated runs get the match sentence; downfall runs get the cautionary collapse line.
  const explanation = downfall ? downfallExplanation(stats) : matchExplanation(stats);
  // Hybrid decision on the blended resemblance scale. The runner-up may not exist for a
  // one-scientist pool, so guard ranking[1]. The top-two gap is shifted by the run's trajectory
  // (decisive runs tighten the window, indecisive ones widen it) but never enough to blend a
  // clear match; the leader stays ranking[0] regardless, so trajectory never overturns a match.
  const signal = trajectorySignal(statHistory);
  const trajectoryNote = trajectoryNoteText(signal);
  const runnerUp = ranking[1];
  const effectiveMargin = HYBRID_MARGIN + trajectoryMarginShift(signal);
  const topTwoGap = runnerUp === undefined ? Infinity : runnerUp.distance - leader.distance;
  const blended = topTwoGap < effectiveMargin;
  // Name the secondary only when the result actually blends; otherwise leave it unset so a clear
  // result carries no misleading runner-up.
  const secondaryScientistId = blended && runnerUp !== undefined ? runnerUp.scientistId : undefined;
  const resultState: GameState = {
    phase: "result",
    stats,
    scientistId,
    tone,
    ranking,
    explanation,
    seed,
    answeredCount,
    askedIds,
    lastEffectMagnitude,
    strain: strainLines(stats),
    unlockedExtras: addUnlockedExtra(state.unlockedExtras, scientistId),
    statHistory,
    pendingCardIds,
    blended,
    secondaryScientistId,
    trajectoryNote,
  };
  return resultState;
}

// Apply one choice during the run: find the currently-drawn card, mutate stats, mark the
// card asked, then either continue the run or transition to the result reveal.
function runChoice(state: Extract<GameState, { phase: "run" }>, choiceIndex: 0 | 1): GameState {
  const drawn = drawNextCard(state);
  if (drawn === undefined) {
    // CORE_DECK >= 18 and RUN_LENGTH = 12 means this path is unreachable after content
    // validation runs at startup. Throw rather than fabricate a result from missing data.
    throw new Error("drawNextCard: no card available; content validation should prevent this");
  }
  const selectedChoice = drawn.card.choices[choiceIndex];
  const nextStats = applyChoiceEffects(state.stats, selectedChoice);
  const lastEffectMagnitude = visibleMagnitude(selectedChoice);
  const answeredCount = state.answeredCount + 1;
  const askedIds: readonly string[] = [...state.askedIds, drawn.card.id];
  // Append the post-card snapshot so statHistory stays one longer than answeredCount
  // (index 0 is the initial vector; see the GameState convention comment).
  const statHistory: readonly StatValues[] = [...state.statHistory, nextStats];
  // Update the pending draw queue. First drop the just-shown card's id (a no-op unless this
  // draw consumed a pending branch card -- nextPendingCard only peeks, so the dequeue happens
  // here at commit time). Then enqueue the picked choice's branch link, if any: skip it when
  // it is already asked (this run has shown it, including the card just answered) or already
  // queued, so a branch never replays a seen card or double-queues the same follow-up.
  const askedAfter = new Set(askedIds);
  let pendingCardIds: readonly CardId[] = state.pendingCardIds.filter((id) => id !== drawn.card.id);
  const unlock = selectedChoice.unlocks;
  if (unlock !== undefined && !askedAfter.has(unlock) && !pendingCardIds.includes(unlock)) {
    pendingCardIds = [...pendingCardIds, unlock];
  }
  if (answeredCount >= RUN_LENGTH) {
    const result = toResultState(
      state,
      answeredCount,
      askedIds,
      nextStats,
      lastEffectMagnitude,
      drawn.nextSeed,
      statHistory,
      pendingCardIds,
    );
    return result;
  }
  const nextState: GameState = {
    phase: "run",
    stats: nextStats,
    seed: drawn.nextSeed,
    answeredCount,
    askedIds,
    lastEffectMagnitude,
    strain: strainLines(nextStats),
    unlockedExtras: state.unlockedExtras,
    statHistory,
    pendingCardIds,
  };
  return nextState;
}

export function choose(state: GameState, choiceIndex: 0 | 1): GameState {
  if (state.phase === "run") {
    return runChoice(state, choiceIndex);
  }
  // Defensive fallback: result-phase input is guarded in main.ts before reaching choose().
  return createInitialState();
}

// ============================================================================
// Visible card
// ============================================================================

// Reduce a Choice to its direction-only effect views (stat + up/down), dropping magnitude.
// Used to feed the run UI's meter glow and button preview without exposing effect size.
function choiceEffectViews(choice: Choice): readonly ChoiceEffectView[] {
  const views = choice.effects.map((choiceEffect) => {
    const view: ChoiceEffectView = {
      stat: choiceEffect.stat,
      direction: choiceEffect.direction,
    };
    return view;
  });
  return views;
}

function runVisibleCard(state: Extract<GameState, { phase: "run" }>): VisibleCard {
  const drawn = drawNextCard(state);
  if (drawn === undefined) {
    // CORE_DECK >= 18 and RUN_LENGTH = 12 means this path is unreachable after content
    // validation runs at startup. Throw rather than render a blank card with empty text.
    throw new Error("drawNextCard: no card available; content validation should prevent this");
  }
  const choices: readonly [string, string] = [
    drawn.card.choices[0].label,
    drawn.card.choices[1].label,
  ];
  // Direction-only effects for each choice, drawn from the SAME card runChoice() will apply
  // (drawNextCard is a pure function of state), so the previewed glow always matches the
  // committed effect. Magnitude is dropped here to honor the run-phase no-magnitude rule.
  const choiceEffects: readonly [readonly ChoiceEffectView[], readonly ChoiceEffectView[]] = [
    choiceEffectViews(drawn.card.choices[0]),
    choiceEffectViews(drawn.card.choices[1]),
  ];
  const card: VisibleCard = {
    kind: "run",
    prompt: drawn.card.prompt,
    choices,
    choiceEffects,
    strain: state.strain,
    // Flag event origin from the draw result, set once at draw time on the event-injection
    // branch of drawNextCard (no renderer-side rescan of EVENT_DECK). The key stays absent for
    // core cards via the conditional spread, so existing core snapshots are unaffected.
    ...(drawn.isEvent === true ? { isEvent: true } : {}),
  };
  return card;
}

function resultVisibleCard(state: Extract<GameState, { phase: "result" }>): VisibleCard {
  const scientistName = SCIENTIST_CONFIG[state.scientistId].name;
  // A result blends only when the flag is set AND a runner-up was named (a one-scientist pool
  // never blends). Resolving the name here keeps the renderer from re-deriving it.
  const blended = state.blended === true && state.secondaryScientistId !== undefined;
  const secondaryScientistId = blended ? state.secondaryScientistId : undefined;
  const secondaryScientistName =
    secondaryScientistId === undefined ? undefined : SCIENTIST_CONFIG[secondaryScientistId].name;
  // The headline is the final display string the renderer shows verbatim. Four shapes by tone and
  // blend: a celebrated single resemblance or a "between X and Y" blend; a disgraced single case
  // echo ("Your choices echo the {name} case.") or a both-cases blend. Framing the disgraced
  // copy around the case (not the person) keeps company/regulatory matches from implying personal
  // resemblance.
  let headline: string;
  if (state.tone === "disgraced") {
    headline =
      blended && secondaryScientistName !== undefined
        ? `Your choices echo both the ${scientistName} and ${secondaryScientistName} cases.`
        : `Your choices echo the ${scientistName} case.`;
  } else {
    headline =
      blended && secondaryScientistName !== undefined
        ? `You land between ${scientistName} and ${secondaryScientistName}.`
        : `You most resemble ${scientistName}.`;
  }
  const rationale = SCIENTIST_SIGNATURE[state.scientistId].rationale;
  const ranking = state.ranking.map((entry) => {
    const named = {
      scientistId: entry.scientistId,
      name: SCIENTIST_CONFIG[entry.scientistId].name,
    };
    return named;
  });
  const card: VisibleCard = {
    kind: "result",
    scientistId: state.scientistId,
    scientistName,
    tone: state.tone,
    headline,
    explanation: state.explanation,
    rationale,
    ranking,
    strain: state.strain,
    blended,
    secondaryScientistId,
    secondaryScientistName,
    trajectoryNote: state.trajectoryNote,
  };
  return card;
}

export function currentVisibleCard(state: GameState): VisibleCard {
  if (state.phase === "run") {
    return runVisibleCard(state);
  }
  return resultVisibleCard(state);
}
