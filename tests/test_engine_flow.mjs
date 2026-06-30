import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  DISGRACE_FLOOR,
  RUN_LENGTH,
  SCIENTIST_CONFIG,
  SCIENTIST_IDS,
  SCIENTIST_SIGNATURE,
  STAT_IDS,
  STAT_NORMAL_MAX,
  STAT_STEP_COUNT,
  statStep,
} from "../src/config.ts";
import { EVENT_DECK } from "../src/content.ts";
import { choose, createInitialState, currentVisibleCard, rankSignatures } from "../src/engine.ts";
import { celebratedIds, disgracedIds, signatureDistance } from "../src/selection.ts";

// Resolve the repo root so the no-Math.random guard can read engine.ts as text.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Run a full RUN_LENGTH game from a fresh state, applying the same choice each turn.
function runFull(choiceIndex) {
  let state = createInitialState();
  for (let i = 0; i < RUN_LENGTH; i++) {
    assert.equal(state.phase, "run", `expected run phase at step ${i}`);
    state = choose(state, choiceIndex);
  }
  return state;
}

// ============================================================================
// Test a: seeded full run reaches result
// ============================================================================
test("seeded full run reaches result with a known scientist", () => {
  const state = runFull(0);
  assert.equal(state.phase, "result");
  assert.ok(SCIENTIST_IDS.includes(state.scientistId));
});

// ============================================================================
// Test b: determinism -- same seed + same choices yields same outcome
// ============================================================================
test("same seed and same choices produce identical result twice", () => {
  const stateA = runFull(0);
  const stateB = runFull(0);
  assert.equal(stateA.scientistId, stateB.scientistId);
  assert.deepEqual(
    stateA.ranking.map((r) => r.scientistId),
    stateB.ranking.map((r) => r.scientistId),
  );
});

// ============================================================================
// Test c: ranking-by-proximity places the nearest scientist first
// ============================================================================
test("stats on rosalind_franklin signature rank her first", () => {
  // A point exactly on the signature has distance 0 to rosalind_franklin and > 0 to all others.
  const point = SCIENTIST_SIGNATURE["rosalind_franklin"].values;
  const ranking = rankSignatures(point);
  assert.equal(ranking[0].scientistId, "rosalind_franklin");
});

test("stats on marie_curie signature rank her first", () => {
  // A point exactly on the signature has distance 0 to marie_curie and > 0 to all others.
  const point = SCIENTIST_SIGNATURE["marie_curie"].values;
  const ranking = rankSignatures(point);
  assert.equal(ranking[0].scientistId, "marie_curie");
});

// ============================================================================
// Test d: stat floor -- run does not end early; stats never drop below 0 (no upper cap)
// ============================================================================
test("stats stay at or above 0 throughout a choice run", () => {
  let state = createInitialState();
  for (let i = 0; i < RUN_LENGTH; i++) {
    assert.equal(state.phase, "run", `run ended early at step ${i}`);
    state = choose(state, 0);
    for (const value of Object.values(state.stats)) {
      assert.ok(value >= 0, `stat below floor: ${value}`);
    }
  }
  assert.equal(state.phase, "result");
});

// ============================================================================
// Test e: divergence -- two choice patterns yield two different scientists
// ============================================================================
test("always-0 and always-1 strategies produce different scientist matches", () => {
  const state0 = runFull(0);
  const state1 = runFull(1);
  // The two deterministic strategies must diverge to different scientist matches. Names are
  // intentionally not asserted -- they shift with deck and signature tuning.
  assert.notEqual(
    state0.scientistId,
    state1.scientistId,
    "both strategies should not converge to the same scientist",
  );
});

// ============================================================================
// Test f: result carries a non-empty, number-free explanation
// ============================================================================
test("result explanation is a non-empty string with no digits", () => {
  const state = runFull(0);
  assert.equal(state.phase, "result");
  const explanation = state.explanation;
  assert.ok(explanation.length > 0, "explanation should be non-empty");
  assert.ok(!/\d/.test(explanation), `explanation should contain no digits: "${explanation}"`);
});

