import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { SCIENTIST_IDS, SCIENTIST_SIGNATURE, RUN_LENGTH } from "../src/config.ts";
import { choose, createInitialState, rankSignatures } from "../src/engine.ts";

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
// Test d: stat clamp -- run does not end early; stats stay within [0, 100]
// ============================================================================
test("stats remain within [0, 100] throughout an extreme choice run", () => {
  let state = createInitialState();
  for (let i = 0; i < RUN_LENGTH; i++) {
    assert.equal(state.phase, "run", `run ended early at step ${i}`);
    state = choose(state, 0);
    for (const value of Object.values(state.stats)) {
      assert.ok(value >= 0 && value <= 100, `stat out of range: ${value}`);
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
  // always-0 => rosalind_franklin, always-1 => alexander_fleming (verified at author time)
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
