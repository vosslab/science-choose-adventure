import {
  DRAW_WEIGHT_BASE,
  FLAVOR_EVERY,
  FLAVOR_MIN_MARGIN,
  LOW_PRESSURE_TEXTURE,
  MAGNITUDE_CONFIG,
  RUN_LENGTH,
  SCIENTIST_CONFIG,
  SCIENTIST_IDS,
  SCIENTIST_SIGNATURE,
  STARTING_STAT_VALUE,
  STAT_CONFIG,
  STAT_IDS,
  lowRisk,
  statBand,
  type EffectDirection,
  type ScientistId,
  type StatId,
} from "./config";
import { CORE_DECK, FLAVOR_POOL, type CareerCard, type Choice } from "./content";

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
    }
  | {
      readonly phase: "result";
      readonly stats: StatValues;
      readonly scientistId: ScientistId;
      readonly ranking: readonly RankingEntry[];
      readonly explanation: string;
      readonly seed: number;
      readonly answeredCount: number;
      readonly askedIds: readonly string[];
      readonly lastEffectMagnitude: string | undefined;
      readonly strain: readonly StrainLine[];
      readonly unlockedExtras: readonly string[];
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
    }
  | {
      readonly kind: "result";
      readonly scientistId: ScientistId;
      readonly scientistName: string;
      readonly headline: string;
      readonly explanation: string;
      readonly rationale: Record<StatId, string>;
      readonly ranking: readonly { readonly scientistId: ScientistId; readonly name: string }[];
      readonly strain: readonly StrainLine[];
    };

// Fixed default seed so the same choice sequence is byte-stable across runs. The engine
// uses no wall-clock or nondeterministic source; all variability flows from this seed
// advanced by mulberry32 on every draw, plus the player's choices. (Constant from the
// golden-ratio fractional bits, a common mulberry32 starting value.)
const DEFAULT_SEED = 0x9e3779b9;

// Per-stat emphasis ceiling so no single extreme stat can dominate the weighted draw.
// Added on top of DRAW_WEIGHT_BASE for cards that probe a stat the player is extreme in.
const STAT_EMPHASIS_CAP = 3;

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

// Clamp a single stat into the playable [0, 100] band so extremes never overflow.
function clampStat(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
}