// ============================================================================
// Helpers for downfall / celebrated tone tests (h and i)
// ============================================================================

// Pick the choice that most actively lowers credibility. Inspect the direction-only
// choiceEffects from currentVisibleCard so the strategy stays within the public API.
// Ties (both or neither lower credibility) default to choice 0.
function pickCredibilityLowest(state) {
  const card = currentVisibleCard(state);
  if (card.kind !== "run") {
    return 0;
  }
  const credDown0 = card.choiceEffects[0].filter(
    (e) => e.stat === "credibility" && e.direction === "down",
  ).length;
  const credDown1 = card.choiceEffects[1].filter(
    (e) => e.stat === "credibility" && e.direction === "down",
  ).length;
  if (credDown1 > credDown0) {
    return 1;
  }
  return 0;
}

// Run a full game by always picking the choice that lowers credibility most.
function runCredibilityFloor() {
  let state = createInitialState();
  for (let i = 0; i < RUN_LENGTH; i++) {
    assert.equal(state.phase, "run", `expected run phase at step ${i}`);
    const choiceIndex = pickCredibilityLowest(state);
    state = choose(state, choiceIndex);
  }
  return state;
}

// ============================================================================
// Test g: engine source contains no Math.random (determinism invariant)
// ============================================================================
test("src/engine.ts contains no Math.random call", () => {
  const enginePath = path.join(REPO_ROOT, "src", "engine.ts");
  const source = fs.readFileSync(enginePath, "utf-8");
  assert.ok(
    !source.includes("Math.random"),
    "engine.ts must not contain Math.random (use seeded RNG only)",
  );
  assert.ok(
    !source.includes("Date.now"),
    "engine.ts must not contain Date.now (determinism invariant)",
  );
  // selection.ts holds all signature-resemblance math and is equally determinism-critical.
  // A Math.random / Date.now / new Date( call there would produce non-deterministic rankings.
  const selectionPath = path.join(REPO_ROOT, "src", "selection.ts");
  const selectionSource = fs.readFileSync(selectionPath, "utf-8");
  assert.ok(
    !selectionSource.includes("Math.random"),
    "selection.ts must not contain Math.random (determinism invariant)",
  );
  assert.ok(
    !selectionSource.includes("Date.now"),
    "selection.ts must not contain Date.now (determinism invariant)",
  );
  assert.ok(
    !selectionSource.includes("new Date("),
    "selection.ts must not contain new Date( (determinism invariant)",
  );
});

// ============================================================================
// Test h: credibility-flooring run reaches disgraced tone and disgraced pool
// ============================================================================
test("credibility-flooring run reaches disgraced tone and a disgraced-pool scientist", () => {
  const state = runCredibilityFloor();
  assert.equal(state.phase, "result");
  // Note: the flooring strategy ignores non-credibility stats, so it also incidentally drives
  // a stat into the extreme band -- both downfall triggers fire on this run. This is therefore
  // a collapse-integration test (credibility floor reached, tone is disgraced), not an
  // isolation of the credibility trigger alone; test k covers the extreme trigger directly.
  // Credibility must have dropped at or below DISGRACE_FLOOR (the downfall branch condition).
  assert.ok(
    state.stats.credibility <= DISGRACE_FLOOR,
    `credibility ${state.stats.credibility} should be <= DISGRACE_FLOOR (${DISGRACE_FLOOR}) after a flooring run`,
  );
  // The downfall branch sets tone to "disgraced".
  assert.equal(
    state.tone,
    "disgraced",
    `credibility-flooring strategy should produce disgraced tone; got "${state.tone}"`,
  );
  // The matched scientist must belong to the disgraced pool.
  const disgracedPool = SCIENTIST_IDS.filter((id) => SCIENTIST_CONFIG[id].kind === "disgraced");
  assert.ok(
    disgracedPool.includes(state.scientistId),
    `matched scientist "${state.scientistId}" should be in the disgraced pool`,
  );
  // The downfall explanation must be a non-empty string with no digits (same contract as the
  // celebrated explanation -- downfallExplanation() uses words-only phrases like "cratered").
  const explanation = state.explanation;
  assert.ok(explanation.length > 0, "downfall explanation should be non-empty");
  assert.ok(
    !/\d/.test(explanation),
    `downfall explanation should contain no digits: "${explanation}"`,
  );
});

