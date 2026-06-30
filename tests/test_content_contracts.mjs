import assert from "node:assert/strict";
import test from "node:test";

import { RUN_LENGTH, SCIENTIST_IDS } from "../src/config.ts";
import { SCIENTIST_SOURCE_NOTES } from "../src/content.ts";
import {
  checkBranchTargets,
  checkEventCoverage,
  validateContent,
} from "../src/content_validation.ts";
import { choose, createInitialState } from "../src/engine.ts";
import { loadGameState, saveGameState } from "../src/storage.ts";

// ============================================================================
// Test a: release content satisfies all contracts
// ============================================================================
test("release content satisfies all contracts (validateContent returns empty)", () => {
  const issues = validateContent();
  assert.deepEqual(issues, []);
});

// ============================================================================
// Test f: source notes have https URLs for every scientist
// ============================================================================
test("SCIENTIST_SOURCE_NOTES has https URLs for every scientist", () => {
  for (const scientistId of SCIENTIST_IDS) {
    const notes = SCIENTIST_SOURCE_NOTES[scientistId];
    assert.ok(notes && notes.length > 0, `no source notes for "${scientistId}"`);
    for (const note of notes) {
      assert.ok(
        note.url.startsWith("https://"),
        `${scientistId} source note URL is not https: "${note.url}"`,
      );
    }
  }
});

// ============================================================================
// Test g: malformed / old-save resilience in loadGameState
// ============================================================================

// Minimal in-memory Storage shim (mirrors the browser localStorage API shape).
function makeStorage(initial) {
  const store = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
}

test("loadGameState returns a fresh run state from empty storage without throwing", () => {
  const storage = makeStorage();
  const state = loadGameState(storage);
  assert.equal(state.phase, "run");
});

test("loadGameState returns a fresh run state from garbage JSON without throwing", () => {
  // Store garbage under the current v4 key so loadGameState actually reads it (carry-forward a).
  const storage = makeStorage({ "science_career_survival:v4": "{{not valid json}}" });
  const state = loadGameState(storage);
  assert.equal(state.phase, "run");
});

test("loadGameState returns a fresh run state from a v1-shape blob without throwing", () => {
  // Store old v1 blob under the current v4 key so loadGameState actually reads it (carry-forward a).
  const v1Blob = JSON.stringify({
    version: 1,
    state: { phase: "prologue", routeScores: {}, cards: [] },
  });
  const storage = makeStorage({ "science_career_survival:v4": v1Blob });
  const state = loadGameState(storage);
  assert.equal(state.phase, "run");
});

// ============================================================================
// Test h (carry-forward b): v3-shaped blob under v4 key is rejected
// ============================================================================
test("loadGameState rejects a v4-versioned state blob missing statHistory and pendingCardIds", () => {
  // A v3-shaped run state lacks statHistory and pendingCardIds (fields added in v4).
  // Even if wrapped in a version:4 envelope, isStatValuesArray(undefined) returns false and
  // isGameState rejects the blob, so loadGameState returns a fresh run state.
  const v3ShapedBlob = JSON.stringify({
    version: 4,
    state: {
      phase: "run",
      stats: { credibility: 50, curiosity: 50, cash: 50, care: 50 },
      seed: 2646905259,
      answeredCount: 0,
      askedIds: [],
      strain: [],
      unlockedExtras: [],
      // statHistory and pendingCardIds deliberately absent (v3-shape)
    },
  });
  const storage = makeStorage({ "science_career_survival:v4": v3ShapedBlob });
  const state = loadGameState(storage);
  assert.equal(state.phase, "run");
  // The returned state must be a fresh initial state, not the stored one.
  assert.equal(state.answeredCount, 0);
  assert.equal(state.askedIds.length, 0);
});

// ============================================================================
// Test i (carry-forward d): empty statHistory rejected by the length >= 1 guard
// ============================================================================
test("loadGameState rejects a state blob with an empty statHistory array", () => {
  // The isStatValuesArray guard requires length >= 1 (tightened in item d). A blob that
  // passes all other checks but carries statHistory: [] is still rejected because the initial
  // snapshot must always be present at index 0.
  const blobWithEmptyHistory = JSON.stringify({
    version: 4,
    state: {
      phase: "run",
      stats: { credibility: 50, curiosity: 50, cash: 50, care: 50 },
      seed: 2646905259,
      answeredCount: 0,
      askedIds: [],
      strain: [],
      unlockedExtras: [],
      statHistory: [],
      pendingCardIds: [],
    },
  });
  const storage = makeStorage({ "science_career_survival:v4": blobWithEmptyHistory });
  const state = loadGameState(storage);
  assert.equal(state.phase, "run");
  assert.equal(state.answeredCount, 0);
});