function applyChoiceEffects(stats: StatValues, choice: Choice): StatValues {
  const nextStats: StatValues = { ...stats };
  for (const choiceEffect of choice.effects) {
    const config = MAGNITUDE_CONFIG[choiceEffect.magnitude];
    const signedDelta = choiceEffect.direction === "up" ? config.delta : -config.delta;
    // Clamp after each effect so a card can never push a stat past 0 or 100.
    nextStats[choiceEffect.stat] = clampStat(nextStats[choiceEffect.stat] + signedDelta);
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
// Signature ranking and explanation
// ============================================================================

// Euclidean distance between a 4C vector and a scientist's signature values.
function signatureDistance(stats: StatValues, scientistId: ScientistId): number {
  const signature = SCIENTIST_SIGNATURE[scientistId].values;
  let sumOfSquares = 0;
  for (const statId of STAT_IDS) {
    const delta = stats[statId] - signature[statId];
    sumOfSquares += delta * delta;
  }
  const distance = Math.sqrt(sumOfSquares);
  return distance;
}

// Sort all scientists by ascending distance to their signature. Ties break by the fixed
// SCIENTIST_IDS order so the ranking (and the named leader) is fully deterministic.
export function rankSignatures(stats: StatValues): readonly RankingEntry[] {
  const entries: RankingEntry[] = [];
  for (const scientistId of SCIENTIST_IDS) {
    const distance = signatureDistance(stats, scientistId);
    entries.push({ scientistId, distance });
  }
  // SCIENTIST_IDS order is the stable tie-break: compare distance, then original index.
  const orderIndex = (id: ScientistId): number => SCIENTIST_IDS.indexOf(id);
  entries.sort((first, second) => {
    if (first.distance !== second.distance) {
      return first.distance - second.distance;
    }
    return orderIndex(first.scientistId) - orderIndex(second.scientistId);
  });
  return entries;
}

// Build a plain-language match sentence from the two or three most-decisive Cs (those
// furthest from the neutral 50, high or low), naming direction in words and never numbers.
function matchExplanation(stats: StatValues): string {
  // Rank stats by how far they sit from neutral so the most-decisive Cs lead the sentence.
  const ordered: readonly StatId[] = [...STAT_IDS].sort((first, second) => {
    const firstSpread = Math.abs(stats[first] - STARTING_STAT_VALUE);
    const secondSpread = Math.abs(stats[second] - STARTING_STAT_VALUE);
    if (firstSpread !== secondSpread) {
      return secondSpread - firstSpread;
    }
    // Stable tie-break by STAT_IDS order keeps the sentence deterministic.
    return STAT_IDS.indexOf(first) - STAT_IDS.indexOf(second);
  });
  // Use three decisive Cs when the third still leans off-neutral, otherwise two.
  const thirdStat = ordered[2];
  const thirdSpread =
    thirdStat === undefined ? 0 : Math.abs(stats[thirdStat] - STARTING_STAT_VALUE);
  const decisiveCount = thirdSpread > 0 ? 3 : 2;
  const phrases: string[] = [];
  for (const statId of ordered.slice(0, decisiveCount)) {
    const label = STAT_CONFIG[statId].label.toLowerCase();
    const lean = stats[statId] >= STARTING_STAT_VALUE ? "stayed high" : "stayed low";
    phrases.push(`${label} ${lean}`);
  }
  // Join with commas and a trailing "and" for natural reading. The last phrase joins with
  // " and "; any earlier phrases join with ", ".
  const lastPhrase = phrases[phrases.length - 1] ?? "";
  const leadingPhrases = phrases.slice(0, -1);
  const joined =
    leadingPhrases.length === 0 ? lastPhrase : `${leadingPhrases.join(", ")} and ${lastPhrase}`;
  const firstPhrase = phrases[0] ?? "";
  const capitalizedFirst = firstPhrase.charAt(0).toUpperCase() + firstPhrase.slice(1);
  // Graft the capitalized first phrase onto the already-joined string so the separators are not rebuilt.
  const restOfJoined =
    leadingPhrases.length === 0
      ? capitalizedFirst
      : `${capitalizedFirst}${joined.slice(firstPhrase.length)}`;
  const explanation = `${restOfJoined}.`;
  return explanation;
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
  const ranking = rankSignatures(stats);
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

// Decide the next card to show. Every FLAVOR_EVERY draws, if a hidden leader has emerged
// and has an unseen flavor card, inject that leader's flavor card; otherwise draw a
// weighted, not-yet-asked core card. Returns the card plus the advanced seed.
//
// Exhaustion behavior: CORE_DECK is guaranteed >= 18 unique cards (enforced by content
// validation) against a RUN_LENGTH of 12, so the not-yet-asked core pool cannot empty
// mid-run. Returns undefined only if the validated deck invariant is somehow violated,
// which the callers treat as a fatal error (see throw below).
function drawNextCard(
  state: Extract<GameState, { phase: "run" }>,
): { readonly card: CareerCard; readonly nextSeed: number } | undefined {
  const askedSet = new Set(state.askedIds);
  // Flavor injection cadence: attempt a leader flavor card every FLAVOR_EVERY draws.
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
  // Default path: weighted pick over not-yet-asked core cards.
  const coreCandidates = CORE_DECK.filter((card) => !askedSet.has(card.id));
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
): GameState {
  const ranking = rankSignatures(stats);
  const leader = ranking[0];
  if (leader === undefined) {
    throw new Error("Signature ranking is empty; no scientist to match.");
  }
  const scientistId = leader.scientistId;
  const explanation = matchExplanation(stats);
  const resultState: GameState = {
    phase: "result",
    stats,
    scientistId,
    ranking,
    explanation,
    seed,
    answeredCount,
    askedIds,
    lastEffectMagnitude,
    strain: strainLines(stats),
    unlockedExtras: addUnlockedExtra(state.unlockedExtras, scientistId),
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
  if (answeredCount >= RUN_LENGTH) {
    const result = toResultState(
      state,
      answeredCount,
      askedIds,
      nextStats,
      lastEffectMagnitude,
      drawn.nextSeed,
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
  };
  return card;
}

function resultVisibleCard(state: Extract<GameState, { phase: "result" }>): VisibleCard {
  const scientistName = SCIENTIST_CONFIG[state.scientistId].name;
  const headline = `You most resemble ${scientistName}`;
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
    headline,
    explanation: state.explanation,
    rationale,
    ranking,
    strain: state.strain,
  };
  return card;
}

export function currentVisibleCard(state: GameState): VisibleCard {
  if (state.phase === "run") {
    return runVisibleCard(state);
  }
  return resultVisibleCard(state);
}