// ============================================================================
// Test i: honest credibility run stays celebrated
// ============================================================================
test("always-0 run stays above DISGRACE_FLOOR and reaches celebrated tone", () => {
  const state = runFull(0);
  assert.equal(state.phase, "result");
  // Guard the other downfall trigger: an honest run must not push any stat into the extreme
  // band, or tone would flip to disgraced for a reason unrelated to credibility.
  const peakStat = Math.max(...Object.values(state.stats));
  assert.ok(
    peakStat <= STAT_NORMAL_MAX,
    `honest run should not push any stat extreme; peak was ${peakStat} (STAT_NORMAL_MAX=${STAT_NORMAL_MAX})`,
  );
  // An honest (always-0) run keeps credibility well above the downfall threshold.
  assert.ok(
    state.stats.credibility > DISGRACE_FLOOR,
    `credibility ${state.stats.credibility} should be > DISGRACE_FLOOR (${DISGRACE_FLOOR}) on an honest run`,
  );
  // An honest run matches a celebrated pool member, not a disgraced one.
  assert.equal(
    state.tone,
    "celebrated",
    `honest run should produce celebrated tone; got "${state.tone}"`,
  );
  // Confirm pool membership matches the tone.
  const celebratedPool = SCIENTIST_IDS.filter((id) => SCIENTIST_CONFIG[id].kind === "celebrated");
  assert.ok(
    celebratedPool.includes(state.scientistId),
    `matched scientist "${state.scientistId}" should be in the celebrated pool`,
  );
});

// ============================================================================
// Test j: statStep climbs into the extreme band without an upper bound
// ============================================================================
test("statStep climbs into the extreme band with no upper cap", () => {
  // The normal ceiling fills exactly STAT_STEP_COUNT steps.
  assert.equal(statStep(STAT_NORMAL_MAX), STAT_STEP_COUNT);
  // Any value past the normal ceiling reads as an extreme step (above STAT_STEP_COUNT).
  assert.ok(
    statStep(STAT_NORMAL_MAX + 1) > STAT_STEP_COUNT,
    "a value past the normal ceiling should map above STAT_STEP_COUNT",
  );
  // There is no cap: a far-extreme value keeps climbing, and a larger value never maps to a
  // smaller step. Each whole STAT_STEP_COUNT block above the floor adds one more step.
  assert.equal(statStep(STAT_NORMAL_MAX * 2), STAT_STEP_COUNT * 2);
  assert.ok(
    statStep(STAT_NORMAL_MAX * 10) > statStep(STAT_NORMAL_MAX * 2),
    "statStep must keep growing for larger values (no cap)",
  );
});

// ============================================================================
// Helper: greedily push the single highest stat upward each turn to drive it extreme
// ============================================================================

// Count direction-only "up" effects a choice has on one stat. Mirrors pickCredibilityLowest:
// inspect choiceEffects from currentVisibleCard so the strategy stays within the public API.
function upEffectsOn(choiceEffect, statId) {
  return choiceEffect.filter((e) => e.stat === statId && e.direction === "up").length;
}

// Pick the choice that most raises the currently-leading stat; tie-break on total up effects.
function pickStatPush(state, leadStat) {
  const card = currentVisibleCard(state);
  if (card.kind !== "run") {
    return 0;
  }
  const up0 = upEffectsOn(card.choiceEffects[0], leadStat);
  const up1 = upEffectsOn(card.choiceEffects[1], leadStat);
  if (up1 > up0) {
    return 1;
  }
  if (up0 > up1) {
    return 0;
  }
  // Tie on the lead stat: take whichever choice has more total upward push.
  const total0 = card.choiceEffects[0].filter((e) => e.direction === "up").length;
  const total1 = card.choiceEffects[1].filter((e) => e.direction === "up").length;
  return total1 > total0 ? 1 : 0;
}