// ============================================================================
// Test j (carry-forward c): v4 round-trip save and load
// ============================================================================
test("v4 round-trip: saveGameState then loadGameState preserves statHistory and pendingCardIds", () => {
  // Run a full game always choosing index 1 so we never trigger the core_27 branch unlock
  // (choice 0 on core_27 enqueues core_28; choice 1 does not), guaranteeing pendingCardIds
  // is empty at the result regardless of which cards appear.
  let state = createInitialState();
  for (let i = 0; i < RUN_LENGTH; i++) {
    assert.equal(state.phase, "run", `expected run phase at step ${i}`);
    state = choose(state, 1);
  }
  assert.equal(state.phase, "result");
  // statHistory convention: index 0 is the initial snapshot; each answer appends one entry.
  assert.equal(
    state.statHistory.length,
    RUN_LENGTH + 1,
    `statHistory should have ${RUN_LENGTH + 1} entries after a full run; got ${state.statHistory.length}`,
  );
  assert.equal(
    state.pendingCardIds.length,
    0,
    `pendingCardIds should be empty when no branch was unlocked; got ${state.pendingCardIds.length}`,
  );
  // Save then load and assert the v4 fields round-trip correctly.
  const storage = makeStorage();
  saveGameState(storage, state);
  const loaded = loadGameState(storage);
  assert.equal(loaded.phase, "result");
  assert.equal(
    loaded.statHistory.length,
    RUN_LENGTH + 1,
    `loaded statHistory.length should equal ${RUN_LENGTH + 1}; got ${loaded.statHistory.length}`,
  );
  assert.equal(
    loaded.pendingCardIds.length,
    0,
    `loaded pendingCardIds should be empty; got ${loaded.pendingCardIds.length}`,
  );
});

// ============================================================================
// Negative fixture: checkBranchTargets
// ============================================================================

// Helper: returns true when at least one issue carries the given code.
function hasCode(issues, code) {
  return issues.some((iss) => iss.code === code);
}

test("checkBranchTargets emits branch_target_missing for an unlocks pointing at no card", () => {
  // One card whose choice.unlocks refers to a card id not present in the deck.
  // knownIds is derived from branchTargetCards itself, so "no_such_card" is absent.
  const card = {
    id: "fixture_branch_card",
    prompt: "A fixture prompt.",
    choices: [
      {
        label: "Option A",
        effects: [{ stat: "credibility", direction: "up", magnitude: "small" }],
        unlocks: "no_such_card",
      },
      {
        label: "Option B",
        effects: [{ stat: "credibility", direction: "down", magnitude: "small" }],
      },
    ],
    probes: ["credibility"],
  };
  const issues = [];
  checkBranchTargets(issues, [card]);
  assert.ok(hasCode(issues, "branch_target_missing"), `expected "branch_target_missing" in issues`);
});

// ============================================================================
// Negative fixtures: checkEventCoverage
// ============================================================================

test("checkEventCoverage emits event_deck_empty for an empty event deck", () => {
  const issues = [];
  checkEventCoverage(issues, []);
  assert.ok(hasCode(issues, "event_deck_empty"), `expected "event_deck_empty" in issues`);
});

test("checkEventCoverage emits event_no_probes for an event card with empty probes", () => {
  // An event card with probes: [] is never eligible; the engine uses probes to gate it.
  const card = {
    id: "fixture_event_card",
    prompt: "A fixture event prompt.",
    choices: [
      {
        label: "Option A",
        effects: [{ stat: "curiosity", direction: "up", magnitude: "small" }],
      },
      {
        label: "Option B",
        effects: [{ stat: "curiosity", direction: "down", magnitude: "small" }],
      },
    ],
    probes: [],
  };
  const issues = [];
  checkEventCoverage(issues, [card]);
  assert.ok(hasCode(issues, "event_no_probes"), `expected "event_no_probes" in issues`);
});
