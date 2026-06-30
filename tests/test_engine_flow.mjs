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
import { choose, createInitialState, currentVisibleCard, rankSignatures } from "../src/engine.ts";

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