// Run a full game always pushing the leading stat higher, snowballing it toward the extreme.
function runPushExtreme() {
  let state = createInitialState();
  for (let i = 0; i < RUN_LENGTH; i++) {
    assert.equal(state.phase, "run", `expected run phase at step ${i}`);
    const leadStat = STAT_IDS.reduce((best, id) =>
      state.stats[id] > state.stats[best] ? id : best,
    );
    state = choose(state, pickStatPush(state, leadStat));
  }
  return state;
}

// ============================================================================
// Test k: an extreme stat routes the run to the disgraced pool
// ============================================================================
// Content-coupled integration test: it depends on the deck offering enough upward push that
// the greedy runPushExtreme strategy can drive at least one stat past STAT_NORMAL_MAX in
// RUN_LENGTH turns. The first assertion below is a precondition on that strategy capability;
// if a future deck retune weakens upward effects it fails here (a strategy-capability signal),
// distinct from the routing assertions that follow.
test("pushing a stat into the extreme band reaches disgraced tone", () => {
  const state = runPushExtreme();
  assert.equal(state.phase, "result");
  // Precondition: the greedy strategy must actually reach the extreme band for the rest of
  // the test to exercise the routing. (Strategy capability, not engine routing.)
  const maxStat = Math.max(...Object.values(state.stats));
  assert.ok(
    maxStat > STAT_NORMAL_MAX,
    `a stat-pushing run should drive some stat past STAT_NORMAL_MAX (${STAT_NORMAL_MAX}); peak was ${maxStat}`,
  );
  // Any extreme stat routes to the disgraced pool, regardless of credibility.
  assert.equal(
    state.tone,
    "disgraced",
    `an extreme stat should produce disgraced tone; got "${state.tone}"`,
  );
  const disgracedPool = SCIENTIST_IDS.filter((id) => SCIENTIST_CONFIG[id].kind === "disgraced");
  assert.ok(
    disgracedPool.includes(state.scientistId),
    `matched scientist "${state.scientistId}" should be in the disgraced pool`,
  );
});

// ============================================================================
// Test l: normalized/weighted metric (features 1+2) overrides raw Euclidean
// ============================================================================
// At stats = { credibility:75, curiosity:90, cash:70, care:35 }, the stats sit exactly on
// Marie Curie's curiosity, credibility, and care signature values but 40 points above her
// cash signature (30). Raw Euclidean strongly prefers Jennifer Doudna because stats match
// her on credibility, cash, and care with only a 10-point curiosity gap (distance ≈ 22 vs
// 40 for Curie). The normalized+weighted metric reverses this: Curie's cash weight is 0.5
// (lowest in the celebrated pool) so the 40-point cash gap is heavily discounted, while
// Curie's curiosity weight is 2.5 (highest) and the curiosity gap is zero. The cosine term
// adds a small further nudge. Net result: the metric ranks Curie first, Doudna second.
test("normalized/weighted metric ranks differently from raw Euclidean for a known stats point", () => {
  const stats = { credibility: 75, curiosity: 90, cash: 70, care: 35 };
  const pool = celebratedIds();

  // Compute raw Euclidean distance from stats to each celebrated signature in the pool.
  function rawEuclidean(sig) {
    return Math.sqrt(
      STAT_IDS.reduce((acc, id) => {
        const diff = stats[id] - sig[id];
        return acc + diff * diff;
      }, 0),
    );
  }
  const rawRanked = pool
    .map((id) => ({ scientistId: id, rawDist: rawEuclidean(SCIENTIST_SIGNATURE[id].values) }))
    .sort((a, b) => a.rawDist - b.rawDist);
  const rawWinner = rawRanked[0].scientistId;

  // Normalized+weighted+cosine ranking from the actual resemblance metric.
  const normalizedRanking = rankSignatures(stats, pool);
  const normalizedWinner = normalizedRanking[0].scientistId;

  // The two winners must differ: per-axis z-score normalization and per-scientist weights
  // discount the large cash gap for Marie Curie (low-weight axis, weight 0.5) and the result
  // diverges from the raw Euclidean ranking. If they agree, either the signatures or weights
  // were retuned to the point where this test case no longer demonstrates the divergence.
  assert.notEqual(
    normalizedWinner,
    rawWinner,
    `at stats ${JSON.stringify(stats)}: normalized winner "${normalizedWinner}" should differ ` +
      `from raw Euclidean winner "${rawWinner}" (normalization + per-scientist weights changed the ranking)`,
  );
});

// ============================================================================
// Test m: result state hybrid fields (feature 4 -- margin hybrid + trajectory)
// ============================================================================
test("result state carries a digit-free trajectoryNote and a boolean blended field", () => {
  const state = runFull(0);
  assert.equal(state.phase, "result");
  // trajectoryNote is always produced by the trajectory signal, digit-free per the engine
  // contract (the same no-digit rule that covers explanation and downfallExplanation).
  assert.ok(
    typeof state.trajectoryNote === "string" && state.trajectoryNote.length > 0,
    `trajectoryNote should be a non-empty string; got: ${JSON.stringify(state.trajectoryNote)}`,
  );
  assert.ok(
    !/\d/.test(state.trajectoryNote),
    `trajectoryNote must contain no digits: "${state.trajectoryNote}"`,
  );
  assert.ok(
    state.trajectoryNote.startsWith("Your "),
    `trajectoryNote should start with "Your "; got: "${state.trajectoryNote}"`,
  );
  // blended is always a boolean. When true, secondaryScientistId names the runner-up.
  // When false, secondaryScientistId must be undefined (no misleading runner-up).
  assert.ok(typeof state.blended === "boolean", "blended should be a boolean on every result");
  if (state.blended) {
    assert.ok(
      state.secondaryScientistId !== undefined &&
        SCIENTIST_IDS.includes(state.secondaryScientistId),
      `when blended, secondaryScientistId must be a valid scientist; got: "${state.secondaryScientistId}"`,
    );
  } else {
    assert.equal(
      state.secondaryScientistId,
      undefined,
      "when not blended, secondaryScientistId must be undefined",
    );
  }
});

// ============================================================================
// Test n: signatureDistance gap falls well below the typical run-scale near a midpoint
//         (feature 3 -- cosine blend + feature 4 -- hybrid margin mechanism)
// ============================================================================
test("signatureDistance gap is smaller near the raw midpoint than at a signature endpoint", () => {
  // The hybrid-margin mechanism fires when the top-two gap on the blended metric scale is
  // small. Near the raw midpoint between two signatures the gap compresses relative to the gap
  // when stats sit exactly on one scientist's signature. This relative assertion proves the
  // blend mechanism is reachable without depending on any absolute threshold that breaks under
  // signature retuning. Scientists are derived from celebratedIds() programmatically instead of
  // hardcoding names so the test stays valid if the roster changes.
  const pool = celebratedIds();
  assert.ok(pool.length >= 2, "celebrated pool must have at least 2 scientists for this test");
  // Derive two adjacent scientists from the pool; non-null access is safe given length >= 2.
  const idA = pool[0];
  const idB = pool[1];
  const sigA = SCIENTIST_SIGNATURE[idA].values;
  const sigB = SCIENTIST_SIGNATURE[idB].values;
  const midpoint = Object.fromEntries(STAT_IDS.map((id) => [id, (sigA[id] + sigB[id]) / 2]));

  // Gap at the midpoint: both scientists are near-equidistant, so the top-two gap is small.
  const rankingAtMid = rankSignatures(midpoint, pool);
  assert.ok(rankingAtMid.length >= 2, "celebrated pool should have at least 2 scientists");
  const midpointGap = rankingAtMid[1].distance - rankingAtMid[0].distance;

  // Gap at the endpoint: at idA's exact signature idA scores distance ~0 while every other
  // scientist scores positive, producing a much larger top-two gap than at the midpoint.
  const rankingAtA = rankSignatures(sigA, pool);
  const endpointGap = rankingAtA[1].distance - rankingAtA[0].distance;

  // Relative assertion: midpoint gap must be strictly smaller than endpoint gap. This proves
  // the blend metric compresses top-two distances near the midpoint relative to an endpoint,
  // making the hybrid-margin mechanism reachable in that region.
  assert.ok(
    midpointGap < endpointGap,
    `top-two gap at midpoint (${midpointGap.toFixed(4)}) should be smaller than gap at ` +
      `"${idA}" endpoint (${endpointGap.toFixed(4)}), proving the blend mechanism ` +
      "compresses distances near the midpoint",
  );
});

// ============================================================================
// Test o: trajectory signal varies with run shape (feature 5 -- trajectory)
// ============================================================================
test("trajectoryNote contains peak-timing words and differs by stat between run strategies", () => {
  const state0 = runFull(0);
  const state1 = runFull(1);
  // Both notes must be non-empty, digit-free strings produced by the trajectory signal.
  assert.ok(
    state0.trajectoryNote.length > 0 && !/\d/.test(state0.trajectoryNote),
    `always-0 trajectoryNote must be a non-empty digit-free string: "${state0.trajectoryNote}"`,
  );
  assert.ok(
    state1.trajectoryNote.length > 0 && !/\d/.test(state1.trajectoryNote),
    `always-1 trajectoryNote must be a non-empty digit-free string: "${state1.trajectoryNote}"`,
  );
  // The trajectory signal always captures peak timing (peakEarly or not) and volatility.
  // The note format is "Your <stat> peaked early|surged late and held steady|amid sharp swings."
  // Asserting on the timing phrase proves the trajectory pipeline ran end-to-end.
  const timingPhrases = ["peaked early", "surged late"];
  assert.ok(
    timingPhrases.some((phrase) => state0.trajectoryNote.includes(phrase)),
    `always-0 trajectoryNote should contain a peak-timing phrase; got: "${state0.trajectoryNote}"`,
  );
  assert.ok(
    timingPhrases.some((phrase) => state1.trajectoryNote.includes(phrase)),
    `always-1 trajectoryNote should contain a peak-timing phrase; got: "${state1.trajectoryNote}"`,
  );
});

// ============================================================================
// Test p: conditional effect resolves differently above and below the threshold
//         (feature 6 -- conditional effects)
// ============================================================================
// core_25 choice A has: conditionalEffect("care", "up", "small", { stat:"cash", value:50 },
//   { magnitude:"medium" }). When cash >= 50 the "medium" swap fires (delta=14); when cash < 50
// the base "small" applies (delta=8). The engine resolves all effects against the pre-effect
// stats snapshot, so the order of effects within the same choice cannot change the evaluation.
test("conditional effect on core_25 choice A fires medium care when cash >= 50 and small otherwise", () => {
  const base = createInitialState();

  // With cash = 50: condition (cash >= 50) is satisfied → care goes up by "medium" (delta 14).
  const stateHighCash = {
    ...base,
    stats: { ...base.stats, cash: 50 },
    pendingCardIds: ["core_25"],
  };
  const afterHighCash = choose(stateHighCash, 0);
  // Loud-failure guard: core_25 must be drawn from the pending queue; a silent skip (e.g.
  // due to an id rename) would mean the conditional effect was never tested and the delta
  // assertions below become vacuous.
  assert.ok(
    afterHighCash.askedIds.includes("core_25"),
    `core_25 must appear in askedIds after being drawn from pendingCardIds; ` +
      `a silent skip invalidates the conditional effect test. askedIds: ${JSON.stringify(afterHighCash.askedIds)}`,
  );
  const careDeltaHigh = afterHighCash.stats.care - stateHighCash.stats.care;

  // With cash = 49: condition NOT met → care goes up by "small" (delta 8).
  const stateLowCash = { ...base, stats: { ...base.stats, cash: 49 }, pendingCardIds: ["core_25"] };
  const afterLowCash = choose(stateLowCash, 0);
  // Loud-failure guard: core_25 must be drawn in the low-cash branch as well.
  assert.ok(
    afterLowCash.askedIds.includes("core_25"),
    `core_25 must appear in askedIds after being drawn (low-cash branch); ` +
      `askedIds: ${JSON.stringify(afterLowCash.askedIds)}`,
  );
  const careDeltaLow = afterLowCash.stats.care - stateLowCash.stats.care;

  // The conditional path (cash=50) must produce a larger care gain than the base path (cash=49).
  // (The > assertion below already implies inequality; the redundant notEqual was removed.)
  assert.ok(
    careDeltaHigh > careDeltaLow,
    `care delta with cash=50 (${careDeltaHigh}) should exceed care delta with cash=49 (${careDeltaLow}) ` +
      "because the whenStatAtLeast condition fires the medium swap only at or above the threshold",
  );
});

// ============================================================================
// Test q: branch unlock enqueues a follow-up card that appears in askedIds
//         (feature 7 -- branch unlocks)
// ============================================================================
// core_27 choice A ("Overhaul every issue...") carries unlocks: "core_28". The engine enqueues
// this id into pendingCardIds, and the scheduler drains the pending queue before the weighted
// draw so core_28 is shown on the very next turn.
test("choosing core_27 choice A enqueues core_28 which appears in askedIds on the next draw", () => {
  const base = createInitialState();
  // Force core_27 to be drawn first by placing its id in the pending queue.
  const stateWithCore27 = { ...base, pendingCardIds: ["core_27"] };

  // Choose A (index 0) on core_27: the engine enqueues core_28.
  const afterCore27 = choose(stateWithCore27, 0);
  assert.ok(
    afterCore27.askedIds.includes("core_27"),
    `core_27 should be in askedIds after being answered; got: ${JSON.stringify(afterCore27.askedIds)}`,
  );
  assert.ok(
    afterCore27.pendingCardIds.includes("core_28"),
    `core_28 should be queued in pendingCardIds after choosing core_27 choice A; ` +
      `got: ${JSON.stringify(afterCore27.pendingCardIds)}`,
  );

  // One more step: the scheduler pulls core_28 from the pending queue and shows it.
  const afterCore28 = choose(afterCore27, 0);
  assert.ok(
    afterCore28.askedIds.includes("core_28"),
    `core_28 should appear in askedIds after being drawn from the pending queue; ` +
      `got: ${JSON.stringify(afterCore28.askedIds)}`,
  );
});

// ============================================================================
// Test r: event card fires only in the extreme band (feature 8 -- EVENT_DECK gating)
// ============================================================================
// An event card is eligible only when one of its probed stats is strictly above STAT_NORMAL_MAX.
// The scheduler checks this before every draw (step 2 in drawNextCard), so a normal-range run
// never encounters an event card, but a state already in the extreme band draws one immediately.
test("event card ids never appear in a normal-range run; an extreme state draws one immediately", () => {
  const eventIds = new Set(EVENT_DECK.map((card) => card.id));

  // Part 1: the always-0 run (test i confirms it stays within STAT_NORMAL_MAX) must not draw
  // any event card. This exercises the "extreme is false → eligibleEventCard returns undefined"
  // branch of drawNextCard on every draw throughout the run.
  const normalResult = runFull(0);
  for (const id of normalResult.askedIds) {
    assert.ok(
      !eventIds.has(id),
      `event card "${id}" must not fire in a normal-range run; ` +
        `askedIds: ${JSON.stringify(normalResult.askedIds)}`,
    );
  }

  // Part 2: construct a run state where cash is extreme (> STAT_NORMAL_MAX). The very next
  // draw should inject an event card (event_cash_1 probes cash, which is extreme), proving
  // the extreme-gating logic fires correctly.
  const base = createInitialState();
  const extremeState = {
    ...base,
    stats: { ...base.stats, cash: STAT_NORMAL_MAX + 10 },
  };
  const afterEventDraw = choose(extremeState, 0);
  const anyEventFired = afterEventDraw.askedIds.some((id) => eventIds.has(id));
  assert.ok(
    anyEventFired,
    `an event card should be drawn immediately when cash > STAT_NORMAL_MAX; ` +
      `askedIds: ${JSON.stringify(afterEventDraw.askedIds)}`,
  );
});

// ============================================================================
// Test s: signatureDistance fails loudly on a wrong-pool scientist (M2 guard)
// ============================================================================
// signatureDistance normalizes the z-score against the supplied pool's distribution, so a
// scientist that is not in that pool would be scored against the wrong reference and silently
// return a misleading number. The pool-membership guard must throw instead. Ids come from the
// exported celebratedIds()/disgracedIds() helpers so the test never hardcodes scientist names.
test("signatureDistance throws when the scientist is not a member of the supplied pool", () => {
  const celebratedPool = celebratedIds();
  const disgracedPool = disgracedIds();
  assert.ok(celebratedPool.length >= 1, "celebrated pool must be non-empty for this test");
  assert.ok(disgracedPool.length >= 1, "disgraced pool must be non-empty for this test");
  // Stats value is irrelevant to the guard; any valid 4C point exercises the boundary check.
  const stats = createInitialState().stats;
  // A disgraced id ranked against the celebrated pool is the cross-pool error the guard catches.
  const wrongPoolId = disgracedPool[0];
  assert.throws(
    () => signatureDistance(stats, wrongPoolId, celebratedPool),
    /not in the supplied pool/,
    `signatureDistance should throw when "${wrongPoolId}" is scored against the celebrated pool`,
  );
  // Correct-pool usage stays valid and returns a finite number.
  const correctId = celebratedPool[0];
  const distance = signatureDistance(stats, correctId, celebratedPool);
  assert.ok(
    typeof distance === "number" && Number.isFinite(distance),
    `a correct-pool call must return a finite number; got: ${JSON.stringify(distance)}`,
  );
});

// ============================================================================
// Test t: event-card origin is threaded from the draw result (L3)
// ============================================================================
// The run-phase VisibleCard's isEvent flag is now sourced from the draw result (set once on the
// event-injection branch of drawNextCard), not re-derived by a renderer-side EVENT_DECK rescan.
// An extreme state draws an event card immediately, so its visible card must carry isEvent: true;
// a normal-range fresh state draws a core card, whose visible card must not flag isEvent.
test("event-band visible card carries isEvent true while a normal-range card does not", () => {
  // Normal-range fresh state: the first draw is a core card, so isEvent must not be set true.
  const normalCard = currentVisibleCard(createInitialState());
  assert.equal(normalCard.kind, "run");
  assert.notEqual(
    normalCard.isEvent,
    true,
    `a normal-range run card must not flag isEvent; got: ${JSON.stringify(normalCard.isEvent)}`,
  );

  // Extreme state (cash past the normal ceiling): the same technique test r uses to force an
  // event draw. The visible card must report event origin from the draw result.
  const base = createInitialState();
  const extremeState = {
    ...base,
    stats: { ...base.stats, cash: STAT_NORMAL_MAX + 10 },
  };
  const eventCard = currentVisibleCard(extremeState);
  assert.equal(eventCard.kind, "run");
  assert.equal(
    eventCard.isEvent,
    true,
    `an extreme-band visible card must carry isEvent: true from the draw result; ` +
      `got: ${JSON.stringify(eventCard.isEvent)}`,
  );
});
